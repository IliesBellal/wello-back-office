import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAX_FLOOR_NAME_LENGTH } from '@/lib/floorplan/validation';
import type { Floor } from '@/lib/floorplan/types';

interface FloorSelectorProps {
  floors: Floor[];
  selectedFloorId: string | null;
  /** Nombre d'éléments (tables, obstacles, zones) par étage, pour la confirmation de suppression. */
  itemCounts: Record<string, number>;
  onFloorSelect: (floorId: string) => void;
  onCreateFloor: (name: string) => void;
  onRenameFloor: (floorId: string, name: string) => void;
  onDeleteFloor: (floorId: string) => void;
}

/**
 * Choix de l'étage actif, création, renommage et suppression. Tout agit sur le
 * brouillon : l'étage créé apparaît immédiatement et devient l'étage actif.
 */
export function FloorSelector({
  floors,
  selectedFloorId,
  itemCounts,
  onFloorSelect,
  onCreateFloor,
  onRenameFloor,
  onDeleteFloor
}: FloorSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<Floor | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);

  const selectedFloor = floors.find(floor => floor.id === selectedFloorId) ?? null;

  const create = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Entrez un nom pour l'étage");
      return;
    }
    onCreateFloor(name);
    setNewName('');
    setShowCreate(false);
  };

  const confirmRename = () => {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error("Le nom de l'étage ne peut pas être vide");
      return;
    }
    onRenameFloor(renaming.id, name);
    setRenaming(null);
  };

  const deleteCount = floorToDelete ? (itemCounts[floorToDelete.id] ?? 0) : 0;

  return (
    <>
      <section className="space-y-3" aria-label="Étages">
        <h3 className="text-sm font-semibold text-foreground">Étages</h3>

        <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouvel étage
        </Button>

        <div className="flex items-center gap-2">
          <Select value={selectedFloorId ?? ''} onValueChange={onFloorSelect} disabled={floors.length === 0}>
            <SelectTrigger className="min-w-0 flex-1" aria-label="Étage actif">
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
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            disabled={!selectedFloor}
            onClick={() => {
              if (!selectedFloor) return;
              setRenaming(selectedFloor);
              setRenameValue(selectedFloor.name);
            }}
            title="Renommer l'étage"
            aria-label="Renommer l'étage sélectionné"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            disabled={!selectedFloor}
            onClick={() => selectedFloor && setFloorToDelete(selectedFloor)}
            title="Supprimer l'étage"
            aria-label="Supprimer l'étage sélectionné"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel étage</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="floor-name">Nom de l'étage</Label>
            <Input
              id="floor-name"
              autoFocus
              maxLength={MAX_FLOOR_NAME_LENGTH}
              placeholder="Ex : RDC, Terrasse, 1er étage…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button onClick={create}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming !== null} onOpenChange={open => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer l'étage</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="floor-rename">Nom de l'étage</Label>
            <Input
              id="floor-rename"
              autoFocus
              maxLength={MAX_FLOOR_NAME_LENGTH}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Annuler
            </Button>
            <Button onClick={confirmRename}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={floorToDelete !== null} onOpenChange={open => !open && setFloorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'étage « {floorToDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount > 0
                ? `Les ${deleteCount} éléments de cet étage (tables, obstacles, zones) seront supprimés avec lui. `
                : ''}
              La suppression ne sera effective qu'à la publication, et reste annulable d'ici là.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (floorToDelete) onDeleteFloor(floorToDelete.id);
                setFloorToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
