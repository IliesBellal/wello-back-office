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
  /** Fiche Google de l'établissement (chaînes vides si non renseignée). */
  google: GoogleProfile;
  /** Recherche de la fiche par l'API Google disponible ; sinon saisie seule. */
  google_search_available: boolean;
  /** Demande d'avis Google par e-mail après chaque commande ScanNOrder. */
  review_request_enabled: boolean;
  review_requests_sent_30d: number;
}

export interface GoogleProfile {
  place_id: string;
  maps_url: string;
  review_url: string;
}

export interface GoogleCandidate extends GoogleProfile {
  name: string;
  address: string;
}

export interface ScanNOrderSeoUpdate {
  title?: string;
  description?: string;
  cuisine_types?: string[];
  links?: string[];
  google_place_id?: string;
  google_maps_url?: string;
  google_review_url?: string;
  review_request_enabled?: boolean;
}

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

  /** Fiches Google correspondant au nom et à l'adresse de l'établissement. */
  async searchGoogle(): Promise<GoogleCandidate[]> {
    const response = await apiClient.post<Envelope<{ candidates: GoogleCandidate[] }>>(`${ENDPOINT}/google-search`, undefined, OWN_ERRORS);
    return response.data.candidates ?? [];
  },

  /** Demande d'avis de test, envoyée à l'utilisateur connecté. */
  async sendReviewTest(): Promise<{ sent_to: string }> {
    const response = await apiClient.post<Envelope<{ sent_to: string }>>(`${ENDPOINT}/review-request/test`, undefined, OWN_ERRORS);
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
  'google_maps_url:invalid_google_link': "Le lien de la fiche doit être un lien Google (google.com, g.page, maps.app.goo.gl)",
  'google_review_url:invalid_google_link': "Le lien d'avis doit être un lien Google (g.page, search.google.com…)",
  'google_place_id:invalid': 'Identifiant de fiche Google invalide.',
  'review_request_enabled:missing_review_url': "Renseignez d'abord le lien pour laisser un avis.",
};

const SUGGEST_MESSAGES: Record<string, string> = {
  seo_suggest_disabled: "La suggestion automatique n'est pas disponible pour le moment.",
  menu_too_small: 'Votre carte ScanNOrder compte trop peu de produits visibles pour proposer une description.',
  seo_suggest_failed: "La suggestion n'a pas abouti. Réessayez dans un instant.",
  google_search_unavailable: 'La recherche Google est indisponible : collez les liens à la main.',
  missing_review_url: "Enregistrez d'abord le lien pour laisser un avis.",
  missing_user_email: "Votre compte n'a pas d'adresse e-mail pour recevoir le test.",
  review_requests_not_configured: "L'envoi d'e-mails n'est pas disponible pour le moment.",
  send_failed: "L'e-mail n'a pas pu partir. Réessayez dans un instant.",
};

/** Message en français pour une erreur d'enregistrement ou de suggestion. */
export const seoErrorMessage = (error: unknown): string => {
  if (isApiHttpError(error)) {
    if (error.status === 429) return 'Trop de demandes en une heure. Réessayez plus tard.';
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
