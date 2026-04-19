/**
 * Price input utility functions for consistent price handling across components
 * Handles conversion between display format (euros with comma separator) and cents
 */

/**
 * Convert display string (with . or ,) to cents
 * @example "5,50" or "5.50" → 550
 * @example "10" → 1000
 */
export const parsePriceInput = (value: string): number => {
  if (!value) return 0;
  // Replace comma with dot for consistency
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
};

/**
 * Convert cents to display string (format: XX,XX with comma as separator)
 * @example 550 → "5,50"
 * @example 1000 → "10,00"
 */
export const priceToDisplayValue = (cents: number | undefined): string => {
  if (cents === undefined || cents === null) return '';
  const euros = cents / 100;
  return euros.toFixed(2).replace('.', ',');
};

/**
 * Format price as currency string
 * @example 550 → "5,50 €"
 * @example 1000 → "10,00 €"
 */
export const formatPrice = (cents: number | undefined): string => {
  if (cents === undefined || cents === null) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

/**
 * Interface for managing price display values
 * Keeps display values separate from form state to prevent focus loss during input
 */
export interface PriceDisplayValues {
  [key: string]: string;
}

/**
 * Initialize price display values from form data
 * @param prices Object with price fields in cents
 * @param fields Array of field names to initialize
 */
export const initializePriceDisplayValues = (
  prices: Record<string, number | undefined>,
  fields: string[]
): PriceDisplayValues => {
  const displayValues: PriceDisplayValues = {};
  fields.forEach(field => {
    displayValues[field] = priceToDisplayValue(prices[field]);
  });
  return displayValues;
};
