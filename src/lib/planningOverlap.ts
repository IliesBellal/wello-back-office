/**
 * Détection d'overlap côté UI (pré-flight avant PATCH en batch).
 *
 * Même règle que le backend / le mock (`services/mocks/planningMocks.ts`) :
 *   - deux shifts du **même employé** sur la **même date** sont en conflit
 *     dès qu'ils se chevauchent en horaire (intervalles `[start_time, end_time)`).
 *   - un shift non assigné (`employee_id === null`) ne déclenche **jamais**
 *     de conflit personnel — c'est un besoin, pas une personne.
 *
 * Utilisé par l'assignation en masse pour partitionner avant d'envoyer les
 * PATCH : on n'écrit pas un shift qui chevauche un shift existant de la cible.
 */

import type { PlanningShift } from "@/types/planning";

/** True si deux intervalles `[startA, endA)` et `[startB, endB)` se chevauchent. */
export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return !(endA <= startB || startA >= endB);
}

/**
 * Cherche, dans `shifts`, un shift existant qui chevauche `(employeeId, date, start, end)`.
 * Retourne `null` si aucun (ou si `employeeId === null` — pas de règle pour les besoins).
 *
 * @param ignoreShiftId  Optionnel : ID à ignorer (utile en update pour ne pas se comparer à soi-même).
 */
export function findOverlap(
  shifts: PlanningShift[],
  employeeId: string | null,
  date: string,
  start: string,
  end: string,
  ignoreShiftId?: string,
): PlanningShift | null {
  if (employeeId === null) return null;
  for (const s of shifts) {
    if (s.id === ignoreShiftId) continue;
    if (s.employee_id !== employeeId) continue;
    if (s.shift_date !== date) continue;
    if (timesOverlap(start, end, s.start_time, s.end_time)) return s;
  }
  return null;
}

/**
 * Sélectionne tous les shifts d'une **ligne source** (un employé OU la
 * pseudo-ligne non assignée si `sourceEmployeeId === null`) qui tombent dans
 * la fenêtre `[fromIso, toIso]` inclusivement.
 */
export function shiftsOfRowInRange(
  shifts: PlanningShift[],
  sourceEmployeeId: string | null,
  fromIso: string,
  toIso: string,
): PlanningShift[] {
  return shifts.filter(
    (s) =>
      s.employee_id === sourceEmployeeId &&
      s.shift_date >= fromIso &&
      s.shift_date <= toIso,
  );
}

/**
 * Partitionne un lot de shifts à transférer vers `targetEmployeeId` selon
 * le résultat de l'overlap contre l'état courant `allShifts`.
 *
 * Les shifts à transférer sont **exclus** de la base de comparaison
 * (on ne se compare pas à soi-même).
 *
 * Retour :
 *   - `assignable` : shifts qui peuvent être PATCHés sans conflit.
 *   - `conflicting` : shifts laissés sur la ligne source (chevauchement avec un shift existant de la cible).
 */
export function partitionForBulkAssign(
  toMove: PlanningShift[],
  allShifts: PlanningShift[],
  targetEmployeeId: string | null,
): { assignable: PlanningShift[]; conflicting: PlanningShift[] } {
  const moveIds = new Set(toMove.map((s) => s.id));
  // Base = tous les shifts SAUF ceux qu'on est en train de déplacer.
  const base = allShifts.filter((s) => !moveIds.has(s.id));
  const assignable: PlanningShift[] = [];
  const conflicting: PlanningShift[] = [];
  for (const s of toMove) {
    const hit = findOverlap(base, targetEmployeeId, s.shift_date, s.start_time, s.end_time);
    if (hit) conflicting.push(s);
    else assignable.push(s);
  }
  return { assignable, conflicting };
}
