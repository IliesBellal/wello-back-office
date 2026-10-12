import { apiClient, withMock, logAPI, WelloApiResponse } from '@/services/apiClient';
import { getStoredAuthToken } from '@/types/auth';
import { toUTCDateString } from '@/utils/apiDate';
import type { ClosingMode } from '@/services/financialReportsService';

// ============= TYPES =============
export interface CashRegisterHistoryRecord {
  id: string;
  register_number: string; // ex: "Z-2026-0408-001"
  type: 'Z' | 'X';
  created_at: string; // ISO date/time
  start_date: string;
  end_date: string | null;
  cash_fund: number;
  final_cash_fund: number;
  closure_comment?: string;
  closed_by_name?: string;
  closed: boolean;
  enclosed: boolean;
  hash_prefix?: string;
  cash_desk?: {
    cash_desk_id: string;
    cash_desk_name: string;
  };
  total_revenue: number; // en centimes
  transaction_count: number;
  payment_methods?: CashRegisterPaymentMethod[];
  /** MANUAL (relevé de caisse) ou AUTO (clôture automatique, sans relevé). */
  closing_mode?: ClosingMode;
}

export interface CashRegisterPaymentMethod {
  mop: string;
  label: string;
  amount: number;
}

export interface CashRegisterStats {
  z_count: number;
  x_count: number;
  total_revenue: number; // en centimes
  total_transactions: number;
}

export interface CashRegisterClosurePayload {
  register_id: string;
  cash_drawer_amount: number; // Expected cash in drawer (in cents)
  observed_amount: number; // Actual cash counted (in cents)
  adjustments: {
    reason: string;
    amount: number;
  }[];
}

export interface CashRegisterListResponse {
  registers: CashRegisterHistoryRecord[];
  stats: CashRegisterStats;
  metadata: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}

interface CashRegisterHistoryPayload {
  page: number;
  limit: number;
  date_from: string;
  date_to: string;
}

interface CashRegisterHistoryApiData {
  status?: string;
  cash_registers?: CashRegisterApiRecord[];
  registers?: CashRegisterHistoryRecord[];
  history?: CashRegisterHistoryRecord[];
  metadata?: {
    total_items?: number;
    total_pages?: number;
    current_page?: number;
    limit?: number;
  };
}

interface CashRegisterApiRecord {
  cash_register_id: string;
  start_date: string;
  end_date: string | null;
  cash_fund?: number;
  final_cash_fund?: number;
  closure_comment?: string;
  closed_by_name?: string;
  closed: boolean;
  enclosed: boolean;
  hash_prefix?: string;
  cash_desk?: {
    cash_desk_id: string;
    cash_desk_name: string;
  };
  total_revenu?: number;
  transaction_count?: number;
  payment_methods?: CashRegisterPaymentMethod[];
  closing_mode?: string;
}

