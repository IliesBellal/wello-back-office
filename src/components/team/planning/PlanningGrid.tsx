import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { addDays, format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import { UNASSIGNED_KEY, toKey } from "@/lib/planningUnassigned";
import { buildPositionColorIndex, colorFromIndex } from "@/lib/planningShiftColor";
import type {
  Employee,
  EmployeePosition,
  PlanningHoliday,
  PlanningShift,
  PlanningWeek,
} from "@/types/planning";

import { ShiftCard } from "./ShiftCard";
import { RowActionsMenu } from "./RowActionsMenu";
import type { PlanningViewMode } from "./PlanningHeader";

interface PlanningGridProps {
  viewMode: PlanningViewMode;
  range: { from: Date; to: Date };
  week: PlanningWeek;
  employees: Employee[];
  shifts: PlanningShift[];
  holidays: PlanningHoliday[];
  /**
   * Catalogue de postes (avec `color` hex) pour dériver la couleur
   * de chaque `ShiftCard`. Si vide, les cartes auront la couleur neutre.
   */
  positions: EmployeePosition[];
  onShiftClick: (shift: PlanningShift) => void;
  /**
   * Click sur une cellule vide.
   * `employeeId === null` quand la cellule appartient à la ligne "Non assigné".
   */
  onEmptyCellClick: (employeeId: string | null, dateIso: string) => void;
  /**
   * Déclenche l'assignation en masse depuis le menu "3 points" d'une ligne.
   * `sourceEmployeeId === null` ⇒ ligne "Non assigné".
   * `count` = nombre de shifts de la ligne sur la fenêtre visible.
   */
  onBulkAssignRow: (sourceEmployeeId: string | null, sourceLabel: string, count: number) => void;
  /**
   * Mode "sélection multiple" (suppression de masse) : désactive le DnD
   * des `ShiftCard` et affiche une checkbox par carte. Le clic toggle la sélection.
   */
  selectionMode?: boolean;
  /** Set des ids de shifts sélectionnés en mode sélection. */
  selectedShiftIds?: ReadonlySet<string>;
}

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// ─── Empty droppable cell ───────────────────────────────────────────────────

function GridCell({
  employeeId,
  dateIso,
  isHoliday,
  isWeekend,
  isOutsideWeek,
  shifts,
  colorIndex,
  onShiftClick,
  onEmptyCellClick,
  selectionMode,
  selectedShiftIds,
}: {
  /** Sentinelle `UNASSIGNED_KEY` pour la ligne "Non assigné". */
  employeeId: string;
  dateIso: string;
  isHoliday: boolean;
  isWeekend: boolean;
  isOutsideWeek: boolean;
  shifts: PlanningShift[];
  colorIndex: Map<string, string>;
  onShiftClick: (s: PlanningShift) => void;
  onEmptyCellClick: (employeeId: string | null, dateIso: string) => void;
  selectionMode?: boolean;
  selectedShiftIds?: ReadonlySet<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${employeeId}:${dateIso}` });
  const isUnassignedRow = employeeId === UNASSIGNED_KEY;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[88px] border-b border-r p-1.5 transition-colors",
        isHoliday && "bg-amber-50/60",
        isWeekend && !isHoliday && "bg-muted/30",
        isOutsideWeek && "opacity-50",
        isOver && "ring-2 ring-inset ring-primary/40 bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-1">
        {shifts.map((s) => (
          <ShiftCard
            key={s.id}
            shift={s}
            color={colorFromIndex(s, colorIndex)}
            onClick={() => onShiftClick(s)}
            selectable={selectionMode}
            selected={selectedShiftIds?.has(s.id) ?? false}
          />
        ))}
      </div>
      {shifts.length === 0 && (
        <button
          type="button"
          onClick={() => onEmptyCellClick(isUnassignedRow ? null : employeeId, dateIso)}
          className={cn(
            "absolute inset-0 flex items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground hover:opacity-100",
          )}
          aria-label="Ajouter un shift"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Main grid ──────────────────────────────────────────────────────────────

export function PlanningGrid({
  viewMode,
  range,
  week,
  employees,
  shifts,
  holidays,
  positions,
  onShiftClick,
  onEmptyCellClick,
  onBulkAssignRow,
  selectionMode,
  selectedShiftIds,
}: PlanningGridProps) {
  // Build columns from range
  const columns = useMemo(() => {
    const out: Date[] = [];
    let d = range.from;
    while (d <= range.to) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [range]);

  const holidayByDate = useMemo(() => {
    const m = new Map<string, PlanningHoliday>();
    // Only show holidays that are not disabled by an override.
    for (const h of holidays) if (!h.disabled) m.set(h.date, h);
    return m;
  }, [holidays]);

  const shiftsByCell = useMemo(() => {
    const m = new Map<string, PlanningShift[]>();
    for (const s of shifts) {
      // toKey → UNASSIGNED_KEY si employee_id est null, sinon l'id
      const key = `${toKey(s.employee_id)}:${s.shift_date}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    }
    // sort each cell by start_time
    for (const list of m.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [shifts]);

  // Stats per employee (sum hours of shifts in visible range).
  // Les shifts non assignés sont comptés séparément dans `unassignedHours`
  // (besoin à pourvoir, pas de personne → jamais cumulé sous un employee_id).
  const { hoursByEmployee, unassignedHours } = useMemo(() => {
    const m = new Map<string, number>();
    let unassigned = 0;
    const rangeFrom = isoDay(range.from);
    const rangeTo = isoDay(range.to);
    for (const s of shifts) {
      if (s.shift_date < rangeFrom || s.shift_date > rangeTo) continue;
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      mins -= s.break_minutes ?? 0;
      if (mins < 0) mins = 0;
      const hours = mins / 60;
      if (s.employee_id == null) {
        unassigned += hours;
      } else {
        m.set(s.employee_id, (m.get(s.employee_id) ?? 0) + hours);
      }
    }
    return { hoursByEmployee: m, unassignedHours: unassigned };
  }, [shifts, range]);

  // For "month" view we still render a grid but cap columns at 14 to stay readable
  const displayColumns = viewMode === "month" ? columns.slice(0, Math.min(columns.length, 14)) : columns;

  // Nombre de shifts de chaque ligne sur la fenêtre visible (pour:
  // désactiver le menu d'assignation en masse quand la ligne est vide,
  // et fournir un count exact au handler).
  const shiftsCountByRow = useMemo(() => {
    const m = new Map<string, number>();
    const rangeFrom = isoDay(range.from);
    const rangeTo = isoDay(range.to);
    for (const s of shifts) {
      if (s.shift_date < rangeFrom || s.shift_date > rangeTo) continue;
      const key = toKey(s.employee_id);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [shifts, range]);

  // Index id|label → couleur hex pour le rendu des `ShiftCard` (évite un
  // lookup linéaire par carte).
  const colorIndex = useMemo(() => buildPositionColorIndex(positions), [positions]);

  const colTemplate = `220px repeat(${displayColumns.length}, minmax(140px, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      {/* ── Header row ──────────────────────────────────────────────── */}
      <div
        className="grid border-b bg-muted/40 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div className="border-r px-3 py-2">Employé</div>
        {displayColumns.map((d) => {
          const iso = isoDay(d);
          const holiday = holidayByDate.get(iso);
          const today = isToday(d);
          return (
            <div
              key={iso}
              className={cn(
                "border-r px-2 py-2 text-center",
                today && "bg-primary/5 text-primary",
                holiday && "bg-amber-50/60 text-amber-900",
              )}
            >
              <div className="capitalize">{format(d, "EEE", { locale: fr })}</div>
              <div className="text-sm font-semibold">{format(d, "d", { locale: fr })}</div>
              {holiday && (
                <div className="mt-0.5 truncate text-[10px] font-normal">{holiday.label}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Employee rows ──────────────────────────────────────────── */}
      {employees.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          Aucun employé actif.
        </div>
      ) : (
        employees.map((emp) => {
          const hours = hoursByEmployee.get(emp.id) ?? 0;
          const contract = emp.contract_hours ?? null;
          const rowCount = shiftsCountByRow.get(emp.id) ?? 0;
          return (
            <div
              key={emp.id}
              className="group/row grid border-b last:border-b-0"
              style={{ gridTemplateColumns: colTemplate }}
            >
              {/* Employee column */}
              <div className="flex items-start gap-1 border-r px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <div className="truncate text-sm font-medium text-foreground">
                    {emp.first_name} {emp.last_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {emp.position ?? "—"}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {hours.toFixed(1)}h
                    {contract ? ` / ${contract}h` : ""}
                  </div>
                </div>
                <RowActionsMenu
                  variant="employee"
                  disabled={rowCount === 0}
                  onBulkAssign={() =>
                    onBulkAssignRow(emp.id, `${emp.first_name} ${emp.last_name}`, rowCount)
                  }
                />
              </div>
              {/* Day cells */}
              {displayColumns.map((d) => {
                const iso = isoDay(d);
                const cellShifts = shiftsByCell.get(`${emp.id}:${iso}`) ?? [];
                const isOutsideWeek = iso < week.start_date || iso > week.end_date;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isHoliday = holidayByDate.has(iso);
                return (
                  <GridCell
                    key={iso}
                    employeeId={emp.id}
                    dateIso={iso}
                    isHoliday={isHoliday}
                    isWeekend={isWeekend}
                    isOutsideWeek={isOutsideWeek}
                    shifts={cellShifts}
                    colorIndex={colorIndex}
                    onShiftClick={onShiftClick}
                    onEmptyCellClick={onEmptyCellClick}
                    selectionMode={selectionMode}
                    selectedShiftIds={selectedShiftIds}
                  />
                );
              })}
            </div>
          );
        })
      )}

      {/* ── Unassigned row (always visible, even when empty) ──────── */}
      <div
        className="group/row grid border-t-2 bg-muted/20"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div className="flex items-start gap-1 border-r px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <UserX className="h-3.5 w-3.5 text-muted-foreground" />
              Non assigné
            </div>
            <div className="truncate text-xs text-muted-foreground">
              Besoins à pourvoir
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {unassignedHours.toFixed(1)}h
            </div>
          </div>
          <RowActionsMenu
            variant="unassigned"
            disabled={(shiftsCountByRow.get(UNASSIGNED_KEY) ?? 0) === 0}
            onBulkAssign={() =>
              onBulkAssignRow(
                null,
                "Non assigné",
                shiftsCountByRow.get(UNASSIGNED_KEY) ?? 0,
              )
            }
          />
        </div>
        {displayColumns.map((d) => {
          const iso = isoDay(d);
          const cellShifts = shiftsByCell.get(`${UNASSIGNED_KEY}:${iso}`) ?? [];
          const isOutsideWeek = iso < week.start_date || iso > week.end_date;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isHoliday = holidayByDate.has(iso);
          return (
            <GridCell
              key={iso}
              employeeId={UNASSIGNED_KEY}
              dateIso={iso}
              isHoliday={isHoliday}
              isWeekend={isWeekend}
              isOutsideWeek={isOutsideWeek}
              shifts={cellShifts}
              colorIndex={colorIndex}
              onShiftClick={onShiftClick}
              onEmptyCellClick={onEmptyCellClick}
              selectionMode={selectionMode}
              selectedShiftIds={selectedShiftIds}
            />
          );
        })}
      </div>
    </div>
  );
}
