import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { EmployeePosition, SystemRef } from "@/types/planning";
import { SENTINEL_NONE, type EmployeeHrForm } from "./employeeHrFields";

interface EmployeeHrFieldsCardsProps {
  form: EmployeeHrForm;
  set: <K extends keyof EmployeeHrForm>(key: K, value: EmployeeHrForm[K]) => void;
  positions: EmployeePosition[];
  contractTypes: SystemRef[];
}

/** The 4 HR/contract cards (Contrat, Poste & rôle, Temps de travail, Rémunération) + commentaire RH. */
export function EmployeeHrFieldsCards({ form, set, positions, contractTypes }: EmployeeHrFieldsCardsProps) {
  return (
    <div className="space-y-5">
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
            <Label htmlFor="hr-job_title" className="text-xs">Poste affiché</Label>
            <Input
              id="hr-job_title"
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
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 sm:col-span-2">
            <Label htmlFor="hr-sunday-premium" className="text-xs font-medium">
              Majoration dimanche
              <span className="block font-normal text-muted-foreground">
                Taux réglé dans les paramètres équipe.
              </span>
            </Label>
            <Switch
              id="hr-sunday-premium"
              checked={form.sunday_premium}
              onCheckedChange={(v) => set("sunday_premium", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 sm:col-span-2">
            <Label htmlFor="hr-night-premium" className="text-xs font-medium">
              Majoration nuit
              <span className="block font-normal text-muted-foreground">
                Taux réglé dans les paramètres équipe.
              </span>
            </Label>
            <Switch
              id="hr-night-premium"
              checked={form.night_premium}
              onCheckedChange={(v) => set("night_premium", v)}
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
    </div>
  );
}
