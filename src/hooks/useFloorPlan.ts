import { useState, useCallback, useEffect } from 'react';
import { 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation,
  createFloor as createFloorAPI,
  type Location,
  type Floor 
} from '@/services/locationsService';
import { toast } from 'sonner';

export interface FloorPlanState {
  floors: Floor[];
  locations: Location[];
  selectedFloorId: string | null;
  selectedLocationId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  dirtyLocations: Set<string>;
}

export interface UseFloorPlanReturn extends FloorPlanState {
  // Floor operations
  loadData: () => Promise<void>;
  createFloor: (name: string) => Promise<void>;
  
  // Location operations
  addLocation: (shape: Location['shape'], floorId: string) => Promise<void>;
  selectLocation: (locationId: string | null) => void;
  selectFloor: (floorId: string) => void;
  updateLocationState: (locationId: string, updates: Partial<Location>) => void;
  deleteLocationAction: (locationId: string) => Promise<void>;
  
  // Save/Cancel
  saveChanges: () => Promise<void>;
  cancelChanges: () => Promise<void>;
  
  // Utilities
  getFilteredLocations: () => Location[];
  hasUnsavedChanges: () => boolean;
}

const GRID_SNAP = 20; // Snap to grid every 20 units

const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
};

const clampCoordinates = (x: number, y: number, width: number, height: number) => {
  return {
    x: Math.max(0, Math.min(x, 1000 - width)),
    y: Math.max(0, Math.min(y, 1000 - height))
  };
};

export function useFloorPlan(): UseFloorPlanReturn {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyLocations, setDirtyLocations] = useState<Set<string>>(new Set());
  
  // Keep track of original state for cancellation
  const [originalLocations, setOriginalLocations] = useState<Location[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getLocations();
      setFloors(data.data.floors);
      setLocations(data.data.locations);
      setOriginalLocations(JSON.parse(JSON.stringify(data.data.locations)));
      setDirtyLocations(new Set());
      
      if (data.data.floors.length > 0) {
        setSelectedFloorId(data.data.floors[0].id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createFloor = useCallback(async (name: string) => {
    try {
      const newFloor = await createFloorAPI(name);
      setFloors(prev => [...prev, newFloor]);
      toast.success('Étage créé');
    } catch (error) {
      toast.error('Erreur lors de la création de l\'étage');
      throw error;
    }
  }, []);

  const getDefaultDimensions = (shape: Location['shape']) => {
    switch (shape) {
      case 'circle':
        return { width: 80, height: 80 };
      case 'rectangle':
        return { width: 120, height: 80 };
      case 'square':
        return { width: 80, height: 80 };
    }
  };

  const addLocation = useCallback(async (shape: Location['shape'], floorId: string) => {
    try {
      const dims = getDefaultDimensions(shape);
      const newLocation = await createLocation({
        location_name: `Table ${locations.length + 1}`,
        seats: 2,
        floor_id: floorId,
        shape,
        angle: 0,
        x: 500,
        y: 500,
        ...dims,
        enabled: true
      });
      
      setLocations(prev => [...prev, newLocation]);
      setOriginalLocations(prev => [...prev, JSON.parse(JSON.stringify(newLocation))]);
      setDirtyLocations(prev => new Set([...prev, newLocation.location_id]));
      setSelectedLocationId(newLocation.location_id);
      toast.success('Table ajoutée');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la table');
      throw error;
    }
  }, [locations.length]);

  const updateLocationState = useCallback((locationId: string, updates: Partial<Location>) => {
    setLocations(prev =>
      prev.map(loc => {
        if (loc.location_id !== locationId) return loc;
        
        // Apply clamping for position updates
        let finalUpdates = updates;
        if (updates.x !== undefined || updates.y !== undefined) {
          const width = updates.width ?? loc.width;
          const height = updates.height ?? loc.height;
          const { x, y } = clampCoordinates(
            updates.x ?? loc.x,
            updates.y ?? loc.y,
            width,
            height
          );
          finalUpdates = { ...updates, x, y };
        }
        
        return { ...loc, ...finalUpdates };
      })
    );
    
    setDirtyLocations(prev => new Set([...prev, locationId]));
  }, []);

  const deleteLocationAction = useCallback(async (locationId: string) => {
    try {
      await deleteLocation(locationId);
      setLocations(prev => prev.filter(l => l.location_id !== locationId));
      setOriginalLocations(prev => prev.filter(l => l.location_id !== locationId));
      setDirtyLocations(prev => {
        const next = new Set(prev);
        next.delete(locationId);
        return next;
      });
      setSelectedLocationId(null);
      toast.success('Table supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  }, []);

  const saveChanges = useCallback(async () => {
    if (dirtyLocations.size === 0) {
      toast.info('Aucune modification à enregistrer');
      return;
    }

    try {
      setIsSaving(true);
      
      // Save all dirty locations
      const savePromises = Array.from(dirtyLocations).map(locationId => {
        const location = locations.find(l => l.location_id === locationId);
        if (!location) return Promise.resolve();
        
        return updateLocation(locationId, {
          location_name: location.location_name,
          seats: location.seats,
          shape: location.shape,
          angle: location.angle,
          x: location.x,
          y: location.y,
          width: location.width,
          height: location.height,
          enabled: location.enabled
        });
      });
      
      await Promise.all(savePromises);
      
      // Update original state
      setOriginalLocations(JSON.parse(JSON.stringify(locations)));
      setDirtyLocations(new Set());
      toast.success(`${dirtyLocations.size} modification(s) enregistrée(s)`);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [dirtyLocations, locations]);

  const cancelChanges = useCallback(async () => {
    setLocations(JSON.parse(JSON.stringify(originalLocations)));
    setDirtyLocations(new Set());
    setSelectedLocationId(null);
    toast.info('Modifications annulées');
  }, [originalLocations]);

  const getFilteredLocations = useCallback(() => {
    if (!selectedFloorId) return locations;
    return locations.filter(l => l.floor_id === selectedFloorId);
  }, [locations, selectedFloorId]);

  const hasUnsavedChanges = useCallback(() => {
    return dirtyLocations.size > 0;
  }, [dirtyLocations]);

  return {
    floors,
    locations,
    selectedFloorId,
    selectedLocationId,
    isLoading,
    isSaving,
    dirtyLocations,
    loadData,
    createFloor,
    addLocation,
    selectLocation: setSelectedLocationId,
    selectFloor: setSelectedFloorId,
    updateLocationState,
    deleteLocationAction,
    saveChanges,
    cancelChanges,
    getFilteredLocations,
    hasUnsavedChanges
  };
}
