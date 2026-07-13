import { apiClient, withMock, logAPI } from "@/services/apiClient";

// ============= Types =============
export interface Floor {
  id: string;
  name: string;
  enabled: boolean;
}

export type TableShape = 'circle' | 'rectangle' | 'square' | 'oval';

export interface TableAttributes {
  pmr: boolean;
  terrace: boolean;
  vip: boolean;
  window: boolean;
}

export interface LocationBooking {
  bookingId: string;
  bookingNumber: string;
  partySize: number;
  startsAt: string; // ISO 8601 UTC
  customerName: string;
}

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
  open_order_id?: string | null;
  available?: boolean;
  booking?: LocationBooking | null;
  attributes?: TableAttributes | null;
}

// Raw shape of a location as returned by the API (booking is snake_case there)
interface RawLocationBooking {
  booking_id: string;
  booking_number: string;
  party_size: number;
  starts_at: string;
  customer_name: string;
}

type RawLocation = Omit<Location, 'booking'> & { booking?: RawLocationBooking | null };

interface RawLocationsData {
  id: number;
  data: {
    floors: Floor[];
    locations: RawLocation[];
    obstacles: Obstacle[];
    areas?: Area[];
  };
}

const mapRawLocation = (raw: RawLocation): Location => ({
  ...raw,
  booking: raw.booking
    ? {
        bookingId: raw.booking.booking_id,
        bookingNumber: raw.booking.booking_number,
        partySize: raw.booking.party_size,
        startsAt: raw.booking.starts_at,
        customerName: raw.booking.customer_name
      }
    : null,
  attributes: raw.attributes ?? null
});

export type ObstacleType = 'wall' | 'bar' | 'stairs' | 'door';

export interface Obstacle {
  id: string;
  floorId: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  direction?: number; // uniquement pour type === 'door'
}

export interface AreaPoint {
  x: number;
  y: number;
}

export interface Area {
  id: string;
  floorId: string;
  name: string;
  strokeColor: string; // hex, ex : "#64748B"
  color: string; // hex, ex : "#E2E8F0"
  x: number;
  y: number;
  points: AreaPoint[];
  angle: number;
}

export interface LocationsData {
  id: number;
  data: {
    floors: Floor[];
    locations: Location[];
    obstacles: Obstacle[];
    areas: Area[];
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
        enabled: true,
        open_order_id: "order-42",
        available: false
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
        enabled: true,
        available: true,
        booking: {
          bookingId: "booking-7",
          bookingNumber: "RES-0007",
          partySize: 4,
          startsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          customerName: "Jean Dupont"
        }
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
      },
      {
        location_id: "5",
        location_name: "Table 5",
        seats: 5,
        floor_id: "1",
        shape: "oval",
        angle: 20,
        x: 650,
        y: 620,
        width: 140,
        height: 90,
        enabled: true
      }
    ],
    obstacles: [],
    areas: []
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
        locations: [...mockData.data.locations],
        obstacles: [...(mockData.data.obstacles || [])],
        areas: [...(mockData.data.areas || [])]
      }
    }),
    async () => {
      const raw = await apiClient.get<RawLocationsData>('/locations');
      return {
        ...raw,
        data: {
          ...raw.data,
          locations: raw.data.locations.map(mapRawLocation),
          areas: raw.data.areas || []
        }
      };
    }
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
  logAPI('POST', `/locations/floors/${data.floor_id || null}/tables`, data);
  
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
    () => apiClient.post<Location>(`/locations/floors/${data.floor_id || null}/tables`, data)
  );
};

export const updateLocation = async (locationId: string, data: Partial<Location>): Promise<void> => {
  logAPI('PATCH', `/locations/tables/${locationId}`, data);
  
  return withMock(
    () => {
      const location = mockData.data.locations.find(l => l.location_id === locationId);
      if (location) {
        Object.assign(location, data);
      }
    },
    () => apiClient.patch<void>(`/locations/tables/${locationId}`, data)
  );
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  logAPI('DELETE', `/locations/tables/${locationId}`);

  return withMock(
    () => {
      mockData.data.locations = mockData.data.locations.filter(l => l.location_id !== locationId);
    },
    () => apiClient.delete<void>(`/locations/tables/${locationId}`)
  );
};

export const createObstacle = async (
  floorId: string,
  data: Omit<Obstacle, 'id' | 'floorId'>
): Promise<{ id: string }> => {
  logAPI('POST', `/floors/${floorId}/obstacles`, data);

  return withMock(
    () => {
      const id = String(Math.floor(Math.random() * 10000));
      const newObstacle: Obstacle = { id, floorId, ...data };
      mockData.data.obstacles.push(newObstacle);
      return { id };
    },
    () => apiClient.post<{ id: string }>(`/floors/${floorId}/obstacles`, data)
  );
};

export const updateObstacle = async (
  floorId: string,
  obstacleId: string,
  data: Partial<Omit<Obstacle, 'id' | 'floorId'>>
): Promise<void> => {
  logAPI('PATCH', `/floors/${floorId}/obstacles/${obstacleId}`, data);

  return withMock(
    () => {
      const obstacle = mockData.data.obstacles.find(o => o.id === obstacleId);
      if (obstacle) {
        Object.assign(obstacle, data);
      }
    },
    () => apiClient.patch<void>(`/floors/${floorId}/obstacles/${obstacleId}`, data)
  );
};

export const deleteObstacle = async (floorId: string, obstacleId: string): Promise<void> => {
  logAPI('DELETE', `/floors/${floorId}/obstacles/${obstacleId}`);

  return withMock(
    () => {
      mockData.data.obstacles = mockData.data.obstacles.filter(o => o.id !== obstacleId);
    },
    () => apiClient.delete<void>(`/floors/${floorId}/obstacles/${obstacleId}`)
  );
};

export const createArea = async (
  floorId: string,
  data: Omit<Area, 'id' | 'floorId'>
): Promise<{ id: string }> => {
  logAPI('POST', `/floors/${floorId}/areas`, data);

  return withMock(
    () => {
      const id = String(Math.floor(Math.random() * 10000));
      const newArea: Area = { id, floorId, ...data };
      mockData.data.areas.push(newArea);
      return { id };
    },
    () => apiClient.post<{ id: string }>(`/floors/${floorId}/areas`, data)
  );
};

export const updateArea = async (
  floorId: string,
  areaId: string,
  data: Partial<Omit<Area, 'id' | 'floorId'>>
): Promise<void> => {
  logAPI('PATCH', `/floors/${floorId}/areas/${areaId}`, data);

  return withMock(
    () => {
      const area = mockData.data.areas.find(a => a.id === areaId);
      if (area) {
        Object.assign(area, data);
      }
    },
    () => apiClient.patch<void>(`/floors/${floorId}/areas/${areaId}`, data)
  );
};

export const deleteArea = async (floorId: string, areaId: string): Promise<void> => {
  logAPI('DELETE', `/floors/${floorId}/areas/${areaId}`);

  return withMock(
    () => {
      mockData.data.areas = mockData.data.areas.filter(a => a.id !== areaId);
    },
    () => apiClient.delete<void>(`/floors/${floorId}/areas/${areaId}`)
  );
};
