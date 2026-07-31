import { useRef } from 'react';
import { Circle, Ellipse, Rect, Group, Text } from 'react-konva';
import type { Location, LocationBooking, TableAttributes } from '@/services/locationsService';
import { getChairPositions } from '@/utils/chairPositions';
import { snapToGrid } from '@/hooks/useFloorPlan';

interface TableShapeProps {
  location: Location;
  isSelected: boolean;
  booking?: LocationBooking | null;
  onSelect: () => void;
  onDragMove: (x: number, y: number) => void;
  scaleRatio: number; // Pixels per canvas unit (1000x1000)
}

const STATUS_STYLES = {
  available: { fill: '#F1F5F9', stroke: '#CBD5E1', strokeWidth: 1.5 },
  reserved: { fill: '#EFF6FF', stroke: '#3B82F6', strokeWidth: 2 },
  occupied: { fill: '#FEF2F2', stroke: '#EF4444', strokeWidth: 2 }
} as const;

const SELECTED_STROKE = '#6366F1';
const SELECTED_STROKE_WIDTH = 2.5;

const ATTRIBUTE_BADGE_COLORS: Record<keyof TableAttributes, string> = {
  pmr: '#0EA5E9',
  terrace: '#22C55E',
  vip: '#EAB308',
  window: '#A855F7'
};

/**
 * Composant Konva pour afficher une table sur le canvas (rendu top-down)
 * Supporte les formes : circle, oval, square, rectangle
 * Gère la sélection et le drag & drop (drag seulement si sélectionné)
 */
export function TableShape({
  location,
  isSelected,
  booking = null,
  onSelect,
  onDragMove,
  scaleRatio
}: TableShapeProps) {
  const groupRef = useRef<any>(null);

  const widthPx = location.width * scaleRatio;
  const heightPx = location.height * scaleRatio;
  // The Group is positioned at the table's visual center so rotation pivots
  // correctly, while location.x/y keep meaning the top-left corner in
  // virtual canvas units (unchanged storage/clamp semantics).
  const centerX = location.x * scaleRatio + widthPx / 2;
  const centerY = location.y * scaleRatio + heightPx / 2;

  const status = location.open_order_id != null ? 'occupied' : booking != null ? 'reserved' : 'available';
  const statusStyle = STATUS_STYLES[status];

  const tableFill = statusStyle.fill;
  const tableStroke = isSelected ? SELECTED_STROKE : statusStyle.stroke;
  const strokeWidth = isSelected ? SELECTED_STROKE_WIDTH : statusStyle.strokeWidth;

  const chairRadius = Math.max(4, 6 * scaleRatio);
  const chairSize = chairRadius * 2;
  const chairCornerRadius = 2 * scaleRatio;
  const chairPositions = location.seats
    ? getChairPositions(location.shape, widthPx, heightPx, location.seats)
    : [];

  const activeAttributeKeys = location.attributes
    ? (Object.keys(ATTRIBUTE_BADGE_COLORS) as (keyof TableAttributes)[]).filter(
        key => location.attributes?.[key]
      )
    : [];
  const BADGE_RADIUS = 2.5;
  const BADGE_GAP = 2;
  const BADGE_PITCH = BADGE_RADIUS * 2 + BADGE_GAP;
  const badgeRightEdgeX = widthPx / 2 - BADGE_RADIUS;
  const badgeY = -heightPx / 2 - BADGE_RADIUS - BADGE_GAP;

  const handleDragMove = (e: any) => {
    if (!isSelected) return;

    const newX = (e.target.x() - widthPx / 2) / scaleRatio;
    const newY = (e.target.y() - heightPx / 2) / scaleRatio;

    onDragMove(newX, newY);
  };

  const handleDragBoundFunc = (pos: any) => {
    if (!isSelected) return pos;

    const rawX = (pos.x - widthPx / 2) / scaleRatio;
    const rawY = (pos.y - heightPx / 2) / scaleRatio;

    // Snap to grid then clamp to canvas boundaries.
    const clampedX = Math.max(0, Math.min(snapToGrid(rawX), 1000 - location.width));
    const clampedY = Math.max(0, Math.min(snapToGrid(rawY), 1000 - location.height));

    return {
      x: clampedX * scaleRatio + widthPx / 2,
      y: clampedY * scaleRatio + heightPx / 2
    };
  };

  const handleMouseEnter = () => {
    if (groupRef.current?.getStage()) {
      groupRef.current.getStage().container().style.cursor = isSelected ? 'grab' : 'pointer';
    }
  };

  const handleMouseLeave = () => {
    if (groupRef.current?.getStage()) {
      groupRef.current.getStage().container().style.cursor = 'default';
    }
  };

  const renderTableBody = () => {
    if (location.shape === 'circle' || location.shape === 'oval') {
      return (
        <Ellipse
          radiusX={widthPx / 2}
          radiusY={heightPx / 2}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    // square | rectangle | default
    return (
      <Rect
        x={-widthPx / 2}
        y={-heightPx / 2}
        width={widthPx}
        height={heightPx}
        cornerRadius={6}
        fill={tableFill}
        stroke={tableStroke}
        strokeWidth={strokeWidth}
      />
    );
  };

  return (
    <Group
      ref={groupRef}
      x={centerX}
      y={centerY}
      rotation={location.angle}
      offsetX={0}
      offsetY={0}
      draggable={isSelected}
      onDragMove={handleDragMove}
      dragBoundFunc={handleDragBoundFunc}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Chairs drawn first so they sit behind the table body */}
      {chairPositions.map((pos, i) => (
        <Rect
          key={i}
          x={pos.x - chairSize / 2}
          y={pos.y - chairSize / 2}
          width={chairSize}
          height={chairSize}
          cornerRadius={chairCornerRadius}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={strokeWidth}
        />
      ))}

      {renderTableBody()}

      <Text
        text={location.location_name}
        fontSize={11 * scaleRatio}
        fill="#1E293B"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        width={widthPx}
        height={heightPx / 2}
        x={-widthPx / 2}
        y={-heightPx / 2}
      />

      {location.seats > 0 && (
        <Text
          text={`${location.seats} cvts`}
          fontSize={9 * scaleRatio}
          fill="#64748B"
          align="center"
          width={widthPx}
          x={-widthPx / 2}
          y={2 * scaleRatio}
        />
      )}

      {activeAttributeKeys.length > 0 &&
        activeAttributeKeys.map((key, i) => (
          <Circle
            key={key}
            x={badgeRightEdgeX - (activeAttributeKeys.length - 1 - i) * BADGE_PITCH}
            y={badgeY}
            radius={BADGE_RADIUS}
            fill={ATTRIBUTE_BADGE_COLORS[key]}
          />
        ))}
    </Group>
  );
}
