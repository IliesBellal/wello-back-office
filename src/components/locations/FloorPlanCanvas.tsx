import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { TableShape } from './TableShape';
import type { Location } from '@/services/locationsService';

interface FloorPlanCanvasProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
  onLocationMove: (locationId: string, x: number, y: number) => void;
  isLoading?: boolean;
}

/**
 * Canvas Konva interactif pour afficher le plan de salle (1000x1000 virtual)
 * Responsive à la taille du conteneur
 */
export function FloorPlanCanvas({
  locations,
  selectedLocationId,
  onLocationSelect,
  onLocationMove,
  isLoading = false
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onLocationSelect('');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLocationSelect]);

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

              {/* Render all table shapes */}
              {locations.map(location => (
                <TableShape
                  key={location.location_id}
                  location={location}
                  isSelected={selectedLocationId === location.location_id}
                  isOccupied={false} // TODO: Get from orders API
                  onSelect={() => onLocationSelect(location.location_id)}
                  onDragMove={(x, y) => onLocationMove(location.location_id, x, y)}
                  scaleRatio={scaleRatio}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      )}
    </div>
  );
}
