import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { buildCommitDecisions, defaultResolutions, summarize } from '@/lib/customerImportDecisions';
import {
  buildManualCustomerPayload,
  createManualCustomerRow,
  duplicateManualCustomerRow,
  validateManualCustomerRows,
  type ManualCustomerRow,
  type ManualCustomerTextField,
} from '@/lib/manualCustomerImport';
import {
  customerImportService,
  describeCustomerCommitError,
  describeCustomerImportError,
  isCustomerPreviewExpiredError,
  MAX_CUSTOMER_IMPORT_FILE_SIZE,
  readCustomerCommitBlockers,
} from '@/services/customerImportService';
import type {
  CustomerCommitRowDecision,
  CustomerImportCommitBlocker,
  CustomerImportCommitSummary,
  CustomerImportPreviewResult,
  CustomerImportProviderSlug,
  CustomerImportResolution,
  CustomerImportRowStatus,
} from '@/types/customerImport';

/**
 * Étapes du parcours d'import.
 *
 * `preview` n'est atteinte qu'avec un `CustomerImportPreviewResult` en main,
 * `done` qu'avec un résumé de commit — même contrat que `useProductImport`.
 */
export type ImportStep = 'choose' | 'provider' | 'manual' | 'preview' | 'done';

/** Porte par laquelle la prévisualisation a été obtenue. */
export type ImportDoor = 'provider' | 'manual';

export interface CustomerImportState {
  step: ImportStep;
  /**
   * Porte d'origine de la prévisualisation en cours. Sans elle, revenir
   * depuis l'écran de vérification ramènerait toujours à l'envoi de fichier,
   * y compris après une saisie manuelle.
   */
  door: ImportDoor | null;
  provider: CustomerImportProviderSlug;
  file: File | null;
  /**
   * Lignes de la saisie manuelle. Elles vivent ici et non dans la grille : le
   * composant est démonté quand on passe à la vérification, et y perdre une
   * saisie de vingt clients serait inacceptable.
   */
  manualRows: ManualCustomerRow[];
  preview: CustomerImportPreviewResult | null;
  /** Résolutions en cours d'édition, initialisées aux défauts de la preview. */
  resolutions: Record<string, CustomerImportResolution>;
  /** Blocages du dernier 422, rendus au plus près des lignes concernées. */
  blockers: CustomerImportCommitBlocker[];
  result: CustomerImportCommitSummary | null;
  error: string | null;
  /** Le jeton n'est plus exploitable : il faut renvoyer le fichier. */
  expired: boolean;
}

const initialState: CustomerImportState = {
  step: 'choose',
  door: null,
  provider: 'wello-generic',
  file: null,
  manualRows: [createManualCustomerRow()],
  preview: null,
  resolutions: {},
  blockers: [],
  result: null,
  error: null,
  expired: false,
};

