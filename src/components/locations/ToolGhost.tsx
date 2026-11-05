import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { wallSegmentsFromPoints, type Point } from '@/lib/floorplan/geometry';
import { WALL_DEFAULT_THICKNESS } from '@/lib/floorplan/obstacleCatalog';
import { placeObstacleAt, placeTableAt, placeWallPoint, type Tool } from '@/lib/floorplan/tools';
import type { AreaPoint, Location, Obstacle } from '@/lib/floorplan/types';
import { SELECTION_COLOR } from './itemEvents';
import { ObstacleShape } from './ObstacleShape';
import { TableShape } from './TableShape';

interface ToolGhostProps {
  stageRef: RefObject<Konva.Stage>;
  tool: Tool;
  /** Murs de l'étage : les portes et fenêtres s'y accrochent. */
  walls: readonly Obstacle[];
  wallStart: Point | null;
  areaPoints: AreaPoint[];
  scale: number;
}

/**
 * Aperçu de ce que l'outil armé va poser, sous le curseur. S'abonne lui-même
 * aux mouvements de la souris : seul ce composant se re-rend quand le curseur
 * bouge, pas le plan entier.
 */
export function ToolGhost({ stageRef, tool, walls, wallStart, areaPoints, scale }: ToolGhostProps) {
  const [pointer, setPointer] = useState<Point | null>(null);
  const [shift, setShift] = useState(false);
  const active = tool.kind !== 'select';

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) {
      setPointer(null);
      return;
    }

    const move = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const p = stage.getRelativePointerPosition();
      setPointer(p ? { x: p.x, y: p.y } : null);
      setShift('shiftKey' in e.evt ? e.evt.shiftKey : false);
    };
    const leave = () => setPointer(null);

    stage.on('mousemove.ghost touchmove.ghost', move);
    stage.on('mouseleave.ghost', leave);
    return () => {
      stage.off('.ghost');
    };
  }, [stageRef, active]);

  const tableGhost = useMemo<Location | null>(() => {
    if (tool.kind !== 'table' || !pointer) return null;
    const { x, y } = placeTableAt(pointer, tool.width, tool.height);
    return {
      location_id: '__ghost__',
      location_name: tool.label,
      seats: tool.seats,
      floor_id: null,
      shape: tool.shape,
      angle: 0,
      x,
      y,
      width: tool.width,
      height: tool.height,
      enabled: true,
      attributes: null
    };
  }, [tool, pointer]);

  const obstacleGhost = useMemo<Obstacle | null>(() => {
    if (tool.kind !== 'obstacle' || !pointer) return null;
    const placement = placeObstacleAt(pointer, tool.type, walls);
    return {
      id: '__ghost__',
      floorId: '',
      type: tool.type,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      angle: placement.angle,
      ...(tool.type === 'door' ? { direction: 90 } : {})
    };
  }, [tool, pointer, walls]);

  if (!active || !pointer) return null;

  if (tableGhost) return <TableShape location={tableGhost} isSelected={false} ghost />;
  if (obstacleGhost) return <ObstacleShape obstacle={obstacleGhost} isSelected={false} ghost />;

  if (tool.kind === 'wall') {
    const end = placeWallPoint(pointer, wallStart, shift);
    const length = wallStart ? Math.round(Math.hypot(end.x - wallStart.x, end.y - wallStart.y)) : 0;
    const preview = wallStart ? wallSegmentsFromPoints(wallStart, end, WALL_DEFAULT_THICKNESS) : [];
    const dot = 4 / scale;

    return (
      <Group listening={false}>
        {wallStart && (
          <Line
            points={[wallStart.x, wallStart.y, end.x, end.y]}
            stroke="#475569"
            strokeWidth={WALL_DEFAULT_THICKNESS}
            opacity={preview.length ? 0.55 : 0.2}
            lineCap="butt"
          />
        )}
        {wallStart && <Circle x={wallStart.x} y={wallStart.y} radius={dot} fill={SELECTION_COLOR} />}
        <Circle x={end.x} y={end.y} radius={dot} fill="#fff" stroke={SELECTION_COLOR} strokeWidth={1.5 / scale} />
        {wallStart && length >= 10 && (
          <Text
            x={(wallStart.x + end.x) / 2 + 8 / scale}
            y={(wallStart.y + end.y) / 2 - 18 / scale}
            text={`${length}`}
            fontSize={12 / scale}
            fontStyle="bold"
            fill={SELECTION_COLOR}
          />
        )}
      </Group>
    );
  }

  if (tool.kind === 'area') {
    const next = placeWallPoint(pointer, null, false);
    const flat = areaPoints.flatMap(p => [p.x, p.y]);
    return (
      <Group listening={false}>
        {areaPoints.length >= 1 && (
          <Line
            points={[...flat, next.x, next.y]}
            stroke={SELECTION_COLOR}
            strokeWidth={1.5 / scale}
            dash={[6 / scale, 3 / scale]}
          />
        )}
        {areaPoints.map((p, i) => (
          <Circle
            key={i}
            x={p.x}
            y={p.y}
            radius={(i === 0 ? 6 : 4) / scale}
            fill={i === 0 ? SELECTION_COLOR : '#fff'}
            stroke={SELECTION_COLOR}
            strokeWidth={1.5 / scale}
          />
        ))}
        <Circle x={next.x} y={next.y} radius={4 / scale} fill="#fff" stroke={SELECTION_COLOR} strokeWidth={1.5 / scale} />
      </Group>
    );
  }

  return null;
}
