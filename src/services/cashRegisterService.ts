import { config } from "@/config";

export interface CashRegister {
  id: string;
  cash_desk_name: string;
  start_date: string;
  closed: boolean;
  enclosed: boolean;
  cash_fund: number;
}

export interface SummaryItem {
  mop_code: string;
  label: string;
  amount: number;
}

export interface CustomItem {
  id: string;
  label: string;
  value: number;
}

export interface CashRegisterSummary {
  cash_fund: number;
  items: SummaryItem[];
  custom_items: CustomItem[];
  enclosed: boolean;
  enclose_comment?: string;
}

export interface TvaDetailItem {
  tva_rate: number;
  tva_title: string;
  ttc_sum: number;
  ht_sum: number;
  tva_sum: number;
}

export interface TvaDetails {
  delivery_type_label: string;
  items: TvaDetailItem[];
}

const mockRegisters: CashRegister[] = [
  {
    id: "cr1",
    cash_desk_name: "Caisse Principale",
    start_date: new Date().toISOString(),
    closed: false,
    enclosed: false,
    cash_fund: 15000,
  },
  {
    id: "cr2",
    cash_desk_name: "Caisse Terrasse",
    start_date: new Date(Date.now() - 3600000).toISOString(),
    closed: true,
    enclosed: false,
    cash_fund: 10000,
  },
  {
    id: "cr3",
    cash_desk_name: "Caisse Principale",
    start_date: new Date(Date.now() - 86400000).toISOString(),
    closed: true,
    enclosed: true,
    cash_fund: 15000,
  },
];

const mockSummary: CashRegisterSummary = {
  cash_fund: 15000,
  items: [
    { mop_code: "CB", label: "Carte Bancaire", amount: 20750 },
    { mop_code: "CASH", label: "Espèces", amount: 11650 },
    { mop_code: "TR", label: "Ticket Restaurant", amount: 4500 },
  ],
  custom_items: [
    { id: "ci1", label: "Espèces comptées", value: 11500 },
    { id: "ci2", label: "Remise caisse", value: -500 },
  ],
  enclosed: false,
};

const mockTvaDetails: TvaDetails[] = [
  {
    delivery_type_label: "Sur Place",
    items: [
      { tva_rate: 10, tva_title: "TVA 10%", ttc_sum: 18500, ht_sum: 16818, tva_sum: 1682 },
      { tva_rate: 20, tva_title: "TVA 20%", ttc_sum: 8200, ht_sum: 6833, tva_sum: 1367 },
    ],
  },
  {
    delivery_type_label: "Emporter",
    items: [
      { tva_rate: 5.5, tva_title: "TVA 5.5%", ttc_sum: 5500, ht_sum: 5213, tva_sum: 287 },
      { tva_rate: 10, tva_title: "TVA 10%", ttc_sum: 4700, ht_sum: 4273, tva_sum: 427 },
    ],
  },
];

export const getCashRegisterHistory = async (date: string): Promise<CashRegister[]> => {
  console.log(`[API] GET /cash_register/history/${date}`);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockRegisters;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/history/${date}`);
  return response.json();
};

export const closeCashRegister = async (id: string): Promise<{ status: string; error?: string }> => {
  console.log(`[API] PATCH /cash_register/${id}/close`);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { status: "ok" };
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/${id}/close`, {
    method: "PATCH",
  });
  return response.json();
};

export const getCashRegisterSummary = async (id: string): Promise<CashRegisterSummary> => {
  console.log(`[API] GET /cash_register/${id}/summary`);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const register = mockRegisters.find((r) => r.id === id);
    return {
      ...mockSummary,
      enclosed: register?.enclosed || false,
      enclose_comment: register?.enclosed ? "Clôture validée sans écart." : undefined,
    };
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/${id}/summary`);
  return response.json();
};

export const getCashRegisterTvaDetails = async (id: string): Promise<TvaDetails[]> => {
  console.log(`[API] GET /cash_register/${id}/tva_details`);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockTvaDetails;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/${id}/tva_details`);
  return response.json();
};

export const addCustomItem = async (
  registerId: string,
  payload: { label: string; value: number }
): Promise<CustomItem> => {
  console.log(`[API] POST /cash_register/${registerId}/custom_items`);
  console.log("Payload:", payload);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      id: `ci${Date.now()}`,
      label: payload.label,
      value: payload.value,
    };
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/${registerId}/custom_items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const deleteCustomItem = async (registerId: string, itemId: string): Promise<void> => {
  console.log(`[API] DELETE /cash_register/${registerId}/custom_items/${itemId}`);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }
  
  await fetch(`${config.apiBaseUrl}/cash_register/${registerId}/custom_items/${itemId}`, {
    method: "DELETE",
  });
};

export const encloseCashRegister = async (
  id: string,
  payload: { comment: string }
): Promise<{ status: string; error?: string }> => {
  console.log(`[API] PATCH /cash_register/${id}/enclose`);
  console.log("Payload:", payload);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { status: "ok" };
  }
  
  const response = await fetch(`${config.apiBaseUrl}/cash_register/${id}/enclose`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};
