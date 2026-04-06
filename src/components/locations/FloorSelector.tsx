import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Floor } from '@/services/locationsService';

interface FloorSelectorProps {
  floors: Floor[];
  selectedFloorId: string | null;
  onFloorSelect: (floorId: string) => void;
  onCreateFloor: (name: string) => Promise<void>;
  isCreating?: boolean;
}

/**
 * Composant pour sélectionner l'étage actif
 * Affiche un dropdown avec tous les étages et bouton pour créer un nouvel étage
 */
export function FloorSelector({
  floors,
  selectedFloorId,
  onFloorSelect,
  onCreateFloor,
  isCreating = false
}: FloorSelectorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFloor = async () => {
    if (!newFloorName.trim()) {
      toast.error('Entrez un nom pour l\'étage');
      return;
    }

    try {
      setIsLoading(true);
      await onCreateFloor(newFloorName);
      setNewFloorName('');
      setShowDialog(false);
    } catch {
      // Error already handled by onCreateFloor
    } finally {
      setIsLoading(false);
    }
  };

  const currentFloor = floors.find(f => f.id === selectedFloorId);

  return (
    <>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Sélectionner un étage</Label>
        <div className="flex gap-2">
          <Select value={selectedFloorId || ''} onValueChange={onFloorSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choisir un étage..." />
            </SelectTrigger>
            <SelectContent>
              {floors.map(floor => (
                <SelectItem key={floor.id} value={floor.id}>
                  {floor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowDialog(true)}
            title="Ajouter un étage"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {currentFloor && (
          <p className="text-sm text-muted-foreground">
            Étage actif : <strong>{currentFloor.name}</strong>
          </p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel étage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="floor-name">Nom de l'étage</Label>
              <Input
                id="floor-name"
                placeholder="Ex: RDC, Terrasse, 1er étage..."
                value={newFloorName}
                onChange={e => setNewFloorName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreateFloor();
                  }
                }}
                disabled={isLoading || isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading || isCreating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateFloor}
              disabled={isLoading || isCreating}
            >
              {isLoading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
