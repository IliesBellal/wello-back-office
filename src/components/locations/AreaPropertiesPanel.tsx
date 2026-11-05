import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_AREA_NAME_LENGTH } from '@/lib/floorplan/validation';
import type { Area } from '@/lib/floorplan/types';
import { PropertiesShell } from './PropertiesShell';

interface AreaPropertiesPanelProps {
  area: Area;
  onUpdate: (patch: Partial<Area>, coalesceKey?: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Propriétés d'une zone : nom et couleurs (la forme n'est pas modifiable après le tracé). */
export function AreaPropertiesPanel({ area, onUpdate, onDelete, onClose }: AreaPropertiesPanelProps) {
  const key = (field: string) => `${area.id}:${field}`;

  return (
    <PropertiesShell title="Propriétés de la zone" onClose={onClose}>
      <div className="space-y-2">
        <Label htmlFor="area-name">Nom de la zone</Label>
        <Input
          id="area-name"
          value={area.name}
          maxLength={MAX_AREA_NAME_LENGTH}
          onChange={e => onUpdate({ name: e.target.value }, key('name'))}
          placeholder="Ex : Terrasse, Salle principale…"
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="area-color">Couleur de remplissage</Label>
          <div className="flex items-center gap-2">
            <input
              id="area-color"
              type="color"
              value={area.color}
              onChange={e => onUpdate({ color: e.target.value }, key('color'))}
              className="h-9 w-14 cursor-pointer rounded-md border border-input"
            />
            <span className="font-mono text-xs text-muted-foreground">{area.color}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area-stroke-color">Couleur de contour</Label>
          <div className="flex items-center gap-2">
            <input
              id="area-stroke-color"
              type="color"
              value={area.strokeColor}
              onChange={e => onUpdate({ strokeColor: e.target.value }, key('stroke'))}
              className="h-9 w-14 cursor-pointer rounded-md border border-input"
            />
            <span className="font-mono text-xs text-muted-foreground">{area.strokeColor}</span>
          </div>
        </div>
      </div>

      <Button type="button" variant="destructive" className="w-full gap-2" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
        Supprimer cette zone
      </Button>
    </PropertiesShell>
  );
}
