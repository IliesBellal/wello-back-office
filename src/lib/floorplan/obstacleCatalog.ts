import type { ObstacleType } from './types';

/**
 * Catalogue des obstacles proposés dans l'éditeur. Source unique : barre
 * d'outils, panneau de propriétés, dimensions par défaut, bornes.
 *
 * Les bornes `min`/`max` reprennent celles de l'API (10 à 1000 unités).
 */
export interface ObstacleDefinition {
  type: ObstacleType;
  label: string;
  hint: string;
  /** `draw` : se trace au clic (mur) ; `place` : se pose d'un clic. */
  placement: 'draw' | 'place';
  /** Dimensions par défaut à la pose (largeur = longueur, hauteur = épaisseur). */
  width: number;
  height: number;
  /** Porte / fenêtre : s'accroche à un mur proche et prend son orientation et son épaisseur. */
  snapsToWall: boolean;
  /** Redimensionnement proportionnel obligatoire (plante, pilier). */
  keepRatio: boolean;
  /** Angle d'ouverture par défaut (portes uniquement). */
  direction?: number;
}

export const OBSTACLE_MIN_SIZE = 10;
export const OBSTACLE_MAX_SIZE = 1000;
export const WALL_DEFAULT_THICKNESS = 12;

export const OBSTACLE_CATALOG: readonly ObstacleDefinition[] = [
  {
    type: 'wall',
    label: 'Mur',
    hint: 'Cliquez pour poser les points, double-clic pour finir',
    placement: 'draw',
    width: 120,
    height: WALL_DEFAULT_THICKNESS,
    snapsToWall: false,
    keepRatio: false
  },
  {
    type: 'door',
    label: 'Porte',
    hint: "S'accroche aux murs",
    placement: 'place',
    width: 80,
    height: WALL_DEFAULT_THICKNESS,
    snapsToWall: true,
    keepRatio: false,
    direction: 90
  },
  {
    type: 'window',
    label: 'Fenêtre',
    hint: "S'accroche aux murs",
    placement: 'place',
    width: 100,
    height: WALL_DEFAULT_THICKNESS,
    snapsToWall: true,
    keepRatio: false
  },
  {
    type: 'stairs',
    label: 'Escalier',
    hint: 'Marches et sens de montée',
    placement: 'place',
    width: 80,
    height: 120,
    snapsToWall: false,
    keepRatio: false
  },
  {
    type: 'plant',
    label: 'Plante',
    hint: 'Plante en pot',
    placement: 'place',
    width: 40,
    height: 40,
    snapsToWall: false,
    keepRatio: true
  },
  {
    type: 'bar',
    label: 'Bar',
    hint: 'Comptoir',
    placement: 'place',
    width: 200,
    height: 50,
    snapsToWall: false,
    keepRatio: false
  },
  {
    type: 'pillar',
    label: 'Pilier',
    hint: 'Poteau porteur',
    placement: 'place',
    width: 30,
    height: 30,
    snapsToWall: false,
    keepRatio: true
  }
];

const BY_TYPE = new Map(OBSTACLE_CATALOG.map(def => [def.type, def]));

export const getObstacleDefinition = (type: ObstacleType): ObstacleDefinition => {
  const definition = BY_TYPE.get(type);
  if (!definition) {
    throw new Error(`Type d'obstacle inconnu : ${type}`);
  }
  return definition;
};

export const OBSTACLE_LABELS: Record<ObstacleType, string> = Object.fromEntries(
  OBSTACLE_CATALOG.map(def => [def.type, def.label])
) as Record<ObstacleType, string>;

export const isObstacleType = (value: unknown): value is ObstacleType =>
  typeof value === 'string' && BY_TYPE.has(value as ObstacleType);
