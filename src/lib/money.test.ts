import { afterEach, describe, expect, it } from 'vitest';
import { formatCents, formatMoney, setMerchantCurrency } from './money';

// Intl sépare avec des espaces insécables (U+00A0 / U+202F).
const plain = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

describe('formatCents / formatMoney', () => {
  afterEach(() => setMerchantCurrency(undefined));

  it('affiche des euros au format français par défaut', () => {
    expect(plain(formatCents(123450))).toBe('1 234,50 €');
    expect(plain(formatMoney(12.5))).toBe('12,50 €');
  });

  it('accepte des options de décimales', () => {
    expect(plain(formatMoney(1234, { maximumFractionDigits: 0 }))).toBe('1 234 €');
  });

  it("suit la devise de l'établissement", () => {
    setMerchantCurrency('chf');
    expect(plain(formatCents(1250))).toBe('12,50 CHF');
  });
});
