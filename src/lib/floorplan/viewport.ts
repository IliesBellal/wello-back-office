/**
 * Vue (zoom + déplacement) du canvas. La scène reste exprimée en unités
 * virtuelles (0-1000) ; la vue la projette à l'écran : `écran = virtuel × scale + (x, y)`.
 */
import { CANVAS_SIZE } from '@/utils/floorPlanLayout';
import { clamp, type Point } from './geometry';

export interface View {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
export const ZOOM_STEP = 1.2;
const FIT_MARGIN = 24; // px laissés autour du plan à l'ajustement
const KEEP_VISIBLE = 80; // px du plan qui doivent rester visibles quand on le déplace

/** Vue qui fait tenir tout le plan dans le conteneur, centré. */
export function fitView(width: number, height: number, canvas: number = CANVAS_SIZE): View {
  const available = Math.max(1, Math.min(width, height) - FIT_MARGIN * 2);
  const scale = clamp(available / canvas, MIN_SCALE, MAX_SCALE);
  return { scale, x: (width - canvas * scale) / 2, y: (height - canvas * scale) / 2 };
}

/** Zoome d'un facteur autour d'un point écran : ce point reste fixe sous le curseur. */
export function zoomAt(view: View, pointer: Point, factor: number): View {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const ratio = scale / view.scale;
  return {
    scale,
    x: pointer.x - (pointer.x - view.x) * ratio,
    y: pointer.y - (pointer.y - view.y) * ratio
  };
}

/** Empêche de perdre le plan : au moins `KEEP_VISIBLE` px doivent rester dans le conteneur. */
export function clampView(view: View, width: number, height: number, canvas: number = CANVAS_SIZE): View {
  const size = canvas * view.scale;
  return {
    ...view,
    x: clamp(view.x, KEEP_VISIBLE - size, width - KEEP_VISIBLE),
    y: clamp(view.y, KEEP_VISIBLE - size, height - KEEP_VISIBLE)
  };
}

export const toVirtual = (view: View, screen: Point): Point => ({
  x: (screen.x - view.x) / view.scale,
  y: (screen.y - view.y) / view.scale
});

export const toScreen = (view: View, virtual: Point): Point => ({
  x: virtual.x * view.scale + view.x,
  y: virtual.y * view.scale + view.y
});

/** Centre de l'écran exprimé en unités virtuelles (où poser un élément « au milieu de ce que je vois »). */
export const viewCenter = (view: View, width: number, height: number): Point =>
  toVirtual(view, { x: width / 2, y: height / 2 });
