import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, AlertCircle, Info } from "lucide-react";

import { usersApi, planningPositionsApi, planningRefsApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { toCents, toEuros } from "@/lib/money";
import type { MerchantUserPlanning, MerchantUserPlanningUpsertRequest } from "@/types/adminUsers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a possibly-null cents value to a euros string for an input field. */
function centsToEuroInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (toEuros(cents)).toString();
}

/** Convert a number-like value to a string for a number input. */
function numToInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toString();
}

const SENTINEL_NONE = "__none__";

// ─── Form state ───────────────────────────────────────────────────────────────

interface ContractForm {
  position_id: string;
  job_title: string;
  role: string;
  contract_type_code: string;

  contract_start_date: string;
  contract_end_date: string;
  probation_end_date: string;
  last_medical_checkup_date: string;

  contract_hours: string;
  max_weekly_hours: string;
  required_rest_days: string;
  sunday_premium: string;
  night_premium: string;
  employer_charges_pct: string;

  // Money fields (entered as € strings)
  hourly_rate_eur: string;
  gross_monthly_salary_eur: string;
  transport_cost_eur: string;

  hr_comment: string;
}

const EMPTY_FORM: ContractForm = {
  position_id: "",
  job_title: "",
  role: "",
  contract_type_code: "",
  contract_start_date: "",
  contract_end_date: "",
  probation_end_date: "",
  last_medical_checkup_date: "",
  contract_hours: "",
  max_weekly_hours: "",
  required_rest_days: "",
  sunday_premium: "",
  night_premium: "",
  employer_charges_pct: "",
  hourly_rate_eur: "",
  gross_monthly_salary_eur: "",
  transport_cost_eur: "",
  hr_comment: "",
};

function planningToForm(p: MerchantUserPlanning | undefined | null): ContractForm {
  if (!p) return EMPTY_FORM;
  return {
    position_id: p.position_id ?? "",
    job_title: p.job_title ?? "",
    role: p.role ?? "",
    contract_type_code: p.contract_type_code ?? "",
    contract_start_date: p.contract_start_date ?? "",
    contract_end_date: p.contract_end_date ?? "",
    probation_end_date: p.probation_end_date ?? "",
    last_medical_checkup_date: p.last_medical_checkup_date ?? "",
    contract_hours: numToInput(p.contract_hours),
    max_weekly_hours: numToInput(p.max_weekly_hours),
    required_rest_days: numToInput(p.required_rest_days),
    sunday_premium: numToInput(p.sunday_premium),
    night_premium: numToInput(p.night_premium),
    employer_charges_pct: numToInput(p.employer_charges_pct),
    hourly_rate_eur: centsToEuroInput(p.hourly_rate),
    gross_monthly_salary_eur: centsToEuroInput(p.gross_monthly_salary),
    transport_cost_eur: centsToEuroInput(p.transport_cost),
    hr_comment: p.hr_comment ?? "",
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: ContractForm): string[] {
  const errors: string[] = [];

  if (!form.contract_type_code.trim()) {
    errors.push("Type de contrat : obligatoire.");
  }

  if (!form.position_id.trim()) {
    errors.push("Poste planning : obligatoire.");
  }

  // Date relations
  if (form.contract_start_date && form.contract_end_date) {
    if (form.contract_end_date < form.contract_start_date) {
      errors.push("La date de fin de contrat doit être postérieure ou égale au début.");
    }
  }
  if (form.contract_start_date && form.probation_end_date) {
    if (form.probation_end_date < form.contract_start_date) {
      errors.push("La fin de période d'essai doit être postérieure ou égale au début du contrat.");
    }
  }

  // Negative numbers
  const numericFields: Array<{ key: keyof ContractForm; label: string }> = [
    { key: "contract_hours", label: "Heures contractuelles" },
    { key: "max_weekly_hours", label: "Heures hebdo max" },
    { key: "required_rest_days", label: "Jours de repos requis" },
    { key: "sunday_premium", label: "Majoration dimanche" },
    { key: "night_premium", label: "Majoration nuit" },
    { key: "employer_charges_pct", label: "Charges patronales (%)" },
    { key: "hourly_rate_eur", label: "Taux horaire" },
    { key: "gross_monthly_salary_eur", label: "Salaire brut mensuel" },
    { key: "transport_cost_eur", label: "Indemnité transport" },
  ];
  for (const { key, label } of numericFields) {
    const raw = form[key];
    if (raw === "" || raw === undefined) continue;
    const n = Number(raw);
    if (Number.isNaN(n)) {
      errors.push(`${label} : valeur invalide.`);
    } else if (n < 0) {
      errors.push(`${label} : la valeur ne peut pas être négative.`);
    }
  }

  return errors;
}

// ─── Form → API payload ───────────────────────────────────────────────────────

/** Convert a number-input string to number|null (empty → null). */
function strToNumOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function strToEuroCentsOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : toCents(n);
}

