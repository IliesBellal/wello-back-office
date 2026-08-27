import { useState } from "react";
import { rolesApi } from "@/services/welloApi";
import { isApiHttpError } from "@/services/apiClient";
import type { RoleDetail } from "@/types/roles";

export interface VersionConflictInfo {
  currentVersion: number;
  freshRole: RoleDetail;
}

/**
 * A stale-version write (PATCH /roles/{id} or PUT /roles/{id}/permissions)
 * comes back as a 409 with {current_version} — apiClient suppresses the
 * generic toast for this code (ROLE_DIALOG_CODES) so VersionConflictDialog
 * can present a reload-without-losing-draft recovery instead. The caller's
 * draft (name/description text, permission checkbox selections) is never
 * touched here — only the server-truth `baseline` the caller diffs against
 * changes, once "Recharger" is confirmed.
 */
export function useRoleVersionConflict(roleId: string | undefined) {
  const [conflict, setConflict] = useState<VersionConflictInfo | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  /** Call from a mutation's catch block. Returns true if this WAS a version
   * conflict (the caller should stop there — apiClient already suppressed
   * its toast for this code, so falling through would leave the failure
   * silently unhandled). Returns false for anything else so the caller can
   * let it propagate normally. */
  const captureIfVersionConflict = async (error: unknown): Promise<boolean> => {
    if (!roleId || !isApiHttpError(error)) return false;
    const body = error.responseBody as { status?: string; current_version?: number } | undefined;
    if (body?.status !== "version_conflict") return false;

    setIsReloading(true);
    try {
      const freshRole = await rolesApi.get(roleId);
      setConflict({ currentVersion: body.current_version ?? freshRole.version, freshRole });
    } finally {
      setIsReloading(false);
    }
    return true;
  };

  return {
    conflict,
    isReloading,
    captureIfVersionConflict,
    dismiss: () => setConflict(null),
  };
}
