import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Trash2, X } from 'lucide-react';
import type { Location } from '@/services/locationsService';
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
import { deleteLocation } from '@/services/locationsService';
import { toast } from 'sonner';

interface PropertiesPanelProps {
  location: Location;
  onUpdate: (updates: Partial<Location>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function PropertiesPanel({
  location,
  onUpdate,
  onDelete,
  onClose,
}: PropertiesPanelProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteLocation(location.location_id);
      onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <>
      <div className="w-80 border-l border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sidebar-foreground">Propriétés</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-auto">
          <div className="space-y-2">
            <Label>Nom de la table</Label>
            <Input
              value={location.location_name}
              onChange={(e) => onUpdate({ location_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre de places</Label>
            <Input
              type="number"
              min="1"
              value={location.seats}
              onChange={(e) => onUpdate({ seats: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Forme</Label>
            <div className="flex gap-2">
              <Button
                variant={location.shape === 'Rectangle' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onUpdate({ shape: 'Rectangle' })}
              >
                Rectangle
              </Button>
              <Button
                variant={location.shape === 'Ellipse' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onUpdate({ shape: 'Ellipse' })}
              >
                Ellipse
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Largeur (%)</Label>
            <Input
              type="number"
              min="5"
              max="50"
              step="0.5"
              value={location.current_width.toFixed(1)}
              onChange={(e) =>
                onUpdate({ current_width: parseFloat(e.target.value) || 10 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Hauteur (%)</Label>
            <Input
              type="number"
              min="5"
              max="50"
              step="0.5"
              value={location.current_height.toFixed(1)}
              onChange={(e) =>
                onUpdate({ current_height: parseFloat(e.target.value) || 10 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Rotation: {location.angle}°</Label>
            <Slider
              min={0}
              max={360}
              step={5}
              value={[location.angle]}
              onValueChange={([value]) => onUpdate({ angle: value })}
            />
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            Supprimer la table
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la table ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La table "{location.location_name}" sera
              définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
