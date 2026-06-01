/**
 * Dialogue d'INSTANCIATION d'un `WeekTemplate` sur une ou plusieurs semaines
 * réelles. Inspiré de Skello : preview-first, fenêtre de résolution des
 * conflits affichée UNIQUEMENT s'il y a des conflits, application multi-semaines.
 *
 * Flux UI :
 *   1. Sélection des semaines cibles (par défaut : semaine courante).
 *   2. Preview auto (DRY-RUN) → si pas de conflit & pas d'auto-unassigned, on
 *      passe direct à la confirmation simple. Sinon, on présente le résumé +
 *      la liste détaillée et le `RadioGroup` des 3 modes.
 *   3. À la confirmation : on s'assure que chaque semaine cible existe
 *      (création à la volée via `planningWeeksApi.create`), puis on appelle
 *      `WeekTemplateService.instantiate`.
 *   4. Toast récap + invalidation des shifts des semaines touchées + suggestion
 *      d'utiliser la ligne « Non assigné » (menu 3 points) pour bulk-assign.
 *
 * Gating : `manage_plannings` (déjà appliqué au niveau de la page).
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CalendarRange, Loader2, Send } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import {
  planningLeaveApi,
  planningPositionsApi,
  planningShiftsApi,
  planningWeeksApi,
} from "@/services/welloApi";
import {
  previewWeekTemplate,
  instantiateWeekTemplate,
  type InstantiationApiBridge,
  type InstantiationContext,
} from "@/services/weekTemplateService";
import type {
  ConflictMode,
  Employee,
  EmployeePosition,
  InstantiationConflict,
  InstantiationPreview,
  PlanningShift,
  PlanningWeek,
  WeekTemplate,
} from "@/types/planning";

interface ApplyWeekTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WeekTemplate | null;
  /** Pré-sélection : lundi de la semaine actuellement affichée dans le planning. */
  defaultWeekStart: string | null;
  employees: Employee[];
}

