/**
 * Helpers partagés pour la notion de **shift non assigné**.
 *
 * - Côté API : `PlanningShift.employee_id` est `string | null`.
 *   `null` signifie "shift non assigné" — un BESOIN, pas une personne.
 * - Côté UI : on utilise une sentinelle string (`UNASSIGNED_KEY`) pour les
 *   contextes qui ne supportent pas `null` proprement (clés de Map,
 *   `value` d'un `<Select>`, id de droppable DnD…).
 *
 * Règle d'or :
 *   - frontière API (DTO, requêtes, state de groupement)  → `null`
 *   - frontière UI (FormState, droppable id, Select value) → `UNASSIGNED_KEY`
 *   - conversion via `fromKey` / `toKey` à chaque traversée.
 */

export const UNASSIGNED_KEY = "__unassigned__" as const;
export type UnassignedKey = typeof UNASSIGNED_KEY;

/** UI sentinelle → API value (`null` si non assigné, sinon l'id employé). */
export function fromKey(key: string): string | null {
  return key === UNASSIGNED_KEY ? null : key;
}

/** API value → UI sentinelle (jamais `null` en sortie). */
export function toKey(employeeId: string | null): string {
  return employeeId == null ? UNASSIGNED_KEY : employeeId;
}

/** True si le shift est non assigné. */
export function isUnassigned(employeeId: string | null | undefined): boolean {
  return employeeId == null;
}
