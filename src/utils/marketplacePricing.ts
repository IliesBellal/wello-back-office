/**
 * Publication et prix des produits sur les plateformes de livraison
 * (Uber Eats, Deliveroo), tels que l'API les applique réellement.
 *
 * GET /menu/products (liste) renvoie l'état de publication à plat :
 * `sync_ubereats` (sans tiret bas, orthographe propre à l'API) /
 * `sync_deliveroo`, et le prix spécifique dans `price_uber_eats` /
 * `price_deliveroo`. Le bloc `integrations` n'y était pas renseigné avant le
 * correctif API (toujours `enabled: false`) : on lit donc les champs plats en
 * priorité, `integrations` ne sert que de repli (fiche produit, mock).
 *
 * Le prix publié suit la règle de l'API (marketplacecatalog.price) : prix
 * spécifique à la plateforme s'il est > 0, sinon prix livraison s'il est > 0,
 * sinon prix sur place.
 */

export type MarketplacePlatform = 'uber_eats' | 'deliveroo';

export interface MarketplaceProductFields {
  price?: number;
  price_delivery?: number;
  price_uber_eats?: number;
  price_deliveroo?: number;
  sync_ubereats?: boolean;
  sync_deliveroo?: boolean;
  integrations?: {
    uber_eats?: { enabled?: boolean; price_override?: number };
    deliveroo?: { enabled?: boolean; price_override?: number };
  };
}

/** Le produit est-il coché pour la plateforme (publié lors de la synchro) ? */
export const isPublishedOn = (product: MarketplaceProductFields, platform: MarketplacePlatform): boolean => {
  const flat = platform === 'uber_eats' ? product.sync_ubereats : product.sync_deliveroo;
  if (typeof flat === 'boolean') return flat;
  return product.integrations?.[platform]?.enabled === true;
};

/** Prix spécifique à la plateforme (centimes), ou undefined s'il n'y en a pas. */
export const marketplacePriceOverride = (
  product: MarketplaceProductFields,
  platform: MarketplacePlatform,
): number | undefined => {
  const flat = platform === 'uber_eats' ? product.price_uber_eats : product.price_deliveroo;
  const value = typeof flat === 'number' ? flat : product.integrations?.[platform]?.price_override;
  return typeof value === 'number' && value > 0 ? value : undefined;
};

/** D'où vient le prix publié sur la plateforme. */
export type MarketplacePriceSource = 'override' | 'delivery' | 'on_site';

export interface MarketplacePrice {
  /** Prix publié, en centimes. */
  cents: number;
  source: MarketplacePriceSource;
}

/** Prix appliqué sur une plateforme sans prix spécifique : livraison, à défaut sur place. */
export const inheritedMarketplacePrice = (product: MarketplaceProductFields): MarketplacePrice =>
  typeof product.price_delivery === 'number' && product.price_delivery > 0
    ? { cents: product.price_delivery, source: 'delivery' }
    : { cents: product.price ?? 0, source: 'on_site' };

/** Prix réellement publié sur la plateforme (même règle que l'API). */
export const effectiveMarketplacePrice = (
  product: MarketplaceProductFields,
  platform: MarketplacePlatform,
): MarketplacePrice => {
  const override = marketplacePriceOverride(product, platform);
  return override !== undefined ? { cents: override, source: 'override' } : inheritedMarketplacePrice(product);
};

export interface MarketplaceMargin {
  /** Revenu après commission, en centimes. */
  netRevenue: number;
  /** Marge après commission (revenu net − coût matières), en centimes. */
  margin: number;
  /**
   * Taux de marge après commission, rapporté au prix de vente sur la
   * plateforme — même base que le taux de marge sur place : à prix égal, la
   * commission retire exactement son pourcentage au taux.
   */
  marginRate: number;
}

/**
 * Marge d'un produit vendu `priceCents` sur une plateforme qui prélève
 * `commissionRate` % du prix de vente.
 */
export const marketplaceMargin = (priceCents: number, costCents: number, commissionRate: number): MarketplaceMargin => {
  const netRevenue = priceCents * (1 - commissionRate / 100);
  const margin = netRevenue - costCents;
  const marginRate = priceCents > 0 ? (margin / priceCents) * 100 : 0;
  return { netRevenue, margin, marginRate };
};
