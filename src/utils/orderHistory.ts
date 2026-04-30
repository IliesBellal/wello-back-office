export type OrderHistoryBrand = 'UBER_EATS' | 'DELIVEROO' | 'WELLO_RESTO' | 'UNKNOWN';
export type OrderHistoryType = 'DELIVERY' | 'TAKE_AWAY' | 'IN' | 'UNKNOWN';

export const ORDER_HISTORY_BRAND_LABELS: Record<OrderHistoryBrand, string> = {
  UBER_EATS: 'Uber Eats',
  DELIVEROO: 'Deliveroo',
  WELLO_RESTO: 'Wello Resto',
  UNKNOWN: 'Inconnu',
};

export const ORDER_HISTORY_TYPE_LABELS: Record<OrderHistoryType, string> = {
  DELIVERY: 'Livraison',
  TAKE_AWAY: 'Emporter',
  IN: 'Sur place',
  UNKNOWN: '-',
};

const normalizeValue = (value: string | null | undefined): string => {
  return (value || '').trim().toUpperCase();
};

export const resolveOrderHistoryBrand = (brand: string | null | undefined, fulfillmentType: string | null | undefined): OrderHistoryBrand => {
  const normalizedBrand = normalizeValue(brand);
  const normalizedFulfillmentType = normalizeValue(fulfillmentType);

  if (normalizedBrand === 'UBER_EATS' || normalizedBrand === 'UBER' || normalizedFulfillmentType === 'UBER_EATS' || normalizedFulfillmentType === 'DELIVERY_BY_UBER') {
    return 'UBER_EATS';
  }

  if (normalizedBrand === 'DELIVEROO' || normalizedFulfillmentType === 'DELIVEROO' || normalizedFulfillmentType === 'DELIVERY_BY_DELIVEROO') {
    return 'DELIVEROO';
  }

  if (normalizedBrand === 'WELLO_RESTO') {
    return 'WELLO_RESTO';
  }

  return 'UNKNOWN';
};

export const resolveOrderHistoryType = (orderType: string | null | undefined): OrderHistoryType => {
  const normalizedOrderType = normalizeValue(orderType);

  if (normalizedOrderType === 'DELIVERY') {
    return 'DELIVERY';
  }

  if (normalizedOrderType === 'TAKE_AWAY') {
    return 'TAKE_AWAY';
  }

  if (normalizedOrderType === 'IN') {
    return 'IN';
  }

  return 'UNKNOWN';
};

export const mapBrandFilterForApi = (brand?: string): string | undefined => {
  if (!brand) {
    return undefined;
  }

  const normalizedBrand = normalizeValue(brand);
  if (normalizedBrand === 'UBER_EATS' || normalizedBrand === 'UBER') {
    return 'uber_eats';
  }

  if (normalizedBrand === 'DELIVEROO') {
    return 'deliveroo';
  }

  if (normalizedBrand === 'WELLO_RESTO') {
    return 'wello_resto';
  }

  return undefined;
};

export const mapOrderTypeFilterForApi = (orderType?: string): string | undefined => {
  if (!orderType) {
    return undefined;
  }

  const normalizedOrderType = normalizeValue(orderType);
  if (normalizedOrderType === 'IN') {
    return 'in';
  }

  if (normalizedOrderType === 'TAKE_AWAY') {
    return 'take_away';
  }

  if (normalizedOrderType === 'DELIVERY') {
    return 'delivery';
  }

  return undefined;
};
