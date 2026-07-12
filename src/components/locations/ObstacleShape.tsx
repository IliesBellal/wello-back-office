import { Group, Rect, Line, Arc } from 'react-konva';
import type Konva from 'konva';
import type { Obstacle } from '@/services/locationsService';

interface ObstacleShapeProps {
  obstacle: Obstacle;
  isSelected: boolean;
  onSelect: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  scaleRatio: number; // Pixels per canvas unit (1000x1000), même pattern que TableShape
}

/**
 * Composant Konva pour afficher un obstacle sur le canvas (mur, bar, escaliers, porte)
 */
export function ObstacleShape({
  obstacle,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  scaleRatio
}: ObstacleShapeProps) {
  const x = obstacle.x * scaleRatio;
  const y = obstacle.y * scaleRatio;
  const width = obstacle.width * scaleRatio;
  const height = obstacle.height * scaleRatio;

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x() / scaleRatio;
    const newY = e.target.y() / scaleRatio;
    onDragMove(newX, newY);
  };

  const renderContent = () => {
    switch (obstacle.type) {
      case 'wall':
        return (
          <Rect
            width={width}
            height={height}
            fill="#64748b"
            cornerRadius={2}
            stroke={isSelected ? '#3b82f6' : undefined}
            strokeWidth={isSelected ? 2 : 0}
          />
        );

      case 'bar':
        return (
          <>
            <Rect
              width={width}
              height={height}
              fill="#92400e"
              cornerRadius={4}
              stroke={isSelected ? '#3b82f6' : '#78350f'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <Rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              fill="transparent"
              stroke="#a16207"
              strokeWidth={1}
              dash={[6, 4]}
            />
          </>
        );

      case 'stairs':
        return (
          <>
            <Rect width={width} height={height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
            {[1, 2, 3, 4].map(i => (
              <Line
                key={i}
                points={[0, (height / 5) * i, width, (height / 5) * i]}
                stroke="#94a3b8"
                strokeWidth={1}
              />
            ))}
            {isSelected && (
              <Rect width={width} height={height} stroke="#3b82f6" strokeWidth={2} fill="transparent" />
            )}
          </>
        );

      case 'door':
        return (
          <>
            <Rect width={width} height={height} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
            <Arc
              x={0}
              y={height / 2}
              innerRadius={0}
              outerRadius={width}
              angle={obstacle.direction ?? 90}
              rotation={-90}
              fill="rgba(100,116,139,0.15)"
              stroke="#64748b"
              strokeWidth={1}
              dash={[4, 3]}
            />
            {isSelected && (
              <Rect width={width} height={height} stroke="#3b82f6" strokeWidth={2} fill="transparent" />
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Group
      x={x}
      y={y}
      rotation={obstacle.angle}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={onDragEnd}
      offsetX={width / 2}
      offsetY={height / 2}
    >
      {renderContent()}
    </Group>
  );
}
