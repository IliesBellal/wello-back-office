import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Area } from '@/services/locationsService';

interface AreaPropertiesPanelProps {
  area: Area | null;
  onUpdate: (updates: Partial<Area>) => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

/**
 * Panneau de propriétés pour éditer une zone sélectionnée
 * Responsive : bottom sheet on mobile, side panel on desktop
 */
export function AreaPropertiesPanel({
  area,
  onUpdate,
  onDelete,
  onClose,
  isDeleting = false
}: AreaPropertiesPanelProps) {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting2, setIsDeleting] = useState(false);

  if (!area) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      setShowDeleteDialog(false);
      toast.success('Zone supprimée');
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
        <Label htmlFor="area-name">Nom de la zone</Label>
        <Input
          id="area-name"
          value={area.name}
          maxLength={50}
          onChange={e => onUpdate({ name: e.target.value })}
          placeholder="Ex: Terrasse, Salle principale..."
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="area-color">Couleur de remplissage</Label>
          <div className="flex items-center gap-2">
            <input
              id="area-color"
              type="color"
              value={area.color}
              onChange={e => onUpdate({ color: e.target.value })}
              className="h-9 w-14 rounded-md border border-input cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">{area.color}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area-stroke-color">Couleur de contour</Label>
          <div className="flex items-center gap-2">
            <input
              id="area-stroke-color"
              type="color"
              value={area.strokeColor}
              onChange={e => onUpdate({ strokeColor: e.target.value })}
              className="h-9 w-14 rounded-md border border-input cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">{area.strokeColor}</span>
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
        Supprimer cette zone
      </Button>
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={!!area} onOpenChange={(open) => !open && onClose()}>
          <SheetContent side="bottom" className="h-auto max-h-[90vh]">
            <SheetHeader>
              <SheetTitle>Propriétés de la zone</SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {content}
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer "{area.name}" ? Cette action est irréversible.
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
            <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{area.name}" ? Cette action est irréversible.
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
