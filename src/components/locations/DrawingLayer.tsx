import { useEffect } from 'react';
import { Layer, Rect, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import type { AreaPoint } from '@/services/locationsService';

interface DrawingLayerProps {
  points: AreaPoint[]; // coordonnées world (0-1000), même repère que Location.x/y
  mousePos: AreaPoint | null; // coordonnées world
  scaleRatio: number;
  onAddPoint: (p: AreaPoint) => void;
  onClose: () => void;
  onCancel: () => void;
}

/**
 * Overlay Konva affiché par-dessus le plan pendant le dessin d'une zone.
 * Capture les clics pour poser des points et prévisualise le polygone en cours.
 */
export function DrawingLayer({
  points,
  mousePos,
  scaleRatio,
  onAddPoint,
  onClose,
  onCancel
}: DrawingLayerProps) {
  const canvasSize = 1000 * scaleRatio;
  const scaledPoints = points.map(p => ({ x: p.x * scaleRatio, y: p.y * scaleRatio }));
  const flattenedPoints = scaledPoints.flatMap(p => [p.x, p.y]);
  const scaledMousePos = mousePos ? { x: mousePos.x * scaleRatio, y: mousePos.y * scaleRatio } : null;
  const canClose = points.length >= 3;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    onAddPoint({ x: pos.x / scaleRatio, y: pos.y / scaleRatio });
  };

  const handleDoubleClick = () => {
    if (canClose) onClose();
  };

  const handlePointMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'pointer';
  };

  const handlePointMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'crosshair';
  };

  return (
    <Layer>
      {/* Zone de capture de clic sur toute la surface */}
      <Rect
        x={0}
        y={0}
        width={canvasSize}
        height={canvasSize}
        fill="transparent"
        onClick={handleCanvasClick}
        onDblClick={handleDoubleClick}
      />

      {/* Polygone en cours de dessin */}
      {scaledPoints.length >= 2 && (
        <Line points={flattenedPoints} stroke="#6366F1" strokeWidth={1.5} dash={[6, 3]} />
      )}

      {/* Ligne preview vers la souris */}
      {scaledPoints.length >= 1 && scaledMousePos && (
        <Line
          points={[
            scaledPoints[scaledPoints.length - 1].x,
            scaledPoints[scaledPoints.length - 1].y,
            scaledMousePos.x,
            scaledMousePos.y
          ]}
          stroke="#6366F1"
          strokeWidth={1}
          dash={[4, 4]}
          opacity={0.6}
        />
      )}

      {/* Points posés (petits cercles) */}
      {scaledPoints.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={i === 0 ? 6 : 4}
          fill={i === 0 ? '#6366F1' : 'white'}
          stroke="#6366F1"
          strokeWidth={1.5}
          onClick={i === 0 && canClose ? handleDoubleClick : undefined}
          onMouseEnter={i === 0 && canClose ? handlePointMouseEnter : undefined}
          onMouseLeave={i === 0 && canClose ? handlePointMouseLeave : undefined}
        />
      ))}
    </Layer>
  );
}
