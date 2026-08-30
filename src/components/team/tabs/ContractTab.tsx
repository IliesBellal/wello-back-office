import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Save, AlertCircle, Info, Plus, Link2, Unlink } from "lucide-react";

import { usersApi, planningPositionsApi, planningRefsApi, planningEmployeesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { MerchantUserPlanning, MerchantUserPlanningUpsertRequest } from "@/types/adminUsers";
import { EmployeeHrFieldsCards } from "@/components/team/EmployeeHrFieldsCards";
import {
  EMPTY_HR_FORM,
  centsToEuroInput,
  hrFormToPatch,
  numToInput,
  validateEmployeeHrForm,
  type EmployeeHrForm,
} from "@/components/team/employeeHrFields";
import { CreateEmployeeDialog } from "@/components/team/planning/CreateEmployeeDialog";
import { LinkExistingEmployeeDialog } from "@/components/team/tabs/LinkExistingEmployeeDialog";

// ─── Form <-> API mapping ─────────────────────────────────────────────────────

function planningToForm(p: MerchantUserPlanning | undefined | null): EmployeeHrForm {
  if (!p) return EMPTY_HR_FORM;
  return {
    position_id: p.position_id ?? "",
    contract_type_code: p.contract_type_code ?? "",
    contract_start_date: p.contract_start_date ?? "",
    contract_end_date: p.contract_end_date ?? "",
    probation_end_date: p.probation_end_date ?? "",
    last_medical_checkup_date: p.last_medical_checkup_date ?? "",
    contract_hours: numToInput(p.contract_hours),
    max_weekly_hours: numToInput(p.max_weekly_hours),
    required_rest_days: numToInput(p.required_rest_days),
    sunday_premium: !!p.sunday_premium,
    night_premium: !!p.night_premium,
    employer_charges_pct: numToInput(p.employer_charges_pct),
    hourly_rate_eur: centsToEuroInput(p.hourly_rate),
    gross_monthly_salary_eur: centsToEuroInput(p.gross_monthly_salary),
    transport_cost_eur: centsToEuroInput(p.transport_cost),
    hr_comment: p.hr_comment ?? "",
  };
}

function formToPayload(form: EmployeeHrForm): MerchantUserPlanningUpsertRequest {
  return hrFormToPatch(form);
}

// ─── "No fiche" gate ──────────────────────────────────────────────────────────

function NoEmployeeGate({
  onOpenCreate,
  onOpenLink,
}: {
  onOpenCreate: () => void;
  onOpenLink: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Link2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Aucune fiche employé</p>
          <p className="text-xs text-muted-foreground mt-1">
            Une fiche employé est nécessaire pour gérer le contrat, la planification et les documents.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button onClick={onOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une fiche employé
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenLink}>
            <Link2 className="h-4 w-4 mr-2" />
            Lier une fiche employé
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ContractTabProps {
  userId: string;
  /** The linked `employees` row id, or `null` when no fiche is linked to this account. */
  employeeId: string | null;
  isActive?: boolean;
}

export function ContractTab({ userId, employeeId, isActive = true }: ContractTabProps) {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

  const { data: member, isLoading: loadingMember } = useQuery({
    queryKey: qk.users.member(userId),
    queryFn: () => usersApi.getMember(userId),
    enabled: isActive && !!userId && !!employeeId,
  });

  const { data: positions = [] } = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: isActive && !!employeeId,
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
    enabled: isActive && !!employeeId,
  });

  const [form, setForm] = useState<EmployeeHrForm>(EMPTY_HR_FORM);

  const normalizeDateInput = (value: string | null | undefined): string => {
    if (!value) return "";
    return value.slice(0, 10);
  };

  useEffect(() => {
    if (!member) {
      setForm(EMPTY_HR_FORM);
      return;
    }
    const normalizedMember: MerchantUserPlanning = {
      ...member,
      contract_start_date: normalizeDateInput(member.contract_start_date),
      contract_end_date: normalizeDateInput(member.contract_end_date),
      probation_end_date: normalizeDateInput(member.probation_end_date),
      last_medical_checkup_date: normalizeDateInput(member.last_medical_checkup_date),
    };
    setForm(planningToForm(normalizedMember));
  }, [member]);

  const mutation = useMutation({
    mutationFn: (payload: MerchantUserPlanningUpsertRequest) => usersApi.updateMemberContract(userId, payload),
    onSuccess: (updatedMember) => {
      toast.success("Contrat enregistré");
      queryClient.setQueryData(qk.users.member(userId), updatedMember);
      const normalizedMember: MerchantUserPlanning = {
        ...updatedMember,
        contract_start_date: updatedMember.contract_start_date ? updatedMember.contract_start_date.slice(0, 10) : "",
        contract_end_date: updatedMember.contract_end_date ? updatedMember.contract_end_date.slice(0, 10) : "",
        probation_end_date: updatedMember.probation_end_date ? updatedMember.probation_end_date.slice(0, 10) : "",
        last_medical_checkup_date: updatedMember.last_medical_checkup_date ? updatedMember.last_medical_checkup_date.slice(0, 10) : "",
      };
      setForm(planningToForm(normalizedMember));

      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => planningEmployeesApi.deleteUserLink(employeeId!),
    onSuccess: () => {
      toast.success("Fiche employé déliée de ce compte");
      queryClient.invalidateQueries({ queryKey: qk.users.member(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors du déliage");
    },
  });

  const set = <K extends keyof EmployeeHrForm>(key: K, value: EmployeeHrForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const errors = employeeId ? validateEmployeeHrForm(form) : [];
  const hasErrors = errors.length > 0;

  const handleSubmit = () => {
    if (hasErrors) {
      toast.error("Veuillez corriger les champs obligatoires avant d'enregistrer.");
      return;
    }
    mutation.mutate(formToPayload(form));
  };

  return (
    <div className="space-y-5 py-2">
      {!employeeId ? (
        <NoEmployeeGate onOpenCreate={() => setCreateOpen(true)} onOpenLink={() => setLinkOpen(true)} />
      ) : loadingMember ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Read-only identity notice */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-3 flex gap-2 text-xs text-blue-900">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Les informations d'identité sont à jour dans l'onglet "Général" et ne peuvent pas être modifiées ici.
              </p>
            </CardContent>
          </Card>

          <EmployeeHrFieldsCards form={form} set={set} positions={positions} contractTypes={contractTypes} />

          {/* Errors */}
          {hasErrors && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Save / Unlink */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setUnlinkOpen(true)}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Délier
            </Button>
            <Button onClick={handleSubmit} disabled={hasErrors || mutation.isPending}>
              {mutation.isPending ? (
                "Enregistrement…"
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer le contrat
                </>
              )}
            </Button>
          </div>
        </>
      )}

      <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} />
      <LinkExistingEmployeeDialog open={linkOpen} onOpenChange={setLinkOpen} userId={userId} />

      {employeeId && (
        <ConfirmDialog
          open={unlinkOpen}
          onOpenChange={setUnlinkOpen}
          title="Délier cette fiche employé ?"
          description="Le compte utilisateur ne sera plus rattaché à cette fiche employé. La fiche employé et ses documents restent en base, mais ne seront plus accessibles depuis ce compte."
          confirmText="Délier"
          cancelText="Annuler"
          isDangerous
          isLoading={unlinkMutation.isPending}
          onConfirm={() => unlinkMutation.mutateAsync()}
        />
      )}
    </div>
  );
}
