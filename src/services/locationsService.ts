import { apiClient, isApiHttpError, logAPI, withMock } from "@/services/apiClient";
import type { PublishPayload } from "@/lib/floorplan/diff";
import { isObstacleType } from "@/lib/floorplan/obstacleCatalog";
import type {
  Area,
  AreaPoint,
  Floor,
  Location,
  LocationBooking,
  Obstacle,
  PlanContent,
  PlanSnapshot,
} from "@/lib/floorplan/types";

// Les types du plan vivent dans lib/floorplan/types ; ils restent importables d'ici.
export type {
  Area,
  AreaPoint,
  Floor,
  Location,
  LocationBooking,
  Obstacle,
  ObstacleType,
  PlanContent,
  PlanSnapshot,
  TableAttributes,
  TableShape,
} from "@/lib/floorplan/types";

// ============= Format de l'API (snake_case, ids pouvant être numériques) =============

type RawId = string | number;

interface RawLocationBooking {
  booking_id: string;
  booking_number: string;
  party_size: number;
  starts_at: string;
  customer_name: string;
}

type RawLocation = Omit<Location, "booking" | "location_id" | "floor_id"> & {
  location_id: RawId;
  floor_id: RawId | null;
  booking?: RawLocationBooking | null;
};

interface RawFloor {
  id: RawId;
  name: string;
}

interface RawObstacle {
  id: RawId;
  floor_id: RawId;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  direction?: number | null;
}

interface RawArea {
  id: RawId;
  floor_id: RawId;
  name: string;
  points: AreaPoint[] | string | null;
  x: number;
  y: number;
  angle: number;
  stroke_color: string;
  color: string;
}

interface RawLocationsResponse {
  id?: string;
  data: {
    floors?: RawFloor[] | null;
    locations?: RawLocation[] | null;
    obstacles?: RawObstacle[] | null;
    areas?: RawArea[] | null;
    revision?: number | null;
  };
}

const asId = (value: RawId): string => String(value);

// L'API (models.Location) déclare x, y, angle, width, height et shape en `omitempty` et n'a pas
// de champ `enabled` : une table à l'angle 0 ou au bord gauche arrive SANS ces clés. Sans valeurs
// par défaut, `undefined` donnerait des NaN et le différentiel verrait chaque table comme modifiée.
const mapRawLocation = (raw: RawLocation): Location => ({
  ...raw,
  location_id: asId(raw.location_id),
  floor_id: raw.floor_id === null || raw.floor_id === undefined || raw.floor_id === '' ? null : asId(raw.floor_id),
  shape: raw.shape || 'rectangle',
  x: raw.x ?? 0,
  y: raw.y ?? 0,
  width: raw.width ?? 80,
  height: raw.height ?? 80,
  angle: raw.angle ?? 0,
  enabled: raw.enabled ?? true,
  booking: raw.booking
    ? {
        bookingId: raw.booking.booking_id,
        bookingNumber: raw.booking.booking_number,
        partySize: raw.booking.party_size,
        startsAt: raw.booking.starts_at,
        customerName: raw.booking.customer_name,
      }
    : null,
  attributes: raw.attributes ?? null,
});

const mapRawObstacle = (raw: RawObstacle): Obstacle | null => {
  // Un type inconnu (ajouté côté serveur après ce build) est ignoré plutôt que de casser le plan.
  if (!isObstacleType(raw.type)) {
    console.warn(`[floorplan] obstacle ${raw.id} ignoré : type inconnu « ${raw.type} »`);
    return null;
  }
  return {
    id: asId(raw.id),
    floorId: asId(raw.floor_id),
    type: raw.type,
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    angle: raw.angle,
    ...(raw.type === "door" && raw.direction != null ? { direction: raw.direction } : {}),
  };
};