/** Génère N lundis consécutifs à partir d'un lundi de référence (inclus). */
function generateUpcomingMondays(fromMonday: string, count: number): string[] {
  const base = new Date(fromMonday + "T00:00:00");
  return Array.from({ length: count }, (_, i) => isoDay(addWeeks(base, i)));
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtMonday(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return format(d, "EEEE d MMM yyyy", { locale: fr });
}

const CONFLICT_MODE_OPTIONS: Array<{
  value: ConflictMode;
  title: string;
  description: string;
}> = [
  {
    value: "keep_existing",
    title: "Conserver les shifts existants",
    description:
      "Les shifts du modèle qui chevauchent un shift existant sont ignorés. L'existant prime.",
  },
  {
    value: "replace",
    title: "Remplacer par le modèle",
    description:
      "Les shifts existants en conflit sont supprimés et remplacés par ceux du modèle.",
  },
  {
    value: "template_to_unassigned",
    title: "Créer le modèle en non-assigné",
    description:
      "Les shifts du modèle en conflit sont créés en non-assigné (sans employé). L'existant reste intact.",
  },
];

const REASON_LABEL: Record<InstantiationConflict["reason"], string> = {
  overlap: "Chevauchement",
  on_leave: "En congé",
  contract_ended: "Contrat terminé",
};

export function ApplyWeekTemplateDialog({
  open,
  onOpenChange,
  template,
  defaultWeekStart,
  employees,
}: ApplyWeekTemplateDialogProps) {
  const qc = useQueryClient();

  // ─── Sélection des semaines cibles ─────────────────────────────────────────
  const today = new Date();
  const currentMonday = defaultWeekStart ?? isoDay(startOfWeek(today, { weekStartsOn: 1 }));
  const candidateWeeks = useMemo(() => generateUpcomingMondays(currentMonday, 10), [currentMonday]);

  const [selected, setSelected] = useState<Set<string>>(new Set([currentMonday]));
  const [conflictMode, setConflictMode] = useState<ConflictMode>("keep_existing");
  const [pastConfirmOpen, setPastConfirmOpen] = useState(false);

  // Reset à l'ouverture / changement de template.
  useEffect(() => {
    if (open) {
      setSelected(new Set([currentMonday]));
      setConflictMode("keep_existing");
    }
  }, [open, currentMonday, template?.id]);

  const targetWeekStarts = useMemo(
    () => Array.from(selected).sort(),
    [selected],
  );

  // Semaines cibles dans le passé (lundi < lundi de cette semaine).
  const todayMonday = isoDay(startOfWeek(today, { weekStartsOn: 1 }));
  const pastWeekStarts = useMemo(
    () => targetWeekStarts.filter((ws) => ws < todayMonday),
    [targetWeekStarts, todayMonday],
  );

  // ─── Données nécessaires à la preview ──────────────────────────────────────

  const weeksQuery = useQuery({
    queryKey: qk.planningWeeks.all,
    queryFn: () => planningWeeksApi.list(),
    enabled: open && !!template,
  });

  const leavesQuery = useQuery({
    queryKey: qk.planningLeave.list({ status: "approved" }),
    queryFn: () => planningLeaveApi.list({ status: "approved" }),
    enabled: open && !!template,
  });

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: open && !!template,
  });

  // Map start_date → PlanningWeek (parmi celles déjà existantes).
  const weekByStart = useMemo(() => {
    const m = new Map<string, PlanningWeek>();
    for (const w of weeksQuery.data ?? []) m.set(w.start_date, w);
    return m;
  }, [weeksQuery.data]);

  // Pour chaque semaine cible déjà existante, on récupère ses shifts.
  // (Les semaines qui n'existent pas encore n'ont pas de shifts ⇒ pas de conflit.)
  const shiftsQueries = useQuery({
    queryKey: ["planning", "instantiate", "shifts-of", targetWeekStarts],
    queryFn: async () => {
      const out = new Map<string, PlanningShift[]>();
      await Promise.all(
        targetWeekStarts.map(async (ws) => {
          const wk = weekByStart.get(ws);
          if (!wk) {
            out.set(ws, []);
            return;
          }
          const shifts = await planningWeeksApi.getShifts(wk.id);
          out.set(ws, shifts);
        }),
      );
      return out;
    },
    enabled: open && !!template && weeksQuery.isSuccess && targetWeekStarts.length > 0,
  });

  // ─── Preview (synchrone — mémoïsée sur changement de mode / data) ─────────

  const ctx: InstantiationContext | null = useMemo(() => {
    if (!leavesQuery.data || !positionsQuery.data || !shiftsQueries.data) return null;
    return {
      existingShiftsByWeekStart: shiftsQueries.data,
      leaves: leavesQuery.data.items,
      employees,
      positions: (positionsQuery.data as EmployeePosition[]) ?? [],
    };
  }, [leavesQuery.data, positionsQuery.data, shiftsQueries.data, employees]);

  const preview: InstantiationPreview | null = useMemo(() => {
    if (!template || !ctx || targetWeekStarts.length === 0) return null;
    try {
      return previewWeekTemplate(template.id, targetWeekStarts, ctx, conflictMode);
    } catch {
      return null;
    }
  }, [template, ctx, targetWeekStarts, conflictMode]);

  const previewLoading =
    !preview && (weeksQuery.isLoading || leavesQuery.isLoading || positionsQuery.isLoading || shiftsQueries.isLoading);

  // ─── Conflits groupés par employé pour affichage ───────────────────────────
  const conflictsByEmployee = useMemo(() => {
    const m = new Map<string, InstantiationConflict[]>();
    for (const c of preview?.conflicts ?? []) {
      const arr = m.get(c.employee_id) ?? [];
      arr.push(c);
      m.set(c.employee_id, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [preview]);

  const hasConflicts = (preview?.conflicts.length ?? 0) > 0;
  const hasAutoUnassigned = (preview?.auto_unassigned_count ?? 0) > 0;
  const needsResolution = hasConflicts || hasAutoUnassigned;

  // ─── Mutation ──────────────────────────────────────────────────────────────

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!template || !ctx) throw new Error("Contexte non prêt");
      // Construire le bridge — résout les semaines manquantes à la volée.
      const bridge: InstantiationApiBridge = {
        async ensureWeekIdForStart(targetWeekStart) {
          const existing = weekByStart.get(targetWeekStart);
          if (existing) return existing.id;
          const monday = new Date(targetWeekStart + "T00:00:00");
          const sunday = addDays(monday, 6);
          const created = await planningWeeksApi.create({
            label: `Semaine du ${format(monday, "d MMM yyyy", { locale: fr })}`,
            start_date: targetWeekStart,
            end_date: isoDay(sunday),
          });
          return created.id;
        },
        createShift: (weekId, payload) => planningWeeksApi.createShift(weekId, payload),
        deleteShift: (id) => planningShiftsApi.delete(id),
      };
      return instantiateWeekTemplate(template.id, targetWeekStarts, conflictMode, ctx, bridge);
    },
    onSuccess: (result) => {
      // Invalider les shifts de chaque semaine touchée + la liste des semaines.
      qc.invalidateQueries({ queryKey: qk.planningWeeks.all });
      for (const w of result.per_week) {
        qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(w.week_id) });
      }
      const lines = [
        `${result.created_count} shift${result.created_count > 1 ? "s" : ""} créé${result.created_count > 1 ? "s" : ""} sur ${result.per_week.length} semaine${result.per_week.length > 1 ? "s" : ""}`,
        `${result.assigned_count} assigné${result.assigned_count > 1 ? "s" : ""}, ${result.unassigned_count} non assigné${result.unassigned_count > 1 ? "s" : ""}`,
      ];
      if (result.replaced_count > 0) lines.push(`${result.replaced_count} remplacé${result.replaced_count > 1 ? "s" : ""}`);
      if (result.skipped_count > 0) lines.push(`${result.skipped_count} ignoré${result.skipped_count > 1 ? "s" : ""}`);
      toast.success(lines.join(" — "), {
        description:
          result.unassigned_count > 0
            ? "Astuce : utilise la ligne « Non assigné » (menu ⋯) pour ré-affecter en lot."
            : undefined,
      });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Application impossible"),
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!template) return null;

  const toggleWeek = (ws: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ws)) next.delete(ws);
      else next.add(ws);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Appliquer « {template.label} »
          </DialogTitle>
          <DialogDescription>
            Sélectionne une ou plusieurs semaines cibles. La prévisualisation détecte
            les conflits éventuels avant toute écriture.
          </DialogDescription>
        </DialogHeader>

        {/* ── Sélection des semaines ── */}
        <section className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Semaines cibles
          </Label>
          <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border bg-muted/30 p-2 sm:grid-cols-2">
            {candidateWeeks.map((ws) => {
              const exists = weekByStart.has(ws);
              return (
                <label
                  key={ws}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-background",
                    selected.has(ws) && "bg-background",
                  )}
                >
                  <Checkbox
                    checked={selected.has(ws)}
                    onCheckedChange={() => toggleWeek(ws)}
                  />
                  <span className="flex-1">{fmtMonday(ws)}</span>
                  {!exists && (
                    <Badge variant="outline" className="text-[10px]">à créer</Badge>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        {/* ── Preview ── */}
        <section className="space-y-2">
          {previewLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !preview || targetWeekStarts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sélectionne au moins une semaine cible.
            </p>
          ) : !needsResolution ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
              Aucun conflit détecté. <strong>{preview.to_create_count}</strong> shift
              {preview.to_create_count > 1 ? "s" : ""} seront créés sur{" "}
              <strong>{targetWeekStarts.length}</strong> semaine
              {targetWeekStarts.length > 1 ? "s" : ""}.
              {preview.idempotent_skipped_count > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {preview.idempotent_skipped_count} shift
                  {preview.idempotent_skipped_count > 1 ? "s" : ""} déjà identique
                  {preview.idempotent_skipped_count > 1 ? "s" : ""} (ignoré
                  {preview.idempotent_skipped_count > 1 ? "s" : ""}).
                </div>
              )}
            </div>
          ) : (
            <ConflictResolution
              preview={preview}
              conflictsByEmployee={conflictsByEmployee}
              conflictMode={conflictMode}
              onConflictModeChange={setConflictMode}
            />
          )}
        </section>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (pastWeekStarts.length > 0) {
                setPastConfirmOpen(true);
                return;
              }
              applyMut.mutate();
            }}
            disabled={
              !preview ||
              targetWeekStarts.length === 0 ||
              applyMut.isPending ||
              previewLoading
            }
          >
            {applyMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Appliquer
          </Button>
        </DialogFooter>

        <AlertDialog
          open={pastConfirmOpen}
          onOpenChange={(o) => {
            if (!applyMut.isPending) setPastConfirmOpen(o);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Appliquer dans le passé ?</AlertDialogTitle>
              <AlertDialogDescription>
                {pastWeekStarts.length} semaine{pastWeekStarts.length > 1 ? "s" : ""}{" "}
                sélectionnée{pastWeekStarts.length > 1 ? "s" : ""} se situe
                {pastWeekStarts.length > 1 ? "nt" : ""} dans le passé ({
                  pastWeekStarts.map(fmtMonday).join(", ")
                }). Cela créera des shifts antérieurs à aujourd&apos;hui. Continuer ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={applyMut.isPending}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                disabled={applyMut.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  setPastConfirmOpen(false);
                  applyMut.mutate();
                }}
              >
                Appliquer quand même
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composant : résolution de conflits ─────────────────────────────────

function ConflictResolution({
  preview,
  conflictsByEmployee,
  conflictMode,
  onConflictModeChange,
}: {
  preview: InstantiationPreview;
  conflictsByEmployee: Array<[string, InstantiationConflict[]]>;
  conflictMode: ConflictMode;
  onConflictModeChange: (m: ConflictMode) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
        <strong>{preview.conflicts.length}</strong> conflit
        {preview.conflicts.length > 1 ? "s" : ""} sur{" "}
        <strong>{preview.target_week_starts.length}</strong> semaine
        {preview.target_week_starts.length > 1 ? "s" : ""}, impactant{" "}
        <strong>{preview.impacted_employee_count}</strong> employé
        {preview.impacted_employee_count > 1 ? "s" : ""}.
        {preview.auto_unassigned_count > 0 && (
          <div className="mt-1 text-xs">
            Dont <strong>{preview.auto_unassigned_count}</strong> shift
            {preview.auto_unassigned_count > 1 ? "s" : ""} forcé
            {preview.auto_unassigned_count > 1 ? "s" : ""} en non-assigné
            (congé ou contrat terminé) — non négociable.
          </div>
        )}
      </div>

      <details className="rounded-md border bg-card" open={preview.conflicts.length <= 10}>
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Voir le détail
        </summary>
        <div className="max-h-56 space-y-3 overflow-y-auto px-3 py-2">
          {conflictsByEmployee.map(([empId, items]) => (
            <div key={empId} className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {items[0].employee_name}
                <Badge variant="outline" className="text-[10px]">
                  {items.length} conflit{items.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {items.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span>{c.day}</span>
                    <span>
                      {c.template_shift.start_time}–{c.template_shift.end_time}
                    </span>
                    <Badge
                      variant={c.reason === "overlap" ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {REASON_LABEL[c.reason]}
                    </Badge>
                    {c.reason !== "overlap" && (
                      <span className="text-[10px] italic">→ ira en non-assigné</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Que faire pour les chevauchements ?
        </Label>
        <RadioGroup
          value={conflictMode}
          onValueChange={(v) => onConflictModeChange(v as ConflictMode)}
          className="space-y-1.5"
        >
          {CONFLICT_MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50",
                conflictMode === opt.value && "border-primary bg-muted/30",
              )}
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{opt.title}</div>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

