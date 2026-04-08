import { apiClient, withMock, logAPI, API_BASE_URL, requestWithCustomToken } from "@/services/apiClient";
import { AuthResponse, LoginCredentials } from '@/types/auth';

// ============= Mock Data =============
const mockAuthResponse: AuthResponse = {
    id: "auth.login",
    data: {
        SNOSettings: {
            activated: true
        },
        admin: true,
        allow_waiter_account: true,
        business_name: "Brasserie du midi",
        cash_register_required_for_ordering: true,
        currency: "EUR",
        delivery_distance_limit: 5000,
        delivery_fees: 300,
        delivery_fees_limit: 5000,
        device_cash_desk: null,
        enabled: "true",
        first_name: "Ilies",
        hr_management: true,
        integration_deliveroo: {
            location_id: "102330"
        },
        integration_uber_direct: {
            customer_id: "14108e82-3b3a-4a59-9649-af9248cc104d"
        },
        integration_uber_eats: {
            closed_until: 1772206200,
            delay_duration: 0,
            delay_until: null,
            estimated_preparation_time: "30",
            store_id: "bbcbebb1-1cf0-4f57-9369-cd238af54cf9"
        },
        is_open: true,
        kitchen_distribution_mode: "DISTRIBUTE",
        kitchen_show_only_paid: false,
        last_name: "BELLAL",
        manage_delivery: true,
        manage_on_site: true,
        manage_take_away: true,
        merchantAd: "117 Route de lorraine, 57000 Metz, France",
        merchantId: "2",
        merchantName: "Brasserie du midi",
        merchantTel: "+33609217928",
        merchant_address: "117 Route de lorraine, 57000 Metz, France",
        merchant_id: "2",
        merchant_lat: 49.111387,
        merchant_lng: 6.179671300000001,
        merchant_tel: "+33609217928",
        merchant_web_site: "www.welloresto.fr",
        merchants: [
            {
                merchant_id: "2",
                business_name: "Brasserie du midi",
                Lat: 49.111387,
                Lng: 6.179671300000001,
                Address: "117 Route de lorraine, 57000 Metz, France",
                City: "Metz",
                Country: "France",
                ZipCode: "57000",
                logo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzA0QYOCzFIthfJw8sP0K6bFyj8TRJkT7kNQ&s",
                token: "0baf00e3b809264d3cf1f332902d6b4388d956e166b647dffdac2ceb0f33e4e42d62c4a680337afeb51b1c1ffb56ed8f655fe4a8c96759642a78ad85dd097dd2"
            },
            {
                merchant_id: "230",
                business_name: "Ok Pizza",
                Lat: 49.1333627,
                Lng: 6.1543129,
                Address: "10 Rue Nicolas Jung, 57050 Metz, France",
                City: "Metz",
                Country: "France",
                ZipCode: "57050",
                logo_url: "https://storage.welloresto.fr/merchants/230_ok_pizza_dlp/ok_pizza_dlp_logo.png",
                token: "915075deb217991cbf4508f508fc6db639957aab9ae9473bcebff1b369a9f06cb43b7577916016122b9e01546d315f125cd2f4310d0a07e4d55c0951c475de22"
            },
            {
                merchant_id: "212",
                business_name: "Croq'Ô'Pizzas",
                Lat: 49.1204612,
                Lng: 6.1694277,
                Address: "28 Rue du Pont des Morts, 57000 Metz, France",
                City: "Metz",
                Country: "France",
                ZipCode: "57000",
                logo_url: "https://storage.welloresto.fr/img/merchant_logo/croqo_pizza_logo.png",
                token: "8edda445c261a9845c074e6e5bdcd90691d301e98be93ef98e9905983ecb7317babb2c377769b8c86fa017f64228b1de715b2ad29cd7e68f44bd8a640700cc88"
            }
        ],
        mfa_status: "verified",
        mfa_type: "email_sms",
        name: "walid",
        open_cash_drawer: true,
        pager_number_required: false,
        pin_code: "0000",
        print_merchant_cash_report: true,
        production_display_mode: "PRODUCT_FOCUS",
        profile_picture: "",
        safety_stock_active: true,
        scannorder_ready: true,
        service_required_for_ordering: false,
        status: "1",
        stock_management: 1,
        terms_of_use_accepted: true,
        timezone: "Europe/Paris",
        token: "0baf00e3b809264d3cf1f332902d6b4388d956e166b647dffdac2ceb0f33e4e42d62c4a680337afeb51b1c1ffb56ed8f655fe4a8c96759642a78ad85dd097dd2",
        userId: "2",
        user_mail: "iliesbellal@gmail.com",
        user_tel: "+33609217928",
        warning_new_order_not_paid: true
    }
};

// ============= API Functions =============
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login', credentials);
    
    return withMock(
      () => ({ ...mockAuthResponse }),
      () => apiClient.post<AuthResponse>('/auth/login', credentials, { skipAuth: true })
    );
  },

  switchMerchant: async (token: string): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login (switch merchant)');
    
    return withMock(
      () => {
        const merchant = mockAuthResponse.data.merchants.find(m => m.token === token);
        if (merchant) {
          return {
            ...mockAuthResponse,
            data: {
              ...mockAuthResponse.data,
              merchantId: merchant.merchant_id,
              merchantName: merchant.business_name,
            }
          };
        }
        return { ...mockAuthResponse };
      },
      async () => apiClient.post<AuthResponse>('/auth/login', {}, { skipAuth: false })
    );
  },

  loginWithToken: async (customToken: string): Promise<AuthResponse> => {
    logAPI('POST', '/auth/login (with custom token)');
    
    return withMock(
      () => {
        // Mock: find the merchant by token
        const merchant = mockAuthResponse.data.merchants.find(m => m.token === customToken);
        if (merchant) {
          return {
            ...mockAuthResponse,
            data: {
              ...mockAuthResponse.data,
              merchantId: merchant.merchant_id,
              merchantName: merchant.business_name,
            }
          };
        }
        return { ...mockAuthResponse };
      },
      async () => requestWithCustomToken<AuthResponse>('/auth/login', customToken, { method: 'POST', body: {} })
    );
  },
};
