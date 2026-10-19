import { apiClient, logAPI, type WelloApiResponse } from '@/services/apiClient';
import { readImportApiError } from '@/services/menuImportService';
import type {
  AICompositionApplyProduct,
  AICompositionApplyResult,
  AICompositionPreview,
} from '@/types/aiComposition';

/** Plafond de l'API par génération (compositionMaxProducts). */
export const MAX_AI_COMPOSITION_PRODUCTS = 100;

const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

export const menuCompositionService = {
  /**
   * Lit la description des produits et propose leur composition. Consomme un
   * crédit d'import IA (rendu si la lecture échoue) ; n'écrit rien d'autre.
   */
  async previewAICompositions(productIds: string[]): Promise<AICompositionPreview> {
    logAPI('POST', '/menu/products/composition/ai/preview', { products: productIds.length });
    const response = await apiClient.post<WelloApiResponse<AICompositionPreview>>(
      '/menu/products/composition/ai/preview',
      { product_ids: productIds },
      // Message affiché dans la fenêtre (describeCompositionError).
      { suppressErrorToast: true },
    );
    const preview = response.data;
    return {
      ...preview,
      products: asArray(preview.products).map((product) => ({
        ...product,
        current: asArray(product.current),
        proposed: asArray(product.proposed),
      })),
    };
  },

  /** Écrit les compositions gardées. Aucun appel IA, aucun crédit. */
  async applyAICompositions(products: AICompositionApplyProduct[]): Promise<AICompositionApplyResult> {
    logAPI('POST', '/menu/products/composition/ai/apply', { products: products.length });
    const response = await apiClient.post<WelloApiResponse<AICompositionApplyResult>>(
      '/menu/products/composition/ai/apply',
      { products },
      { suppressErrorToast: true },
    );
    return response.data;
  },
};

/** Message actionnable pour un échec de génération ou d'application. */
export const describeCompositionError = (error: unknown): string => {
  const apiError = readImportApiError(error);
  switch (apiError?.code) {
    case 'no_description':
      return 'Aucun des produits choisis n’a de description : ajoutez-en une pour qu’elle soit lue.';
    case 'too_many_products':
      return `${MAX_AI_COMPOSITION_PRODUCTS} produits au maximum par génération : réduisez la sélection.`;
    case 'import_ai_no_credits':
      return 'Vous avez utilisé tous vos crédits d’import IA. Contactez-nous pour en obtenir d’autres.';
    case 'import_ai_already_running':
      return 'Une lecture IA est déjà en cours (import de carte ou composition) : réessayez dans quelques minutes.';
    case 'composition_ai_disabled':
      return 'La génération de composition n’est pas disponible pour le moment.';
    case 'composition_ai_failed':
      return 'La lecture des descriptions a échoué. Réessayez : ce crédit ne vous a pas été décompté.';
    case 'product_not_found':
      return 'Un des produits choisis n’existe plus. Rechargez la page et recommencez.';
  }
  if (apiError?.status === 403) {
    return 'Vous n’avez pas les droits pour modifier la carte.';
  }
  return 'L’opération a échoué. Réessayez dans un instant.';
};
