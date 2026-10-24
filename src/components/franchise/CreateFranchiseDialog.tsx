import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import { FRANCHISE_NAME_MAX, type FranchiseDetail } from "@/types/franchise";

interface CreateFranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (detail: FranchiseDetail) => void;
}

/** Création : le nom suffit, l'adresse du hub est dérivée et modifiable ensuite. */
export function CreateFranchiseDialog({ open, onOpenChange, onCreated }: CreateFranchiseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => franchisesService.create(name.trim()),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: qk.franchises.all });
      queryClient.setQueryData(qk.franchises.detail(detail.franchise.franchise_id), detail);
      toast({ title: "Franchise créée", description: "Ajoutez maintenant vos établissements." });
      setName("");
      onOpenChange(false);
      onCreated(detail);
    },
    onError: (error) =>
      toast({
        title: "Création impossible",
        description: franchiseErrorMessage(error, "Impossible de créer la franchise."),
        variant: "destructive",
      }),
  });

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= FRANCHISE_NAME_MAX && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) createMutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Nouvelle franchise</DialogTitle>
            <DialogDescription>
              Regroupez vos établissements sur une page commune où vos clients choisissent le leur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="franchise-name">Nom de la franchise</Label>
            <Input
              id="franchise-name"
              value={name}
              maxLength={FRANCHISE_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="Burger Co"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
