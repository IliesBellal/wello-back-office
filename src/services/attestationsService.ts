import { apiClient, withMock, logAPI } from "@/services/apiClient";

/**
 * Attestation individuelle de l'éditeur (conformité caisse, lot F ; modèle
 * BOI-LETTRE-000242). Le volet 1 est pré-rempli et pré-signé par WelloResto ;
 * le volet 2 est complété ici et signé électroniquement par le représentant
 * légal de l'établissement. Refus de l'API (400 / 409 / 503) : message en
 * français affiché par apiClient.
 */
export interface Attestation {
  id: number;
  reference: string;
  software: string;
  version: string;
  major_root: string;
  /** Nouvelle version majeure en service : une nouvelle attestation est à générer. */
  obsolete: boolean;
  company_name: string;
  signer_name: string;
  signed_at: string;
  filename: string;
  sha256: string;
  size_bytes: number;
  generated_at: string;
}

export interface AttestationPrefill {
  company_name: string;
  siret: string;
  address: string;
  city: string;
  /** YYYY-MM-DD */
  acquisition_date: string;
  /** YYYY-MM-DD */
  usage_start_date: string;
}

export interface AttestationOverview {
  available: boolean;
  unavailable_reason?: string;
  software: string;
  version: string;
  major_root: string;
  prefill: AttestationPrefill;
  attestations: Attestation[];
}

export interface GenerateAttestationPayload {
  signer_name: string;
  company_name: string;
  city: string;
  acquisition_date: string;
  usage_start_date: string;
  certify: boolean;
}

const ENDPOINT = '/accounting/attestations';

export const attestationsService = {
  async overview(): Promise<AttestationOverview> {
    logAPI('GET', ENDPOINT);
    return withMock<AttestationOverview>(
      () => ({
        available: false,
        unavailable_reason: 'Mode démonstration.',
        software: 'WelloResto',
        version: '2.1.6',
        major_root: '2',
        prefill: { company_name: '', siret: '', address: '', city: '', acquisition_date: '', usage_start_date: '' },
        attestations: [],
      }),
      async () => {
        const response = await apiClient.get<{ id: string; data: AttestationOverview }>(ENDPOINT);
        return { ...response.data, attestations: response.data.attestations ?? [] };
      }
    );
  },

  /** Génère l'attestation : le volet 2 est signé électroniquement par l'utilisateur connecté. */
  async generate(payload: GenerateAttestationPayload): Promise<{ attestation: Attestation; download_url: string }> {
    logAPI('POST', ENDPOINT, payload);
    return withMock(
      () => {
        throw new Error('Mode démonstration');
      },
      async () => {
        const response = await apiClient.post<{ id: string; data: { attestation: Attestation; download_url: string } }>(ENDPOINT, payload);
        return response.data;
      }
    );
  },

  /** Nouveau lien signé (une heure), tracé au journal d'audit. */
  async getLink(id: number): Promise<string> {
    const endpoint = `${ENDPOINT}/${id}/download`;
    logAPI('GET', endpoint);
    return withMock(
      () => '#',
      async () => {
        const response = await apiClient.get<{ id: string; data: { download_url: string } }>(endpoint);
        return response.data.download_url;
      }
    );
  },

  /** Envoi en pièce jointe (au comptable, par exemple). */
  async email(id: number, email: string): Promise<void> {
    const endpoint = `${ENDPOINT}/${id}/email`;
    logAPI('POST', endpoint, { email });
    await withMock(
      () => undefined,
      async () => {
        await apiClient.post(endpoint, { email });
      }
    );
  },
};
