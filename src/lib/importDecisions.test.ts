import { describe, expect, it } from 'vitest';

import { buildImportDecisions } from './importDecisions';
import type { ImportDecisions, ImportPreviewChannel, ImportPreviewResult } from '@/types/import';

const channel: ImportPreviewChannel = {
  price: 1200,
  rate: 10,
  tva_id: 1,
  available: true,
  resolved: true,
  backfilled: false,
  price_backfilled: false,
};

const photoPreview = {
  token: 't',
  provider: 'ai_photo',
  expires_at: '',
  tva_rates: [],
  categories: [],
  tags: [],
  attributes: [],
  component_categories: [],
  components: [],
  warnings: [],
  products: [
    {
      external_id: 'ai-p-burger',
      name: 'Burger',
      action: 'create',
      status: 'available',
      category_external_id: '',
      category_source: 'explicit',
      needs_category: false,
      tag_external_ids: [],
      channels: { in: channel, take_away: channel, delivery: channel },
      kind: 'food',
      component_external_ids: ['ai-i-steak', 'ai-i-tomate'],
    },
  ],
} as unknown as ImportPreviewResult;

const baseDecisions: ImportDecisions = {
  tag_classification: {},
  category_per_product: {},
  tva_mapping: {},
  name_collisions: {},
  already_imported: {},
  excluded_products: {},
};

describe('buildImportDecisions — porte photo', () => {
  it('envoie les promotions écartées : elles sont créées actives sinon', () => {
    const built = buildImportDecisions(photoPreview, {
      ...baseDecisions,
      excluded_promotions: { 'ai-promo-lundi': true },
    });
    expect(built.excluded_promotions).toEqual({ 'ai-promo-lundi': true });
  });

  it('envoie les ingrédients gardés des seuls produits de la prévisualisation', () => {
    const built = buildImportDecisions(photoPreview, {
      ...baseDecisions,
      ingredients_per_product: { 'ai-p-burger': ['ai-i-steak'], 'ai-p-disparu': [] },
    });
    expect(built.ingredients_per_product).toEqual({ 'ai-p-burger': ['ai-i-steak'] });
  });
});
