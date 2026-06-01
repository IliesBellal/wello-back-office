/**
 * Résolution de la **couleur d'un shift** dérivée du **poste** auquel il
 * est rattaché.
 *
 * Sources, dans l'ordre :
 *   1. `shift.position_id` matché contre `positions[].id` (chemin canonique).
 *   2. `shift.position` (label string, legacy) matché contre `positions[].label`
 *      (case-insensitive) — fallback de robustesse si l'`id` n'a pas suivi.
 *   3. Poste introuvable ou shift sans poste → `DEFAULT_SHIFT_COLOR`.
 *
 * Un shift **non assigné** (`employee_id === null`) garde la couleur de
 * SON poste : on veut voir les besoins colorés par poste. Pas de
 * surcharge "couleur non assigné".
 */

import type { EmployeePosition, PlanningShift } from "@/types/planning";

/** Couleur neutre quand le shift n'a pas de poste résoluble. */
export const DEFAULT_SHIFT_COLOR = "#94a3b8" as const; // slate-400

/** Palette de presets proposée à la création d'un poste (mêmes hues que l'ancienne palette implicite). */
export const POSITION_COLOR_PRESETS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#64748b", // slate
] as const;

/**
 * Retourne la couleur (hex) du shift via son poste.
 *
 * @param shift     Shift courant (employee_id null est traité comme les autres).
 * @param positions Catalogue de postes courants (déjà chargé côté page).
 */
export function resolveShiftColor(
  shift: Pick<PlanningShift, "position_id" | "position">,
  positions: ReadonlyArray<Pick<EmployeePosition, "id" | "label" | "color">>,
): string {
  if (shift.position_id) {
    const byId = positions.find((p) => p.id === shift.position_id);
    if (byId?.color) return byId.color;
  }
  if (shift.position) {
    const target = shift.position.toLowerCase();
    const byLabel = positions.find((p) => p.label.toLowerCase() === target);
    if (byLabel?.color) return byLabel.color;
  }
  return DEFAULT_SHIFT_COLOR;
}

/**
 * Construit une `Map<positionId, color>` à passer à des composants qui
 * doivent dériver beaucoup de couleurs en boucle (ex. la grille de planning).
 *
 * On indexe **aussi par label** (`__label__<label>` en lowercase) pour gérer
 * le fallback legacy quand le shift ne porte que le label.
 */
export function buildPositionColorIndex(
  positions: ReadonlyArray<Pick<EmployeePosition, "id" | "label" | "color">>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of positions) {
    if (p.color) {
      m.set(p.id, p.color);
      m.set(`__label__${p.label.toLowerCase()}`, p.color);
    }
  }
  return m;
}

/** Variante "index map" de `resolveShiftColor` — perf pour le rendu de grille. */
export function colorFromIndex(
  shift: Pick<PlanningShift, "position_id" | "position">,
  index: Map<string, string>,
): string {
  if (shift.position_id) {
    const c = index.get(shift.position_id);
    if (c) return c;
  }
  if (shift.position) {
    const c = index.get(`__label__${shift.position.toLowerCase()}`);
    if (c) return c;
  }
  return DEFAULT_SHIFT_COLOR;
}
