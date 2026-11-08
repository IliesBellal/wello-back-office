import type { Product, ProductStatus, Tag } from '@/types/menu';

/** Les 4 statuts de vente canoniques, dans l'ordre d'affichage. */
export const PRODUCT_STATUS_ORDER: ProductStatus[] = [
  'available',
  'out_of_stock',
  'not_available',
  'removed_from_menu',
];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  available: 'Disponible',
  out_of_stock: 'Rupture de stock',
  not_available: 'Indisponible',
  removed_from_menu: 'Retiré du menu',
};

/**
 * `product.status` porte encore des valeurs héritées en base ('1', '0', vide) :
 * tout ce qui n'est pas une des 4 valeurs canoniques retombe sur "available",
 * comme l'affichage du tableau.
 */
export const getProductStatusValue = (product: Product): ProductStatus => {
  const raw = product.status?.toString();
  return raw && (PRODUCT_STATUS_ORDER as string[]).includes(raw) ? (raw as ProductStatus) : 'available';
};

export type AvailabilityFilter = 'on_site' | 'take_away' | 'delivery';
export type ChannelFilter = 'scannorder' | 'kiosk' | 'uber_eats' | 'deliveroo';

export const AVAILABILITY_OPTIONS: { id: AvailabilityFilter; label: string }[] = [
  { id: 'on_site', label: 'Sur place' },
  { id: 'take_away', label: 'À emporter' },
  { id: 'delivery', label: 'Livraison' },
];

export const CHANNEL_OPTIONS: { id: ChannelFilter; label: string }[] = [
  { id: 'scannorder', label: 'ScanNOrder' },
  { id: 'kiosk', label: 'Borne de commande' },
  { id: 'uber_eats', label: 'Uber Eats' },
  { id: 'deliveroo', label: 'Deliveroo' },
];

/**
 * Filtres multi-valeurs de la page Produits. Dans un même filtre, un produit
 * passe s'il correspond à AU MOINS UNE valeur cochée ; entre filtres, il doit
 * satisfaire TOUS les filtres renseignés. Un filtre vide ne restreint rien.
 */
export interface ProductFilters {
  tagIds: string[];
  availability: AvailabilityFilter[];
  channels: ChannelFilter[];
  statuses: ProductStatus[];
}

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  tagIds: [],
  availability: [],
  channels: [],
  statuses: [],
};

export const hasActiveProductFilters = (filters: ProductFilters): boolean =>
  filters.tagIds.length > 0 ||
  filters.availability.length > 0 ||
  filters.channels.length > 0 ||
  filters.statuses.length > 0;

const tagIdOf = (tag: string | Tag | null | undefined): string | undefined =>
  typeof tag === 'string' ? tag : tag?.id;

const isAvailable = (product: Product, kind: AvailabilityFilter): boolean => {
  switch (kind) {
    case 'on_site':
      return product.available_in === true;
    case 'take_away':
      return product.available_take_away === true;
    case 'delivery':
      return product.available_delivery === true;
  }
};

// Uber Eats / Deliveroo : on lit les drapeaux `sync_*` de la liste (cf. type
// Product) — `integrations` n'y est pas renseigné.
const isOnChannel = (product: Product, channel: ChannelFilter): boolean => {
  switch (channel) {
    case 'scannorder':
      return product.is_available_on_sno === true;
    case 'kiosk':
      return product.is_available_on_kiosk === true;
    case 'uber_eats':
      return product.sync_ubereats === true;
    case 'deliveroo':
      return product.sync_deliveroo === true;
  }
};

/** Le produit lui-même satisfait-il tous les filtres renseignés ? */
export const matchesProductFilters = (product: Product, filters: ProductFilters): boolean => {
  if (filters.tagIds.length > 0) {
    const productTagIds = (product.tags ?? []).map(tagIdOf);
    if (!filters.tagIds.some((id) => productTagIds.includes(id))) return false;
  }
  if (filters.availability.length > 0 && !filters.availability.some((kind) => isAvailable(product, kind))) {
    return false;
  }
  if (filters.channels.length > 0 && !filters.channels.some((channel) => isOnChannel(product, channel))) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(getProductStatusValue(product))) {
    return false;
  }
  return true;
};

/**
 * Applique les filtres à une liste de produits. Un groupe est conservé s'il
 * correspond lui-même OU si l'un de ses sous-produits correspond : sinon un
 * sous-produit qui répond au filtre resterait introuvable, puisqu'il n'est
 * visible que dans son groupe. Les sous-produits d'un groupe conservé restent
 * tous affichés une fois le groupe déplié.
 */
export const filterProductsByAttributes = (products: Product[], filters: ProductFilters): Product[] => {
  if (!hasActiveProductFilters(filters)) return products;

  return products.filter(
    (product) =>
      matchesProductFilters(product, filters) ||
      (product.is_product_group === true &&
        (product.sub_products ?? []).some((sub) => matchesProductFilters(sub as Product, filters))),
  );
};
