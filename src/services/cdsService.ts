import { apiClient, WelloApiResponse } from "@/services/apiClient";
import {
  cdsApiErrorMessages,
  type CdsApiErrorPayload,
  type CdsDisplay,
  type CdsDisplayList,
  type CdsEnrollmentCode,
  type CdsEnrollmentCodeCreated,
  type CdsMediaItem,
  type CdsSettings,
  type CreateCdsQrMediaRequest,
  type UpdateCdsDisplayRequest,
  type UpdateCdsSettingsRequest,
} from "@/types/cds";

const CDS_BASE = "/pos/settings/cds";

export class CdsApiException extends Error {
  status: string;

  constructor(message: string, status: string) {
    super(message);
    this.name = "CdsApiException";
    this.status = status;
  }
}

const isCdsApiErrorPayload = (data: unknown): data is CdsApiErrorPayload => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).status === "string" &&
    typeof (data as Record<string, unknown>).message === "string" &&
    "error" in (data as Record<string, unknown>)
  );
};

// L'API renvoie certaines erreurs métier en 200 avec un payload d'erreur dans
// `data` (même convention que kioskService) : sans cette garde, une limite
// d'écrans atteinte passerait pour un succès.
const assertNoCdsApiError = (data: unknown) => {
  if (isCdsApiErrorPayload(data)) {
    const friendly = cdsApiErrorMessages[data.status as keyof typeof cdsApiErrorMessages];
    throw new CdsApiException(friendly ?? data.message, data.status);
  }
};

export const cdsService = {
  // ─── Écrans ─────────────────────────────────────────────────────────────

  async listDisplays(): Promise<CdsDisplayList> {
    const response = await apiClient.get<WelloApiResponse<CdsDisplayList>>(`${CDS_BASE}/displays`);
    return {
      displays: response.data.displays ?? [],
      active_used: response.data.active_used ?? 0,
      active_max: response.data.active_max ?? 0,
    };
  },

  async getDisplay(displayId: string): Promise<CdsDisplay> {
    const response = await apiClient.get<WelloApiResponse<CdsDisplay>>(
      `${CDS_BASE}/displays/${displayId}`,
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  async updateDisplay(displayId: string, data: UpdateCdsDisplayRequest): Promise<void> {
    const response = await apiClient.put<WelloApiResponse<unknown>>(
      `${CDS_BASE}/displays/${displayId}`,
      data,
    );
    assertNoCdsApiError(response.data);
  },

  // Seule action de cycle de vie : il n'existe ni activation ni désactivation
  // (décision D15). Elle est irréversible et déconnecte l'écran immédiatement.
  async revokeDisplay(displayId: string): Promise<void> {
    const response = await apiClient.post<WelloApiResponse<unknown>>(
      `${CDS_BASE}/displays/${displayId}/revoke`,
    );
    assertNoCdsApiError(response.data);
  },

  // ─── Codes d'enrôlement ─────────────────────────────────────────────────

  // Le nom est celui que portera l'écran une fois enrôlé : il prime sur le nom
  // auto-généré par l'appareil (« Écran Android Box »), qu'il faudrait sinon
  // corriger à la main après coup.
  async generateEnrollmentCode(name: string): Promise<CdsEnrollmentCodeCreated> {
    const response = await apiClient.post<
      WelloApiResponse<CdsEnrollmentCodeCreated | CdsApiErrorPayload>
    >(`${CDS_BASE}/enrollment-codes`, { name });
    assertNoCdsApiError(response.data);
    return response.data as CdsEnrollmentCodeCreated;
  },

  async listEnrollmentCodes(): Promise<CdsEnrollmentCode[]> {
    const response = await apiClient.get<WelloApiResponse<{ codes: CdsEnrollmentCode[] }>>(
      `${CDS_BASE}/enrollment-codes`,
    );
    return response.data.codes ?? [];
  },

  async deleteEnrollmentCode(codeId: string): Promise<void> {
    await apiClient.delete<void>(`${CDS_BASE}/enrollment-codes/${codeId}`);
  },

  // ─── Paramètres (par écran) ─────────────────────────────────────────────

  async getSettings(displayId: string): Promise<CdsSettings> {
    const response = await apiClient.get<WelloApiResponse<CdsSettings>>(
      `${CDS_BASE}/displays/${displayId}/settings`,
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  async updateSettings(displayId: string, data: UpdateCdsSettingsRequest): Promise<void> {
    const response = await apiClient.put<WelloApiResponse<unknown>>(
      `${CDS_BASE}/displays/${displayId}/settings`,
      data,
    );
    assertNoCdsApiError(response.data);
  },

  // ─── Médias marketing ───────────────────────────────────────────────────

  async listMedia(displayId: string): Promise<CdsMediaItem[]> {
    const response = await apiClient.get<WelloApiResponse<{ media: CdsMediaItem[] }>>(
      `${CDS_BASE}/displays/${displayId}/media`,
    );
    return response.data.media ?? [];
  },

  // Upload d'une image ou d'une vidéo. Le `kind` n'est pas envoyé : l'API le
  // déduit du type MIME du fichier, pour qu'un client ne puisse pas déclarer
  // « image » en envoyant 50 Mo de vidéo.
  //
  // La durée est facultative : absente, le média suit la durée par défaut de
  // l'écran, ce qui est presque toujours ce qu'on veut à l'ajout.
  async uploadMedia(
    displayId: string,
    file: File,
    durationSeconds?: number,
  ): Promise<CdsMediaItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (durationSeconds !== undefined) {
      formData.append('duration_seconds', String(durationSeconds));
    }

    const response = await apiClient.post<WelloApiResponse<CdsMediaItem>>(
      `${CDS_BASE}/displays/${displayId}/media`,
      formData,
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  // Un QR code ne porte pas de fichier : même route, mais en JSON.
  async createQrMedia(displayId: string, data: CreateCdsQrMediaRequest): Promise<CdsMediaItem> {
    const response = await apiClient.post<WelloApiResponse<CdsMediaItem>>(
      `${CDS_BASE}/displays/${displayId}/media`,
      data,
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  // Règle la durée PROPRE d'un média, ou la retire (null) pour qu'il suive à
  // nouveau la durée par défaut de l'écran.
  async updateMediaDuration(
    displayId: string,
    mediaId: string,
    seconds: number | null,
  ): Promise<CdsMediaItem> {
    const response = await apiClient.put<WelloApiResponse<CdsMediaItem>>(
      `${CDS_BASE}/displays/${displayId}/media/${mediaId}`,
      { duration_seconds: seconds },
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  // « Appliquer à tous » : retire toutes les durées propres, chaque média suit
  // la durée par défaut. Renvoie le nombre de médias réinitialisés.
  async resetMediaDurations(displayId: string): Promise<{ reset: number }> {
    const response = await apiClient.post<WelloApiResponse<{ reset: number }>>(
      `${CDS_BASE}/displays/${displayId}/media/reset-durations`,
    );
    assertNoCdsApiError(response.data);
    return response.data;
  },

  // L'ordre est une propriété de la liste, pas de chaque élément : endpoint
  // dédié plutôt qu'un sort_order envoyé média par média.
  async reorderMedia(displayId: string, orderedIds: string[]): Promise<void> {
    const response = await apiClient.put<WelloApiResponse<unknown>>(
      `${CDS_BASE}/displays/${displayId}/media/reorder`,
      { ordered_ids: orderedIds },
    );
    assertNoCdsApiError(response.data);
  },

  async deleteMedia(displayId: string, mediaId: string): Promise<void> {
    await apiClient.delete<void>(`${CDS_BASE}/displays/${displayId}/media/${mediaId}`);
  },
};
