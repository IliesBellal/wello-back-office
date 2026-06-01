/**
 * Éditeur d'un modèle de **semaine**.
 *
 * Mini-grille 7 colonnes (lun → dim — ordre d'affichage du repo) :
 * - chaque colonne = un `day_of_week` (0 = dimanche, mais on affiche
 *   lundi à dimanche pour rester cohérent avec `PlanningGrid`).
 * - chaque cellule contient les `WeekTemplateShift` de ce jour, rendus
 *   via `ShiftCard` (réutilisation de la même brique visuelle que la grille
 *   principale, sans DnD context — `ShiftCard` fonctionne aussi sans).
 *
 * Ajout d'un shift : sous-feuille `WeekTemplateShiftSheet` avec les champs
 * de `WeekTemplateShift` — y compris l'employé optionnel via le sentinel
 * `__unassigned__` (même convention que `ShiftSheet`).
 *
 * Le composant ne fait PAS de validation d'overlap (par design — un modèle est
 * un gabarit ; les conflits se gèrent à l'instanciation). On signale juste
 * visuellement un chevauchement même employé même jour, sans bloquer.
 */

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { WeekTemplateService } from "@/services/weekTemplateService";
import { buildPositionColorIndex, DEFAULT_SHIFT_COLOR } from "@/lib/planningShiftColor";
import type {
  Employee,
  EmployeePosition,
  WeekTemplateShiftInput,
} from "@/types/planning";

const UNASSIGNED_KEY = "__unassigned__";
const NO_POSITION_KEY = "__none__";

/** Jours affichés lundi → dimanche (cohérent avec `PlanningGrid`).
 *  L'index = `day_of_week` (0 = dimanche). */
const DAYS: { dow: number; label: string; short: string }[] = [
  { dow: 1, label: "Lundi", short: "Lun" },
  { dow: 2, label: "Mardi", short: "Mar" },
  { dow: 3, label: "Mercredi", short: "Mer" },
  { dow: 4, label: "Jeudi", short: "Jeu" },
  { dow: 5, label: "Vendredi", short: "Ven" },
  { dow: 6, label: "Samedi", short: "Sam" },
  { dow: 0, label: "Dimanche", short: "Dim" },
];

interface WeekTemplateEditorProps {
  mode: "create" | "edit";
  templateId: string | null;
  initialLabel: string;
  initialNotes: string | null;
  initialActive: boolean;
  initialShifts: WeekTemplateShiftInput[];
  positions: EmployeePosition[];
  employees: Employee[];
  onCancel: () => void;
  onSaved: () => void;
}

type DraftShift = WeekTemplateShiftInput & { __localId: string };

let _localSeq = 0;
function localId(): string {
  _localSeq += 1;
  return `local_${_localSeq}`;
}

