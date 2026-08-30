/**
 * DTO types for the RBAC role-administration surface (Lot 9).
 *
 * Fields mirror EXACTLY the contract in ib-welloresto-api's
 * docs/RBAC_ROLES_API.md — do not re-derive shapes from the Go code.
 */

/**
 * Compile-time mirror of the 18-key permission catalog
 * (internal/permission/keys_gen.go). This is NOT the UI catalogue — that
 * always comes from GET /permissions at runtime (labels, domains, sensitive
 * flag). This type exists only so permission-key lookups (usePermissions,
 * the roles screens) are typo-checked at compile time.
 */
export type PermissionKey =
  | "pos.status.manage"
  | "pos.ticket.reopen"
  | "pos.refund"
  | "pos.cash_drawer.open"
  | "pos.analytics"
  | "catalog.manage"
  | "inventory.manage"
  | "haccp.manage"
  | "customers.manage"
  | "staff.manage"
  | "staff.schedule.manage"
  | "reports.sales.read"
  | "reports.financial.read"
  | "settings.manage"
  | "bookings.manage"
  | "platforms.manage"
  | "kiosk.manage"
  | "seating_plan.manage";

/** One entry of GET /permissions — key/domain stay `string`, not
 * PermissionKey: the catalog is the runtime source of truth and must not
 * become a type error if it outgrows this compile-time mirror. */
export interface Permission {
  key: string;
  domain: string;
  label: string;
  description: string;
  is_sensitive: boolean;
  sort_order: number;
  deprecated_at: string | null;
}

export interface PermissionDomainGroup {
  domain: string;
  permissions: Permission[];
}

export type RoleSystemKey = "admin" | "staff";

/** Role fields common to every role response shape. */
export interface Role {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  system_key: RoleSystemKey | null;
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** GET /roles list item — has counts, no permissions[]. */
export interface RoleEntry extends Role {
  permission_count: number;
  member_count: number;
}

/** GET/POST/PATCH single-role responses — has permissions[], no counts. */
export interface RoleDetail extends Role {
  permissions: Permission[];
}

export interface RoleMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  enabled: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  duplicate_from_role_id?: string;
}

/** version is REQUIRED (400 role_version_required if missing/<=0) — not the
 * optional-patch pattern used elsewhere in this codebase. */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  version: number;
}

export interface UpdateRolePermissionsRequest {
  permission_keys: string[];
  version: number;
}

export interface MyPermissions {
  role: { id: string; name: string; system_key: RoleSystemKey | null } | null;
  permissions: string[];
  is_admin: boolean;
}
