import {
  API_BASE_URL,
  apiClient,
  isApiHttpError,
  logAPI,
  type WelloApiResponse,
} from '@/services/apiClient';
import { getStoredAuthToken } from '@/types/auth';
import type {
  ImportCommitBlocker,
  ImportManualProductPayload,
  ImportCommitResponse,
  ImportDecisions,
  ImportPreviewResult,
  ImportProviderSlug,
} from '@/types/import';

/** Taille acceptée par l'API (internal/modules/menu/import_models.go). */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Code d'erreur métier renvoyé par l'API sous `data.error`.
 *
 * `parseErrorResponse` ne lit que le niveau racine du corps ; nos endpoints
 * renvoient l'enveloppe `{ id, data: { error, message } }`, le code est donc à
 * extraire ici.
 */
export interface ImportApiError {
  status: number;
  code?: string;
  message?: string;
}

const readImportApiError = (error: unknown): ImportApiError | null => {
  if (!isApiHttpError(error)) return null;

  const body = error.responseBody;
  if (typeof body !== 'object' || body === null) {
    return { status: error.status };
  }

  const data = (body as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) {
    return { status: error.status };
  }

  const payload = data as { error?: unknown; message?: unknown };
  return {
    status: error.status,
    code: typeof payload.error === 'string' ? payload.error : undefined,
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
};

// ─── Normalisation de la prévisualisation ───────────────────

/**
 * Recolle les collections absentes de la réponse.
 *
 * L'API est en Go : une slice ou une map nil se sérialise en `null`, pas en
 * `[]` / `{}`. Un export dont toutes les catégories viennent de libellés
 * renvoie donc `"categories": null`, un produit sans libellé
 * `"tag_external_ids": null` — et tout le code en aval, qui traite la
 * prévisualisation comme une structure complète, casse sur un `.map`.
 * La frontière est le bon endroit pour rendre le contrat vrai : les types
 * annoncent des tableaux, on en fournit.
 */
const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const asRecord = <T>(value: Record<string, T> | null | undefined): Record<string, T> =>
  value && typeof value === 'object' ? value : {};

const normalizePreview = (preview: ImportPreviewResult): ImportPreviewResult => ({
  ...preview,
  tva_rates: asArray(preview.tva_rates),
  categories: asArray(preview.categories),
  tags: asArray(preview.tags),
  attributes: asArray(preview.attributes),
  warnings: asArray(preview.warnings),
  products: asArray(preview.products).map((product) => ({
    ...product,
    tag_external_ids: asArray(product.tag_external_ids),
    dropped_label_external_ids: asArray(product.dropped_label_external_ids),
  })),
  decisions: {
    tag_classification: asRecord(preview.decisions?.tag_classification),
    category_per_product: asRecord(preview.decisions?.category_per_product),
    tva_mapping: asRecord(preview.decisions?.tva_mapping),
    name_collisions: asRecord(preview.decisions?.name_collisions),
  },
});

export const menuImportService = {
  /**
   * Prévisualise un fichier d'import. N'écrit rien : l'API rend un jeton et un
   * dry-run complet, que le commit consommera ensuite.
   */
  async previewFromFile(provider: ImportProviderSlug, file: File): Promise<ImportPreviewResult> {
    logAPI('POST', '/menu/import/preview', {
      provider,
      fileName: file.name,
      fileSize: file.size,
    });

    const formData = new FormData();
    formData.append('provider', provider);
    formData.append('file', file);

    // apiClient détecte FormData et laisse le navigateur poser le boundary.
    const response = await apiClient.post<WelloApiResponse<ImportPreviewResult>>(
      '/menu/import/preview',
      formData,
    );

    return normalizePreview(response.data);
  },

  /**
   * Prévisualise une saisie de masse.
   *
   * Même endpoint que le fichier, même pipeline ensuite : seule l'entrée
   * change. `provider` n'est pas envoyé — l'API retient « manual » par défaut.
   */
  async previewFromManual(products: ImportManualProductPayload[]): Promise<ImportPreviewResult> {
    logAPI('POST', '/menu/import/preview', { products: products.length });

    const response = await apiClient.post<WelloApiResponse<ImportPreviewResult>>(
      '/menu/import/preview',
      { products },
    );

    return normalizePreview(response.data);
  },

  /**
   * Matérialise un lot précédemment prévisualisé.
   *
   * Seul appel de la chaîne d'import qui écrit. Un lot incomplet repart en 422
   * avec la liste des blocages, sans qu'une ligne ait été insérée.
   */
  async commitImport(token: string, decisions: ImportDecisions): Promise<ImportCommitResponse> {
    logAPI('POST', '/menu/import/commit', { token });

    const response = await apiClient.post<WelloApiResponse<ImportCommitResponse>>(
      '/menu/import/commit',
      { token, decisions },
    );

    return response.data;
  },

  /**
   * Télécharge le modèle vierge et déclenche l'enregistrement du fichier.
   *
   * Passe par `fetch` plutôt que par `apiClient`, qui parse systématiquement la
   * réponse en JSON — même patron que l'export des tickets de caisse.
   */
  async downloadTemplate(provider: ImportProviderSlug): Promise<void> {
    logAPI('GET', '/menu/import/template', { provider });

    const response = await fetch(
      `${API_BASE_URL}/menu/import/template?provider=${encodeURIComponent(provider)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getStoredAuthToken() || ''}`,
          'X-App-Source': 'backoffice',
        },
      },
    );

    if (!response.ok) {
      throw new Error("Le modèle n'a pas pu être téléchargé.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromDisposition(response.headers.get('Content-Disposition'));
    link.click();
    window.URL.revokeObjectURL(url);
  },
};

/** Nom de fichier proposé par le serveur, avec repli si l'en-tête manque. */
const filenameFromDisposition = (disposition: string | null): string => {
  const fallback = 'wello-modele-import-produits.xlsx';
  if (!disposition) return fallback;

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
};

// ─── Messages d'erreur ──────────────────────────────────────

/**
 * Traduit un échec d'import en message actionnable.
 *
 * Les codes proviennent de `sendImportError` et `previewFromMultipart`
 * (internal/modules/menu/import_handler.go). Le message du serveur est
 * conservé quand il porte une information que nous n'avons pas — typiquement
 * la ligne et la colonne fautives d'un fichier mal rempli.
 */
export const describeImportError = (error: unknown): string => {
  const apiError = readImportApiError(error);

  if (!apiError) {
    return error instanceof Error && error.message
      ? error.message
      : "L'import a échoué. Réessayez dans un instant.";
  }

  switch (apiError.code) {
    case 'missing_provider':
    case 'unknown_provider':
      return "Choisissez d'abord le logiciel d'origine du fichier.";

    case 'missing_file':
      return 'Sélectionnez un fichier à importer.';

    case 'file_too_large_or_invalid':
      return 'Fichier trop volumineux ou illisible (5 Mo maximum, format .xlsx).';

    case 'no_products':
      return 'Aucun produit trouvé dans ce fichier — vérifiez le fichier et le logiciel sélectionné.';

    case 'invalid_file':
      return apiError.message
        ? `Le fichier n'a pas pu être lu : ${apiError.message}`
        : "Le fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un fichier .xlsx.";

    case 'invalid_file_content':
      return apiError.message
        ? `Le fichier contient une erreur — ${apiError.message}`
        : 'Le fichier contient une ligne que nous ne savons pas lire.';

    case 'template_unavailable':
      return "Ce logiciel n'a pas de modèle à télécharger : utilisez son propre export.";
  }

  if (apiError.status === 413) {
    return 'Fichier trop volumineux (5 Mo maximum).';
  }
  if (apiError.status === 403) {
    return "Vous n'avez pas les droits pour importer des produits.";
  }

  return apiError.message || "L'import a échoué. Réessayez dans un instant.";
};

// ─── Erreurs du commit ──────────────────────────────────────

/** Le jeton de prévisualisation a expiré, ou a déjà servi. */
export const isPreviewExpiredError = (error: unknown): boolean => {
  const apiError = readImportApiError(error);
  return apiError?.status === 410;
};

/**
 * Blocages d'un 422. Vide pour toute autre erreur : l'appelant les rend au plus
 * près de l'entité concernée plutôt qu'en message global.
 */
export const readCommitBlockers = (error: unknown): ImportCommitBlocker[] => {
  if (!isApiHttpError(error) || error.status !== 422) return [];

  const body = error.responseBody;
  if (typeof body !== 'object' || body === null) return [];

  const data = (body as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return [];

  const blockers = (data as { blockers?: unknown }).blockers;
  if (!Array.isArray(blockers)) return [];

  return blockers.filter(
    (blocker): blocker is ImportCommitBlocker =>
      typeof blocker === 'object' &&
      blocker !== null &&
      typeof (blocker as ImportCommitBlocker).code === 'string' &&
      typeof (blocker as ImportCommitBlocker).message === 'string',
  );
};

/** Message affiché en tête quand le commit échoue. */
export const describeCommitError = (error: unknown): string => {
  const apiError = readImportApiError(error);

  if (apiError?.status === 410) {
    return 'Cette vérification a expiré ou a déjà été validée. Renvoyez le fichier pour repartir d’une prévisualisation à jour.';
  }
  if (apiError?.code === 'import_not_committable') {
    return 'Il reste des choix à faire avant de pouvoir enregistrer.';
  }
  if (apiError?.code === 'missing_preview_token') {
    return 'La prévisualisation a été perdue. Renvoyez le fichier.';
  }

  return describeImportError(error);
};
