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

  // Contexte pré-signup (?ctx=, Chantier 11)
  contextToken: string | null;
  resolvedPlan: ResolvedPlan | null;
  segment: string | null;
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
};
