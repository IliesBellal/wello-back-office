import { apiClient } from './apiClient';
import { toUTCDateString } from '@/utils/apiDate';

export interface VATRate {
  [rate: string]: {
    amount: number;
    base_ht: number;
  };
}

export interface ChannelVAT {
  [channel: string]: {
    vat: number;
    percentage: number;
  };
}

export interface MonthlyBreakdown {
  month: string;
  revenue_ht: number;
  vat_10?: number;
  vat_5_5?: number;
  vat_20?: number;
  vat_2_1?: number;
  vat_total: number;
  revenue_ttc: number;
}

export interface VATCalculationResponse {
  total_vat: number;
  vat_by_rate: VATRate;
  monthly_breakdown: MonthlyBreakdown[];
  by_channel: ChannelVAT;
  by_order_type?: ChannelVAT;
}

interface ApiEnvelope<T> {
  id: string;
  data: T;
}

export const vatChannels = [
  { id: 'restaurant', label: 'Ventes en restaurant' },
  { id: 'takeaway', label: 'Ventes à emporter' },
  { id: 'scannorder', label: 'Ventes ScannOrder (site)' },
  { id: 'ubereats', label: 'Ventes Uber Eats' },
  { id: 'deliveroo', label: 'Ventes Deliveroo' },
];

export const vatOrderTypes = [
  { id: 'in', label: 'Sur place' },
  { id: 'take_away', label: 'Emporter' },
  { id: 'delivery', label: 'Livraison' },
];

export const calculateVAT = async (
  startDate: Date | string,
  endDate: Date | string,
  channels: string[],
  orderTypes?: string[]
): Promise<VATCalculationResponse> => {
  const startDateUTC = toUTCDateString(startDate);
  const endDateUTC = toUTCDateString(endDate);

  const response = await apiClient.post<ApiEnvelope<VATCalculationResponse> | VATCalculationResponse>(
    '/accounting/vat/calculate',
    {
      start_date: startDateUTC,
      end_date: endDateUTC,
      channels,
      ...(orderTypes && orderTypes.length > 0 && { order_types: orderTypes }),
    }
  );

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    (response as ApiEnvelope<unknown>).data &&
    typeof (response as ApiEnvelope<unknown>).data === 'object' &&
    'total_vat' in ((response as ApiEnvelope<unknown>).data as Record<string, unknown>)
  ) {
    return (response as ApiEnvelope<VATCalculationResponse>).data;
  }

  return response as VATCalculationResponse;
};

export const exportVATCSV = async (
  startDate: Date | string,
  endDate: Date | string,
  channels: string[],
  orderTypes?: string[]
): Promise<Blob> => {
  const startDateUTC = toUTCDateString(startDate);
  const endDateUTC = toUTCDateString(endDate);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://welloresto-api-prod.onrender.com";
  const authData = localStorage.getItem("authData");
  const authToken = authData ? JSON.parse(authData).token : null;

  const response = await fetch(
    `${API_BASE_URL}/accounting/vat/export-csv`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'backoffice',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        start_date: startDateUTC,
        end_date: endDateUTC,
        channels,
        ...(orderTypes && orderTypes.length > 0 && { order_types: orderTypes }),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.blob();
};

/**
 * Generate filename for VAT export
 */
export const generateVATExportFilename = (startDate: string, endDate: string): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `TVA_${startDate}_to_${endDate}_${dateStr}.csv`;
};

/**
 * Download CSV file
 */
export const downloadCSV = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