function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

function formToPayload(form: ContractForm): MerchantUserPlanningUpsertRequest {
  return {
    position_id: emptyToNull(form.position_id),
    job_title: emptyToNull(form.job_title.trim()),
    role: emptyToNull(form.role),
    contract_type_code: emptyToNull(form.contract_type_code),
    contract_start_date: emptyToNull(form.contract_start_date),
    contract_end_date: emptyToNull(form.contract_end_date),
    probation_end_date: emptyToNull(form.probation_end_date),
    last_medical_checkup_date: emptyToNull(form.last_medical_checkup_date),
    contract_hours: strToNumOrNull(form.contract_hours),
    max_weekly_hours: strToNumOrNull(form.max_weekly_hours),
    required_rest_days: strToNumOrNull(form.required_rest_days),
    sunday_premium: strToNumOrNull(form.sunday_premium),
    night_premium: strToNumOrNull(form.night_premium),
    employer_charges_pct: strToNumOrNull(form.employer_charges_pct),
    hourly_rate: strToEuroCentsOrNull(form.hourly_rate_eur),
    gross_monthly_salary: strToEuroCentsOrNull(form.gross_monthly_salary_eur),
    transport_cost: strToEuroCentsOrNull(form.transport_cost_eur),
    hr_comment: emptyToNull(form.hr_comment.trim()),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ContractTabProps {
  userId: string;
  isActive?: boolean;
}

export function ContractTab({ userId, isActive = true }: ContractTabProps) {
  const queryClient = useQueryClient();

  const memberQueryKey = ["users", "member", userId] as const;

  const { data: member, isLoading: loadingMember } = useQuery({
    queryKey: memberQueryKey,
    queryFn: () => usersApi.getMember(userId),
    enabled: isActive,
  });

  const { data: positions = [] } = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
  });

  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);

  const normalizeDateInput = (value: string | null | undefined): string => {
    if (!value) return "";
    return value.slice(0, 10);
  };

  const normalizePremiumValue = (value: number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "1" : "0";
    return value.toString();
  };

  useEffect(() => {
    if (!member) return;
    const normalizedMember: MerchantUserPlanning = {
      ...member,
      contract_start_date: normalizeDateInput(member.contract_start_date),
      contract_end_date: normalizeDateInput(member.contract_end_date),
      probation_end_date: normalizeDateInput(member.probation_end_date),
      last_medical_checkup_date: normalizeDateInput(member.last_medical_checkup_date),
    };
    const base = planningToForm(normalizedMember);
    setForm({
      ...base,
      sunday_premium: normalizePremiumValue(member.sunday_premium as number | boolean | null | undefined),
      night_premium: normalizePremiumValue(member.night_premium as number | boolean | null | undefined),
    });
  }, [member]);

  const mutation = useMutation({
    mutationFn: (payload: MerchantUserPlanningUpsertRequest) => usersApi.updateMemberContract(userId, payload),
    onSuccess: (updatedMember) => {
      toast.success("Contrat enregistré");
      queryClient.setQueryData(memberQueryKey, updatedMember);
      const normalizedMember: MerchantUserPlanning = {
        ...updatedMember,
        contract_start_date: updatedMember.contract_start_date ? updatedMember.contract_start_date.slice(0, 10) : "",
        contract_end_date: updatedMember.contract_end_date ? updatedMember.contract_end_date.slice(0, 10) : "",
        probation_end_date: updatedMember.probation_end_date ? updatedMember.probation_end_date.slice(0, 10) : "",
        last_medical_checkup_date: updatedMember.last_medical_checkup_date ? updatedMember.last_medical_checkup_date.slice(0, 10) : "",
      };
      const base = planningToForm(normalizedMember);
      setForm({
        ...base,
        sunday_premium: normalizePremiumValue(updatedMember.sunday_premium as number | boolean | null | undefined),
        night_premium: normalizePremiumValue(updatedMember.night_premium as number | boolean | null | undefined),
      });

      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  const set = <K extends keyof ContractForm>(key: K, value: ContractForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (loadingMember) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const errors = validate(form);
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
      {/* Read-only identity notice */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-3 flex gap-2 text-xs text-blue-900">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            La création d'un contrat est nécessaire pour que l'employé puisse être planifié et rémunéré.
            Les informations d'identité sont à jour dans l'onglet "Général" et ne peuvent pas être modifiées ici.
          </p>
        </CardContent>
      </Card>

      {/* Contrat */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Contrat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Type de contrat</Label>
            <Select
              value={form.contract_type_code || SENTINEL_NONE}
              onValueChange={(v) => set("contract_type_code", v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Aucun —</SelectItem>
                {contractTypes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contract-start" className="text-xs">Date de début</Label>
            <Input
              id="contract-start"
              type="date"
              value={form.contract_start_date}
              onChange={(e) => set("contract_start_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contract-end" className="text-xs">Date de fin</Label>
            <Input
              id="contract-end"
              type="date"
              value={form.contract_end_date}
              onChange={(e) => set("contract_end_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="probation-end" className="text-xs">Fin période d'essai</Label>
            <Input
              id="probation-end"
              type="date"
              value={form.probation_end_date}
              onChange={(e) => set("probation_end_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medical" className="text-xs">Dernière visite médicale</Label>
            <Input
              id="medical"
              type="date"
              value={form.last_medical_checkup_date}
              onChange={(e) => set("last_medical_checkup_date", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Poste / rôle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Poste & rôle</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Poste planning</Label>
            <Select
              value={form.position_id || SENTINEL_NONE}
              onValueChange={(v) => set("position_id", v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Aucun —</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Rôle</Label>
            <Select
              value={form.role || SENTINEL_NONE}
              onValueChange={(v) => set("role", v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Non défini —</SelectItem>
                <SelectItem value="employee">Employé</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contract-job_title" className="text-xs">Poste affiché</Label>
            <Input
              id="contract-job_title"
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="Ex : Serveur, Chef de rang…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Temps de travail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Temps de travail</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Heures contractuelles (semaine)</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={form.contract_hours}
              onChange={(e) => set("contract_hours", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Heures hebdo max</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={form.max_weekly_hours}
              onChange={(e) => set("max_weekly_hours", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Jours de repos requis</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={form.required_rest_days}
              onChange={(e) => set("required_rest_days", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Majoration dimanche (×)</Label>
            <Input
              type="number"
              min={0}
              step="0.05"
              value={form.sunday_premium}
              onChange={(e) => set("sunday_premium", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Majoration nuit (×)</Label>
            <Input
              type="number"
              min={0}
              step="0.05"
              value={form.night_premium}
              onChange={(e) => set("night_premium", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rémunération */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Rémunération</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Taux horaire (€)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.hourly_rate_eur}
              onChange={(e) => set("hourly_rate_eur", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Salaire brut mensuel (€)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.gross_monthly_salary_eur}
              onChange={(e) => set("gross_monthly_salary_eur", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Charges patronales (%)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.employer_charges_pct}
              onChange={(e) => set("employer_charges_pct", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Indemnité transport (€)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.transport_cost_eur}
              onChange={(e) => set("transport_cost_eur", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Commentaire RH */}
      <div className="space-y-1.5">
        <Label htmlFor="hr-comment" className="text-sm">Commentaire RH</Label>
        <Textarea
          id="hr-comment"
          rows={3}
          value={form.hr_comment}
          onChange={(e) => set("hr_comment", e.target.value)}
        />
      </div>

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

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-border">
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
    </div>
  );
}
