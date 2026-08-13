import { apiClient, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";
import { UserProfile, EstablishmentSettings, HourOfOperation, HourOfOperationPayload, VacationPeriod, VacationPeriodPayload } from "@/types/settings";

const unwrapWelloData = <T>(response: WelloApiResponse<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return (response as WelloApiResponse<T>).data;
  }
  return response as T;
};

// ============= Mock Data =============
const mockUserProfile: UserProfile = {
  firstname: "Lucas",
  lastname: "Martinez",
  email: "lucas@wello.fr",
  phone: "+33612345678",
  birth_date: "1990-05-17",
  avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
  mfa_type: ''
};

let mockEstablishmentSettings: EstablishmentSettings = {
  info: {
    name: "Brasserie du midi",
    phone: "0102030405",
    website: "https://www.brasseriedumidi.fr",
    country_code: "FR",
    siret: "12345678900012",
    address: "12 Rue de la Paix, Paris",
    currency: "EUR",
    primary_color: "#00b894",
    text_color: "#ffffff",
    is_open: true,
    logo_url: ""
  },
  timings: {
    wait_time_min: 15,
    wait_time_max: 45,
    auto_close_enabled: true,
    auto_close_delay: 30
  },
  ordering: {
    paid_orders_only: false,
    concurrent_capacity: 50,
    service_required: "table",
    disable_low_stock: true,
    register_required: true,
    active_on_site: true,
    active_takeaway: true,
    active_delivery: true,
    upsell_enabled: false
  },
  scan_order: {
    active_delivery: true,
    active_takeaway: true,
    active_on_site: true,
    auto_accept_delivery: false,
    auto_accept_takeaway: true,
    allow_scheduled: true,
    max_schedule_days: 2,
    enable_rating: true
  },
  security: {
    pos_auto_lock_enabled: false,
    pos_auto_lock_delay_minutes: 5
  },
  customer_form_requirements: null,
  hours_of_operations: [
    {
      id: "171",
      day_of_week_from: 1,
      day_of_week_to: 1,
      hour_from: "09:00:00",
      hour_to: "18:00:00",
      booking_capacity: 20,
      first_booking_time: null,
      last_booking_time: null,
      valid_from: "2026-02-12 22:22:42",
      valid_to: null,
      enabled: true
    }
  ]
};

const cloneSettings = (settings: EstablishmentSettings): EstablishmentSettings => ({
  ...settings,
  hours_of_operations: settings.hours_of_operations.map((hour) => ({ ...hour })),
});

let mockVacationPeriods: VacationPeriod[] = [];

