import { config } from '@/config';

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

const mockVATData = (dateFrom: string, dateTo: string): VATReportResponse => {
  // Generate mock data for the date range
  return {
    status: "1",
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

const mockPaymentData = (dateFrom: string, dateTo: string): PaymentReportResponse => {
  return {
    status: "1",
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

export const financialReportsService = {
  async getVATReport(dateFrom: string, dateTo: string): Promise<VATReportResponse> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockVATData(dateFrom, dateTo);
    }
    
    const response = await fetch(`${config.apiBaseUrl}/establishment/report/tva`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
    });
    return response.json();
  },

  async getPaymentReport(dateFrom: string, dateTo: string): Promise<PaymentReportResponse> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockPaymentData(dateFrom, dateTo);
    }
    
    const response = await fetch(`${config.apiBaseUrl}/establishment/report/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
    });
    return response.json();
  },

  async exportGlobal(dateFrom: string, dateTo: string): Promise<void> {
    if (config.useMockData) {
      console.log('Mock: Exporting global accounting data', { dateFrom, dateTo });
      return;
    }
    
    const response = await fetch(`${config.apiBaseUrl}/establishment/accounting/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-comptable-${dateFrom}-${dateTo}.xlsx`;
    a.click();
  },

  async exportVAT(dateFrom: string, dateTo: string): Promise<void> {
    if (config.useMockData) {
      console.log('Mock: Exporting VAT data', { dateFrom, dateTo });
      return;
    }
    
    const response = await fetch(`${config.apiBaseUrl}/establishment/report/tva/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-tva-${dateFrom}-${dateTo}.xlsx`;
    a.click();
  },

  async exportPayments(dateFrom: string, dateTo: string): Promise<void> {
    if (config.useMockData) {
      console.log('Mock: Exporting payment data', { dateFrom, dateTo });
      return;
    }
    
    const response = await fetch(`${config.apiBaseUrl}/establishment/report/payments/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-paiements-${dateFrom}-${dateTo}.xlsx`;
    a.click();
  }
};
