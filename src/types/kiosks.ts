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
  inactivity_timeout_sec: number;
  upsell_enabled: boolean;
  pay_at_counter_enabled: boolean;
  card_payment_enabled: boolean;
  primary_color: string | null;
  logo_url: string | null;
  idle_image_url: string | null;
  idle_video_url: string | null;
}

export type UpdateKioskSettingsRequest = Omit<
  KioskSettings,
  'logo_url' | 'idle_image_url' | 'idle_video_url'
>;
