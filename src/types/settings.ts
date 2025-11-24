export interface UserProfile {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  avatar: string;
}

export interface EstablishmentInfo {
  name: string;
  phone: string;
  siret: string;
  address: string;
  currency: string;
  primary_color: string;
  text_color: string;
  is_open: boolean;
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

export interface EstablishmentSettings {
  info: EstablishmentInfo;
  timings: EstablishmentTimings;
  ordering: EstablishmentOrdering;
  scan_order: EstablishmentScanOrder;
}

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'color' | 'switch' | 'select';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  group: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}