const parsePoints = (points: RawArea["points"]): AreaPoint[] => {
  if (Array.isArray(points)) return points;
  if (typeof points === "string") {
    try {
      const parsed: unknown = JSON.parse(points);
      return Array.isArray(parsed) ? (parsed as AreaPoint[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapRawArea = (raw: RawArea): Area => ({
  id: asId(raw.id),
  floorId: asId(raw.floor_id),
  name: raw.name,
  strokeColor: raw.stroke_color,
  color: raw.color,
  x: raw.x,
  y: raw.y,
  angle: raw.angle,
  points: parsePoints(raw.points),
});

/**
 * Traduit la réponse de GET /locations en plan éditable. Les éléments rattachés
 * à un étage absent de la liste (tables historiques sans étage, étage
 * désactivé) sont écartés : ils ne sont affichables nulle part, et les garder
 * bloquerait la publication. Ils restent intacts en base.
 */
export const mapRawPlan = (raw: RawLocationsResponse): PlanSnapshot => {
  const data = raw.data ?? {};
  const floors: Floor[] = (data.floors ?? []).map((f) => ({ id: asId(f.id), name: f.name, enabled: true }));
  const floorIds = new Set(floors.map((f) => f.id));

  return {
    revision: data.revision ?? 0,
    floors,
    locations: (data.locations ?? [])
      .map(mapRawLocation)
      .filter((l) => l.floor_id !== null && floorIds.has(l.floor_id)),
    obstacles: (data.obstacles ?? [])
      .map(mapRawObstacle)
      .filter((o): o is Obstacle => o !== null && floorIds.has(o.floorId)),
    areas: (data.areas ?? []).map(mapRawArea).filter((a) => floorIds.has(a.floorId)),
  };
};

// ============= Publication =============

export interface PublishResult {
  revision: number;
  idMap: Record<string, string>;
}

const PUBLISH_ERROR_MESSAGES: Record<string, string> = {
  plan_revision_conflict: "Le plan a été modifié par quelqu'un d'autre depuis votre dernier chargement.",
  floor_not_empty: "Un étage supprimé contient encore des tables.",
  floor_not_found: "Un étage utilisé par vos modifications n'existe plus.",
  not_found: "Un élément que vous avez modifié n'existe plus.",
  invalid_plan_payload: "Le plan contient des données invalides.",
  invalid_table_geometry: "Une table a des dimensions, une position ou un nombre de places invalide.",
  invalid_obstacle_geometry: "Un élément du décor a des dimensions ou une position invalide.",
  invalid_area_geometry: "Une zone est invalide (nom, couleurs ou nombre de points).",
};

export class PlanPublishError extends Error {
  readonly code?: string;
  readonly httpStatus?: number;

  constructor(message: string, code?: string, httpStatus?: number) {
    super(message);
    this.name = "PlanPublishError";
    this.code = code;
    this.httpStatus = httpStatus;
  }

  /** La publication a été refusée parce qu'un autre utilisateur a publié entre-temps. */
  get isConflict(): boolean {
    return this.code === "plan_revision_conflict";
  }
}

const toPublishError = (error: unknown): unknown => {
  if (!isApiHttpError(error)) return error;
  const body = error.responseBody as { status?: unknown } | undefined;
  const code = typeof body?.status === "string" ? body.status : undefined;
  const message = (code && PUBLISH_ERROR_MESSAGES[code]) || "L'enregistrement du plan a échoué. Réessayez.";
  return new PlanPublishError(message, code, error.status);
};

// ============= Mock (VITE_USE_MOCK=true) =============

let mockPlan: PlanContent = {
  floors: [
    { id: "1", name: "RDC", enabled: true },
    { id: "2", name: "Terrasse", enabled: true },
  ],
  locations: [
    { location_id: "1", location_name: "Table 1", seats: 4, floor_id: "1", shape: "circle", angle: 0, x: 200, y: 260, width: 80, height: 80, enabled: true },
    {
      location_id: "2", location_name: "Table 2", seats: 6, floor_id: "1", shape: "rectangle", angle: 45, x: 600, y: 300,
      width: 120, height: 80, enabled: true, open_order_id: "order-42", available: false,
    },
    {
      location_id: "3", location_name: "Table 3", seats: 4, floor_id: "1", shape: "square", angle: 0, x: 400, y: 600,
      width: 80, height: 80, enabled: true, available: true,
      booking: {
        bookingId: "booking-7", bookingNumber: "RES-0007", partySize: 4,
        startsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), customerName: "Jean Dupont",
      },
    },
    { location_id: "4", location_name: "Table 4", seats: 2, floor_id: "2", shape: "circle", angle: 0, x: 300, y: 400, width: 60, height: 60, enabled: true },
    { location_id: "5", location_name: "Table 5", seats: 5, floor_id: "1", shape: "oval", angle: 20, x: 650, y: 620, width: 140, height: 90, enabled: true },
  ],
  obstacles: [
    { id: "obs-1", floorId: "1", type: "wall", x: 500, y: 80, width: 600, height: 12, angle: 0 },
    { id: "obs-2", floorId: "1", type: "window", x: 400, y: 80, width: 100, height: 12, angle: 0 },
    { id: "obs-3", floorId: "1", type: "door", x: 760, y: 80, width: 80, height: 12, angle: 0, direction: 90 },
    { id: "obs-4", floorId: "1", type: "plant", x: 120, y: 160, width: 40, height: 40, angle: 0 },
  ],
  areas: [],
};
let mockRevision = 0;
let mockSeq = 100;

const cloneContent = (content: PlanContent): PlanContent => JSON.parse(JSON.stringify(content));

/**
 * Applique un lot de publication à un plan, avec les mêmes règles que l'API
 * (ids temporaires résolus, étage supprimé seulement s'il est vide, contenu
 * restant de l'étage désactivé avec lui). Pure : sert au mode mock et aux tests.
 */
export function applyPublishToContent(
  content: PlanContent,
  payload: PublishPayload,
  newId: () => string
): { content: PlanContent; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {};
  const resolve = (id: string | null): string => (id && idMap[id]) || id || "";

  const floors: Floor[] = [...content.floors];
  for (const f of payload.floors.create) {
    idMap[f.temp_id] = newId();
    floors.push({ id: idMap[f.temp_id], name: f.name, enabled: true });
  }
  for (const f of payload.floors.update) {
    const index = floors.findIndex((x) => x.id === f.id);
    if (index >= 0) floors[index] = { ...floors[index], name: f.name };
  }

  let locations: Location[] = [...content.locations];
  for (const t of payload.tables.create) {
    idMap[t.temp_id] = newId();
    locations.push({
      location_id: idMap[t.temp_id],
      location_name: t.location_name,
      seats: t.seats,
      floor_id: resolve(t.floor_id),
      shape: t.shape as Location["shape"],
      angle: t.angle,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      enabled: true,
      attributes: t.attributes ?? null,
    });
  }
  for (const t of payload.tables.update) {
    locations = locations.map((l) =>
      l.location_id === t.id
        ? {
            ...l,
            location_name: t.location_name,
            seats: t.seats,
            floor_id: t.floor_id === null ? null : resolve(t.floor_id),
            shape: t.shape as Location["shape"],
            angle: t.angle,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            enabled: t.enabled,
            attributes: t.attributes ?? l.attributes ?? null,
          }
        : l
    );
  }
  locations = locations.filter((l) => !payload.tables.delete.includes(l.location_id));

  let obstacles: Obstacle[] = [...content.obstacles];
  for (const o of payload.obstacles.create) {
    idMap[o.temp_id] = newId();
    obstacles.push({
      id: idMap[o.temp_id],
      floorId: resolve(o.floor_id),
      type: o.type as Obstacle["type"],
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      angle: o.angle,
      ...(o.direction !== undefined ? { direction: o.direction } : {}),
    });
  }
  for (const o of payload.obstacles.update) {
    obstacles = obstacles.map((x) =>
      x.id === o.id
        ? {
            ...x,
            type: o.type as Obstacle["type"],
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            angle: o.angle,
            ...(o.direction !== undefined ? { direction: o.direction } : {}),
          }
        : x
    );
  }
  obstacles = obstacles.filter((o) => !payload.obstacles.delete.includes(o.id));

  let areas: Area[] = [...content.areas];
  for (const a of payload.areas.create) {
    idMap[a.temp_id] = newId();
    areas.push({
      id: idMap[a.temp_id],
      floorId: resolve(a.floor_id),
      name: a.name,
      strokeColor: a.stroke_color,
      color: a.color,
      x: a.x,
      y: a.y,
      points: a.points,
      angle: a.angle,
    });
  }
  for (const a of payload.areas.update) {
    areas = areas.map((x) =>
      x.id === a.id
        ? { ...x, name: a.name, strokeColor: a.stroke_color, color: a.color, x: a.x, y: a.y, points: a.points, angle: a.angle }
        : x
    );
  }
  areas = areas.filter((a) => !payload.areas.delete.includes(a.id));

  for (const floorId of payload.floors.delete) {
    if (locations.some((l) => l.floor_id === floorId)) {
      throw new PlanPublishError(PUBLISH_ERROR_MESSAGES.floor_not_empty, "floor_not_empty", 409);
    }
  }
  const removed = new Set(payload.floors.delete);

  return {
    content: {
      floors: floors.filter((f) => !removed.has(f.id)),
      locations,
      obstacles: obstacles.filter((o) => !removed.has(o.floorId)),
      areas: areas.filter((a) => !removed.has(a.floorId)),
    },
    idMap,
  };
}

// ============= Fonctions d'API =============

/** Charge le plan publié (étages, tables, obstacles, zones) et sa révision. */
export const getFloorPlan = async (): Promise<PlanSnapshot> => {
  logAPI("GET", "/locations");

  return withMock(
    () => ({ revision: mockRevision, ...cloneContent(mockPlan) }),
    async () => mapRawPlan(await apiClient.get<RawLocationsResponse>("/locations"))
  );
};

/**
 * Publie le différentiel d'un brouillon en une transaction (tout ou rien).
 * Lève une `PlanPublishError` au message affichable ; `isConflict` signale
 * qu'un autre utilisateur a publié entre-temps.
 */
export const publishFloorPlan = async (payload: PublishPayload): Promise<PublishResult> => {
  logAPI("POST", "/locations/plan/publish", payload);

  return withMock(
    () => {
      if (payload.base_revision !== mockRevision) {
        throw new PlanPublishError(PUBLISH_ERROR_MESSAGES.plan_revision_conflict, "plan_revision_conflict", 409);
      }
      const { content, idMap } = applyPublishToContent(mockPlan, payload, () => String(++mockSeq));
      mockPlan = content;
      mockRevision += 1;
      return { revision: mockRevision, idMap };
    },
    async () => {
      try {
        const response = await apiClient.post<{ data?: { revision?: number; id_map?: Record<string, string> } }>(
          "/locations/plan/publish",
          payload,
          { suppressErrorToast: true }
        );
        return { revision: response.data?.revision ?? payload.base_revision + 1, idMap: response.data?.id_map ?? {} };
      } catch (error) {
        throw toPublishError(error);
      }
    }
  );
};
