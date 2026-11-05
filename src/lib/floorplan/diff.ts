/**
 * Différentiel entre le plan publié (`base`) et le brouillon (`present`), au
 * format attendu par POST /locations/plan/publish (snake_case).
 *
 * Règles :
 * - une entité du brouillon dont l'id est temporaire (`tmp_…`) est créée ;
 * - une entité publiée absente du brouillon est supprimée ;
 * - une entité présente des deux côtés est mise à jour SEULEMENT si un champ a
 *   réellement changé (comparaison à 0,05 unité près : l'API renvoie des
 *   flottants 32 bits, un aller-retour ne doit pas créer de fausse modification) ;
 * - une mise à jour porte l'entité complète, pas un patch partiel (la
 *   validation de `direction` d'une porte dépend de `type`).
 */
import type { Area, AreaPoint, Floor, Location, Obstacle, PlanContent, TableAttributes } from './types';
import { isTempId } from './types';

const TOLERANCE = 0.05;
const near = (a: number, b: number): boolean => Math.abs(a - b) < TOLERANCE;

const NO_ATTRIBUTES: TableAttributes = { pmr: false, terrace: false, vip: false, window: false };
const attributesOf = (location: Location): TableAttributes => ({ ...NO_ATTRIBUTES, ...(location.attributes ?? {}) });

// --- Format fil ---------------------------------------------------------------

export interface WireTableCreate {
  temp_id: string;
  floor_id: string;
  location_name: string;
  seats: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  attributes?: TableAttributes;
}

export interface WireTableUpdate {
  id: string;
  location_name: string;
  seats: number;
  floor_id: string | null;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  enabled: boolean;
  attributes?: TableAttributes;
}

export interface WireObstacleCreate {
  temp_id: string;
  floor_id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  direction?: number;
}

export interface WireObstacleUpdate {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  direction?: number;
}

export interface WireAreaCreate {
  temp_id: string;
  floor_id: string;
  name: string;
  stroke_color: string;
  color: string;
  x: number;
  y: number;
  points: AreaPoint[];
  angle: number;
}

export interface WireAreaUpdate {
  id: string;
  name: string;
  stroke_color: string;
  color: string;
  x: number;
  y: number;
  points: AreaPoint[];
  angle: number;
}

export interface PublishPayload {
  base_revision: number;
  floors: {
    create: { temp_id: string; name: string }[];
    update: { id: string; name: string }[];
    delete: string[];
  };
  tables: { create: WireTableCreate[]; update: WireTableUpdate[]; delete: string[] };
  obstacles: { create: WireObstacleCreate[]; update: WireObstacleUpdate[]; delete: string[] };
  areas: { create: WireAreaCreate[]; update: WireAreaUpdate[]; delete: string[] };
}

// --- Égalités -----------------------------------------------------------------

const sameTable = (a: Location, b: Location): boolean => {
  const attrsA = attributesOf(a);
  const attrsB = attributesOf(b);
  return (
    a.location_name === b.location_name &&
    a.seats === b.seats &&
    a.floor_id === b.floor_id &&
    a.shape === b.shape &&
    a.enabled === b.enabled &&
    near(a.x, b.x) &&
    near(a.y, b.y) &&
    near(a.width, b.width) &&
    near(a.height, b.height) &&
    near(a.angle, b.angle) &&
    (Object.keys(NO_ATTRIBUTES) as (keyof TableAttributes)[]).every(key => attrsA[key] === attrsB[key])
  );
};

const sameObstacle = (a: Obstacle, b: Obstacle): boolean =>
  a.type === b.type &&
  near(a.x, b.x) &&
  near(a.y, b.y) &&
  near(a.width, b.width) &&
  near(a.height, b.height) &&
  near(a.angle, b.angle) &&
  near(a.direction ?? 0, b.direction ?? 0);

const samePoints = (a: AreaPoint[], b: AreaPoint[]): boolean =>
  a.length === b.length && a.every((p, i) => near(p.x, b[i].x) && near(p.y, b[i].y));

const sameArea = (a: Area, b: Area): boolean =>
  a.name === b.name &&
  a.strokeColor === b.strokeColor &&
  a.color === b.color &&
  near(a.x, b.x) &&
  near(a.y, b.y) &&
  near(a.angle, b.angle) &&
  samePoints(a.points, b.points);

// --- Constructeurs fil --------------------------------------------------------

const tableCreate = (t: Location): WireTableCreate => ({
  temp_id: t.location_id,
  floor_id: t.floor_id ?? '',
  location_name: t.location_name,
  seats: t.seats,
  shape: t.shape,
  x: t.x,
  y: t.y,
  width: t.width,
  height: t.height,
  angle: t.angle,
  ...(t.attributes ? { attributes: attributesOf(t) } : {})
});

