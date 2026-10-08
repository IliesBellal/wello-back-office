import { apiClient } from './apiClient';
import { getStoredAuthToken } from '@/types/auth';
import { toLocalDateString } from '@/utils/apiDate';

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
  /**
   * Mode de clôture du mois : MANUAL (TVA sur les ventes, remises de caisse
   * déduites) ou AUTO (TVA ventilée à partir des encaissements) — même méthode
   * que l'export comptable.
   */
  closing_mode?: 'MANUAL' | 'AUTO';
  revenue_ht: number;
  /** TVA du mois par taux (clé : « 10.0 », « 5.5 », « 20 »…), en centimes. */
  vat_by_rate?: Record<string, number>;
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

/**
 * Canaux de vente de la déclaration de TVA : valeurs de orders.order_source,
 * les mêmes que l'export comptable. (Les anciennes valeurs restaurant /
 * scannorder / ubereats / deliveroo restent acceptées par l'API.)
 */
export const vatChannels = [
  { id: 'WELLO_RESTO_POS', label: 'Caisse' },
  { id: 'KIOSK', label: 'Borne de commande' },
  { id: 'SCANNORDER', label: 'ScanNOrder' },
  { id: 'UBER_EATS', label: 'Uber Eats' },
  { id: 'DELIVEROO', label: 'Deliveroo' },
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
  // Dates de calendrier locales (et non UTC) : l'API les interprète dans le
  // fuseau de l'établissement, comme l'export comptable. toUTCDateString
  // décalait d'un jour une date choisie à minuit heure de Paris.
  const startDateLocal = toLocalDateString(startDate);
  const endDateLocal = toLocalDateString(endDate);

  const response = await apiClient.post<ApiEnvelope<VATCalculationResponse> | VATCalculationResponse>(
    '/accounting/vat/calculate',
    {
      start_date: startDateLocal,
      end_date: endDateLocal,
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
  // Dates de calendrier locales, cf. calculateVAT.
  const startDateLocal = toLocalDateString(startDate);
  const endDateLocal = toLocalDateString(endDate);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://welloresto-api-prod.onrender.com";
  const authToken = getStoredAuthToken();

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
        start_date: startDateLocal,
        end_date: endDateLocal,
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
