import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { buildImportDecisions, effectivePrice, importPrecheck } from '@/lib/importDecisions';
import { MAX_MENU_PHOTOS, normalizeMenuPhotos } from '@/lib/menuPhotos';
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
  IMPORT_CHANNELS,
  TEMPLATE_PROVIDER,
  tvaMappingKey,
  type ImportChannel,
  type ImportChannelPrices,
  type ImportCollisionResolution,
  type ImportCommitBlocker,
  type ImportCommitResponse,
  type ImportDecisions,
  type ImportPreviewProduct,
  type ImportPreviewResult,
  type ImportManualProductPayload,
  type ImportPhotoDraft,
  type ImportPhotoDraftStatus,
  type ImportProviderSlug,
  type ImportReimportResolution,
  type ImportTagClass,
} from '@/types/import';

/**
 * Étapes du parcours d'import.
 *
 * `preview` n'est atteinte qu'avec un `ImportPreviewResult` en main, `done`
 * qu'avec un résultat de commit.
 */
export type ImportStep =
  | 'choose'
  | 'provider'
  | 'preview'
  | 'manual'
  | 'done'
  | 'merchant'
  | 'photo'
  | 'photo_reading';

/** Porte par laquelle la prévisualisation a été obtenue. */
export type ImportDoor = 'provider' | 'manual' | 'merchant' | 'photo';

/** Statuts d'un brouillon photo pendant lesquels la lecture tourne encore. */
const PHOTO_DRAFT_RUNNING: ImportPhotoDraftStatus[] = ['pending', 'processing'];
const PHOTO_POLL_INTERVAL = 2500;

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
  /** Établissement source choisi — porte « autre établissement » uniquement. */
  sourceMerchantId: string | null;
  /** Photos choisies, avant préparation et envoi — porte photo. */
  photos: File[];
  /** Brouillon photo suivi (lecture en cours, puis relecture). */
  photoDraftId: string | null;
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
  provider: 'wello-generic',
  file: null,
  manualRows: [createManualRow()],
  sourceMerchantId: null,
  photos: [],
  photoDraftId: null,
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
  already_imported: {},
  excluded_products: {},
});

const photoDraftKey = (draftId: string) => ['menuImportPhotoDraft', draftId] as const;
const PHOTO_DRAFTS_KEY = ['menuImportPhotoDrafts'] as const;

