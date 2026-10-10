import { apiClient, withMock, logAPI } from "@/services/apiClient";

/**
 * Justificatifs de versement : pour chaque virement Stripe reçu, un relevé
 * (ce que contient le versement) et la facture de la commission Wello Resto.
 * Ils sont aussi envoyés par e-mail ; ici, l'historique et le téléchargement.
 */
export interface PayoutDocument {
  /** Référence Stripe du versement (po_...). */
  payout_id: string;
  /** Montant versé, en centimes. */
  amount: number;
  currency: string;
  /** Date d'arrivée sur le compte bancaire (ISO). */
  arrival_date: string;
  /** Date d'envoi des justificatifs (ISO). */
  sent_at: string;
  /** Absent quand le versement n'a pas donné lieu à une facture. */
  invoice_number?: string;
  /** Commission TTC facturée, en centimes. */
  commission_ttc?: number;
  has_statement: boolean;
  has_invoice: boolean;
}

export type PayoutDocumentKind = 'statement' | 'invoice';

export interface PayoutDocumentLink {
  payout_id: string;
  kind: PayoutDocumentKind;
  filename: string;
  /** Lien signé, valable une heure. */
  download_url: string;
}

const ENDPOINT = '/accounting/payouts';

export const payoutDocumentsService = {
  async list(): Promise<PayoutDocument[]> {
    logAPI('GET', ENDPOINT);
    return withMock<PayoutDocument[]>(
      () => [],
      async () => {
        const response = await apiClient.get<{ id: string; data: { status: string; payouts: PayoutDocument[] } }>(ENDPOINT);
        return response.data.payouts ?? [];
      }
    );
  },

  /** Nouveau lien signé (une heure) vers le relevé ou la facture d'un versement. */
  async getLink(payoutId: string, kind: PayoutDocumentKind): Promise<PayoutDocumentLink> {
    const endpoint = `${ENDPOINT}/${encodeURIComponent(payoutId)}/${kind}/download`;
    logAPI('GET', endpoint);
    return withMock<PayoutDocumentLink>(
      () => ({ payout_id: payoutId, kind, filename: 'document_demo.pdf', download_url: '#' }),
      async () => {
        const response = await apiClient.get<{ id: string; data: PayoutDocumentLink }>(endpoint);
        return response.data;
      }
    );
  },
};
