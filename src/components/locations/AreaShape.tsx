import { memo, useMemo } from 'react';
import { Group, Line, Text } from 'react-konva';
import type { Area } from '@/lib/floorplan/types';
import { SELECTION_COLOR } from './itemEvents';

interface AreaShapeProps {
  area: Area;
  isSelected: boolean;
  interactive?: boolean;
  onSelect: (areaId: string) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Zone-conteneur (polygone fermé), en unités virtuelles. Purement graphique :
 * elle n'est pas déplaçable, seuls son nom et ses couleurs sont éditables.
 */
function AreaShapeBase({ area, isSelected, interactive = true, onSelect }: AreaShapeProps) {
  const flattened = useMemo(() => area.points.flatMap(p => [p.x, p.y]), [area.points]);
  const label = area.points[0];

  return (
    <Group
      listening={interactive}
      onClick={() => onSelect(area.id)}
      onTap={() => onSelect(area.id)}
    >
      <Line
        points={flattened}
        closed
        fill={hexToRgba(area.color, 0.25)}
        stroke={isSelected ? SELECTION_COLOR : area.strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {label && (
        <Text
          x={label.x}
          y={label.y - 14}
          text={area.name}
          fontSize={10}
          fill={isSelected ? SELECTION_COLOR : '#475569'}
          fontStyle="italic"
          listening={false}
        />
      )}
    </Group>
  );
}

export const AreaShape = memo(AreaShapeBase);
