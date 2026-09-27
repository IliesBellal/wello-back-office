// Source × order-type filter accepted by the CA, Commandes, Produits,
// Options, Annulations and Vente additionnelle endpoints — mirrors
// internal/modules/analytics/order_filter.go (ib-welloresto-api repo). The
// keys are the raw values of orders.order_source / orders.order_type, never
// translated: the server validates against exactly these lists (400 on any
// other value).
//
// Not to be confused with channels.ts: those 8 keys are a brand × order_type
// derivation used as an output breakdown (and as the Clients/Remises input
// filter); this is two independent dimensions, filtered separately.

export const ORDER_SOURCE_OPTIONS = [
  { id: 'WELLO_RESTO_POS', label: 'Caisse' },
  { id: 'KIOSK', label: 'Borne de commande' },
  { id: 'SCANNORDER', label: 'ScanNOrder' },
  { id: 'UBER_EATS', label: 'Uber Eats' },
  { id: 'DELIVEROO', label: 'Deliveroo' },
] as const;

export const ORDER_TYPE_OPTIONS = [
  { id: 'IN', label: 'Sur place' },
  { id: 'TAKE_AWAY', label: 'À emporter' },
  { id: 'DELIVERY', label: 'Livraison' },
] as const;

export interface OrderFilterSelection {
  sources: string[];
  orderTypes: string[];
}

export const DEFAULT_ORDER_FILTER: OrderFilterSelection = {
  sources: ORDER_SOURCE_OPTIONS.map((o) => o.id),
  orderTypes: ORDER_TYPE_OPTIONS.map((o) => o.id),
};

const isComplete = (selected: string[], total: number) => selected.length === 0 || selected.length >= total;

export const isOrderFilterActive = (filter?: OrderFilterSelection): boolean =>
  !!filter &&
  (!isComplete(filter.sources, ORDER_SOURCE_OPTIONS.length) ||
    !isComplete(filter.orderTypes, ORDER_TYPE_OPTIONS.length));

// Request body fields. A dimension with every value ticked is omitted rather
// than sent in full: the server treats both identically, but omitting keeps
// the unfiltered request (and its cache key) byte-for-byte what it was before
// this filter existed.
export const orderFilterToRequestFields = (filter?: OrderFilterSelection) => ({
  sources: filter && !isComplete(filter.sources, ORDER_SOURCE_OPTIONS.length) ? filter.sources : undefined,
  order_types: filter && !isComplete(filter.orderTypes, ORDER_TYPE_OPTIONS.length) ? filter.orderTypes : undefined,
});

// Stable string for effect dependency arrays — the tabs refetch whenever it
// changes, same pattern as their existing merchantIds.join(',').
export const orderFilterKey = (filter?: OrderFilterSelection): string => {
  const fields = orderFilterToRequestFields(filter);
  return `${[...(fields.sources ?? [])].sort().join(',')}|${[...(fields.order_types ?? [])].sort().join(',')}`;
};
