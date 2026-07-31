/**
 * DTO types for the admin "Users / Members" surface.
 *
 * Fields mirror EXACTLY the contracts described in:
 * - docs/api/ADMIN_USERS_EMPLOYEES_API.md
 * - docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md
 *
 * Money amounts (hourly_rate, gross_monthly_salary, transport_cost) are expressed
 * in cents. Use the helpers in @/lib/money to convert for display.
 */

import type { ApiPagination } from "@/services/apiUnwrap";

// ============= Permissions =============

/**
 * Merchant-scoped permission flags (16 keys, per the docs). Combined with the
 * top-level `admin` flag this forms the 17 access flags of a member's rights.
 */
export interface MerchantUserPermissions {
  access_reception: boolean;
  access_delivery: boolean;
  access_waiter: boolean;
  print_merchant_cash_report: boolean;
  open_cash_drawer: boolean;
  manage_menu: boolean;
  manage_plannings: boolean;
  manage_users: boolean;
  manage_settings: boolean;
  manage_haccp: boolean;
  view_reports: boolean;
  export_reports: boolean;
  view_financials: boolean;
  export_financials: boolean;
  manage_customers: boolean;
  export_customers: boolean;
}

/** Merchant-scoped rights model returned by `GET /users/{id}/rights`. */
export interface MerchantUserRights {
  admin: boolean;
  login_enabled: boolean;
  permissions: MerchantUserPermissions;
}

// ============= Member planning block =============

/** Calculated member status surfaced in lists/detail. */
export type MerchantUserStatus = "active" | "login_disabled" | "disabled";

/** Planning / HR block carried by `users_rights` (member établissement). */
export interface MerchantUserPlanning {
  position_id?: string | null;
  position?: string | null;
  position_note?: string | null;
  job_title?: string | null;
  role?: string | null;
  contract_type_code?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  probation_end_date?: string | null;
  last_medical_checkup_date?: string | null;
  contract_hours?: number | null;
  max_weekly_hours?: number | null;
  required_rest_days?: number | null;
  /** Éligibilité à la majoration dimanche (le taux vient de `PlanningSettings.sunday_multiplier`). */
  sunday_premium?: boolean;
  /** Éligibilité à la majoration nuit (le taux vient de `PlanningSettings.night_shift_multiplier`). */
  night_premium?: boolean;
  hourly_rate?: number | null;
  gross_monthly_salary?: number | null;
  employer_charges_pct?: number | null;
  transport_cost?: number | null;
  hr_comment?: string | null;
}

// ============= List + detail =============

/** One row of `GET /users` (`data.users[]`). */
export interface MerchantUserListItem {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tel: string;
  created_at: string;
  last_login_at?: string | null;
  login_enabled: boolean;
  enabled: boolean;
  status: MerchantUserStatus;
  merchant_rights_id: string;
  admin: boolean;
  permissions: MerchantUserPermissions;
  employee_id?: string | null;
  employee_name?: string | null;
}

/** Full member detail returned by `GET /users/{id}` and `PATCH /users/{id}/member`. */
export interface MerchantUserDetail {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tel: string;
  created_at?: string;
  last_login_at?: string | null;
  enabled: boolean;
  login_enabled: boolean;
  status: MerchantUserStatus;
  admin: boolean;
  permissions: MerchantUserPermissions;
  merchant_rights_id?: string;
  employee_id?: string | null;
  employee_name?: string | null;
  planning?: MerchantUserPlanning;
}

/** Result of `GET /users/linkable-search` (`data.users[]`). */
export interface LinkableUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tel?: string;
}

/** Result of `DELETE /users/{id}/merchant-link` (`data.result`). */
export interface MerchantUserUnlinkResult {
  unlinked: boolean;
  employee_links_cleared: number;
}

// ============= Request payloads =============

/** Body of `POST /users` / `POST /users/create`. */
export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  username?: string;
  email: string;
  /** May be empty: backend generates a random password when blank. */
  password?: string;
  tel?: string;
  merchant_id?: string | null;
  admin?: boolean;
  rights?: {
    admin?: boolean;
    login_enabled?: boolean;
    permissions?: Partial<MerchantUserPermissions>;
  };
  planning?: Partial<MerchantUserPlanningUpsertRequest>;
}

/** Response of `POST /users` (`data.user_id`, no extra envelope). */
export interface CreateUserResponse {
  user_id: string;
}

/** Body of `PUT /users/{id}/rights`. */
export interface MerchantUserRightsUpsertRequest {
  admin: boolean;
  login_enabled: boolean;
  permissions: MerchantUserPermissions;
}

/** Body of `PATCH /users/{id}/member`. All fields optional / patch-like. */
export interface MerchantUserPlanningUpsertRequest {
  position_id?: string | null;
  position_note?: string | null;
  job_title?: string | null;
  role?: string | null;
  contract_type_code?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  probation_end_date?: string | null;
  last_medical_checkup_date?: string | null;
  contract_hours?: number | null;
  max_weekly_hours?: number | null;
  required_rest_days?: number | null;
  sunday_premium?: boolean;
  night_premium?: boolean;
  hourly_rate?: number | null;
  gross_monthly_salary?: number | null;
  employer_charges_pct?: number | null;
  transport_cost?: number | null;
  hr_comment?: string | null;
}

/** Body of `POST /users/{id}/merchant-link`. */
export interface MerchantLinkRequest {
  rights?: MerchantUserRightsUpsertRequest;
  planning?: MerchantUserPlanningUpsertRequest;
}

/** Body of `POST /users/{id}/force-reset-password`. */
export interface ForceResetPasswordRequest {
  new_password: string;
}

// ============= List filters =============

/** Query params accepted by `GET /users`. */
export interface MerchantUserListFilters {
  search?: string;
  active?: boolean;
  linked_employee?: boolean;
  admin?: boolean;
  page?: number;
  page_size?: number;
}

// ============= Re-exports =============

export type { ApiPagination };
