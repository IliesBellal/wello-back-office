import { describe, expect, it } from 'vitest';
import { dayLabel, durationLabel, pct, sourceLabel } from './channelFormat';

describe('channelFormat', () => {
  it('pct : une décimale, tiret si total nul', () => {
    expect(pct(1, 3)).toBe('33.3 %');
    expect(pct(5, 0)).toBe('—');
  });

  it('durationLabel : minutes et secondes, tiret si inconnue', () => {
    expect(durationLabel(118)).toBe('1 min 58 s');
    expect(durationLabel(65.4)).toBe('1 min 05 s');
    expect(durationLabel(45)).toBe('45 s');
    expect(durationLabel(null)).toBe('—');
  });

  it('dayLabel : JJ/MM', () => {
    expect(dayLabel('2026-10-26')).toBe('26/10');
  });

  it('sourceLabel : libellé connu, surcharge, lien marqué', () => {
    expect(sourceLabel('qr_table')).toBe('QR de table');
    expect(sourceLabel('direct', { direct: 'Direct ou QR de la franchise' })).toBe('Direct ou QR de la franchise');
    expect(sourceLabel('newsletter')).toBe('Lien « newsletter »');
  });
});
