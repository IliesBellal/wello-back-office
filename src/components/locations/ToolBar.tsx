import { Button } from '@/components/ui/button';
import { Circle, Square, BrickWall, GlassWater, MoveUpRight, DoorOpen } from 'lucide-react';
import type { Location, ObstacleType } from '@/services/locationsService';

interface ToolBarProps {
  selectedFloorId: string | null;
  onAddTable: (shape: Location['shape']) => Promise<void>;
  onAddObstacle: (type: ObstacleType) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Barre d'outils avec boutons pour ajouter différentes formes de tables
 */
export function ToolBar({
  selectedFloorId,
  onAddTable,
  onAddObstacle,
  isLoading = false
}: ToolBarProps) {
  const isDisabled = !selectedFloorId || isLoading;

  const handleAddTable = async (shape: Location['shape']) => {
    if (!selectedFloorId) return;
    try {
      await onAddTable(shape);
    } catch {
      // Error handled by caller
    }
  };

  const handleAddObstacle = async (type: ObstacleType) => {
    if (!selectedFloorId) return;
    try {
      await onAddObstacle(type);
    } catch {
      // Error handled by caller
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Ajouter une table</h3>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddTable('circle')}
          className="gap-2"
          title="Table ronde (diamètre 80)"
        >
          <Circle className="w-4 h-4" />
          Ronde
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddTable('square')}
          className="gap-2"
          title="Table carrée (80×80)"
        >
          <Square className="w-4 h-4" />
          Carrée
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddTable('rectangle')}
          className="gap-2"
          title="Table rectangulaire (120×80)"
        >
          <span className="text-lg leading-none">▬</span>
          Rectangulaire
        </Button>
      </div>
      {!selectedFloorId && (
        <p className="text-xs text-muted-foreground">Sélectionnez un étage pour ajouter une table</p>
      )}

      <div className="border-t border-border pt-3" />

      <h3 className="text-sm font-semibold text-foreground">Obstacles</h3>
      <div
        className={`flex gap-2 flex-wrap ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddObstacle('wall')}
          className="flex-col h-auto py-2 gap-1"
          title="Mur (120×15)"
        >
          <BrickWall className="w-4 h-4" />
          <span className="text-xs">Mur</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddObstacle('bar')}
          className="flex-col h-auto py-2 gap-1"
          title="Bar (200×50)"
        >
          <GlassWater className="w-4 h-4" />
          <span className="text-xs">Bar</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddObstacle('stairs')}
          className="flex-col h-auto py-2 gap-1"
          title="Escaliers (80×80)"
        >
          <MoveUpRight className="w-4 h-4" />
          <span className="text-xs">Escaliers</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleAddObstacle('door')}
          className="flex-col h-auto py-2 gap-1"
          title="Porte (80×12)"
        >
          <DoorOpen className="w-4 h-4" />
          <span className="text-xs">Porte</span>
        </Button>
      </div>
    </div>
  );
}
