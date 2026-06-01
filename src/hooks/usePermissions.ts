import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Reads the connected user's rights from AuthContext and exposes
 * granular boolean flags for feature-gating.
 *
 * Source fields:
 *   - authData.access.admin                          → isAdmin
 *   - authData.access.permissions.manage_users       → canManageUsers
 *   - authData.access.permissions.manage_plannings   → canManagePlannings
 *   - authData.capabilities.actions.*                → canManage* (fallback)
 *   - authData.capabilities.modules.{planning,users} → hasModule*
 */
export const usePermissions = () => {
  const { authData } = useAuth();

  return useMemo(() => {
    if (!authData) {
      return {
        isAdmin: false,
        canManageUsers: false,
        canManagePlannings: false,
        canManageMenu: false,
        canManageSettings: false,
        canManageHaccp: false,
        canViewReports: false,
        canExportReports: false,
        canViewFinancials: false,
        canExportFinancials: false,
        canManageCustomers: false,
        canExportCustomers: false,
        canOpenCashDrawer: false,
        canPrintCashReport: false,
        canAccessReception: false,
        canAccessDelivery: false,
        canAccessWaiter: false,
        hasModulePlanning: false,
        hasModuleUsers: false,
        hasModuleHr: false,
      };
    }

    const admin = authData.access?.admin ?? false;
    const perms = authData.access?.permissions ?? {};
    const actions = authData.capabilities?.actions ?? {};
    const modules = authData.capabilities?.modules ?? {};

    /** Resolves a flag from permissions map, falling back to capabilities.actions. */
    const flag = (key: string): boolean =>
      (perms[key] ?? actions[key] ?? false) as boolean;

    return {
      isAdmin: admin,

      // HR / planning capabilities
      canManageUsers: admin || flag("manage_users"),
      canManagePlannings: admin || flag("manage_plannings"),

      // Back-office capabilities
      canManageMenu: admin || flag("manage_menu"),
      canManageSettings: admin || flag("manage_settings"),
      canManageHaccp: admin || flag("manage_haccp"),

      // Reporting capabilities
      canViewReports: admin || flag("view_reports"),
      canExportReports: admin || flag("export_reports"),
      canViewFinancials: admin || flag("view_financials"),
      canExportFinancials: admin || flag("export_financials"),

      // Customer capabilities
      canManageCustomers: admin || flag("manage_customers"),
      canExportCustomers: admin || flag("export_customers"),

      // POS / cash capabilities
      canOpenCashDrawer: admin || flag("open_cash_drawer"),
      canPrintCashReport: admin || flag("print_merchant_cash_report"),
      canAccessReception: admin || flag("access_reception"),
      canAccessDelivery: admin || flag("access_delivery"),
      canAccessWaiter: admin || flag("access_waiter"),

      // Module-level activation flags
      hasModulePlanning: (modules["planning"] ?? false) as boolean,
      hasModuleUsers: (modules["users"] ?? false) as boolean,
      hasModuleHr: (modules["hr"] ?? false) as boolean,
    };
  }, [authData]);
};
