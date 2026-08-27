import { ShieldOff } from "lucide-react";

/**
 * Shown wherever a role's permission set is empty — E2 (role editor), E3
 * (Accès tab's read-only preview), E5 (Mes droits). A role with zero
 * permissions is a normal, correct state (the "staff" system role ships
 * empty by design — see docs/decisions.md), never an empty list, which
 * would read as a bug.
 */
export function EmptyPermissionsNotice() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
      <ShieldOff className="h-4 w-4 shrink-0" />
      <span>Aucun droit particulier — accès aux opérations courantes uniquement.</span>
    </div>
  );
}
