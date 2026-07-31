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
import { AlertCircle } from "lucide-react";

import { planningEmployeesApi, planningPositionsApi, planningRefsApi, usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { EmployeeHrFieldsCards } from "@/components/team/EmployeeHrFieldsCards";
import {
  EMPTY_HR_FORM,
  emptyToNull,
  hrFormToPatch,
  validateEmployeeHrForm,
  type EmployeeHrForm,
} from "@/components/team/employeeHrFields";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When provided, the created fiche is linked to this user account right away
   * (`user_id`), and the identity fields are pre-filled from the account.
   * Omit to create a standalone "planning-only" fiche (no linked account).
   */
  userId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEmployeeDialog({ open, onOpenChange, userId }: CreateEmployeeDialogProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hrForm, setHrForm] = useState<EmployeeHrForm>(EMPTY_HR_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: userDetail } = useQuery({
    queryKey: userId ? qk.users.detail(userId) : (["users", "detail", "none"] as const),
    queryFn: () => usersApi.get(userId!),
    enabled: open && !!userId,
  });

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

  useEffect(() => {
    if (!open) return;
    setFirstName(userDetail?.first_name ?? "");
    setLastName(userDetail?.last_name ?? "");
    setEmail(userDetail?.email ?? "");
    setPhone(userDetail?.tel ?? "");
    setHrForm(EMPTY_HR_FORM);
    setSubmitError(null);
  }, [open, userDetail]);

  const set = <K extends keyof EmployeeHrForm>(key: K, value: EmployeeHrForm[K]) => {
    setHrForm((f) => ({ ...f, [key]: value }));
  };

  const validationErrors: string[] = [];
  if (!firstName.trim()) validationErrors.push("Le prénom est obligatoire.");
  if (!lastName.trim()) validationErrors.push("Le nom est obligatoire.");
  validationErrors.push(...validateEmployeeHrForm(hrForm));
  const hasErrors = validationErrors.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      planningEmployeesApi.create({
        user_id: userId ?? undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: emptyToNull(email.trim()),
        phone: emptyToNull(phone.trim()),
        ...hrFormToPatch(hrForm),
      }),
    onSuccess: () => {
      toast.success(userId ? "Fiche employé créée et liée" : "Fiche employé créée");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: qk.users.member(userId) });
        queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
        queryClient.invalidateQueries({ queryKey: qk.users.all });
      }
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setSubmitError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (hasErrors) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une fiche employé</DialogTitle>
          <DialogDescription>
            {userId
              ? "Crée une fiche employé rattachée directement à ce compte utilisateur."
              : "Crée une fiche assignable dans le planning, sans compte utilisateur associé."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="create-emp-email" className="text-xs">Email</Label>
              <Input
                id="create-emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-emp-phone" className="text-xs">Téléphone</Label>
              <Input
                id="create-emp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <EmployeeHrFieldsCards form={hrForm} set={set} positions={positions} contractTypes={contractTypes} />

          {submitError && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {hasErrors && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={hasErrors || mutation.isPending}>
            {mutation.isPending ? "Création…" : "Créer la fiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
