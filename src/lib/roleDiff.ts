import type { Permission } from "@/types/roles";

export interface PermissionDiff {
  added: Permission[];
  removed: Permission[];
}

/** Diffs two permission sets by key — shared by the save-confirmation dialog
 * (E2) and the version-conflict recovery dialog (what changed underneath
 * you while you were editing). */
export function diffPermissions(before: Permission[], after: Permission[]): PermissionDiff {
  const beforeKeys = new Set(before.map((p) => p.key));
  const afterKeys = new Set(after.map((p) => p.key));
  return {
    added: after.filter((p) => !beforeKeys.has(p.key)),
    removed: before.filter((p) => !afterKeys.has(p.key)),
  };
}
