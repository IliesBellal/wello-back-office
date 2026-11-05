import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Copy,
  Trash2,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AlignMode, DistributeAxis } from '@/lib/floorplan/align';
import type { Floor } from '@/lib/floorplan/types';
import { PropertiesShell } from './PropertiesShell';

interface MultiSelectionPanelProps {
  count: number;
  tables: number;
  obstacles: number;
  areas: number;
  floors: Floor[];
  activeFloorId: string | null;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: DistributeAxis) => void;
  onMoveToFloor: (floorId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ALIGN_BUTTONS: { mode: AlignMode; label: string; icon: LucideIcon }[] = [
  { mode: 'left', label: 'Aligner à gauche', icon: AlignHorizontalJustifyStart },
  { mode: 'center', label: 'Centrer horizontalement', icon: AlignHorizontalJustifyCenter },
  { mode: 'right', label: 'Aligner à droite', icon: AlignHorizontalJustifyEnd },
  { mode: 'top', label: 'Aligner en haut', icon: AlignVerticalJustifyStart },
  { mode: 'middle', label: 'Centrer verticalement', icon: AlignVerticalJustifyCenter },
  { mode: 'bottom', label: 'Aligner en bas', icon: AlignVerticalJustifyEnd }
];

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Actions sur une sélection multiple : alignement, répartition, changement d'étage, duplication, suppression. */
export function MultiSelectionPanel({
  count,
  tables,
  obstacles,
  areas,
  floors,
  activeFloorId,
  onAlign,
  onDistribute,
  onMoveToFloor,
  onDuplicate,
  onDelete,
  onClose
}: MultiSelectionPanelProps) {
  const movable = tables + obstacles; // les zones ne sont pas déplaçables
  const summary = [
    tables > 0 ? plural(tables, 'table', 'tables') : null,
    obstacles > 0 ? plural(obstacles, 'obstacle', 'obstacles') : null,
    areas > 0 ? plural(areas, 'zone', 'zones') : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PropertiesShell title={`${count} éléments sélectionnés`} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{summary}</p>

      {movable >= 2 && (
        <div className="space-y-2">
          <Label>Alignement</Label>
          <div className="flex flex-wrap gap-1">
            {ALIGN_BUTTONS.map(({ mode, label, icon: Icon }) => (
              <Button key={mode} type="button" size="icon" variant="outline" className="h-8 w-8" title={label} aria-label={label} onClick={() => onAlign(mode)}>
                <Icon className="h-4 w-4" />
              </Button>
            ))}
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              title="Répartir horizontalement (3 éléments minimum)"
              aria-label="Répartir horizontalement"
              disabled={movable < 3}
              onClick={() => onDistribute('horizontal')}
            >
              <AlignHorizontalSpaceBetween className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              title="Répartir verticalement (3 éléments minimum)"
              aria-label="Répartir verticalement"
              disabled={movable < 3}
              onClick={() => onDistribute('vertical')}
            >
              <AlignVerticalSpaceBetween className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {tables > 0 && floors.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="multi-floor">Déplacer les tables vers l'étage</Label>
          <Select value="" onValueChange={onMoveToFloor}>
            <SelectTrigger id="multi-floor">
              <SelectValue placeholder="Choisir un étage..." />
            </SelectTrigger>
            <SelectContent>
              {floors
                .filter(floor => floor.id !== activeFloorId)
                .map(floor => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
