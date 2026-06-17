import { apiClient, WelloApiResponse } from "@/services/apiClient";
import type { CreatePrinterRequest, PrinterEntry, UpdatePrinterRequest } from "@/types/printers";

export const printerService = {
  async getPrinters(): Promise<PrinterEntry[]> {
    const response = await apiClient.get<WelloApiResponse<PrinterEntry[]>>("/printers");
    return response.data;
  },

  async createPrinter(data: CreatePrinterRequest): Promise<PrinterEntry> {
    const response = await apiClient.post<WelloApiResponse<PrinterEntry>>("/printers", data);
    return response.data;
  },

  async updatePrinter(id: string, data: UpdatePrinterRequest): Promise<PrinterEntry> {
    const response = await apiClient.patch<WelloApiResponse<PrinterEntry>>(`/printers/${id}`, data);
    return response.data;
  },

  async deletePrinter(id: string): Promise<void> {
    await apiClient.delete<void>(`/printers/${id}`);
  },
};
