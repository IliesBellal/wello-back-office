/**
 * Logique PURE de projection d'un `WeekTemplate` sur des semaines réelles.
 *
 * Tous les calculs (date de chaque shift, détection de conflit, application
 * du mode, filets de sécurité) vivent ici sous forme de fonctions sans I/O.
 * Le service mock `WeekTemplateService` (et le futur backend) orchestre ces
 * helpers ; la `ApplyWeekTemplateDialog` les consomme via le service.
 *
 * ⚠️ Convention `day_of_week` : `0..6` avec **0 = dimanche** (JavaScript
 * `Date.getDay()`). Standard du module Planning — NE PAS dévier.
 *
 * ⚠️ Sémantique des modes : cf. `src/types/planning.ts` §"Week template —
 * instantiation". Résumé :
 *   - keep_existing          : overlap → ignoré (skipped).
 *   - replace                : overlap → existing supprimé, template créé assigné.
 *   - template_to_unassigned : overlap → template créé en non-assigné.
 *   - on_leave / contract_ended : TOUJOURS non-assigné (filet de sécurité,
 *     indépendant du mode).
 */

import type {
  ConflictMode,
  ConflictReason,
  Employee,
  InstantiationConflict,
  InstantiationShiftRef,
  PlanningLeaveRequest,
  PlanningShift,
  WeekTemplateShift,
} from "@/types/planning";

import { findOverlap } from "./planningOverlap";

