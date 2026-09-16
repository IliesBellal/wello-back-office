import type { ArchetypeCode, ResolvedPlan } from '@/types/signupTunnel';

export interface TunnelState {
  // Screen 1 — identity
  provider: 'password' | 'google';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idToken: string | null;

  // Screen 2 — établissement
  businessName: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  phone: string;
  siret: string;
  placeId: string;
  naf: string | null;

  // Screen 3 — type de restauration + consentement
  archetypeCode: ArchetypeCode | null;
  acceptsTerms: boolean;
  acceptsMarketing: boolean;

  // Contexte pré-signup (?ctx=, Chantier 11) — aussi réécrit par l'écran 4
  // (Chantier LOT B 4b) à chaque changement de sélection de modules, via le
  // même mécanisme POST /v1/public/signup-context (cart -> resolved_plan +
  // nouveau context_token).
  contextToken: string | null;
  resolvedPlan: ResolvedPlan | null;
  segment: string | null;
  // cartModules — la liste de modules qui a produit resolvedPlan/contextToken
  // ci-dessus. Distincte de resolvedPlan.breakdown (qui peut inclure des
  // lignes hors modules, ex. le plan lui-même) : c'est la source de
  // pré-cochage de l'écran 4 quand un ?ctx= venant du configurateur vitrine
  // existe déjà.
  cartModules: string[] | null;
}

export const initialTunnelState: TunnelState = {
  provider: 'password',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  idToken: null,

  businessName: '',
  address: '',
  zipCode: '',
  city: '',
  country: 'FR',
  lat: 0,
  lng: 0,
  phone: '',
  siret: '',
  placeId: '',
  naf: null,

  archetypeCode: null,
  acceptsTerms: false,
  acceptsMarketing: false,

  contextToken: null,
  resolvedPlan: null,
  segment: null,
  cartModules: null,
};
