/**
 * Reducer du brouillon du plan de salle.
 *
 * Tout ce que fait l'utilisateur (poser une table, déplacer un mur, supprimer
 * un étage…) modifie `present` localement ; rien n'est envoyé au serveur avant
 * « Publier ». `base` est le dernier plan publié : la différence `base` →
 * `present` donne exactement ce qu'il faut publier (voir diff.ts).
 *
 * L'historique (annulation / rétablissement) stocke des instantanés du
 * contenu ; les tableaux sont immuables et partagent leurs éléments inchangés,
 * donc un instantané coûte quelques pointeurs.
 */
import { CANVAS_SIZE, DEFAULT_SEATS, findFreeSpot, nextTableName } from '@/utils/floorPlanLayout';
import {
  clamp,
  clampCenter,
  clampTablePosition,
  normalizeAngle,
  round1,
  snap
} from './geometry';
import {
  OBSTACLE_MAX_SIZE,
  OBSTACLE_MIN_SIZE,
  getObstacleDefinition
} from './obstacleCatalog';
import { defaultTableDimensions, type NewTableSpec } from './tablePresets';
import { MAX_SEATS, MIN_SEATS, TABLE_MAX_SIZE, TABLE_MIN_SIZE } from './validation';
import {
  sameRef,
  type Area,
  type AreaPoint,
  type Floor,
  type ItemRef,
  type Location,
  type Obstacle,
  type ObstacleType,
  type PlanContent,
  type PlanSnapshot
} from './types';

export const HISTORY_LIMIT = 100;
export const MAX_BATCH_TABLES = 100;
export const DUPLICATE_OFFSET = 20;

export const EMPTY_CONTENT: PlanContent = { floors: [], locations: [], obstacles: [], areas: [] };

export interface HistoryEntry {
  content: PlanContent;
  activeFloorId: string | null;
}

export interface PlanState {
  /** Révision du plan publié sur lequel le brouillon est basé. */
  revision: number;
  base: PlanContent;
  present: PlanContent;
  past: HistoryEntry[];
  future: HistoryEntry[];
  selection: ItemRef[];
  activeFloorId: string | null;
  tempSeq: number;
  /** Clé de la dernière action « fusionnable » (frappes dans un champ) : évite une entrée d'historique par lettre. */
  lastCoalesceKey: string | null;
}

export function createInitialState(): PlanState {
  return {
    revision: 0,
    base: EMPTY_CONTENT,
    present: EMPTY_CONTENT,
    past: [],
    future: [],
    selection: [],
    activeFloorId: null,
    tempSeq: 1,
    lastCoalesceKey: null
  };
}

// --- Actions ------------------------------------------------------------------

