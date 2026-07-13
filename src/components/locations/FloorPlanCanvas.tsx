import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { TableShape } from './TableShape';
import { ObstacleShape } from './ObstacleShape';
import { AreaShape } from './AreaShape';
import { DrawingLayer } from './DrawingLayer';
import type { Location, Obstacle, Area, AreaPoint } from '@/services/locationsService';

interface FloorPlanCanvasProps {
  locations: Location[];
  obstacles: Obstacle[];
  areas: Area[];
  selectedLocationId: string | null;
  selectedObstacleId: string | null;
  selectedAreaId: string | null;
  onLocationSelect: (locationId: string) => void;
  onLocationMove: (locationId: string, x: number, y: number) => void;
  onObstacleSelect: (obstacleId: string) => void;
  onObstacleMove: (obstacleId: string, x: number, y: number) => void;
  onAreaSelect: (areaId: string) => void;
  isDrawingArea: boolean;
  drawingPoints: AreaPoint[];
  onAddDrawingPoint: (p: AreaPoint) => void;
  onCloseDrawing: () => void;
  onCancelDrawing: () => void;
  isLoading?: boolean;
}

/**
 * Canvas Konva interactif pour afficher le plan de salle (1000x1000 virtual)
 * Responsive à la taille du conteneur
 */
export function FloorPlanCanvas({
  locations,
  obstacles,
  areas,
  selectedLocationId,
  selectedObstacleId,
  selectedAreaId,
  onLocationSelect,
  onLocationMove,
  onObstacleSelect,
  onObstacleMove,
  onAreaSelect,
  isDrawingArea,
  drawingPoints,
  onAddDrawingPoint,
  onCloseDrawing,
  onCancelDrawing,
  isLoading = false
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mousePos, setMousePos] = useState<AreaPoint | null>(null);

  // Mettre à jour la taille du canvas au redimensionnement du conteneur
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Utiliser le minimum pour garder le ratio 1:1 (carré responsive)
  const canvasSize = Math.min(containerSize.width, containerSize.height);
  const scaleRatio = canvasSize / 1000; // Pixels per virtual unit

  const handleStageClick = (e: any) => {
    // Only deselect if clicking the background
    if (e.target === e.target.getStage()) {
      onLocationSelect('');
      onObstacleSelect('');
      onAreaSelect('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onLocationSelect('');
      onObstacleSelect('');
      onAreaSelect('');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLocationSelect, onObstacleSelect, onAreaSelect]);

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawingArea) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    setMousePos({ x: pos.x / scaleRatio, y: pos.y / scaleRatio });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden flex items-center justify-center"
      style={{ minHeight: '400px' }}
    >
      {isLoading ? (
        <div className="text-muted-foreground">Chargement du plan...</div>
      ) : (
        <div className="relative border-4 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-lg" style={{ width: canvasSize, height: canvasSize }}>
          <Stage
            ref={stageRef}
            width={canvasSize}
            height={canvasSize}
            onClick={handleStageClick}
            onMouseMove={handleMouseMove}
            style={{ cursor: 'crosshair' }}
          >
            <Layer>
              {/* Canvas background */}
              <Rect
                width={canvasSize}
                height={canvasSize}
                fill="white"
                opacity={0.95}
              />

              {/* Grid lines every 100 units (vertical) */}
              {Array.from({ length: 11 }).map((_, i) => {
                const pos = (i * canvasSize) / 10;
                return (
                  <Rect
                    key={`grid-v-${i}`}
                    x={pos - 0.5}
                    y={0}
                    width={1}
                    height={canvasSize}
                    fill="#e2e8f0"
                    opacity={0.5}
                  />
                );
              })}

              {/* Grid lines every 100 units (horizontal) */}
              {Array.from({ length: 11 }).map((_, i) => {
                const pos = (i * canvasSize) / 10;
                return (
                  <Rect
                    key={`grid-h-${i}`}
                    x={0}
                    y={pos - 0.5}
                    width={canvasSize}
                    height={1}
                    fill="#e2e8f0"
                    opacity={0.5}
                  />
                );
              })}

              {/* Render existing zones (below obstacles and tables) */}
              {areas.map(area => (
                <AreaShape
                  key={area.id}
                  area={area}
                  isSelected={selectedAreaId === area.id}
                  onSelect={() => onAreaSelect(area.id)}
                  scaleRatio={scaleRatio}
                />
              ))}

              {/* Render all obstacle shapes (below tables) */}
              {obstacles.map(obstacle => (
                <ObstacleShape
                  key={obstacle.id}
                  obstacle={obstacle}
                  isSelected={selectedObstacleId === obstacle.id}
                  onSelect={() => onObstacleSelect(obstacle.id)}
                  onDragMove={(x, y) => onObstacleMove(obstacle.id, x, y)}
                  onDragEnd={() => {/* dragEnd déclenche déjà le dirty via onDragMove */}}
                  scaleRatio={scaleRatio}
                />
              ))}

              {/* Render all table shapes */}
              {locations.map(location => (
                <TableShape
                  key={location.location_id}
                  location={location}
                  isSelected={selectedLocationId === location.location_id}
                  booking={location.booking ?? null}
                  onSelect={() => onLocationSelect(location.location_id)}
                  onDragMove={(x, y) => onLocationMove(location.location_id, x, y)}
                  scaleRatio={scaleRatio}
                />
              ))}
            </Layer>

            {isDrawingArea && (
              <DrawingLayer
                points={drawingPoints}
                mousePos={mousePos}
                scaleRatio={scaleRatio}
                onAddPoint={onAddDrawingPoint}
                onClose={onCloseDrawing}
                onCancel={onCancelDrawing}
              />
            )}
          </Stage>
        </div>
      )}
    </div>
  );
}
