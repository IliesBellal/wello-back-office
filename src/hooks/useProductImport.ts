import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { buildImportDecisions, importPrecheck } from '@/lib/importDecisions';
import {
  buildManualPayload,
  createManualRow,
  duplicateManualRow,
  validateManualRows,
  type ManualRow,
  type ManualRowField,
} from '@/lib/manualImport';
import {
  describeCommitError,
  describeImportError,
  isPreviewExpiredError,
  MAX_IMPORT_FILE_SIZE,
  menuImportService,
  readCommitBlockers,
} from '@/services/menuImportService';
import {
  TEMPLATE_PROVIDER,
  tvaMappingKey,
  type ImportCollisionResolution,
  type ImportCommitBlocker,
  type ImportCommitResponse,
  type ImportDecisions,
  type ImportPreviewResult,
  type ImportManualProductPayload,
  type ImportProviderSlug,
  type ImportTagClass,
} from '@/types/import';

/**
 * Étapes du parcours d'import.
 *
 * `preview` n'est atteinte qu'avec un `ImportPreviewResult` en main, `done`
 * qu'avec un résultat de commit.
 */
export type ImportStep = 'choose' | 'provider' | 'preview' | 'manual' | 'done';

/** Porte par laquelle la prévisualisation a été obtenue. */
export type ImportDoor = 'provider' | 'manual';

export interface ProductImportState {
  step: ImportStep;
  /**
   * Porte d'origine de la prévisualisation en cours. Sans elle, revenir depuis
   * l'écran de vérification ramènerait toujours à l'envoi de fichier, y
   * compris après une saisie manuelle.
   */
  door: ImportDoor | null;
  provider: ImportProviderSlug;
  file: File | null;
  /**
   * Lignes de la saisie de masse. Elles vivent ici et non dans la grille : le
   * composant est démonté quand on passe à la vérification, et y perdre trente
   * produits saisis à la main serait inacceptable.
   */
  manualRows: ManualRow[];
  preview: ImportPreviewResult | null;
  /** Décisions en cours d'édition, initialisées depuis la prévisualisation. */
  decisions: ImportDecisions | null;
  /** Blocages du dernier 422, rendus au plus près des entités concernées. */
  blockers: ImportCommitBlocker[];
  result: ImportCommitResponse | null;
  error: string | null;
  /** Le jeton n'est plus exploitable : il faut renvoyer le fichier. */
  expired: boolean;
}

const initialState: ProductImportState = {
  step: 'choose',
  door: null,
  provider: 'zelty',
  file: null,
  manualRows: [createManualRow()],
  preview: null,
  decisions: null,
  blockers: [],
  result: null,
  error: null,
  expired: false,
};

const emptyDecisions = (): ImportDecisions => ({
  tag_classification: {},
  category_per_product: {},
  tva_mapping: {},
  name_collisions: {},
});

