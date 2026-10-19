import { describe, expect, it } from 'vitest';

import { buildApplyPayload, currentKey, initialSelection, proposedKey } from './aiComposition';
import type { AICompositionPreview } from '@/types/aiComposition';

const preview: AICompositionPreview = {
  credits: { total: 10, used: 1, remaining: 9 },
  products: [
    {
      product_id: '1',
      name: 'Burger',
      description: 'Steak, tomate',
      status: 'proposed',
      current: [
        { component_id: '7', name: 'Tomates', quantity: 30 },
        { component_id: '8', name: 'Oignon', quantity: 10 },
      ],
      proposed: [
        { name: 'Tomates', category: 'vegetables', unit: 'G', component_id: '7', in_composition: true },
        { name: 'Steak', category: 'meat', unit: 'G', in_composition: false },
      ],
    },
    {
      product_id: '2',
      name: 'Salade',
      description: 'Roquette',
      status: 'proposed',
      current: [{ component_id: '9', name: 'Roquette', quantity: 0 }],
      proposed: [{ name: 'Roquette', category: 'vegetables', unit: 'G', component_id: '9', in_composition: true }],
    },
    { product_id: '3', name: 'Coca', description: '', status: 'no_description', current: [], proposed: [] },
  ],
};

describe('buildApplyPayload', () => {
  it('compléter : seuls les ingrédients cochés absents partent, un produit sans ajout est sauté', () => {
    expect(buildApplyPayload(preview, initialSelection(preview), 'add')).toEqual([
      { product_id: '1', mode: 'add', ingredients: [{ name: 'Steak', category: 'meat', unit: 'G' }] },
    ]);
  });

  it('remplacer : composition voulue complète, ingrédient actuel non cité retiré par défaut', () => {
    expect(buildApplyPayload(preview, initialSelection(preview), 'replace')).toEqual([
      {
        product_id: '1',
        mode: 'replace',
        ingredients: [
          { name: 'Tomates', category: 'vegetables', unit: 'G' },
          { name: 'Steak', category: 'meat', unit: 'G' },
        ],
      },
      { product_id: '2', mode: 'replace', ingredients: [{ name: 'Roquette', category: 'vegetables', unit: 'G' }] },
    ]);
  });

  it('remplacer : un ingrédient actuel recoché est gardé, un proposé décoché ne part pas', () => {
    const selection = {
      '1': [proposedKey(preview.products[0].proposed[0]), currentKey(preview.products[0].current[1])],
      '2': [],
    };
    const payload = buildApplyPayload(preview, selection, 'replace');
    expect(payload[0].ingredients.map((line) => line.name)).toEqual(['Tomates', 'Oignon']);
    expect(payload[1].ingredients).toEqual([]);
  });
});
