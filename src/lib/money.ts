/**
 * Money helpers. Backend monetary amounts are stored as integer cents.
 */

/** Convert an integer amount in cents to a euros value. */
export const toEuros = (cents: number): number => cents / 100;

/** Convert a euros value to an integer amount in cents (rounded). */
export const toCents = (euros: number): number => Math.round(euros * 100);