export interface NewObstacleSpec {
  floorId: string;
  type: ObstacleType;
  /** Centre. Absent : centre du plan. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
  direction?: number;
}

export interface NewAreaSpec {
  floorId: string;
  points: AreaPoint[];
  name?: string;
  color?: string;
  strokeColor?: string;
}

export type ItemChange =
  | { ref: { kind: 'table'; id: string }; patch: Partial<Omit<Location, 'location_id'>> }
  | { ref: { kind: 'obstacle'; id: string }; patch: Partial<Omit<Obstacle, 'id'>> }
  | { ref: { kind: 'area'; id: string }; patch: Partial<Omit<Area, 'id'>> };

/** Éléments copiés (Ctrl+C) ou à dupliquer. */
export interface Clip {
  locations: Location[];
  obstacles: Obstacle[];
  areas: Area[];
}

export type PlanAction =
  | { type: 'load'; snapshot: PlanSnapshot; keepFloorId?: string | null }
  | { type: 'discard' }
  | { type: 'selectFloor'; floorId: string }
  | { type: 'select'; refs: ItemRef[]; mode?: 'replace' | 'toggle' | 'add' }
  | { type: 'addFloor'; name: string }
  | { type: 'renameFloor'; floorId: string; name: string }
  | { type: 'deleteFloor'; floorId: string }
  | { type: 'addTables'; spec: NewTableSpec; count?: number }
  | { type: 'addObstacle'; spec: NewObstacleSpec }
  | { type: 'addObstacles'; specs: NewObstacleSpec[] }
  | { type: 'addArea'; spec: NewAreaSpec }
  | { type: 'update'; changes: ItemChange[]; coalesceKey?: string }
  | { type: 'delete'; refs: ItemRef[] }
  | { type: 'duplicate'; refs: ItemRef[]; offset?: number }
  | { type: 'paste'; clip: Clip; floorId: string; offset?: number }
  | { type: 'undo' }
  | { type: 'redo' };

// --- Utilitaires internes -------------------------------------------------------

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function nextTempId(state: PlanState, letter: string): { id: string; tempSeq: number } {
  return { id: `tmp_${letter}${state.tempSeq}`, tempSeq: state.tempSeq + 1 };
}

function commit(
  state: PlanState,
  content: PlanContent,
  patch: Partial<PlanState> = {},
  coalesceKey: string | null = null
): PlanState {
  const coalesce = coalesceKey !== null && coalesceKey === state.lastCoalesceKey && state.past.length > 0;
  const past = coalesce
    ? state.past
    : [...state.past, { content: state.present, activeFloorId: state.activeFloorId }].slice(-HISTORY_LIMIT);

  return { ...state, ...patch, present: content, past, future: [], lastCoalesceKey: coalesceKey };
}

const itemExists = (content: PlanContent, ref: ItemRef): boolean => {
  switch (ref.kind) {
    case 'table':
      return content.locations.some(l => l.location_id === ref.id);
    case 'obstacle':
      return content.obstacles.some(o => o.id === ref.id);
    case 'area':
      return content.areas.some(a => a.id === ref.id);
  }
};

const pruneSelection = (selection: ItemRef[], content: PlanContent): ItemRef[] => {
  const kept = selection.filter(ref => itemExists(content, ref));
  return kept.length === selection.length ? selection : kept;
};

const dedupe = (refs: ItemRef[]): ItemRef[] =>
  refs.filter((ref, index) => refs.findIndex(other => sameRef(other, ref)) === index);

const firstFloorId = (content: PlanContent): string | null => content.floors[0]?.id ?? null;

// --- Normalisation des éléments (appliquée à chaque modification) ---------------

function normalizeTable(previous: Location, patch: Partial<Location>): Location {
  const next: Location = { ...previous };

  // Les champs numériques invalides (NaN, Infinity) sont ignorés plutôt que d'abîmer le plan.
  for (const [key, value] of Object.entries(patch) as [keyof Location, unknown][]) {
    if (['x', 'y', 'width', 'height', 'angle', 'seats'].includes(key) && !finite(value)) continue;
    (next as unknown as Record<string, unknown>)[key] = value;
  }

  if ('seats' in patch && finite(patch.seats)) {
    next.seats = clamp(Math.round(patch.seats), MIN_SEATS, MAX_SEATS);
  }
  if ('width' in patch || 'height' in patch) {
    next.width = round1(clamp(next.width, TABLE_MIN_SIZE, TABLE_MAX_SIZE));
    next.height = round1(clamp(next.height, TABLE_MIN_SIZE, TABLE_MAX_SIZE));
  }
  if ('angle' in patch) {
    next.angle = normalizeAngle(next.angle);
  }
  if ('x' in patch || 'y' in patch || 'width' in patch || 'height' in patch || 'angle' in patch) {
    const position = clampTablePosition(next.x, next.y, next.width, next.height, next.angle);
    next.x = round1(position.x);
    next.y = round1(position.y);
  }

  return next;
}

function normalizeObstacle(previous: Obstacle, patch: Partial<Obstacle>): Obstacle {
  const next: Obstacle = { ...previous };

  for (const [key, value] of Object.entries(patch) as [keyof Obstacle, unknown][]) {
    if (['x', 'y', 'width', 'height', 'angle', 'direction'].includes(key) && value !== undefined && !finite(value)) {
      continue;
    }
    (next as unknown as Record<string, unknown>)[key] = value;
  }

  if ('width' in patch || 'height' in patch) {
    next.width = round1(clamp(next.width, OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE));
    next.height = round1(clamp(next.height, OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE));
  }
  if ('angle' in patch) {
    next.angle = normalizeAngle(next.angle);
  }
  if ('x' in patch || 'y' in patch || 'width' in patch || 'height' in patch || 'angle' in patch) {
    const center = clampCenter(next.x, next.y, next.width, next.height, next.angle);
    next.x = round1(center.x);
    next.y = round1(center.y);
  }
  if (next.type === 'door') {
    if (next.direction !== undefined) next.direction = normalizeAngle(next.direction);
  } else {
    delete next.direction;
  }

  return next;
}

const sameValue = (a: unknown, b: unknown): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return Object.is(a, b);
};

