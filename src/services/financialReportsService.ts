import { apiClient, withMock, logAPI, API_BASE_URL } from "@/services/apiClient";

// ============= Types =============
export interface VATData {
  tva_title: string | null;
  tva_delivery_type_label?: string;
  ttc: number;
  ht: number;
  tva: number;
}

export interface VATDayData {
  date: string;
  TTC_sum: number;
  HT_sum: number;
  TVA_sum: number;
  VAT_data: VATData[];
}

export interface VATReportResponse {
  status: string;
  calendar: VATDayData[];
}

export interface PaymentMethod {
  mop: string;
  label: string;
  amount: number;
}

export interface PaymentDayData {
  date: string;
  payments: PaymentMethod[];
}

export interface PaymentReportResponse {
  status: string;
  calendar: PaymentDayData[];
}

export interface ExportResponse {
  status: string;
  filename: string;
  download_url: string;
}

// ============= Mock Data =============
const mockVATData = (): VATReportResponse => {
  return {
    status: "success",
    calendar: [
      {
        date: "2023-11-01",
        TTC_sum: 150000,
        HT_sum: 136363,
        TVA_sum: 13637,
        VAT_data: [
          { tva_title: "TVA 10%", tva_delivery_type_label: "Sur place", ttc: 100000, ht: 90909, tva: 9091 },
          { tva_title: "TVA 20%", tva_delivery_type_label: "Alcool", ttc: 50000, ht: 41666, tva: 8334 },
          { tva_title: null, ttc: 0, ht: 0, tva: 0 }
        ]
      },
      {
        date: "2023-11-02",
        TTC_sum: 200000,
        HT_sum: 181818,
        TVA_sum: 18182,
        VAT_data: [
          { tva_title: "TVA 10%", tva_delivery_type_label: "Sur place", ttc: 200000, ht: 181818, tva: 18182 }
        ]
      },
      {
        date: "2023-11-03",
        TTC_sum: 175000,
        HT_sum: 159090,
        TVA_sum: 15910,
        VAT_data: [
          { tva_title: "TVA 10%", tva_delivery_type_label: "Sur place", ttc: 120000, ht: 109090, tva: 10910 },
          { tva_title: "TVA 5.5%", tva_delivery_type_label: "Emporter", ttc: 55000, ht: 50000, tva: 5000 }
        ]
      }
    ]
  };
};

const mockPaymentData = (): PaymentReportResponse => {
  return {
    status: "success",
    calendar: [
      {
        date: "2023-11-01",
        payments: [
          { mop: "CB", label: "Carte Bancaire", amount: 100000 },
          { mop: "CASH", label: "Espèces", amount: 50000 }
        ]
      },
      {
        date: "2023-11-02",
        payments: [
          { mop: "CB", label: "Carte Bancaire", amount: 150000 },
          { mop: "TR", label: "Tickets Restaurant", amount: 50000 }
        ]
      },
      {
        date: "2023-11-03",
        payments: [
          { mop: "CB", label: "Carte Bancaire", amount: 125000 },
          { mop: "CASH", label: "Espèces", amount: 30000 },
          { mop: "TR", label: "Tickets Restaurant", amount: 20000 }
        ]
      }
    ]
  };
};

// ============= API Functions =============
export const financialReportsService = {
  async getVATReport(dateFrom: string, dateTo: string): Promise<VATReportResponse> {
    logAPI('POST', '/pos/reports/tva', { date_from: dateFrom, date_to: dateTo });
    
    return withMock(
      () => mockVATData(),
      async () => {
        const response = await apiClient.post<{ id: string; data: VATReportResponse }>('/pos/reports/tva', { date_from: dateFrom, date_to: dateTo });
        return response.data;
      }
    );
  },

  async getPaymentReport(dateFrom: string, dateTo: string): Promise<PaymentReportResponse> {
    logAPI('POST', '/pos/reports/payments', { date_from: dateFrom, date_to: dateTo });
    
    return withMock(
      () => mockPaymentData(),
      async () => {
        const response = await apiClient.post<{ id: string; data: PaymentReportResponse }>('/pos/reports/payments', { date_from: dateFrom, date_to: dateTo });
        return response.data;
      }
    );
  },

  async exportGlobal(dateFrom: string, dateTo: string): Promise<ExportResponse> {
    logAPI('POST', '/pos/accounting/export', { date_from: dateFrom, date_to: dateTo });
    
    return withMock(
      () => ({
        status: '1',
        filename: `WR_rapport_comptable_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`,
        download_url: 'https://r2.example.com/wello_resto_accounting/merchants/demo/reports/WR_rapport_comptable.pdf'
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ExportResponse }>('/pos/accounting/export', { date_from: dateFrom, date_to: dateTo });
        return response.data;
      }
    );
  },

  async exportVAT(dateFrom: string, dateTo: string): Promise<ExportResponse> {
    logAPI('POST', '/pos/reports/tva/export', { date_from: dateFrom, date_to: dateTo });
    
    return withMock(
      () => ({
        status: '1',
        filename: `WR_rapport_tva_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`,
        download_url: 'https://r2.example.com/wello_resto_accounting/merchants/demo/reports/WR_rapport_tva.pdf'
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ExportResponse }>('/pos/reports/tva/export', { date_from: dateFrom, date_to: dateTo });
        return response.data;
      }
    );
  },

  async exportPayments(dateFrom: string, dateTo: string): Promise<ExportResponse> {
    logAPI('POST', '/pos/reports/payments/export', { date_from: dateFrom, date_to: dateTo });
    
    return withMock(
      () => ({
        status: '1',
        filename: `WR_rapport_paiements_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`,
        download_url: 'https://r2.example.com/wello_resto_accounting/merchants/demo/reports/WR_rapport_paiements.pdf'
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ExportResponse }>('/pos/reports/payments/export', { date_from: dateFrom, date_to: dateTo });
        return response.data;
      }
    );
  }
};
