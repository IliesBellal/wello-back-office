import type { Order, OrderPayment } from '../services/ordersService';

/**
 * Paiement à encaisser d'une commande (paiement annoncé par le client, pas
 * encore encaissé). Le statut « payé » se déduit des paiements réels, jamais
 * de l'annonce : même règle que l'API (somme des paiements actifs = prix).
 */

// brand_status d'une commande qui n'attend plus d'encaissement.
const NO_COLLECTION_BRAND_STATUSES = new Set(['CANCELED', 'DENIED', 'DELETED']);

type PaymentLike = Pick<OrderPayment, 'amount' | 'enabled'>;

/** Un paiement annulé (enabled = false / 0) ne compte pas. */
export const isPaymentActive = (payment: Pick<OrderPayment, 'enabled'>): boolean =>
  payment.enabled !== false && payment.enabled !== 0;

/** Somme des paiements actifs, en centimes. */
export const getPaidAmount = (payments: PaymentLike[] | null | undefined): number =>
  (payments ?? []).filter(isPaymentActive).reduce((sum, payment) => sum + payment.amount, 0);

export interface PendingCollection {
  /** Moyen annoncé (clé API : ES, CB, TR…). */
  mop: string;
  /** Reste à encaisser, en centimes. */
  amount: number;
  /** Espèces : montant que le client compte donner, null si non précisé. */
  tenderAmount: number | null;
  /** Espèces : monnaie à rendre, null si inconnue ou nulle. */
  changeDue: number | null;
}

type CollectionOrder = Pick<Order, 'TTC'> & { payments: PaymentLike[] } & Partial<
    Pick<Order, 'expected_payment' | 'brand_status'>
  >;

/**
 * Ce qu'il reste à encaisser selon l'annonce du client, ou null quand il n'y a
 * rien à encaisser : aucune annonce, commande déjà soldée, commande annulée
 * ou refusée.
 */
export const getPendingCollection = (order: CollectionOrder): PendingCollection | null => {
  const expected = order.expected_payment;
  if (!expected?.mop) return null;
  if (order.brand_status && NO_COLLECTION_BRAND_STATUSES.has(order.brand_status)) return null;

  const remaining = order.TTC - getPaidAmount(order.payments);
  if (remaining <= 0) return null;

  const tender = expected.tender_amount ?? null;
  const change = tender !== null && tender > remaining ? tender - remaining : null;
  return { mop: expected.mop, amount: remaining, tenderAmount: tender, changeDue: change };
};
