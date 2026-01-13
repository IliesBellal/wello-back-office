import { Order } from '@/services/ordersService';

// ============= Order Source/Brand Display =============

export type OrderSource = 'SCANNORDER' | 'DIRECT' | 'UBER_EATS' | 'DELIVEROO';

export interface OrderSourceConfig {
  label: string;
  className: string;
  icon?: string;
}

export const getOrderSource = (order: Order): OrderSource => {
  if (order.brand === 'UBER_EATS' || order.brand === 'UBER') {
    return 'UBER_EATS';
  }
  if (order.brand === 'DELIVEROO') {
    return 'DELIVEROO';
  }
  // WELLO_RESTO brand
  if (order.isSNO) {
    return 'SCANNORDER';
  }
  return 'DIRECT';
};

export const getOrderSourceConfig = (source: OrderSource): OrderSourceConfig => {
  switch (source) {
    case 'SCANNORDER':
      return {
        label: 'Scan & Order',
        className: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0',
      };
    case 'UBER_EATS':
      return {
        label: 'Uber Eats',
        className: 'bg-black text-white border-0',
      };
    case 'DELIVEROO':
      return {
        label: 'Deliveroo',
        className: 'bg-[#00CCBC] text-white border-0',
      };
    case 'DIRECT':
    default:
      return {
        label: 'Direct',
        className: 'bg-gradient-primary text-white border-0',
      };
  }
};

// ============= Order State Translation =============

export const getOrderStateLabel = (state: string): string => {
  switch (state) {
    case 'OPEN':
      return 'Ouverte';
    case 'CLOSED':
      return 'Fermée';
    default:
      return state;
  }
};

export const getOrderStateClassName = (state: string): string => {
  switch (state) {
    case 'OPEN':
      return 'bg-green-500/10 text-green-600 border-green-200';
    case 'CLOSED':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

// ============= Order Type Translation =============

export const getOrderTypeLabel = (orderType: string | null): string => {
  if (!orderType) return 'Non spécifié';
  
  switch (orderType) {
    case 'DELIVERY_BY_RESTAURANT':
      return 'Livraison Restaurant';
    case 'DELIVERY_BY_UBER':
      return 'Livraison Uber';
    case 'DELIVERY_BY_DELIVEROO':
    case 'DELIVEROO':
      return 'Livraison Deliveroo';
    case 'TAKE_AWAY':
      return 'À Emporter';
    case 'IN':
      return 'Sur Place';
    default:
      return orderType;
  }
};

// ============= Merchant Approval Translation =============

export const getMerchantApprovalLabel = (status: string): string => {
  switch (status) {
    case 'ACCEPTED':
    case '1':
      return 'Acceptée';
    case 'PENDING_APPROVAL':
    case 'PENDING':
      return 'En attente';
    case 'DENIED':
    case '0':
      return 'Refusée';
    default:
      return status;
  }
};

export const getMerchantApprovalClassName = (status: string): string => {
  switch (status) {
    case 'ACCEPTED':
    case '1':
      return 'bg-green-500/10 text-green-600 border-green-200';
    case 'PENDING_APPROVAL':
    case 'PENDING':
      return 'bg-orange-500/10 text-orange-600 border-orange-200';
    case 'DENIED':
    case '0':
      return 'bg-red-500/10 text-red-600 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

// ============= Fulfillment Type Translation =============

export const getFulfillmentTypeLabel = (fulfillmentType: string): string => {
  switch (fulfillmentType) {
    case 'DELIVERY_BY_RESTAURANT':
      return 'Livraison Restaurant';
    case 'DELIVERY_BY_UBER':
      return 'Livraison Uber';
    case 'DELIVERY_BY_DELIVEROO':
    case 'DELIVEROO':
      return 'Livraison Deliveroo';
    case 'TAKE_AWAY':
      return 'À Emporter';
    case 'IN':
      return 'Sur Place';
    default:
      return fulfillmentType;
  }
};
