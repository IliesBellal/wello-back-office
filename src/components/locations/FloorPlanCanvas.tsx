import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Layer, Rect, Shape, Stage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CANVAS_SIZE, GRID_SIZE, type Rect as Box } from '@/utils/floorPlanLayout';
import {
  clamp,
  itemsInRect,
  rotatedBounds,
  snap,
  snapToWall,
  tableCenter,
  wallSegmentsFromPoints,
  type Point,
  type WallSnap,
  type WallSegment
} from '@/lib/floorplan/geometry';
import { WALL_DEFAULT_THICKNESS, getObstacleDefinition } from '@/lib/floorplan/obstacleCatalog';
import type { ItemChange } from '@/lib/floorplan/reducer';
import {
  placeObstacleAt,
  placeTableAt,
  placeWallPoint,
  SELECT_TOOL,
  type ObstaclePlacement,
  type Tool
} from '@/lib/floorplan/tools';
import { sameRef, type Area, type AreaPoint, type ItemRef, type Location, type Obstacle } from '@/lib/floorplan/types';
import { clampView, fitView, zoomAt, type View } from '@/lib/floorplan/viewport';
import { SELECTION_COLOR, itemKey, type ItemEvents } from './itemEvents';
import { AreaShape } from './AreaShape';
import { ObstacleShape } from './ObstacleShape';
import { TableShape } from './TableShape';
import { ToolGhost } from './ToolGhost';

export interface FloorPlanCanvasProps {
  floorId: string | null;
  /** Éléments de l'étage actif uniquement. */
  locations: Location[];
  obstacles: Obstacle[];
  areas: Area[];
  selection: ItemRef[];
  overlapping: ReadonlySet<string>;
  tool: Tool;
  isLoading?: boolean;
  onSelect: (refs: ItemRef[], mode: 'replace' | 'toggle' | 'add') => void;
  onUpdate: (changes: ItemChange[], coalesceKey?: string) => void;
  onToolChange: (tool: Tool) => void;
  onPlaceTable: (tool: Extract<Tool, { kind: 'table' }>, topLeft: Point) => void;
  onPlaceObstacle: (type: Exclude<Obstacle['type'], 'wall'>, placement: ObstaclePlacement) => void;
  onAddWalls: (segments: WallSegment[]) => void;
  onFinishArea: (points: AreaPoint[]) => void;
}

export interface FloorPlanCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15);
const DRAG_THRESHOLD = 4; // px avant qu'un appui devienne un glisser
const TAP_THEN_CLICK_WINDOW = 700; // ms : un « click » émulé juste après un « tap » est ignoré
// Double-clic (fin d'un mur / fermeture d'une zone) : deux clics rapprochés dans le temps ET dans l'espace.
// Le `dblclick` de Konva ne regarde que le temps : deux points posés vite à deux endroits seraient pris pour un double-clic.
const DOUBLE_CLICK_MS = 350;
const DOUBLE_CLICK_PX = 8;

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

const normalizedBox = (a: Point, b: Point): Box => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y)
});

const touchDistance = (touches: TouchList): number =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

const touchCenter = (touches: TouchList): Point => ({
  x: (touches[0].clientX + touches[1].clientX) / 2,
  y: (touches[0].clientY + touches[1].clientY) / 2
});

interface DragState {
  leader: ItemRef;
  refs: ItemRef[];
  origins: Map<string, Point>;
  leaderOrigin: Point;
  leaderRotation: number;
  minDx: number;
  maxDx: number;
  minDy: number;
  maxDy: number;
  wallSnap: WallSnap | null;
}

function GridLines({ scale }: { scale: number }) {
  return (
    <Shape
      listening={false}
      sceneFunc={context => {
        const line = 1 / scale; // toujours 1 px à l'écran
        context.setAttr('lineWidth', line);

        context.beginPath();
        for (let i = GRID_SIZE; i < CANVAS_SIZE; i += GRID_SIZE) {
          if (i % 100 === 0) continue;
          context.moveTo(i, 0);
          context.lineTo(i, CANVAS_SIZE);
          context.moveTo(0, i);
          context.lineTo(CANVAS_SIZE, i);
        }
        context.setAttr('strokeStyle', '#F1F5F9');
        context.stroke();

        context.beginPath();
        for (let i = 100; i < CANVAS_SIZE; i += 100) {
          context.moveTo(i, 0);
          context.lineTo(i, CANVAS_SIZE);
          context.moveTo(0, i);
          context.lineTo(CANVAS_SIZE, i);
        }
        context.setAttr('strokeStyle', '#E2E8F0');
        context.stroke();
      }}
    />
  );
}

