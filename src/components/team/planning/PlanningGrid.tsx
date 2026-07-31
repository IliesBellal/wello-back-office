import { Fragment, useMemo, type ReactNode } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { addDays, format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Copy, MessageSquareText, MoveRight, Palmtree, Plus, UserPlus, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UNASSIGNED_KEY, toKey } from "@/lib/planningUnassigned";
import { buildPositionColorIndex, colorFromIndex } from "@/lib/planningShiftColor";
import type {
  Employee,
  EmployeePosition,
  PlanningDayComment,
  PlanningHoliday,
  PlanningShift,
  PlanningWeek,
} from "@/types/planning";

import { ShiftCard } from "./ShiftCard";
import { RowActionsMenu } from "./RowActionsMenu";
import { DayCommentCell } from "./DayCommentCell";
import type { PlanningDensity, PlanningViewMode } from "./PlanningToolbar";

interface PlanningGridProps {
  viewMode: PlanningViewMode;
  range: { from: Date; to: Date };
  week: PlanningWeek;
  headerRows?: ReactNode;
  employees: Employee[];
  shifts: PlanningShift[];
  holidays: PlanningHoliday[];
  /** Commentaires de jour (back-office only) affichés dans l'en-tête de colonne. */
  dayComments?: PlanningDayComment[];
  /** Crée ou remplace le commentaire d'un jour (`PUT /planning/day-comments/{date}`). */
  onSaveDayComment?: (dateIso: string, comment: string) => Promise<void>;
  /** Supprime le commentaire d'un jour. */
  onDeleteDayComment?: (dateIso: string) => Promise<void>;
  /** Set of `${employee_id}:${YYYY-MM-DD}` for approved leaves (inclusive ranges) */
  approvedLeaveLookup?: ReadonlySet<string>;
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
  /** Densité d'affichage : hauteur mini des cellules et largeur des colonnes. */
  density?: PlanningDensity;
  /** Ouvre la création de fiche employé. */
  onCreateEmployee?: () => void;
  /** Ouvre la fiche employé complète en édition (menu "3 points" d'une ligne). */
  onEditEmployee?: (employee: Employee) => void;
  /**
   * Contracte la colonne titre de gauche (nom + poste + heures d'un employé)
   * en un chip compact (initiales, heures, 1re lettre du poste). Contrôlé
   * par le parent pour survivre au remount de la grille (`key={rangeKey}`).
   */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatProratedQuota(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Initiales "JD" à partir du prénom/nom (fallback "?" si vide). */
function initialsOf(person: { first_name?: string | null; last_name?: string | null }): string {
  const a = person.first_name?.trim()?.[0] ?? "";
  const b = person.last_name?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

/** Première lettre du poste (label), ou `null` si l'employé n'a pas de poste. */
function positionLetterOf(position: string | null | undefined): string | null {
  const trimmed = position?.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : null;
}

export function getPlanningGridTemplateColumns(
  density: PlanningDensity = "comfortable",
  dayCount: number,
  collapsed = false,
): string {
  const dayColumn = density === "compact" ? "minmax(84px, 1fr)" : "minmax(140px, 1fr)";
  const labelColumn = collapsed ? "72px" : density === "compact" ? "180px" : "220px";
  return `${labelColumn} repeat(${dayCount}, ${dayColumn})`;
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
  className,
  isOnLeave,
  density = "comfortable",
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
  className?: string;
  isOnLeave?: boolean;
  density?: PlanningDensity;
}) {
  const { active } = useDndContext();
  const { setNodeRef: setMoveRef, isOver: isMoveOver } = useDroppable({
    id: `cell:move:${employeeId}:${dateIso}`,
  });
  const { setNodeRef: setDupRef, isOver: isDupOver } = useDroppable({
    id: `cell:dup:${employeeId}:${dateIso}`,
  });
  const isUnassignedRow = employeeId === UNASSIGNED_KEY;
  const isDragging = !!active;

  return (
    <div
      className={cn(
        "relative border-b border-r transition-colors",
        density === "compact" ? "min-h-[60px] p-1" : "min-h-[88px] p-1.5",
        className,
        isHoliday && "bg-amber-50/60",
        isWeekend && !isHoliday && "bg-muted/30",
        isOutsideWeek && "opacity-50",
        (isMoveOver || isDupOver) && "ring-2 ring-inset ring-primary/40",
      )}
    >
      {/* Leave background (behind shifts) */}
      {isOnLeave && (
        <div className="absolute inset-0 z-0 rounded-sm bg-rose-50/60">
          <div className="flex h-full flex-col items-center justify-center gap-1 text-rose-700/80">
            <Palmtree className="h-4 w-4" />
            <span className="text-[10px] font-medium">Congé</span>
          </div>
        </div>
      )}
      <div ref={setMoveRef} className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2" />
      <div ref={setDupRef} className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2" />

      {isDragging && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-[1] w-1/2 border-r border-dashed border-border/70 bg-transparent transition-colors",
              isMoveOver && "bg-primary/15",
            )}
          >
            <div className="flex h-full items-center justify-center p-1">
              <span className="inline-flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <MoveRight className="h-3 w-3" />
                Déplacer
              </span>
            </div>
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-[1] w-1/2 bg-transparent transition-colors",
              isDupOver && "bg-emerald-500/15",
            )}
          >
            <div className="flex h-full items-center justify-center p-1">
              <span className="inline-flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Copy className="h-3 w-3" />
                Dupliquer
              </span>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-1 relative z-10">
        {shifts.map((s) => (
          <ShiftCard
            key={s.id}
            shift={s}
            color={colorFromIndex(s, colorIndex)}
            onClick={() => onShiftClick(s)}
            compact={density === "compact"}
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
            "absolute inset-0 z-20 flex items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground hover:opacity-100",
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
  headerRows,
  employees,
  shifts,
  holidays,
  dayComments,
  onSaveDayComment,
  onDeleteDayComment,
  approvedLeaveLookup,
  positions,
  onShiftClick,
  onEmptyCellClick,
  onBulkAssignRow,
  selectionMode,
  selectedShiftIds,
  density = "comfortable",
  onCreateEmployee,
  onEditEmployee,
  collapsed = false,
  onToggleCollapsed,
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

  const dayCommentByDate = useMemo(() => {
    const m = new Map<string, PlanningDayComment>();
    for (const c of dayComments ?? []) m.set(c.comment_date, c);
    return m;
  }, [dayComments]);

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
    const displayColumns = columns;

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
  const visibleDays = displayColumns.length;

  const colTemplate = getPlanningGridTemplateColumns(density, displayColumns.length, collapsed);

  return (
    <div className="relative flex max-h-full min-h-0 flex-col overflow-hidden rounded-md border bg-card">
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="grid w-max min-w-full text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: colTemplate }}
        >
        {headerRows}
        {/* ── Header row ────────────────────────────────────────────── */}
        <div
          className={cn(
            "sticky left-0 top-0 z-40 border-b border-r bg-muted shadow-[1px_0_0_hsl(var(--border))]",
            collapsed ? "px-1 py-2" : "px-3 py-2",
          )}
        >
          <div className={cn("flex items-center gap-1", collapsed ? "justify-center" : "justify-between gap-2")}>
            {!collapsed && <span>Employé</span>}
            <div className="flex items-center gap-1">
              {!collapsed && onCreateEmployee ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={onCreateEmployee}
                  aria-label="Créer une fiche employé"
                  title="Créer une fiche employé"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {onToggleCollapsed ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={onToggleCollapsed}
                  aria-label={collapsed ? "Étendre la colonne employé" : "Contracter la colonne employé"}
                  title={collapsed ? "Étendre la colonne" : "Contracter la colonne"}
                >
                  {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {displayColumns.map((d) => {
          const iso = isoDay(d);
          const holiday = holidayByDate.get(iso);
          const today = isToday(d);
          return (
            <div
              key={iso}
              className={cn(
                // Fond opaque obligatoire : la rangée reste sticky au-dessus
                // des cartes qui défilent dessous.
                "sticky top-0 z-30 border-b border-r bg-muted px-2 py-2 text-center",
                today && "text-primary shadow-[inset_0_-2px_0_hsl(var(--primary))]",
                holiday && "bg-amber-50 text-amber-900",
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

        {/* ── Day comments row (toujours visible, avant le premier employé) ── */}
        {onSaveDayComment && onDeleteDayComment && (
          <>
            <div
              className={cn(
                "sticky left-0 z-20 flex items-center border-b border-r bg-muted/60 shadow-[1px_0_0_hsl(var(--border))]",
                collapsed ? "justify-center px-1 py-2" : "gap-1.5 px-3 py-2",
              )}
              title="Commentaire visible par l'équipe pour ce jour"
            >
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {!collapsed && (
                <span className="truncate text-xs font-medium text-muted-foreground">Commentaire</span>
              )}
            </div>
            {displayColumns.map((d) => {
              const iso = isoDay(d);
              return (
                <DayCommentCell
                  key={iso}
                  dateIso={iso}
                  comment={dayCommentByDate.get(iso) ?? null}
                  onSave={onSaveDayComment}
                  onDelete={onDeleteDayComment}
                />
              );
            })}
          </>
        )}

        {/* ── Employee rows ────────────────────────────────────────── */}
        {employees.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground" style={{ gridColumn: "1 / -1" }}>
            Aucun employé actif.
          </div>
        ) : (
          employees.map((emp) => {
            const hours = hoursByEmployee.get(emp.id) ?? 0;
            const contract = emp.contract_hours ?? null;
            const proratedQuota =
              contract !== null && viewMode === "month"
                ? formatProratedQuota((contract * visibleDays) / 7)
                : null;
            const rowCount = shiftsCountByRow.get(emp.id) ?? 0;
            const positionLetter = positionLetterOf(emp.position);
            const positionColor = colorFromIndex(
              { position_id: emp.position_id, position: emp.position },
              colorIndex,
            );
            return (
              <Fragment key={`row:${emp.id}`}>
                <div
                  className={cn(
                    "group/row sticky left-0 z-20 flex border-b border-r bg-card shadow-[1px_0_0_hsl(var(--border))]",
                    collapsed ? "items-center justify-center px-1 py-2" : "items-start gap-1 px-3 py-2",
                  )}
                >
                  {collapsed ? (
                    <div
                      className="flex flex-col items-center gap-1"
                      title={`${emp.first_name} ${emp.last_name}${emp.position ? ` — ${emp.position}` : ""}`}
                    >
                      <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                        {initialsOf(emp)}
                        {positionLetter && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2 ring-card"
                            style={{ backgroundColor: positionColor }}
                          >
                            {positionLetter}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground">{hours.toFixed(1)}h</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                        <div className="truncate text-sm font-medium text-foreground">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {emp.position ?? "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {hours.toFixed(1)}h
                          {contract !== null
                            ? ` / ${viewMode === "month" ? proratedQuota : String(contract)}h`
                            : ""}
                        </div>
                      </div>
                      <RowActionsMenu
                        variant="employee"
                        disabled={rowCount === 0}
                        onBulkAssign={() =>
                          onBulkAssignRow(emp.id, `${emp.first_name} ${emp.last_name}`, rowCount)
                        }
                        onEditEmployee={onEditEmployee ? () => onEditEmployee(emp) : undefined}
                      />
                    </>
                  )}
                </div>
                {displayColumns.map((d) => {
                  const iso = isoDay(d);
                  const cellShifts = shiftsByCell.get(`${emp.id}:${iso}`) ?? [];
                  const isOnLeave = approvedLeaveLookup?.has(`${emp.id}:${iso}`) ?? false;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isOutsideWeek = viewMode !== "month" && (iso < week.start_date || iso > week.end_date);
                  const isHoliday = holidayByDate.has(iso);
                  return (
                    <GridCell
                      key={`${emp.id}:${iso}`}
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
                      isOnLeave={isOnLeave}
                      density={density}
                    />
                  );
                })}
              </Fragment>
            );
          })
        )}

        {/* ── Unassigned row (always visible, even when empty) ────── */}
        <div
          className={cn(
            "group/row sticky left-0 z-20 flex border-b border-r border-t-2 bg-muted shadow-[1px_0_0_hsl(var(--border))]",
            collapsed ? "items-center justify-center px-1 py-2" : "items-start gap-1 px-3 py-2",
          )}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-1" title="Non assigné">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background">
                <UserX className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">{unassignedHours.toFixed(1)}h</div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        {displayColumns.map((d) => {
          const iso = isoDay(d);
          const cellShifts = shiftsByCell.get(`${UNASSIGNED_KEY}:${iso}`) ?? [];
          const isOutsideWeek = viewMode !== "month" && (iso < week.start_date || iso > week.end_date);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isHoliday = holidayByDate.has(iso);
          return (
            <GridCell
              key={`${UNASSIGNED_KEY}:${iso}`}
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
              isOnLeave={false}
              density={density}
              className="border-t-2 bg-muted/20"
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}
