import { memo, useCallback, useMemo } from 'react';
import { Circle, Ellipse, Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { tableCenter } from '@/lib/floorplan/geometry';
import type { Location, TableAttributes } from '@/lib/floorplan/types';
import { getChairPositions } from '@/utils/chairPositions';
import { OVERLAP_COLOR, SELECTION_COLOR, itemKey, setCursor, type ItemEvents } from './itemEvents';

interface TableShapeProps {
  location: Location;
  isSelected: boolean;
  /** Chevauche une autre table : mise en évidence rouge. */
  isOverlapping?: boolean;
  /** Fantôme de pose : translucide, jamais interactif. */
  ghost?: boolean;
  events?: ItemEvents;
}

const STATUS_STYLES = {
  available: { fill: '#F1F5F9', stroke: '#CBD5E1', strokeWidth: 1.5 },
  reserved: { fill: '#EFF6FF', stroke: '#3B82F6', strokeWidth: 2 },
  occupied: { fill: '#FEF2F2', stroke: '#EF4444', strokeWidth: 2 }
} as const;

const OVERLAP_STYLE = { fill: '#FEE2E2', stroke: OVERLAP_COLOR, strokeWidth: 2 } as const;

const ATTRIBUTE_BADGE_COLORS: Record<keyof TableAttributes, string> = {
  pmr: '#0EA5E9',
  terrace: '#22C55E',
  vip: '#EAB308',
  window: '#A855F7'
};

const CHAIR_RADIUS = 6;
const BADGE_RADIUS = 2.5;
const BADGE_GAP = 2;

/**
 * Table vue de dessus, en unités virtuelles (le zoom est porté par la scène).
 * Le groupe est placé au CENTRE de la table pour que la rotation pivote
 * correctement ; `location.x/y` restent le coin haut-gauche. Le libellé est
 * contre-tourné pour rester lisible quel que soit l'angle.
 */
function TableShapeBase({ location, isSelected, isOverlapping = false, ghost = false, events }: TableShapeProps) {
  const { width, height, angle, shape, seats, location_id } = location;
  const center = tableCenter(location);
  const ref = useMemo(() => ({ kind: 'table' as const, id: location_id }), [location_id]);
  const interactive = !ghost && !!events?.interactive;
  const registerNode = events?.registerNode;

  const status = location.open_order_id != null ? 'occupied' : location.booking != null ? 'reserved' : 'available';
  const style = isOverlapping ? OVERLAP_STYLE : STATUS_STYLES[status];
  const stroke = isSelected ? SELECTION_COLOR : style.stroke;
  const strokeWidth = isSelected ? 2.5 : style.strokeWidth;

  const chairs = useMemo(() => (seats > 0 ? getChairPositions(shape, width, height, seats) : []), [shape, width, height, seats]);

  const badges = useMemo(
    () =>
      location.attributes
        ? (Object.keys(ATTRIBUTE_BADGE_COLORS) as (keyof TableAttributes)[]).filter(key => location.attributes?.[key])
        : [],
    [location.attributes]
  );
  const badgePitch = BADGE_RADIUS * 2 + BADGE_GAP;

  const setRef = useCallback(
    (node: Konva.Group | null) => registerNode?.(itemKey(ref), node),
    [registerNode, ref]
  );

  return (
    <Group
      ref={setRef}
      x={center.x}
      y={center.y}
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
      {/* Les chaises sont dessinées d'abord pour passer sous le plateau. */}
      {chairs.map((pos, i) => (
        <Rect
          key={i}
          x={pos.x - CHAIR_RADIUS}
          y={pos.y - CHAIR_RADIUS}
          width={CHAIR_RADIUS * 2}
          height={CHAIR_RADIUS * 2}
          cornerRadius={2}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}

      {shape === 'circle' || shape === 'oval' ? (
        <Ellipse radiusX={width / 2} radiusY={height / 2} fill={style.fill} stroke={stroke} strokeWidth={strokeWidth} />
      ) : (
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          cornerRadius={6}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {/* Libellé contre-tourné : toujours à l'endroit. */}
      <Group rotation={-angle} listening={false}>
        <Text
          text={location.location_name}
          fontSize={11}
          fontStyle="bold"
          fill="#1E293B"
          align="center"
          wrap="none"
          ellipsis
          width={Math.max(width, 40)}
          x={-Math.max(width, 40) / 2}
          y={-12}
        />
        {seats > 0 && (
          <Text
            text={`${seats} cvts`}
            fontSize={9}
            fill="#64748B"
            align="center"
            wrap="none"
            width={Math.max(width, 40)}
            x={-Math.max(width, 40) / 2}
            y={2}
          />
        )}
      </Group>

      {badges.map((key, i) => (
        <Circle
          key={key}
          x={width / 2 - BADGE_RADIUS - (badges.length - 1 - i) * badgePitch}
          y={-height / 2 - BADGE_RADIUS - BADGE_GAP}
          radius={BADGE_RADIUS}
          fill={ATTRIBUTE_BADGE_COLORS[key]}
          listening={false}
        />
      ))}
    </Group>
  );
}

export const TableShape = memo(TableShapeBase);
