import { apiClient, withMock, logAPI, WelloApiResponse } from '@/services/apiClient';
import { toUTCDateString } from '@/utils/apiDate';

// ============= TYPES =============
export interface CashRegisterHistoryRecord {
  id: string;
  register_number: string; // ex: "Z-2026-0408-001"
  type: 'Z' | 'X';
  created_at: string; // ISO date/time
  total_revenue: number; // en centimes
  transaction_count: number;
  payment_methods: {
    [key: string]: number; // CB, cash, tickets_resto, etc. (en centimes)
  };
  nf525_certified: boolean;
  nf525_hash?: string;
  nf525_timestamp?: string;
  pdf_url?: string;
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
      total_revenue: revenue,
      transaction_count: Math.floor(Math.random() * 50) + 10,
      payment_methods: {
        CB: Math.floor(revenue * 0.65),
        cash: Math.floor(revenue * 0.25),
        tickets_resto: Math.floor(revenue * 0.1),
      },
      nf525_certified: isZ,
      nf525_hash: isZ ? `hash_${i}_${Date.now()}` : undefined,
      nf525_timestamp: isZ ? date.toISOString() : undefined,
      pdf_url: isZ ? `/pdfs/register_${i}.pdf` : undefined,
    });
  }
  
  return registers;
};

const mockRegisters = generateMockRegisters();

// ============= SERVICE FUNCTIONS =============
export const getCashRegisterHistory = async (
  startDate: Date | string,
  endDate: Date | string,
  type: 'all' | 'Z' | 'X' = 'all'
): Promise<CashRegisterListResponse> => {
  const startDateUTC = toUTCDateString(startDate);
  const endDateUTC = toUTCDateString(endDate);

  logAPI(
    'GET',
    '/accounting/registers',
    { start_date: startDateUTC, end_date: endDateUTC, type }
  );

  return withMock(
    () => {
      const filtered = mockRegisters.filter((reg) => {
        const regDate = reg.created_at.split('T')[0];
        const inRange = regDate >= startDateUTC && regDate <= endDateUTC;
        const typeMatch = type === 'all' || reg.type === type;
        return inRange && typeMatch;
      });

      const stats: CashRegisterStats = {
        z_count: filtered.filter((r) => r.type === 'Z').length,
        x_count: filtered.filter((r) => r.type === 'X').length,
        total_revenue: filtered.reduce((sum, r) => sum + r.total_revenue, 0),
        total_transactions: filtered.reduce((sum, r) => sum + r.transaction_count, 0),
      };

      return {
        registers: filtered,
        stats,
      };
    },
    () =>
      apiClient
        .get<WelloApiResponse<CashRegisterListResponse>>(
          '/accounting/registers',
          {
            params: {
              start_date: startDateUTC,
              end_date: endDateUTC,
              type,
            },
          }
        )
        .then((res) => res.data)
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
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `register_${registerId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  );
};

export const exportPeriodRegisters = async (
  startDate: Date | string,
  endDate: Date | string,
  type: 'all' | 'Z' | 'X' = 'all',
  format: 'zip' | 'single' = 'zip'
): Promise<void> => {
  const startDateUTC = toUTCDateString(startDate);
  const endDateUTC = toUTCDateString(endDate);

  logAPI('POST', '/accounting/registers/export-period', {
    start_date: startDateUTC,
    end_date: endDateUTC,
    type,
    format,
  });

  return withMock(
    () => {
      // Mock: trigger download with dummy ZIP
      const link = document.createElement('a');
      link.href = `/mock-registers-${startDateUTC}-${endDateUTC}.zip`;
      link.download = `registers_${startDateUTC}_to_${endDateUTC}.zip`;
      link.click();
    },
    async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'}/accounting/registers/export-period`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
          },
          body: JSON.stringify({
            start_date: startDateUTC,
            end_date: endDateUTC,
            type,
            format,
          }),
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `registers_${startDateUTC}_to_${endDateUTC}.${format === 'zip' ? 'zip' : 'pdf'}`;
      link.click();
      window.URL.revokeObjectURL(url);
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
