// ─── Entry & payloads ───────────────────────────────────────────────────────

// split_by_source / display_only_paid_orders: production-screen display
// settings that used to live device-local (Flutter's SharedPreferences,
// ProductionSettingsNotifier) — now profile-level fields, like name, so
// they travel with the profile's definition instead of being reconfigured
// on every device.
//
// load_slot_interval_minutes / load_slot_duration_hours / load_max_capacity_count:
// the PRODUCTION screen's workload indicator settings for this profile
// (one cadence/capacity per station) — the app's "commandes en cours"
// screen combines every profile's values instead of reading a single one.
export interface ProductionProfileEntry {
  id: string;
  name: string;
  split_by_source: boolean;
  display_only_paid_orders: boolean;
  load_slot_interval_minutes: number;
  load_slot_duration_hours: number;
  load_max_capacity_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionProfileProductEntry {
  product_id: string;
  should_produce: boolean;
  should_monitor: boolean;
}

// GET /production-profiles/{id} — sparse products: only products carrying at
// least one true flag are included (see ib-welloresto-api's
// internal/modules/productionprofiles/repository.go, GetProfile).
export interface ProductionProfileDetail extends ProductionProfileEntry {
  products: ProductionProfileProductEntry[];
}

export interface CreateProductionProfileRequest {
  name: string;
  split_by_source?: boolean;
  display_only_paid_orders?: boolean;
  load_slot_interval_minutes?: number;
  load_slot_duration_hours?: number;
  load_max_capacity_count?: number;
}

export type UpdateProductionProfileRequest = CreateProductionProfileRequest;
