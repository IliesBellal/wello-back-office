/**
 * Helpers purs du plan de salle : valeurs par défaut d'une nouvelle table,
 * numérotation automatique et recherche d'un emplacement libre sur le canvas.
 *
 * Aucune dépendance React/Konva : testable seul et réutilisable par le futur
 * reducer du plan (brouillon).
 */

export const CANVAS_SIZE = 1000;
export const GRID_SIZE = 20;
export const DEFAULT_SEATS = 2;

export interface Rect {
  x: number; // coin haut-gauche, en unités virtuelles (0-1000)
  y: number;
  width: number;
  height: number;
}

const TABLE_NAME_PATTERN = /^Table\s+(\d+)$/i;

/**
 * Prochain nom « Table N » libre : plus grand numéro existant + 1.
 * Reste unique même après suppression d'une table intermédiaire (contrairement
 * à `locations.length + 1`).
 */
export function nextTableName(existingNames: readonly string[]): string {
  let max = 0;
  for (const name of existingNames) {
    const match = TABLE_NAME_PATTERN.exec(name.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Table ${max + 1}`;
}

const overlaps = (a: Rect, b: Rect, gap: number): boolean =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

/**
 * Premier emplacement de la grille où un rectangle `width × height` ne touche
 * aucun des `occupied` (avec une marge `gap`). Parcours ligne par ligne depuis
 * le coin haut-gauche. Si le plan est plein, retombe sur le centre du canvas
 * (l'utilisateur déplacera la table) plutôt que de refuser la création.
 */
export function findFreeSpot(
  occupied: readonly Rect[],
  width: number,
  height: number,
  options: { grid?: number; gap?: number; margin?: number; canvas?: number } = {}
): { x: number; y: number } {
  const { grid = GRID_SIZE, gap = GRID_SIZE, margin = 2 * GRID_SIZE, canvas = CANVAS_SIZE } = options;

  for (let y = margin; y + height <= canvas - margin; y += grid) {
    for (let x = margin; x + width <= canvas - margin; x += grid) {
      const candidate: Rect = { x, y, width, height };
      if (!occupied.some(other => overlaps(candidate, other, gap))) {
        return { x, y };
      }
    }
  }

  return {
    x: Math.round((canvas - width) / 2 / grid) * grid,
    y: Math.round((canvas - height) / 2 / grid) * grid
  };
}
