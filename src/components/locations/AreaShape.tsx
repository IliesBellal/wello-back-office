import { Group, Line, Text } from 'react-konva';
import type { Area } from '@/services/locationsService';

interface AreaShapeProps {
  area: Area;
  isSelected: boolean;
  onSelect: () => void;
  scaleRatio: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Composant Konva pour afficher une zone-conteneur (polygone fermé) sur le canvas
 * Lecture seule géométriquement : pas de drag, seuls le nom et les couleurs sont éditables
 */
export function AreaShape({ area, isSelected, onSelect, scaleRatio }: AreaShapeProps) {
  const scaledPoints = area.points.map(p => ({ x: p.x * scaleRatio, y: p.y * scaleRatio }));
  const flattenedPoints = scaledPoints.flatMap(p => [p.x, p.y]);
  const labelPoint = scaledPoints[0];

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      <Line
        points={flattenedPoints}
        closed
        fill={hexToRgba(area.color, 0.25)}
        stroke={isSelected ? '#6366F1' : area.strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
      />

      {labelPoint && (
        <Text
          x={labelPoint.x}
          y={labelPoint.y - 14 * scaleRatio}
          text={area.name}
          fontSize={10 * scaleRatio}
          fill={isSelected ? '#6366F1' : '#475569'}
          fontStyle="italic"
        />
      )}
    </Group>
  );
}
