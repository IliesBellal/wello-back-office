import { Button } from '@/components/ui/button';
import { Circle, Square } from 'lucide-react';
import type { Location } from '@/services/locationsService';

interface ToolBarProps {
  selectedFloorId: string | null;
  onAddTable: (shape: Location['shape']) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Barre d'outils avec boutons pour ajouter différentes formes de tables
 */
export function ToolBar({
  selectedFloorId,
  onAddTable,
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
    </div>
  );
}
