import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { Location, Floor } from '@/services/locationsService';

interface TablePropertiesPanelProps {
  location: Location | null;
  floors: Floor[];
  onUpdate: (updates: Partial<Location>) => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

/**
 * Panneau de propriétés pour éditer une table sélectionnée
 * Responsive : bottom sheet on mobile, side panel on desktop
 */
export function TablePropertiesPanel({
  location,
  floors,
  onUpdate,
  onDelete,
  onClose,
  isDeleting = false
}: TablePropertiesPanelProps) {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting2, setIsDeleting] = useState(false);

  if (!location) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      setShowDeleteDialog(false);
      toast.success('Table supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="table-name">Nom de la table</Label>
        <Input
          id="table-name"
          value={location.location_name}
          onChange={e => onUpdate({ location_name: e.target.value })}
          placeholder="Ex: Table VIP, Bar 1..."
        />
      </div>

      {/* Floor Selection */}
      <div className="space-y-2">
        <Label htmlFor="table-floor">Étage</Label>
        <Select value={location.floor_id || ''} onValueChange={(floorId) => {
          onUpdate({ floor_id: floorId || null });
        }}>
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

      {/* Seats */}
      <div className="space-y-2">
        <Label htmlFor="table-seats">
          Nombre de places
          <span className="ml-2 font-semibold text-primary">{location.seats}</span>
        </Label>
        <Slider
          id="table-seats"
          min={1}
          max={20}
          step={1}
          value={[location.seats]}
          onValueChange={([seats]) => onUpdate({ seats })}
        />
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>1</span>
          <div className="flex-1" />
          <span>20</span>
        </div>
      </div>

      {/* Shape */}
      <div className="space-y-2">
        <Label>Forme</Label>
        <ToggleGroup
          type="single"
          value={location.shape}
          onValueChange={(shape) => {
            if (shape) {
              // Update default dimensions based on shape
              if (shape === 'circle' && location.shape !== 'circle') {
                onUpdate({ shape, width: 80, height: 80 });
              } else if (shape === 'square' && location.shape !== 'square') {
                onUpdate({ shape, width: 80, height: 80 });
              } else if (shape === 'rectangle' && location.shape !== 'rectangle') {
                onUpdate({ shape, width: 120, height: 80 });
              } else {
                onUpdate({ shape });
              }
            }
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="circle" aria-label="Cercle" title="Table ronde">
            ●
          </ToggleGroupItem>
          <ToggleGroupItem value="square" aria-label="Carré" title="Table carrée">
            ■
          </ToggleGroupItem>
          <ToggleGroupItem value="rectangle" aria-label="Rectangle" title="Table rectangulaire">
            ▬
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="table-width">
            Largeur: <span className="font-semibold text-primary">{location.width}</span>
          </Label>
          <Slider
            id="table-width"
            min={40}
            max={300}
            step={10}
            value={[location.width]}
            onValueChange={([width]) => onUpdate({ width })}
          />
        </div>

        {location.shape !== 'circle' && (
          <div className="space-y-2">
            <Label htmlFor="table-height">
              Hauteur: <span className="font-semibold text-primary">{location.height}</span>
            </Label>
            <Slider
              id="table-height"
              min={40}
              max={300}
              step={10}
              value={[location.height]}
              onValueChange={([height]) => onUpdate({ height })}
            />
          </div>
        )}
      </div>

      {/* Rotation (only for rectangles/squares) */}
      {location.shape !== 'circle' && (
        <div className="space-y-2">
          <Label htmlFor="table-angle">
            Rotation: <span className="font-semibold text-primary">{location.angle}°</span>
          </Label>
          <Slider
            id="table-angle"
            min={0}
            max={359}
            step={5}
            value={[location.angle]}
            onValueChange={([angle]) => onUpdate({ angle })}
          />
        </div>
      )}

      {/* Position Info (readonly) */}
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-semibold text-muted-foreground">Position</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">X:</span>
            <span className="ml-1 font-mono">{Math.round(location.x)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Y:</span>
            <span className="ml-1 font-mono">{Math.round(location.y)}</span>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isDeleting || isDeleting2}
      >
        <Trash2 className="w-4 h-4" />
        Supprimer cette table
      </Button>
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={!!location} onOpenChange={(open) => !open && onClose()}>
          <SheetContent side="bottom" className="h-auto max-h-[90vh]">
            <SheetHeader>
              <SheetTitle>Propriétés de la table</SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {content}
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la table ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer "{location.location_name}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting2}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting2}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting2 ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop: side card
  return (
    <>
      <Card className="absolute top-6 right-6 w-80 shadow-xl z-50 bg-card border-border max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-foreground">Propriétés</h2>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {content}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la table ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{location.location_name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting2}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting2}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting2 ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