/**
 * Canvas Konva du plan de salle. La scène est exprimée en unités virtuelles
 * (0-1000) ; zoom et déplacement sont portés par la transformation du Stage.
 */
export const FloorPlanCanvas = forwardRef<FloorPlanCanvasHandle, FloorPlanCanvasProps>(function FloorPlanCanvas(
  props,
  handleRef
) {
  const { floorId, locations, obstacles, areas, selection, overlapping, tool, isLoading = false } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Group>());

  // Les gestes lisent toujours les dernières props sans changer d'identité.
  const latest = useRef(props);
  latest.current = props;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const userMoved = useRef(false); // faux : le plan est recadré automatiquement au redimensionnement

  const [marquee, setMarquee] = useState<Box | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const spaceRef = useRef(false);

  const [wallStart, setWallStartState] = useState<Point | null>(null);
  const wallStartRef = useRef<Point | null>(null);
  const setWallStart = useCallback((point: Point | null) => {
    wallStartRef.current = point;
    setWallStartState(point);
  }, []);
  const [areaPoints, setAreaPointsState] = useState<AreaPoint[]>([]);
  const areaPointsRef = useRef<AreaPoint[]>([]);
  const setAreaPoints = useCallback((points: AreaPoint[]) => {
    areaPointsRef.current = points;
    setAreaPointsState(points);
  }, []);

  // Gestes en cours
  const panGesture = useRef<{ x: number; y: number; view: View } | null>(null);
  const marqueeGesture = useRef<{ start: Point; additive: boolean; clientX: number; clientY: number; moved: boolean } | null>(null);
  const pinchGesture = useRef<{ distance: number; center: Point; view: View } | null>(null);
  const touchPan = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const dragState = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const lastTapAt = useRef(0);
  const lastClick = useRef<{ time: number; x: number; y: number } | null>(null);

  // --- Vue -------------------------------------------------------------------------------

  const applyView = useCallback((next: View, userInitiated = true) => {
    if (userInitiated) userMoved.current = true;
    setView(clampView(next, sizeRef.current.width, sizeRef.current.height));
  }, []);

  const fit = useCallback(() => {
    userMoved.current = false;
    const { width, height } = sizeRef.current;
    if (width > 0 && height > 0) setView(fitView(width, height));
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const { width, height } = sizeRef.current;
      applyView(zoomAt(viewRef.current, { x: width / 2, y: height / 2 }, factor));
    },
    [applyView]
  );

  useImperativeHandle(handleRef, () => ({ zoomIn: () => zoomBy(1.2), zoomOut: () => zoomBy(1 / 1.2), fit }), [zoomBy, fit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recadrage automatique tant que l'utilisateur n'a pas touché à la vue, et à chaque changement d'étage.
  useEffect(() => {
    if (size.width > 0 && !userMoved.current) setView(fitView(size.width, size.height));
  }, [size]);

  useEffect(() => {
    userMoved.current = false;
    const { width, height } = sizeRef.current;
    if (width > 0) setView(fitView(width, height));
  }, [floorId]);

  // Molette : zoom autour du curseur. Listener natif non passif pour bloquer le défilement de la page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      applyView(zoomAt(viewRef.current, { x: e.clientX - rect.left, y: e.clientY - rect.top }, factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyView]);

  // --- Outils : état des tracés ---------------------------------------------------------------

  useEffect(() => {
    setWallStart(null);
    setAreaPoints([]);
  }, [tool.kind, floorId, setWallStart, setAreaPoints]);

  const endWall = useCallback(() => setWallStart(null), [setWallStart]);

  const finishArea = useCallback(() => {
    const points = areaPointsRef.current;
    if (points.length >= 3) latest.current.onFinishArea(points);
    setAreaPoints([]);
  }, [setAreaPoints]);

  // Clavier propre au canvas : Espace (déplacer), Entrée / Échap (tracés et outils).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceRef.current = true;
        setSpaceDown(true);
      } else if (e.key === 'Enter') {
        if (latest.current.tool.kind === 'wall') endWall();
        if (latest.current.tool.kind === 'area') finishArea();
      } else if (e.key === 'Escape') {
        if (wallStartRef.current || areaPointsRef.current.length > 0) {
          setWallStart(null);
          setAreaPoints([]);
        } else if (latest.current.tool.kind !== 'select') {
          latest.current.onToolChange(SELECT_TOOL);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [endWall, finishArea, setWallStart, setAreaPoints]);

  // --- Recherche d'éléments ------------------------------------------------------------------------

  const geometryOf = useCallback((ref: ItemRef) => {
    const { locations: tables, obstacles: walls } = latest.current;
    if (ref.kind === 'table') {
      const t = tables.find(l => l.location_id === ref.id);
      if (!t) return null;
      const c = tableCenter(t);
      return { w: t.width, h: t.height, angle: t.angle, cx: c.x, cy: c.y, table: t, obstacle: null };
    }
    if (ref.kind === 'obstacle') {
      const o = walls.find(x => x.id === ref.id);
      if (!o) return null;
      return { w: o.width, h: o.height, angle: o.angle, cx: o.x, cy: o.y, table: null, obstacle: o };
    }
    return null;
  }, []);

  // --- Gestes sur les éléments --------------------------------------------------------------------------

  const registerNode = useCallback((key: string, node: Konva.Group | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  }, []);

  const onItemClick = useCallback((ref: ItemRef, e: Konva.KonvaEventObject<Event>) => {
    if (latest.current.tool.kind !== 'select') return;
    const evt = e.evt as Partial<MouseEvent>; // un tap tactile n'a ni bouton ni modificateurs
    if (evt.button !== undefined && evt.button !== 0) return;
    e.cancelBubble = true;
    const additive = !!(evt.shiftKey || evt.ctrlKey || evt.metaKey);
    latest.current.onSelect([ref], additive ? 'toggle' : 'replace');
  }, []);

  const onItemDragStart = useCallback(
    (ref: ItemRef, e: Konva.KonvaEventObject<DragEvent>) => {
      void e;
      const { selection: current, onSelect } = latest.current;
      const inSelection = current.some(s => sameRef(s, ref));
      const refs = inSelection ? current.filter(r => r.kind !== 'area') : [ref];
      if (!inSelection) onSelect([ref], 'replace');

      const origins = new Map<string, Point>();
      let minDx = -Infinity;
      let maxDx = Infinity;
      let minDy = -Infinity;
      let maxDy = Infinity;
      for (const r of refs) {
        const node = nodes.current.get(itemKey(r));
        const geo = geometryOf(r);
        if (!node || !geo) continue;
        origins.set(itemKey(r), node.position());
        const bounds = rotatedBounds(node.x(), node.y(), geo.w, geo.h, geo.angle);
        minDx = Math.max(minDx, -bounds.x);
        maxDx = Math.min(maxDx, CANVAS_SIZE - (bounds.x + bounds.width));
        minDy = Math.max(minDy, -bounds.y);
        maxDy = Math.min(maxDy, CANVAS_SIZE - (bounds.y + bounds.height));
      }

      const leaderNode = nodes.current.get(itemKey(ref));
      if (!leaderNode) return;
      dragState.current = {
        leader: ref,
        refs,
        origins,
        leaderOrigin: leaderNode.position(),
        leaderRotation: leaderNode.rotation(),
        minDx,
        maxDx,
        minDy,
        maxDy,
        wallSnap: null
      };
    },
    [geometryOf]
  );

  const onItemDragMove = useCallback(
    (_ref: ItemRef, e: Konva.KonvaEventObject<DragEvent>) => {
      const state = dragState.current;
      if (!state) return;
      const leaderNode = nodes.current.get(itemKey(state.leader));
      const geo = geometryOf(state.leader);
      if (!leaderNode || !geo) return;

      let pos = leaderNode.position();
      state.wallSnap = null;

      if (!e.evt.altKey) {
        if (geo.table) {
          // Les tables se calent sur la grille par leur coin haut-gauche.
          pos = { x: snap(pos.x - geo.w / 2) + geo.w / 2, y: snap(pos.y - geo.h / 2) + geo.h / 2 };
        } else if (geo.obstacle) {
          const definition = getObstacleDefinition(geo.obstacle.type);
          if (definition.snapsToWall && state.refs.length === 1) {
            const others = latest.current.obstacles.filter(o => o.id !== geo.obstacle!.id);
            state.wallSnap = snapToWall(pos, others, { halfLength: geo.w / 2 });
          }
          pos = state.wallSnap
            ? { x: state.wallSnap.x, y: state.wallSnap.y }
            : { x: snap(pos.x, GRID_SIZE / 2), y: snap(pos.y, GRID_SIZE / 2) };
        }
      }

      const dx = clamp(pos.x - state.leaderOrigin.x, state.minDx, state.maxDx);
      const dy = clamp(pos.y - state.leaderOrigin.y, state.minDy, state.maxDy);

      for (const r of state.refs) {
        const origin = state.origins.get(itemKey(r));
        const node = nodes.current.get(itemKey(r));
        if (origin && node) node.position({ x: origin.x + dx, y: origin.y + dy });
      }

      // Une porte ou une fenêtre prend l'orientation du mur qui la porte, et la reperd en le quittant.
      if (geo.obstacle && getObstacleDefinition(geo.obstacle.type).snapsToWall) {
        leaderNode.rotation(state.wallSnap ? state.wallSnap.angle : state.leaderRotation);
      }
    },
    [geometryOf]
  );

  const onItemDragEnd = useCallback(
    (_ref: ItemRef, _e: Konva.KonvaEventObject<DragEvent>) => {
      const state = dragState.current;
      dragState.current = null;
      if (!state) return;

      const changes: ItemChange[] = [];
      for (const r of state.refs) {
        const node = nodes.current.get(itemKey(r));
        const geo = geometryOf(r);
        if (!node || !geo) continue;
        const pos = node.position();
        if (r.kind === 'table') {
          changes.push({ ref: { kind: 'table', id: r.id }, patch: { x: pos.x - geo.w / 2, y: pos.y - geo.h / 2 } });
        } else if (r.kind === 'obstacle') {
          const onWall = sameRef(r, state.leader) && state.wallSnap;
          changes.push({
            ref: { kind: 'obstacle', id: r.id },
            patch: {
              x: pos.x,
              y: pos.y,
              ...(onWall ? { angle: state.wallSnap!.angle, height: state.wallSnap!.thickness } : {})
            }
          });
        }
      }
      if (changes.length > 0) latest.current.onUpdate(changes);
    },
    [geometryOf]
  );

  const events = useMemo<ItemEvents>(
    () => ({ interactive: tool.kind === 'select', registerNode, onItemClick, onItemDragStart, onItemDragMove, onItemDragEnd }),
    [tool.kind, registerNode, onItemClick, onItemDragStart, onItemDragMove, onItemDragEnd]
  );

  // --- Poignées de redimensionnement / rotation ---------------------------------------------------------

  const singleRef = tool.kind === 'select' && selection.length === 1 && selection[0].kind !== 'area' ? selection[0] : null;
  const singleGeo = singleRef ? geometryOf(singleRef) : null;
  const keepRatio = singleGeo
    ? singleGeo.table
      ? singleGeo.table.shape === 'circle' || singleGeo.table.shape === 'square'
      : getObstacleDefinition(singleGeo.obstacle!.type).keepRatio
    : false;

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = singleRef ? nodes.current.get(itemKey(singleRef)) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [singleRef, locations, obstacles]);

  const handleTransformEnd = useCallback(() => {
    const node = transformerRef.current?.nodes()[0];
    const ref = singleRef;
    if (!node || !ref) return;
    const geo = geometryOf(ref);
    if (!geo) return;

    const width = geo.w * Math.abs(node.scaleX());
    const height = geo.h * Math.abs(node.scaleY());
    const center = node.position();
    const angle = node.rotation();
    node.scale({ x: 1, y: 1 });

    if (ref.kind === 'table') {
      latest.current.onUpdate([
        { ref: { kind: 'table', id: ref.id }, patch: { x: center.x - width / 2, y: center.y - height / 2, width, height, angle } }
      ]);
    } else {
      latest.current.onUpdate([{ ref: { kind: 'obstacle', id: ref.id }, patch: { x: center.x, y: center.y, width, height, angle } }]);
    }
  }, [singleRef, geometryOf]);

  // --- Gestes sur le plan : déplacement, sélection au rectangle, pose ---------------------------------------

  const isBackground = (target: Konva.Node): boolean => {
    const stage = stageRef.current;
    return target === stage || target.name() === 'background';
  };

  const place = useCallback(
    (pointer: Point, constrain: boolean) => {
      const { tool: current, obstacles: walls } = latest.current;
      switch (current.kind) {
        case 'table':
          latest.current.onPlaceTable(current, placeTableAt(pointer, current.width, current.height));
          break;
        case 'obstacle':
          latest.current.onPlaceObstacle(current.type, placeObstacleAt(pointer, current.type, walls));
          break;
        case 'wall': {
          const point = placeWallPoint(pointer, wallStartRef.current, constrain);
          const start = wallStartRef.current;
          if (!start) {
            setWallStart(point);
          } else {
            const segments = wallSegmentsFromPoints(start, point, WALL_DEFAULT_THICKNESS);
            if (segments.length > 0) {
              latest.current.onAddWalls(segments);
              setWallStart(point); // le tracé continue depuis ce point
            }
          }
          break;
        }
        case 'area': {
          const point = placeWallPoint(pointer, null, false);
          const points = areaPointsRef.current;
          const first = points[0];
          const last = points[points.length - 1];
          if (first && points.length >= 3 && Math.hypot(point.x - first.x, point.y - first.y) < 14 / viewRef.current.scale) {
            finishArea();
          } else if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 1) {
            setAreaPoints([...points, point]);
          }
          break;
        }
        default:
          break;
      }
    },
    [finishArea, setAreaPoints, setWallStart]
  );

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    suppressClick.current = false;

    if (evt.button === 1 || (evt.button === 0 && spaceRef.current)) {
      evt.preventDefault();
      panGesture.current = { x: evt.clientX, y: evt.clientY, view: viewRef.current };
      setIsPanning(true);
      return;
    }
    if (evt.button !== 0 || latest.current.tool.kind !== 'select' || !isBackground(e.target)) return;

    const start = stageRef.current?.getRelativePointerPosition();
    if (!start) return;
    marqueeGesture.current = {
      start: { x: start.x, y: start.y },
      additive: evt.shiftKey || evt.ctrlKey || evt.metaKey,
      clientX: evt.clientX,
      clientY: evt.clientY,
      moved: false
    };
  };

  // Le déplacement et le relâchement se suivent sur `window` : le geste continue hors du canvas.
  useEffect(() => {
    const pointerOnStage = (e: MouseEvent): Point | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      stage.setPointersPositions(e);
      const p = stage.getRelativePointerPosition();
      return p ? { x: p.x, y: p.y } : null;
    };

    const move = (e: MouseEvent) => {
      const pan = panGesture.current;
      if (pan) {
        suppressClick.current = true;
        applyView({ ...pan.view, x: pan.view.x + e.clientX - pan.x, y: pan.view.y + e.clientY - pan.y });
        return;
      }
      const gesture = marqueeGesture.current;
      if (!gesture) return;
      if (!gesture.moved && Math.hypot(e.clientX - gesture.clientX, e.clientY - gesture.clientY) < DRAG_THRESHOLD) return;
      gesture.moved = true;
      suppressClick.current = true;
      const p = pointerOnStage(e);
      if (p) setMarquee(normalizedBox(gesture.start, p));
    };

    const up = (e: MouseEvent) => {
      if (panGesture.current) {
        panGesture.current = null;
        setIsPanning(false);
        return;
      }
      const gesture = marqueeGesture.current;
      if (!gesture) return;
      marqueeGesture.current = null;
      setMarquee(null);

      const { onSelect, locations: tables, obstacles: walls, floorId: current } = latest.current;
      if (!gesture.moved) {
        if (!gesture.additive) onSelect([], 'replace');
        return;
      }
      const end = pointerOnStage(e);
      if (!end || !current) return;
      const refs = itemsInRect(
        normalizedBox(gesture.start, end),
        { floors: [], locations: tables, obstacles: walls, areas: [] },
        current
      );
      onSelect(refs, gesture.additive ? 'add' : 'replace');
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [applyView]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isTap = e.type === 'tap';
    if (isTap) lastTapAt.current = Date.now();
    else {
      if ('button' in e.evt && e.evt.button !== 0) return;
      if (Date.now() - lastTapAt.current < TAP_THEN_CLICK_WINDOW) return; // click émulé après un tap
    }
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }

    const { tool: current, onSelect } = latest.current;
    if (current.kind === 'select') {
      if (isTap && isBackground(e.target)) onSelect([], 'replace');
      return;
    }

    // Un double-clic termine le tracé en cours : le point a déjà été posé par le premier clic.
    if (current.kind === 'wall' || current.kind === 'area') {
      const screen = stageRef.current?.getPointerPosition();
      const previous = lastClick.current;
      lastClick.current = screen ? { time: Date.now(), x: screen.x, y: screen.y } : null;
      if (
        screen &&
        previous &&
        Date.now() - previous.time < DOUBLE_CLICK_MS &&
        Math.hypot(screen.x - previous.x, screen.y - previous.y) < DOUBLE_CLICK_PX
      ) {
        lastClick.current = null;
        if (current.kind === 'wall') endWall();
        else finishArea();
        return;
      }
    }

    const pointer = stageRef.current?.getRelativePointerPosition();
    if (pointer) place({ x: pointer.x, y: pointer.y }, 'shiftKey' in e.evt && e.evt.shiftKey);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (latest.current.tool.kind !== 'select') latest.current.onToolChange(SELECT_TOOL);
  };

  // Tactile : un doigt sur le fond déplace, deux doigts zooment et déplacent.
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      pinchGesture.current = { distance: touchDistance(touches), center: touchCenter(touches), view: viewRef.current };
      touchPan.current = null;
      suppressClick.current = true;
    } else if (touches.length === 1 && isBackground(e.target)) {
      suppressClick.current = false;
      touchPan.current = { x: touches[0].clientX, y: touches[0].clientY, view: viewRef.current, moved: false };
    }
  };

  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pinch = pinchGesture.current;
    if (pinch && touches.length === 2) {
      e.evt.preventDefault();
      const center = touchCenter(touches);
      const anchor = { x: pinch.center.x - rect.left, y: pinch.center.y - rect.top };
      const zoomed = zoomAt(pinch.view, anchor, touchDistance(touches) / pinch.distance);
      applyView({ ...zoomed, x: zoomed.x + (center.x - pinch.center.x), y: zoomed.y + (center.y - pinch.center.y) });
      return;
    }

    const pan = touchPan.current;
    if (pan && touches.length === 1) {
      const dx = touches[0].clientX - pan.x;
      const dy = touches[0].clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 6) return;
      pan.moved = true;
      suppressClick.current = true;
      e.evt.preventDefault();
      applyView({ ...pan.view, x: pan.view.x + dx, y: pan.view.y + dy });
    }
  };

  const handleTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length === 0) {
      pinchGesture.current = null;
      touchPan.current = null;
    } else if (e.evt.touches.length === 1) {
      pinchGesture.current = null;
      touchPan.current = null;
    }
  };

  // --- Rendu ----------------------------------------------------------------------------------------------------

  const selectedKeys = useMemo(() => new Set(selection.map(itemKey)), [selection]);
  const walls = useMemo(() => obstacles.filter(o => o.type === 'wall'), [obstacles]);
  const percent = Math.round(view.scale * 100);

  const hint = (() => {
    switch (tool.kind) {
      case 'table':
        return `Cliquez pour poser « ${tool.label} » · Échap pour terminer`;
      case 'obstacle':
        return `${getObstacleDefinition(tool.type).label} : cliquez pour poser · Échap pour terminer`;
      case 'wall':
        return wallStart
          ? 'Cliquez pour le point suivant · Double-clic ou Entrée pour finir · Maj : angle 15°'
          : 'Cliquez pour poser le début du mur · Échap pour terminer';
      case 'area':
        return 'Cliquez pour poser les points · Double-clic pour fermer la zone';
      default:
        return null;
    }
  })();

  const cursor = isPanning ? 'grabbing' : spaceDown ? 'grab' : tool.kind === 'select' ? undefined : 'crosshair';

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Plan de salle"
      className="relative h-full w-full touch-none select-none overflow-hidden bg-slate-100 dark:bg-slate-900"
      style={{ minHeight: 360, cursor }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          onMouseDown={handleMouseDown}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            <Rect
              name="background"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth={1 / view.scale}
            />
            <GridLines scale={view.scale} />

            {areas.map(area => (
              <AreaShape
                key={area.id}
                area={area}
                isSelected={selectedKeys.has(itemKey({ kind: 'area', id: area.id }))}
                interactive={tool.kind === 'select'}
                onSelect={id => latest.current.onSelect([{ kind: 'area', id }], 'replace')}
              />
            ))}

            {obstacles.map(obstacle => (
              <ObstacleShape
                key={obstacle.id}
                obstacle={obstacle}
                isSelected={selectedKeys.has(itemKey({ kind: 'obstacle', id: obstacle.id }))}
                events={events}
              />
            ))}

            {locations.map(location => (
              <TableShape
                key={location.location_id}
                location={location}
                isSelected={selectedKeys.has(itemKey({ kind: 'table', id: location.location_id }))}
                isOverlapping={overlapping.has(location.location_id)}
                events={events}
              />
            ))}
          </Layer>

          <Layer>
            {marquee && (
              <Rect
                x={marquee.x}
                y={marquee.y}
                width={marquee.width}
                height={marquee.height}
                fill="rgba(99,102,241,0.10)"
                stroke={SELECTION_COLOR}
                strokeWidth={1 / view.scale}
                dash={[4 / view.scale, 3 / view.scale]}
                listening={false}
              />
            )}

            <Transformer
              ref={transformerRef}
              rotateEnabled
              flipEnabled={false}
              ignoreStroke
              keepRatio={keepRatio}
              enabledAnchors={
                keepRatio
                  ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                  : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']
              }
              rotationSnaps={ROTATION_SNAPS}
              rotationSnapTolerance={4}
              anchorSize={9}
              anchorCornerRadius={2}
              anchorStroke={SELECTION_COLOR}
              anchorFill="#FFFFFF"
              borderStroke={SELECTION_COLOR}
              borderDash={[4, 3]}
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12 ? oldBox : newBox)}
              onTransformEnd={handleTransformEnd}
            />

            <ToolGhost
              stageRef={stageRef}
              tool={tool}
              walls={walls}
              wallStart={wallStart}
              areaPoints={areaPoints}
              scale={view.scale}
            />
          </Layer>
        </Stage>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-sm text-muted-foreground">
          Chargement du plan...
        </div>
      )}

      {hint && (
        <button
          type="button"
          onClick={() => props.onToolChange(SELECT_TOOL)}
          title="Annuler la pose (Échap)"
          aria-label={`${hint} — cliquer pour annuler la pose`}
          className="absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 text-left text-base font-medium text-foreground shadow-lg transition-colors hover:bg-muted"
        >
          <span>{hint}</span>
          <X className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-md">
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => zoomBy(1 / 1.2)} aria-label="Dézoomer" title="Dézoomer (−)">
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-xs font-medium tabular-nums text-foreground">{percent} %</span>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => zoomBy(1.2)} aria-label="Zoomer" title="Zoomer (+)">
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={fit} aria-label="Ajuster à l'écran" title="Ajuster à l'écran (0)">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
