import { apiClient, WelloApiResponse } from "@/services/apiClient";
import type {
  CreateProductionProfileRequest,
  ProductionProfileDetail,
  ProductionProfileEntry,
  ProductionProfileProductEntry,
  UpdateProductionProfileRequest,
} from "@/types/productionProfiles";

export const productionProfileService = {
  async getProfiles(): Promise<ProductionProfileEntry[]> {
    const response = await apiClient.get<WelloApiResponse<ProductionProfileEntry[]>>("/production-profiles");
    return response.data;
  },

  async getProfile(id: string): Promise<ProductionProfileDetail> {
    const response = await apiClient.get<WelloApiResponse<ProductionProfileDetail>>(`/production-profiles/${id}`);
    return response.data;
  },

  async createProfile(data: CreateProductionProfileRequest): Promise<ProductionProfileEntry> {
    const response = await apiClient.post<WelloApiResponse<ProductionProfileEntry>>("/production-profiles", data);
    return response.data;
  },

  async updateProfile(id: string, data: UpdateProductionProfileRequest): Promise<ProductionProfileEntry> {
    const response = await apiClient.patch<WelloApiResponse<ProductionProfileEntry>>(`/production-profiles/${id}`, data);
    return response.data;
  },

  async deleteProfile(id: string): Promise<void> {
    await apiClient.delete<void>(`/production-profiles/${id}`);
  },

  async replaceProducts(id: string, products: ProductionProfileProductEntry[]): Promise<void> {
    await apiClient.put<void>(`/production-profiles/${id}/products`, products);
  },
};
