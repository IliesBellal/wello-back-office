import { describe, expect, it } from 'vitest';
import { normalizeSource, withSource } from './sourceLink';

describe('sourceLink', () => {
  it('normalizeSource : minuscules, accents retirés, espaces en _', () => {
    expect(normalizeSource('  Marché de Noël ')).toBe('marche_de_noel');
    expect(normalizeSource('!!!')).toBe('');
    expect(normalizeSource('a'.repeat(40))).toHaveLength(32);
  });

  it('withSource : ajoute ou remplace src, garde les autres paramètres', () => {
    expect(withSource('https://x.fr/resto', 'flyer')).toBe('https://x.fr/resto?src=flyer');
    expect(withSource('https://x.fr/resto?a=1&src=old', 'flyer')).toBe('https://x.fr/resto?a=1&src=flyer');
    expect(withSource('https://x.fr/resto', '')).toBe('https://x.fr/resto');
  });
});
