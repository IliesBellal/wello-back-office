import { config } from "@/config";
import { UserProfile, EstablishmentSettings } from "@/types/settings";

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

export const settingsService = {
  async getUserProfile(): Promise<UserProfile> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockUserProfile;
    }
    const response = await fetch(`${config.apiBaseUrl}/api/user/profile`);
    return response.json();
  },

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { ...mockUserProfile, ...data };
    }
    const response = await fetch(`${config.apiBaseUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async getEstablishmentSettings(): Promise<EstablishmentSettings> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockEstablishmentSettings;
    }
    const response = await fetch(`${config.apiBaseUrl}/api/establishment/settings`);
    return response.json();
  },

  async updateEstablishmentSettings(data: Partial<EstablishmentSettings>): Promise<EstablishmentSettings> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { ...mockEstablishmentSettings, ...data };
    }
    const response = await fetch(`${config.apiBaseUrl}/api/establishment/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
