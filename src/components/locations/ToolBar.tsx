import { useState } from 'react';
import { Hexagon, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OBSTACLE_CATALOG } from '@/lib/floorplan/obstacleCatalog';
import { TABLE_PRESETS, defaultTableDimensions } from '@/lib/floorplan/tablePresets';
import { SELECT_TOOL, tableTool, type Tool } from '@/lib/floorplan/tools';
import { MAX_SEATS, MIN_SEATS } from '@/lib/floorplan/validation';
import type { ObstacleType, TableShape } from '@/lib/floorplan/types';
import { DEFAULT_SEATS } from '@/utils/floorPlanLayout';
import { OBSTACLE_ICONS } from './obstacleIcons';

// Les zones dessinées restent masquées à la demande produit : repasser à true pour les réafficher.
const SHOW_ZONES = false;

const BASIC_TABLES: { shape: Extract<TableShape, 'circle' | 'square' | 'rectangle'>; label: string; glyph: string }[] = [
  { shape: 'circle', label: 'Ronde', glyph: '●' },
  { shape: 'square', label: 'Carrée', glyph: '■' },
  { shape: 'rectangle', label: 'Rectangulaire', glyph: '▬' }
];

const MAX_SERIES = 50;

interface ToolBarProps {
  tool: Tool;
  disabled: boolean;
  onToolChange: (tool: Tool) => void;
  onAddSeries: (count: number, seats: number) => void;
}

const isActiveTable = (tool: Tool, label: string) => tool.kind === 'table' && tool.label === label;

/**
 * Barre d'outils : un clic arme un outil, qui reste actif pour poser plusieurs
 * éléments à la suite (Échap ou clic droit pour terminer).
 */
export function ToolBar({ tool, disabled, onToolChange, onAddSeries }: ToolBarProps) {
  const [seriesCount, setSeriesCount] = useState('6');
  const [seriesSeats, setSeriesSeats] = useState(String(DEFAULT_SEATS));

  const toggle = (next: Tool, active: boolean) => onToolChange(active ? SELECT_TOOL : next);

  const submitSeries = () => {
    const count = Math.min(MAX_SERIES, Math.max(1, Math.floor(Number(seriesCount)) || 1));
    const seats = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.floor(Number(seriesSeats)) || DEFAULT_SEATS));
    onAddSeries(count, seats);
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant={tool.kind === 'select' ? 'secondary' : 'outline'}
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => onToolChange(SELECT_TOOL)}
        aria-pressed={tool.kind === 'select'}
      >
        <MousePointer2 className="h-4 w-4" />
        Sélection
      </Button>

      <section className="space-y-2" aria-label="Tables">
        <h3 className="text-sm font-semibold text-foreground">Tables</h3>
        <div className="flex flex-wrap gap-2">
          {BASIC_TABLES.map(({ shape, label, glyph }) => {
            const next = tableTool({ shape, seats: DEFAULT_SEATS, ...defaultTableDimensions(shape) }, label);
            const active = isActiveTable(tool, label);
            return (
              <Button
                key={shape}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                className="gap-2"
                aria-pressed={active}
                onClick={() => toggle(next, active)}
                title={`Table ${label.toLowerCase()} · ${DEFAULT_SEATS} places`}
              >
                <span className="text-base leading-none">{glyph}</span>
                {label}
              </Button>
            );
          })}
        </div>

        <details className="group rounded-md border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground group-open:text-foreground">
            Modèles de tables
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-border p-2">
            {TABLE_PRESETS.map(preset => {
              const next = tableTool(preset, preset.label);
              const active = isActiveTable(tool, preset.label);
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  disabled={disabled}
                  className="h-7 px-2 text-xs"
                  aria-pressed={active}
                  onClick={() => toggle(next, active)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </details>

        <details className="group rounded-md border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground group-open:text-foreground">
            Ajouter plusieurs tables
          </summary>
          <form
            className="flex items-end gap-2 border-t border-border p-2"
            onSubmit={event => {
              event.preventDefault();
              submitSeries();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="series-count" className="text-xs">
                Nombre
              </Label>
              <Input
                id="series-count"
                type="number"
                min={1}
                max={MAX_SERIES}
                value={seriesCount}
                onChange={e => setSeriesCount(e.target.value)}
                className="h-8 w-16"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="series-seats" className="text-xs">
                Places
              </Label>
              <Input
                id="series-seats"
                type="number"
                min={MIN_SEATS}
                max={MAX_SEATS}
                value={seriesSeats}
                onChange={e => setSeriesSeats(e.target.value)}
                className="h-8 w-16"
              />
            </div>
            <Button type="submit" size="sm" disabled={disabled} className="h-8">
              Ajouter
            </Button>
          </form>
        </details>
      </section>

      <section className="space-y-2" aria-label="Obstacles">
        <h3 className="text-sm font-semibold text-foreground">Obstacles</h3>
        <div className="grid grid-cols-4 gap-2">
          {OBSTACLE_CATALOG.map(definition => {
            const Icon = OBSTACLE_ICONS[definition.type];
            const next: Tool =
              definition.type === 'wall' ? { kind: 'wall' } : { kind: 'obstacle', type: definition.type as Exclude<ObstacleType, 'wall'> };
            const active =
              definition.type === 'wall'
                ? tool.kind === 'wall'
                : tool.kind === 'obstacle' && tool.type === definition.type;
            return (
              <Button
                key={definition.type}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                className="h-auto flex-col gap-1 px-1 py-2"
                aria-pressed={active}
                title={`${definition.label} — ${definition.hint}`}
                onClick={() => toggle(next, active)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px] leading-none">{definition.label}</span>
              </Button>
            );
          })}
        </div>
      </section>

      {SHOW_ZONES && (
        <section className="space-y-2" aria-label="Zones">
          <h3 className="text-sm font-semibold text-foreground">Zones</h3>
          <Button
            type="button"
            variant={tool.kind === 'area' ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className="gap-2"
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
