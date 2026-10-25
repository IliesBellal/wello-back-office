// Franchises : contrat de l'API /franchises (ib-welloresto-api, docs/franchises.md).

export type FranchiseRole = "owner" | "manager";

export const franchiseRoleLabels: Record<FranchiseRole, string> = {
  owner: "Propriétaire",
  manager: "Gestionnaire",
};

export interface Franchise {
  franchise_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  /** Couleur du hub (#RRGGBB), null = thème par défaut. */
  brand_color: string | null;
  created_at: string;
}

export interface FranchiseSummary {
  franchise_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: FranchiseRole;
  merchant_count: number;
}

export interface FranchiseList {
  franchises: FranchiseSummary[];
  /** Administrateur d'au moins un établissement : peut créer une franchise. */
  can_create: boolean;
}

export interface FranchiseMerchant {
  merchant_id: string;
  business_name: string;
  address: string;
  zip_code: string;
  city: string;
  logo_url: string | null;
  hub_visible: boolean;
  /** ScanNOrder activé, non coupé par l'abonnement, QR principal : sinon absent du hub. */
  scannorder_active: boolean;
  order_types: { take_away: boolean; delivery: boolean; in: boolean };
  reservation_enabled: boolean;
}

export interface FranchiseDetail {
  franchise: Franchise;
  hub_url: string;
  role: FranchiseRole;
  merchants: FranchiseMerchant[];
}

export interface FranchiseCandidate {
  merchant_id: string;
  business_name: string;
  address: string;
  city: string;
  franchise_id: string | null;
  franchise_name: string | null;
}

export interface FranchiseMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: FranchiseRole;
  created_at: string;
}

export interface FranchiseUpdateRequest {
  name?: string;
  slug?: string;
  /** Chaîne vide = efface. */
  description?: string;
  /** Chaîne vide = thème par défaut. */
  brand_color?: string;
}

export interface FranchiseSlugAvailability {
  slug: string;
  valid: boolean;
  available: boolean;
}

/** Mêmes règles que l'API : 3 à 50 caractères, minuscules, chiffres, tirets simples. */
export const FRANCHISE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const FRANCHISE_SLUG_MIN = 3;
export const FRANCHISE_SLUG_MAX = 50;
export const FRANCHISE_NAME_MAX = 80;
export const FRANCHISE_DESCRIPTION_MAX = 500;

/** GET /franchises/{id}/stats — statistiques du hub (D24, D25). */
export interface FranchiseStats {
  franchise_id: string;
  date_from: string;
  date_to: string;
  /** Premier événement mesuré (YYYY-MM-DD), null si aucun. */
  tracking_since: string | null;
  totals: {
    hub_views: number;
    order_clicks: number;
    reservation_clicks: number;
    hub_orders: number;
    hub_revenue_ttc_cents: number;
  };
  sources: { source: string; views: number }[];
  daily: { date: string; hub_views: number; order_clicks: number; hub_orders: number }[];
  merchants: {
    merchant_id: string;
    business_name: string;
    order_clicks: number;
    reservation_clicks: number;
    hub_orders: number;
    hub_revenue_ttc_cents: number;
  }[];
}
