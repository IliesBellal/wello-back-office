import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { buildImportDecisions, importPrecheck } from '@/lib/importDecisions';
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
  type ImportProviderSlug,
  type ImportTagClass,
} from '@/types/import';

/**
 * Étapes du parcours d'import.
 *
 * `preview` n'est atteinte qu'avec un `ImportPreviewResult` en main, `done`
 * qu'avec un résultat de commit.
 */
export type ImportStep = 'choose' | 'provider' | 'preview' | 'manual-stub' | 'done';

export interface ProductImportState {
  step: ImportStep;
  provider: ImportProviderSlug;
  file: File | null;
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
  provider: 'zelty',
  file: null,
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
    setState((previous) => ({ ...previous, step, error: null }));
  }, []);

  const back = useCallback(() => {
    setState((previous) => {
      // Depuis la vérification, on revient au choix du fichier en gardant le
      // provider : c'est le geste attendu quand on s'est trompé de fichier.
      if (previous.step === 'preview' || previous.step === 'done') {
        return {
          ...initialState,
          provider: previous.provider,
          step: 'provider',
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

  const previewMutation = useMutation({
    mutationFn: ({ provider, file }: { provider: ImportProviderSlug; file: File }) =>
      menuImportService.previewFromFile(provider, file),
    onSuccess: (preview) => {
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
    },
    onError: (error) => {
      setState((previous) => ({ ...previous, error: describeImportError(error) }));
    },
  });

  const submitFile = useCallback(() => {
    if (!state.file) {
      setState((previous) => ({ ...previous, error: 'Sélectionnez un fichier à importer.' }));
      return;
    }
    previewMutation.mutate({ provider: state.provider, file: state.file });
  }, [previewMutation, state.file, state.provider]);

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
    isUploading: previewMutation.isPending,
    isCommitting: commitMutation.isPending,
    isDownloadingTemplate: templateMutation.isPending,

    goToDoor,
    back,
    reset,
    setProvider,
    setFile,
    submitFile,
    downloadTemplate: templateMutation.mutate,

    setTagClass,
    setProductCategory,
    assignCategoryToAll,
    setTvaId,
    setCollisionResolution,
    commit,
  };
};

export type UseProductImport = ReturnType<typeof useProductImport>;
