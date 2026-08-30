import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkPermission } from "@/lib/permissions";
import type { PermissionKey } from "@/types/roles";

/**
 * Reads the connected user's rights from AuthContext and exposes granular
 * boolean flags for feature-gating, plus a generic has(key) for new
 * catalog-key checks.
 *
 * RBAC lot 9: purely synchronous, no effect, no query here — it only reads
 * authData.permissions (the catalog-key array populated by the login
 * response). Background revalidation against GET /me/permissions lives once
 * in AuthContext, not here (this hook is mounted by ~10 components; an
 * effect here would repeat the same sync work that many times for one
 * useful write). Never add a loading state to this hook: the 7 screens that
 * gate on it today (`if (!canManageX) return <Navigate/>`) rely on it being
 * synchronous from the very first render.
 *
 * Source correspondence, new catalog key -> old exported name:
 *   staff.manage           -> canManageUsers
 *   staff.schedule.manage  -> canManagePlannings
 *   catalog.manage         -> canManageMenu
 *   settings.manage        -> canManageSettings
 *   haccp.manage           -> canManageHaccp
 *   customers.manage       -> canManageCustomers
 *   pos.cash_drawer.open   -> canOpenCashDrawer
 *   reports.sales.read     -> canViewReports, canExportReports, canPrintCashReport
 *   reports.financial.read -> canViewFinancials, canExportFinancials
 *   bookings.manage        -> canManageBookings (RBAC lot 10)
 *   platforms.manage       -> canManagePlatforms (RBAC lot 10)
 *   kiosk.manage           -> canManageKiosk (RBAC lot 10)
 *   pos.analytics          -> canViewAnalytics (RBAC lot 10)
 *   seating_plan.manage    -> canManageSeatingPlan (RBAC lot 10)
 *
 * canExportCustomers is dropped (guard removed — "qui peut lire peut
 * copier"; was unused by every real consumer). canAccessReception/Delivery/
 * Waiter are also dropped: unused, and backed by a separate mechanism
 * (capabilities.apps.* merchant entitlements) unrelated to RBAC permissions.
 */
export const usePermissions = () => {
  const { authData } = useAuth();

  return useMemo(() => {
    const has = (key: PermissionKey): boolean => checkPermission(authData, key);
    const modules = authData?.capabilities?.modules ?? {};

    return {
      isAdmin: authData?.access?.admin ?? false,
      has,

      canManageUsers: has("staff.manage"),
      canManagePlannings: has("staff.schedule.manage"),
      canManageMenu: has("catalog.manage"),
      canManageSettings: has("settings.manage"),
      canManageHaccp: has("haccp.manage"),
      canManageCustomers: has("customers.manage"),
      canOpenCashDrawer: has("pos.cash_drawer.open"),

      canViewReports: has("reports.sales.read"),
      canExportReports: has("reports.sales.read"),
      canPrintCashReport: has("reports.sales.read"),
      canViewFinancials: has("reports.financial.read"),
      canExportFinancials: has("reports.financial.read"),

      canManageBookings: has("bookings.manage"),
      canManagePlatforms: has("platforms.manage"),
      canManageKiosk: has("kiosk.manage"),
      canViewAnalytics: has("pos.analytics"),
      canManageSeatingPlan: has("seating_plan.manage"),

      hasModulePlanning: (modules["planning"] ?? false) as boolean,
      hasModuleUsers: (modules["users"] ?? false) as boolean,
      hasModuleHr: (modules["hr"] ?? false) as boolean,
    };
  }, [authData]);
};
