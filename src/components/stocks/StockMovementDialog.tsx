import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StockComponent, updateStockMovement } from "@/services/stocksService";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from "lucide-react";

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

  const handleSubmit = async () => {
    if (!component || !quantity) return;

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast.error("Veuillez entrer une quantité valide");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalQuantity = movementType === "entry" ? numQuantity : -numQuantity;
      
      await updateStockMovement({
        component_id: component.component_id,
        unit: component.unit.unit_name,
        quantity: finalQuantity,
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
            <ToggleGroup
              type="single"
              value={movementType}
              onValueChange={(value) => value && setMovementType(value as MovementType)}
              className="justify-start"
            >
              <ToggleGroupItem value="entry" className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                Entrée
              </ToggleGroupItem>
              <ToggleGroupItem value="exit" className="gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                Sortie
              </ToggleGroupItem>
              <ToggleGroupItem value="loss" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Perte
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité ({component.unit.unit_name})</Label>
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
              Stock actuel: {component.quantity} {component.unit.unit_name}
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
