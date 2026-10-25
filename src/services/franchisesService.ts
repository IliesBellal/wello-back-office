import { apiClient, isApiHttpError, logAPI } from "@/services/apiClient";
import type {
  FranchiseCandidate,
  FranchiseDetail,
  FranchiseList,
  FranchiseMember,
  FranchiseRole,
  FranchiseSlugAvailability,
  FranchiseStats,
  FranchiseUpdateRequest,
} from "@/types/franchise";

// Routes /franchises de l'API. Les droits suivent l'utilisateur, pas
// l'établissement sélectionné : ces appels ne dépendent pas du sélecteur
// d'établissement. Contrat : ib-welloresto-api/docs/franchises.md.

const BASE = "/franchises";

type Envelope<T> = { id: string; data: { status: string } & T };

/** Le service traduit lui-même les erreurs : pas de toast générique en anglais. */
const OWN_ERRORS = { suppressErrorToast: true } as const;

const errorMessages: Record<string, string> = {
  franchise_not_found: "Franchise introuvable.",
  franchise_forbidden: "Seul un propriétaire de la franchise peut faire cette action.",
  franchise_create_forbidden: "Seul un administrateur d'établissement peut créer une franchise.",
  franchise_name_invalid: "Le nom doit contenir entre 1 et 80 caractères.",
  franchise_slug_invalid: "L'adresse doit contenir 3 à 50 caractères : lettres minuscules, chiffres et tirets.",
  franchise_slug_taken: "Cette adresse est déjà utilisée par une autre franchise.",
  franchise_brand_color_invalid: "La couleur n'est pas valide.",
  franchise_description_invalid: "La description est limitée à 500 caractères.",
  franchise_merchant_not_admin: "Vous devez être administrateur d'un établissement pour l'ajouter à la franchise.",
  franchise_merchant_in_other_franchise: "Cet établissement appartient déjà à une autre franchise.",
  franchise_merchant_not_in_franchise: "Cet établissement ne fait pas partie de la franchise.",
  franchise_member_not_found: "Cette personne ne gère pas la franchise.",
  franchise_member_exists: "Cette personne gère déjà la franchise.",
  franchise_user_not_found: "Aucun compte WelloResto n'utilise cet e-mail.",
  franchise_role_invalid: "Rôle invalide.",
  franchise_last_owner: "La franchise doit garder au moins un propriétaire.",
  file_too_large_or_invalid: "Image trop lourde (5 Mo maximum) ou invalide.",
  invalid_image_type: "Seules les images JPEG, PNG et WebP sont acceptées.",
};

export class FranchiseApiError extends Error {
  readonly code?: string;
  readonly httpStatus?: number;

  constructor(message: string, code?: string, httpStatus?: number) {
    super(message);
    this.name = "FranchiseApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Message affichable pour une erreur de ce service. */
export const franchiseErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof FranchiseApiError ? error.message : fallback;

const call = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (isApiHttpError(error)) {
      const body = error.responseBody as { status?: unknown; error?: unknown } | undefined;
      const code =
        typeof body?.status === "string" ? body.status : typeof body?.error === "string" ? body.error : undefined;
      const message = (code && errorMessages[code]) || "Une erreur est survenue. Veuillez réessayer.";
      throw new FranchiseApiError(message, code, error.status);
    }
    throw error;
  }
};

const path = (franchiseId: string, suffix = "") => `${BASE}/${encodeURIComponent(franchiseId)}${suffix}`;

