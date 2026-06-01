/**
 * Paramètres planning & équipe.
 *
 * Réfs API : docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md
 *   - GET/PUT  /planning/settings           (PUT patch-like)
 *   - GET      /planning/attendance-sources
 *   - GET      /planning/contract-types
 *
 * Sections :
 *   1. Règles de travail   (labor_country_code, repos, pauses, primes, override)
 *   2. Pointage            (attendance_source)
 *   3. Échanges            (shift_swap_approval_mode)
 *   4. Postes & contrats   (raccourci PositionsModal + lecture contract-types)
 *
 * Gating : manage_settings, repli manage_plannings (selon spec).
 */

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Clock4,
  Repeat,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import {
  SettingsCard,
  SettingsFieldsGrid,
  SettingsGrid,
  SettingsPageContainer,
} from "@/components/settings";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { usePermissions } from "@/hooks/usePermissions";
import { qk } from "@/lib/queryKeys";
import {
  planningRefsApi,
  planningSettingsApi,
} from "@/services/welloApi";
import type {
  AttendanceSource,
  PlanningSettings,
  PlanningSettingsUpdateRequest,
  ShiftSwapApprovalMode,
  SystemRef,
} from "@/types/planning";

import { PositionsModal } from "@/components/team/planning/PositionsModal";

export default function EquipeSettings() {
  const { canManageSettings, canManagePlannings } = usePermissions();
  // Spec : "Gating : manage_settings (à défaut manage_plannings)."
  if (!canManageSettings && !canManagePlannings) {
    return <Navigate to="/" replace />;
  }
  return <EquipeSettingsContent />;
}