// ============= API Functions =============
export const settingsService = {
  async getUserProfile(): Promise<UserProfile> {
    logAPI('GET', '/users/profile');
    return withMock(
      () => ({ ...mockUserProfile }),
      async () => {
        const response = await apiClient.get<WelloApiResponse<UserProfile> | UserProfile>('/users/profile');
        return unwrapWelloData(response);
      }
    );
  },

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    logAPI('PATCH', '/users/profile', data);
    return withMock(
      () => ({ ...mockUserProfile, ...data }),
      async () => {
        const response = await apiClient.patch<WelloApiResponse<UserProfile> | UserProfile>('/users/profile', data);
        return unwrapWelloData(response);
      }
    );
  },

  async uploadUserProfileAvatar(file: File): Promise<void> {
    logAPI('POST', '/users/profile/avatar', { avatar: file.name });
    return withMock(
      async () => undefined,
      async () => {
        const formData = new FormData();
        formData.append('avatar', file);
        await apiClient.post('/users/profile/avatar', formData);
      }
    );
  },

  async getEstablishmentSettings(): Promise<EstablishmentSettings> {
    logAPI('GET', '/pos/settings');
    return withMock(
      () => cloneSettings(mockEstablishmentSettings),
      async () => {
        const response = await apiClient.get<WelloApiResponse<EstablishmentSettings> | EstablishmentSettings>('/pos/settings');
        return unwrapWelloData(response);
      }
    );
  },

  async updateEstablishmentSettings(data: Partial<EstablishmentSettings>): Promise<EstablishmentSettings> {
    logAPI('PATCH', '/pos/settings', data);
    return withMock(
      () => {
        mockEstablishmentSettings = {
          ...mockEstablishmentSettings,
          ...data,
        };
        return cloneSettings(mockEstablishmentSettings);
      },
      async () => {
        const response = await apiClient.patch<WelloApiResponse<EstablishmentSettings> | EstablishmentSettings>('/pos/settings', data);
        return unwrapWelloData(response);
      }
    );
  },

  async uploadEstablishmentLogo(file: File): Promise<{ logo_url: string }> {
    logAPI('POST', '/pos/settings/logo', { logo: file.name });
    return withMock(
      () => {
        const logoUrl = URL.createObjectURL(file);
        mockEstablishmentSettings = {
          ...mockEstablishmentSettings,
          info: { ...mockEstablishmentSettings.info, logo_url: logoUrl },
        };
        return { logo_url: logoUrl };
      },
      async () => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<WelloApiResponse<{ logo_url: string }> | { logo_url: string }>('/pos/settings/logo', formData);
        return unwrapWelloData(response);
      }
    );
  },

  async createHourOfOperation(payload: HourOfOperationPayload): Promise<HourOfOperation> {
    logAPI('POST', '/pos/settings/hours_of_operations', payload);
    return withMock(
      () => {
        const created: HourOfOperation = {
          ...payload,
          id: String(Date.now()),
          enabled: true,
        };
        mockEstablishmentSettings = {
          ...mockEstablishmentSettings,
          hours_of_operations: [...mockEstablishmentSettings.hours_of_operations, created],
        };
        return created;
      },
      async () => {
        const response = await apiClient.post<WelloApiResponse<HourOfOperation> | HourOfOperation>('/pos/settings/hours_of_operations', payload);
        return unwrapWelloData(response);
      }
    );
  },

  async updateHourOfOperation(hourId: string, payload: HourOfOperationPayload): Promise<HourOfOperation> {
    logAPI('PATCH', `/pos/settings/hours_of_operations/${hourId}`, payload);
    return withMock(
      () => {
        const updated: HourOfOperation = {
          ...payload,
          id: hourId,
          enabled: true,
        };
        mockEstablishmentSettings = {
          ...mockEstablishmentSettings,
          hours_of_operations: mockEstablishmentSettings.hours_of_operations.map((hour) => (
            hour.id === hourId ? updated : hour
          )),
        };
        return updated;
      },
      async () => {
        const response = await apiClient.patch<WelloApiResponse<HourOfOperation> | HourOfOperation>(`/pos/settings/hours_of_operations/${hourId}`, payload);
        return unwrapWelloData(response);
      }
    );
  },

  async deleteHourOfOperation(hourId: string): Promise<{ status: number }> {
    logAPI('DELETE', `/pos/settings/hours_of_operations/${hourId}`);
    return withMock(
      () => {
        mockEstablishmentSettings = {
          ...mockEstablishmentSettings,
          hours_of_operations: mockEstablishmentSettings.hours_of_operations.filter((hour) => hour.id !== hourId),
        };
        return { status: 1 };
      },
      async () => {
        const response = await apiClient.delete<WelloApiResponse<{ status: number }> | { status: number }>(`/pos/settings/hours_of_operations/${hourId}`);
        return unwrapWelloData(response);
      }
    );
  },

  async getVacationPeriods(): Promise<VacationPeriod[]> {
    logAPI('GET', '/pos/settings/vacations');
    return withMock(
      () => mockVacationPeriods.map((period) => ({ ...period })),
      async () => {
        const response = await apiClient.get<WelloApiResponse<{ vacation_periods: VacationPeriod[] }> | { vacation_periods: VacationPeriod[] }>('/pos/settings/vacations');
        return unwrapWelloData(response).vacation_periods;
      }
    );
  },

  async createVacationPeriod(payload: VacationPeriodPayload): Promise<VacationPeriod> {
    logAPI('POST', '/pos/settings/vacations', payload);
    return withMock(
      () => {
        const created: VacationPeriod = { ...payload, id: String(Date.now()), enabled: true };
        mockVacationPeriods = [...mockVacationPeriods, created];
        return created;
      },
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ vacation_period: VacationPeriod }> | { vacation_period: VacationPeriod }>('/pos/settings/vacations', payload);
        return unwrapWelloData(response).vacation_period;
      }
    );
  },

  async updateVacationPeriod(id: string, payload: VacationPeriodPayload): Promise<VacationPeriod> {
    logAPI('PATCH', `/pos/settings/vacations/${id}`, payload);
    return withMock(
      () => {
        const updated: VacationPeriod = { ...payload, id, enabled: true };
        mockVacationPeriods = mockVacationPeriods.map((period) => (period.id === id ? updated : period));
        return updated;
      },
      async () => {
        const response = await apiClient.patch<WelloApiResponse<{ vacation_period: VacationPeriod }> | { vacation_period: VacationPeriod }>(`/pos/settings/vacations/${id}`, payload);
        return unwrapWelloData(response).vacation_period;
      }
    );
  },

  async deleteVacationPeriod(id: string): Promise<{ status: string }> {
    logAPI('DELETE', `/pos/settings/vacations/${id}`);
    return withMock(
      () => {
        mockVacationPeriods = mockVacationPeriods.filter((period) => period.id !== id);
        return { status: 'success' };
      },
      async () => {
        const response = await apiClient.delete<WelloApiResponse<{ status: string }> | { status: string }>(`/pos/settings/vacations/${id}`);
        return unwrapWelloData(response);
      }
    );
  }
};
