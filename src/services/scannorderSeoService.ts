import { apiClient, isApiHttpError, unwrapErrorData } from '@/services/apiClient';

// Référencement de la page ScanNOrder de l'établissement (Google, Bing…) :
// titre, description, types de cuisine, liens publics.
// API : GET/PATCH /integrations/scannorder/seo, POST …/seo/suggest
// (ib-welloresto-api docs/scannorder-seo.md).

const ENDPOINT = '/integrations/scannorder/seo';
const OWN_ERRORS = { suppressErrorToast: true } as const;

interface Envelope<T> {
  id: string;
  data: T;
}

export interface CuisineOption {
  code: string;
  /** La cuisine (« Pizza », « Libanaise »). */
  label: string;
  /** Le type d'établissement repris dans le titre Google (« Pizzeria »). */
  place: string;
}

export interface ScanNOrderSeoSettings {
  title: string;
  description: string;
  /** Codes de cuisine, le type principal en premier. */
  cuisine_types: string[];
  links: string[];
  cuisine_options: CuisineOption[];
  limits: {
    title_max_length: number;
    description_max_length: number;
    cuisines_max: number;
    links_max: number;
  };
  /** Suggestion par IA ouverte sur cet environnement. */
  suggest_available: boolean;
  updated_at: string | null;
}

export type ScanNOrderSeoUpdate = Partial<Pick<ScanNOrderSeoSettings, 'title' | 'description' | 'cuisine_types' | 'links'>>;

export interface ScanNOrderSeoSuggestion {
  description: string;
  cuisine_types: string[];
}

export const scannorderSeoService = {
  async get(): Promise<ScanNOrderSeoSettings> {
    const response = await apiClient.get<Envelope<ScanNOrderSeoSettings>>(ENDPOINT, OWN_ERRORS);
    return response.data;
  },

  async update(changes: ScanNOrderSeoUpdate): Promise<ScanNOrderSeoSettings> {
    const response = await apiClient.patch<Envelope<ScanNOrderSeoSettings>>(ENDPOINT, changes, OWN_ERRORS);
    return response.data;
  },

  async suggest(): Promise<ScanNOrderSeoSuggestion> {
    const response = await apiClient.post<Envelope<ScanNOrderSeoSuggestion>>(`${ENDPOINT}/suggest`, undefined, OWN_ERRORS);
    return response.data;
  },
};

const FIELD_MESSAGES: Record<string, string> = {
  'title:too_long': 'Le titre est trop long.',
  'description:too_long': 'La description est trop longue.',
  'cuisine_types:too_many': 'Choisissez au plus 3 types de cuisine.',
  'cuisine_types:unknown_cuisine': 'Type de cuisine inconnu.',
  'links:too_many': 'Trop de liens.',
  'links:invalid_link': "Ce lien n'est pas une adresse web valide",
};

const SUGGEST_MESSAGES: Record<string, string> = {
  seo_suggest_disabled: "La suggestion automatique n'est pas disponible pour le moment.",
  menu_too_small: 'Votre carte ScanNOrder compte trop peu de produits visibles pour proposer une description.',
  seo_suggest_failed: "La suggestion n'a pas abouti. Réessayez dans un instant.",
};

/** Message en français pour une erreur d'enregistrement ou de suggestion. */
export const seoErrorMessage = (error: unknown): string => {
  if (isApiHttpError(error)) {
    if (error.status === 429) return 'Trop de suggestions demandées. Réessayez dans une heure.';
    const body = unwrapErrorData(error.responseBody as Record<string, unknown> | undefined);
    const code = typeof body?.error === 'string' ? body.error : '';
    if (code === 'invalid_field') {
      const message = FIELD_MESSAGES[`${body?.field}:${body?.reason}`] ?? 'Une saisie est invalide.';
      return body?.value ? `${message} : « ${String(body.value)} »` : message;
    }
    if (SUGGEST_MESSAGES[code]) return SUGGEST_MESSAGES[code];
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
};
