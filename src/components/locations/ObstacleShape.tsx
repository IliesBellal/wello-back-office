import { memo, useCallback, useMemo } from 'react';
import { Arc, Arrow, Circle, Ellipse, Group, Line, Rect } from 'react-konva';
import type Konva from 'konva';
import type { Obstacle } from '@/lib/floorplan/types';
import { SELECTION_COLOR, itemKey, setCursor, type ItemEvents } from './itemEvents';

interface ObstacleShapeProps {
  obstacle: Obstacle;
  isSelected: boolean;
  ghost?: boolean;
  events?: ItemEvents;
}

interface BodyProps {
  w: number; // longueur
  h: number; // épaisseur
  direction?: number;
}

// Chaque obstacle a son dessin, centré sur l'origine du groupe, vu de dessus.

function WallBody({ w, h }: BodyProps) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#475569" cornerRadius={Math.min(2, h / 2)} />
      <Rect
        x={-w / 2 + 2}
        y={-h / 2 + 2}
        width={Math.max(0, w - 4)}
        height={Math.max(0, h - 4)}
        fill="#64748B"
        cornerRadius={1}
      />
    </>
  );
}

function DoorBody({ w, h, direction }: BodyProps) {
  const open = Math.min(Math.max(direction ?? 90, 10), 180);
  const hinge = { x: -w / 2, y: 0 };
  const rad = (open * Math.PI) / 180;
  const tip = { x: hinge.x + w * Math.cos(rad), y: hinge.y - w * Math.sin(rad) };

  return (
    <>
      {/* Secteur balayé par le vantail à l'ouverture */}
      <Arc
        x={hinge.x}
        y={hinge.y}
        innerRadius={0}
        outerRadius={w}
        angle={open}
        rotation={-open}
        fill="rgba(99,102,241,0.08)"
        stroke="#94A3B8"
        strokeWidth={1}
        dash={[4, 3]}
        listening={false}
      />
      {/* Baie dans le mur */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#F1F5F9" stroke="#94A3B8" strokeWidth={1} />
      {/* Vantail ouvert, charnière à gauche */}
      <Line points={[hinge.x, hinge.y, tip.x, tip.y]} stroke="#475569" strokeWidth={2.5} lineCap="round" />
      <Circle x={hinge.x} y={hinge.y} radius={2.5} fill="#475569" />
    </>
  );
}

function WindowBody({ w, h }: BodyProps) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#F8FAFC" stroke="#475569" strokeWidth={1.2} />
      {/* Les deux vitrages et le meneau central */}
      <Line points={[-w / 2, -h / 6, w / 2, -h / 6]} stroke="#38BDF8" strokeWidth={1.5} />
      <Line points={[-w / 2, h / 6, w / 2, h / 6]} stroke="#38BDF8" strokeWidth={1.5} />
      <Line points={[0, -h / 2, 0, h / 2]} stroke="#475569" strokeWidth={1} />
    </>
  );
}

function StairsBody({ w, h }: BodyProps) {
  const steps = Math.max(3, Math.floor(h / 14));
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#F1F5F9" stroke="#94A3B8" strokeWidth={1.2} />
      {Array.from({ length: steps - 1 }, (_, i) => {
        const y = -h / 2 + ((i + 1) * h) / steps;
        return <Line key={i} points={[-w / 2, y, w / 2, y]} stroke="#94A3B8" strokeWidth={1} />;
      })}
      {/* Sens de la montée */}
      <Arrow
        points={[0, h / 2 - 8, 0, -h / 2 + 10]}
        stroke="#475569"
        fill="#475569"
        strokeWidth={1.5}
        pointerLength={8}
        pointerWidth={8}
      />
    </>
  );
}

const LEAF_ANGLES = [0, 60, 120, 180, 240, 300];

