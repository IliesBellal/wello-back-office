import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlanningSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanningSettingsModal({ open, onOpenChange }: PlanningSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres du planning</DialogTitle>
          <DialogDescription>
            Les paramètres détaillés (repos minimum, pauses, majorations nuit/jours fériés…)
            seront éditables ici prochainement.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Cette fonctionnalité sera disponible dans une prochaine itération.
        </div>
      </DialogContent>
    </Dialog>
  );
}
