import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  PLANNING_PAYROLL_RATIO_TARGET_PERCENT,
  PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR,
} from "./planningPerformanceTargets";

interface PlanningSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanningSettingsModal({ open, onOpenChange }: PlanningSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Paramètres du planning</DialogTitle>
          <DialogDescription>
            Les paramètres détaillés (repos minimum, pauses, majorations nuit/jours fériés…)
            seront éditables ici prochainement.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Seuils de performance</div>
                <div className="text-sm text-muted-foreground">
                  Ces valeurs seront persistées en base de données dans une prochaine itération. Pour l'instant, l'interface utilise des constantes front.
                </div>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                Temporaire
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="planning-productivity-target">Productivité réelle cible</Label>
                <Input
                  id="planning-productivity-target"
                  value={`${PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR} €/h`}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  Utilisée dans les indicateurs du planning pour distinguer les jours au-dessus ou en dessous de l'objectif.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planning-payroll-target">Coût des shifts / ventes max</Label>
                <Input
                  id="planning-payroll-target"
                  value={`${PLANNING_PAYROLL_RATIO_TARGET_PERCENT} %`}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  Utilisé pour signaler les jours où le ratio masse salariale / ventes dépasse la cible.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Les autres paramètres détaillés du planning seront ajoutés ici progressivement.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