export function WeekTemplateEditor({
  mode,
  templateId,
  initialLabel,
  initialNotes,
  initialActive,
  initialShifts,
  positions,
  employees,
  onCancel,
  onSaved,
}: WeekTemplateEditorProps) {
  const [label, setLabel] = useState(initialLabel);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [active, setActive] = useState(initialActive);
  const [shifts, setShifts] = useState<DraftShift[]>(() =>
    initialShifts.map((s) => ({ ...s, __localId: localId() })),
  );

  const [sheet, setSheet] = useState<
    | { kind: "create"; day_of_week: number }
    | { kind: "edit"; localId: string }
    | null
  >(null);

  const colorIndex = useMemo(() => buildPositionColorIndex(positions), [positions]);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const positionById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const cleanShifts: WeekTemplateShiftInput[] = shifts.map(({ __localId, ...rest }) => {
        void __localId;
        return rest;
      });
      if (mode === "create") {
        return WeekTemplateService.create({
          label: label.trim(),
          notes: notes.trim() || null,
          active,
          shifts: cleanShifts,
        });
      }
      if (!templateId) throw new Error("templateId manquant en édition.");
      return WeekTemplateService.update(templateId, {
        label: label.trim(),
        notes: notes.trim() || null,
        active,
        shifts: cleanShifts,
      });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Modèle créé" : "Modèle mis à jour");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message ?? "Enregistrement impossible"),
  });

  // ── Overlap warning (même employé, même jour) ───────────────────────────────
  const overlapLocalIds = useMemo(() => detectSameEmployeeOverlaps(shifts), [shifts]);

  function addShiftToDay(dow: number) {
    setSheet({ kind: "create", day_of_week: dow });
  }
  function openShift(s: DraftShift) {
    setSheet({ kind: "edit", localId: s.__localId });
  }
  function removeShift(localIdToRemove: string) {
    setShifts((arr) => arr.filter((x) => x.__localId !== localIdToRemove));
  }
  function applyShiftSheet(payload: WeekTemplateShiftInput, target: typeof sheet) {
    if (target === null) return;
    if (target.kind === "create") {
      setShifts((arr) => [...arr, { ...payload, __localId: localId() }]);
    } else {
      setShifts((arr) =>
        arr.map((x) => (x.__localId === target.localId ? { ...payload, __localId: x.__localId } : x)),
      );
    }
    setSheet(null);
  }

  const currentSheetDraft: WeekTemplateShiftInput | null = (() => {
    if (sheet === null) return null;
    if (sheet.kind === "edit") {
      const s = shifts.find((x) => x.__localId === sheet.localId);
      if (!s) return null;
      const { __localId, ...rest } = s;
      void __localId;
      return rest;
    }
    return {
      day_of_week: sheet.day_of_week,
      employee_id: null,
      position_id: null,
      title: null,
      start_time: "09:00",
      end_time: "17:00",
      break_minutes: 0,
      location: null,
      notes: null,
    };
  })();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Le libellé est obligatoire.");
      return;
    }
    if (shifts.length === 0) {
      toast.error("Ajoute au moins un shift à la semaine type.");
      return;
    }
    saveMut.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Méta ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="wtmpl-label">Libellé du modèle</Label>
          <Input
            id="wtmpl-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Semaine type été, Service midi seul…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wtmpl-active" className="block">Actif</Label>
          <div className="flex h-10 items-center">
            <Switch id="wtmpl-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wtmpl-notes">Notes</Label>
        <Textarea
          id="wtmpl-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Contexte, contraintes, mémo opérationnel…"
        />
      </div>

      {/* ── Grille 7 jours ─────────────────────────────────────────────────── */}
      <div className="rounded-md border bg-card">
        <div className="grid grid-cols-7 divide-x">
          {DAYS.map((d) => (
            <div key={d.dow} className="bg-muted/40 px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {d.short}
            </div>
          ))}
        </div>
        <div className="grid min-h-[200px] grid-cols-7 divide-x">
          {DAYS.map((d) => {
            const shiftsOfDay = shifts.filter((s) => s.day_of_week === d.dow);
            return (
              <div key={d.dow} className="flex flex-col gap-1 p-1.5">
                {shiftsOfDay.map((s) => {
                  const hex =
                    (s.position_id && colorIndex.get(s.position_id)) || DEFAULT_SHIFT_COLOR;
                  const emp = s.employee_id ? employeeById.get(s.employee_id) : null;
                  const empLabel = s.employee_id
                    ? emp
                      ? `${emp.first_name} ${emp.last_name[0] ?? ""}.`
                      : "—"
                    : "Non assigné";
                  const pos = s.position_id ? positionById.get(s.position_id) : null;
                  const isConflict = overlapLocalIds.has(s.__localId);
                  return (
                    <button
                      key={s.__localId}
                      type="button"
                      onClick={() => openShift(s)}
                      style={{
                        backgroundColor: hex + "1f",
                        borderColor: isConflict ? "#f43f5e" : hex + "66",
                      }}
                      className={cn(
                        "group w-full rounded-md border px-1.5 py-1 text-left text-[11px] text-foreground shadow-sm transition-shadow hover:shadow",
                      )}
                      title={isConflict ? "Chevauchement avec un autre shift du même employé." : undefined}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: hex }}
                          aria-hidden
                        />
                        <span className="truncate font-medium">
                          {s.start_time}–{s.end_time}
                        </span>
                        {isConflict && (
                          <AlertTriangle
                            className="h-3 w-3 shrink-0 text-rose-500"
                            aria-label="Chevauchement"
                          />
                        )}
                        {s.notes && (
                          <MessageSquareText
                            className="h-3 w-3 shrink-0 opacity-70"
                            aria-label="Notes"
                          />
                        )}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{empLabel}</div>
                      {pos && (
                        <div className="truncate text-[10px] text-muted-foreground">
                          {pos.label}
                        </div>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addShiftToDay(d.dow)}
                  className="mx-auto mt-0.5 flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Ajouter un shift au ${d.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {overlapLocalIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            {overlapLocalIds.size} shift{overlapLocalIds.size > 1 ? "s" : ""} se chevauchent
            pour le même employé. Pas bloquant — à arbitrer à l'instanciation.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <Badge variant="outline" className="text-[11px]">
          {shifts.length} shift{shifts.length > 1 ? "s" : ""}
        </Badge>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saveMut.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!label.trim() || shifts.length === 0 || saveMut.isPending}
          >
            {mode === "create" ? "Créer le modèle" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* ── Sub-sheet : édition d'un shift de template ─────────────────────── */}
      {sheet !== null && currentSheetDraft !== null && (
        <WeekTemplateShiftSheet
          open
          initial={currentSheetDraft}
          positions={positions}
          employees={employees}
          onCancel={() => setSheet(null)}
          onDelete={
            sheet.kind === "edit"
              ? () => {
                  removeShift(sheet.localId);
                  setSheet(null);
                }
              : undefined
          }
          onSubmit={(payload) => applyShiftSheet(payload, sheet)}
        />
      )}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-sheet : formulaire d'un shift de template
// ─────────────────────────────────────────────────────────────────────────────

interface WeekTemplateShiftSheetProps {
  open: boolean;
  initial: WeekTemplateShiftInput;
  positions: EmployeePosition[];
  employees: Employee[];
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: (payload: WeekTemplateShiftInput) => void;
}

function WeekTemplateShiftSheet({
  open,
  initial,
  positions,
  employees,
  onCancel,
  onDelete,
  onSubmit,
}: WeekTemplateShiftSheetProps) {
  const [form, setForm] = useState<WeekTemplateShiftInput>(initial);

  function patch<K extends keyof WeekTemplateShiftInput>(
    key: K,
    value: WeekTemplateShiftInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Radix Sheet est portalisé en dehors du <form> parent côté DOM, mais les
    // événements synthétiques React continuent de bubbler à travers l'arbre
    // React — sans stopPropagation, le submit du shift validerait aussi le
    // formulaire de la semaine type.
    e.stopPropagation();
    if (form.end_time <= form.start_time) {
      toast.error("L'heure de fin doit être après l'heure de début.");
      return;
    }
    onSubmit({
      ...form,
      break_minutes: Math.max(0, form.break_minutes || 0),
      title: form.title?.trim() || null,
      location: form.location?.trim() || null,
      notes: form.notes?.trim() || null,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Shift de la semaine type</SheetTitle>
          <SheetDescription>
            Employé optionnel : laisse "Non assigné" pour modéliser un besoin à pourvoir.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wts-day">Jour</Label>
            <Select
              value={String(form.day_of_week)}
              onValueChange={(v) => patch("day_of_week", Number(v))}
            >
              <SelectTrigger id="wts-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.dow} value={String(d.dow)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wts-emp">Employé</Label>
            <Select
              value={form.employee_id ?? UNASSIGNED_KEY}
              onValueChange={(v) => patch("employee_id", v === UNASSIGNED_KEY ? null : v)}
            >
              <SelectTrigger id="wts-emp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_KEY}>— Non assigné —</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wts-pos">Poste</Label>
            <Select
              value={form.position_id ?? NO_POSITION_KEY}
              onValueChange={(v) => patch("position_id", v === NO_POSITION_KEY ? null : v)}
            >
              <SelectTrigger id="wts-pos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_POSITION_KEY}>—</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="wts-start">Début</Label>
              <Input
                id="wts-start"
                type="time"
                value={form.start_time}
                onChange={(e) => patch("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wts-end">Fin</Label>
              <Input
                id="wts-end"
                type="time"
                value={form.end_time}
                onChange={(e) => patch("end_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wts-break">Pause (min)</Label>
              <Input
                id="wts-break"
                type="number"
                min={0}
                step={5}
                value={form.break_minutes}
                onChange={(e) => patch("break_minutes", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wts-title">Titre (optionnel)</Label>
            <Input
              id="wts-title"
              value={form.title ?? ""}
              onChange={(e) => patch("title", e.target.value || null)}
              placeholder="Ouverture, fermeture, événement…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wts-loc">Lieu (optionnel)</Label>
            <Input
              id="wts-loc"
              value={form.location ?? ""}
              onChange={(e) => patch("location", e.target.value || null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wts-notes">Notes (optionnel)</Label>
            <Textarea
              id="wts-notes"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value || null)}
            />
          </div>

          <SheetFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Repère les `__localId` des shifts qui chevauchent un AUTRE shift
 * du MÊME employé sur le MÊME `day_of_week`. Pas de gestion d'overlap
 * pour les shifts non assignés (employee_id null).
 */
function detectSameEmployeeOverlaps(shifts: DraftShift[]): Set<string> {
  const out = new Set<string>();
  // Groupe par (employee_id, day_of_week) en ignorant les non assignés.
  const groups = new Map<string, DraftShift[]>();
  for (const s of shifts) {
    if (s.employee_id === null) continue;
    const key = `${s.employee_id}|${s.day_of_week}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i].start_time < arr[j].end_time && arr[j].start_time < arr[i].end_time) {
          out.add(arr[i].__localId);
          out.add(arr[j].__localId);
        }
      }
    }
  }
  return out;
}
