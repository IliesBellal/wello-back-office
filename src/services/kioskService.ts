import { apiClient, WelloApiResponse } from "@/services/apiClient";
import {
  kioskApiErrorMessages,
  type EnrollmentCode,
  type EnrollmentCodeCreated,
  type KioskApiErrorPayload,
  type KioskEntry,
  type KioskSettings,
  type UpdateKioskRequest,
  type UpdateKioskSettingsRequest,
} from "@/types/kiosks";

const KIOSK_BASE = "/pos/settings/kiosk";

export class KioskApiException extends Error {
  status: string;

  constructor(message: string, status: string) {
    super(message);
    this.name = "KioskApiException";
    this.status = status;
  }
}

const isKioskApiErrorPayload = (data: unknown): data is KioskApiErrorPayload => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).status === "string" &&
    typeof (data as Record<string, unknown>).message === "string" &&
    "error" in (data as Record<string, unknown>)
  );
};

const assertNoKioskApiError = (data: unknown) => {
  if (isKioskApiErrorPayload(data)) {
    const friendlyMessage = kioskApiErrorMessages[data.status as keyof typeof kioskApiErrorMessages];
    throw new KioskApiException(friendlyMessage ?? data.message, data.status);
  }
};

export const kioskService = {
  // ─── Kiosks ─────────────────────────────────────────────────────────────

  async getKiosks(): Promise<KioskEntry[]> {
    const response = await apiClient.get<WelloApiResponse<{ devices: KioskEntry[] }>>(`${KIOSK_BASE}/devices`);
    return response.data.devices;
  },

  async getKiosk(id: string): Promise<KioskEntry> {
    const response = await apiClient.get<WelloApiResponse<KioskEntry>>(`${KIOSK_BASE}/devices/${id}`);
    return response.data;
  },

  async updateKiosk(id: string, data: UpdateKioskRequest): Promise<KioskEntry> {
    const response = await apiClient.put<WelloApiResponse<KioskEntry>>(`${KIOSK_BASE}/devices/${id}`, data);
    return response.data;
  },

  async enableKiosk(id: string): Promise<KioskEntry> {
    const response = await apiClient.post<WelloApiResponse<KioskEntry>>(`${KIOSK_BASE}/devices/${id}/enable`);
    return response.data;
  },

  async disableKiosk(id: string): Promise<KioskEntry> {
    const response = await apiClient.post<WelloApiResponse<KioskEntry>>(`${KIOSK_BASE}/devices/${id}/disable`);
    return response.data;
  },

  async revokeKiosk(id: string): Promise<KioskEntry> {
    const response = await apiClient.post<WelloApiResponse<KioskEntry>>(`${KIOSK_BASE}/devices/${id}/revoke`);
    return response.data;
  },

  // ─── Enrollment codes ───────────────────────────────────────────────────

  async generateEnrollmentCode(): Promise<EnrollmentCodeCreated> {
    const response = await apiClient.post<WelloApiResponse<EnrollmentCodeCreated | KioskApiErrorPayload>>(
      `${KIOSK_BASE}/enrollment-codes`,
    );
    assertNoKioskApiError(response.data);
    return response.data as EnrollmentCodeCreated;
  },

  async listEnrollmentCodes(): Promise<EnrollmentCode[]> {
    const response = await apiClient.get<WelloApiResponse<{ codes: EnrollmentCode[] }>>(
      `${KIOSK_BASE}/enrollment-codes`,
    );
    return response.data.codes;
  },

  async deleteEnrollmentCode(id: string): Promise<void> {
    await apiClient.delete<void>(`${KIOSK_BASE}/enrollment-codes/${id}`);
  },

  // ─── Settings ───────────────────────────────────────────────────────────

  async getKioskSettings(): Promise<KioskSettings> {
    const response = await apiClient.get<WelloApiResponse<KioskSettings>>(`${KIOSK_BASE}/settings`);
    return response.data;
  },

  async updateKioskSettings(data: UpdateKioskSettingsRequest): Promise<KioskSettings> {
    const response = await apiClient.put<WelloApiResponse<KioskSettings>>(`${KIOSK_BASE}/settings`, data);
    return response.data;
  },

  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<WelloApiResponse<{ logo_url: string }>>(
      `${KIOSK_BASE}/settings/logo`,
      formData,
    );
    return response.data;
  },

  async uploadIdleImage(file: File): Promise<{ idle_image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<WelloApiResponse<{ idle_image_url: string }>>(
      `${KIOSK_BASE}/settings/idle-image`,
      formData,
    );
    return response.data;
  },

  async uploadIdleVideo(file: File): Promise<{ idle_video_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<WelloApiResponse<{ idle_video_url: string }>>(
      `${KIOSK_BASE}/settings/idle-video`,
      formData,
    );
    return response.data;
  },

  async deleteIdleVideo(): Promise<KioskSettings> {
    const response = await apiClient.delete<WelloApiResponse<KioskSettings>>(`${KIOSK_BASE}/settings/idle-video`);
    return response.data;
  },
};
