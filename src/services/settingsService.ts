import { apiClient, withMock, logAPI } from "@/services/apiClient";
import { UserProfile, EstablishmentSettings } from "@/types/settings";

// ============= Mock Data =============
const mockUserProfile: UserProfile = {
  firstname: "Lucas",
  lastname: "Martinez",
  email: "lucas@wello.fr",
  phone: "+33612345678",
  avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
};

const mockEstablishmentSettings: EstablishmentSettings = {
  info: {
    name: "Brasserie du midi",
    phone: "0102030405",
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
    register_required: true
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
    logAPI('GET', '/api/user/profile');
    return withMock(
      () => ({ ...mockUserProfile }),
      () => apiClient.get<UserProfile>('/api/user/profile')
    );
  },

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    logAPI('PATCH', '/api/user/profile', data);
    return withMock(
      () => ({ ...mockUserProfile, ...data }),
      () => apiClient.patch<UserProfile>('/api/user/profile', data)
    );
  },

  async getEstablishmentSettings(): Promise<EstablishmentSettings> {
    logAPI('GET', '/api/establishment/settings');
    return withMock(
      () => ({ ...mockEstablishmentSettings }),
      () => apiClient.get<EstablishmentSettings>('/api/establishment/settings')
    );
  },

  async updateEstablishmentSettings(data: Partial<EstablishmentSettings>): Promise<EstablishmentSettings> {
    logAPI('PATCH', '/api/establishment/settings', data);
    return withMock(
      () => ({ ...mockEstablishmentSettings, ...data }),
      () => apiClient.patch<EstablishmentSettings>('/api/establishment/settings', data)
    );
  }
};
