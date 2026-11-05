/**
 * Modèle du plan de salle côté back-office.
 *
 * Ces types sont ceux que manipule l'éditeur (camelCase pour les obstacles et
 * les zones, comme avant). La traduction depuis/vers le format de l'API
 * (snake_case) est faite dans `locationsService`, à la frontière.
 */

export interface Floor {
  id: string;
  name: string;
  enabled: boolean;
}

export type TableShape = 'circle' | 'rectangle' | 'square' | 'oval';

export interface TableAttributes {
  pmr: boolean;
  terrace: boolean;
  vip: boolean;
  window: boolean;
}

export interface LocationBooking {
  bookingId: string;
  bookingNumber: string;
  partySize: number;
  startsAt: string; // ISO 8601 UTC
  customerName: string;
}

/** Une table. `x`/`y` : coin haut-gauche, avant rotation (la rotation pivote autour du centre). */
export interface Location {
  location_id: string;
  merchant_id?: string;
  location_name: string;
  seats: number;
  floor_id: string | null;
  shape: TableShape;
  angle: number;
  x: number; // 0-1000 (canvas virtuel)
  y: number; // 0-1000
  width: number;
  height: number;
  enabled: boolean;
  open_order_id?: string | null;
  available?: boolean;
  booking?: LocationBooking | null;
  attributes?: TableAttributes | null;
}

export type ObstacleType = 'wall' | 'door' | 'window' | 'stairs' | 'plant' | 'bar' | 'pillar';

/** Un obstacle. `x`/`y` : CENTRE (différent des tables), `angle` pivote autour du centre. */
export interface Obstacle {
  id: string;
  floorId: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  direction?: number; // uniquement pour type === 'door' (angle d'ouverture)
}

export interface AreaPoint {
  x: number;
  y: number;
}

export interface Area {
  id: string;
  floorId: string;
  name: string;
  strokeColor: string; // hex, ex : "#64748B"
  color: string; // hex, ex : "#E2E8F0"
  x: number;
  y: number;
  points: AreaPoint[];
  angle: number;
}

/** Le contenu éditable d'un plan : ce qui est comparé entre le publié et le brouillon. */
export interface PlanContent {
  floors: Floor[];
  locations: Location[];
  obstacles: Obstacle[];
  areas: Area[];
}

/** Le plan tel que publié, avec sa révision (contrôle de concurrence à la publication). */
export interface PlanSnapshot extends PlanContent {
  revision: number;
}

export type ItemKind = 'table' | 'obstacle' | 'area';

export interface ItemRef {
  kind: ItemKind;
  id: string;
}

/** Préfixe des identifiants d'entités créées dans le brouillon, pas encore publiées. */
export const TEMP_ID_PREFIX = 'tmp_';

export const isTempId = (id: string): boolean => id.startsWith(TEMP_ID_PREFIX);

export const itemId = (item: Location | Obstacle | Area): string =>
  'location_id' in item ? item.location_id : item.id;

export const sameRef = (a: ItemRef, b: ItemRef): boolean => a.kind === b.kind && a.id === b.id;
