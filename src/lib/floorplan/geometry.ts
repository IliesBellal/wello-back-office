/**
 * Géométrie pure du plan de salle (canvas virtuel 1000×1000, angles en degrés).
 *
 * Deux conventions coexistent, héritées des données existantes :
 * - une TABLE a pour `x`/`y` son coin haut-gauche avant rotation ;
 * - un OBSTACLE a pour `x`/`y` son centre.
 * Les deux pivotent autour de leur centre. Les helpers `tableCenter` /
 * `obstacleBounds` masquent cette différence au reste de l'éditeur.
 */
import { CANVAS_SIZE, GRID_SIZE, type Rect } from '@/utils/floorPlanLayout';
import { OBSTACLE_MAX_SIZE, OBSTACLE_MIN_SIZE } from './obstacleCatalog';
import type { Area, ItemRef, Location, Obstacle, PlanContent } from './types';

export interface Point {
  x: number;
  y: number;
}

const RAD = Math.PI / 180;
const EPSILON = 0.01;

export const round1 = (value: number): number => Math.round(value * 10) / 10;

export const snap = (value: number, grid: number = GRID_SIZE): number => Math.round(value / grid) * grid;

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Ramène un angle dans [0, 360[, arrondi au dixième (l'API accepte 0-359). */
export function normalizeAngle(angle: number): number {
  const wrapped = ((angle % 360) + 360) % 360;
  const rounded = round1(wrapped);
  return rounded >= 360 ? 0 : rounded;
}

/** Rectangle englobant (aligné sur les axes) d'un rectangle `width × height` centré en (cx, cy) et tourné. */
export function rotatedBounds(cx: number, cy: number, width: number, height: number, angle: number): Rect {
  const cos = Math.abs(Math.cos(angle * RAD));
  const sin = Math.abs(Math.sin(angle * RAD));
  const w = width * cos + height * sin;
  const h = width * sin + height * cos;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

export const tableCenter = (table: Pick<Location, 'x' | 'y' | 'width' | 'height'>): Point => ({
  x: table.x + table.width / 2,
  y: table.y + table.height / 2
});

export const tableBounds = (table: Location): Rect => {
  const center = tableCenter(table);
  return rotatedBounds(center.x, center.y, table.width, table.height, table.angle);
};

export const obstacleBounds = (obstacle: Obstacle): Rect =>
  rotatedBounds(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.angle);

export const areaBounds = (area: Area): Rect => {
  if (area.points.length === 0) return { x: area.x, y: area.y, width: 0, height: 0 };
  const xs = area.points.map(p => p.x);
  const ys = area.points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
};

/**
 * Recale un centre pour que le rectangle tourné reste entièrement dans le
 * canvas. Un élément plus grand que le canvas est centré.
 */
export function clampCenter(
  cx: number,
  cy: number,
  width: number,
  height: number,
  angle: number,
  canvas: number = CANVAS_SIZE
): Point {
  const box = rotatedBounds(0, 0, width, height, angle);
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  return {
    x: halfW * 2 >= canvas ? canvas / 2 : clamp(cx, halfW, canvas - halfW),
    y: halfH * 2 >= canvas ? canvas / 2 : clamp(cy, halfH, canvas - halfH)
  };
}

/** Coin haut-gauche d'une table après recalage dans le canvas. */
export function clampTablePosition(
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number
): Point {
  const center = clampCenter(x + width / 2, y + height / 2, width, height, angle);
  return { x: center.x - width / 2, y: center.y - height / 2 };
}

export const isOutOfCanvas = (bounds: Rect, canvas: number = CANVAS_SIZE): boolean =>
  bounds.x < -EPSILON ||
  bounds.y < -EPSILON ||
  bounds.x + bounds.width > canvas + EPSILON ||
  bounds.y + bounds.height > canvas + EPSILON;

export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

// --- Chevauchement de tables -------------------------------------------------

interface OrientedBox {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  angle: number; // radians
}

const toBox = (table: Location): OrientedBox => {
  const center = tableCenter(table);
  return { cx: center.x, cy: center.y, halfW: table.width / 2, halfH: table.height / 2, angle: table.angle * RAD };
};

const corners = (box: OrientedBox): Point[] => {
  const cos = Math.cos(box.angle);
  const sin = Math.sin(box.angle);
  return [
    [-box.halfW, -box.halfH],
    [box.halfW, -box.halfH],
    [box.halfW, box.halfH],
    [-box.halfW, box.halfH]
  ].map(([dx, dy]) => ({ x: box.cx + dx * cos - dy * sin, y: box.cy + dx * sin + dy * cos }));
};

const project = (points: Point[], axis: Point): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const d = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return [min, max];
};

/** Théorème de l'axe séparateur entre deux rectangles orientés. Les bords qui se touchent ne comptent pas. */
function boxesOverlap(a: OrientedBox, b: OrientedBox): boolean {
  const pointsA = corners(a);
  const pointsB = corners(b);
  const axes: Point[] = [
    { x: Math.cos(a.angle), y: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) }
  ];

  return axes.every(axis => {
    const [minA, maxA] = project(pointsA, axis);
    const [minB, maxB] = project(pointsB, axis);
    return Math.min(maxA, maxB) - Math.max(minA, minB) > EPSILON;
  });
}

/** Deux tables se chevauchent-elles ? Deux tables rondes : distance des centres ; sinon rectangles orientés. */
export function tablesOverlap(a: Location, b: Location): boolean {
  if (a.shape === 'circle' && b.shape === 'circle') {
    const ca = tableCenter(a);
    const cb = tableCenter(b);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y) < (a.width + b.width) / 2 - EPSILON;
  }
  if (!rectsIntersect(tableBounds(a), tableBounds(b))) return false;
  return boxesOverlap(toBox(a), toBox(b));
}

/** Identifiants des tables qui en chevauchent une autre sur le même étage. */
export function findOverlappingTables(locations: readonly Location[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const a = locations[i];
      const b = locations[j];
      if (a.floor_id !== b.floor_id) continue;
      if (tablesOverlap(a, b)) {
        overlapping.add(a.location_id);
        overlapping.add(b.location_id);
      }
    }
  }
  return overlapping;
}

