import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
import { Card } from '@/components/ui/card';
import type { Obstacle } from '@/services/locationsService';

interface ObstaclePropertiesPanelProps {
  obstacle: Obstacle | null;
  onUpdate: (updates: Partial<Obstacle>) => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

const OBSTACLE_TYPE_LABELS: Record<Obstacle['type'], string> = {
  wall: 'Mur',
  bar: 'Bar',
  stairs: 'Escaliers',
  door: 'Porte'
};

/**
 * Panneau de propriétés pour éditer un obstacle sélectionné
 * Responsive : bottom sheet on mobile, side panel on desktop
 */
export function ObstaclePropertiesPanel({
  obstacle,
  onUpdate,
  onDelete,
  onClose,
  isDeleting = false
}: ObstaclePropertiesPanelProps) {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting2, setIsDeleting] = useState(false);

  if (!obstacle) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      setShowDeleteDialog(false);
      toast.success('Obstacle supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Type (readonly) */}
      <div className="space-y-2">
        <Label>Type</Label>
        <p className="text-sm font-medium text-foreground">{OBSTACLE_TYPE_LABELS[obstacle.type]}</p>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="obstacle-width">
            Largeur: <span className="font-semibold text-primary">{obstacle.width}</span>
          </Label>
          <Slider
            id="obstacle-width"
            min={10}
            max={500}
            step={5}
            value={[obstacle.width]}
            onValueChange={([width]) => onUpdate({ width })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obstacle-height">
            Hauteur: <span className="font-semibold text-primary">{obstacle.height}</span>
          </Label>
          <Slider
            id="obstacle-height"
            min={10}
            max={500}
            step={5}
            value={[obstacle.height]}
            onValueChange={([height]) => onUpdate({ height })}
          />
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <Label htmlFor="obstacle-angle">
          Rotation: <span className="font-semibold text-primary">{obstacle.angle}°</span>
        </Label>
        <Slider
          id="obstacle-angle"
          min={0}
          max={359}
          step={5}
          value={[obstacle.angle]}
          onValueChange={([angle]) => onUpdate({ angle })}
        />
      </div>

      {/* Direction (door only) */}
      {obstacle.type === 'door' && (
        <div className="space-y-2">
          <Label htmlFor="obstacle-direction">
            Sens d'ouverture (°): <span className="font-semibold text-primary">{obstacle.direction ?? 90}</span>
          </Label>
          <Slider
            id="obstacle-direction"
            min={0}
            max={359}
            step={5}
            value={[obstacle.direction ?? 90]}
            onValueChange={([direction]) => onUpdate({ direction })}
          />
        </div>
      )}

      {/* Position Info (readonly) */}
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-semibold text-muted-foreground">Position</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">X:</span>
            <span className="ml-1 font-mono">{Math.round(obstacle.x)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Y:</span>
            <span className="ml-1 font-mono">{Math.round(obstacle.y)}</span>
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
        Supprimer cet obstacle
      </Button>
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={!!obstacle} onOpenChange={(open) => !open && onClose()}>
          <SheetContent side="bottom" className="h-auto max-h-[90vh]">
            <SheetHeader>
              <SheetTitle>Propriétés de l'obstacle</SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {content}
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'obstacle ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cet obstacle ({OBSTACLE_TYPE_LABELS[obstacle.type]}) ? Cette action est irréversible.
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
            <AlertDialogTitle>Supprimer l'obstacle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet obstacle ({OBSTACLE_TYPE_LABELS[obstacle.type]}) ? Cette action est irréversible.
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
