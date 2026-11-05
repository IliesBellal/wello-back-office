import type Konva from 'konva';
import type { ItemRef } from '@/lib/floorplan/types';

/**
 * Contrat entre le canvas et les formes (table, obstacle). Les formes ne
 * connaissent ni la sélection ni l'état du plan : elles remontent des gestes
 * et le canvas décide. L'objet est mémoïsé, donc stable entre deux rendus.
 */
export interface ItemEvents {
  /** Faux quand un outil de pose est armé : les éléments laissent passer les clics au plan. */
  interactive: boolean;
  registerNode: (key: string, node: Konva.Group | null) => void;
  onItemClick: (ref: ItemRef, e: Konva.KonvaEventObject<Event>) => void;
  onItemDragStart: (ref: ItemRef, e: Konva.KonvaEventObject<DragEvent>) => void;
  onItemDragMove: (ref: ItemRef, e: Konva.KonvaEventObject<DragEvent>) => void;
  onItemDragEnd: (ref: ItemRef, e: Konva.KonvaEventObject<DragEvent>) => void;
}

export const itemKey = (ref: ItemRef): string => `${ref.kind}:${ref.id}`;

export const setCursor = (e: Konva.KonvaEventObject<Event>, cursor: string): void => {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
};

export const SELECTION_COLOR = '#6366F1';
export const OVERLAP_COLOR = '#EF4444';
