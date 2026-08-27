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
import { Separator } from "@/components/ui/separator";
import { Plus, Minus } from "lucide-react";
import type { PermissionDiff } from "@/lib/roleDiff";

interface SaveDiffDialogProps {
  open: boolean;
  diff: PermissionDiff | null;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Gates PUT /roles/{id}/permissions specifically — not the name/description
 * PATCH, which saves directly. Shown for edit and duplicate (a non-empty
 * baseline makes the diff a real safety check); the caller skips this for a
 * plain create, where the baseline is always zero permissions and the
 * "diff" would just restate everything picked.
 */
export function SaveDiffDialog({ open, diff, isSaving, onConfirm, onCancel }: SaveDiffDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer les modifications de droits</AlertDialogTitle>
          <AlertDialogDescription>
            Voici les droits qui changeront pour toute personne portant ce rôle.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {diff && diff.added.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-700 flex items-center gap-1 mb-1.5">
                <Plus className="h-3.5 w-3.5" /> Ajoutés ({diff.added.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {diff.added.map((p) => (
                  <Badge key={p.key} variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {diff && diff.added.length > 0 && diff.removed.length > 0 && <Separator />}

          {diff && diff.removed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1.5">
                <Minus className="h-3.5 w-3.5" /> Retirés ({diff.removed.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {diff.removed.map((p) => (
                  <Badge key={p.key} variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {diff && diff.added.length === 0 && diff.removed.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun changement de droits.</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
