import { config } from '@/config';
import { AuthResponse, LoginCredentials } from '@/types/auth';

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

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (config.useMockData) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAuthResponse;
    } else {
      // Real API call
      const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return response.json();
    }
  },

  switchMerchant: async (token: string): Promise<AuthResponse> => {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      // In mock mode, find the merchant by token and update the response
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
      return mockAuthResponse;
    } else {
      const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
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
  },
};
