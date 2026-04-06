import { apiClient, withMock, logAPI } from "@/services/apiClient";

// ============= Types =============
export interface Floor {
  id: string;
  name: string;
  enabled: boolean;
}

export type TableShape = 'circle' | 'rectangle' | 'square';

export interface Location {
  location_id: string;
  merchant_id?: string;
  location_name: string;
  seats: number;
  floor_id: string | null;
  shape: TableShape;
  angle: number;
  x: number; // 0-1000 (canvas virtual coordinates)
  y: number; // 0-1000
  width: number; // diameter for circle, side for square, width for rectangle
  height: number; // not used for circle/square
  enabled: boolean;
}

export interface LocationsData {
  id: number;
  data: {
    floors: Floor[];
    locations: Location[];
  };
}

// ============= Mock Data =============
const mockData: LocationsData = {
  id: 10,
  data: {
    floors: [
      { id: "1", name: "RDC", enabled: true },
      { id: "2", name: "Terrasse", enabled: true }
    ],
    locations: [
      {
        location_id: "1",
        location_name: "Table 1",
        seats: 4,
        floor_id: "1",
        shape: "circle",
        angle: 0,
        x: 200,
        y: 250,
        width: 80,
        height: 80,
        enabled: true
      },
      {
        location_id: "2",
        location_name: "Table 2",
        seats: 6,
        floor_id: "1",
        shape: "rectangle",
        angle: 45,
        x: 600,
        y: 300,
        width: 120,
        height: 80,
        enabled: true
      },
      {
        location_id: "3",
        location_name: "Table 3",
        seats: 4,
        floor_id: "1",
        shape: "square",
        angle: 0,
        x: 400,
        y: 600,
        width: 80,
        height: 80,
        enabled: true
      },
      {
        location_id: "4",
        location_name: "Table 4",
        seats: 2,
        floor_id: "2",
        shape: "circle",
        angle: 0,
        x: 300,
        y: 400,
        width: 60,
        height: 60,
        enabled: true
      }
    ]
  }
};

// ============= API Functions =============
export const getLocations = async (): Promise<LocationsData> => {
  logAPI('GET', '/locations');
  
  return withMock(
    () => ({
      ...mockData,
      data: {
        floors: [...mockData.data.floors],
        locations: [...mockData.data.locations]
      }
    }),
    () => apiClient.get<LocationsData>('/locations')
  );
};

export const createFloor = async (name: string): Promise<Floor> => {
  logAPI('POST', '/floors', { name });
  
  return withMock(
    () => {
      const newFloor: Floor = {
        id: String(Math.floor(Math.random() * 10000)),
        name,
        enabled: true
      };
      mockData.data.floors.push(newFloor);
      return newFloor;
    },
    () => apiClient.post<Floor>('/floors', { name })
  );
};

export const updateFloor = async (floorId: string, name: string): Promise<void> => {
  logAPI('PATCH', `/floors/${floorId}`, { name });
  
  return withMock(
    () => {
      const floor = mockData.data.floors.find(f => f.id === floorId);
      if (floor) {
        floor.name = name;
      }
    },
    () => apiClient.patch<void>(`/floors/${floorId}`, { name })
  );
};

export const deleteFloor = async (floorId: string): Promise<void> => {
  logAPI('DELETE', `/floors/${floorId}`);
  
  return withMock(
    () => {
      mockData.data.floors = mockData.data.floors.filter(f => f.id !== floorId);
      mockData.data.locations = mockData.data.locations.filter(l => l.floor_id !== floorId);
    },
    () => apiClient.delete<void>(`/floors/${floorId}`)
  );
};

export const createLocation = async (data: Partial<Location>): Promise<Location> => {
  logAPI('POST', '/locations', data);
  
  return withMock(
    () => {
      const newLocation: Location = {
        location_id: String(Math.floor(Math.random() * 10000)),
        location_name: data.location_name || 'New Table',
        seats: data.seats || 2,
        floor_id: data.floor_id || null,
        shape: data.shape || 'rectangle',
        angle: data.angle || 0,
        x: data.x ?? 500,
        y: data.y ?? 500,
        width: data.width || 80,
        height: data.height || 80,
        enabled: true
      };
      mockData.data.locations.push(newLocation);
      return newLocation;
    },
    () => apiClient.post<Location>('/locations', data)
  );
};

export const updateLocation = async (locationId: string, data: Partial<Location>): Promise<void> => {
  logAPI('PATCH', `/locations/${locationId}`, data);
  
  return withMock(
    () => {
      const location = mockData.data.locations.find(l => l.location_id === locationId);
      if (location) {
        Object.assign(location, data);
      }
    },
    () => apiClient.patch<void>(`/locations/${locationId}`, data)
  );
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  logAPI('DELETE', `/locations/${locationId}`);
  
  return withMock(
    () => {
      mockData.data.locations = mockData.data.locations.filter(l => l.location_id !== locationId);
    },
    () => apiClient.delete<void>(`/locations/${locationId}`)
  );
};
