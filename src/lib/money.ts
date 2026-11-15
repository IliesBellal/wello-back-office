/**
 * Money helpers. Backend monetary amounts are stored as integer cents.
 */

/** Convert an integer amount in cents to a euros value. */
export const toEuros = (cents: number): number => cents / 100;

/** Convert a euros value to an integer amount in cents (rounded). */
export const toCents = (euros: number): number => Math.round(euros * 100);

/**
 * Devise de l'établissement connecté (code ISO 4217, `authData.merchant.currency`),
 * fixée par `AuthContext`. "EUR" tant qu'aucun établissement n'est chargé.
 */
let merchantCurrency = 'EUR';

export const setMerchantCurrency = (currency: string | null | undefined): void => {
  const code = (currency ?? '').trim().toUpperCase();
  merchantCurrency = code || 'EUR';
};

export const getMerchantCurrency = (): string => merchantCurrency;

/**
 * Montant en euros (ou unité de la devise) affiché au format français dans la
 * devise de l'établissement : "1 234,50 €". [options] ajuste les décimales.
 */
export const formatMoney = (amount: number, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: merchantCurrency,
    ...options,
  }).format(amount);

/** Comme [formatMoney], pour un montant en centimes (format de l'API). */
export const formatCents = (cents: number, options?: Intl.NumberFormatOptions): string =>
  formatMoney(cents / 100, options);
