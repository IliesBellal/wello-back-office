import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { qk } from "@/lib/queryKeys";
import { planningPositionsApi } from "@/services/welloApi";
import { ShiftTemplateService, applyTemplateToShiftForm } from "@/services/shiftTemplateService";
import { UNASSIGNED_KEY, fromKey, toKey } from "@/lib/planningUnassigned";
import type {
  Employee,
  PlanningShift,
  PlanningShiftCreateRequest,
  PlanningShiftUpdateRequest,
  PlanningWeek,
} from "@/types/planning";

export type ShiftSheetMode = "create" | "edit";

interface ShiftSheetProps {
  open: boolean;
  mode: ShiftSheetMode;
  shift: PlanningShift | null;
  /**
   * Valeurs pré-remplies pour la création depuis la grille.
   * `employee_id === null` = "Non assigné" (clic sur la ligne dédiée).
   * Absent  = aucun pré-remplissage employé.
   */
  defaults: { employee_id?: string | null; shift_date?: string } | null;
  employees: Employee[];
  week: PlanningWeek | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: PlanningShiftCreateRequest) => Promise<void>;
  onUpdate: (id: string, payload: PlanningShiftUpdateRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormState {
  /**
   * Stocke l'id employé OU `UNASSIGNED_KEY` (jamais `null`).
   * Mappé vers `string | null` au moment du submit via `fromKey()`.
   */
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  position_id: string;
  notes: string;
  status: string;
}

/**
 * Doit rester synchronisé avec `IsValidPlanningShiftStatus` côté API
 * (internal/modules/planning/shared/helpers.go). Un shift "Brouillon" reste
 * invisible de "Mon planning" (vue self-service équipe) même si la semaine
 * est publiée — "Publié" au niveau semaine bascule tous ses shifts non
 * publiés en masse, mais un manager peut ensuite en repasser certains en
 * "Brouillon" individuellement.
 */
const STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
];

function toFormState(
  shift: PlanningShift | null,
  defaults: { employee_id?: string | null; shift_date?: string } | null,
  week: PlanningWeek | null,
): FormState {
  if (shift) {
    return {
      employee_id: toKey(shift.employee_id),
      shift_date: shift.shift_date,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      break_minutes: shift.break_minutes ?? 0,
      position_id: shift.position_id ?? "",
      notes: shift.notes ?? "",
      status: shift.status ?? "draft",
    };
  }
  // "employee_id" peut être absent (pas de pré-remplissage), null (cellule "Non assigné"),
  // ou un id. On normalise vers la sentinelle UI.
  const defaultEmployee =
    defaults && "employee_id" in defaults ? toKey(defaults.employee_id ?? null) : UNASSIGNED_KEY;
  return {
    employee_id: defaultEmployee,
    shift_date: defaults?.shift_date ?? week?.start_date ?? format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    position_id: UNASSIGNED_KEY,
    notes: "",
    status: "draft",
  };
}

