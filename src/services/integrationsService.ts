import { apiClient, USE_MOCK_DATA, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";

// ============= Types =============
export interface IntegrationKPIs {
  revenue: number;
  orders: number;
  avg_basket: number;
}

export interface IntegrationStatus {
  platform: 'uber_eats' | 'deliveroo' | 'scannorder';
  active: boolean;
  closed_until?: string | null;
  commission_rate: number;
  auto_accept_orders: boolean;
  preparation_time_minutes?: number;
  kpis: IntegrationKPIs;
  last_sync: string | null;
  synced_items: number;
  logo_url?: string | null;
  banner_url?: string | null;
  primary_color?: string | null;
  header_title?: string | null;
  header_text?: string | null;
  takeaway_enabled?: boolean;
  takeaway_auto_accept?: boolean;
  delivery_enabled?: boolean;
  delivery_auto_accept?: boolean;
  delivery_distance_limit?: number;
}

export type GetIntegrationResponse = WelloApiResponse<{ integration: IntegrationStatus }>;
export type PatchIntegrationResponse = WelloApiResponse<{ integration: IntegrationStatus }>;
export type IntegrationPlatform = 'uber_eats' | 'deliveroo' | 'scannorder';

// ============= Mock Data =============
const mockIntegrations: Record<string, IntegrationStatus> = {
  uber_eats: {
    platform: 'uber_eats',
    active: true,
    commission_rate: 15,
    auto_accept_orders: true,
    preparation_time_minutes: 20,
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
    preparation_time_minutes: 25,
    kpis: {
      revenue: 5320000,
      orders: 287,
      avg_basket: 1853,
    },
    last_sync: '2024-04-08T10:15:00Z',
    synced_items: 76,
  },
  scanorder: {
    platform: 'scannorder',
    active: true,
    commission_rate: 0,
    auto_accept_orders: true,
    kpis: {
      revenue: 2100000,
      orders: 158,
      avg_basket: 1329,
    },
    last_sync: '2024-04-08T09:45:00Z',
    synced_items: 94,
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

  getScanNOrderStatus: async (): Promise<IntegrationStatus> => {
    logAPI('GET', '/integrations/scannorder');

    return withMock(
      () => mockIntegrations.scanorder,
      () => apiClient.get<GetIntegrationResponse>('/integrations/scannorder').then(res => res.data.integration)
    );
  },

  startScanNOrderOnboarding: async (): Promise<{ url: string }> => {
    logAPI('POST', '/integrations/scannorder/onboarding');

    return withMock(
      () => ({ url: 'https://connect.stripe.com/setup/mock/' }),
      () => apiClient.post<WelloApiResponse<{ url: string }>>('/integrations/scannorder/onboarding', {}).then(res => res.data)
    );
  },

  updateUberEats: async (data: {
    commission_rate: number;
    auto_accept_orders: boolean;
    preparation_time_minutes?: number;
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
    preparation_time_minutes?: number;
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

  closeEstablishmentTemporary: async (data: {
    duration_minutes: number;
    affected_integrations: IntegrationPlatform[];
  }): Promise<{ status: string; closed_until: string; affected_integrations: IntegrationPlatform[] }> => {
    logAPI('PATCH', '/integrations/global/close-temporary', data);

    return withMock(
      () => ({
        status: 'success',
        closed_until: new Date(Date.now() + data.duration_minutes * 60 * 1000).toISOString(),
        affected_integrations: data.affected_integrations,
      }),
      () =>
        apiClient
          .patch<WelloApiResponse<{ status: string; closed_until: string; affected_integrations: IntegrationPlatform[] }>>(
            '/integrations/global/close-temporary',
            data
          )
          .then(res => res.data)
    );
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STRIPE PAYMENT INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  getStripeStatus: async (): Promise<{ status: 'verified' | 'action_required' }> => {
    logAPI('GET', '/integrations/stripe/status');
    
    return withMock(
      () => ({ status: 'verified' as const }),
      () => apiClient.get<WelloApiResponse<{ status: 'verified' | 'action_required' }>>('/integrations/stripe/status').then(res => res.data)
    );
  },

  getStripeOnboardingLink: async (): Promise<{ url: string }> => {
    logAPI('POST', '/integrations/stripe/onboarding-link');
    
    return withMock(
      () => ({ url: 'https://connect.stripe.com/setup/mock/' }),
      () => apiClient.post<WelloApiResponse<{ url: string }>>('/integrations/stripe/onboarding-link', {}).then(res => res.data)
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
      () => apiClient.get<WelloApiResponse<{ accounts: Array<{
        id: string;
        bank_name: string;
        last4: string;
        currency: string;
        status: 'verified' | 'pending' | 'errored';
        account_holder_name?: string;
      }> }>>('/integrations/stripe/bank-accounts').then(res => res.data)
    );
  },

  getStripeBankAccountLink: async (): Promise<{ url: string }> => {
    logAPI('POST', '/integrations/stripe/bank-account-link');
    
    return withMock(
      () => ({ url: 'https://connect.stripe.com/setup/bank-account/mock/' }),
      () => apiClient.post<WelloApiResponse<{ url: string }>>('/integrations/stripe/bank-account-link', {}).then(res => res.data)
    );
  },

  getStripeBalance: async (): Promise<{ available: number; pending: number }> => {
    logAPI('GET', '/integrations/stripe/balance');

    return withMock(
      () => ({ available: 150000, pending: 45000 }),
      () =>
        apiClient
          .get<WelloApiResponse<{ available: Array<{ amount: number; currency: string }>; pending: Array<{ amount: number; currency: string }> }>>('/integrations/stripe/balance')
          .then((res) => ({
            available: res.data.available.reduce((sum, e) => sum + e.amount, 0),
            pending: res.data.pending.reduce((sum, e) => sum + e.amount, 0),
          }))
    );
  },
};
