export type MfaType = '' | 'email_sms';

export interface UserProfile {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  birth_date?: string;
  address?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  avatar: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  mfa_type?: MfaType;
}

export interface EstablishmentInfo {
  name: string;
  phone: string;
  website?: string;
  country_code?: string;
  siret: string;
  address: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  currency: string;
  primary_color: string;
  text_color: string;
  is_open: boolean;
  logo_url?: string;
}

export interface EstablishmentTimings {
  wait_time_min: number;
  wait_time_max: number;
  auto_close_enabled: boolean;
  auto_close_delay: number;
}

export interface EstablishmentOrdering {
  paid_orders_only: boolean;
  concurrent_capacity: number;
  service_required: string;
  disable_low_stock: boolean;
  register_required: boolean;
  active_on_site: boolean;
  active_takeaway: boolean;
  active_delivery: boolean;
  upsell_enabled: boolean;
}

export interface EstablishmentScanOrder {
  active_delivery: boolean;
  active_takeaway: boolean;
  active_on_site: boolean;
  auto_accept_delivery: boolean;
  auto_accept_takeaway: boolean;
  allow_scheduled: boolean;
  max_schedule_days: number;
  enable_rating: boolean;
}

export interface EstablishmentSecurity {
  pos_auto_lock_enabled: boolean;
  pos_auto_lock_delay_minutes: number;
}

export interface CustomerFormRequirements {
  [fieldKey: string]: {
    dine_in: boolean;
    take_away: boolean;
    delivery: boolean;
  };
}

export interface HourOfOperation {
  id: string;
  day_of_week_from: number;
  day_of_week_to: number;
  hour_from: string;
  hour_to: string;
  booking_capacity: number;
  first_booking_time?: string | null;
  last_booking_time?: string | null;
  valid_from: string;
  valid_to?: string | null;
  enabled: boolean;
}

export interface HourOfOperationPayload {
  day_of_week_from: number;
  day_of_week_to: number;
  hour_from: string;
  hour_to: string;
  booking_capacity: number;
  first_booking_time?: string | null;
  last_booking_time?: string | null;
  valid_from: string;
  valid_to?: string | null;
}

export interface VacationPeriod {
  id: string;
  label?: string | null;
  start_at: string;
  end_at: string;
  enabled: boolean;
}

export interface VacationPeriodPayload {
  label?: string | null;
  start_at: string;
  end_at: string;
}

export interface EstablishmentSettings {
  info: EstablishmentInfo;
  timings: EstablishmentTimings;
  ordering: EstablishmentOrdering;
  scan_order: EstablishmentScanOrder;
  security: EstablishmentSecurity;
  hours_of_operations: HourOfOperation[];
  customer_form_requirements: CustomerFormRequirements | null;
}

export const DEFAULT_CUSTOMER_FORM_REQUIREMENTS: CustomerFormRequirements = {
  first_name: { dine_in: false, take_away: false, delivery: false },
  name: { dine_in: false, take_away: false, delivery: false },
  phone: { dine_in: false, take_away: false, delivery: false },
  postal_address: { dine_in: false, take_away: false, delivery: false },
  email: { dine_in: false, take_away: false, delivery: false },
};

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'color' | 'switch' | 'select';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  group: string;
  placeholder?: string;
  min?: number;
  max?: number;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
}
