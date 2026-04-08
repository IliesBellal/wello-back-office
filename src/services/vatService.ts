import { apiClient } from './apiClient';

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
}

export const vatChannels = [
  { id: 'restaurant', label: 'Ventes en restaurant' },
  { id: 'takeaway', label: 'Ventes à emporter' },
  { id: 'scannorder', label: 'Ventes ScannOrder (site)' },
  { id: 'ubereats', label: 'Ventes Uber Eats' },
  { id: 'deliveroo', label: 'Ventes Deliveroo' },
];

// Mock data for testing (while API is being built)
const generateMockVATData = (
  _startDate: string,
  _endDate: string,
  channels: string[]
): VATCalculationResponse => {
  const baseAmounts: Record<string, number> = {
    restaurant: 1250000,
    takeaway: 150000,
    scannorder: 50000,
    ubereats: 40000,
    deliveroo: 35000,
  };

  const selectedAmount = channels.reduce((sum, ch) => sum + (baseAmounts[ch] || 0), 0);

  return {
    total_vat: Math.round(selectedAmount * 0.122), // 12.2% average
    vat_by_rate: {
      '10.0': {
        amount: Math.round(selectedAmount * 0.7 * 0.1),
        base_ht: Math.round(selectedAmount * 0.7),
      },
      '5.5': {
        amount: Math.round(selectedAmount * 0.3 * 0.055),
        base_ht: Math.round(selectedAmount * 0.3),
      },
    },
    monthly_breakdown: [
      {
        month: '2025-12',
        revenue_ht: Math.round(selectedAmount / 3),
        vat_10: Math.round((selectedAmount / 3) * 0.7 * 0.1),
        vat_5_5: Math.round((selectedAmount / 3) * 0.3 * 0.055),
        vat_total: Math.round((selectedAmount / 3) * 0.122),
        revenue_ttc: Math.round((selectedAmount / 3) * 1.122),
      },
      {
        month: '2026-01',
        revenue_ht: Math.round(selectedAmount / 3),
        vat_10: Math.round((selectedAmount / 3) * 0.7 * 0.1),
        vat_5_5: Math.round((selectedAmount / 3) * 0.3 * 0.055),
        vat_total: Math.round((selectedAmount / 3) * 0.122),
        revenue_ttc: Math.round((selectedAmount / 3) * 1.122),
      },
      {
        month: '2026-02',
        revenue_ht: Math.round(selectedAmount / 3),
        vat_10: Math.round((selectedAmount / 3) * 0.7 * 0.1),
        vat_5_5: Math.round((selectedAmount / 3) * 0.3 * 0.055),
        vat_total: Math.round((selectedAmount / 3) * 0.122),
        revenue_ttc: Math.round((selectedAmount / 3) * 1.122),
      },
    ],
    by_channel: Object.fromEntries(
      channels.map((ch) => {
        const amount = baseAmounts[ch] || 0;
        const percentage = Math.round((amount / selectedAmount) * 100);
        return [
          ch,
          {
            vat: Math.round(amount * 0.122),
            percentage,
          },
        ];
      })
    ),
  };
};

// Enable mock mode with environment variable or query param
const USE_VAT_MOCK = 
  import.meta.env.VITE_USE_VAT_MOCK != 'true' ||
  new URLSearchParams(window.location.search).get('vat_mock') === 'true';

export const calculateVAT = async (
  startDate: string,
  endDate: string,
  channels: string[]
): Promise<VATCalculationResponse> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (USE_VAT_MOCK) {
    return generateMockVATData(startDate, endDate, channels);
  }

  const response = await apiClient.post<VATCalculationResponse>(
    '/accounting/vat/calculate',
    {
      start_date: startDate,
      end_date: endDate,
      channels,
    }
  );

  return response;
};

export const exportVATCSV = async (
  startDate: string,
  endDate: string,
  channels: string[]
): Promise<Blob> => {
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
        start_date: startDate,
        end_date: endDate,
        channels,
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
