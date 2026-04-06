import { useRef, useEffect } from 'react';
import { Circle, Rect, Group, Text } from 'react-konva';
import type { Location } from '@/services/locationsService';

interface TableShapeProps {
  location: Location;
  isSelected: boolean;
  isOccupied?: boolean;
  onSelect: () => void;
  onDragMove: (x: number, y: number) => void;
  scaleRatio: number; // Pixels per canvas unit (1000x1000)
}

const COLORS = {
  free: '#51cf66',
  occupied: '#ff6b6b',
  selected: '#228be6'
};

/**
 * Composant Konva pour afficher une table sur le canvas
 * Supporte les formes : circle, rectangle, square
 * Gère la sélection et le drag & drop (drag seulement si sélectionné)
 */
export function TableShape({
  location,
  isSelected,
  isOccupied = false,
  onSelect,
  onDragMove,
  scaleRatio
}: TableShapeProps) {
  const groupRef = useRef<any>(null);
  
  const x = location.x * scaleRatio;
  const y = location.y * scaleRatio;
  const width = location.width * scaleRatio;
  const height = location.height * scaleRatio;
  
  // Color based on state
  const color = isSelected ? COLORS.selected : isOccupied ? COLORS.occupied : COLORS.free;
  const strokeWidth = isSelected ? 3 : 2;
  
  const handleDragMove = (e: any) => {
    if (!isSelected) return;
    
    const newX = e.target.x() / scaleRatio;
    const newY = e.target.y() / scaleRatio;
    
    onDragMove(newX, newY);
  };

  const handleDragBoundFunc = (pos: any) => {
    if (!isSelected) return pos;
    
    const newX = pos.x / scaleRatio;
    const newY = pos.y / scaleRatio;
    
    // Clamp to canvas boundaries
    const clampedX = Math.max(0, Math.min(newX, 1000 - location.width));
    const clampedY = Math.max(0, Math.min(newY, 1000 - location.height));
    
    return {
      x: clampedX * scaleRatio,
      y: clampedY * scaleRatio
    };
  };

  const handleMouseEnter = () => {
    if (groupRef.current?.getStage()) {
      groupRef.current.getStage().container.style.cursor = isSelected ? 'grab' : 'pointer';
    }
  };

  const handleMouseLeave = () => {
    if (groupRef.current?.getStage()) {
      groupRef.current.getStage().container.style.cursor = 'default';
    }
  };
  
  const shapeProps = {
    fill: 'rgba(255, 255, 255, 0.8)',
    stroke: color,
    strokeWidth,
  };
  
  const renderShape = () => {
    if (location.shape === 'circle') {
      const radius = width / 2;
      return (
        <Circle
          x={radius}
          y={radius}
          radius={radius}
          {...shapeProps}
        />
      );
    }
    
    if (location.shape === 'square') {
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={width}
          cornerRadius={4}
          rotation={location.angle}
          {...shapeProps}
        />
      );
    }
    
    // rectangle
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        cornerRadius={4}
        rotation={location.angle}
        {...shapeProps}
      />
    );
  };
  
  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={isSelected}
      onDragMove={handleDragMove}
      dragBoundFunc={handleDragBoundFunc}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderShape()}
      
      {/* Label with table name and seats */}
      <Text
        x={0}
        y={0}
        width={width}
        height={height}
        text={`${location.location_name}\n${location.seats} places`}
        fontSize={Math.max(10, width / 8)}
        fontFamily="Arial"
        fill={color}
        align="center"
        verticalAlign="middle"
        pointerEvents="none"
        wrap="word"
      />
    </Group>
  );
}
