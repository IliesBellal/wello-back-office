import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createFloor, updateFloor, deleteFloor, createLocation, type Floor, type Location } from '@/services/locationsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

interface FloorSidebarProps {
  floors: Floor[];
  locations: Location[];
  selectedFloorId: string | null;
  onFloorSelect: (floorId: string) => void;
  onFloorsChange: (floors: Floor[]) => void;
  onLocationsChange: (locations: Location[]) => void;
}

export function FloorSidebar({
  floors,
  locations,
  selectedFloorId,
  onFloorSelect,
  onFloorsChange,
  onLocationsChange,
}: FloorSidebarProps) {
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [deleteFloorId, setDeleteFloorId] = useState<string | null>(null);
  const [floorName, setFloorName] = useState('');
  const [tableName, setTableName] = useState('');
  const [tableSeats, setTableSeats] = useState(2);

  const handleCreateFloor = async () => {
    if (!floorName.trim()) return;

    try {
      const newFloor = await createFloor(floorName);
      onFloorsChange([...floors, newFloor]);
      setFloorName('');
      setShowFloorDialog(false);
      toast.success('Étage créé');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateFloor = async () => {
    if (!editingFloor || !floorName.trim()) return;

    try {
      await updateFloor(editingFloor.id, floorName);
      onFloorsChange(floors.map(f => f.id === editingFloor.id ? { ...f, name: floorName } : f));
      setEditingFloor(null);
      setFloorName('');
      setShowFloorDialog(false);
      toast.success('Étage modifié');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteFloor = async () => {
    if (!deleteFloorId) return;

    try {
      await deleteFloor(deleteFloorId);
      onFloorsChange(floors.filter(f => f.id !== deleteFloorId));
      onLocationsChange(locations.filter(l => l.floor_id !== deleteFloorId));
      if (selectedFloorId === deleteFloorId) {
        onFloorSelect(floors[0]?.id || '');
      }
      setDeleteFloorId(null);
      toast.success('Étage supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreateTable = async () => {
    if (!tableName.trim() || !selectedFloorId) return;

    try {
      const newLocation = await createLocation({
        location_name: tableName,
        seats: tableSeats,
        floor_id: selectedFloorId,
        shape: 'Rectangle',
        angle: 0,
        current_x: 50,
        current_y: 50,
        current_width: 10,
        current_height: 10,
      });
      onLocationsChange([...locations, newLocation]);
      setTableName('');
      setTableSeats(2);
      setShowTableDialog(false);
      toast.success('Table créée');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const unassignedTables = locations.filter(l => !l.floor_id);

  return (
    <>
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sidebar-foreground">Étages</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingFloor(null);
                setFloorName('');
                setShowFloorDialog(true);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {floors.map(floor => (
              <div
                key={floor.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedFloorId === floor.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground'
                }`}
                onClick={() => onFloorSelect(floor.id)}
              >
                <span className="text-sm font-medium">{floor.name}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFloor(floor);
                      setFloorName(floor.name);
                      setShowFloorDialog(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteFloorId(floor.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <Button
            className="w-full gap-2"
            onClick={() => setShowTableDialog(true)}
            disabled={!selectedFloorId}
          >
            <Plus className="w-4 h-4" />
            Nouvelle Table
          </Button>
        </div>

        {unassignedTables.length > 0 && (
          <div className="p-4 border-t border-border">
            <h3 className="text-sm font-semibold text-sidebar-foreground mb-2">
              Tables non assignées
            </h3>
            <div className="space-y-1">
              {unassignedTables.map(table => (
                <div
                  key={table.location_id}
                  className="p-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm"
                >
                  {table.location_name} ({table.seats} places)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFloor ? 'Modifier l\'étage' : 'Nouvel étage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom de l'étage</label>
              <Input
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="Ex: Terrasse"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>
              Annuler
            </Button>
            <Button onClick={editingFloor ? handleUpdateFloor : handleCreateFloor}>
              {editingFloor ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom de la table</label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Ex: Table 1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre de places</label>
              <Input
                type="number"
                min="1"
                value={tableSeats}
                onChange={(e) => setTableSeats(parseInt(e.target.value) || 2)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateTable}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFloorId} onOpenChange={() => setDeleteFloorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'étage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera également toutes les tables associées à cet étage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFloor}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
