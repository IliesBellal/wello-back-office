import {
  API_BASE_URL,
  apiClient,
  isApiHttpError,
  logAPI,
  type WelloApiResponse,
} from '@/services/apiClient';
import { getStoredAuthToken } from '@/types/auth';
import {
  TEMPLATE_PROVIDER,
  type CustomerCommitRowDecision,
  type CustomerImportCommitBlocker,
  type CustomerImportCommitSummary,
  type CustomerImportPreviewResult,
  type CustomerImportProviderSlug,
  type CustomerManualImportInput,
} from '@/types/customerImport';

/** Taille acceptée par l'API (internal/modules/customers/customer_import_models.go). */
export const MAX_CUSTOMER_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Code d'erreur métier renvoyé par l'API sous `data.error`.
 *
 * `parseErrorResponse` ne lit que le niveau racine du corps ; nos endpoints
 * renvoient l'enveloppe `{ id, data: { error, message } }`, le code est donc à
 * extraire ici — même lecture que `menuImportService`.
 */
export interface CustomerImportApiError {
  status: number;
  code?: string;
  message?: string;
}

const readCustomerImportApiError = (error: unknown): CustomerImportApiError | null => {
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

/**
 * Recolle les collections absentes de la réponse.
 *
 * L'API est en Go : une slice nil se sérialise en `null`, pas en `[]`. Un
 * fichier sans le moindre avertissement renvoie donc `"warnings": null`, et
 * tout le code en aval qui traite la prévisualisation comme une structure
 * complète casse sur un `.map`/`.filter`. Même correctif que
 * `menuImportService.normalizePreview`.
 */
const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const normalizePreview = (
  preview: CustomerImportPreviewResult,
): CustomerImportPreviewResult => ({
  ...preview,
  rows: asArray(preview.rows),
  warnings: asArray(preview.warnings),
});

export const customerImportService = {
  /**
   * Prévisualise un fichier d'import. N'écrit rien : l'API rend un jeton et un
   * dry-run complet, que le commit consommera ensuite.
   */
  async previewFile(
    provider: CustomerImportProviderSlug,
    file: File,
  ): Promise<CustomerImportPreviewResult> {
    logAPI('POST', '/customers/import/preview', {
      provider,
      fileName: file.name,
      fileSize: file.size,
    });

    const formData = new FormData();
    formData.append('provider', provider);
    formData.append('file', file);

    // apiClient détecte FormData et laisse le navigateur poser le boundary.
    const response = await apiClient.post<WelloApiResponse<CustomerImportPreviewResult>>(
      '/customers/import/preview',
      formData,
    );

    return normalizePreview(response.data);
  },

  /**
   * Prévisualise une saisie de masse.
   *
   * Même endpoint que le fichier, même pipeline ensuite : seule l'entrée
   * change. Le provider n'est pas envoyé — l'API retient « manual ».
   */
  async previewManual(
    customers: CustomerManualImportInput[],
  ): Promise<CustomerImportPreviewResult> {
    logAPI('POST', '/customers/import/preview', { customers: customers.length });

    const response = await apiClient.post<WelloApiResponse<CustomerImportPreviewResult>>(
      '/customers/import/preview',
      { customers },
    );

    return normalizePreview(response.data);
  },

  /**
   * Matérialise un lot précédemment prévisualisé.
   *
   * Seul appel de la chaîne d'import qui écrit. Un lot avec une ligne non
   * résoluble repart en 422 avec la liste des blocages, sans qu'une ligne ait
   * été insérée ou modifiée.
   */
  async commit(
    token: string,
    decisions: CustomerCommitRowDecision[],
  ): Promise<CustomerImportCommitSummary> {
    logAPI('POST', '/customers/import/commit', { token });

    const response = await apiClient.post<WelloApiResponse<CustomerImportCommitSummary>>(
      '/customers/import/commit',
      { token, decisions },
    );

    return response.data;
  },

  /**
   * Télécharge le modèle vierge et déclenche l'enregistrement du fichier.
   *
   * Passe par `fetch` plutôt que par `apiClient`, qui parse systématiquement la
   * réponse en JSON — même patron que `menuImportService.downloadTemplate`.
   */
  async downloadTemplate(
    provider: CustomerImportProviderSlug = TEMPLATE_PROVIDER,
  ): Promise<void> {
    logAPI('GET', '/customers/import/template', { provider });

    const response = await fetch(
      `${API_BASE_URL}/customers/import/template?provider=${encodeURIComponent(provider)}`,
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
  const fallback = 'wello-modele-import-clients.xlsx';
  if (!disposition) return fallback;

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
};

// ─── Messages d'erreur ──────────────────────────────────────

/**
 * Traduit un échec de preview en message actionnable.
 *
 * Les codes proviennent de `sendImportError` et `previewFromMultipart`
 * (internal/modules/customers/customer_import_handler.go).
 */
export const describeCustomerImportError = (error: unknown): string => {
  const apiError = readCustomerImportApiError(error);

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
      return 'Fichier trop volumineux ou illisible (10 Mo maximum).';

    case 'no_customers':
      return 'Aucun client trouvé dans ce fichier — vérifiez le fichier et le logiciel sélectionné.';

    case 'invalid_file':
      return apiError.message
        ? `Le fichier n'a pas pu être lu : ${apiError.message}`
        : "Le fichier n'a pas pu être lu. Vérifiez qu'il correspond bien au format attendu.";

    case 'invalid_file_content':
      return apiError.message
        ? `Le fichier contient une erreur — ${apiError.message}`
        : 'Le fichier contient une ligne que nous ne savons pas lire.';

    case 'template_not_available':
      return "Ce logiciel n'a pas de modèle à télécharger : utilisez son propre export.";
  }

  if (apiError.status === 413) {
    return 'Fichier trop volumineux (10 Mo maximum).';
  }
  if (apiError.status === 403) {
    return "Vous n'avez pas les droits pour importer des clients.";
  }

  return apiError.message || "L'import a échoué. Réessayez dans un instant.";
};

// ─── Erreurs du commit ──────────────────────────────────────

/** Le jeton de prévisualisation a expiré, ou a déjà servi. */
export const isCustomerPreviewExpiredError = (error: unknown): boolean => {
  const apiError = readCustomerImportApiError(error);
  return apiError?.status === 410;
};

/**
 * Blocages d'un 422. Vide pour toute autre erreur : l'appelant les rend au
 * plus près de la ligne concernée plutôt qu'en message global.
 */
export const readCustomerCommitBlockers = (error: unknown): CustomerImportCommitBlocker[] => {
  if (!isApiHttpError(error) || error.status !== 422) return [];

  const body = error.responseBody;
  if (typeof body !== 'object' || body === null) return [];

  const data = (body as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return [];

  const blockers = (data as { blockers?: unknown }).blockers;
  if (!Array.isArray(blockers)) return [];

  return blockers.filter(
    (blocker): blocker is CustomerImportCommitBlocker =>
      typeof blocker === 'object' &&
      blocker !== null &&
      typeof (blocker as CustomerImportCommitBlocker).code === 'string' &&
      typeof (blocker as CustomerImportCommitBlocker).message === 'string',
  );
};

/** Message affiché en tête quand le commit échoue. */
export const describeCustomerCommitError = (error: unknown): string => {
  const apiError = readCustomerImportApiError(error);

  if (apiError?.status === 410) {
    return 'Cette vérification a expiré ou a déjà été validée. Renvoyez le fichier pour repartir d’une prévisualisation à jour.';
  }
  if (apiError?.code === 'import_not_committable') {
    return 'Il reste des choix à faire avant de pouvoir enregistrer.';
  }
  if (apiError?.code === 'missing_preview_token') {
    return 'La prévisualisation a été perdue. Renvoyez le fichier.';
  }

  return describeCustomerImportError(error);
};