function EquipeSettingsContent() {
  const settingsQ = useQuery({
    queryKey: qk.planningSettings.all,
    queryFn: () => planningSettingsApi.get(),
  });

  const attendanceSourcesQ = useQuery({
    queryKey: qk.planningRefs.attendanceSources,
    queryFn: () => planningRefsApi.attendanceSources(),
  });

  const contractTypesQ = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
  });

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">
            Paramètres planning &amp; équipe
          </h1>
        }
        description="Réglez les règles de travail, le mode de pointage, l'approbation des échanges et les référentiels de votre équipe."
      >
        {settingsQ.isLoading ? (
          <SettingsPageContainer>
            <SettingsGrid>
              <SettingsCard title="Chargement…">
                <SkeletonForm />
              </SettingsCard>
            </SettingsGrid>
          </SettingsPageContainer>
        ) : settingsQ.error || !settingsQ.data ? (
          <SettingsPageContainer>
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Impossible de charger les paramètres planning.</p>
                <p className="text-sm">{(settingsQ.error as Error | null)?.message ?? "Erreur inconnue."}</p>
              </div>
            </div>
          </SettingsPageContainer>
        ) : (
          <SettingsPageContainer>
            <SettingsGrid>
              <WorkRulesCard settings={settingsQ.data} />
              <AttendanceCard
                settings={settingsQ.data}
                sources={attendanceSourcesQ.data ?? []}
                loading={attendanceSourcesQ.isLoading}
              />
              <SwapsCard settings={settingsQ.data} />
              <PositionsAndContractsCard
                contractTypes={contractTypesQ.data ?? []}
                loadingContractTypes={contractTypesQ.isLoading}
              />
            </SettingsGrid>
          </SettingsPageContainer>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Règles de travail
// ─────────────────────────────────────────────────────────────────────────────

interface WorkRulesForm {
  labor_country_code: string;
  min_daily_rest_hours: number;
  min_break_minutes: number;
  night_shift_start: string;
  night_shift_end: string;
  night_shift_multiplier: number;
  holiday_multiplier: number;
  allow_override_warnings: boolean;
}

function toWorkRulesForm(s: PlanningSettings): WorkRulesForm {
  return {
    labor_country_code: s.labor_country_code,
    min_daily_rest_hours: s.min_daily_rest_hours,
    min_break_minutes: s.min_break_minutes,
    night_shift_start: s.night_shift_start,
    night_shift_end: s.night_shift_end,
    night_shift_multiplier: s.night_shift_multiplier,
    holiday_multiplier: s.holiday_multiplier,
    allow_override_warnings: s.allow_override_warnings,
  };
}

function WorkRulesCard({ settings }: { settings: PlanningSettings }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WorkRulesForm>(() => toWorkRulesForm(settings));

  useEffect(() => {
    setForm(toWorkRulesForm(settings));
  }, [settings]);

  const initial = useMemo(() => toWorkRulesForm(settings), [settings]);
  const diff = useMemo<PlanningSettingsUpdateRequest>(() => {
    const patch: PlanningSettingsUpdateRequest = {};
    (Object.keys(form) as Array<keyof WorkRulesForm>).forEach((k) => {
      if (form[k] !== initial[k]) {
        (patch as Record<string, unknown>)[k] = form[k];
      }
    });
    return patch;
  }, [form, initial]);

  const dirty = Object.keys(diff).length > 0;

  const saveMut = useMutation({
    mutationFn: (payload: PlanningSettingsUpdateRequest) => planningSettingsApi.update(payload),
    onSuccess: (data) => {
      toast.success("Règles de travail enregistrées.");
      qc.setQueryData(qk.planningSettings.all, data);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message ?? "Échec de l'enregistrement.");
    },
  });

  return (
    <SettingsCard
      title="Règles de travail"
      description="Repos quotidien, pauses, primes et tolérance des dépassements."
      icon={ShieldAlert}
      colSpan="full"
    >
      <SettingsFieldsGrid columns="triple">
        <div>
          <Label htmlFor="labor_country_code">Code pays (droit du travail)</Label>
          <Input
            id="labor_country_code"
            value={form.labor_country_code}
            maxLength={2}
            onChange={(e) =>
              setForm({ ...form, labor_country_code: e.target.value.toUpperCase() })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">ISO 3166-1 alpha-2 (ex: FR, BE).</p>
        </div>
        <div>
          <Label htmlFor="min_daily_rest_hours">Repos quotidien min. (h)</Label>
          <Input
            id="min_daily_rest_hours"
            type="number"
            min={0}
            step={0.5}
            value={form.min_daily_rest_hours}
            onChange={(e) =>
              setForm({ ...form, min_daily_rest_hours: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="min_break_minutes">Pause min. (min)</Label>
          <Input
            id="min_break_minutes"
            type="number"
            min={0}
            step={5}
            value={form.min_break_minutes}
            onChange={(e) =>
              setForm({ ...form, min_break_minutes: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="night_shift_start">Début nuit</Label>
          <Input
            id="night_shift_start"
            type="time"
            value={form.night_shift_start}
            onChange={(e) => setForm({ ...form, night_shift_start: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="night_shift_end">Fin nuit</Label>
          <Input
            id="night_shift_end"
            type="time"
            value={form.night_shift_end}
            onChange={(e) => setForm({ ...form, night_shift_end: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="night_shift_multiplier">Multiplicateur nuit</Label>
          <Input
            id="night_shift_multiplier"
            type="number"
            min={1}
            step={0.05}
            value={form.night_shift_multiplier}
            onChange={(e) =>
              setForm({ ...form, night_shift_multiplier: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="holiday_multiplier">Multiplicateur jour férié</Label>
          <Input
            id="holiday_multiplier"
            type="number"
            min={1}
            step={0.05}
            value={form.holiday_multiplier}
            onChange={(e) =>
              setForm({ ...form, holiday_multiplier: Number(e.target.value) })
            }
          />
        </div>
        <div className="col-span-full flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
          <div>
            <Label htmlFor="allow_override_warnings" className="text-sm font-medium">
              Autoriser les dépassements (avertissement)
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Si activé, les managers peuvent valider un planning hors-règles après confirmation.
            </p>
          </div>
          <Switch
            id="allow_override_warnings"
            checked={form.allow_override_warnings}
            onCheckedChange={(v) => setForm({ ...form, allow_override_warnings: v })}
          />
        </div>
      </SettingsFieldsGrid>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => setForm(initial)}
          disabled={!dirty || saveMut.isPending}
        >
          Réinitialiser
        </Button>
        <Button
          onClick={() => saveMut.mutate(diff)}
          disabled={!dirty || saveMut.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Pointage
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceCard({
  settings,
  sources,
  loading,
}: {
  settings: PlanningSettings;
  sources: SystemRef[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState<AttendanceSource>(settings.attendance_source);

  useEffect(() => setValue(settings.attendance_source), [settings.attendance_source]);

  const dirty = value !== settings.attendance_source;

  const saveMut = useMutation({
    mutationFn: () =>
      planningSettingsApi.update({ attendance_source: value }),
    onSuccess: (data) => {
      toast.success("Mode de pointage enregistré.");
      qc.setQueryData(qk.planningSettings.all, data);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message ?? "Échec de l'enregistrement.");
    },
  });

  return (
    <SettingsCard
      title="Pointage"
      description="Source qui alimente les feuilles de temps des équipiers."
      icon={Clock4}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="attendance_source">Mode de pointage</Label>
          <Select
            value={value}
            onValueChange={(v) => setValue(v as AttendanceSource)}
            disabled={loading}
          >
            <SelectTrigger id="attendance_source">
              <SelectValue placeholder={loading ? "Chargement…" : "Sélectionner"} />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Effet du choix :</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>
              <strong>Pointage manuel</strong> : les équipiers ouvrent/ferment leur journée via la
              borne de pointage.
            </li>
            <li>
              <strong>Planning (automatique)</strong> : le pointage manuel est <em>désactivé</em>,
              les heures effectuées sont déduites des shifts planifiés.
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setValue(settings.attendance_source)}
            disabled={!dirty || saveMut.isPending}
          >
            Réinitialiser
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Échanges
// ─────────────────────────────────────────────────────────────────────────────

const SWAP_OPTIONS: Array<{ value: ShiftSwapApprovalMode; label: string; hint: string }> = [
  {
    value: "manager_required",
    label: "Manager requis",
    hint:
      "Le manager approuve ou refuse chaque demande d'échange depuis le back-office.",
  },
  {
    value: "target_employee_required",
    label: "Employé cible requis",
    hint:
      "Seul l'employé cible peut approuver l'échange ; le manager garde toutefois le droit de rejeter.",
  },
];

function SwapsCard({ settings }: { settings: PlanningSettings }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<ShiftSwapApprovalMode>(settings.shift_swap_approval_mode);

  useEffect(() => setValue(settings.shift_swap_approval_mode), [
    settings.shift_swap_approval_mode,
  ]);

  const dirty = value !== settings.shift_swap_approval_mode;

  const saveMut = useMutation({
    mutationFn: () =>
      planningSettingsApi.update({ shift_swap_approval_mode: value }),
    onSuccess: (data) => {
      toast.success("Mode d'approbation enregistré.");
      qc.setQueryData(qk.planningSettings.all, data);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message ?? "Échec de l'enregistrement.");
    },
  });

  const current = SWAP_OPTIONS.find((o) => o.value === value);

  return (
    <SettingsCard
      title="Échanges de shifts"
      description="Qui peut approuver une demande d'échange entre deux équipiers."
      icon={Repeat}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="shift_swap_approval_mode">Mode d'approbation</Label>
          <Select value={value} onValueChange={(v) => setValue(v as ShiftSwapApprovalMode)}>
            <SelectTrigger id="shift_swap_approval_mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SWAP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {current && (
            <p className="mt-2 text-xs text-muted-foreground">{current.hint}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setValue(settings.shift_swap_approval_mode)}
            disabled={!dirty || saveMut.isPending}
          >
            Réinitialiser
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Postes & types de contrat
// ─────────────────────────────────────────────────────────────────────────────

function PositionsAndContractsCard({
  contractTypes,
  loadingContractTypes,
}: {
  contractTypes: SystemRef[];
  loadingContractTypes: boolean;
}) {
  const [positionsOpen, setPositionsOpen] = useState(false);

  return (
    <SettingsCard
      title="Postes & types de contrat"
      description="Référentiels utilisés par les fiches équipiers et le planning."
      icon={Briefcase}
      colSpan="full"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Postes (gestion) */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Gérer les postes</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Créez, renommez, réordonnez et désactivez les postes (Serveur, Cuisinier, etc.).
                Les postes sont rattachés aux équipiers et aux shifts.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="default"
              onClick={() => setPositionsOpen(true)}
              className="w-full sm:w-auto"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Ouvrir la gestion des postes
            </Button>
          </div>
        </div>

        {/* Contract types (lecture) */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Types de contrat</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Référentiel système (lecture seule). Utilisé par les fiches équipiers.
              </p>
            </div>
          </div>
          <div className="mt-4">
            {loadingContractTypes ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16" />
                ))}
              </div>
            ) : contractTypes.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Aucun type de contrat.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contractTypes.map((c) => (
                  <Badge key={c.code} variant="secondary" className="font-normal">
                    <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                      {c.code}
                    </span>
                    {c.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PositionsModal open={positionsOpen} onOpenChange={setPositionsOpen} />
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonForm() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