export function ShiftSheet({
  open,
  mode,
  shift,
  defaults,
  employees,
  week,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: ShiftSheetProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(shift, defaults, week));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Confirmation \"shift dans le passé\" : on bloque la création tant que
  // l'utilisateur n'a pas confirmé explicitement via l'AlertDialog.
  const [pastConfirmOpen, setPastConfirmOpen] = useState(false);
  const [pastConfirmed, setPastConfirmed] = useState(false);

  // Reset form when opening or switching shift
  useEffect(() => {
    if (open) setForm(toFormState(shift, defaults, week));
  }, [open, shift, defaults, week]);

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
  });

  const templatesQuery = useQuery({
    queryKey: qk.planningShiftTemplates.all,
    queryFn: () => ShiftTemplateService.list(),
    enabled: open && mode === "create",
  });
  const activeTemplates = (templatesQuery.data ?? []).filter((t) => t.active);

  function applyTemplate(templateId: string) {
    const tmpl = activeTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;
    setForm((f) => applyTemplateToShiftForm(f, tmpl, positionsQuery.data ?? []));
  }

  const minDate = week?.start_date;
  const maxDate = week?.end_date;

  const dateError = useMemo(() => {
    if (!minDate || !maxDate) return null;
    if (form.shift_date < minDate || form.shift_date > maxDate) {
      const min = format(parseISO(minDate), "dd/MM");
      const max = format(parseISO(maxDate), "dd/MM");
      return `La date doit être comprise entre ${min} et ${max}.`;
    }
    return null;
  }, [form.shift_date, minDate, maxDate]);

  const timeError = form.end_time <= form.start_time
    ? "L'heure de fin doit être après l'heure de début."
    : null;

  const canSubmit = !!form.employee_id && !dateError && !timeError && !submitting;

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // Avertissement "shift dans le passé" : on n'autorise la soumission qu'après
    // confirmation explicite via AlertDialog.
    const todayIso = format(new Date(), "yyyy-MM-dd");
    if (mode === "create" && form.shift_date < todayIso && !pastConfirmed) {
      setPastConfirmOpen(true);
      return;
    }
    await doSubmit();
  }

  async function doSubmit() {
    setSubmitting(true);
    try {
      const base = {
        // Sentinelle UI → valeur API (`null` = non assigné).
        employee_id: fromKey(form.employee_id),
        shift_date: form.shift_date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: form.break_minutes,
        position_id: form.position_id || null,
        position: (positionsQuery.data ?? []).find((p) => p.id === form.position_id)?.label ?? null,
        notes: form.notes || null,
        status: form.status,
      };
      if (mode === "create") {
        await onCreate(base as PlanningShiftCreateRequest);
      } else if (shift) {
        await onUpdate(shift.id, base as PlanningShiftUpdateRequest);
      }
    } finally {
      setSubmitting(false);
      setPastConfirmed(false);
    }
  }

  async function handleDelete() {
    if (!shift) return;
    setDeleting(true);
    try {
      await onDelete(shift.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Nouveau shift" : "Modifier le shift"}</SheetTitle>
          <SheetDescription>
            Renseigne l&apos;employé, la date, les horaires et le poste.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Template selector — only when creating, pre-fills horaires/pause/poste */}
          {mode === "create" && activeTemplates.length > 0 && (
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
              <Label htmlFor="tmpl" className="text-xs">Partir d&apos;un modèle</Label>
              <Select value="" onValueChange={applyTemplate}>
                <SelectTrigger id="tmpl" className="h-9">
                  <SelectValue placeholder="Choisir un modèle…" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: t.color }}
                          aria-hidden
                        />
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.start_time}–{t.end_time}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] italic text-muted-foreground">
                Pré-remplit les horaires, la pause et le poste. L&apos;employé et la date restent inchangés.
              </p>
            </div>
          )}

          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* Employee */}
              <div className="space-y-1.5">
                <Label htmlFor="employee">Employé</Label>
                <Select value={form.employee_id} onValueChange={(v) => patch("employee_id", v)}>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Choisir un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_KEY}>
                      <span className="italic text-muted-foreground">— Non assigné —</span>
                    </SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                        {e.position ? ` · ${e.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="shift_date">Date</Label>
                <Input
                  id="shift_date"
                  type="date"
                  value={form.shift_date}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => patch("shift_date", e.target.value)}
                />
                {dateError && <p className="text-xs text-destructive">{dateError}</p>}
              </div>

              {/* Time range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time">Début</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => patch("start_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time">Fin</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => patch("end_time", e.target.value)}
                  />
                </div>
              </div>
              {timeError && <p className="text-xs text-destructive">{timeError}</p>}

              {/* Break */}
              <div className="space-y-1.5">
                <Label htmlFor="break">Pause (minutes)</Label>
                <Input
                  id="break"
                  type="number"
                  min={0}
                  step={5}
                  value={form.break_minutes}
                  onChange={(e) => patch("break_minutes", Math.max(0, Number(e.target.value) || 0))}
                />
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label htmlFor="position">Poste</Label>
                <Select value={form.position_id} onValueChange={(v) => patch("position_id", v)}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Choisir un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_KEY}>— Non assigné —</SelectItem>
                    {(positionsQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => patch("notes", e.target.value)}
                  placeholder="Informations utiles pour l'équipe…"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status">Statut</Label>
                <Select value={form.status} onValueChange={(v) => patch("status", v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <SheetFooter className="mt-6 flex flex-row items-center justify-between gap-2 sm:justify-between">
            {mode === "edit" && shift ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {mode === "create" ? "Créer" : "Enregistrer"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>

      <AlertDialog
        open={pastConfirmOpen}
        onOpenChange={(o) => {
          if (!submitting) setPastConfirmOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créer un shift dans le passé ?</AlertDialogTitle>
            <AlertDialogDescription>
              La date sélectionnée ({format(parseISO(form.shift_date), "dd/MM/yyyy")}) est
              antérieure à aujourd&apos;hui. Veux-tu vraiment créer ce shift dans le passé ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={async (e) => {
                e.preventDefault();
                setPastConfirmed(true);
                setPastConfirmOpen(false);
                await doSubmit();
              }}
            >
              Créer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
