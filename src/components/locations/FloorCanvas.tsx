import { useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Users } from 'lucide-react';
import type { Location } from '@/services/locationsService';

interface FloorCanvasProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
  onLocationUpdate: (locationId: string, updates: Partial<Location>) => void;
}

export function FloorCanvas({
  locations,
  selectedLocationId,
  onLocationSelect,
  onLocationUpdate,
}: FloorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handleContainerResize = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  };

  useState(() => {
    handleContainerResize();
    window.addEventListener('resize', handleContainerResize);
    return () => window.removeEventListener('resize', handleContainerResize);
  });

  const percentToPixels = (percent: number, dimension: 'width' | 'height') => {
    const size = dimension === 'width' ? containerSize.width : containerSize.height;
    return (percent / 100) * size;
  };

  const pixelsToPercent = (pixels: number, dimension: 'width' | 'height') => {
    const size = dimension === 'width' ? containerSize.width : containerSize.height;
    return (pixels / size) * 100;
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-auto relative">
      <div
        ref={containerRef}
        className="w-full h-full bg-muted/20 rounded-lg border border-border"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          minHeight: '600px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onLocationSelect('');
          }
        }}
      >
        {locations.map((location) => {
          const x = percentToPixels(location.current_x, 'width');
          const y = percentToPixels(location.current_y, 'height');
          const width = percentToPixels(location.current_width, 'width');
          const height = percentToPixels(location.current_height, 'height');

          return (
            <Rnd
              key={location.location_id}
              size={{ width, height }}
              position={{ x, y }}
              onDragStop={(e, d) => {
                onLocationUpdate(location.location_id, {
                  current_x: pixelsToPercent(d.x, 'width'),
                  current_y: pixelsToPercent(d.y, 'height'),
                });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                onLocationUpdate(location.location_id, {
                  current_width: pixelsToPercent(ref.offsetWidth, 'width'),
                  current_height: pixelsToPercent(ref.offsetHeight, 'height'),
                  current_x: pixelsToPercent(position.x, 'width'),
                  current_y: pixelsToPercent(position.y, 'height'),
                });
              }}
              bounds="parent"
              minWidth={60}
              minHeight={60}
              className={`cursor-move ${
                selectedLocationId === location.location_id
                  ? 'ring-2 ring-primary ring-offset-2'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onLocationSelect(location.location_id);
              }}
            >
              <div
                className={`w-full h-full flex flex-col items-center justify-center gap-1 text-foreground font-medium shadow-lg border-2 transition-all ${
                  location.shape === 'Ellipse' ? 'rounded-full' : 'rounded-md'
                } ${
                  selectedLocationId === location.location_id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
                style={{
                  transform: `rotate(${location.angle}deg)`,
                }}
              >
                <span className="text-sm font-semibold">{location.location_name}</span>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <Users className="w-3 h-3" />
                  <span>{location.seats}</span>
                </div>
              </div>
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
