/**
 * Outils de l'éditeur et calcul (pur) de l'endroit où ils posent leur élément.
 * Le fantôme affiché sous le curseur et le clic qui pose réellement l'élément
 * passent par les mêmes fonctions : ce qu'on voit est ce qu'on obtient.
 */
import { GRID_SIZE } from '@/utils/floorPlanLayout';
import {
  clampCenter,
  clampTablePosition,
  constrainAngle,
  round1,
  snap,
  snapToWall,
  type Point
} from './geometry';
import { getObstacleDefinition } from './obstacleCatalog';
import type { NewTableSpec } from './tablePresets';
import type { Obstacle, ObstacleType, TableShape } from './types';

export type Tool =
  | { kind: 'select' }
  | { kind: 'table'; shape: TableShape; seats: number; width: number; height: number; label: string }
  | { kind: 'obstacle'; type: Exclude<ObstacleType, 'wall'> }
  | { kind: 'wall' }
  | { kind: 'area' };

export const SELECT_TOOL: Tool = { kind: 'select' };

export const tableTool = (spec: Pick<NewTableSpec, 'shape' | 'seats' | 'width' | 'height'>, label: string): Tool => ({
  kind: 'table',
  shape: spec.shape,
  seats: spec.seats ?? 2,
  width: spec.width ?? 80,
  height: spec.height ?? 80,
  label
});

/** Coin haut-gauche d'une table posée avec son centre sous le curseur, calé sur la grille et maintenu dans le plan. */
export function placeTableAt(pointer: Point, width: number, height: number): Point {
  const topLeft = clampTablePosition(snap(pointer.x - width / 2), snap(pointer.y - height / 2), width, height, 0);
  return { x: round1(topLeft.x), y: round1(topLeft.y) };
}

export interface ObstaclePlacement {
  x: number; // centre
  y: number;
  width: number;
  height: number;
  angle: number;
  /** Posé sur un mur (porte / fenêtre) : orientation et épaisseur viennent du mur. */
  snappedToWall: boolean;
}

/**
 * Où et comment poser un obstacle sous le curseur. Portes et fenêtres
 * s'accrochent au mur le plus proche ; les autres se calent sur une demi-grille.
 */
export function placeObstacleAt(
  pointer: Point,
  type: Exclude<ObstacleType, 'wall'>,
  walls: readonly Obstacle[]
): ObstaclePlacement {
  const definition = getObstacleDefinition(type);
  const { width, height } = definition;

  if (definition.snapsToWall) {
    const wall = snapToWall(pointer, walls, { halfLength: width / 2 });
    if (wall) {
      return { x: wall.x, y: wall.y, width, height: wall.thickness, angle: wall.angle, snappedToWall: true };
    }
  }

  const center = clampCenter(snap(pointer.x, GRID_SIZE / 2), snap(pointer.y, GRID_SIZE / 2), width, height, 0);
  return { x: round1(center.x), y: round1(center.y), width, height, angle: 0, snappedToWall: false };
}

/**
 * Point de mur sous le curseur : calé sur la grille ; avec Maj, aligné sur un
 * multiple de 15° depuis le point précédent.
 */
export function placeWallPoint(pointer: Point, start: Point | null, constrain: boolean): Point {
  const snapped = { x: snap(pointer.x), y: snap(pointer.y) };
  const point = start && constrain ? constrainAngle(start, snapped) : snapped;
  return { x: round1(Math.min(Math.max(point.x, 0), 1000)), y: round1(Math.min(Math.max(point.y, 0), 1000)) };
}
