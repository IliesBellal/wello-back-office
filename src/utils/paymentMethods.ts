// Canonical payment-method keys for the Règlements tab, mirroring
// internal/modules/analytics/payment_methods.go (ib-welloresto-api repo).
// The real payments.mop column carries 14 distinct raw values on PROD
// (DROITS.md/AUDIT.md P14) — the backend buckets them into these 7 genuine
// methods plus "other". None of the 14 raw values is "mobile" — do not add
// a mobile entry here just because the old mock had one.
export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CB: '#3b82f6',
  ES: '#10b981',
  STRIPE: '#8b5cf6',
  TR: '#f59e0b',
  CURRENCY: '#ec4899',
  UBER_EATS: '#06b6d4',
  DELIVEROO: '#14b8a6',
  other: '#9ca3af',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CB: 'Carte bancaire',
  ES: 'Espèces',
  STRIPE: 'Stripe',
  TR: 'Titres-restaurant',
  CURRENCY: 'Devise étrangère',
  UBER_EATS: 'Uber Eats',
  DELIVEROO: 'Deliveroo',
  other: 'Autre',
};

export const PAYMENT_METHOD_ORDER = [
  'CB',
  'ES',
  'STRIPE',
  'TR',
  'CURRENCY',
  'UBER_EATS',
  'DELIVEROO',
  'other',
] as const;

export const paymentMethodColor = (method: string): string => PAYMENT_METHOD_COLORS[method] ?? PAYMENT_METHOD_COLORS.other;
export const paymentMethodLabel = (method: string): string => PAYMENT_METHOD_LABELS[method] ?? method;
