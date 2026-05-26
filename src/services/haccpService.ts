import { apiClient, withMock, logAPI } from '@/services/apiClient';

export interface HaccpActivityPerformer {
  id: string;
  name: string;
}

export type HaccpActivityTypeFilter = 'all' | 'temperatures' | 'cleanings';
export type HaccpActivityStatusFilter = 'all' | 'ok' | 'alert' | 'critical' | 'done';

export interface HaccpActivity {
  id: string;
  type: string;
  status: string;
  performed_at: string;
  performed_by: HaccpActivityPerformer;
  title: string;
  subtitle: string;
  metadata: Record<string, unknown>;
}

export interface HaccpActivitiesFilters {
  date: string;
}

export interface HaccpActivitiesPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface HaccpActivitiesPayload {
  activities: HaccpActivity[];
  filters: HaccpActivitiesFilters;
  pagination: HaccpActivitiesPagination;
  status: string;
}

interface HaccpActivitiesResponse {
  id: string;
  data: HaccpActivitiesPayload;
}

interface GetHaccpActivitiesParams {
  date: string;
  page?: number;
  pageSize?: number;
  type?: HaccpActivityTypeFilter;
  status?: HaccpActivityStatusFilter;
}

const mockActivities: HaccpActivity[] = [
  {
    id: 'haccp-csess-d92b4a07-d3bb-4be0-84f2-e50f850e70d2',
    type: 'cleanings',
    status: 'done',
    performed_at: '2026-05-25T15:21:25Z',
    performed_by: {
      id: '2',
      name: 'walid',
    },
    title: 'Session de nettoyage',
    subtitle: '1 surfaces nettoyees',
    metadata: {
      executions_count: 1,
      session_id: 'haccp-csess-d92b4a07-d3bb-4be0-84f2-e50f850e70d2',
    },
  },
  {
    id: 'haccp-ts-5b27209e-18aa-4d07-ac70-87d4f0046c49',
    type: 'temperatures',
    status: 'ok',
    performed_at: '2026-05-24T23:32:06Z',
    performed_by: {
      id: '2',
      name: 'walid',
    },
    title: 'Releve de temperatures',
    subtitle: '2 zones controlees',
    metadata: {
      readings_count: 2,
      session_id: 'haccp-ts-5b27209e-18aa-4d07-ac70-87d4f0046c49',
    },
  },
  {
    id: 'haccp-ts-a845b0f6-8f6f-48b8-96cb-9dca3674fd11',
    type: 'temperatures',
    status: 'alert',
    performed_at: '2026-05-25T08:12:10Z',
    performed_by: {
      id: '4',
      name: 'sarah',
    },
    title: 'Anomalie de temperature',
    subtitle: 'Chambre froide +8 C',
    metadata: {
      zone: 'Chambre froide',
      expected_max: 4,
      measured: 8,
    },
  },
  {
    id: 'haccp-csess-4f18f3bf-8508-4a4f-bbc1-7f5b7ed84784',
    type: 'cleanings',
    status: 'critical',
    performed_at: '2026-05-25T10:45:00Z',
    performed_by: {
      id: '7',
      name: 'nadia',
    },
    title: 'Session de nettoyage',
    subtitle: '1 surfaces critiques',
    metadata: {
      executions_count: 1,
      session_id: 'haccp-csess-4f18f3bf-8508-4a4f-bbc1-7f5b7ed84784',
    },
  },
];

