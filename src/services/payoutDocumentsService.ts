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

/** Facture de commission mensuelle (et récapitulatif du mois). */
export interface CommissionInvoice {
  number: string;
  /** 1er jour du mois facturé (ISO). */
  period_month: string;
  amount_ttc: number;
  amount_ht: number;
  payout_count: number;
  issued_at: string;
  has_invoice: boolean;
  has_recap: boolean;
}

export type CommissionInvoiceKind = 'invoice' | 'recap';

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

  /** Factures de commission mensuelles, de la plus récente à la plus ancienne. */
  async listCommissionInvoices(): Promise<CommissionInvoice[]> {
    const endpoint = '/accounting/commission-invoices';
    logAPI('GET', endpoint);
    return withMock<CommissionInvoice[]>(
      () => [],
      async () => {
        const response = await apiClient.get<{ id: string; data: { status: string; invoices: CommissionInvoice[] } }>(endpoint);
        return response.data.invoices ?? [];
      }
    );
  },

  /** Lien signé (une heure) vers la facture de commission ou le récapitulatif du mois. */
  async getCommissionInvoiceLink(number: string, kind: CommissionInvoiceKind): Promise<PayoutDocumentLink> {
    const endpoint = `/accounting/commission-invoices/${encodeURIComponent(number)}/${kind}/download`;
    logAPI('GET', endpoint);
    return withMock<PayoutDocumentLink>(
      () => ({ payout_id: number, kind: 'invoice', filename: `${kind}_demo.pdf`, download_url: '#' }),
      async () => {
        const response = await apiClient.get<{ id: string; data: PayoutDocumentLink }>(endpoint);
        return response.data;
      }
    );
  },

  /** Nouveau lien signé (une heure) vers le relevé ou la facture d'un versement. */
  async getLink(payout: PayoutDocument, kind: PayoutDocumentKind): Promise<PayoutDocumentLink> {
    const payoutId = payout.payout_id;
    // Le relevé est servi par /payouts/{id}/download ; la facture de commission
    // par /commission-invoices/{numéro}/invoice/download.
    const endpoint =
      kind === 'statement'
        ? `${ENDPOINT}/${encodeURIComponent(payoutId)}/download`
        : `/accounting/commission-invoices/${encodeURIComponent(payout.invoice_number ?? '')}/invoice/download`;
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
