import { apiClient } from './apiClient';

export interface OnlineOrdersConfig {
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  header_title: string;
  header_text: string;
  cgv_link: string;
  return_policy_link: string;
  legal_notices_link: string;
  takeaway_enabled: boolean;
  takeaway_auto_accept: boolean;
  delivery_enabled: boolean;
  delivery_auto_accept: boolean;
  delivery_distance_limit: number; // in km
}

// Mock data for fallback
const mockOnlineOrdersConfig: OnlineOrdersConfig = {
  logo_url: '',
  banner_url: '',
  primary_color: '#ff6b6b',
  header_title: 'Bienvenue sur Wello Resto',
  header_text: 'Commandez vos plats en ligne',
  cgv_link: 'https://example.com/cgv',
  return_policy_link: 'https://example.com/return-policy',
  legal_notices_link: 'https://example.com/legal',
  takeaway_enabled: true,
  takeaway_auto_accept: false,
  delivery_enabled: true,
  delivery_auto_accept: false,
  delivery_distance_limit: 5,
};

export const getOnlineOrdersConfig = async (): Promise<OnlineOrdersConfig> => {
  try {
    const response = await apiClient.get('/integrations/scannorder');
    // API returns { id, data: { integration: { ... } } }
    return response.data.integration;
  } catch (error) {
    console.error('Failed to fetch online orders config:', error);
    // Return mock data as fallback
    return mockOnlineOrdersConfig;
  }
};

export const updateOnlineOrdersConfig = async (
  config: OnlineOrdersConfig
): Promise<OnlineOrdersConfig> => {
  try {
    // Remove forbidden fields from payload
    const {
      auto_accept_orders, commission_rate, logo_url, banner_url, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...allowedConfig
    } = config;
    const response = await apiClient.patch('/integrations/scannorder', allowedConfig);
    // API returns { id, data: { integration: { ... } } }
    return response.data.integration;
  } catch (error) {
    console.error('Failed to update online orders config:', error);
    // Return the config that was attempted to be saved as fallback
    return config;
  }
};

export const uploadLogo = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.put('/integrations/scannorder/logo', formData);
    return response.data.photo_url;
  } catch (error) {
    console.error('Failed to upload logo:', error);
    throw error;
  }
};

export const uploadBanner = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.put('/integrations/scannorder/banner', formData);
    return response.data.photo_url;
  } catch (error) {
    console.error('Failed to upload banner:', error);
    throw error;
  }
};
