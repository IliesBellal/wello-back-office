import { apiClient, withMock, logAPI } from "@/services/apiClient";

// ============= Types =============
export interface CashRegister { id: string; cash_desk_name: string; start_date: string; closed: boolean; enclosed: boolean; cash_fund: number; }
export interface SummaryItem { mop_code: string; label: string; amount: number; }
export interface CustomItem { id: string; label: string; value: number; }
export interface CashRegisterSummary { cash_fund: number; items: SummaryItem[]; custom_items: CustomItem[]; enclosed: boolean; enclose_comment?: string; }
export interface TvaDetailItem { tva_rate: number; tva_title: string; ttc_sum: number; ht_sum: number; tva_sum: number; }
export interface TvaDetails { delivery_type_label: string; items: TvaDetailItem[]; }

// ============= Mock Data =============
const mockRegisters: CashRegister[] = [
  { id: "cr1", cash_desk_name: "Caisse Principale", start_date: new Date().toISOString(), closed: false, enclosed: false, cash_fund: 15000 },
  { id: "cr2", cash_desk_name: "Caisse Terrasse", start_date: new Date(Date.now() - 3600000).toISOString(), closed: true, enclosed: false, cash_fund: 10000 },
  { id: "cr3", cash_desk_name: "Caisse Principale", start_date: new Date(Date.now() - 86400000).toISOString(), closed: true, enclosed: true, cash_fund: 15000 },
];

const mockSummary: CashRegisterSummary = { cash_fund: 15000, items: [{ mop_code: "CB", label: "Carte Bancaire", amount: 20750 }, { mop_code: "CASH", label: "Espèces", amount: 11650 }, { mop_code: "TR", label: "Ticket Restaurant", amount: 4500 }], custom_items: [{ id: "ci1", label: "Espèces comptées", value: 11500 }, { id: "ci2", label: "Remise caisse", value: -500 }], enclosed: false };
const mockTvaDetails: TvaDetails[] = [{ delivery_type_label: "Sur Place", items: [{ tva_rate: 10, tva_title: "TVA 10%", ttc_sum: 18500, ht_sum: 16818, tva_sum: 1682 }, { tva_rate: 20, tva_title: "TVA 20%", ttc_sum: 8200, ht_sum: 6833, tva_sum: 1367 }] }, { delivery_type_label: "Emporter", items: [{ tva_rate: 5.5, tva_title: "TVA 5.5%", ttc_sum: 5500, ht_sum: 5213, tva_sum: 287 }, { tva_rate: 10, tva_title: "TVA 10%", ttc_sum: 4700, ht_sum: 4273, tva_sum: 427 }] }];

// ============= API Functions =============
export const getCashRegisterHistory = (date: string) => { logAPI('GET', `/cash_register/history/${date}`); return withMock(() => [...mockRegisters], () => apiClient.get<CashRegister[]>(`/cash_register/history/${date}`)); };
export const closeCashRegister = (id: string) => { logAPI('PATCH', `/cash_register/${id}/close`); return withMock(() => ({ status: "ok" as string, error: undefined as string | undefined }), () => apiClient.patch<{ status: string; error?: string }>(`/cash_register/${id}/close`)); };
export const getCashRegisterSummary = (id: string) => { logAPI('GET', `/cash_register/${id}/summary`); return withMock(() => ({ ...mockSummary, enclosed: mockRegisters.find(r => r.id === id)?.enclosed || false }), () => apiClient.get<CashRegisterSummary>(`/cash_register/${id}/summary`)); };
export const getCashRegisterTvaDetails = (id: string) => { logAPI('GET', `/cash_register/${id}/tva_details`); return withMock(() => [...mockTvaDetails], () => apiClient.get<TvaDetails[]>(`/cash_register/${id}/tva_details`)); };
export const addCustomItem = (registerId: string, payload: { label: string; value: number }) => { logAPI('POST', `/cash_register/${registerId}/custom_items`, payload); return withMock(() => ({ id: `ci${Date.now()}`, ...payload }), () => apiClient.post<CustomItem>(`/cash_register/${registerId}/custom_items`, payload)); };
export const deleteCustomItem = (registerId: string, itemId: string) => { logAPI('DELETE', `/cash_register/${registerId}/custom_items/${itemId}`); return withMock(() => undefined, () => apiClient.delete<void>(`/cash_register/${registerId}/custom_items/${itemId}`)); };
export const encloseCashRegister = (id: string, payload: { comment: string }) => { logAPI('PATCH', `/cash_register/${id}/enclose`, payload); return withMock(() => ({ status: "ok" as string, error: undefined as string | undefined }), () => apiClient.patch<{ status: string; error?: string }>(`/cash_register/${id}/enclose`, payload)); };
