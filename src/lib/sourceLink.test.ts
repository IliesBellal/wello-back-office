import { describe, expect, it } from 'vitest';
import { normalizeSource, withSource } from './sourceLink';

describe('sourceLink', () => {
  it('normalizeSource : minuscules, accents retirés, espaces en _', () => {
    expect(normalizeSource('  Marché de Noël ')).toBe('marche_de_noel');
    expect(normalizeSource('!!!')).toBe('');
    expect(normalizeSource('a'.repeat(40))).toHaveLength(32);
  });

  it('withSource : ajoute ou remplace utm_source, garde les autres paramètres', () => {
    expect(withSource('https://x.fr/resto', 'flyer')).toBe('https://x.fr/resto?utm_source=flyer');
    expect(withSource('https://x.fr/resto?a=1&utm_source=old', 'flyer')).toBe('https://x.fr/resto?a=1&utm_source=flyer');
    expect(withSource('https://x.fr/resto', '')).toBe('https://x.fr/resto');
  });
});
