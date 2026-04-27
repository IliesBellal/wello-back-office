import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StockComponent, updateStockMovement, type StockMovementType } from "@/services/stocksService";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockMovementDialogProps {
  component: StockComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type MovementType = "entry" | "exit" | "loss";

export const StockMovementDialog = ({
  component,
  open,
  onOpenChange,
  onSuccess,
}: StockMovementDialogProps) => {
  const [movementType, setMovementType] = useState<MovementType>("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQuantity = Number.parseFloat(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const stockAfterSave = hasValidQuantity
    ? component
      ? movementType === "entry"
        ? component.quantity + parsedQuantity
        : component.quantity - parsedQuantity
      : 0
    : component?.quantity ?? 0;

  const handleSubmit = async () => {
    if (!component || !quantity) return;

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast.error("Veuillez entrer une quantité valide");
      return;
    }

    setIsSubmitting(true);

    try {
      const apiTypeByMovement: Record<MovementType, Exclude<StockMovementType, 'consumption'>> = {
        entry: "add",
        exit: "remove",
        loss: "loss",
      };
      
      await updateStockMovement({
        component_id: component.component_id,
        unit_id: component.unit.unit_id ?? component.unit.unit_name,
        quantity: numQuantity,
        type: apiTypeByMovement[movementType],
        comment: reason || undefined,
      });

      toast.success("Mouvement enregistré avec succès");
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du mouvement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMovementType("entry");
    setQuantity("");
    setReason("");
    onOpenChange(false);
  };

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mouvement de stock - {component.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de mouvement</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMovementType("entry")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
                  movementType === "entry"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <ArrowDownToLine className="h-4 w-4" />
                Entrée
              </button>
              <button
                type="button"
                onClick={() => setMovementType("exit")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
                  movementType === "exit"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Sortie
              </button>
              <button
                type="button"
                onClick={() => setMovementType("loss")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
                  movementType === "loss"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Trash2 className="h-4 w-4" />
                Perte
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité ({component.unit.unit_short_name})</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Stock actuel: {component.quantity} {component.unit.unit_short_name}
            </p>
            <p className="text-sm text-foreground font-medium">
              Stock après enregistrement: {stockAfterSave.toFixed(3).replace(/\.0+$/, "").replace(/(\.[0-9]*[1-9])0+$/, "$1")} {component.unit.unit_short_name}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Livraison Metro, Inventaire..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !quantity}>
            {isSubmitting ? "Enregistrement..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
