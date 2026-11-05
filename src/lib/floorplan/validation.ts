/**
 * Contrôles avant publication. Mêmes bornes que l'API (qui revalide tout) :
 * un brouillon invalide est signalé à l'utilisateur AVANT l'envoi, avec
 * l'élément fautif, au lieu d'un 422 générique.
 */
import { OBSTACLE_MAX_SIZE, OBSTACLE_MIN_SIZE, OBSTACLE_LABELS } from './obstacleCatalog';
import type { ItemKind, PlanContent } from './types';

export const MAX_FLOOR_NAME_LENGTH = 50; // floors.name varchar(50)
export const MAX_TABLE_NAME_LENGTH = 20; // locations.location_name varchar(20)
export const MAX_AREA_NAME_LENGTH = 50;
export const TABLE_MIN_SIZE = 40;
export const TABLE_MAX_SIZE = 300;
export const MIN_SEATS = 1;
export const MAX_SEATS = 20;

export interface PlanIssue {
  kind: ItemKind | 'floor';
  id: string;
  message: string;
}

export function validatePlanContent(content: PlanContent): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const floorIds = new Set(content.floors.map(f => f.id));
  const floorName = (id: string | null) => content.floors.find(f => f.id === id)?.name ?? 'étage inconnu';

  for (const floor of content.floors) {
    const name = floor.name.trim();
    if (!name) {
      issues.push({ kind: 'floor', id: floor.id, message: "Un étage n'a pas de nom." });
    } else if (name.length > MAX_FLOOR_NAME_LENGTH) {
      issues.push({
        kind: 'floor',
        id: floor.id,
        message: `Le nom de l'étage « ${name} » dépasse ${MAX_FLOOR_NAME_LENGTH} caractères.`
      });
    }
  }

  for (const table of content.locations) {
    const name = table.location_name.trim();
    const where = `(${floorName(table.floor_id)})`;
    if (!name) {
      issues.push({ kind: 'table', id: table.location_id, message: `Une table n'a pas de nom ${where}.` });
    } else if (name.length > MAX_TABLE_NAME_LENGTH) {
      issues.push({
        kind: 'table',
        id: table.location_id,
        message: `Le nom de la table « ${name} » dépasse ${MAX_TABLE_NAME_LENGTH} caractères.`
      });
    }
    if (table.seats < MIN_SEATS || table.seats > MAX_SEATS) {
      issues.push({
        kind: 'table',
        id: table.location_id,
        message: `La table « ${name} » doit avoir entre ${MIN_SEATS} et ${MAX_SEATS} places.`
      });
    }
    if (
      table.width < TABLE_MIN_SIZE ||
      table.width > TABLE_MAX_SIZE ||
      table.height < TABLE_MIN_SIZE ||
      table.height > TABLE_MAX_SIZE
    ) {
      issues.push({
        kind: 'table',
        id: table.location_id,
        message: `Les dimensions de la table « ${name} » doivent être comprises entre ${TABLE_MIN_SIZE} et ${TABLE_MAX_SIZE}.`
      });
    }
    if (!table.floor_id || !floorIds.has(table.floor_id)) {
      issues.push({ kind: 'table', id: table.location_id, message: `La table « ${name} » n'est rattachée à aucun étage.` });
    }
  }

  for (const obstacle of content.obstacles) {
    const label = OBSTACLE_LABELS[obstacle.type] ?? obstacle.type;
    if (
      obstacle.width < OBSTACLE_MIN_SIZE ||
      obstacle.width > OBSTACLE_MAX_SIZE ||
      obstacle.height < OBSTACLE_MIN_SIZE ||
      obstacle.height > OBSTACLE_MAX_SIZE
    ) {
      issues.push({
        kind: 'obstacle',
        id: obstacle.id,
        message: `Les dimensions de l'élément « ${label} » doivent être comprises entre ${OBSTACLE_MIN_SIZE} et ${OBSTACLE_MAX_SIZE}.`
      });
    }
    if (!floorIds.has(obstacle.floorId)) {
      issues.push({ kind: 'obstacle', id: obstacle.id, message: `Un élément « ${label} » n'est rattaché à aucun étage.` });
    }
  }

  for (const area of content.areas) {
    const name = area.name.trim();
    if (!name || name.length > MAX_AREA_NAME_LENGTH) {
      issues.push({
        kind: 'area',
        id: area.id,
        message: `Le nom d'une zone doit comporter entre 1 et ${MAX_AREA_NAME_LENGTH} caractères.`
      });
    }
    if (area.points.length < 3) {
      issues.push({ kind: 'area', id: area.id, message: `La zone « ${name} » doit avoir au moins 3 points.` });
    }
  }

  return issues;
}
