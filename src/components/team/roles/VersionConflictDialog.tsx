import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { diffPermissions } from "@/lib/roleDiff";
import type { Permission } from "@/types/roles";
import type { VersionConflictInfo } from "@/hooks/useRoleVersionConflict";

interface VersionConflictDialogProps {
  conflict: VersionConflictInfo | null;
  /** The baseline the user loaded when they opened the editor — diffed
   * against the fresh server state to show what changed underneath them. */
  loadedPermissions: Permission[];
  isReloading: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * On version_conflict, the user's draft (name/description text, permission
 * checkboxes) is deliberately NOT touched anywhere in this flow — only
 * "Recharger" replaces the parent's `baseline` with fresh server truth.
 * Because PUT /roles/{id}/permissions fully replaces the set (not a merge),
 * retrying after reload could silently drop whatever the other editor just
 * changed — this dialog surfaces that diff before the user decides.
 */
export function VersionConflictDialog({ conflict, loadedPermissions, isReloading, onReload, onDismiss }: VersionConflictDialogProps) {
  const diff = conflict ? diffPermissions(loadedPermissions, conflict.freshRole.permissions) : null;

  return (
    <AlertDialog open={!!conflict} onOpenChange={(next) => !next && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ce rôle a été modifié entre-temps</AlertDialogTitle>
          <AlertDialogDescription>
            Quelqu'un d'autre a enregistré une modification sur ce rôle pendant que vous l'éditiez
            {conflict ? ` (version actuelle : ${conflict.currentVersion})` : ""}. Votre saisie en cours n'est pas perdue —
            rechargez pour repartir de l'état actuel, puis revérifiez vos changements.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
          <div className="space-y-2 max-h-60 overflow-y-auto text-sm">
            <p className="text-xs font-medium text-muted-foreground">Ce qui a changé côté serveur :</p>
            {diff.added.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {diff.added.map((p) => (
                  <Badge key={p.key} variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 gap-1">
                    <Plus className="h-3 w-3" /> {p.label}
                  </Badge>
                ))}
              </div>
            )}
            {diff.removed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {diff.removed.map((p) => (
                  <Badge key={p.key} variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive gap-1">
                    <Minus className="h-3 w-3" /> {p.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReloading}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onReload} disabled={isReloading}>
            {isReloading ? "Rechargement..." : "Recharger"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
