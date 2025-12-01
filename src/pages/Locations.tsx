import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getLocations, updateLocation, type Location, type Floor } from '@/services/locationsService';
import { FloorSidebar } from '@/components/locations/FloorSidebar';
import { FloorCanvas } from '@/components/locations/FloorCanvas';
import { PropertiesPanel } from '@/components/locations/PropertiesPanel';

export default function Locations() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Location>>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getLocations();
      setFloors(data.data.floors);
      setLocations(data.data.locations);
      if (data.data.floors.length > 0) {
        setSelectedFloorId(data.data.floors[0].id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationUpdate = (locationId: string, updates: Partial<Location>) => {
    setLocations(prev =>
      prev.map(loc =>
        loc.location_id === locationId ? { ...loc, ...updates } : loc
      )
    );
    
    const current = pendingChanges.get(locationId) || {};
    pendingChanges.set(locationId, { ...current, ...updates });
    setPendingChanges(new Map(pendingChanges));
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Aucune modification à enregistrer');
      return;
    }

    try {
      const promises = Array.from(pendingChanges.entries()).map(([id, changes]) =>
        updateLocation(id, changes)
      );
      
      await Promise.all(promises);
      setPendingChanges(new Map());
      toast.success('Modifications enregistrées');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const selectedLocation = selectedLocationId
    ? locations.find(l => l.location_id === selectedLocationId)
    : null;

  const filteredLocations = selectedFloorId
    ? locations.filter(l => l.floor_id === selectedFloorId)
    : locations;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Plan de Salle</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos étages et positionnez vos tables
            </p>
          </div>
          <Button
            onClick={handleSaveChanges}
            disabled={pendingChanges.size === 0}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Sauvegarder les modifications
            {pendingChanges.size > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-background/20 rounded-full text-xs">
                {pendingChanges.size}
              </span>
            )}
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          <FloorSidebar
            floors={floors}
            locations={filteredLocations}
            selectedFloorId={selectedFloorId}
            selectedLocationId={selectedLocationId}
            onFloorSelect={setSelectedFloorId}
            onFloorsChange={setFloors}
            onLocationsChange={setLocations}
            onLocationSelect={setSelectedLocationId}
          />

          <FloorCanvas
            locations={filteredLocations}
            selectedLocationId={selectedLocationId}
            onLocationSelect={setSelectedLocationId}
            onLocationUpdate={handleLocationUpdate}
          />

          {selectedLocation && (
            <PropertiesPanel
              location={selectedLocation}
              onUpdate={(updates) => handleLocationUpdate(selectedLocation.location_id, updates)}
              onDelete={async () => {
                setLocations(prev => prev.filter(l => l.location_id !== selectedLocation.location_id));
                setSelectedLocationId(null);
                toast.success('Table supprimée');
              }}
              onClose={() => setSelectedLocationId(null)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
