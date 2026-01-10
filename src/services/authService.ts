import { apiClient, withMock, logAPI, API_BASE_URL } from "@/services/apiClient";
import { AuthResponse, LoginCredentials } from '@/types/auth';

// ============= Mock Data =============
const mockAuthResponse: AuthResponse = {
  id: 99,
  data: {
    userId: "2",
    name: "walid",
    first_name: "Ilies",
    user_mail: "walidwalid@welloresto.fr",
    merchantId: "2",
    merchantName: "Brasserie du midi",
    logo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzA0QYOCzFIthfJw8sP0K6bFyj8TRJkT7kNQ&s",
    merchants: [
      { merchant_id: "2", business_name: "Brasserie du midi", token: "tokenwalid" },
      { merchant_id: "212", business_name: "Croq'Ô'Pizzas", token: "tokenwalidcroqopizza" },
      { merchant_id: "230", business_name: "Ok Pizza", token: "tokenwalidokpizzadlp" }
    ]
  }
};

// ============= API Functions =============
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    logAPI('GET', '/auth/login', credentials);
    
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
      async () => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Merchant switch failed');
        }
        
        return response.json();
      }
    );
  },
};