// ============= MOCK DATA =============
const generateMockRegisters = (): CashRegisterHistoryRecord[] => {
  const registers: CashRegisterHistoryRecord[] = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 25; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const time = i % 2 === 0 ? 21 : 14;
    date.setHours(time, Math.floor(Math.random() * 60), 0);
    
    const isZ = i % 3 !== 0; // 2/3 Z, 1/3 X
    const revenue = Math.floor(Math.random() * 500000) + 100000; // 1000€ - 6000€
    
    registers.push({
      id: `reg_${i}`,
      register_number: `${isZ ? 'Z' : 'X'}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
      type: isZ ? 'Z' : 'X',
      created_at: date.toISOString(),
      start_date: date.toISOString(),
      end_date: isZ ? new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString() : null,
      cash_fund: 10000,
      final_cash_fund: isZ ? 25800 : 0,
      closure_comment: isZ ? 'Fin de service' : undefined,
      closed_by_name: isZ ? 'Jean Dupont' : undefined,
      closed: isZ,
      enclosed: isZ,
      hash_prefix: isZ ? `hashprefix_${i}` : undefined,
      cash_desk: {
        cash_desk_id: 'desk_1',
        cash_desk_name: 'Caisse principale',
      },
      total_revenue: revenue,
      transaction_count: Math.floor(Math.random() * 50) + 10,
      payment_methods: [
        { mop: 'CB', label: 'Carte bancaire', amount: Math.floor(revenue * 0.65) },
        { mop: 'ES', label: 'Espèces', amount: Math.floor(revenue * 0.25) },
        { mop: 'TR', label: 'Tickets Restaurant', amount: Math.floor(revenue * 0.1) },
      ],
    });
  }
  
  return registers;
};

const mockRegisters = generateMockRegisters();

const toClosingMode = (value?: string): ClosingMode =>
  String(value ?? '').toUpperCase() === 'AUTO' ? 'AUTO' : 'MANUAL';

const mapApiRegisterToHistoryRecord = (register: CashRegisterApiRecord): CashRegisterHistoryRecord => ({
  id: register.cash_register_id,
  register_number: register.cash_register_id,
  type: register.closed ? 'Z' : 'X',
  created_at: register.start_date,
  start_date: register.start_date,
  end_date: register.end_date,
  cash_fund: register.cash_fund ?? 0,
  final_cash_fund: register.final_cash_fund ?? 0,
  closure_comment: register.closure_comment,
  closed_by_name: register.closed_by_name,
  closed: register.closed,
  enclosed: register.enclosed,
  hash_prefix: register.hash_prefix,
  cash_desk: register.cash_desk,
  total_revenue: register.total_revenu ?? 0,
  transaction_count: register.transaction_count ?? 0,
  payment_methods: register.payment_methods,
  closing_mode: toClosingMode(register.closing_mode),
});

export const getCashRegisterById = async (
  registerId: string
): Promise<CashRegisterHistoryRecord> => {
  logAPI('GET', `/cash_register/${registerId}`);

  return withMock(
    () => {
      const register = mockRegisters.find((r) => r.id === registerId);
      if (!register) {
        throw new Error('Register not found');
      }
      return { ...register };
    },
    async () => {
      const response = await apiClient.get<{
        id: string;
        data: {
          cash_register: {
            cash_register_id: string;
            start_date: string;
            end_date: string;
            cash_fund: number;
            final_cash_fund: number;
            closed: boolean;
            enclosed: boolean;
            total_revenu: number;
            transaction_count: number;
            payment_methods: CashRegisterPaymentMethod[];
            closing_mode?: string;
            hash_prefix: string;
            cash_desk: {
              cash_desk_id: string;
              cash_desk_name: string;
            };
          };
          status: string;
        };
      }>(`/cash_register/${registerId}`);

      const payload = response.data.cash_register;

      return {
        id: payload.cash_register_id,
        register_number: payload.cash_register_id,
        type: payload.closed ? 'Z' : 'X',
        created_at: payload.start_date,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        cash_fund: payload.cash_fund,
        final_cash_fund: payload.final_cash_fund,
        closure_comment: undefined,
        closed_by_name: undefined,
        closed: payload.closed,
        enclosed: payload.enclosed,
        hash_prefix: payload.hash_prefix,
        cash_desk: payload.cash_desk,
        total_revenue: payload.total_revenu,
        transaction_count: payload.transaction_count,
        payment_methods: payload.payment_methods,
        closing_mode: toClosingMode(payload.closing_mode),
      };
    }
  );
};

// ============= SERVICE FUNCTIONS =============
export const getCashRegisterHistory = async (
  startDate: Date | string,
  endDate: Date | string,
  _type: 'all' | 'Z' | 'X' = 'all',
  page: number = 1,
  limit: number = 31
): Promise<CashRegisterListResponse> => {
  const startDateUTC = `${toUTCDateString(startDate)} 00:00:00`;
  const endDateUTC = `${toUTCDateString(endDate)} 23:59:59`;
  const payload: CashRegisterHistoryPayload = {
    page,
    limit,
    date_from: startDateUTC,
    date_to: endDateUTC,
  };

  logAPI(
    'POST',
    '/cash_register/history',
    payload
  );

  return withMock(
    () => {
      const filtered = mockRegisters.filter((reg) => {
        const regDate = reg.created_at.split('T')[0];
        return regDate >= startDateUTC.split(' ')[0] && regDate <= endDateUTC.split(' ')[0];
      });

      const sorted = [...filtered].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const totalItems = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const safePage = Math.min(Math.max(page, 1), totalPages);
      const paginated = sorted.slice((safePage - 1) * limit, safePage * limit);

      const stats: CashRegisterStats = {
        z_count: filtered.filter((r) => r.type === 'Z').length,
        x_count: filtered.filter((r) => r.type === 'X').length,
        total_revenue: filtered.reduce((sum, r) => sum + r.total_revenue, 0),
        total_transactions: filtered.reduce((sum, r) => sum + r.transaction_count, 0),
      };

      return {
        registers: paginated,
        stats,
        metadata: {
          total_items: totalItems,
          total_pages: totalPages,
          current_page: safePage,
          limit,
        },
      };
    },
    async () => {
      const response = await apiClient.post<
        WelloApiResponse<CashRegisterHistoryApiData> |
        CashRegisterHistoryApiData
      >('/cash_register/history', payload);

      const data = (response && typeof response === 'object' && 'data' in response)
        ? (response as WelloApiResponse<CashRegisterHistoryApiData>).data
        : (response as CashRegisterHistoryApiData);

      const registers = data.cash_registers
        ? data.cash_registers.map(mapApiRegisterToHistoryRecord)
        : (data.registers ?? data.history ?? []);
      const metadata = {
        total_items: data.metadata?.total_items ?? registers.length,
        total_pages: data.metadata?.total_pages ?? Math.max(1, Math.ceil(Math.max(registers.length, 1) / limit)),
        current_page: data.metadata?.current_page ?? page,
        limit: data.metadata?.limit ?? limit,
      };

      const stats: CashRegisterStats = {
        z_count: registers.filter((r) => r.type === 'Z').length,
        x_count: registers.filter((r) => r.type === 'X').length,
        total_revenue: registers.reduce((sum, r) => sum + r.total_revenue, 0),
        total_transactions: registers.reduce((sum, r) => sum + r.transaction_count, 0),
      };

      return {
        registers,
        stats,
        metadata,
      };
    }
  );
};

export const getCashRegisterStats = async (
  startDate: Date | string,
  endDate: Date | string
): Promise<CashRegisterStats> => {
  const startDateUTC = toUTCDateString(startDate);
  const endDateUTC = toUTCDateString(endDate);

  logAPI(
    'GET',
    '/accounting/registers/stats',
    { start_date: startDateUTC, end_date: endDateUTC }
  );

  return withMock(
    () => {
      const filtered = mockRegisters.filter((reg) => {
        const regDate = reg.created_at.split('T')[0];
        return regDate >= startDateUTC && regDate <= endDateUTC;
      });

      return {
        z_count: filtered.filter((r) => r.type === 'Z').length,
        x_count: filtered.filter((r) => r.type === 'X').length,
        total_revenue: filtered.reduce((sum, r) => sum + r.total_revenue, 0),
        total_transactions: filtered.reduce((sum, r) => sum + r.transaction_count, 0),
      };
    },
    () =>
      apiClient
        .get<WelloApiResponse<CashRegisterStats>>(
          '/accounting/registers/stats',
          {
            params: {
              start_date: startDateUTC,
              end_date: endDateUTC,
            },
          }
        )
        .then((res) => res.data)
  );
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Nom de fichier proposé par l'API (Content-Disposition), à défaut `fallback`.
const filenameFromResponse = (response: Response, fallback: string): string => {
  const match = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '');
  return match ? match[1] : fallback;
};

// Message à afficher pour une réponse d'erreur de l'API : le message en français
// de premier niveau quand il existe, sinon `fallback`.
const errorMessageFromResponse = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json();
    return body?.message || body?.data?.message || fallback;
  } catch {
    return fallback;
  }
};

export const exportRegisterPDF = async (registerId: string): Promise<void> => {
  logAPI('POST', `/accounting/registers/${registerId}/export-pdf`);

  return withMock(
    () => {
      // Mock: trigger download with dummy PDF
      const link = document.createElement('a');
      link.href = `/mock-register-${registerId}.pdf`;
      link.download = `register_${registerId}.pdf`;
      link.click();
    },
    async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'}/accounting/registers/${registerId}/export-pdf`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getStoredAuthToken() || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessageFromResponse(response, "L'export du registre a échoué."));
      }

      saveBlob(await response.blob(), `register_${registerId}.pdf`);
    }
  );
};

