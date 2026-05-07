import { apiClient, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";
import { UserProfile, EstablishmentSettings, MfaType } from "@/types/settings";

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
  avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
  mfa_type: ''
};

const mockEstablishmentSettings: EstablishmentSettings = {
  info: {
    name: "Brasserie du midi",
    phone: "0102030405",
    country_code: "FR",
    siret: "12345678900012",
    address: "12 Rue de la Paix, Paris",
    currency: "EUR",
    primary_color: "#00b894",
    text_color: "#ffffff",
    is_open: true
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
    active_delivery: true
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
  }
};

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

  async updateMfaType(mfaType: MfaType): Promise<UserProfile> {
    logAPI('PATCH', '/users/profile', { mfa_type: mfaType });
    return withMock(
      () => ({ ...mockUserProfile, mfa_type: mfaType }),
      async () => {
        const response = await apiClient.patch<WelloApiResponse<UserProfile> | UserProfile>('/users/profile', { mfa_type: mfaType });
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
      () => ({ ...mockEstablishmentSettings }),
      async () => {
        const response = await apiClient.get<WelloApiResponse<EstablishmentSettings> | EstablishmentSettings>('/pos/settings');
        return unwrapWelloData(response);
      }
    );
  },

  async updateEstablishmentSettings(data: Partial<EstablishmentSettings>): Promise<EstablishmentSettings> {
    logAPI('PATCH', '/pos/settings', data);
    return withMock(
      () => ({ ...mockEstablishmentSettings, ...data }),
      async () => {
        const response = await apiClient.patch<WelloApiResponse<EstablishmentSettings> | EstablishmentSettings>('/pos/settings', data);
        return unwrapWelloData(response);
      }
    );
  }
};