const sameItem = (a: object, b: object): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  return true;
};

// --- Création d'éléments ----------------------------------------------------------

function buildTables(state: PlanState, spec: NewTableSpec, count: number): { tables: Location[]; tempSeq: number } {
  const defaults = defaultTableDimensions(spec.shape);
  const width = clamp(spec.width ?? defaults.width, TABLE_MIN_SIZE, TABLE_MAX_SIZE);
  const height = clamp(spec.height ?? defaults.height, TABLE_MIN_SIZE, TABLE_MAX_SIZE);
  const angle = normalizeAngle(spec.angle ?? 0);

  const sameFloor = state.present.locations.filter(l => l.floor_id === spec.floorId);
  const names = state.present.locations.map(l => l.location_name);
  const created: Location[] = [];
  let tempSeq = state.tempSeq;

  for (let i = 0; i < count; i++) {
    const occupied = [...sameFloor, ...created];
    const wanted =
      spec.x !== undefined && spec.y !== undefined && count === 1
        ? { x: snap(spec.x), y: snap(spec.y) }
        : findFreeSpot(occupied, width, height);
    const position = clampTablePosition(wanted.x, wanted.y, width, height, angle);

    const name = spec.name && count === 1 ? spec.name : nextTableName(names);
    names.push(name);

    created.push({
      location_id: `tmp_t${tempSeq++}`,
      location_name: name,
      seats: clamp(Math.round(spec.seats ?? DEFAULT_SEATS), MIN_SEATS, MAX_SEATS),
      floor_id: spec.floorId,
      shape: spec.shape,
      angle,
      x: round1(position.x),
      y: round1(position.y),
      width: round1(width),
      height: round1(height),
      enabled: true,
      attributes: spec.attributes ?? null
    });
  }

  return { tables: created, tempSeq };
}

function buildObstacle(state: PlanState, spec: NewObstacleSpec): { obstacle: Obstacle; tempSeq: number } {
  const definition = getObstacleDefinition(spec.type);
  const width = round1(clamp(spec.width ?? definition.width, OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE));
  const height = round1(clamp(spec.height ?? definition.height, OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE));
  const angle = normalizeAngle(spec.angle ?? 0);
  const center = clampCenter(spec.x ?? CANVAS_SIZE / 2, spec.y ?? CANVAS_SIZE / 2, width, height, angle);
  const { id, tempSeq } = nextTempId(state, 'o');

  const obstacle: Obstacle = {
    id,
    floorId: spec.floorId,
    type: spec.type,
    x: round1(center.x),
    y: round1(center.y),
    width,
    height,
    angle,
    ...(spec.type === 'door' ? { direction: normalizeAngle(spec.direction ?? definition.direction ?? 90) } : {})
  };

  return { obstacle, tempSeq };
}

function clipFromRefs(content: PlanContent, refs: ItemRef[]): Clip {
  return {
    locations: content.locations.filter(l => refs.some(r => r.kind === 'table' && r.id === l.location_id)),
    obstacles: content.obstacles.filter(o => refs.some(r => r.kind === 'obstacle' && r.id === o.id)),
    areas: content.areas.filter(a => refs.some(r => r.kind === 'area' && r.id === a.id))
  };
}

