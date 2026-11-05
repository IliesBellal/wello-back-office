import { DEFAULT_SEATS } from '@/utils/floorPlanLayout';
import type { TableAttributes, TableShape } from './types';

/** Dimensions par défaut d'une table selon sa forme (unités du canvas virtuel). */
export function defaultTableDimensions(shape: TableShape): { width: number; height: number } {
  switch (shape) {
    case 'rectangle':
    case 'oval':
      return { width: 120, height: 80 };
    case 'circle':
    case 'square':
    default:
      return { width: 80, height: 80 };
  }
}

/** Ce qu'il faut pour poser une table : tout est optionnel sauf l'étage et la forme. */
export interface NewTableSpec {
  floorId: string;
  shape: TableShape;
  seats?: number;
  width?: number;
  height?: number;
  angle?: number;
  /** Coin haut-gauche. Absent : premier emplacement libre de l'étage. */
  x?: number;
  y?: number;
  name?: string;
  attributes?: TableAttributes | null;
}

export interface TablePreset {
  id: string;
  label: string;
  shape: TableShape;
  seats: number;
  width: number;
  height: number;
}

/** Gabarits proposés en un clic : forme, taille et couverts cohérents avec le rendu des chaises. */
export const TABLE_PRESETS: readonly TablePreset[] = [
  { id: 'round-2', label: 'Ronde · 2', shape: 'circle', seats: 2, width: 60, height: 60 },
  { id: 'square-2', label: 'Carrée · 2', shape: 'square', seats: 2, width: 60, height: 60 },
  { id: 'square-4', label: 'Carrée · 4', shape: 'square', seats: 4, width: 80, height: 80 },
  { id: 'round-4', label: 'Ronde · 4', shape: 'circle', seats: 4, width: 90, height: 90 },
  { id: 'rect-6', label: 'Rectangle · 6', shape: 'rectangle', seats: 6, width: 160, height: 80 },
  { id: 'rect-8', label: 'Rectangle · 8', shape: 'rectangle', seats: 8, width: 200, height: 80 }
];

/** Spec d'une table « de base » d'une forme donnée : 2 couverts, dimensions par défaut. */
export const basicTableSpec = (floorId: string, shape: TableShape): NewTableSpec => ({
  floorId,
  shape,
  seats: DEFAULT_SEATS,
  ...defaultTableDimensions(shape)
});

export const presetTableSpec = (floorId: string, preset: TablePreset): NewTableSpec => ({
  floorId,
  shape: preset.shape,
  seats: preset.seats,
  width: preset.width,
  height: preset.height
});
