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
    active: true,
    commission_rate: 18,
    auto_accept_orders: true,
    kpis: {
      revenue: 5320000,
      orders: 287,
      avg_basket: 1853,
    },
    last_sync: '2024-04-08T10:15:00Z',
    synced_items: 76,
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

  // ════════════════════════════════════════════════════════════════════════════
  // STRIPE PAYMENT INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  getStripeStatus: async (): Promise<{ status: 'verified' | 'action_required' }> => {
    logAPI('GET', '/integrations/stripe/status');
    
    return withMock(
      () => ({ status: 'verified' as const }),
      () => apiClient.get<WelloApiResponse<{ status: 'verified' | 'action_required' }>>('/integrations/stripe/status').then(res => res.data.data)
    );
  },

  getStripeOnboardingLink: async (): Promise<{ url: string }> => {
    logAPI('POST', '/integrations/stripe/onboarding-link');
    
    return withMock(
      () => ({ url: 'https://connect.stripe.com/setup/mock/' }),
      () => apiClient.post<WelloApiResponse<{ url: string }>>('/integrations/stripe/onboarding-link', {}).then(res => res.data.data)
    );
  },

  getStripeBankAccounts: async (): Promise<{ accounts: Array<{
    id: string;
    bank_name: string;
    last4: string;
    currency: string;
    status: 'verified' | 'pending' | 'errored';
    account_holder_name?: string;
  }> }> => {
    logAPI('GET', '/integrations/stripe/bank-accounts');
    
    return withMock(
      () => ({
        accounts: [
          {
            id: 'ba_mock_1',
            bank_name: 'Crédit Agricole',
            last4: '1234',
            currency: 'EUR',
            status: 'verified',
            account_holder_name: 'Restaurant Nom',
          },
          {
            id: 'ba_mock_2',
            bank_name: 'BNP Paribas',
            last4: '5678',
            currency: 'EUR',
            status: 'pending',
          },
        ]
      }),
      () => apiClient.get<WelloApiResponse<{ accounts: any[] }>>('/integrations/stripe/bank-accounts').then(res => res.data.data)
    );
  },

  getStripeBankAccountLink: async (): Promise<{ url: string }> => {
    logAPI('POST', '/integrations/stripe/bank-account-link');
    
    return withMock(
      () => ({ url: 'https://connect.stripe.com/setup/bank-account/mock/' }),
      () => apiClient.post<WelloApiResponse<{ url: string }>>('/integrations/stripe/bank-account-link', {}).then(res => res.data.data)
    );
  },
};
