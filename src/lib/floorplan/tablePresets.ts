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