export const franchisesService = {
  list(): Promise<FranchiseList> {
    logAPI("GET", BASE);
    return call(async () => {
      const response = await apiClient.get<Envelope<FranchiseList>>(`${BASE}/`, OWN_ERRORS);
      return { franchises: response.data.franchises ?? [], can_create: response.data.can_create === true };
    });
  },

  create(name: string, slug?: string): Promise<FranchiseDetail> {
    logAPI("POST", BASE, { name, slug });
    return call(async () => {
      const response = await apiClient.post<Envelope<FranchiseDetail>>(`${BASE}/`, { name, slug }, OWN_ERRORS);
      return response.data;
    });
  },

  slugAvailability(slug: string, excludeId?: string): Promise<FranchiseSlugAvailability> {
    const params = new URLSearchParams({ slug });
    if (excludeId) params.set("exclude_id", excludeId);
    return call(async () => {
      const response = await apiClient.get<Envelope<FranchiseSlugAvailability>>(
        `${BASE}/slug-availability?${params.toString()}`,
        OWN_ERRORS,
      );
      return response.data;
    });
  },

  get(franchiseId: string): Promise<FranchiseDetail> {
    logAPI("GET", path(franchiseId));
    return call(async () => (await apiClient.get<Envelope<FranchiseDetail>>(path(franchiseId), OWN_ERRORS)).data);
  },

  update(franchiseId: string, payload: FranchiseUpdateRequest): Promise<FranchiseDetail> {
    logAPI("PATCH", path(franchiseId), payload);
    return call(async () => (await apiClient.patch<Envelope<FranchiseDetail>>(path(franchiseId), payload, OWN_ERRORS)).data);
  },

  remove(franchiseId: string): Promise<void> {
    logAPI("DELETE", path(franchiseId));
    return call(async () => {
      await apiClient.delete(path(franchiseId), OWN_ERRORS);
    });
  },

  uploadImage(franchiseId: string, imageType: "logo" | "banner", file: File): Promise<string> {
    const formData = new FormData();
    formData.append("photo", file);
    logAPI("PUT", path(franchiseId, `/${imageType}`));
    return call(async () => {
      const response = await apiClient.put<Envelope<{ photo_url: string }>>(path(franchiseId, `/${imageType}`), formData, OWN_ERRORS);
      return response.data.photo_url;
    });
  },

  /** Dates locales YYYY-MM-DD incluses. */
  stats(franchiseId: string, dateFrom: string, dateTo: string): Promise<FranchiseStats> {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    return call(async () => (await apiClient.get<Envelope<FranchiseStats>>(path(franchiseId, `/stats?${params.toString()}`), OWN_ERRORS)).data);
  },

  candidates(franchiseId: string): Promise<FranchiseCandidate[]> {
    return call(async () => {
      const response = await apiClient.get<Envelope<{ merchants: FranchiseCandidate[] }>>(path(franchiseId, "/candidates"), OWN_ERRORS);
      return response.data.merchants ?? [];
    });
  },

  addMerchants(franchiseId: string, merchantIds: string[]): Promise<FranchiseDetail> {
    logAPI("POST", path(franchiseId, "/merchants"), { merchant_ids: merchantIds });
    return call(async () =>
      (await apiClient.post<Envelope<FranchiseDetail>>(path(franchiseId, "/merchants"), { merchant_ids: merchantIds }, OWN_ERRORS)).data,
    );
  },

  setMerchantHubVisible(franchiseId: string, merchantId: string, hubVisible: boolean): Promise<FranchiseDetail> {
    const endpoint = path(franchiseId, `/merchants/${encodeURIComponent(merchantId)}`);
    logAPI("PATCH", endpoint, { hub_visible: hubVisible });
    return call(async () => (await apiClient.patch<Envelope<FranchiseDetail>>(endpoint, { hub_visible: hubVisible }, OWN_ERRORS)).data);
  },

  removeMerchant(franchiseId: string, merchantId: string): Promise<FranchiseDetail> {
    const endpoint = path(franchiseId, `/merchants/${encodeURIComponent(merchantId)}`);
    logAPI("DELETE", endpoint);
    return call(async () => (await apiClient.delete<Envelope<FranchiseDetail>>(endpoint, OWN_ERRORS)).data);
  },

  members(franchiseId: string): Promise<FranchiseMember[]> {
    return call(async () => {
      const response = await apiClient.get<Envelope<{ members: FranchiseMember[] }>>(path(franchiseId, "/members"), OWN_ERRORS);
      return response.data.members ?? [];
    });
  },

  addMember(franchiseId: string, email: string, role: FranchiseRole): Promise<FranchiseMember[]> {
    logAPI("POST", path(franchiseId, "/members"), { email, role });
    return call(async () => {
      const response = await apiClient.post<Envelope<{ members: FranchiseMember[] }>>(path(franchiseId, "/members"), { email, role }, OWN_ERRORS);
      return response.data.members ?? [];
    });
  },

  updateMemberRole(franchiseId: string, userId: string, role: FranchiseRole): Promise<FranchiseMember[]> {
    const endpoint = path(franchiseId, `/members/${encodeURIComponent(userId)}`);
    logAPI("PATCH", endpoint, { role });
    return call(async () => {
      const response = await apiClient.patch<Envelope<{ members: FranchiseMember[] }>>(endpoint, { role }, OWN_ERRORS);
      return response.data.members ?? [];
    });
  },

  removeMember(franchiseId: string, userId: string): Promise<FranchiseMember[]> {
    const endpoint = path(franchiseId, `/members/${encodeURIComponent(userId)}`);
    logAPI("DELETE", endpoint);
    return call(async () => {
      const response = await apiClient.delete<Envelope<{ members: FranchiseMember[] }>>(endpoint, OWN_ERRORS);
      return response.data.members ?? [];
    });
  },
};
