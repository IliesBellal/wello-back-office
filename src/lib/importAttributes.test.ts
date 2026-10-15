import { describe, expect, it } from 'vitest';

import type { ImportPreviewAttribute } from '@/types/import';

import { describeAttributeRule } from './importAttributes';

const attribute = (min: number, max: number): ImportPreviewAttribute => ({
  external_id: 'a',
  name: 'Quantité',
  action: 'create',
  option_count: 3,
  min_options: min,
  max_options: max,
});

describe('describeAttributeRule', () => {
  it('dit « choix unique, obligatoire » pour un groupe Quantité ou Taille', () => {
    expect(describeAttributeRule(attribute(1, 1))).toBe('choix unique, obligatoire');
  });

  it('décrit un groupe de suppléments facultatif', () => {
    expect(describeAttributeRule(attribute(0, 3))).toBe('jusqu’à 3 choix, facultatif');
  });

  it('décrit un nombre de choix obligatoire ou une fourchette', () => {
    expect(describeAttributeRule(attribute(2, 2))).toBe('2 choix obligatoires');
    expect(describeAttributeRule(attribute(1, 3))).toBe('1 à 3 choix, obligatoire');
  });
});