export const useCustomerImport = () => {
  const [state, setState] = useState<CustomerImportState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const chooseDoor = useCallback((step: ImportStep) => {
    setState((previous) => ({
      ...previous,
      step,
      door: step === 'provider' || step === 'manual' ? step : previous.door,
      error: null,
    }));
  }, []);

  const back = useCallback(() => {
    setState((previous) => {
      // Depuis la vérification ou l'écran final, on revient à la porte
      // d'origine en gardant la saisie manuelle intacte : c'est le geste
      // attendu quand on s'est trompé de fichier.
      if (previous.step === 'preview' || previous.step === 'done') {
        const door = previous.door ?? 'provider';
        return {
          ...initialState,
          step: door,
          door,
          provider: previous.provider,
          manualRows: previous.manualRows,
        };
      }
      return { ...initialState, provider: previous.provider };
    });
  }, []);

  const selectProvider = useCallback((provider: CustomerImportProviderSlug) => {
    setState((previous) => ({ ...previous, provider, error: null }));
  }, []);

  const setFile = useCallback((file: File | null) => {
    setState((previous) => {
      if (file && file.size > MAX_CUSTOMER_IMPORT_FILE_SIZE) {
        // Refusé ici plutôt qu'au serveur : inutile de faire monter un gros
        // fichier pour se voir répondre que c'est trop.
        return { ...previous, file: null, error: 'Fichier trop volumineux (10 Mo maximum).' };
      }
      return { ...previous, file, error: null };
    });
  }, []);

  // ─── Saisie manuelle ────────────────────────────────────

  const setManualCell = useCallback((rowId: string, field: ManualCustomerTextField, value: string) => {
    setState((previous) => ({
      ...previous,
      error: null,
      manualRows: previous.manualRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  }, []);

  const setManualConsent = useCallback((rowId: string, value: boolean) => {
    setState((previous) => ({
      ...previous,
      manualRows: previous.manualRows.map((row) =>
        row.id === rowId ? { ...row, advertisingConsent: value } : row,
      ),
    }));
  }, []);

  const addManualRow = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
      manualRows: [...previous.manualRows, createManualCustomerRow()],
    }));
  }, []);

  /** Insère la copie juste après l'originale, là où l'œil l'attend. */
  const duplicateManualRow = useCallback((rowId: string) => {
    setState((previous) => {
      const index = previous.manualRows.findIndex((row) => row.id === rowId);
      if (index < 0) return previous;

      const rows = [...previous.manualRows];
      rows.splice(index + 1, 0, duplicateManualCustomerRow(rows[index]));
      return { ...previous, error: null, manualRows: rows };
    });
  }, []);

  /** Supprimer la dernière ligne la vide au lieu de laisser une grille sans rien. */
  const removeManualRow = useCallback((rowId: string) => {
    setState((previous) => {
      if (previous.manualRows.length <= 1) {
        return { ...previous, error: null, manualRows: [createManualCustomerRow()] };
      }
      return {
        ...previous,
        error: null,
        manualRows: previous.manualRows.filter((row) => row.id !== rowId),
      };
    });
  }, []);

  // ─── Résolutions ────────────────────────────────────────

  const setResolution = useCallback((externalId: string, resolution: CustomerImportResolution) => {
    setState((previous) => ({
      ...previous,
      resolutions: { ...previous.resolutions, [externalId]: resolution },
      // La ligne rectifiée efface son blocage précédent : le garder
      // afficherait une erreur qui ne correspond plus au choix courant.
      blockers: previous.blockers.filter((blocker) => blocker.ref !== externalId),
      error: null,
    }));
  }, []);

  /**
   * Action en masse : applique la même résolution à toutes les lignes d'un
   * statut. Indispensable en pratique : un fichier peut compter des
   * centaines de doublons ou de clients déjà importés, personne ne va les
   * trancher un par un.
   */
  const setAllResolutions = useCallback(
    (status: CustomerImportRowStatus, resolution: CustomerImportResolution) => {
      setState((previous) => {
        if (!previous.preview) return previous;
        const next = { ...previous.resolutions };
        for (const row of previous.preview.rows) {
          if (row.status === status) next[row.external_id] = resolution;
        }
        return { ...previous, resolutions: next, blockers: [], error: null };
      });
    },
    [],
  );

  // ─── Appels ─────────────────────────────────────────────

  /**
   * Point d'arrivée commun aux deux portes : fichier et saisie manuelle
   * produisent le même `PreviewResult`, et l'écran de vérification ne sait
   * pas — ni n'a besoin de savoir — d'où il vient.
   */
  const applyPreview = useCallback((preview: CustomerImportPreviewResult) => {
    setState((previous) => ({
      ...previous,
      step: 'preview',
      preview,
      resolutions: defaultResolutions(preview.rows),
      blockers: [],
      result: null,
      error: null,
      expired: false,
    }));
  }, []);

  const failPreview = useCallback((error: unknown) => {
    setState((previous) => ({ ...previous, error: describeCustomerImportError(error) }));
  }, []);

  const previewMutation = useMutation({
    mutationFn: ({ provider, file }: { provider: CustomerImportProviderSlug; file: File }) =>
      customerImportService.previewFile(provider, file),
    onSuccess: applyPreview,
    onError: failPreview,
  });

  const manualPreviewMutation = useMutation({
    mutationFn: customerImportService.previewManual,
    onSuccess: applyPreview,
    onError: failPreview,
  });

  const submitFile = useCallback(() => {
    if (!state.file) {
      setState((previous) => ({ ...previous, error: 'Sélectionnez un fichier à importer.' }));
      return;
    }
    previewMutation.mutate({ provider: state.provider, file: state.file });
  }, [previewMutation, state.file, state.provider]);

  /** Validation de la grille — miroir de ce que refuse BuildManualCustomerImport. */
  const manualValidation = useMemo(
    () => validateManualCustomerRows(state.manualRows),
    [state.manualRows],
  );

  const submitManual = useCallback(() => {
    if (!manualValidation.canSubmit) {
      setState((previous) => ({
        ...previous,
        error:
          manualValidation.submittable.length === 0
            ? 'Saisissez au moins un client.'
            : 'Corrigez les lignes signalées avant de continuer.',
      }));
      return;
    }
    manualPreviewMutation.mutate(buildManualCustomerPayload(state.manualRows));
  }, [manualPreviewMutation, manualValidation, state.manualRows]);

  const commitMutation = useMutation({
    mutationFn: ({ token, decisions }: { token: string; decisions: CustomerCommitRowDecision[] }) =>
      customerImportService.commit(token, decisions),
    onSuccess: (result) => {
      setState((previous) => ({ ...previous, step: 'done', result, blockers: [], error: null }));
    },
    onError: (error) => {
      setState((previous) => ({
        ...previous,
        blockers: readCustomerCommitBlockers(error),
        error: describeCustomerCommitError(error),
        expired: isCustomerPreviewExpiredError(error),
      }));
    },
  });

  const commit = useCallback(() => {
    if (!state.preview) return;
    commitMutation.mutate({
      token: state.preview.token,
      decisions: buildCommitDecisions(state.preview.rows, state.resolutions),
    });
  }, [commitMutation, state.preview, state.resolutions]);

  const templateMutation = useMutation({
    mutationFn: () => customerImportService.downloadTemplate(),
    onSuccess: () => {
      toast.success('Modèle téléchargé', {
        description: 'Remplissez-le, puis revenez l’importer par « Modèle Wello rempli ».',
      });
    },
    onError: (error) => {
      const message = describeCustomerImportError(error);
      setState((previous) => ({ ...previous, error: message }));
      toast.error('Téléchargement impossible', { description: message });
    },
  });

  /** Résumé de ce qui sera réellement écrit — pour le libellé du bouton et l'écran final. */
  const summary = useMemo(
    () => (state.preview ? summarize(state.preview.rows, state.resolutions) : null),
    [state.preview, state.resolutions],
  );

  return {
    state,
    summary,
    manualValidation,
    isUploading: previewMutation.isPending,
    isSubmittingManual: manualPreviewMutation.isPending,
    isCommitting: commitMutation.isPending,
    isDownloadingTemplate: templateMutation.isPending,

    chooseDoor,
    back,
    reset,
    selectProvider,
    setFile,
    submitFile,
    downloadTemplate: templateMutation.mutate,

    setManualCell,
    setManualConsent,
    addManualRow,
    duplicateManualRow,
    removeManualRow,
    submitManual,

    setResolution,
    setAllResolutions,
    commit,
  };
};

export type UseCustomerImport = ReturnType<typeof useCustomerImport>;