export const useProductImport = () => {
  const [state, setState] = useState<ProductImportState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const goToDoor = useCallback((step: ImportStep) => {
    setState((previous) => ({
      ...previous,
      step,
      door: step === 'provider' || step === 'manual' ? step : previous.door,
      error: null,
    }));
  }, []);

  const back = useCallback(() => {
    setState((previous) => {
      // Depuis la vérification, on revient au choix du fichier en gardant le
      // provider : c'est le geste attendu quand on s'est trompé de fichier.
      if (previous.step === 'preview' || previous.step === 'done') {
        // Retour à la porte d'où l'on vient, avec la saisie intacte.
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

  const setProvider = useCallback((provider: ImportProviderSlug) => {
    setState((previous) => ({ ...previous, provider, error: null }));
  }, []);

  const setFile = useCallback((file: File | null) => {
    setState((previous) => {
      if (file && file.size > MAX_IMPORT_FILE_SIZE) {
        // Refusé ici plutôt qu'au serveur : inutile de faire monter 20 Mo pour
        // se voir répondre que c'est trop.
        return { ...previous, file: null, error: 'Fichier trop volumineux (5 Mo maximum).' };
      }
      return { ...previous, file, error: null };
    });
  }, []);

  // ─── Saisie de masse ────────────────────────────────────

  const setManualCell = useCallback((rowId: string, field: ManualRowField, value: string) => {
    setState((previous) => ({
      ...previous,
      error: null,
      manualRows: previous.manualRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    }));
  }, []);

  const addManualRow = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
      manualRows: [...previous.manualRows, createManualRow()],
    }));
  }, []);

  /** Insère la copie juste après l'originale, là où l'œil l'attend. */
  const duplicateManualRowById = useCallback((rowId: string) => {
    setState((previous) => {
      const index = previous.manualRows.findIndex((row) => row.id === rowId);
      if (index < 0) return previous;

      const rows = [...previous.manualRows];
      rows.splice(index + 1, 0, duplicateManualRow(rows[index]));
      return { ...previous, error: null, manualRows: rows };
    });
  }, []);

  /** Supprimer la dernière ligne la vide au lieu de laisser une grille sans rien. */
  const removeManualRow = useCallback((rowId: string) => {
    setState((previous) => {
      if (previous.manualRows.length <= 1) {
        return { ...previous, error: null, manualRows: [createManualRow()] };
      }
      return {
        ...previous,
        error: null,
        manualRows: previous.manualRows.filter((row) => row.id !== rowId),
      };
    });
  }, []);

  // ─── Édition des décisions ──────────────────────────────

  const patchDecisions = useCallback(
    (patch: (current: ImportDecisions) => ImportDecisions) => {
      setState((previous) => {
        if (!previous.decisions) return previous;
        return {
          ...previous,
          decisions: patch(previous.decisions),
          // Toute modification rend le refus précédent caduc : le garder
          // afficherait des erreurs qui ne correspondent plus à l'écran.
          blockers: [],
          error: null,
        };
      });
    },
    [],
  );

  const setTagClass = useCallback(
    (externalId: string, classification: ImportTagClass) => {
      patchDecisions((current) => ({
        ...current,
        tag_classification: { ...current.tag_classification, [externalId]: classification },
      }));
    },
    [patchDecisions],
  );

  const setProductCategory = useCallback(
    (productExternalId: string, categoryExternalId: string) => {
      patchDecisions((current) => ({
        ...current,
        category_per_product: {
          ...current.category_per_product,
          [productExternalId]: categoryExternalId,
        },
      }));
    },
    [patchDecisions],
  );

  /**
   * Affecte une catégorie à tous les produits qui en manquent.
   *
   * Indispensable en pratique : un export réel arrive avec une poignée de
   * lignes sans libellé (frais de livraison, frais de service) qu'on ne veut
   * pas trancher une par une.
   */
  const assignCategoryToAll = useCallback(
    (productExternalIds: string[], categoryExternalId: string) => {
      patchDecisions((current) => {
        const next = { ...current.category_per_product };
        for (const productId of productExternalIds) {
          next[productId] = categoryExternalId;
        }
        return { ...current, category_per_product: next };
      });
    },
    [patchDecisions],
  );

  const setTvaId = useCallback(
    (rate: number, channel: number, tvaId: number) => {
      patchDecisions((current) => ({
        ...current,
        tva_mapping: { ...current.tva_mapping, [tvaMappingKey(rate, channel)]: tvaId },
      }));
    },
    [patchDecisions],
  );

  const setCollisionResolution = useCallback(
    (productExternalId: string, resolution: ImportCollisionResolution) => {
      patchDecisions((current) => ({
        ...current,
        name_collisions: { ...current.name_collisions, [productExternalId]: resolution },
      }));
    },
    [patchDecisions],
  );

  // ─── Appels ─────────────────────────────────────────────

  /**
   * Point d'arrivée commun aux deux portes : fichier et saisie manuelle
   * produisent le même `PreviewResult`, et l'écran de vérification ne sait pas
   * — ni n'a besoin de savoir — d'où il vient.
   */
  const applyPreview = useCallback((preview: ImportPreviewResult) => {
    setState((previous) => ({
      ...previous,
      step: 'preview',
      preview,
      // Les décisions partent de ce que la prévisualisation propose ;
      // l'écran de vérification les amende.
      decisions: preview.decisions ?? emptyDecisions(),
      blockers: [],
      result: null,
      error: null,
      expired: false,
    }));
  }, []);

  const failPreview = useCallback((error: unknown) => {
    setState((previous) => ({ ...previous, error: describeImportError(error) }));
  }, []);

  const previewMutation = useMutation({
    mutationFn: ({ provider, file }: { provider: ImportProviderSlug; file: File }) =>
      menuImportService.previewFromFile(provider, file),
    onSuccess: applyPreview,
    onError: failPreview,
  });

  const manualPreviewMutation = useMutation({
    mutationFn: (products: ImportManualProductPayload[]) =>
      menuImportService.previewFromManual(products),
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

  /** Validation de la grille — miroir de ce que refuse BuildManualImport. */
  const manualValidation = useMemo(() => validateManualRows(state.manualRows), [state.manualRows]);

  const submitManual = useCallback(() => {
    if (!manualValidation.canSubmit) {
      setState((previous) => ({
        ...previous,
        error:
          manualValidation.submittable.length === 0
            ? 'Saisissez au moins un produit.'
            : 'Corrigez les lignes signalées avant de continuer.',
      }));
      return;
    }
    manualPreviewMutation.mutate(buildManualPayload(state.manualRows));
  }, [manualPreviewMutation, manualValidation, state.manualRows]);

  const commitMutation = useMutation({
    mutationFn: ({ token, decisions }: { token: string; decisions: ImportDecisions }) =>
      menuImportService.commitImport(token, decisions),
    onSuccess: (result) => {
      setState((previous) => ({ ...previous, step: 'done', result, blockers: [], error: null }));
    },
    onError: (error) => {
      setState((previous) => ({
        ...previous,
        blockers: readCommitBlockers(error),
        error: describeCommitError(error),
        expired: isPreviewExpiredError(error),
      }));
    },
  });

  const commit = useCallback(() => {
    if (!state.preview || !state.decisions) return;
    commitMutation.mutate({
      token: state.preview.token,
      decisions: buildImportDecisions(state.preview, state.decisions),
    });
  }, [commitMutation, state.decisions, state.preview]);

  const templateMutation = useMutation({
    mutationFn: () => menuImportService.downloadTemplate(TEMPLATE_PROVIDER),
    onSuccess: () => {
      toast.success('Modèle téléchargé', {
        description: 'Remplissez-le, puis revenez l’importer depuis « une autre caisse ».',
      });
    },
    onError: (error) => {
      const message = describeImportError(error);
      setState((previous) => ({ ...previous, error: message }));
      toast.error('Téléchargement impossible', { description: message });
    },
  });

  /** Ce qu'il reste à trancher — miroir des conditions de rejet du backend. */
  const precheck = useMemo(
    () => (state.preview && state.decisions ? importPrecheck(state.preview, state.decisions) : null),
    [state.decisions, state.preview],
  );

  return {
    state,
    precheck,
    manualValidation,
    isUploading: previewMutation.isPending,
    isSubmittingManual: manualPreviewMutation.isPending,
    isCommitting: commitMutation.isPending,
    isDownloadingTemplate: templateMutation.isPending,

    goToDoor,
    back,
    reset,
    setProvider,
    setFile,
    submitFile,
    downloadTemplate: templateMutation.mutate,

    setManualCell,
    addManualRow,
    duplicateManualRow: duplicateManualRowById,
    removeManualRow,
    submitManual,

    setTagClass,
    setProductCategory,
    assignCategoryToAll,
    setTvaId,
    setCollisionResolution,
    commit,
  };
};

export type UseProductImport = ReturnType<typeof useProductImport>;
