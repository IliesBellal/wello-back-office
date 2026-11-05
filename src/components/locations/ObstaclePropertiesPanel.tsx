import { Copy, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { OBSTACLE_MAX_SIZE, OBSTACLE_MIN_SIZE, getObstacleDefinition } from '@/lib/floorplan/obstacleCatalog';
import type { Obstacle } from '@/lib/floorplan/types';
import { OBSTACLE_ICONS } from './obstacleIcons';
import { PropertiesShell } from './PropertiesShell';

interface ObstaclePropertiesPanelProps {
  obstacle: Obstacle;
  onUpdate: (patch: Partial<Obstacle>, coalesceKey?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const THICKNESS_MAX = 60;

/** Propriétés d'un obstacle. Rendu avec `key={id}` par la page : changer d'obstacle réinitialise le formulaire. */
export function ObstaclePropertiesPanel({ obstacle, onUpdate, onDuplicate, onDelete, onClose }: ObstaclePropertiesPanelProps) {
  const definition = getObstacleDefinition(obstacle.type);
  const Icon = OBSTACLE_ICONS[obstacle.type];
  const key = (field: string) => `${obstacle.id}:${field}`;

  // Plante et pilier restent proportionnels : un seul curseur de taille.
  const setUniformSize = (size: number) => onUpdate({ width: size, height: size }, key('size'));
  const isThin = obstacle.type === 'wall' || obstacle.type === 'door' || obstacle.type === 'window';

  return (
    <PropertiesShell title={definition.label} onClose={onClose}>
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{definition.label}</p>
          <p className="text-xs text-muted-foreground">{definition.hint}</p>
        </div>
      </div>

      {definition.keepRatio ? (
        <div className="space-y-2">
          <Label htmlFor="obstacle-size">
            Taille : <span className="font-semibold text-primary">{Math.round(obstacle.width)}</span>
          </Label>
          <Slider
            id="obstacle-size"
            min={OBSTACLE_MIN_SIZE}
            max={200}
            step={5}
            value={[obstacle.width]}
            onValueChange={([size]) => setUniformSize(size)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="obstacle-width">
              {isThin ? 'Longueur' : 'Largeur'} : <span className="font-semibold text-primary">{Math.round(obstacle.width)}</span>
            </Label>
            <Slider
              id="obstacle-width"
              min={OBSTACLE_MIN_SIZE}
              max={OBSTACLE_MAX_SIZE}
              step={5}
              value={[obstacle.width]}
              onValueChange={([width]) => onUpdate({ width }, key('width'))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obstacle-height">
              {isThin ? 'Épaisseur' : 'Hauteur'} : <span className="font-semibold text-primary">{Math.round(obstacle.height)}</span>
            </Label>
            <Slider
              id="obstacle-height"
              min={OBSTACLE_MIN_SIZE}
              max={isThin ? THICKNESS_MAX : OBSTACLE_MAX_SIZE}
              step={2}
              value={[obstacle.height]}
              onValueChange={([height]) => onUpdate({ height }, key('height'))}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="obstacle-angle">
            Rotation : <span className="font-semibold text-primary">{Math.round(obstacle.angle)}°</span>
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onUpdate({ angle: obstacle.angle + 90 })}
            title="Pivoter de 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
            90°
          </Button>
        </div>
        <Slider
          id="obstacle-angle"
          min={0}
          max={359}
          step={5}
          value={[obstacle.angle]}
          onValueChange={([angle]) => onUpdate({ angle }, key('angle'))}
        />
      </div>

      {obstacle.type === 'door' && (
        <div className="space-y-2">
          <Label htmlFor="obstacle-direction">
            Ouverture : <span className="font-semibold text-primary">{Math.round(obstacle.direction ?? 90)}°</span>
          </Label>
          <Slider
            id="obstacle-direction"
            min={30}
            max={180}
            step={5}
            value={[obstacle.direction ?? 90]}
            onValueChange={([direction]) => onUpdate({ direction }, key('direction'))}
          />
        </div>
      )}

      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Position (centre)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">X :</span>
            <span className="ml-1 font-mono">{Math.round(obstacle.x)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Y :</span>
            <span className="ml-1 font-mono">{Math.round(obstacle.y)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 gap-2" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
          Dupliquer
        </Button>
        <Button type="button" variant="destructive" className="flex-1 gap-2" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Supprimer
        </Button>
      </div>
    </PropertiesShell>
  );
}