/** Plafond de registres d'un export (aligné sur RegisterExportMax côté API). */
export const REGISTER_EXPORT_MAX = 100;

/**
 * Registres à exporter : une sélection d'identifiants, ou toute une période —
 * la même que celle de la liste (mêmes bornes, mêmes registres visibles).
 */
export type RegisterExportSelection =
  | { registerIds: string[] }
  | { dateFrom: Date | string; dateTo: Date | string };

export interface RegisterExportResult {
  /** PDF contenus dans le téléchargement. */
  exported: number;
  /** Registres demandés mais écartés (listés dans ignores.txt du ZIP). */
  ignored: number;
}

/**
 * Télécharge les PDF des registres choisis : un seul registre donne son PDF,
 * plusieurs (ou une période) un ZIP avec un PDF par registre. Seuls les
 * registres clôturés et validés sont exportés ; les autres sont écartés et
 * comptés dans `ignored`.
 */
export const exportRegistersPDF = async (
  selection: RegisterExportSelection
): Promise<RegisterExportResult> => {
  if ('registerIds' in selection && selection.registerIds.length === 1) {
    await exportRegisterPDF(selection.registerIds[0]);
    return { exported: 1, ignored: 0 };
  }

  const body =
    'registerIds' in selection
      ? { register_ids: selection.registerIds }
      : {
          // Mêmes bornes que la liste (getCashRegisterHistory).
          date_from: `${toUTCDateString(selection.dateFrom)} 00:00:00`,
          date_to: `${toUTCDateString(selection.dateTo)} 23:59:59`,
        };

  logAPI('POST', '/accounting/registers/export-pdf', body);

  return withMock(
    () => {
      const count = 'registerIds' in selection ? selection.registerIds.length : mockRegisters.length;
      return { exported: count, ignored: 0 };
    },
    async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'}/accounting/registers/export-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getStoredAuthToken() || ''}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessageFromResponse(response, "L'export des registres a échoué."));
      }

      const blob = await response.blob();
      saveBlob(blob, filenameFromResponse(response, 'registres.zip'));
      return {
        exported: Number(response.headers.get('X-Registers-Exported') ?? 0),
        ignored: Number(response.headers.get('X-Registers-Ignored') ?? 0),
      };
    }
  );
};

export const closeRegisterX = async (payload: CashRegisterClosurePayload): Promise<{ status: string; z_register_number: string }> => {
  logAPI('POST', `/accounting/registers/${payload.register_id}/close`, payload);

  return withMock(
    () => {
      const register = mockRegisters.find((r) => r.id === payload.register_id);
      if (!register) throw new Error('Register not found');

      // Convert X to Z
      const now = new Date();
      const newZNumber = `Z-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.random()).padStart(3, '0').slice(2, 5)}`;

      return {
        status: 'closed',
        z_register_number: newZNumber,
      };
    },
    () =>
      apiClient
        .post<WelloApiResponse<{ status: string; z_register_number: string }>>(
          `/accounting/registers/${payload.register_id}/close`,
          payload
        )
        .then((res) => res.data)
  );
};
