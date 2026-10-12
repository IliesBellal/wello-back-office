import { apiClient, withMock, logAPI } from "@/services/apiClient";

/**
 * Factures d'abonnement : pour chaque paiement de l'abonnement Wello Resto, la
 * facture Stripe est envoyée par e-mail à l'établissement. Ici, l'historique et
 * le téléchargement du PDF.
 */
export interface SubscriptionInvoice {
  /** Identifiant Stripe de la facture (in_...). */
  invoice_id: string;
  /** Numéro de facture Stripe. */
  number: string;
  /** Montant payé, en centimes. */
  amount_paid: number;
  currency: string;
  /** Période d'abonnement couverte (ISO). */
  period_start: string;
  period_end: string;
  /** Date du paiement (ISO). */
  paid_at: string;
  /** Date d'envoi du mail (ISO). */
  sent_at: string;
  has_pdf: boolean;
}

export interface SubscriptionInvoiceLink {
  invoice_id: string;
  filename: string;
  /** Lien signé, valable une heure. */
  download_url: string;
}

const ENDPOINT = '/billing/invoices';

export const subscriptionInvoicesService = {
  async list(): Promise<SubscriptionInvoice[]> {
    logAPI('GET', ENDPOINT);
    return withMock<SubscriptionInvoice[]>(
      () => [],
      async () => {
        const response = await apiClient.get<{ id: string; data: { status: string; invoices: SubscriptionInvoice[] } }>(ENDPOINT);
        return response.data.invoices ?? [];
      }
    );
  },

  /** Nouveau lien signé (une heure) vers le PDF d'une facture. */
  async getLink(invoiceId: string): Promise<SubscriptionInvoiceLink> {
    const endpoint = `${ENDPOINT}/${encodeURIComponent(invoiceId)}/download`;
    logAPI('GET', endpoint);
    return withMock<SubscriptionInvoiceLink>(
      () => ({ invoice_id: invoiceId, filename: 'facture_demo.pdf', download_url: '#' }),
      async () => {
        const response = await apiClient.get<{ id: string; data: SubscriptionInvoiceLink }>(endpoint);
        return response.data;
      }
    );
  },
};