/** Noms de tables portés par plusieurs tables (insensible à la casse et aux espaces). */
export function findDuplicateTableNames(locations: readonly Location[]): Set<string> {
  const seen = new Map<string, string[]>();
  for (const table of locations) {
    const key = table.location_name.trim().toLowerCase();
    if (!key) continue;
    seen.set(key, [...(seen.get(key) ?? []), table.location_id]);
  }
  const duplicates = new Set<string>();
  for (const ids of seen.values()) {
    if (ids.length > 1) ids.forEach(id => duplicates.add(id));
  }
  return duplicates;
}

// --- Murs, portes et fenêtres -----------------------------------------------

export interface WallSegment {
  x: number; // centre
  y: number;
  width: number; // longueur
  height: number; // épaisseur
  angle: number;
}

/**
 * Transforme le segment [a, b] en obstacles « mur ». Un segment plus long que
 * la taille maximale acceptée par l'API est découpé en tronçons égaux.
 * Renvoie une liste vide si le segment est trop court pour être posé.
 */
export function wallSegmentsFromPoints(a: Point, b: Point, thickness: number): WallSegment[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < OBSTACLE_MIN_SIZE) return [];

  const angle = normalizeAngle(Math.atan2(b.y - a.y, b.x - a.x) / RAD);
  const pieces = Math.ceil(length / OBSTACLE_MAX_SIZE);
  const pieceLength = length / pieces;

  return Array.from({ length: pieces }, (_, index) => {
    const t = (index + 0.5) / pieces;
    return {
      x: round1(a.x + (b.x - a.x) * t),
      y: round1(a.y + (b.y - a.y) * t),
      width: round1(pieceLength),
      height: thickness,
      angle
    };
  });
}

/** Ramène `b` sur l'angle multiple de `stepDeg` le plus proche de [a, b], en conservant la longueur (tracé avec Maj). */
export function constrainAngle(a: Point, b: Point, stepDeg = 15): Point {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length === 0) return b;
  const angle = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / RAD / stepDeg) * stepDeg;
  return { x: a.x + Math.cos(angle * RAD) * length, y: a.y + Math.sin(angle * RAD) * length };
}

export interface WallSnap {
  x: number;
  y: number;
  angle: number;
  thickness: number;
  wallId: string;
}

/**
 * Accroche un point au mur le plus proche (à moins de `maxDistance`) : renvoie
 * le point projeté sur l'axe du mur, son angle et son épaisseur. Utilisé par
 * les portes et fenêtres, qui prennent l'orientation du mur qui les porte.
 * `halfLength` empêche la porte de déborder du mur sur lequel elle est posée.
 */
export function snapToWall(
  point: Point,
  walls: readonly Obstacle[],
  options: { maxDistance?: number; halfLength?: number } = {}
): WallSnap | null {
  const { maxDistance = 25, halfLength = 0 } = options;
  let best: (WallSnap & { distance: number }) | null = null;

  for (const wall of walls) {
    if (wall.type !== 'wall') continue;

    const dx = Math.cos(wall.angle * RAD);
    const dy = Math.sin(wall.angle * RAD);
    const half = wall.width / 2;
    const margin = Math.min(halfLength, half);

    const alongRaw = (point.x - wall.x) * dx + (point.y - wall.y) * dy;

    // La proximité se juge par rapport au mur lui-même ; la marge ne sert
    // qu'ensuite à recaler la porte pour qu'elle ne déborde pas du mur.
    const onWall = clamp(alongRaw, -half, half);
    const distance = Math.hypot(point.x - (wall.x + dx * onWall), point.y - (wall.y + dy * onWall));

    const along = clamp(alongRaw, -half + margin, half - margin);
    const projected = { x: wall.x + dx * along, y: wall.y + dy * along };

    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = {
        x: round1(projected.x),
        y: round1(projected.y),
        angle: normalizeAngle(wall.angle),
        thickness: wall.height,
        wallId: wall.id,
        distance
      };
    }
  }

  if (!best) return null;
  const { distance: _distance, ...snapped } = best;
  return snapped;
}

// --- Sélection ---------------------------------------------------------------

/** Tables et obstacles d'un étage dont l'emprise touche le rectangle de sélection (les zones sont exclues : trop grandes). */
export function itemsInRect(rect: Rect, content: PlanContent, floorId: string): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const table of content.locations) {
    if (table.floor_id === floorId && rectsIntersect(rect, tableBounds(table))) {
      refs.push({ kind: 'table', id: table.location_id });
    }
  }
  for (const obstacle of content.obstacles) {
    if (obstacle.floorId === floorId && rectsIntersect(rect, obstacleBounds(obstacle))) {
      refs.push({ kind: 'obstacle', id: obstacle.id });
    }
  }
  return refs;
}
