import type { AuthData } from "@/types/auth";
import type { PermissionKey } from "@/types/roles";

/**
 * Pure permission check against the synchronous authData snapshot —
 * mirrors the shape of moduleAccess.ts's hasModuleAccess() so both
 * usePermissions() and navConfig.ts's visibilityCheck can share it without
 * one importing the other.
 */
export const checkPermission = (
  authData: AuthData | null | undefined,
  key: PermissionKey,
): boolean => {
  if (!authData) return false;
  if (authData.access?.admin) return true;
  return authData.permissions?.includes(key) ?? false;
};
