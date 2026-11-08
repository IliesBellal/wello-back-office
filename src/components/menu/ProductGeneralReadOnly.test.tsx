import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProductGeneralReadOnly } from './ProductGeneralReadOnly';
import type { Allergen, Product, Tag } from '@/types/menu';

const tags: Tag[] = [
  { id: 't1', name: 'Végétarien' },
  { id: 't2', name: 'Épicé' },
];
const allergens: Allergen[] = [
  { allergen_id: 'a1', name: 'Gluten', code: 'GLU' },
  { allergen_id: 'a2', name: 'Lait', code: 'LAI' },
];

const product: Product = {
  product_id: 'p1',
  name: 'Pizza Margherita',
  description: 'Tomate\nMozzarella',
  category_id: 'c1',
  status: 'out_of_stock',
  contains_alcohol: false,
  bg_color: '#ff8800',
  production_color: '#112233',
  tags: ['t1', 't2'],
  allergens: ['a1'],
};

const render = (overrides: Partial<Product> = {}, layout: 'sheet' | 'dialog' = 'sheet') =>
  renderToStaticMarkup(
    <ProductGeneralReadOnly
      product={{ ...product, ...overrides }}
      categoryName="Pizzas"
      tags={tags}
      allergens={allergens}
      layout={layout}
    />,
  );

// Libellés du formulaire de modification (SimpleProductSheet) : la consultation
// doit exposer les mêmes champs.
const FORM_FIELDS = [
  'Nom du produit',
  'Description',
  'Catégorie',
  'Statut',
  'Alcool',
  'Tags',
  'Allergènes',
  'Couleur fond',
  'Couleur production',
];

describe('ProductGeneralReadOnly', () => {
  it.each(['sheet', 'dialog'] as const)('affiche tous les champs du formulaire (%s)', (layout) => {
    const html = render({}, layout);
    for (const label of FORM_FIELDS) {
      expect(html, label).toContain(label);
    }
  });

  it.each(['sheet', 'dialog'] as const)('affiche les valeurs du produit, sans aucun champ de saisie (%s)', (layout) => {
    const html = render({}, layout);
    expect(html).toContain('Pizza Margherita');
    expect(html).toContain('Mozzarella');
    expect(html).toContain('Pizzas');
    expect(html).toContain('Hors stock');
    expect(html).toContain('Non');
    expect(html).toContain('#ff8800');
    expect(html).toContain('#112233');
    expect(html).not.toMatch(/<(input|textarea|select|button)\b/);
  });

  it('résout les noms des tags et allergènes depuis le catalogue', () => {
    const html = render();
    expect(html).toContain('Végétarien');
    expect(html).toContain('Épicé');
    expect(html).toContain('Gluten');
    expect(html).not.toContain('Lait');
  });

  it('accepte des tags/allergènes en objets et garde leur nom si le catalogue est vide', () => {
    const html = renderToStaticMarkup(
      <ProductGeneralReadOnly
        product={{
          ...product,
          tags: [{ id: 't9', name: 'Maison' }],
          allergens: [{ allergen_id: 'a9', name: 'Arachide', code: 'ARA' }],
        }}
        layout="sheet"
      />,
    );
    expect(html).toContain('Maison');
    expect(html).toContain('Arachide');
  });

  it('indique les valeurs absentes', () => {
    const html = renderToStaticMarkup(
      <ProductGeneralReadOnly
        product={{ product_id: 'p2', name: 'Eau', contains_alcohol: true }}
        tags={tags}
        allergens={allergens}
        layout="sheet"
      />,
    );
    expect(html).toContain('Aucun tag');
    expect(html).toContain('Aucun allergène');
    expect(html).toContain('Oui, contrôle d’âge');
    expect(html).toContain('—');
  });

  it('affiche le statut disponible et traite un statut inconnu comme indisponible', () => {
    expect(render({ status: 'available' })).toContain('Disponible');
    expect(render({ status: 'removed_from_menu' })).toContain('Retiré');
    expect(render({ status: '1' })).toContain('Indisponible');
  });
});
