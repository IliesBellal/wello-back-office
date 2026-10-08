import { apiClient, withMock, logAPI } from "@/services/apiClient";
import { toLocalDateString } from '@/utils/apiDate';

/**
 * Archives fiscales (conformité caisse, lot D) : une archive par mois clôturé,
 * produite automatiquement par l'API, et des archives à la demande sur une
 * période close de 31 jours au plus. Chaque archive est un ZIP de fichiers CSV
 * (tickets, commandes, paiements, journal, clôtures, registres), une notice et
 * un manifeste des empreintes, scellé dans une chaîne signée.
 *
 * Les refus métier (période invalide ou non close, génération déjà en cours)
 * arrivent en 400 / 409 avec un message en français, affiché par apiClient.
 */
export interface FiscalArchive {
  id: number;
  /** MONTH : mensuelle, automatique ; PERIOD : à la demande. */
  kind: 'MONTH' | 'PERIOD';
  /** YYYY-MM-DD, jour local de l'établissement, inclus. */
  period_start: string;
  period_end: string;
  filename: string;
  /** Empreinte SHA-256 du fichier ZIP. */
  sha256: string;
  manifest_sha256: string;
  size_bytes: number;
  software_version: string;
  /** SYSTEM (automatique) ou identifiant de l'utilisateur. */
  generated_by: string;
  generated_at: string;
  hash: string;
}

export interface FiscalArchiveLink {
  archive_id: number;
  filename: string;
  sha256: string;
  /** Lien signé, valable une heure. */
  download_url: string;
}

const ENDPOINT = '/accounting/fiscal-archives';

export const fiscalArchivesService = {
  async list(): Promise<FiscalArchive[]> {
    logAPI('GET', ENDPOINT);
    return withMock<FiscalArchive[]>(
      () => [],
      async () => {
        const response = await apiClient.get<{ id: string; data: { status: string; archives: FiscalArchive[] } }>(ENDPOINT);
        return response.data.archives ?? [];
      }
    );
  },

  /** Archive à la demande d'une période close (bornes incluses, 31 jours au plus). */
  async generate(dateFrom: Date, dateTo: Date): Promise<FiscalArchive> {
    const payload = { date_from: toLocalDateString(dateFrom), date_to: toLocalDateString(dateTo) };
    logAPI('POST', ENDPOINT, payload);
    return withMock<FiscalArchive>(
      () => ({
        id: Date.now(),
        kind: 'PERIOD',
        period_start: payload.date_from,
        period_end: payload.date_to,
        filename: 'WelloResto_archive_demo.zip',
        sha256: '0'.repeat(64),
        manifest_sha256: '0'.repeat(64),
        size_bytes: 0,
        software_version: '2.0.0',
        generated_by: 'demo',
        generated_at: new Date().toISOString(),
        hash: '0'.repeat(64),
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: { status: string; archive: FiscalArchive } }>(ENDPOINT, payload);
        return response.data.archive;
      }
    );
  },

  /** Nouveau lien signé (une heure) ; chaque demande est inscrite au journal d'audit. */
  async getLink(archiveId: number): Promise<FiscalArchiveLink> {
    const endpoint = `${ENDPOINT}/${archiveId}/download`;
    logAPI('GET', endpoint);
    return withMock<FiscalArchiveLink>(
      () => ({ archive_id: archiveId, filename: 'WelloResto_archive_demo.zip', sha256: '0'.repeat(64), download_url: '#' }),
      async () => {
        const response = await apiClient.get<{ id: string; data: FiscalArchiveLink }>(endpoint);
        return response.data;
      }
    );
  },
};
