import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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
  onRenameFloor?: (floorId: string, name: string) => Promise<void>;
  onDeleteFloor?: (floorId: string) => Promise<void>;
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
  onRenameFloor,
  onDeleteFloor,
  isCreating = false
}: FloorSelectorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyFloorId, setBusyFloorId] = useState<string | null>(null);

  const startEditing = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditingName(floor.name);
  };

  const cancelEditing = () => {
    setEditingFloorId(null);
    setEditingName('');
  };

  const confirmEditing = async () => {
    if (!editingFloorId || !onRenameFloor) return;
    if (!editingName.trim()) {
      toast.error('Le nom de l\'étage ne peut pas être vide');
      return;
    }
    try {
      setBusyFloorId(editingFloorId);
      await onRenameFloor(editingFloorId, editingName.trim());
      cancelEditing();
    } catch {
      // Error already handled by onRenameFloor
    } finally {
      setBusyFloorId(null);
    }
  };

  const handleDeleteFloor = async (floor: Floor) => {
    if (!onDeleteFloor) return;
    if (!window.confirm(`Supprimer l'étage "${floor.name}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      setBusyFloorId(floor.id);
      await onDeleteFloor(floor.id);
    } catch {
      // Error already handled by onDeleteFloor
    } finally {
      setBusyFloorId(null);
    }
  };

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

      {(onRenameFloor || onDeleteFloor) && floors.length > 0 && (
        <div className="space-y-1 pt-1">
          {floors.map(floor => (
            <div
              key={floor.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${
                floor.id === selectedFloorId ? 'bg-muted/60' : ''
              }`}
            >
              {editingFloorId === floor.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmEditing();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    disabled={busyFloorId === floor.id}
                    className="h-8 flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={confirmEditing}
                    disabled={busyFloorId === floor.id}
                    title="Valider"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={cancelEditing}
                    disabled={busyFloorId === floor.id}
                    title="Annuler"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-foreground">{floor.name}</span>
                  {onRenameFloor && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => startEditing(floor)}
                      disabled={busyFloorId === floor.id}
                      title="Renommer l'étage"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDeleteFloor && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteFloor(floor)}
                      disabled={busyFloorId === floor.id}
                      title="Supprimer l'étage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

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