const tableUpdate = (t: Location): WireTableUpdate => ({
  id: t.location_id,
  location_name: t.location_name,
  seats: t.seats,
  floor_id: t.floor_id,
  shape: t.shape,
  x: t.x,
  y: t.y,
  width: t.width,
  height: t.height,
  angle: t.angle,
  enabled: t.enabled,
  ...(t.attributes ? { attributes: attributesOf(t) } : {})
});

const directionOf = (o: Obstacle): { direction?: number } =>
  o.type === 'door' && o.direction !== undefined ? { direction: o.direction } : {};

const obstacleCreate = (o: Obstacle): WireObstacleCreate => ({
  temp_id: o.id,
  floor_id: o.floorId,
  type: o.type,
  x: o.x,
  y: o.y,
  width: o.width,
  height: o.height,
  angle: o.angle,
  ...directionOf(o)
});

const obstacleUpdate = (o: Obstacle): WireObstacleUpdate => ({
  id: o.id,
  type: o.type,
  x: o.x,
  y: o.y,
  width: o.width,
  height: o.height,
  angle: o.angle,
  ...directionOf(o)
});

const areaCreate = (a: Area): WireAreaCreate => ({
  temp_id: a.id,
  floor_id: a.floorId,
  name: a.name,
  stroke_color: a.strokeColor,
  color: a.color,
  x: a.x,
  y: a.y,
  points: a.points,
  angle: a.angle
});

const areaUpdate = (a: Area): WireAreaUpdate => ({
  id: a.id,
  name: a.name,
  stroke_color: a.strokeColor,
  color: a.color,
  x: a.x,
  y: a.y,
  points: a.points,
  angle: a.angle
});

// --- Différentiel -------------------------------------------------------------

interface Delta<T> {
  created: T[];
  updated: T[];
  deletedIds: string[];
}

function diffList<T>(
  base: readonly T[],
  present: readonly T[],
  idOf: (item: T) => string,
  same: (a: T, b: T) => boolean
): Delta<T> {
  const baseById = new Map(base.map(item => [idOf(item), item]));
  const presentIds = new Set(present.map(idOf));

  const created: T[] = [];
  const updated: T[] = [];
  for (const item of present) {
    const id = idOf(item);
    const before = baseById.get(id);
    if (isTempId(id) || !before) {
      created.push(item);
    } else if (!same(before, item)) {
      updated.push(item);
    }
  }

  const deletedIds = base.map(idOf).filter(id => !presentIds.has(id));
  return { created, updated, deletedIds };
}

export function computePublishPayload(base: PlanContent, present: PlanContent, baseRevision: number): PublishPayload {
  const floors = diffList<Floor>(base.floors, present.floors, f => f.id, (a, b) => a.name === b.name);
  const tables = diffList<Location>(base.locations, present.locations, t => t.location_id, sameTable);
  const obstacles = diffList<Obstacle>(base.obstacles, present.obstacles, o => o.id, sameObstacle);
  const areas = diffList<Area>(base.areas, present.areas, a => a.id, sameArea);

  return {
    base_revision: baseRevision,
    floors: {
      create: floors.created.map(f => ({ temp_id: f.id, name: f.name.trim() })),
      update: floors.updated.map(f => ({ id: f.id, name: f.name.trim() })),
      delete: floors.deletedIds
    },
    tables: {
      create: tables.created.map(tableCreate),
      update: tables.updated.map(tableUpdate),
      delete: tables.deletedIds
    },
    obstacles: {
      create: obstacles.created.map(obstacleCreate),
      update: obstacles.updated.map(obstacleUpdate),
      delete: obstacles.deletedIds
    },
    areas: {
      create: areas.created.map(areaCreate),
      update: areas.updated.map(areaUpdate),
      delete: areas.deletedIds
    }
  };
}

export interface ChangeSummary {
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

export function summarizePayload(payload: PublishPayload): ChangeSummary {
  const groups = [payload.floors, payload.tables, payload.obstacles, payload.areas];
  const created = groups.reduce((sum, g) => sum + g.create.length, 0);
  const updated = groups.reduce((sum, g) => sum + g.update.length, 0);
  const deleted = groups.reduce((sum, g) => sum + g.delete.length, 0);
  return { created, updated, deleted, total: created + updated + deleted };
}

export function summarizeChanges(base: PlanContent, present: PlanContent): ChangeSummary {
  return summarizePayload(computePublishPayload(base, present, 0));
}