/** ISO "YYYY-MM-DD" → Date (heure locale 00:00). */
function isoToDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** Date → ISO "YYYY-MM-DD" (date locale, pas d'UTC). */
function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcule la date réelle d'un shift de template projeté sur une semaine cible.
 *
 * @param targetWeekStart ISO du **LUNDI** de la semaine cible (convention `PlanningWeek.start_date`).
 * @param dayOfWeek       0..6 (0 = dimanche).
 *
 * Mapping : lundi=1 ⇒ +0 jours, mardi=2 ⇒ +1, …, samedi=6 ⇒ +5, dimanche=0 ⇒ +6.
 */
export function projectDayOfWeekToDate(targetWeekStart: string, dayOfWeek: number): string {
  const monday = isoToDate(targetWeekStart);
  // dimanche (0) tombe à +6 jours du lundi ; les autres à dow-1.
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  return dateToIso(d);
}

/** Vrai si l'employé a un congé APPROUVÉ couvrant la date. */
export function isOnApprovedLeave(
  employeeId: string,
  date: string,
  leaves: ReadonlyArray<PlanningLeaveRequest>,
): boolean {
  return leaves.some(
    (l) =>
      l.status === "approved" &&
      l.employee_id === employeeId &&
      l.start_date <= date &&
      date <= l.end_date,
  );
}

/** Vrai si le contrat de l'employé est terminé à `date`. */
export function isContractEnded(employee: Employee | undefined, date: string): boolean {
  if (!employee) return false;
  if (!employee.contract_end_date) return false;
  return employee.contract_end_date < date;
}

/**
 * Détecte si un shift template projeté est strictement IDEMPOTENT vs l'existant
 * (même employé, même date, mêmes horaires, même `position_id`).
 * Utile pour éviter de recréer un shift identique.
 */
export function findIdempotentMatch(
  template: WeekTemplateShift,
  date: string,
  existingShifts: ReadonlyArray<PlanningShift>,
  positionIdByLabel: ReadonlyMap<string, string>,
): PlanningShift | null {
  for (const s of existingShifts) {
    if (s.employee_id !== template.employee_id) continue;
    if (s.shift_date !== date) continue;
    if (s.start_time !== template.start_time) continue;
    if (s.end_time !== template.end_time) continue;
    const existingPositionId =
      s.position && positionIdByLabel.get(s.position.toLowerCase())
        ? positionIdByLabel.get(s.position.toLowerCase())!
        : null;
    if (existingPositionId === template.position_id) return s;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification d'un shift template projeté
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectionAction =
  | { kind: "create_assigned"; employee_id: string }       // shift créé avec l'employé du template
  | { kind: "create_unassigned"; reason: "need" | "on_leave" | "contract_ended" | "overlap_to_unassigned" }
  | { kind: "replace"; existing_shift_id: string; employee_id: string }
  | { kind: "skip_idempotent"; existing_shift_id: string }
  | { kind: "skip_overlap"; existing_shift_id: string };   // mode keep_existing only

export interface ClassifiedShift {
  template: WeekTemplateShift;
  target_week_start: string;
  date: string;
  action: ProjectionAction;
  /** Renseigné seulement quand l'action implique une raison de conflit (pour preview UI). */
  conflict: InstantiationConflict | null;
}

function refOf(t: WeekTemplateShift): InstantiationShiftRef {
  return {
    day_of_week: t.day_of_week,
    start_time: t.start_time,
    end_time: t.end_time,
    position_id: t.position_id,
  };
}

function nameOf(e: Employee | undefined): string {
  if (!e) return "Employé inconnu";
  return `${e.first_name} ${e.last_name}`.trim();
}

/**
 * Classifie un shift template projeté sur une date donnée.
 *
 * Ordre d'évaluation (important) :
 *   1. shift non-nominatif (employee_id = null)            → create_unassigned("need")
 *   2. idempotence (même employé/date/horaires/position)   → skip_idempotent
 *   3. filet on_leave                                       → create_unassigned("on_leave") + conflict
 *   4. filet contract_ended                                 → create_unassigned("contract_ended") + conflict
 *   5. overlap → appliquer `conflict_mode` :
 *       - keep_existing          → skip_overlap + conflict
 *       - replace                → replace + conflict
 *       - template_to_unassigned → create_unassigned("overlap_to_unassigned") + conflict
 *   6. sinon                                                 → create_assigned
 */
export function classifyTemplateShift(
  template: WeekTemplateShift,
  ctx: {
    target_week_start: string;
    date: string;
    existingShifts: ReadonlyArray<PlanningShift>;
    leaves: ReadonlyArray<PlanningLeaveRequest>;
    employeeById: ReadonlyMap<string, Employee>;
    positionIdByLabel: ReadonlyMap<string, string>;
    conflict_mode: ConflictMode;
  },
): ClassifiedShift {
  const base = { template, target_week_start: ctx.target_week_start, date: ctx.date };
  const empId = template.employee_id;

  // 1. besoin (non-nominatif)
  if (empId === null) {
    return { ...base, action: { kind: "create_unassigned", reason: "need" }, conflict: null };
  }

  const employee = ctx.employeeById.get(empId);
  const emp_name = nameOf(employee);

  // 2. idempotence
  const dup = findIdempotentMatch(template, ctx.date, ctx.existingShifts, ctx.positionIdByLabel);
  if (dup) {
    return { ...base, action: { kind: "skip_idempotent", existing_shift_id: dup.id }, conflict: null };
  }

  const mkConflict = (reason: ConflictReason, existing_shift_id: string | null): InstantiationConflict => ({
    target_week_start: ctx.target_week_start,
    day: ctx.date,
    template_shift: refOf(template),
    existing_shift_id,
    employee_id: empId,
    employee_name: emp_name,
    reason,
  });

  // 3. on_leave — TOUJOURS non-assigné
  if (isOnApprovedLeave(empId, ctx.date, ctx.leaves)) {
    return {
      ...base,
      action: { kind: "create_unassigned", reason: "on_leave" },
      conflict: mkConflict("on_leave", null),
    };
  }

  // 4. contract_ended — TOUJOURS non-assigné
  if (isContractEnded(employee, ctx.date)) {
    return {
      ...base,
      action: { kind: "create_unassigned", reason: "contract_ended" },
      conflict: mkConflict("contract_ended", null),
    };
  }

  // 5. overlap → appliquer le mode
  const hit = findOverlap(ctx.existingShifts as PlanningShift[], empId, ctx.date, template.start_time, template.end_time);
  if (hit) {
    if (ctx.conflict_mode === "keep_existing") {
      return {
        ...base,
        action: { kind: "skip_overlap", existing_shift_id: hit.id },
        conflict: mkConflict("overlap", hit.id),
      };
    }
    if (ctx.conflict_mode === "replace") {
      return {
        ...base,
        action: { kind: "replace", existing_shift_id: hit.id, employee_id: empId },
        conflict: mkConflict("overlap", hit.id),
      };
    }
    // template_to_unassigned
    return {
      ...base,
      action: { kind: "create_unassigned", reason: "overlap_to_unassigned" },
      conflict: mkConflict("overlap", hit.id),
    };
  }

  // 6. cas nominal
  return { ...base, action: { kind: "create_assigned", employee_id: empId }, conflict: null };
}

/**
 * Projette TOUS les shifts du template sur TOUTES les semaines cibles et
 * retourne la classification de chacun.
 *
 * Tri stable (semaine cible, day_of_week, start_time) pour preview lisible.
 */
export function projectTemplate(
  templateShifts: ReadonlyArray<WeekTemplateShift>,
  targetWeekStarts: ReadonlyArray<string>,
  ctx: {
    existingShiftsByWeekStart: ReadonlyMap<string, ReadonlyArray<PlanningShift>>;
    leaves: ReadonlyArray<PlanningLeaveRequest>;
    employeeById: ReadonlyMap<string, Employee>;
    positionIdByLabel: ReadonlyMap<string, string>;
    conflict_mode: ConflictMode;
  },
): ClassifiedShift[] {
  const out: ClassifiedShift[] = [];
  for (const ws of targetWeekStarts) {
    const existing = ctx.existingShiftsByWeekStart.get(ws) ?? [];
    for (const t of templateShifts) {
      const date = projectDayOfWeekToDate(ws, t.day_of_week);
      out.push(
        classifyTemplateShift(t, {
          target_week_start: ws,
          date,
          existingShifts: existing,
          leaves: ctx.leaves,
          employeeById: ctx.employeeById,
          positionIdByLabel: ctx.positionIdByLabel,
          conflict_mode: ctx.conflict_mode,
        }),
      );
    }
  }
  return out;
}