const buildMockPayload = (
  date: string,
  page: number,
  pageSize: number,
  type: HaccpActivityTypeFilter,
  status: HaccpActivityStatusFilter
): HaccpActivitiesPayload => {
  const filtered = mockActivities.filter((activity) => {
    const matchesDate = activity.performed_at.startsWith(date);
    const matchesType = type === 'all' ? true : activity.type === type;
    const matchesStatus = status === 'all' ? true : activity.status === status;
    return matchesDate && matchesType && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    activities: filtered.slice(start, end),
    filters: { date },
    pagination: {
      page: safePage,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    },
    status: 'success',
  };
};

// ═══ TEMPERATURE SESSION ═══

export interface TemperatureReading {
  id: string;
  session_id: string;
  merchant_id: string;
  zone_id: string;
  zone_name: string;
  photo_url?: string | null;
  comment?: string | null;
  value: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemperatureSession {
  id: string;
  merchant_id: string;
  status: string;
  performed_at: string;
  performed_by: HaccpActivityPerformer;
  readings: TemperatureReading[];
}

interface TemperatureSessionResponse {
  id: string;
  data: {
    status: string;
    temperature_session: TemperatureSession;
  };
}

const mockTemperatureSession: TemperatureSession = {
  id: 'haccp-ts-5b27209e-18aa-4d07-ac70-87d4f0046c49',
  merchant_id: '2',
  status: 'ok',
  performed_at: '2026-05-24T23:32:06Z',
  performed_by: { id: '2', name: 'walid' },
  readings: [
    {
      id: 'haccp-tr-d2743dd0-418c-4143-b7cc-b253a76abf7d',
      session_id: 'haccp-ts-5b27209e-18aa-4d07-ac70-87d4f0046c49',
      merchant_id: '2',
      zone_id: 'haccp-tz-165781f2-f933-42b1-8ad5-880883de643f',
      zone_name: 'Chambre froide',
      photo_url: 'https://placehold.co/300x300',
      comment: 'Température dans la plage attendue.',
      value: 4.2,
      status: 'ok',
      created_by: '2',
      created_at: '2026-05-24T23:32:06Z',
      updated_at: '2026-05-24T23:32:06Z',
    },
    {
      id: 'haccp-tr-fc70f990-eae1-4fb3-a504-8d4f11d74df5',
      session_id: 'haccp-ts-5b27209e-18aa-4d07-ac70-87d4f0046c49',
      merchant_id: '2',
      zone_id: 'haccp-tz-9e78706b-d7f6-440d-bc2b-73d3414110e1',
      zone_name: 'Cuisine chaude',
      photo_url: null,
      comment: null,
      value: 3.8,
      status: 'ok',
      created_by: '2',
      created_at: '2026-05-24T23:32:06Z',
      updated_at: '2026-05-24T23:32:06Z',
    },
  ],
};

export const getTemperatureSession = async (sessionId: string): Promise<TemperatureSession> => {
  const endpoint = `/haccp/temperature-sessions/${sessionId}`;
  logAPI('GET', endpoint);

  return withMock(
    () => ({ ...mockTemperatureSession, id: sessionId }),
    async () => {
      const response = await apiClient.get<TemperatureSessionResponse>(endpoint);
      return response.data.temperature_session;
    }
  );
};

// ═══ CLEANING ZONES / SURFACES / SESSIONS ═══

export interface HaccpCleaningComputed {
  due_today: boolean;
  overdue: boolean;
  last_execution_at: string | null;
}

export interface HaccpCleaningSurface {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  frequency_unit: 'day' | 'week' | 'month';
  frequency_count: number;
  active: boolean;
  computed: HaccpCleaningComputed;
}

export interface HaccpCleaningZone {
  id: string;
  merchant_id: string;
  name: string;
  enabled: boolean;
  surfaces: HaccpCleaningSurface[];
  created_at: string;
  updated_at: string;
}

export interface CreateHaccpCleaningZonePayload {
  zone: string;
}

export interface UpdateHaccpCleaningZonePayload {
  zone: string;
}

export interface UpsertHaccpCleaningSurfacePayload {
  zone_id: string;
  name: string;
  frequency_unit: 'day' | 'week' | 'month';
  frequency_count: number;
}

interface HaccpCleaningZonesResponse {
  id: string;
  data: {
    cleaning_zones: HaccpCleaningZone[];
    status: string;
  };
}

interface HaccpCleaningZoneResponse {
  id: string;
  data: {
    cleaning_zone: HaccpCleaningZone;
    status: string;
  };
}

interface HaccpCleaningSurfacesResponse {
  id: string;
  data: {
    cleaning_surfaces: HaccpCleaningSurface[];
    status: string;
  };
}

interface HaccpCleaningSurfaceResponse {
  id: string;
  data: {
    cleaning_surface: HaccpCleaningSurface;
    status: string;
  };
}

export interface HaccpCleaningSessionExecution {
  id: string;
  session_id: string;
  surface_id: string;
  surface_name: string;
  zone_id: string;
  zone_name: string;
  merchant_id: string;
  comment: string;
  photo_url: string | null;
  status: string;
  created_by: string;
  performed_by: HaccpActivityPerformer;
  created_at: string;
  updated_at: string;
}

export interface HaccpCleaningSession {
  id: string;
  merchant_id: string;
  status: string;
  performed_at: string;
  performed_by: HaccpActivityPerformer;
  executions: HaccpCleaningSessionExecution[];
}

interface HaccpCleaningSessionResponse {
  id: string;
  data: {
    cleaning_session: HaccpCleaningSession;
    status: string;
  };
}

let mockCleaningZones: HaccpCleaningZone[] = [
  {
    id: 'haccp-cz-6526c44d-c6f4-4a3a-8ee6-70394ecfaf2f',
    merchant_id: '2',
    name: 'Cuisine chaude',
    enabled: true,
    surfaces: [
      {
        id: 'haccp-cs-789b3edb-f714-498e-9c7e-ca165c5a6c2b',
        zone_id: 'haccp-cz-6526c44d-c6f4-4a3a-8ee6-70394ecfaf2f',
        zone_name: 'Cuisine chaude',
        name: 'Plan de travail',
        frequency_unit: 'day',
        frequency_count: 1,
        active: true,
        computed: {
          due_today: true,
          overdue: false,
          last_execution_at: null,
        },
      },
    ],
    created_at: '2026-05-25T15:12:00Z',
    updated_at: '2026-05-25T15:12:00Z',
  },
];

const cloneSurface = (surface: HaccpCleaningSurface): HaccpCleaningSurface => ({
  ...surface,
  computed: { ...surface.computed },
});

const cloneZone = (zone: HaccpCleaningZone): HaccpCleaningZone => ({
  ...zone,
  surfaces: zone.surfaces.map(cloneSurface),
});

export const getHaccpCleaningZones = async (): Promise<HaccpCleaningZone[]> => {
  const endpoint = '/haccp/cleaning-zones';
  logAPI('GET', endpoint);

  return withMock(
    () => mockCleaningZones.map(cloneZone),
    async () => {
      const response = await apiClient.get<HaccpCleaningZonesResponse>(endpoint);
      return response.data.cleaning_zones;
    }
  );
};

export const createHaccpCleaningZone = async (
  payload: CreateHaccpCleaningZonePayload
): Promise<HaccpCleaningZone> => {
  const endpoint = '/haccp/cleaning-zones';
  logAPI('POST', endpoint, payload);

  return withMock(
    () => {
      const now = new Date().toISOString();
      const zone: HaccpCleaningZone = {
        id: `haccp-cz-${Date.now()}`,
        merchant_id: '2',
        name: payload.zone,
        enabled: true,
        surfaces: [],
        created_at: now,
        updated_at: now,
      };
      mockCleaningZones = [zone, ...mockCleaningZones];
      return cloneZone(zone);
    },
    async () => {
      const response = await apiClient.post<HaccpCleaningZoneResponse>(endpoint, payload);
      return response.data.cleaning_zone;
    }
  );
};

export const updateHaccpCleaningZone = async (
  zoneId: string,
  payload: UpdateHaccpCleaningZonePayload
): Promise<HaccpCleaningZone> => {
  const endpoint = `/haccp/cleaning-zones/${zoneId}`;
  logAPI('PATCH', endpoint, payload);

  return withMock(
    () => {
      const index = mockCleaningZones.findIndex((zone) => zone.id === zoneId);
      if (index === -1) {
        throw new Error('Zone de nettoyage introuvable');
      }

      const updated: HaccpCleaningZone = {
        ...mockCleaningZones[index],
        name: payload.zone,
        updated_at: new Date().toISOString(),
      };

      mockCleaningZones = mockCleaningZones.map((zone) => (zone.id === zoneId ? updated : zone));
      return cloneZone(updated);
    },
    async () => {
      const response = await apiClient.patch<HaccpCleaningZoneResponse>(endpoint, payload);
      return response.data.cleaning_zone;
    }
  );
};

export const deleteHaccpCleaningZone = async (zoneId: string): Promise<void> => {
  const endpoint = `/haccp/cleaning-zones/${zoneId}`;
  logAPI('DELETE', endpoint);

  return withMock(
    () => {
      mockCleaningZones = mockCleaningZones.filter((zone) => zone.id !== zoneId);
    },
    async () => {
      await apiClient.delete<void>(endpoint);
    }
  );
};

export const getHaccpCleaningSurfaces = async (): Promise<HaccpCleaningSurface[]> => {
  const endpoint = '/haccp/cleaning-surfaces';
  logAPI('GET', endpoint);

  return withMock(
    () => mockCleaningZones.flatMap((zone) => zone.surfaces.map(cloneSurface)),
    async () => {
      const response = await apiClient.get<HaccpCleaningSurfacesResponse>(endpoint);
      return response.data.cleaning_surfaces;
    }
  );
};

export const createHaccpCleaningSurface = async (
  payload: UpsertHaccpCleaningSurfacePayload
): Promise<HaccpCleaningSurface> => {
  const endpoint = '/haccp/cleaning-surfaces';
  logAPI('POST', endpoint, payload);

  return withMock(
    () => {
      const zone = mockCleaningZones.find((item) => item.id === payload.zone_id);
      if (!zone) {
        throw new Error('Zone de nettoyage introuvable');
      }

      const surface: HaccpCleaningSurface = {
        id: `haccp-cs-${Date.now()}`,
        zone_id: payload.zone_id,
        zone_name: zone.name,
        name: payload.name,
        frequency_unit: payload.frequency_unit,
        frequency_count: payload.frequency_count,
        active: true,
        computed: {
          due_today: true,
          overdue: false,
          last_execution_at: null,
        },
      };

      mockCleaningZones = mockCleaningZones.map((item) => {
        if (item.id !== payload.zone_id) return item;
        return {
          ...item,
          surfaces: [surface, ...item.surfaces],
          updated_at: new Date().toISOString(),
        };
      });

      return cloneSurface(surface);
    },
    async () => {
      const response = await apiClient.post<HaccpCleaningSurfaceResponse>(endpoint, payload);
      return response.data.cleaning_surface;
    }
  );
};

export const updateHaccpCleaningSurface = async (
  surfaceId: string,
  payload: UpsertHaccpCleaningSurfacePayload
): Promise<HaccpCleaningSurface> => {
  const endpoint = `/haccp/cleaning-surfaces/${surfaceId}`;
  logAPI('PATCH', endpoint, payload);

  return withMock(
    () => {
      const targetZone = mockCleaningZones.find((zone) => zone.id === payload.zone_id);
      if (!targetZone) {
        throw new Error('Zone de nettoyage introuvable');
      }

      let updatedSurface: HaccpCleaningSurface | null = null;

      mockCleaningZones = mockCleaningZones.map((zone) => {
        const hasSurface = zone.surfaces.some((surface) => surface.id === surfaceId);
        if (!hasSurface && zone.id !== payload.zone_id) {
          return zone;
        }

        if (hasSurface && zone.id !== payload.zone_id) {
          return {
            ...zone,
            surfaces: zone.surfaces.filter((surface) => surface.id !== surfaceId),
            updated_at: new Date().toISOString(),
          };
        }

        if (zone.id === payload.zone_id) {
          const existing = zone.surfaces.find((surface) => surface.id === surfaceId);
          const base = existing ?? {
            id: surfaceId,
            zone_id: payload.zone_id,
            zone_name: targetZone.name,
            name: payload.name,
            frequency_unit: payload.frequency_unit,
            frequency_count: payload.frequency_count,
            active: true,
            computed: {
              due_today: true,
              overdue: false,
              last_execution_at: null,
            },
          };

          updatedSurface = {
            ...base,
            zone_id: payload.zone_id,
            zone_name: targetZone.name,
            name: payload.name,
            frequency_unit: payload.frequency_unit,
            frequency_count: payload.frequency_count,
          };

          const nextSurfaces = existing
            ? zone.surfaces.map((surface) => (surface.id === surfaceId ? updatedSurface as HaccpCleaningSurface : surface))
            : [updatedSurface as HaccpCleaningSurface, ...zone.surfaces];

          return {
            ...zone,
            surfaces: nextSurfaces,
            updated_at: new Date().toISOString(),
          };
        }

        return zone;
      });

      if (!updatedSurface) {
        throw new Error('Surface de nettoyage introuvable');
      }

      return cloneSurface(updatedSurface);
    },
    async () => {
      const response = await apiClient.patch<HaccpCleaningSurfaceResponse>(endpoint, payload);
      return response.data.cleaning_surface;
    }
  );
};

export const deleteHaccpCleaningSurface = async (surfaceId: string): Promise<void> => {
  const endpoint = `/haccp/cleaning-surfaces/${surfaceId}`;
  logAPI('DELETE', endpoint);

  return withMock(
    () => {
      mockCleaningZones = mockCleaningZones.map((zone) => ({
        ...zone,
        surfaces: zone.surfaces.filter((surface) => surface.id !== surfaceId),
      }));
    },
    async () => {
      await apiClient.delete<void>(endpoint);
    }
  );
};

const mockCleaningSession: HaccpCleaningSession = {
  id: 'haccp-csess-d92b4a07-d3bb-4be0-84f2-e50f850e70d2',
  merchant_id: '2',
  status: 'done',
  performed_at: '2026-05-25T15:21:25Z',
  performed_by: {
    id: '2',
    name: 'walid',
  },
  executions: [
    {
      id: 'haccp-ce-1d1aa50f-0669-4043-8363-0ed027edf5d4',
      session_id: 'haccp-csess-d92b4a07-d3bb-4be0-84f2-e50f850e70d2',
      surface_id: 'haccp-cs-789b3edb-f714-498e-9c7e-ca165c5a6c2b',
      surface_name: 'Plan de travail',
      zone_id: 'haccp-cz-6526c44d-c6f4-4a3a-8ee6-70394ecfaf2f',
      zone_name: 'Cuisine chaude',
      merchant_id: '2',
      comment: 'Ok',
      photo_url: 'https://placehold.co/400',
      status: 'done',
      created_by: '2',
      performed_by: {
        id: '2',
        name: 'walid',
      },
      created_at: '2026-05-25T15:21:25Z',
      updated_at: '2026-05-25T15:21:25Z',
    },
  ],
};

export const getHaccpCleaningSession = async (sessionId: string): Promise<HaccpCleaningSession> => {
  const endpoint = `/haccp/cleaning-sessions/${sessionId}`;
  logAPI('GET', endpoint);

  return withMock(
    () => ({
      ...mockCleaningSession,
      id: sessionId,
      executions: mockCleaningSession.executions.map((execution) => ({
        ...execution,
        session_id: sessionId,
      })),
    }),
    async () => {
      const response = await apiClient.get<HaccpCleaningSessionResponse>(endpoint);
      return response.data.cleaning_session;
    }
  );
};

// ═══ SETTINGS ═══

export interface HaccpSettings {
  temp_entry_required: boolean;
  temp_corrective_actions: boolean;
  temp_failure_photo_required: boolean;
  temp_block_past_dates: boolean;
  traceability_product_name: boolean;
  traceability_block_past_dates: boolean;
  cleaning_photo: boolean;
  cleaning_block_past_dates: boolean;
  reception_other_products: boolean;
  reception_control_sample: boolean;
  reception_block_past_dates: boolean;
  reception_photo: boolean;
  reception_non_conformities: boolean;
  oils_block_past_dates: boolean;
  oils_polar_compound_rate: boolean;
  oils_photo: boolean;
  production_block_past_dates: boolean;
  production_traceability: boolean;
  cooling_block_past_dates: boolean;
  freezing_block_past_dates: boolean;
  reheating_block_past_dates: boolean;
  holding_block_past_dates: boolean;
  holding_corrective_actions: boolean;
  notif_authorization: boolean;
  notif_security: boolean;
}

interface HaccpSettingsResponse {
  id: string;
  data: {
    settings: HaccpSettings;
    status: string;
  };
}

const defaultHaccpSettings: HaccpSettings = {
  temp_entry_required: true,
  temp_corrective_actions: true,
  temp_failure_photo_required: true,
  temp_block_past_dates: true,
  traceability_product_name: true,
  traceability_block_past_dates: true,
  cleaning_photo: true,
  cleaning_block_past_dates: true,
  reception_other_products: true,
  reception_control_sample: true,
  reception_block_past_dates: true,
  reception_photo: true,
  reception_non_conformities: true,
  oils_block_past_dates: true,
  oils_polar_compound_rate: true,
  oils_photo: true,
  production_block_past_dates: true,
  production_traceability: true,
  cooling_block_past_dates: true,
  freezing_block_past_dates: true,
  reheating_block_past_dates: true,
  holding_block_past_dates: true,
  holding_corrective_actions: true,
  notif_authorization: true,
  notif_security: true,
};

let mockHaccpSettings: HaccpSettings = { ...defaultHaccpSettings };

export const getHaccpSettings = async (): Promise<HaccpSettings> => {
  const endpoint = '/haccp/settings';
  logAPI('GET', endpoint);

  return withMock(
    () => ({ ...mockHaccpSettings }),
    async () => {
      const response = await apiClient.get<HaccpSettingsResponse>(endpoint);
      return response.data.settings;
    }
  );
};

export const updateHaccpSettings = async (payload: HaccpSettings): Promise<HaccpSettings> => {
  const endpoint = '/haccp/settings';
  logAPI('PUT', endpoint, payload);

  return withMock(
    () => {
      mockHaccpSettings = { ...payload };
      return { ...mockHaccpSettings };
    },
    async () => {
      const response = await apiClient.put<HaccpSettingsResponse>(endpoint, payload);
      return response.data.settings;
    }
  );
};

// ═══ TEMPERATURE ZONES ═══

export interface HaccpTemperatureZone {
  id: string;
  merchant_id: string;
  name: string;
  target_temp_min: number;
  target_temp_max: number;
  created_at: string;
  updated_at: string;
  enabled: boolean;
}

export interface CreateHaccpTemperatureZonePayload {
  name: string;
  target_temp_min: number;
  target_temp_max: number;
}

export interface UpdateHaccpTemperatureZonePayload {
  name: string;
  target_temp_min: number;
  target_temp_max: number;
}

interface HaccpTemperatureZonesResponse {
  id: string;
  data: {
    status: string;
    zones: HaccpTemperatureZone[];
  };
}

interface HaccpTemperatureZoneResponse {
  id: string;
  data: {
    status: string;
    zone: HaccpTemperatureZone;
  };
}

let mockTemperatureZones: HaccpTemperatureZone[] = [
  {
    id: 'haccp-tz-9e78706b-d7f6-440d-bc2b-73d3414110e1',
    merchant_id: '2',
    name: 'seconde zone',
    target_temp_min: 2.5,
    target_temp_max: 6,
    created_at: '2026-05-24T23:14:21Z',
    updated_at: '2026-05-24T23:14:21Z',
    enabled: true,
  },
  {
    id: 'haccp-tz-165781f2-f933-42b1-8ad5-880883de643f',
    merchant_id: '2',
    name: 'premiere zone',
    target_temp_min: 2.5,
    target_temp_max: 6,
    created_at: '2026-05-24T23:14:16Z',
    updated_at: '2026-05-24T23:14:16Z',
    enabled: true,
  },
];

export const getHaccpTemperatureZones = async (): Promise<HaccpTemperatureZone[]> => {
  const endpoint = '/haccp/temperature-zones';
  logAPI('GET', endpoint);

  return withMock(
    () => mockTemperatureZones.map((zone) => ({ ...zone })),
    async () => {
      const response = await apiClient.get<HaccpTemperatureZonesResponse>(endpoint);
      return response.data.zones;
    }
  );
};

export const createHaccpTemperatureZone = async (
  payload: CreateHaccpTemperatureZonePayload
): Promise<HaccpTemperatureZone> => {
  const endpoint = '/haccp/temperature-zones';
  logAPI('POST', endpoint, payload);

  return withMock(
    () => {
      const now = new Date().toISOString();
      const zone: HaccpTemperatureZone = {
        id: `haccp-tz-${Date.now()}`,
        merchant_id: '2',
        name: payload.name,
        target_temp_min: payload.target_temp_min,
        target_temp_max: payload.target_temp_max,
        created_at: now,
        updated_at: now,
        enabled: true,
      };
      mockTemperatureZones = [zone, ...mockTemperatureZones];
      return { ...zone };
    },
    async () => {
      const response = await apiClient.post<HaccpTemperatureZoneResponse>(endpoint, payload);
      return response.data.zone;
    }
  );
};

export const updateHaccpTemperatureZone = async (
  zoneId: string,
  payload: UpdateHaccpTemperatureZonePayload
): Promise<HaccpTemperatureZone> => {
  const endpoint = `/haccp/temperature-zones/${zoneId}`;
  logAPI('PATCH', endpoint, payload);

  return withMock(
    () => {
      const index = mockTemperatureZones.findIndex((zone) => zone.id === zoneId);
      if (index === -1) {
        throw new Error('Zone de temperature introuvable');
      }

      const updated: HaccpTemperatureZone = {
        ...mockTemperatureZones[index],
        ...payload,
        updated_at: new Date().toISOString(),
      };

      mockTemperatureZones = mockTemperatureZones.map((zone) => (zone.id === zoneId ? updated : zone));
      return { ...updated };
    },
    async () => {
      const response = await apiClient.patch<HaccpTemperatureZoneResponse>(endpoint, payload);
      return response.data.zone;
    }
  );
};

export const deleteHaccpTemperatureZone = async (zoneId: string): Promise<void> => {
  const endpoint = `/haccp/temperature-zones/${zoneId}`;
  logAPI('DELETE', endpoint);

  return withMock(
    () => {
      mockTemperatureZones = mockTemperatureZones.filter((zone) => zone.id !== zoneId);
    },
    async () => {
      await apiClient.delete<void>(endpoint);
    }
  );
};

// ═══ ACTIVITIES ═══

export const getHaccpActivities = async (
  params: GetHaccpActivitiesParams
): Promise<HaccpActivitiesPayload> => {
  const endpoint = '/haccp/activities';
  const {
    date,
    page = 1,
    pageSize = 20,
    type = 'all',
    status = 'all',
  } = params;

  const queryParams = new URLSearchParams({
    date,
    page: String(page),
    page_size: String(pageSize),
  });

  if (type !== 'all') {
    queryParams.set('type', type);
  }

  if (status !== 'all') {
    queryParams.set('status', status);
  }

  logAPI('GET', endpoint, {
    date,
    page,
    page_size: pageSize,
    type,
    status,
  });

  return withMock(
    () => buildMockPayload(date, page, pageSize, type, status),
    async () => {
      const response = await apiClient.get<HaccpActivitiesResponse>(`${endpoint}?${queryParams.toString()}`);
      return response.data;
    }
  );
};