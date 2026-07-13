import { useState, useCallback, useEffect } from 'react';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  createFloor as createFloorAPI,
  updateFloor as updateFloorAPI,
  deleteFloor as deleteFloorAPI,
  createObstacle,
  updateObstacle,
  deleteObstacle,
  type Location,
  type Floor,
  type Obstacle,
  type ObstacleType
} from '@/services/locationsService';
import { toast } from 'sonner';

export interface FloorPlanState {
  floors: Floor[];
  locations: Location[];
  obstacles: Obstacle[];
  selectedFloorId: string | null;
  selectedLocationId: string | null;
  selectedObstacleId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  dirtyLocations: Set<string>;
  dirtyObstacles: Set<string>;
}

export interface UseFloorPlanReturn extends FloorPlanState {
  // Floor operations
  loadData: () => Promise<void>;
  createFloor: (name: string) => Promise<void>;
  renameFloor: (floorId: string, name: string) => Promise<void>;
  deleteFloorAction: (floorId: string) => Promise<void>;

  // Location operations
  addLocation: (shape: Location['shape'], floorId: string) => Promise<void>;
  selectLocation: (locationId: string | null) => void;
  selectFloor: (floorId: string) => void;
  updateLocationState: (locationId: string, updates: Partial<Location>) => void;
  deleteLocationAction: (locationId: string) => Promise<void>;

  // Obstacle operations
  addObstacle: (floorId: string, type: ObstacleType) => Promise<void>;
  setSelectedObstacleId: (obstacleId: string | null) => void;
  updateObstacleState: (obstacleId: string, changes: Partial<Obstacle>) => void;
  deleteObstacleAction: (floorId: string, obstacleId: string) => Promise<void>;

  // Save/Cancel
  saveChanges: () => Promise<void>;
  cancelChanges: () => Promise<void>;

  // Utilities
  getFilteredLocations: () => Location[];
  getFilteredObstacles: () => Obstacle[];
  hasUnsavedChanges: () => boolean;
}

export const GRID_SNAP = 20; // Snap to grid every 20 units

