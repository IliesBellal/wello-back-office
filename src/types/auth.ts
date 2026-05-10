export interface Merchant {
  merchant_id: string;
  FullName?: string;
  business_name: string;
  address?: string;
  Lat?: number;
  Lng?: number;
  Address?: string;
  City?: string;
  Country?: string;
  ZipCode?: string;
  logo_url?: string;
  token: string;
}

export interface UberEatsIntegration {
  store_id?: string | null;
  commission_rate?: number;
  closed_until?: number | null;
  delay_duration?: number;
  delay_until?: number | null;
  estimated_preparation_time?: string;
}

export interface DeliverooIntegration {
  location_id?: string | null;
  commission_rate?: number;
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
  status?: string;
  admin?: boolean;
  enabled?: string;
  mfa_status?: 'pending' | 'verified';
  mfa_type?: string;
  integration_uber_eats?: UberEatsIntegration | null;
  integration_deliveroo?: DeliverooIntegration | null;
  token?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  id: string;
  data: AuthData;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
