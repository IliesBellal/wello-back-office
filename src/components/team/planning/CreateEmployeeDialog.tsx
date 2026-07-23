import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

import { planningEmployeesApi, planningPositionsApi, planningRefsApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Crée une fiche employé "planning" sans compte utilisateur associé
 * (pas de user_id) — utile pour préparer un planning avant l'onboarding
 * du compte, ou pour du personnel qui n'a jamais besoin d'un compte.
 */
export function CreateEmployeeDialog({ open, onOpenChange }: CreateEmployeeDialogProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [contractTypeCode, setContractTypeCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setPositionId("");
      setContractTypeCode("");
      setError(null);
    }
  }, [open]);

  const { data: positions = [] } = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: open,
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      planningEmployeesApi.create({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        position_id: positionId,
        contract_type_code: contractTypeCode,
      }),
    onSuccess: () => {
      toast.success("Fiche employé créée");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Prénom et nom sont obligatoires.");
      return;
    }
    if (!positionId) {
      setError("Le poste est obligatoire.");
      return;
    }
    if (!contractTypeCode) {
      setError("Le type de contrat est obligatoire.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une fiche employé</DialogTitle>
          <DialogDescription>
            Crée une fiche assignable dans le planning, sans compte utilisateur associé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-emp-fn" className="text-xs">Prénom *</Label>
              <Input
                id="create-emp-fn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-emp-ln" className="text-xs">Nom *</Label>
              <Input
                id="create-emp-ln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Poste *</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Type de contrat *</Label>
            <Select value={contractTypeCode} onValueChange={setContractTypeCode}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Création…" : "Créer la fiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
