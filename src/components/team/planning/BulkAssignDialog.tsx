import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Employee } from "@/types/planning";

/**
 * Dialog d'assignation en masse depuis le menu "3 points" d'une ligne.
 *
 * Combine, dans une seule modale :
 *   1. la **sélection de la cible** (Select employé, ligne source exclue),
 *   2. la **confirmation explicite** (libellé dynamique avec count + cible).
 *
 * `sourceEmployeeId === null` ⇒ la ligne source est "Non assigné". Sinon
 * c'est un employé existant — auquel cas on l'exclut du sélecteur.
 *
 * Pas d'undo natif : le bouton "Confirmer" est désactivé tant qu'aucune
 * cible n'est choisie, et le wording rappelle le nombre exact de shifts
 * impactés. L'opération ne fait que des PATCH d'`employee_id` (réversible
 * manuellement).
 */
interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = ligne "Non assigné". */
  sourceEmployeeId: string | null;
  /** Nom lisible de la ligne source (ex. "Léa Dupont" ou "Non assigné"). */
  sourceLabel: string;
  /** Liste complète des employés actifs (la source sera exclue). */
  employees: Employee[];
  /** Nombre de shifts impactés (calculé en amont sur la fenêtre visible). */
  shiftsCount: number;
  /** Indique si une opération est en cours (désactive le bouton de confirmation). */
  isSubmitting?: boolean;
  /** Appelé avec l'`employee_id` cible choisi par l'utilisateur. */
  onConfirm: (targetEmployeeId: string) => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  sourceEmployeeId,
  sourceLabel,
  employees,
  shiftsCount,
  isSubmitting,
  onConfirm,
}: BulkAssignDialogProps) {
  const [targetId, setTargetId] = useState<string>("");

  // Reset la sélection à chaque ouverture / changement de ligne source.
  useEffect(() => {
    if (open) setTargetId("");
  }, [open, sourceEmployeeId]);

  const isFromUnassigned = sourceEmployeeId === null;
  const verb = isFromUnassigned ? "Assigner" : "Transférer";

  // Cible : tous les employés actifs SAUF la ligne source.
  const candidates = useMemo(
    () => employees.filter((e) => e.id !== sourceEmployeeId),
    [employees, sourceEmployeeId],
  );

  const target = candidates.find((e) => e.id === targetId) ?? null;
  const targetName = target ? `${target.first_name} ${target.last_name}` : null;

  const title = isFromUnassigned
    ? "Assigner les shifts non assignés"
    : `Transférer les shifts de ${sourceLabel}`;

  const description = targetName
    ? `${verb} les ${shiftsCount} shift${shiftsCount > 1 ? "s" : ""} ${
        isFromUnassigned ? "non assignés" : `de ${sourceLabel}`
      } de la semaine ${isFromUnassigned ? "à" : "vers"} ${targetName} ?`
    : `Choisis l'employé destinataire pour les ${shiftsCount} shift${
        shiftsCount > 1 ? "s" : ""
      } de la semaine.`;

  const canSubmit = !!targetId && shiftsCount > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Label htmlFor="bulk-target">
            {isFromUnassigned ? "Assigner à" : "Transférer vers"}
          </Label>
          <Select value={targetId} onValueChange={setTargetId} disabled={isSubmitting}>
            <SelectTrigger id="bulk-target">
              <SelectValue placeholder="Choisir un employé" />
            </SelectTrigger>
            <SelectContent>
              {candidates.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Aucun autre employé disponible.
                </div>
              ) : (
                candidates.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                    {e.position ? ` · ${e.position}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => targetId && onConfirm(targetId)}
          >
            {isSubmitting ? "Application…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
