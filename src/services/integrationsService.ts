import { apiClient, USE_MOCK_DATA, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";

// ============= Types =============
export interface IntegrationKPIs {
  revenue: number;
  orders: number;
  avg_basket: number;
}

export interface IntegrationStatus {
  platform: 'uber_eats' | 'deliveroo';
  active: boolean;
  commission_rate: number;
  auto_accept_orders: boolean;
  kpis: IntegrationKPIs;
  last_sync: string;
  synced_items: number;
}

export type GetIntegrationResponse = WelloApiResponse<{ integration: IntegrationStatus }>;
export type PatchIntegrationResponse = WelloApiResponse<{ integration: IntegrationStatus }>;

// ============= Mock Data =============
const mockIntegrations: Record<string, IntegrationStatus> = {
  uber_eats: {
    platform: 'uber_eats',
    active: true,
    commission_rate: 15,
    auto_accept_orders: true,
    kpis: {
      revenue: 4850000,
      orders: 324,
      avg_basket: 1498,
    },
    last_sync: '2024-04-08T10:30:00Z',
    synced_items: 89,
  },
  deliveroo: {
    platform: 'deliveroo',
    active: false,
    commission_rate: 0,
    auto_accept_orders: false,
    kpis: {
      revenue: 0,
      orders: 0,
      avg_basket: 0,
    },
    last_sync: '',
    synced_items: 0,
  },
};

// ============= API Functions =============
export const integrationsService = {
  getUberEatsStatus: async (): Promise<IntegrationStatus> => {
    logAPI('GET', '/integrations/uber-eats');
    
    return withMock(
      () => mockIntegrations.uber_eats,
      () => apiClient.get<GetIntegrationResponse>('/integrations/uber-eats').then(res => res.data.integration)
    );
  },

  getDeliverooStatus: async (): Promise<IntegrationStatus> => {
    logAPI('GET', '/integrations/deliveroo');
    
    return withMock(
      () => mockIntegrations.deliveroo,
      () => apiClient.get<GetIntegrationResponse>('/integrations/deliveroo').then(res => res.data.integration)
    );
  },

  updateUberEats: async (data: {
    commission_rate: number;
    auto_accept_orders: boolean;
  }): Promise<IntegrationStatus> => {
    logAPI('PATCH', '/integrations/uber-eats', data);
    
    return withMock(
      () => ({ ...mockIntegrations.uber_eats, ...data }),
      () => apiClient.patch<PatchIntegrationResponse>('/integrations/uber-eats', data).then(res => res.data.integration)
    );
  },

  updateDeliveroo: async (data: {
    commission_rate: number;
    auto_accept_orders: boolean;
  }): Promise<IntegrationStatus> => {
    logAPI('PATCH', '/integrations/deliveroo', data);
    
    return withMock(
      () => ({ ...mockIntegrations.deliveroo, ...data }),
      () => apiClient.patch<PatchIntegrationResponse>('/integrations/deliveroo', data).then(res => res.data.integration)
    );
  },

  disableUberEats: async (): Promise<IntegrationStatus> => {
    logAPI('PATCH', '/integrations/uber-eats/disable');
    
    return withMock(
      () => ({ ...mockIntegrations.uber_eats, active: false }),
      () => apiClient.patch<PatchIntegrationResponse>('/integrations/uber-eats/disable', {}).then(res => res.data.integration)
    );
  },

  disableDeliveroo: async (): Promise<IntegrationStatus> => {
    logAPI('PATCH', '/integrations/deliveroo/disable');
    
    return withMock(
      () => ({ ...mockIntegrations.deliveroo, active: false }),
      () => apiClient.patch<PatchIntegrationResponse>('/integrations/deliveroo/disable', {}).then(res => res.data.integration)
    );
  },

  syncUberEatsMenu: async (): Promise<{ synced_items: number }> => {
    logAPI('PATCH', '/menu/uber-eats/sync');
    
    return withMock(
      () => ({ synced_items: mockIntegrations.uber_eats.synced_items }),
      () => apiClient.patch<WelloApiResponse<{ synced_items: number }>>('/menu/uber-eats/sync', {}).then(res => res.data)
    );
  },

  syncDeliverooMenu: async (): Promise<{ synced_items: number }> => {
    logAPI('PATCH', '/menu/deliveroo/sync');
    
    return withMock(
      () => ({ synced_items: mockIntegrations.deliveroo.synced_items }),
      () => apiClient.patch<WelloApiResponse<{ synced_items: number }>>('/menu/deliveroo/sync', {}).then(res => res.data)
    );
  },
};