export const useProductImport = () => {
  const [state, setState] = useState<ProductImportState>(initialState);
  const queryClient = useQueryClient();

  const reset = useCallback(() => setState(initialState), []);

  const goToDoor = useCallback((step: ImportStep) => {
    setState((previous) => ({
      ...previous,
      step,
      door: step === 'provider' || step === 'manual' || step === 'photo' ? step : previous.door,
      error: null,
    }));
  }, []);

  const back = useCallback(() => {
    setState((previous) => {
      // Porte photo : la lecture continue côté serveur, le brouillon reste
      // repris depuis l'étape photo.
      if (previous.step === 'photo_reading') {
        return { ...initialState, step: 'photo', door: 'photo' };
      }
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
          sourceMerchantId: previous.sourceMerchantId,
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

  const setSourceMerchantId = useCallback((merchantId: string) => {
    setState((previous) => ({ ...previous, sourceMerchantId: merchantId, error: null }));
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
    (rate: number, channel: string, tvaId: number) => {
      patchDecisions((current) => ({
        ...current,
        tva_mapping: { ...current.tva_mapping, [tvaMappingKey(rate, channel)]: tvaId },
      }));
    },
    [patchDecisions],
  );

  const setReimportResolution = useCallback(
    (productExternalId: string, resolution: ImportReimportResolution) => {
      patchDecisions((current) => ({
        ...current,
        already_imported: { ...current.already_imported, [productExternalId]: resolution },
      }));
    },
    [patchDecisions],
  );

  /**
   * Applique le même sort à tous les produits déjà importés.
   *
   * Le cas d'usage est un menu entier supprimé puis réimporté : personne ne va
   * basculer cent quarante produits un par un.
   */
  const setAllReimportResolutions = useCallback(
    (productExternalIds: string[], resolution: ImportReimportResolution) => {
      patchDecisions((current) => {
        const next = { ...current.already_imported };
        for (const productId of productExternalIds) {
          next[productId] = resolution;
        }
        return { ...current, already_imported: next };
      });
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

  const setProductExcluded = useCallback(
    (productExternalId: string, excluded: boolean) => {
      patchDecisions((current) => ({
        ...current,
        excluded_products: { ...current.excluded_products, [productExternalId]: excluded },
      }));
    },
    [patchDecisions],
  );

  /** Inclut ou écarte tout le catalogue d'un coup — « tout sélectionner ». */
  const setAllProductsExcluded = useCallback(
    (productExternalIds: string[], excluded: boolean) => {
      patchDecisions((current) => {
        const next = { ...current.excluded_products };
        for (const productId of productExternalIds) {
          next[productId] = excluded;
        }
        return { ...current, excluded_products: next };
      });
    },
    [patchDecisions],
  );

  // ─── Porte photo : décisions ────────────────────────────

  /** Prix saisi sur un canal, en centimes ; les deux autres canaux gardent le leur. */
  const setProductPrice = useCallback(
    (product: ImportPreviewProduct, channel: ImportChannel, cents: number) => {
      patchDecisions((current) => {
        const prices = {} as ImportChannelPrices;
        for (const { key } of IMPORT_CHANNELS) {
          prices[key] = key === channel ? cents : effectivePrice(product, key, current);
        }
        return {
          ...current,
          price_per_product: { ...current.price_per_product, [product.external_id]: prices },
        };
      });
    },
    [patchDecisions],
  );

  /** TVA choisie sur un canal (`tva_id` de la caisse du marchand). */
  const setProductTva = useCallback(
    (productExternalId: string, channel: ImportChannel, tvaId: number) => {
      patchDecisions((current) => ({
        ...current,
        tva_per_product: {
          ...current.tva_per_product,
          [productExternalId]: { ...current.tva_per_product?.[productExternalId], [channel]: tvaId },
        },
      }));
    },
    [patchDecisions],
  );

  /** Rattache un produit à un groupe, ou le laisse à la racine avec `""`. */
  const setProductGroup = useCallback(
    (productExternalId: string, groupExternalId: string) => {
      patchDecisions((current) => ({
        ...current,
        group_per_product: { ...current.group_per_product, [productExternalId]: groupExternalId },
      }));
    },
    [patchDecisions],
  );

  const setTvaConfirmed = useCallback(
    (confirmed: boolean) => {
      patchDecisions((current) => ({ ...current, tva_confirmed: confirmed }));
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

  // ─── Porte photo : envoi et lecture ─────────────────────

  /** Ajoute des photos à la sélection, dans la limite autorisée. */
  const addPhotos = useCallback((files: File[]) => {
    setState((previous) => {
      const photos = [...previous.photos, ...files];
      if (photos.length > MAX_MENU_PHOTOS) {
        return {
          ...previous,
          photos: photos.slice(0, MAX_MENU_PHOTOS),
          error: `${MAX_MENU_PHOTOS} photos au maximum : les suivantes n’ont pas été ajoutées.`,
        };
      }
      return { ...previous, photos, error: null };
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setState((previous) => ({
      ...previous,
      photos: previous.photos.filter((_, i) => i !== index),
      error: null,
    }));
  }, []);

  const followPhotoDraft = useCallback(
    (draft: ImportPhotoDraft) => {
      queryClient.setQueryData(photoDraftKey(draft.id), draft);
      setState((previous) => ({
        ...previous,
        step: 'photo_reading',
        door: 'photo',
        photoDraftId: draft.id,
        photos: [],
        error: null,
      }));
    },
    [queryClient],
  );

  const photoUploadMutation = useMutation({
    // Préparation dans le navigateur (orientation, taille, JPEG), puis envoi.
    mutationFn: async (files: File[]) =>
      menuImportService.startPhotoImport(await normalizeMenuPhotos(files)),
    onSuccess: followPhotoDraft,
    onError: failPreview,
  });

  const submitPhotos = useCallback(() => {
    if (state.photos.length === 0) {
      setState((previous) => ({ ...previous, error: 'Ajoutez au moins une photo de votre carte.' }));
      return;
    }
    photoUploadMutation.mutate(state.photos);
  }, [photoUploadMutation, state.photos]);

  /** Reprend un brouillon existant (lecture en cours ou terminée). */
  const resumePhotoDraft = useCallback((draftId: string) => {
    setState((previous) => ({
      ...previous,
      step: 'photo_reading',
      door: 'photo',
      photoDraftId: draftId,
      error: null,
    }));
  }, []);

  // Suivi du brouillon : interrogé tant que la lecture tourne, puis figé.
  const photoDraftQuery = useQuery({
    queryKey: photoDraftKey(state.photoDraftId ?? ''),
    queryFn: () => menuImportService.getPhotoDraft(state.photoDraftId as string),
    enabled: state.step === 'photo_reading' && Boolean(state.photoDraftId),
    refetchInterval: (query) =>
      query.state.data && !PHOTO_DRAFT_RUNNING.includes(query.state.data.status)
        ? false
        : PHOTO_POLL_INTERVAL,
  });
  // Gardé pendant la relecture : les liens des photos y sont affichés.
  const photoDraft = state.photoDraftId ? photoDraftQuery.data ?? null : null;

  const photoRetryMutation = useMutation({
    mutationFn: (draftId: string) => menuImportService.retryPhotoDraft(draftId),
    onSuccess: followPhotoDraft,
    onError: failPreview,
  });

  const retryPhotos = useCallback(() => {
    if (state.photoDraftId) photoRetryMutation.mutate(state.photoDraftId);
  }, [photoRetryMutation, state.photoDraftId]);

  /** Passe à la vérification avec ce qui a été lu. */
  const reviewPhotoDraft = useCallback(() => {
    if (photoDraft?.preview) applyPreview(photoDraft.preview);
  }, [applyPreview, photoDraft]);

  // Toutes les photos lues : vérification directe. S'il reste des photos en
  // échec, l'étape de lecture laisse choisir entre relancer et continuer.
  useEffect(() => {
    if (
      state.step === 'photo_reading' &&
      photoDraft?.status === 'ready' &&
      photoDraft.preview &&
      photoDraft.photos_done === photoDraft.photos_total
    ) {
      applyPreview(photoDraft.preview);
    }
  }, [applyPreview, photoDraft, state.step]);

  const photoDraftsQuery = useQuery({
    queryKey: PHOTO_DRAFTS_KEY,
    queryFn: () => menuImportService.listPhotoDrafts(),
    enabled: state.step === 'photo',
  });

  const photoAbandonMutation = useMutation({
    mutationFn: (draftId: string) => menuImportService.abandonPhotoDraft(draftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PHOTO_DRAFTS_KEY }),
    onError: failPreview,
  });


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

  // ─── Autre établissement ────────────────────────────────

  const merchantPreviewMutation = useMutation({
    mutationFn: (sourceMerchantId: string) => menuImportService.previewFromMerchant(sourceMerchantId),
    onSuccess: applyPreview,
    onError: failPreview,
  });

  const submitMerchantSource = useCallback(() => {
    if (!state.sourceMerchantId) {
      setState((previous) => ({ ...previous, error: 'Choisissez un établissement source.' }));
      return;
    }
    merchantPreviewMutation.mutate(state.sourceMerchantId);
  }, [merchantPreviewMutation, state.sourceMerchantId]);

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
    isAnalyzingMerchant: merchantPreviewMutation.isPending,
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

    setSourceMerchantId,
    submitMerchantSource,

    setTagClass,
    setProductCategory,
    assignCategoryToAll,
    setTvaId,
    setCollisionResolution,
    setReimportResolution,
    setAllReimportResolutions,
    setProductExcluded,
    setAllProductsExcluded,
    commit,

    // Porte photo
    photoDraft,
    photoDrafts: photoDraftsQuery.data ?? null,
    isLoadingPhotoDrafts: photoDraftsQuery.isLoading,
    isUploadingPhotos: photoUploadMutation.isPending,
    isRetryingPhotos: photoRetryMutation.isPending,
    addPhotos,
    removePhoto,
    submitPhotos,
    resumePhotoDraft,
    retryPhotos,
    reviewPhotoDraft,
    abandonPhotoDraft: photoAbandonMutation.mutate,
    setProductPrice,
    setProductTva,
    setProductGroup,
    setTvaConfirmed,
  };
};

export type UseProductImport = ReturnType<typeof useProductImport>;
