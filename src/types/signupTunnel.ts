/**
 * Types mirroring ib-welloresto-api's public signup-tunnel contracts
 * (internal/modules/signup, internal/modules/pricing, internal/modules/companies)
 * — LOT A Semaine 3, Chantiers 9-14.
 *
 * Rebuilt 2026-09-11 against docs/WelloResto-Parcours-Client-v2.docx, found
 * mid-session — an earlier version of this file (and the API it called) was
 * built on a verbal simplification of §4.4/§5.6 that the real document
 * contradicted. See ib-welloresto-api's docs/decisions.md for that history.
 */

// ---- Merchant presets (Chantier 9) — the six archetypes, v2. ----
export const RESTAURATION_ARCHETYPES = [
  { code: 'traditional', label: 'Restaurant traditionnel' },
  { code: 'brasserie', label: 'Bar-brasserie' },
  { code: 'pizzeria', label: 'Pizzeria' },
  { code: 'fast_food', label: 'Fast-food et burger' },
  { code: 'snack', label: 'Snack et emporter' },
  { code: 'bakery', label: 'Boulangerie et salon de thé' },
] as const;
export type ArchetypeCode = (typeof RESTAURATION_ARCHETYPES)[number]['code'];

/**
 * NAF -> archetype correspondence for screen 3's pre-selection — the real
 * table, §5.5.1. Note this table alone never selects "pizzeria" or
 * "fast_food": those two archetypes are reachable only by manual pick or
 * (per §5.5.1's last row) the site segment fallback, never by NAF code.
 */
const NAF_TO_ARCHETYPE: Record<string, ArchetypeCode> = {
  '56.10A': 'traditional',
  '56.10C': 'snack',
  '56.30Z': 'brasserie',
  '10.71C': 'bakery',
  '10.71D': 'bakery',
  '47.81Z': 'snack',
};

export function archetypeFromNAF(naf: string | null | undefined): ArchetypeCode | null {
  if (!naf) return null;
  return NAF_TO_ARCHETYPE[naf] ?? null;
}

// ---- Pricing (Chantier 11, §4.4/§1.3) ----
export interface BreakdownLine {
  code: string;
  label: string;
  amount_cents: number;
}

export interface ResolvedPlan {
  plan_code: 'essentiel' | 'pro' | 'complet';
  monthly_total_cents: number;
  breakdown: BreakdownLine[];
}

/** §4.4's exact cart shape. */
export interface Cart {
  modules: string[];
  employees: number;
  kiosks: number;
  extra_pos: number;
  billing_cycle: 'monthly' | 'annual';
}

export interface Attribution {
  utm_source?: string;
  landing?: string;
  referrer?: string;
}

export interface CreateSignupContextRequest {
  segment?: string;
  cart: Cart;
  attribution?: Attribution;
}

export interface CreateSignupContextResponse {
  context_token: string;
  resolved_plan: ResolvedPlan;
  recommended_channel: 'self_serve' | 'assisted';
}

export interface GetSignupContextResponse {
  segment?: string;
  cart: Cart;
  resolved_plan: ResolvedPlan;
  recommended_channel: 'self_serve' | 'assisted';
}

// ---- Legal entity resolution (Chantier 12, §5.4.2) ----
export interface CompanyCandidate {
  siret: string;
  siren: string;
  company_name: string;
  legal_form: string;
  naf: string;
  address: string;
  score: number;
  is_active: boolean;
  high_confidence?: boolean;
}

export interface ResolveCompaniesRequest {
  name: string;
  postal_code: string;
  city: string;
}

export interface ResolveCompaniesResponse {
  candidates: CompanyCandidate[];
}

// ---- Signup itself (§5.6's exact nested shape) ----
export interface SignupIdentity {
  provider: 'password' | 'google';
  id_token?: string;
  email?: string;
  password?: string;
  first_name: string;
  last_name: string;
}

export interface SignupMerchantPayload {
  full_name: string;
  address: string;
  zip_code: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tel: string;
  email: string;
  siret: string;
  place_id: string;
}

export interface SignupRequestPayload {
  context_token?: string;
  identity: SignupIdentity;
  merchant: SignupMerchantPayload;
  preset_code: string;
  accepts_terms: boolean;
  accepts_marketing: boolean;
}

export interface SignupResponsePayload {
  merchant_id: string;
  user_id: string;
  token: string;
  activation_state: string;
}

export interface GoogleAuthResponsePayload {
  merchant_id: string;
  user_id: string;
  token: string;
}
