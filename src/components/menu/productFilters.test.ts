import { describe, expect, it } from 'vitest';

import {
  EMPTY_PRODUCT_FILTERS,
  filterProductsByAttributes,
  getProductStatusValue,
  hasActiveProductFilters,
  type ProductFilters,
} from './productFilters';
import type { Product, SubProduct } from '@/types/menu';

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  product_id: id,
  name: id,
  ...overrides,
});

const filters = (overrides: Partial<ProductFilters>): ProductFilters => ({
  ...EMPTY_PRODUCT_FILTERS,
  ...overrides,
});

const ids = (products: Product[]) => products.map((p) => p.product_id);

describe('hasActiveProductFilters', () => {
  it('est faux sans aucune valeur cochée', () => {
    expect(hasActiveProductFilters(EMPTY_PRODUCT_FILTERS)).toBe(false);
  });

  it('est vrai dès qu\'un filtre porte une valeur', () => {
    expect(hasActiveProductFilters(filters({ statuses: ['available'] }))).toBe(true);
    expect(hasActiveProductFilters(filters({ tagIds: ['t1'] }))).toBe(true);
  });
});

describe('filterProductsByAttributes', () => {
  it('sans filtre, renvoie la liste telle quelle', () => {
    const list = [product('a'), product('b')];
    expect(filterProductsByAttributes(list, EMPTY_PRODUCT_FILTERS)).toBe(list);
  });

  describe('tags', () => {
    const list = [
      product('vegan', { tags: ['t1'] }),
      product('spicy', { tags: [{ id: 't2', name: 'Épicé' }] }),
      product('both', { tags: ['t1', 't2'] }),
      product('none', { tags: [] }),
      product('null', { tags: null }),
    ];

    it('garde les produits portant le tag, en id comme en objet', () => {
      expect(ids(filterProductsByAttributes(list, filters({ tagIds: ['t2'] })))).toEqual(['spicy', 'both']);
    });

    it('plusieurs tags cochés : au moins un des deux', () => {
      expect(ids(filterProductsByAttributes(list, filters({ tagIds: ['t1', 't2'] })))).toEqual([
        'vegan',
        'spicy',
        'both',
      ]);
    });
  });

  describe('disponibilités', () => {
    const list = [
      product('in', { available_in: true }),
      product('take', { available_take_away: true }),
      product('del', { available_delivery: true }),
      product('all', { available_in: true, available_take_away: true, available_delivery: true }),
      product('none', { available_in: false }),
      product('unknown'),
    ];

    it('une valeur cochée', () => {
      expect(ids(filterProductsByAttributes(list, filters({ availability: ['take_away'] })))).toEqual([
        'take',
        'all',
      ]);
    });

    it('plusieurs valeurs cochées : au moins une des deux', () => {
      expect(ids(filterProductsByAttributes(list, filters({ availability: ['on_site', 'delivery'] })))).toEqual([
        'in',
        'del',
        'all',
      ]);
    });
  });

  describe('canaux de vente', () => {
    const list = [
      product('sno', { is_available_on_sno: true }),
      product('kiosk', { is_available_on_kiosk: true }),
      product('uber', { sync_ubereats: true }),
      product('deli', { sync_deliveroo: true }),
      product('off', { is_available_on_sno: false, sync_ubereats: false, sync_deliveroo: false }),
      product('unknown'),
    ];

    it.each([
      ['scannorder', ['sno']],
      ['kiosk', ['kiosk']],
      ['uber_eats', ['uber']],
      ['deliveroo', ['deli']],
    ] as const)('canal %s', (channel, expected) => {
      expect(ids(filterProductsByAttributes(list, filters({ channels: [channel] })))).toEqual(expected);
    });

    it('plusieurs canaux cochés : au moins un des deux', () => {
      expect(ids(filterProductsByAttributes(list, filters({ channels: ['uber_eats', 'deliveroo'] })))).toEqual([
        'uber',
        'deli',
      ]);
    });

    it('ne lit pas integrations, que la liste ne renseigne pas', () => {
      const listProduct = product('x', {
        sync_ubereats: true,
        integrations: { uber_eats: { enabled: false } },
      });
      expect(ids(filterProductsByAttributes([listProduct], filters({ channels: ['uber_eats'] })))).toEqual(['x']);
    });
  });

  describe('statuts', () => {
    const list = [
      product('available', { status: 'available' }),
      product('stock', { status: 'out_of_stock' }),
      product('off', { status: 'not_available' }),
      product('removed', { status: 'removed_from_menu' }),
      product('legacy', { status: '1' }),
      product('legacy-zero', { status: 0 }),
      product('missing'),
    ];

    it('un statut hérité ou absent compte comme disponible, comme dans le tableau', () => {
      expect(getProductStatusValue(product('legacy', { status: '1' }))).toBe('available');
      expect(ids(filterProductsByAttributes(list, filters({ statuses: ['available'] })))).toEqual([
        'available',
        'legacy',
        'legacy-zero',
        'missing',
      ]);
    });

    it('plusieurs statuts cochés', () => {
      expect(
        ids(filterProductsByAttributes(list, filters({ statuses: ['out_of_stock', 'removed_from_menu'] }))),
      ).toEqual(['stock', 'removed']);
    });
  });

  describe('combinaison de filtres', () => {
    it('ET entre filtres différents, OU à l\'intérieur de chacun', () => {
      const list = [
        product('match', { tags: ['t1'], available_delivery: true, status: 'available' }),
        product('wrong-tag', { tags: ['t9'], available_delivery: true, status: 'available' }),
        product('wrong-status', { tags: ['t1'], available_delivery: true, status: 'not_available' }),
        product('wrong-dispo', { tags: ['t1'], available_in: true, status: 'available' }),
      ];
      const result = filterProductsByAttributes(
        list,
        filters({
          tagIds: ['t1', 't2'],
          availability: ['delivery', 'take_away'],
          statuses: ['available', 'out_of_stock'],
        }),
      );
      expect(ids(result)).toEqual(['match']);
    });
  });

  describe('groupes de produits', () => {
    const sub = (id: string, overrides: Partial<Product> = {}) =>
      ({ product_id: id, name: id, ...overrides }) as SubProduct;

    it('garde un groupe dont un sous-produit correspond', () => {
      const group = product('menu', {
        is_product_group: true,
        status: 'available',
        sub_products: [sub('s1', { status: 'out_of_stock' }), sub('s2', { status: 'available' })],
      });
      expect(ids(filterProductsByAttributes([group], filters({ statuses: ['out_of_stock'] })))).toEqual(['menu']);
    });

    it('garde tous les sous-produits du groupe conservé', () => {
      const group = product('menu', {
        is_product_group: true,
        sub_products: [sub('s1', { status: 'out_of_stock' }), sub('s2', { status: 'available' })],
      });
      const [kept] = filterProductsByAttributes([group], filters({ statuses: ['out_of_stock'] }));
      expect(kept.sub_products).toHaveLength(2);
    });

    it('écarte un groupe dont ni lui ni ses sous-produits ne correspondent', () => {
      const group = product('menu', {
        is_product_group: true,
        status: 'available',
        sub_products: [sub('s1', { status: 'available' })],
      });
      expect(filterProductsByAttributes([group], filters({ statuses: ['removed_from_menu'] }))).toEqual([]);
    });

    it('un produit simple n\'est pas conservé via un champ sub_products', () => {
      const simple = product('simple', {
        status: 'available',
        sub_products: [sub('s1', { status: 'out_of_stock' })],
      });
      expect(filterProductsByAttributes([simple], filters({ statuses: ['out_of_stock'] }))).toEqual([]);
    });
  });
});
