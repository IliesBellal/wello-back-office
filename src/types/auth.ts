export interface Merchant {
  merchant_id: string;
  business_name: string;
  token: string;
}

export interface AuthData {
  userId: string;
  name: string;
  first_name: string;
  user_mail: string;
  merchantId: string;
  merchantName: string;
  logo_url: string;
  merchants: Merchant[];
}

export interface AuthResponse {
  id: number;
  data: AuthData;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
