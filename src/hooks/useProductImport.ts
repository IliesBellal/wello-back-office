import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  describeImportError,
  MAX_IMPORT_FILE_SIZE,
  menuImportService,
} from '@/services/menuImportService';
import {
  TEMPLATE_PROVIDER,
  type ImportPreviewResult,
  type ImportProviderSlug,
} from '@/types/import';

/**
 * Étapes du parcours d'import.
 *
 * `preview` n'est atteinte qu'avec un `ImportPreviewResult` en main ; c'est
 * l'étape que la phase suivante remplira avec l'écran de vérification, sans
 * avoir à toucher à cette machine à états.
 */
export type ImportStep = 'choose' | 'provider' | 'preview' | 'manual-stub';

export interface ProductImportState {
  step: ImportStep;
  provider: ImportProviderSlug;
  file: File | null;
  preview: ImportPreviewResult | null;
  error: string | null;
}

const initialState: ProductImportState = {
  step: 'choose',
  provider: 'zelty',
  file: null,
  preview: null,
  error: null,
};

/**
 * Pilote le parcours d'import : quelle porte, quel fichier, quel résultat.
 *
 * Les appels sont des mutations et non des requêtes : ce sont des actions
 * déclenchées par l'utilisateur, sans rien à mettre en cache. Aucune clé de
 * cache n'est donc ajoutée pour eux.
 */
export const useProductImport = () => {
  const [state, setState] = useState<ProductImportState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const goToDoor = useCallback((step: ImportStep) => {
    setState((previous) => ({ ...previous, step, error: null }));
  }, []);

  const back = useCallback(() => {
    setState((previous) => {
      // Depuis la prévisualisation, on revient au choix du fichier en gardant
      // le provider : c'est le geste attendu quand on s'est trompé de fichier.
      if (previous.step === 'preview') {
        return { ...previous, step: 'provider', preview: null, error: null };
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

  const previewMutation = useMutation({
    mutationFn: ({ provider, file }: { provider: ImportProviderSlug; file: File }) =>
      menuImportService.previewFromFile(provider, file),
    onSuccess: (preview) => {
      setState((previous) => ({ ...previous, step: 'preview', preview, error: null }));
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

  return {
    state,
    isUploading: previewMutation.isPending,
    isDownloadingTemplate: templateMutation.isPending,

    goToDoor,
    back,
    reset,
    setProvider,
    setFile,
    submitFile,
    downloadTemplate: templateMutation.mutate,
  };
};

export type UseProductImport = ReturnType<typeof useProductImport>;
