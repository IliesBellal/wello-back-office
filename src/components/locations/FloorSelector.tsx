import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);

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
    const name = editingName.trim();
    if (!editingId) return;
    if (!name) {
      toast.error("Le nom de l'étage ne peut pas être vide");
      return;
    }
    onRenameFloor(editingId, name);
    setEditingId(null);
  };

  const deleteCount = floorToDelete ? (itemCounts[floorToDelete.id] ?? 0) : 0;

  return (
    <>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Étage</Label>
        <div className="flex gap-2">
          <Select value={selectedFloorId ?? ''} onValueChange={onFloorSelect}>
            <SelectTrigger className="flex-1" aria-label="Étage actif">
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
          <Button size="icon" variant="outline" onClick={() => setShowCreate(true)} title="Ajouter un étage" aria-label="Ajouter un étage">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {floors.length > 0 && (
        <ul className="space-y-1">
          {floors.map(floor => (
            <li
              key={floor.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${floor.id === selectedFloorId ? 'bg-muted/60' : ''}`}
            >
              {editingId === floor.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingName}
                    maxLength={MAX_FLOOR_NAME_LENGTH}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8 flex-1"
                    aria-label="Nouveau nom de l'étage"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={confirmRename} title="Valider" aria-label="Valider le nom">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)} title="Annuler" aria-label="Annuler le renommage">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <button type="button" className="flex-1 truncate text-left text-foreground" onClick={() => onFloorSelect(floor.id)}>
                    {floor.name}
                    <span className="ml-2 text-xs text-muted-foreground">{itemCounts[floor.id] ?? 0}</span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingId(floor.id);
                      setEditingName(floor.name);
                    }}
                    title="Renommer l'étage"
                    aria-label={`Renommer ${floor.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setFloorToDelete(floor)}
                    title="Supprimer l'étage"
                    aria-label={`Supprimer ${floor.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

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