export const snapToGrid = (value: number): number => {
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
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyLocations, setDirtyLocations] = useState<Set<string>>(new Set());
  const [dirtyObstacles, setDirtyObstacles] = useState<Set<string>>(new Set());

  // Keep track of original state for cancellation
  const [originalLocations, setOriginalLocations] = useState<Location[]>([]);
  const [originalObstacles, setOriginalObstacles] = useState<Obstacle[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getLocations();
      setFloors(data.data.floors);
      setLocations(data.data.locations);
      setObstacles(data.data.obstacles || []);
      setOriginalLocations(JSON.parse(JSON.stringify(data.data.locations)));
      setOriginalObstacles(JSON.parse(JSON.stringify(data.data.obstacles || [])));
      setDirtyLocations(new Set());
      setDirtyObstacles(new Set());

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

  const renameFloor = useCallback(async (floorId: string, name: string) => {
    try {
      await updateFloorAPI(floorId, name);
      setFloors(prev => prev.map(f => (f.id === floorId ? { ...f, name } : f)));
      toast.success('Étage renommé');
    } catch (error) {
      toast.error('Erreur lors du renommage de l\'étage');
      throw error;
    }
  }, []);

  const deleteFloorAction = useCallback(async (floorId: string) => {
    try {
      await deleteFloorAPI(floorId);
      setFloors(prev => prev.filter(f => f.id !== floorId));
      toast.success('Étage supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'étage');
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
        
        // Apply snap-to-grid then clamping for position updates
        let finalUpdates = updates;
        if (updates.x !== undefined || updates.y !== undefined) {
          const width = updates.width ?? loc.width;
          const height = updates.height ?? loc.height;
          const { x, y } = clampCoordinates(
            snapToGrid(updates.x ?? loc.x),
            snapToGrid(updates.y ?? loc.y),
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

  const getDefaultObstacleDimensions = (type: ObstacleType) => {
    switch (type) {
      case 'wall':
        return { width: 120, height: 15, angle: 0 };
      case 'bar':
        return { width: 200, height: 50, angle: 0 };
      case 'stairs':
        return { width: 80, height: 80, angle: 0 };
      case 'door':
        return { width: 80, height: 12, angle: 0, direction: 90 };
    }
  };

  const addObstacle = useCallback(async (floorId: string, type: ObstacleType) => {
    try {
      const dims = getDefaultObstacleDimensions(type);
      const data = {
        type,
        x: 460,
        y: 460,
        ...dims
      };
      const { id } = await createObstacle(floorId, data);
      const newObstacle: Obstacle = { id, floorId, ...data };

      setObstacles(prev => [...prev, newObstacle]);
      setOriginalObstacles(prev => [...prev, JSON.parse(JSON.stringify(newObstacle))]);
      setSelectedObstacleId(id);
      setSelectedLocationId(null);
      toast.success('Obstacle ajouté');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de l\'obstacle');
      throw error;
    }
  }, []);

  const updateObstacleState = useCallback((obstacleId: string, changes: Partial<Obstacle>) => {
    setObstacles(prev =>
      prev.map(obstacle => (obstacle.id === obstacleId ? { ...obstacle, ...changes } : obstacle))
    );
    setDirtyObstacles(prev => new Set([...prev, obstacleId]));
  }, []);

  const deleteObstacleAction = useCallback(async (floorId: string, obstacleId: string) => {
    try {
      await deleteObstacle(floorId, obstacleId);
      setObstacles(prev => prev.filter(o => o.id !== obstacleId));
      setOriginalObstacles(prev => prev.filter(o => o.id !== obstacleId));
      setDirtyObstacles(prev => {
        const next = new Set(prev);
        next.delete(obstacleId);
        return next;
      });
      setSelectedObstacleId(null);
      toast.success('Obstacle supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'obstacle');
      throw error;
    }
  }, []);

  const saveChanges = useCallback(async () => {
    if (dirtyLocations.size === 0 && dirtyObstacles.size === 0) {
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
          floor_id: location.floor_id,
          shape: location.shape,
          angle: location.angle,
          x: location.x,
          y: location.y,
          width: location.width,
          height: location.height,
          enabled: location.enabled,
          ...(location.attributes ? { attributes: location.attributes } : {})
        });
      });

      await Promise.all(savePromises);

      // Save all dirty obstacles
      const obstacleSavePromises = Array.from(dirtyObstacles).map(obstacleId => {
        const obstacle = obstacles.find(o => o.id === obstacleId);
        if (!obstacle) return Promise.resolve();

        return updateObstacle(obstacle.floorId, obstacleId, {
          type: obstacle.type,
          x: obstacle.x,
          y: obstacle.y,
          width: obstacle.width,
          height: obstacle.height,
          angle: obstacle.angle,
          direction: obstacle.direction
        });
      });

      await Promise.all(obstacleSavePromises);

      // Update original state
      setOriginalLocations(JSON.parse(JSON.stringify(locations)));
      setOriginalObstacles(JSON.parse(JSON.stringify(obstacles)));
      setDirtyLocations(new Set());
      setDirtyObstacles(new Set());
      toast.success(`${dirtyLocations.size + dirtyObstacles.size} modification(s) enregistrée(s)`);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [dirtyLocations, locations, dirtyObstacles, obstacles]);

  const cancelChanges = useCallback(async () => {
    setLocations(JSON.parse(JSON.stringify(originalLocations)));
    setObstacles(JSON.parse(JSON.stringify(originalObstacles)));
    setDirtyLocations(new Set());
    setDirtyObstacles(new Set());
    setSelectedLocationId(null);
    setSelectedObstacleId(null);
    toast.info('Modifications annulées');
  }, [originalLocations, originalObstacles]);

  const getFilteredLocations = useCallback(() => {
    if (!selectedFloorId) return locations;
    return locations.filter(l => l.floor_id === selectedFloorId);
  }, [locations, selectedFloorId]);

  const getFilteredObstacles = useCallback(() => {
    if (!selectedFloorId) return obstacles;
    return obstacles.filter(o => o.floorId === selectedFloorId);
  }, [obstacles, selectedFloorId]);

  const hasUnsavedChanges = useCallback(() => {
    return dirtyLocations.size > 0 || dirtyObstacles.size > 0;
  }, [dirtyLocations, dirtyObstacles]);

  const selectLocation = useCallback((locationId: string | null) => {
    setSelectedLocationId(locationId || null);
    if (locationId) setSelectedObstacleId(null);
  }, []);

  return {
    floors,
    locations,
    obstacles,
    selectedFloorId,
    selectedLocationId,
    selectedObstacleId,
    isLoading,
    isSaving,
    dirtyLocations,
    dirtyObstacles,
    loadData,
    createFloor,
    renameFloor,
    deleteFloorAction,
    addLocation,
    selectLocation,
    selectFloor: setSelectedFloorId,
    updateLocationState,
    deleteLocationAction,
    addObstacle,
    setSelectedObstacleId: (obstacleId: string | null) => {
      setSelectedObstacleId(obstacleId);
      if (obstacleId) setSelectedLocationId(null);
    },
    updateObstacleState,
    deleteObstacleAction,
    saveChanges,
    cancelChanges,
    getFilteredLocations,
    getFilteredObstacles,
    hasUnsavedChanges
  };
}
