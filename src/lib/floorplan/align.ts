/**
 * Alignement et répartition d'une sélection multiple. Fonctions pures : elles
 * calculent les déplacements à appliquer, le reducer les normalise (grille
 * non imposée, mais maintien dans le plan).
 */
import { obstacleBounds, round1, tableBounds } from './geometry';
import type { ItemChange } from './reducer';
import type { Location, Obstacle } from './types';

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

interface Entry {
  change: (dx: number, dy: number) => ItemChange;
  x: number; // emprise (AABB)
  y: number;
  width: number;
  height: number;
}

export function alignableEntries(tables: readonly Location[], obstacles: readonly Obstacle[]): Entry[] {
  return [
    ...tables.map<Entry>(t => ({
      ...tableBounds(t),
      change: (dx, dy) => ({ ref: { kind: 'table', id: t.location_id }, patch: { x: t.x + dx, y: t.y + dy } })
    })),
    ...obstacles.map<Entry>(o => ({
      ...obstacleBounds(o),
      change: (dx, dy) => ({ ref: { kind: 'obstacle', id: o.id }, patch: { x: o.x + dx, y: o.y + dy } })
    }))
  ];
}

export function alignChanges(entries: readonly Entry[], mode: AlignMode): ItemChange[] {
  if (entries.length < 2) return [];

  const left = Math.min(...entries.map(e => e.x));
  const right = Math.max(...entries.map(e => e.x + e.width));
  const top = Math.min(...entries.map(e => e.y));
  const bottom = Math.max(...entries.map(e => e.y + e.height));

  return entries.map(entry => {
    let dx = 0;
    let dy = 0;
    switch (mode) {
      case 'left':
        dx = left - entry.x;
        break;
      case 'right':
        dx = right - (entry.x + entry.width);
        break;
      case 'center':
        dx = (left + right) / 2 - (entry.x + entry.width / 2);
        break;
      case 'top':
        dy = top - entry.y;
        break;
      case 'bottom':
        dy = bottom - (entry.y + entry.height);
        break;
      case 'middle':
        dy = (top + bottom) / 2 - (entry.y + entry.height / 2);
        break;
    }
    return entry.change(round1(dx), round1(dy));
  });
}

/**
 * Répartit les éléments à intervalles égaux entre le premier et le dernier
 * (ceux-ci ne bougent pas). Il faut au moins trois éléments.
 */
export function distributeChanges(entries: readonly Entry[], axis: DistributeAxis): ItemChange[] {
  if (entries.length < 3) return [];

  const horizontal = axis === 'horizontal';
  const start = (e: Entry) => (horizontal ? e.x : e.y);
  const length = (e: Entry) => (horizontal ? e.width : e.height);
  const sorted = [...entries].sort((a, b) => start(a) - start(b));

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const occupied = sorted.reduce((sum, e) => sum + length(e), 0);
  const span = start(last) + length(last) - start(first);
  const gap = (span - occupied) / (sorted.length - 1);

  let cursor = start(first) + length(first) + gap;
  return sorted.slice(1, -1).map(entry => {
    const delta = cursor - start(entry);
    cursor += length(entry) + gap;
    return horizontal ? entry.change(round1(delta), 0) : entry.change(0, round1(delta));
  });
}
