import { apiClient, withMock, logAPI, requestWithCustomToken } from "@/services/apiClient";
import { AuthResponse, LoginCredentials, RawAuthResponse, normalizeAuthResponse } from '@/types/auth';

// ============= Mock Data =============
const mockAuthResponse: AuthResponse = {
    id: "auth.login",
    data: {
    status: "1",
    enabled: true,
    session: {
      enabled: true,
      token: "0baf00e3b809264d3cf1f332902d6b4388d956e166b647dffdac2ceb0f33e4e42d62c4a680337afeb51b1c1ffb56ed8f655fe4a8c96759642a78ad85dd097dd2",
      merchant_id: "2",
      mfa_status: "verified",
      mfa_type: "email_sms",
      merchants: [
        {
          id: "2",
          name: "Brasserie du midi",
          business_name: "Brasserie du midi",
          address: "117 Route de lorraine, 57000 Metz, France",
          city: "Metz",
          country: "France",
          zip_code: "57000",
          lat: 49.111387,
          lng: 6.179671300000001,
          logo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzA0QYOCzFIthfJw8sP0K6bFyj8TRJkT7kNQ&s",
          token: "0baf00e3b809264d3cf1f332902d6b4388d956e166b647dffdac2ceb0f33e4e42d62c4a680337afeb51b1c1ffb56ed8f655fe4a8c96759642a78ad85dd097dd2"
        },
        {
          id: "230",
          name: "Ok Pizza",
          business_name: "Ok Pizza",
          address: "10 Rue Nicolas Jung, 57050 Metz, France",
          city: "Metz",
          country: "France",
          zip_code: "57050",
          lat: 49.1333627,
          lng: 6.1543129,
          logo_url: "https://storage.welloresto.fr/merchants/230_ok_pizza_dlp/ok_pizza_dlp_logo.png",
          token: "915075deb217991cbf4508f508fc6db639957aab9ae9473bcebff1b369a9f06cb43b7577916016122b9e01546d315f125cd2f4310d0a07e4d55c0951c475de22"
        },
        {
          id: "212",
          name: "Croq'Ô'Pizzas",
          business_name: "Croq'Ô'Pizzas",
          address: "28 Rue du Pont des Morts, 57000 Metz, France",
          city: "Metz",
          country: "France",
          zip_code: "57000",
          lat: 49.1204612,
          lng: 6.1694277,
          logo_url: "https://storage.welloresto.fr/img/merchant_logo/croqo_pizza_logo.png",
          token: "8edda445c261a9845c074e6e5bdcd90691d301e98be93ef98e9905983ecb7317babb2c377769b8c86fa017f64228b1de715b2ad29cd7e68f44bd8a640700cc88"
        }
      ]
    },
    user: {
      id: "2",
      name: "walid",
      first_name: "Ilies",
      last_name: "BELLAL",
      email: "iliesbellal@gmail.com",
      tel: "+33609217928",
      terms_of_use_accepted: true,
      pin_code: "0000",
      profile_picture: ""
    },
    merchant: {
      id: "2",
      name: "Brasserie du midi",
      business_name: "Brasserie du midi",
      tel: "+33609217928",
      address: "117 Route de lorraine, 57000 Metz, France",
      lat: 49.111387,
      lng: 6.179671300000001,
      timezone: "Europe/Paris",
      web_site: "www.welloresto.fr",
      currency: "EUR",
      is_open: true,
      settings: {
        delivery_fees: 300,
        delivery_fees_limit: 5000,
        delivery_distance_limit: 5000,
        manage_on_site: true,
        manage_take_away: true,
        manage_delivery: true,
        kitchen_show_only_paid: false,
        kitchen_distribution_mode: "DISTRIBUTE",
        production_display_mode: "PRODUCT_FOCUS",
        pager_number_required: false,
        service_required_for_ordering: false,
        cash_register_required_for_ordering: true,
        warning_new_order_not_paid: true,
        disable_safety_stock: false,
      }
    },
    access: {
      admin: true,
      apps: {
        reception: true,
        delivery: true,
        waiter: true,
      },
      permissions: {}
    },
    capabilities: {
      apps: {
        reception: true,
        delivery: true,
        waiter: true,
      },
      modules: {
        menu: true,
        planning: true,
        users: true,
        settings: true,
        haccp: true,
        reports: true,
        financials: true,
        customers: true,
        stock: true,
        hr: true,
        scannorder: true,
        bookings: true,
      },
      order_types: {
        on_site: true,
        take_away: true,
        delivery: true,
      },
      actions: {
        open_cash_drawer: true,
        print_merchant_cash_report: true,
        manage_menu: true,
        manage_plannings: true,
        manage_users: true,
        manage_settings: true,
        manage_haccp: true,
        view_reports: true,
        export_reports: true,
        view_financials: true,
        export_financials: true,
        manage_customers: true,
        export_customers: true,
      },
      integrations: {
        uber_eats: true,
        uber_direct: true,
        deliveroo: true,
        scannorder: true,
      }
    },
    integrations: {
      uber_eats: {
        closed_until: 1772206200,
        delay_duration: 0,
        delay_until: null,
        estimated_preparation_time: "30",
        store_id: "bbcbebb1-1cf0-4f57-9369-cd238af54cf9",
        commission_rate: 30,
      },
      uber_direct: {
        customer_id: "14108e82-3b3a-4a59-9649-af9248cc104d"
      },
      deliveroo: {
        location_id: "102330",
        commission_rate: 20,
      }
    },
        SNOSettings: {
            activated: true
        },
    }
};

const buildMockResponseForMerchant = (token: string): AuthResponse => {
  const merchant = mockAuthResponse.data.session.merchants.find((candidate) => candidate.token === token);

  if (!merchant) {
  return mockAuthResponse;
  }

  return {
  ...mockAuthResponse,
  data: {
    ...mockAuthResponse.data,
    session: {
    ...mockAuthResponse.data.session,
    merchant_id: merchant.id,
    },
    merchant: {
    ...mockAuthResponse.data.merchant,
    id: merchant.id,
    name: merchant.business_name,
    business_name: merchant.business_name,
    address: merchant.address || mockAuthResponse.data.merchant.address,
    lat: merchant.lat,
    lng: merchant.lng,
    },
  },
  };
};

// ============= API Functions =============
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login', credentials);
    
    return withMock(
      () => normalizeAuthResponse({ ...mockAuthResponse }),
      async () => normalizeAuthResponse(await apiClient.post<RawAuthResponse>('/auth/login', credentials, { skipAuth: true }))
    );
  },

  switchMerchant: async (token: string): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login (switch merchant)');
    
    return withMock(
      () => normalizeAuthResponse(buildMockResponseForMerchant(token)),
      async () => normalizeAuthResponse(await apiClient.post<RawAuthResponse>('/auth/login', {}, { skipAuth: false }))
    );
  },

  loginWithToken: async (customToken: string): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login (with custom token)');
    
    return withMock(
      () => normalizeAuthResponse(buildMockResponseForMerchant(customToken)),
      async () => normalizeAuthResponse(await requestWithCustomToken<RawAuthResponse>('/auth/login', customToken, { method: 'POST', body: {} }))
    );
  },
};
