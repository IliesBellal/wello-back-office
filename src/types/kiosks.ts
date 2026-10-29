// ─── Enums ──────────────────────────────────────────────────────────────────

export type KioskStatus = 'pending' | 'active' | 'inactive' | 'revoked';

export type ForceFulfillmentType = 'DINE_IN' | 'TAKE_AWAY';

// ─── Labels ─────────────────────────────────────────────────────────────────

export const kioskStatusLabels: Record<KioskStatus, string> = {
  pending: 'En attente',
  active: 'Active',
  inactive: 'Inactive',
  revoked: 'Révoquée',
};

// ─── Entry & payloads ───────────────────────────────────────────────────────

export interface KioskEntry {
  id: string;
  name: string;
  status: KioskStatus;
  app_version: string | null;
  hardware_model: string | null;
  last_heartbeat_at: string | null;
  last_ip: string | null;
  enabled: boolean;
  created_at: string;
}

export interface UpdateKioskRequest {
  name: string;
}

// ─── Enrollment codes ───────────────────────────────────────────────────────

export interface EnrollmentCode {
  id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface EnrollmentCodeCreated {
  code: string;
  expires_at: string;
}

// ─── Business errors (200 OK with an error payload in `data`) ──────────────

export type KioskApiErrorStatus = 'kiosk_max_kiosks_reached';

export interface KioskApiErrorPayload {
  error: string;
  message: string;
  status: KioskApiErrorStatus | string;
}

export const kioskApiErrorMessages: Record<KioskApiErrorStatus, string> = {
  kiosk_max_kiosks_reached: 'Le nombre maximum de bornes actives pour cet établissement a été atteint.',
};

// ─── Settings ───────────────────────────────────────────────────────────────

export interface KioskSettings {
  fulfillment_dine_in: boolean;
  fulfillment_take_away: boolean;
  force_fulfillment_type: ForceFulfillmentType | null;
  pager_number_required: boolean;
  show_allergens: boolean;
  show_promo_badge: boolean;
  inactivity_timeout_sec: number;
  upsell_enabled: boolean;
  pay_at_counter_enabled: boolean;
  card_payment_enabled: boolean;
  primary_color: string | null;
  logo_url: string | null;
  idle_image_url: string | null;
  idle_video_url: string | null;
  marketing_ribbon: KioskMarketingRibbon;
}

// ─── Ruban marketing ────────────────────────────────────────────────────────
// Rotation d'images et de vidéos affichée en haut de l'écran de menu de la
// borne. Périmètre établissement : toutes les bornes affichent la même rotation.

export type KioskMarketingMediaKind = 'image' | 'video';

export const KIOSK_MARKETING_DURATION_MIN = 3;
export const KIOSK_MARKETING_DURATION_MAX = 120;

export interface KioskMarketingMedia {
  id: string;
  kind: KioskMarketingMediaKind;
  url: string;
  // Durée EFFECTIVE, résolue côté serveur (durée propre sinon durée par
  // défaut). Sans objet pour une vidéo, jouée en entier.
  duration_seconds: number;
  // Vrai si la durée est propre au média, faux s'il suit la durée par défaut.
  custom_duration: boolean;
  sort_order: number;
}

export interface KioskMarketingRibbon {
  enabled: boolean;
  default_duration_seconds: number;
  media: KioskMarketingMedia[];
}

export const kioskMarketingMediaKindLabels: Record<KioskMarketingMediaKind, string> = {
  image: 'Image',
  video: 'Vidéo',
};

export type UpdateKioskSettingsRequest = Omit<
  KioskSettings,
  'logo_url' | 'idle_image_url' | 'idle_video_url' | 'marketing_ribbon'
> & {
  // Absents : l'API laisse la valeur inchangée.
  marketing_ribbon_enabled?: boolean;
  marketing_default_duration_seconds?: number;
};
