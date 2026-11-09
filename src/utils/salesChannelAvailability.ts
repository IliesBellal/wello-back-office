/**
 * Activation d'un produit par canal de vente, telle que pilotée par les
 * switches de la grille de prix.
 *
 * - Sur place / à emporter / livraison : colonnes products.available_in /
 *   available_take_away / available_delivery (NOT NULL DEFAULT TRUE côté
 *   base : un champ absent vaut donc « activé »). « Livraison » est la
 *   livraison propre de l'établissement, indépendante des plateformes.
 * - Uber Eats / Deliveroo : cases de publication sync_uber_eats /
 *   sync_deliveroo (cf. marketplacePricing.ts).
 *
 * Toutes s'écrivent par PATCH /menu/products/bulk/availability.
 */
import type { BulkAvailabilityFields, Product } from '@/types/menu';
import { MarketplacePlatform, MarketplaceProductFields, isPublishedOn } from '@/utils/marketplacePricing';

export type SalesChannel = 'on_site' | 'take_away' | 'delivery' | MarketplacePlatform;

export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  on_site: 'Sur place',
  take_away: 'À emporter',
  delivery: 'Livraison',
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
};

export const isMarketplaceChannel = (channel: SalesChannel): channel is MarketplacePlatform =>
  channel === 'uber_eats' || channel === 'deliveroo';

export interface ChannelAvailabilityFields extends MarketplaceProductFields {
  available_in?: boolean;
  available_take_away?: boolean;
  available_delivery?: boolean;
}

/** Le produit est-il activé sur ce canal ? */
export const isChannelEnabled = (product: ChannelAvailabilityFields, channel: SalesChannel): boolean => {
  switch (channel) {
    case 'on_site':
      return product.available_in !== false;
    case 'take_away':
      return product.available_take_away !== false;
    case 'delivery':
      return product.available_delivery !== false;
    default:
      return isPublishedOn(product, channel);
  }
};

/** Corps de PATCH /menu/products/bulk/availability pour un seul canal. */
export const channelAvailabilityFields = (channel: SalesChannel, enabled: boolean): BulkAvailabilityFields => {
  switch (channel) {
    case 'on_site':
      return { available_in: enabled };
    case 'take_away':
      return { available_take_away: enabled };
    case 'delivery':
      return { available_delivery: enabled };
    case 'uber_eats':
      return { sync_uber_eats: enabled };
    case 'deliveroo':
      return { sync_deliveroo: enabled };
  }
};

/**
 * Champs à reporter localement sur un produit après (dés)activation d'un
 * canal. Pour une plateforme, `integrations` est tenu cohérent avec le
 * drapeau plat (sync_ubereats, sans tiret bas, orthographe de l'API).
 */
export const channelAvailabilityPatch = (
  product: Pick<Product, 'integrations'>,
  channel: SalesChannel,
  enabled: boolean,
): Partial<Product> => {
  switch (channel) {
    case 'on_site':
      return { available_in: enabled };
    case 'take_away':
      return { available_take_away: enabled };
    case 'delivery':
      return { available_delivery: enabled };
    case 'uber_eats':
      return {
        sync_ubereats: enabled,
        integrations: { ...product.integrations, uber_eats: { ...product.integrations?.uber_eats, enabled } },
      };
    case 'deliveroo':
      return {
        sync_deliveroo: enabled,
        integrations: { ...product.integrations, deliveroo: { ...product.integrations?.deliveroo, enabled } },
      };
  }
};