/** Insère des copies des éléments de `clip` (nouveaux ids temporaires, décalées de `offset`). */
function insertClones(
  state: PlanState,
  clip: Clip,
  floorOf: (original: { floor: string | null }) => string | null,
  offset: number
): PlanState {
  let tempSeq = state.tempSeq;
  const names = state.present.locations.map(l => l.location_name);
  const selection: ItemRef[] = [];

  const locations = clip.locations.flatMap<Location>(original => {
    const floorId = floorOf({ floor: original.floor_id });
    if (!floorId) return [];
    const position = clampTablePosition(
      original.x + offset,
      original.y + offset,
      original.width,
      original.height,
      original.angle
    );
    const name = nextTableName(names);
    names.push(name);
    const clone: Location = {
      location_id: `tmp_t${tempSeq++}`,
      location_name: name,
      seats: original.seats,
      floor_id: floorId,
      shape: original.shape,
      angle: original.angle,
      x: round1(position.x),
      y: round1(position.y),
      width: original.width,
      height: original.height,
      enabled: true,
      attributes: original.attributes ? { ...original.attributes } : null
    };
    selection.push({ kind: 'table', id: clone.location_id });
    return [clone];
  });

  const obstacles = clip.obstacles.flatMap<Obstacle>(original => {
    const floorId = floorOf({ floor: original.floorId });
    if (!floorId) return [];
    const center = clampCenter(original.x + offset, original.y + offset, original.width, original.height, original.angle);
    const clone: Obstacle = {
      ...original,
      id: `tmp_o${tempSeq++}`,
      floorId,
      x: round1(center.x),
      y: round1(center.y)
    };
    selection.push({ kind: 'obstacle', id: clone.id });
    return [clone];
  });

  const areas = clip.areas.flatMap<Area>(original => {
    const floorId = floorOf({ floor: original.floorId });
    if (!floorId) return [];
    const clone: Area = {
      ...original,
      id: `tmp_a${tempSeq++}`,
      floorId,
      x: original.x + offset,
      y: original.y + offset,
      points: original.points.map(p => ({ x: p.x + offset, y: p.y + offset }))
    };
    selection.push({ kind: 'area', id: clone.id });
    return [clone];
  });

  if (selection.length === 0) return state;

  return commit(
    state,
    {
      ...state.present,
      locations: [...state.present.locations, ...locations],
      obstacles: [...state.present.obstacles, ...obstacles],
      areas: [...state.present.areas, ...areas]
    },
    { selection, tempSeq }
  );
}