function PlantBody({ w, h }: BodyProps) {
  const d = Math.min(w, h);
  return (
    <>
      {/* Pot */}
      <Ellipse radiusX={w / 2} radiusY={h / 2} fill="#E7D5B5" stroke="#A16207" strokeWidth={1} />
      {/* Feuillage : six feuilles autour du cœur */}
      {LEAF_ANGLES.map((deg, i) => (
        <Ellipse
          key={deg}
          x={Math.cos((deg * Math.PI) / 180) * d * 0.2}
          y={Math.sin((deg * Math.PI) / 180) * d * 0.2}
          radiusX={d * 0.27}
          radiusY={d * 0.12}
          rotation={deg}
          fill={i % 2 ? '#4ADE80' : '#22C55E'}
          stroke="#15803D"
          strokeWidth={0.8}
        />
      ))}
      <Circle radius={d * 0.08} fill="#166534" />
    </>
  );
}

function BarBody({ w, h }: BodyProps) {
  const stools = Math.max(0, Math.floor(w / 40));
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#B45309" stroke="#78350F" strokeWidth={1.2} cornerRadius={4} />
      <Rect
        x={-w / 2 + 4}
        y={-h / 2 + 4}
        width={Math.max(0, w - 8)}
        height={Math.max(0, h - 8)}
        fill="#D97706"
        opacity={0.55}
        stroke="#92400E"
        strokeWidth={1}
        dash={[6, 4]}
        cornerRadius={2}
      />
      {/* Tabourets côté client */}
      {Array.from({ length: stools }, (_, i) => (
        <Circle
          key={i}
          x={-w / 2 + ((i + 0.5) * w) / stools}
          y={h / 2 + 10}
          radius={7}
          fill="#E2E8F0"
          stroke="#94A3B8"
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function PillarBody({ w, h }: BodyProps) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#94A3B8" stroke="#475569" strokeWidth={1.5} />
      <Line points={[-w / 2, -h / 2, w / 2, h / 2]} stroke="#475569" strokeWidth={1} />
      <Line points={[-w / 2, h / 2, w / 2, -h / 2]} stroke="#475569" strokeWidth={1} />
    </>
  );
}

const BODIES: Record<Obstacle['type'], (props: BodyProps) => JSX.Element> = {
  wall: WallBody,
  door: DoorBody,
  window: WindowBody,
  stairs: StairsBody,
  plant: PlantBody,
  bar: BarBody,
  pillar: PillarBody
};

/** Zone cliquable minimale : un mur de 12 unités de large serait sinon presque impossible à saisir. */
const HIT_PADDING = 6;

/**
 * Obstacle du plan, en unités virtuelles. Le groupe est placé au CENTRE de
 * l'obstacle (`x`/`y`), comme le stocke l'API, et pivote autour de lui.
 */
function ObstacleShapeBase({ obstacle, isSelected, ghost = false, events }: ObstacleShapeProps) {
  const { id, type, x, y, width, height, angle, direction } = obstacle;
  const ref = useMemo(() => ({ kind: 'obstacle' as const, id }), [id]);
  const interactive = !ghost && !!events?.interactive;
  const registerNode = events?.registerNode;
  const Body = BODIES[type];

  const setRef = useCallback(
    (node: Konva.Group | null) => registerNode?.(itemKey(ref), node),
    [registerNode, ref]
  );

  return (
    <Group
      ref={setRef}
      x={x}
      y={y}
      rotation={angle}
      opacity={ghost ? 0.55 : 1}
      listening={!ghost && interactive}
      draggable={interactive}
      onClick={e => events?.onItemClick(ref, e)}
      onTap={e => events?.onItemClick(ref, e)}
      onDragStart={e => events?.onItemDragStart(ref, e)}
      onDragMove={e => events?.onItemDragMove(ref, e)}
      onDragEnd={e => events?.onItemDragEnd(ref, e)}
      onMouseEnter={e => interactive && setCursor(e, 'move')}
      onMouseLeave={e => interactive && setCursor(e, '')}
    >
      <Rect
        x={-width / 2 - HIT_PADDING}
        y={-height / 2 - HIT_PADDING}
        width={width + HIT_PADDING * 2}
        height={height + HIT_PADDING * 2}
        fill="transparent"
      />
      <Body w={width} h={height} direction={direction} />
      {isSelected && (
        <Rect
          x={-width / 2 - 2}
          y={-height / 2 - 2}
          width={width + 4}
          height={height + 4}
          stroke={SELECTION_COLOR}
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}
    </Group>
  );
}

export const ObstacleShape = memo(ObstacleShapeBase);
