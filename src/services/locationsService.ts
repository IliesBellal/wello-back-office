import { config } from '@/config';

// API Logger
const logAPI = (method: string, url: string, payload?: any) => {
  console.log(`[API] ${method} ${url}`);
  if (payload) {
    console.log('Payload:', payload);
  }
};

const mockData = {
  id: 10,
  data: {
    floors: [
      { id: "9", name: "RDC" },
      { id: "10", name: "Terrasse" }
    ],
    locations: [
      {
        location_id: "56",
        location_name: "Table 30",
        seats: 4,
        floor_id: "9",
        shape: "Ellipse" as const,
        angle: 0,
        current_x: 10,
        current_y: 20,
        current_width: 10,
        current_height: 10
      },
      {
        location_id: "57",
        location_name: "Table 2",
        seats: 2,
        floor_id: "9",
        shape: "Rectangle" as const,
        angle: 45,
        current_x: 40,
        current_y: 40,
        current_width: 12,
        current_height: 12
      },
      {
        location_id: "58",
        location_name: "Table 5",
        seats: 6,
        floor_id: "10",
        shape: "Ellipse" as const,
        angle: 0,
        current_x: 30,
        current_y: 30,
        current_width: 15,
        current_height: 15
      }
    ]
  }
};

export interface Floor {
  id: string;
  name: string;
}

export interface Location {
  location_id: string;
  location_name: string;
  seats: number;
  floor_id: string | null;
  shape: 'Rectangle' | 'Ellipse';
  angle: number;
  current_x: number;
  current_y: number;
  current_width: number;
  current_height: number;
}

export interface LocationsData {
  id: number;
  data: {
    floors: Floor[];
    locations: Location[];
  };
}

export const getLocations = async (): Promise<LocationsData> => {
  logAPI('GET', '/locations');
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockData;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/locations`);
  return response.json();
};

export const createFloor = async (name: string): Promise<Floor> => {
  logAPI('POST', '/floors', { name });
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newFloor: Floor = {
      id: String(Math.floor(Math.random() * 10000)),
      name
    };
    mockData.data.floors.push(newFloor);
    return newFloor;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/floors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return response.json();
};

export const updateFloor = async (floorId: string, name: string): Promise<void> => {
  logAPI('PATCH', `/floors/${floorId}`, { name });
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const floor = mockData.data.floors.find(f => f.id === floorId);
    if (floor) {
      floor.name = name;
    }
    return;
  }
  
  await fetch(`${config.apiBaseUrl}/floors/${floorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
};

export const deleteFloor = async (floorId: string): Promise<void> => {
  logAPI('DELETE', `/floors/${floorId}`);
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockData.data.floors = mockData.data.floors.filter(f => f.id !== floorId);
    mockData.data.locations = mockData.data.locations.filter(l => l.floor_id !== floorId);
    return;
  }
  
  await fetch(`${config.apiBaseUrl}/floors/${floorId}`, {
    method: 'DELETE'
  });
};

export const createLocation = async (data: Partial<Location>): Promise<Location> => {
  logAPI('POST', '/locations', data);
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newLocation: Location = {
      location_id: String(Math.floor(Math.random() * 10000)),
      location_name: data.location_name || 'New Table',
      seats: data.seats || 2,
      floor_id: data.floor_id || null,
      shape: data.shape || 'Rectangle',
      angle: data.angle || 0,
      current_x: data.current_x || 50,
      current_y: data.current_y || 50,
      current_width: data.current_width || 10,
      current_height: data.current_height || 10
    };
    mockData.data.locations.push(newLocation);
    return newLocation;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateLocation = async (locationId: string, data: Partial<Location>): Promise<void> => {
  logAPI('PATCH', `/locations/${locationId}`, data);
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const location = mockData.data.locations.find(l => l.location_id === locationId);
    if (location) {
      Object.assign(location, data);
    }
    return;
  }
  
  await fetch(`${config.apiBaseUrl}/locations/${locationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  logAPI('DELETE', `/locations/${locationId}`);
  
  if (config.useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockData.data.locations = mockData.data.locations.filter(l => l.location_id !== locationId);
    return;
  }
  
  await fetch(`${config.apiBaseUrl}/locations/${locationId}`, {
    method: 'DELETE'
  });
};