// --- Reducer ------------------------------------------------------------------------

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case 'load': {
      const { revision, ...content } = action.snapshot;
      const keep = action.keepFloorId;
      const activeFloorId =
        keep && content.floors.some(f => f.id === keep) ? keep : firstFloorId(content);
      return {
        ...state,
        revision,
        base: content,
        present: content,
        past: [],
        future: [],
        selection: [],
        activeFloorId,
        lastCoalesceKey: null
      };
    }

    case 'discard': {
      const activeFloorId =
        state.activeFloorId && state.base.floors.some(f => f.id === state.activeFloorId)
          ? state.activeFloorId
          : firstFloorId(state.base);
      return {
        ...state,
        present: state.base,
        past: [],
        future: [],
        selection: [],
        activeFloorId,
        lastCoalesceKey: null
      };
    }

    case 'selectFloor': {
      if (!state.present.floors.some(f => f.id === action.floorId)) return state;
      return { ...state, activeFloorId: action.floorId, selection: [], lastCoalesceKey: null };
    }

    case 'select': {
      const valid = dedupe(action.refs.filter(ref => itemExists(state.present, ref)));
      let selection: ItemRef[];
      switch (action.mode ?? 'replace') {
        case 'add':
          selection = dedupe([...state.selection, ...valid]);
          break;
        case 'toggle':
          selection = [
            ...state.selection.filter(ref => !valid.some(v => sameRef(v, ref))),
            ...valid.filter(v => !state.selection.some(ref => sameRef(ref, v)))
          ];
          break;
        default:
          selection = valid;
      }
      return { ...state, selection, lastCoalesceKey: null };
    }

    case 'addFloor': {
      const name = action.name.trim();
      if (!name) return state;
      const { id, tempSeq } = nextTempId(state, 'f');
      const floor: Floor = { id, name, enabled: true };
      return commit(
        state,
        { ...state.present, floors: [...state.present.floors, floor] },
        { activeFloorId: id, selection: [], tempSeq }
      );
    }

    case 'renameFloor': {
      const exists = state.present.floors.some(f => f.id === action.floorId);
      if (!exists) return state;
      return commit(
        state,
        {
          ...state.present,
          floors: state.present.floors.map(f => (f.id === action.floorId ? { ...f, name: action.name } : f))
        },
        {},
        `floor-name:${action.floorId}`
      );
    }

    case 'deleteFloor': {
      if (!state.present.floors.some(f => f.id === action.floorId)) return state;
      const content: PlanContent = {
        floors: state.present.floors.filter(f => f.id !== action.floorId),
        locations: state.present.locations.filter(l => l.floor_id !== action.floorId),
        obstacles: state.present.obstacles.filter(o => o.floorId !== action.floorId),
        areas: state.present.areas.filter(a => a.floorId !== action.floorId)
      };
      const activeFloorId =
        state.activeFloorId === action.floorId ? firstFloorId(content) : state.activeFloorId;
      return commit(state, content, { activeFloorId, selection: pruneSelection(state.selection, content) });
    }

    case 'addTables': {
      if (!state.present.floors.some(f => f.id === action.spec.floorId)) return state;
      const count = clamp(Math.floor(action.count ?? 1), 1, MAX_BATCH_TABLES);
      const { tables, tempSeq } = buildTables(state, action.spec, count);
      return commit(
        state,
        { ...state.present, locations: [...state.present.locations, ...tables] },
        { selection: tables.map(t => ({ kind: 'table' as const, id: t.location_id })), tempSeq }
      );
    }

    case 'addObstacle': {
      if (!state.present.floors.some(f => f.id === action.spec.floorId)) return state;
      const { obstacle, tempSeq } = buildObstacle(state, action.spec);
      return commit(
        state,
        { ...state.present, obstacles: [...state.present.obstacles, obstacle] },
        { selection: [{ kind: 'obstacle', id: obstacle.id }], tempSeq }
      );
    }

    case 'addObstacles': {
      // Plusieurs obstacles en une seule entrée d'historique (ex. les tronçons d'un mur).
      const specs = action.specs.filter(spec => state.present.floors.some(f => f.id === spec.floorId));
      if (specs.length === 0) return state;

      let tempSeq = state.tempSeq;
      const created: Obstacle[] = [];
      for (const spec of specs) {
        const built = buildObstacle({ ...state, tempSeq }, spec);
        created.push(built.obstacle);
        tempSeq = built.tempSeq;
      }
      return commit(
        state,
        { ...state.present, obstacles: [...state.present.obstacles, ...created] },
        { selection: created.map(o => ({ kind: 'obstacle' as const, id: o.id })), tempSeq }
      );
    }

    case 'addArea': {
      const { spec } = action;
      if (!state.present.floors.some(f => f.id === spec.floorId) || spec.points.length < 3) return state;
      const { id, tempSeq } = nextTempId(state, 'a');
      const area: Area = {
        id,
        floorId: spec.floorId,
        name: spec.name ?? 'Nouvelle zone',
        strokeColor: spec.strokeColor ?? '#64748B',
        color: spec.color ?? '#E2E8F0',
        x: Math.min(...spec.points.map(p => p.x)),
        y: Math.min(...spec.points.map(p => p.y)),
        points: spec.points,
        angle: 0
      };
      return commit(
        state,
        { ...state.present, areas: [...state.present.areas, area] },
        { selection: [{ kind: 'area', id }], tempSeq }
      );
    }

    case 'update': {
      let locations = state.present.locations;
      let obstacles = state.present.obstacles;
      let areas = state.present.areas;
      let changed = false;

      for (const change of action.changes) {
        switch (change.ref.kind) {
          case 'table': {
            const index = locations.findIndex(l => l.location_id === change.ref.id);
            if (index < 0) break;
            const next = normalizeTable(locations[index], change.patch as Partial<Location>);
            if (sameItem(next, locations[index])) break;
            locations = locations.map((l, i) => (i === index ? next : l));
            changed = true;
            break;
          }
          case 'obstacle': {
            const index = obstacles.findIndex(o => o.id === change.ref.id);
            if (index < 0) break;
            const next = normalizeObstacle(obstacles[index], change.patch as Partial<Obstacle>);
            if (sameItem(next, obstacles[index])) break;
            obstacles = obstacles.map((o, i) => (i === index ? next : o));
            changed = true;
            break;
          }
          case 'area': {
            const index = areas.findIndex(a => a.id === change.ref.id);
            if (index < 0) break;
            const next: Area = { ...areas[index], ...(change.patch as Partial<Area>) };
            if (sameItem(next, areas[index])) break;
            areas = areas.map((a, i) => (i === index ? next : a));
            changed = true;
            break;
          }
        }
      }

      if (!changed) return state;
      return commit(state, { ...state.present, locations, obstacles, areas }, {}, action.coalesceKey ?? null);
    }

    case 'delete': {
      const has = (kind: ItemRef['kind'], id: string) => action.refs.some(r => r.kind === kind && r.id === id);
      const content: PlanContent = {
        ...state.present,
        locations: state.present.locations.filter(l => !has('table', l.location_id)),
        obstacles: state.present.obstacles.filter(o => !has('obstacle', o.id)),
        areas: state.present.areas.filter(a => !has('area', a.id))
      };
      if (
        content.locations.length === state.present.locations.length &&
        content.obstacles.length === state.present.obstacles.length &&
        content.areas.length === state.present.areas.length
      ) {
        return state;
      }
      return commit(state, content, { selection: pruneSelection(state.selection, content) });
    }

    case 'duplicate': {
      const clip = clipFromRefs(state.present, action.refs);
      return insertClones(state, clip, original => original.floor, action.offset ?? DUPLICATE_OFFSET);
    }

    case 'paste': {
      if (!state.present.floors.some(f => f.id === action.floorId)) return state;
      return insertClones(state, action.clip, () => action.floorId, action.offset ?? DUPLICATE_OFFSET);
    }

    case 'undo': {
      const entry = state.past[state.past.length - 1];
      if (!entry) return state;
      return {
        ...state,
        present: entry.content,
        activeFloorId: entry.activeFloorId,
        past: state.past.slice(0, -1),
        future: [{ content: state.present, activeFloorId: state.activeFloorId }, ...state.future],
        selection: pruneSelection(state.selection, entry.content),
        lastCoalesceKey: null
      };
    }

    case 'redo': {
      const entry = state.future[0];
      if (!entry) return state;
      return {
        ...state,
        present: entry.content,
        activeFloorId: entry.activeFloorId,
        past: [...state.past, { content: state.present, activeFloorId: state.activeFloorId }],
        future: state.future.slice(1),
        selection: pruneSelection(state.selection, entry.content),
        lastCoalesceKey: null
      };
    }
  }
}

// --- Sélecteurs ---------------------------------------------------------------------

export const canUndo = (state: PlanState): boolean => state.past.length > 0;
export const canRedo = (state: PlanState): boolean => state.future.length > 0;

/** Clone-friendly : éléments sélectionnés, prêts à être copiés. */
export const selectionToClip = (state: PlanState): Clip => clipFromRefs(state.present, state.selection);
