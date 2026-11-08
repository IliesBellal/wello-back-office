import { useState } from 'react';
import { Hexagon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OBSTACLE_CATALOG } from '@/lib/floorplan/obstacleCatalog';
import { defaultTableDimensions } from '@/lib/floorplan/tablePresets';
import { SELECT_TOOL, tableTool, type Tool } from '@/lib/floorplan/tools';
import type { ObstacleType } from '@/lib/floorplan/types';
import { DEFAULT_SEATS } from '@/utils/floorPlanLayout';
import { OBSTACLE_ICONS } from './obstacleIcons';

// Les zones dessinées restent masquées à la demande produit : repasser à true pour les réafficher.
const SHOW_ZONES = false;

/** Table posée par « Nouvelle table » : carrée ; la forme se change ensuite dans ses propriétés. */
const NEW_TABLE_TOOL: Tool = tableTool({ shape: 'square', seats: DEFAULT_SEATS, ...defaultTableDimensions('square') }, 'Table');

interface ToolBarProps {
  tool: Tool;
  disabled: boolean;
  onToolChange: (tool: Tool) => void;
}

/**
 * Outils de pose : un clic arme un outil, qui reste actif pour poser plusieurs
 * éléments à la suite (Échap, clic droit ou clic sur le bandeau pour terminer).
 */
export function ToolBar({ tool, disabled, onToolChange }: ToolBarProps) {
  const [obstaclePickerOpen, setObstaclePickerOpen] = useState(false);

  const toggle = (next: Tool, active: boolean) => onToolChange(active ? SELECT_TOOL : next);

  const tableActive = tool.kind === 'table';
  const obstacleActive = tool.kind === 'obstacle' || tool.kind === 'wall';

  return (
    <div className="flex flex-col gap-5">
      <section className="space-y-3" aria-label="Tables">
        <h3 className="text-sm font-semibold text-foreground">Tables</h3>
        <Button
          type="button"
          variant={tableActive ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          className="w-full justify-start gap-2"
          aria-pressed={tableActive}
          onClick={() => toggle(NEW_TABLE_TOOL, tableActive)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle table
        </Button>
      </section>

      <section className="space-y-3" aria-label="Obstacles">
        <h3 className="text-sm font-semibold text-foreground">Obstacles</h3>
        <Button
          type="button"
          variant={obstacleActive ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          className="w-full justify-start gap-2"
          aria-pressed={obstacleActive}
          onClick={() => (obstacleActive ? onToolChange(SELECT_TOOL) : setObstaclePickerOpen(true))}
        >
          <Plus className="h-4 w-4" />
          Nouvel obstacle
        </Button>

        <Dialog open={obstaclePickerOpen} onOpenChange={setObstaclePickerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvel obstacle</DialogTitle>
              <DialogDescription>Choisissez l'élément à poser, puis cliquez sur le plan.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              {OBSTACLE_CATALOG.map(definition => {
                const Icon = OBSTACLE_ICONS[definition.type];
                const next: Tool =
                  definition.type === 'wall'
                    ? { kind: 'wall' }
                    : { kind: 'obstacle', type: definition.type as Exclude<ObstacleType, 'wall'> };
                return (
                  <Button
                    key={definition.type}
                    type="button"
                    variant="outline"
                    className="h-auto flex-col gap-2 px-2 py-4"
                    title={`${definition.label} — ${definition.hint}`}
                    onClick={() => {
                      onToolChange(next);
                      setObstaclePickerOpen(false);
                    }}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{definition.label}</span>
                  </Button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {SHOW_ZONES && (
        <section className="space-y-3" aria-label="Zones">
          <h3 className="text-sm font-semibold text-foreground">Zones</h3>
          <Button
            type="button"
            variant={tool.kind === 'area' ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className="w-full justify-start gap-2"
            aria-pressed={tool.kind === 'area'}
            onClick={() => toggle({ kind: 'area' }, tool.kind === 'area')}
          >
            <Hexagon className="h-4 w-4" />
            Dessiner une zone
          </Button>
        </section>
      )}

      {disabled && <p className="text-xs text-muted-foreground">Créez ou sélectionnez un étage pour commencer.</p>}
    </div>
  );
}
