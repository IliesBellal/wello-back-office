import { Copy, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { defaultTableDimensions } from '@/lib/floorplan/tablePresets';
import {
  MAX_SEATS,
  MAX_TABLE_NAME_LENGTH,
  MIN_SEATS,
  TABLE_MAX_SIZE,
  TABLE_MIN_SIZE
} from '@/lib/floorplan/validation';
import type { Floor, Location, TableAttributes, TableShape } from '@/lib/floorplan/types';
import { PropertiesShell } from './PropertiesShell';

const DEFAULT_ATTRIBUTES: TableAttributes = { pmr: false, terrace: false, vip: false, window: false };

const ATTRIBUTE_OPTIONS: { key: keyof TableAttributes; icon: string; label: string }[] = [
  { key: 'pmr', icon: '♿', label: 'PMR' },
  { key: 'terrace', icon: '🌿', label: 'Terrasse' },
  { key: 'vip', icon: '⭐', label: 'VIP' },
  { key: 'window', icon: '🪟', label: 'Fenêtre' }
];

interface TablePropertiesPanelProps {
  location: Location;
  floors: Floor[];
  isDuplicateName: boolean;
  isOverlapping: boolean;
  /** `coalesceKey` regroupe une série de réglages (frappe, curseur) en une seule annulation. */
  onUpdate: (patch: Partial<Location>, coalesceKey?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Propriétés d'une table. Rendu avec `key={location_id}` par la page : changer
 * de table réinitialise entièrement le formulaire.
 */
export function TablePropertiesPanel({
  location,
  floors,
  isDuplicateName,
  isOverlapping,
  onUpdate,
  onDuplicate,
  onDelete,
  onClose
}: TablePropertiesPanelProps) {
  const key = (field: string) => `${location.location_id}:${field}`;
  const isRound = location.shape === 'circle';

  const changeShape = (shape: TableShape) => {
    if (shape === location.shape) return;
    onUpdate({ shape, ...defaultTableDimensions(shape) });
  };

  const setSize = (field: 'width' | 'height', value: number) => {
    // Une table ronde reste ronde : largeur et hauteur évoluent ensemble.
    onUpdate(isRound ? { width: value, height: value } : { [field]: value }, key('size'));
  };

  return (
    <PropertiesShell title="Propriétés de la table" onClose={onClose}>
      <div className="space-y-2">
        <Label htmlFor="table-name">Nom de la table</Label>
        <Input
          id="table-name"
          value={location.location_name}
          maxLength={MAX_TABLE_NAME_LENGTH}
          onChange={e => onUpdate({ location_name: e.target.value }, key('name'))}
          placeholder="Ex : Table 12, Bar 1…"
          aria-invalid={!location.location_name.trim() || isDuplicateName}
        />
        {!location.location_name.trim() && <p className="text-xs text-destructive">Le nom est obligatoire.</p>}
        {isDuplicateName && location.location_name.trim() && (
          <p className="text-xs text-amber-600 dark:text-amber-500">Une autre table porte déjà ce nom.</p>
        )}
        {isOverlapping && <p className="text-xs text-destructive">Cette table en chevauche une autre.</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="table-floor">Étage</Label>
        <Select value={location.floor_id ?? ''} onValueChange={floorId => onUpdate({ floor_id: floorId || null })}>
          <SelectTrigger id="table-floor">
            <SelectValue placeholder="Sélectionner un étage..." />
          </SelectTrigger>
          <SelectContent>
            {floors.map(floor => (
              <SelectItem key={floor.id} value={floor.id}>
                {floor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="table-seats-value">Nombre de places</Label>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ seats: location.seats - 1 })}
            disabled={location.seats <= MIN_SEATS}
            aria-label="Diminuer le nombre de places"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span id="table-seats-value" className="min-w-14 text-center text-base font-semibold text-foreground">
            {location.seats}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ seats: location.seats + 1 })}
            disabled={location.seats >= MAX_SEATS}
            aria-label="Augmenter le nombre de places"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forme</Label>
        <ToggleGroup
          type="single"
          value={location.shape}
          onValueChange={value => value && changeShape(value as TableShape)}
          className="justify-start"
        >
          <ToggleGroupItem value="circle" aria-label="Ronde" title="Table ronde">
            ●
          </ToggleGroupItem>
          <ToggleGroupItem value="square" aria-label="Carrée" title="Table carrée">
            ■
          </ToggleGroupItem>
          <ToggleGroupItem value="rectangle" aria-label="Rectangulaire" title="Table rectangulaire">
            ▬
          </ToggleGroupItem>
          <ToggleGroupItem value="oval" aria-label="Ovale" title="Table ovale">
            ⬭
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label>Attributs</Label>
        <div className="grid grid-cols-2 gap-2">
          {ATTRIBUTE_OPTIONS.map(({ key: attribute, icon, label }) => {
            const attributes = location.attributes ?? DEFAULT_ATTRIBUTES;
            const checked = attributes[attribute];
            return (
              <label
                key={attribute}
                htmlFor={`table-attribute-${attribute}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <Checkbox
                  id={`table-attribute-${attribute}`}
                  checked={checked}
                  onCheckedChange={() => onUpdate({ attributes: { ...attributes, [attribute]: !checked } })}
                />
                <span className="text-sm">
                  {icon} {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="table-width">
            {isRound ? 'Diamètre' : 'Largeur'} : <span className="font-semibold text-primary">{Math.round(location.width)}</span>
          </Label>
          <Slider
            id="table-width"
            min={TABLE_MIN_SIZE}
            max={TABLE_MAX_SIZE}
            step={10}
            value={[location.width]}
            onValueChange={([width]) => setSize('width', width)}
          />
        </div>

        {!isRound && (
          <div className="space-y-2">
            <Label htmlFor="table-height">
              Hauteur : <span className="font-semibold text-primary">{Math.round(location.height)}</span>
            </Label>
            <Slider
              id="table-height"
              min={TABLE_MIN_SIZE}
              max={TABLE_MAX_SIZE}
              step={10}
              value={[location.height]}
              onValueChange={([height]) => setSize('height', height)}
            />
          </div>
        )}
      </div>

      {!isRound && (
        <div className="space-y-2">
          <Label htmlFor="table-angle">
            Rotation : <span className="font-semibold text-primary">{Math.round(location.angle)}°</span>
          </Label>
          <Slider
            id="table-angle"
            min={0}
            max={359}
            step={5}
            value={[location.angle]}
            onValueChange={([angle]) => onUpdate({ angle }, key('angle'))}
          />
        </div>
      )}

      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Position</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">X :</span>
            <span className="ml-1 font-mono">{Math.round(location.x)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Y :</span>
            <span className="ml-1 font-mono">{Math.round(location.y)}</span>
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
