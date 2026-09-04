import { apiClient, withMock, WelloApiResponse } from './apiClient';
import type { Order } from './ordersService';
import { toLocalDateString } from '../utils/apiDate';
import {
  mapBrandFilterForApi,
  mapOrderTypeFilterForApi,
  resolveOrderHistoryBrand,
  resolveOrderHistoryType,
} from '../utils/orderHistory';

export interface DateRange {
  from: Date;
  to: Date;
}

// Shapes below mirror internal/modules/analytics (ib-welloresto-api repo)
// field-for-field — see RevenueResponse in that module's models.go. Amounts
// are integer cents everywhere (*_ttc_cents, *_ht_cents), never euros: the
// old mock mixed the two (AUDIT.md I2/I3, docs/analytics/), this contract
// doesn't leave room to repeat that.
export interface RevenuePeriodTotals {
  from: string;
  to: string;
  total_ttc_cents: number;
  total_ht_cents?: number;
  order_count: number;
}

export interface RevenueDayPoint {
  local_day: string;
  total_ttc_cents: number;
  by_channel_ttc_cents: Record<string, number>;
}

export interface RevenueChannelTotal {
  channel: string;
  total_ttc_cents: number;
  order_count: number;
}

export interface RevenueMerchantTotal {
  merchant_id: string;
  total_ttc_cents: number;
  order_count: number;
}

export interface RevenueAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: RevenuePeriodTotals;
  previous_period: RevenuePeriodTotals;
  previous_year: RevenuePeriodTotals;
  timeline: RevenueDayPoint[];
  by_channel: RevenueChannelTotal[];
  by_merchant?: RevenueMerchantTotal[];
  ht_computed: boolean;
}

// Shapes below mirror internal/modules/analytics's Orders*/Payments*/VAT*
// types (ib-welloresto-api repo, models.go) field-for-field, same convention
// as RevenueAnalyticsResponse above.

export interface OrdersPeriodTotals {
  from: string;
  to: string;
  order_count: number;
  avg_basket_ttc_cents: number;
  covers_data_available: boolean;
  total_covers?: number;
  avg_basket_per_cover_cents?: number;
}

export interface OrdersDayPoint {
  local_day: string;
  total_orders: number;
  by_channel_orders: Record<string, number>;
}

export interface OrdersChannelTotal {
  channel: string;
  order_count: number;
}

export interface OrdersAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: OrdersPeriodTotals;
  previous_period: OrdersPeriodTotals;
  previous_year: OrdersPeriodTotals;
  timeline: OrdersDayPoint[];
  by_channel: OrdersChannelTotal[];
}

export interface PaymentsPeriodTotals {
  from: string;
  to: string;
  total_amount_cents: number;
  payment_count: number;
}

export interface PaymentsDayPoint {
  local_day: string;
  total_amount_cents: number;
  by_method_amount_cents: Record<string, number>;
}

export interface PaymentMethodTotal {
  method: string;
  total_amount_cents: number;
  payment_count: number;
}

export interface PaymentsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: PaymentsPeriodTotals;
  previous_period: PaymentsPeriodTotals;
  previous_year: PaymentsPeriodTotals;
  timeline: PaymentsDayPoint[];
  by_method: PaymentMethodTotal[];
}

export interface VATPeriodTotals {
  from: string;
  to: string;
  total_ttc_cents: number;
  total_ht_cents: number;
  total_vat_cents: number;
}

export interface VATRateTotal {
  rate: number;
  base_ht_cents: number;
  vat_cents: number;
}

export interface VATChannelTotal {
  channel: string;
  base_ht_cents: number;
  vat_cents: number;
  total_ttc_cents: number;
}

// VATAnalyticsResponse is the canonical analytics VAT view — NOT a fiscal
// document, deliberately not reconciled with pos/reports/tva. See
// VATAnalyticsTab.tsx for the label this drives.
export interface VATAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: VATPeriodTotals;
  previous_period: VATPeriodTotals;
  previous_year: VATPeriodTotals;
  by_rate: VATRateTotal[];
  by_channel: VATChannelTotal[];
}

// Products Analytics
interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_percent: number;
  evolution_percent: number;
}

interface ProductsMetrics {
  total_products_sold: number;
  total_revenue: number;
  total_margin: number;
  avg_margin_percent: number;
}

interface ProductsAnalyticsResponse {
  metrics: ProductsMetrics;
  products: Product[];
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Options Analytics
interface OptionItem {
  id: string;
  name: string;
  product_name: string;
  count: number;
  revenue: number;
  adoption_rate: number;
  avg_price: number;
  basket_impact: number;
  cost_per_unit: number;  // Coût unitaire (centimes)
  total_cost: number;     // Coût total
  profit: number;         // Bénéfice total (centimes)
  margin_percent: number; // Marge en %
}

interface OptionsMetrics {
  total_options: number;
  options_revenue: number;
  avg_adoption_rate: number;
  basket_impact_avg: number;
  total_cost: number;     // Coût total  (centimes)
  total_profit: number;   // Bénéfice total (centimes)
  avg_margin_percent: number; // Marge moyenne %
}

interface OptionsAnalyticsResponse {
  metrics: OptionsMetrics;
  options: OptionItem[];
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Tags Analytics
interface TagAnalysis {
  tag: string;
  product_count: number;
  quantity: number;
  revenue: number;
  avg_basket: number;
  revenue_percent: number;
  evolution_percent: number;
}

interface TagsMetrics {
  tagged_products: number;
  tagged_revenue: number;
  evolution_percent: number;
}

interface TagsAnalyticsResponse {
  metrics: TagsMetrics;
  by_tag: TagAnalysis[];
  timeline: Array<{ date: string; [key: string]: unknown }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Cancellations Analytics
interface CancellationByServer {
  server_name: string;
  cancellations: number;
  cancellation_rate: number;
  amount_lost: number;
  main_reason: string;
  evolution_percent: number;
}

interface CancellationMetrics {
  total_cancellations: number;
  cancellation_rate: number;
  amount_lost: number;
  avg_cancellation: number;
}

interface CancellationsAnalyticsResponse {
  metrics: CancellationMetrics;
  by_reason: Array<{ reason: string; count: number; percentage: number }>;
  by_server: CancellationByServer[];
  timeline: Array<{ date: string; rate: number }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Upsell Analytics
export interface UpsellByServer {
  server_id: string;
  server_name: string;
  upsell_lines: number;
  upsell_revenue_ht: number;
}

export interface UpsellStatsResponse {
  total_upsell_lines: number;
  upsell_revenue_ht: number;
  orders_with_upsell_rate: number;
  by_server: UpsellByServer[];
}

// Discounts Analytics
interface DiscountByType {
  type: string;
  count: number;
  amount: number;
  avg_discount: number;
  percent_of_revenue: number;
  margin_impact: number;
  evolution_percent: number;
}

interface DiscountsMetrics {
  total_discounts: number;
  discount_rate: number;
  margin_impact: number;
  orders_with_discount: number;
}

interface DiscountsAnalyticsResponse {
  metrics: DiscountsMetrics;
  by_type: DiscountByType[];
  margin_impact: {
    gross_margin_without: number;
    gross_margin_with: number;
    margin_loss: number;
    margin_loss_percent: number;
  };
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Customers Analytics
interface CustomerSegment {
  segment: string;
  count: number;
  total_orders: number;
  revenue: number;
  avg_basket: number;
  frequency: number;
  revenue_percent: number;
}

interface CustomersMetrics {
  new_customers: number;
  recurring_customers: number;
  avg_frequency: number;
  avg_basket_by_segment: number;
}

interface CustomersAnalyticsResponse {
  metrics: CustomersMetrics;
  new_vs_recurring: { new: number; recurring: number; new_percent: number };
  by_segment: CustomerSegment[];
  timeline: Array<{ date: string; new_customers: number }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Restaurants Comparative
interface RestaurantComparative {
  restaurant_id: string;
  name: string;
  value: number;
  previous_period: number;
  evolution_percent: number;
  rank: number;
}

interface RestaurantsAnalyticsResponse {
  by_restaurant: RestaurantComparative[];
  timeline?: Array<{ date: string; [key: string]: unknown }>;
  breakdown?: Array<{ name: string; value: number }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Order History
export interface OrderHistoryItem {
  id: string;
  number: string;
  date: string;
  time: string;
  customer_name: string;
  brand: string;
  order_type: string;
  status: 'canceled' | 'done' | 'pending' | 'denied';
  total: number;
  payment_method: string;
}

export interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages?: number;
  total_revenue: number;
  avg_basket: number;
}

type OrderHistoryApiResponse = WelloApiResponse<{
  orders: Order[];
  metadata?: {
    total_items?: number;
    total_pages?: number;
    current_page?: number;
    limit?: number;
    total_revenue?: number;
    avg_basket?: number;
  };
}>;

const formatOrderHistoryDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('fr-FR');
};

const formatOrderHistoryTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toUtcBoundaryISOString = (value: string | Date, endOfDay = false): string => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = value.getMonth();
    const day = value.getDate();

    return new Date(
      Date.UTC(year, month, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    ).toISOString();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);

    return new Date(
      Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    ).toISOString();
  }

  const parsed = new Date(value);
  return parsed.toISOString();
};

const getOrderHistoryTimestamp = (order: Order): string => {
  if (order.creation_date) {
    return new Date(order.creation_date * 1000).toISOString();
  }

  return new Date().toISOString();
};

const mapOrderHistoryStatus = (order: Order): OrderHistoryItem['status'] => {
  const state = order.state?.toLowerCase() || '';
  const brandStatus = order.brand_status?.toLowerCase() || '';
  const merchantApproval = order.merchant_approval?.toLowerCase() || '';

  if (
    state.includes('deny') ||
    state.includes('reject') ||
    brandStatus.includes('deny') ||
    brandStatus.includes('reject') ||
    merchantApproval.includes('deny')
  ) {
    return 'denied';
  }

  if (state.includes('cancel') || brandStatus.includes('cancel')) {
    return 'canceled';
  }

  if (
    state.includes('open') ||
    state.includes('pending') ||
    brandStatus.includes('pending') ||
    brandStatus.includes('preparing')
  ) {
    return 'pending';
  }

  return 'done';
};

const mapOrderHistoryPaymentMethod = (order: Order): string => {
  const paymentMethod = order.payments[0]?.mop?.toLowerCase() || '';

  if (paymentMethod === 'cb') {
    return 'card';
  }

  if (paymentMethod === 'cash' || paymentMethod === 'espèces') {
    return 'cash';
  }

  if (paymentMethod.includes('apple')) {
    return 'applepay';
  }

  return paymentMethod || 'card';
};

const mapOrderToHistoryItem = (order: Order): OrderHistoryItem => {
  const timestamp = getOrderHistoryTimestamp(order);

  return {
    id: order.order_id,
    number: order.order_num.startsWith('#') ? order.order_num : `#${order.order_num}`,
    date: formatOrderHistoryDate(timestamp),
    time: formatOrderHistoryTime(timestamp),
    customer_name: order.customer?.customer_name || '—',
    brand: resolveOrderHistoryBrand(order.brand, order.fulfillment_type),
    order_type: resolveOrderHistoryType(order.order_type),
    status: mapOrderHistoryStatus(order),
    total: order.TTC / 100,
    payment_method: mapOrderHistoryPaymentMethod(order),
  };
};

/**
 * Analytics Service - Données pour la page Analyses du Tableau de bord
 */
class AnalyticsService {
  /**
   * Récupère les données de chiffre d'affaires avec comparaisons.
   * Onglet CA — premier onglet branché en SQL direct sur
   * POST /analytics/revenue (internal/modules/analytics, ib-welloresto-api
   * repo). Les périodes de comparaison sont calculées côté serveur, en un
   * seul appel — voir docs/analytics/ PROMPT 03 Partie 2.
   */
  async getRevenueAnalytics(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<RevenueAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => {
        const mockTimeline: RevenueDayPoint[] = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_ttc_cents: 0,
            by_channel_ttc_cents: {
              dine_in: Math.floor(850000 + Math.random() * 200000),
              takeaway: Math.floor(320000 + Math.random() * 80000),
              delivery: Math.floor(180000 + Math.random() * 40000),
            },
          };
        }).map((point) => ({
          ...point,
          total_ttc_cents: Object.values(point.by_channel_ttc_cents).reduce((a, b) => a + b, 0),
        }));

        return {
          scope: { merchant_ids: ['mock'], group_by: 'none' },
          current_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1442000, total_ht_cents: 1201700, order_count: 320 },
          previous_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1420000, total_ht_cents: 1183300, order_count: 305 },
          previous_year: { from: dateFrom, to: dateTo, total_ttc_cents: 1288000, total_ht_cents: 1073300, order_count: 280 },
          timeline: mockTimeline,
          by_channel: [
            { channel: 'dine_in', total_ttc_cents: 850000, order_count: 180 },
            { channel: 'takeaway', total_ttc_cents: 320000, order_count: 70 },
            { channel: 'delivery', total_ttc_cents: 180000, order_count: 30 },
            { channel: 'ubereats_takeaway', total_ttc_cents: 45000, order_count: 12 },
            { channel: 'ubereats_delivery', total_ttc_cents: 27000, order_count: 8 },
            { channel: 'deliveroo_takeaway', total_ttc_cents: 12000, order_count: 4 },
            { channel: 'deliveroo_delivery', total_ttc_cents: 8000, order_count: 2 },
          ],
          ht_computed: true,
        };
      },
      async () => {
        const response = await apiClient.post<{ id: string; data: RevenueAnalyticsResponse }>(
          '/analytics/revenue',
          { date_from: dateFrom, date_to: dateTo }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données de commandes avec comparaisons.
   * Onglet Commandes — branché en SQL direct sur POST /analytics/orders
   * (internal/modules/analytics, ib-welloresto-api repo), même gabarit que
   * l'onglet CA. Couverts jamais un zéro silencieux : total_covers /
   * avg_basket_per_cover_cents sont absents quand covers_data_available est
   * false (places_settings non saisi sur 99,9% du périmètre PROD).
   */
  async getOrdersAnalytics(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<OrdersAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: {
          from: dateFrom, to: dateTo, order_count: 320, avg_basket_ttc_cents: 4506,
          covers_data_available: false,
        },
        previous_period: {
          from: dateFrom, to: dateTo, order_count: 305, avg_basket_ttc_cents: 4656,
          covers_data_available: false,
        },
        previous_year: {
          from: dateFrom, to: dateTo, order_count: 280, avg_basket_ttc_cents: 4600,
          covers_data_available: false,
        },
        timeline: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_orders: Math.floor(8 + Math.random() * 6),
            by_channel_orders: { dine_in: Math.floor(4 + Math.random() * 3), takeaway: Math.floor(2 + Math.random() * 2) },
          };
        }),
        by_channel: [
          { channel: 'dine_in', order_count: 180 },
          { channel: 'takeaway', order_count: 70 },
          { channel: 'delivery', order_count: 30 },
          { channel: 'ubereats_takeaway', order_count: 12 },
          { channel: 'ubereats_delivery', order_count: 8 },
          { channel: 'deliveroo_takeaway', order_count: 4 },
          { channel: 'deliveroo_delivery', order_count: 2 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: OrdersAnalyticsResponse }>(
          '/analytics/orders',
          { date_from: dateFrom, date_to: dateTo }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données CA en CSV
   */
  async exportRevenueCSV(
    startDate: string,
    endDate: string,
    channels: string[]
  ): Promise<Blob> {
    try {
      const csv = 'Date,Canal,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting revenue CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les données commandes en CSV
   */
  async exportOrdersCSV(
    startDate: string,
    endDate: string,
    orderModes: string[],
    serviceType: string
  ): Promise<Blob> {
    try {
      const csv = 'Date,Type,Commandes,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting orders CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données de règlements avec comparaisons.
   * Onglet Règlements — branché en SQL direct sur POST /analytics/payments.
   * `by_method` utilise les 7 valeurs canoniques de `mop` + "other" — voir
   * src/utils/paymentMethods.ts. Aucune valeur "mobile" : le référentiel réel
   * n'en comporte pas (DROITS.md/AUDIT.md P14).
   */
  async getPaymentsAnalytics(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<PaymentsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: { from: dateFrom, to: dateTo, total_amount_cents: 1442000, payment_count: 320 },
        previous_period: { from: dateFrom, to: dateTo, total_amount_cents: 1420000, payment_count: 305 },
        previous_year: { from: dateFrom, to: dateTo, total_amount_cents: 1288000, payment_count: 280 },
        timeline: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_amount_cents: Math.floor(35000 + Math.random() * 15000),
            by_method_amount_cents: {
              CB: Math.floor(25000 + Math.random() * 8000),
              ES: Math.floor(8000 + Math.random() * 3000),
            },
          };
        }),
        by_method: [
          { method: 'CB', total_amount_cents: 865200, payment_count: 210 },
          { method: 'ES', total_amount_cents: 288400, payment_count: 68 },
          { method: 'STRIPE', total_amount_cents: 144200, payment_count: 30 },
          { method: 'UBER_EATS', total_amount_cents: 86520, payment_count: 8 },
          { method: 'DELIVEROO', total_amount_cents: 43260, payment_count: 3 },
          { method: 'other', total_amount_cents: 14420, payment_count: 1 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: PaymentsAnalyticsResponse }>(
          '/analytics/payments',
          { date_from: dateFrom, date_to: dateTo }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données règlements en CSV
   */
  async exportPaymentsCSV(
    startDate: string,
    endDate: string,
    paymentMethods?: string[],
    channel?: string
  ): Promise<Blob> {
    try {
      const csv = 'Date,Méthode,Montant\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting payments CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données TVA avec comparaisons.
   * Onglet TVA — branché en SQL direct sur POST /analytics/vat. Périmètre
   * analytique canonique, toutes marques — CE N'EST PAS un document
   * comptable, ne pas le confondre avec pos/reports/tva (VATAnalyticsTab.tsx
   * porte le libellé explicite).
   */
  async getVATAnalytics(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<VATAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1442000, total_ht_cents: 1201700, total_vat_cents: 240300 },
        previous_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1420000, total_ht_cents: 1183300, total_vat_cents: 236700 },
        previous_year: { from: dateFrom, to: dateTo, total_ttc_cents: 1288000, total_ht_cents: 1073300, total_vat_cents: 214700 },
        by_rate: [
          { rate: 20, base_ht_cents: 180000, vat_cents: 36000 },
          { rate: 10, base_ht_cents: 950000, vat_cents: 95000 },
          { rate: 5.5, base_ht_cents: 71700, vat_cents: 3900 },
        ],
        by_channel: [
          { channel: 'dine_in', base_ht_cents: 708300, vat_cents: 141700, total_ttc_cents: 850000 },
          { channel: 'takeaway', base_ht_cents: 266700, vat_cents: 53300, total_ttc_cents: 320000 },
          { channel: 'delivery', base_ht_cents: 150000, vat_cents: 30000, total_ttc_cents: 180000 },
          { channel: 'ubereats_takeaway', base_ht_cents: 37500, vat_cents: 7500, total_ttc_cents: 45000 },
          { channel: 'ubereats_delivery', base_ht_cents: 22500, vat_cents: 4500, total_ttc_cents: 27000 },
          { channel: 'deliveroo_takeaway', base_ht_cents: 10000, vat_cents: 2000, total_ttc_cents: 12000 },
          { channel: 'deliveroo_delivery', base_ht_cents: 6700, vat_cents: 1300, total_ttc_cents: 8000 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: VATAnalyticsResponse }>(
          '/analytics/vat',
          { date_from: dateFrom, date_to: dateTo }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données TVA en CSV
   */
  async exportVatCSV(startDate: string, endDate: string): Promise<Blob> {
    try {
      const csv = 'Taux,Base HT,TVA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting VAT CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données produits
   */
  getProductsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    category?: string,
    sortBy: string = 'quantity'
  ): ProductsAnalyticsResponse {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Burger Classique',
        category: 'Plats',
        quantity: 340,
        revenue: 3400,
        cost: 1190,
        margin: 2210,
        margin_percent: 65,
        evolution_percent: 12,
      },
      {
        id: '2',
        name: 'Pizza Quatre Fromages',
        category: 'Plats',
        quantity: 290,
        revenue: 4060,
        cost: 1318,
        margin: 2742,
        margin_percent: 67.5,
        evolution_percent: 8,
      },
      {
        id: '3',
        name: 'Salade César',
        category: 'Entrées',
        quantity: 210,
        revenue: 1680,
        cost: 504,
        margin: 1176,
        margin_percent: 70,
        evolution_percent: 15,
      },
      {
        id: '4',
        name: 'Pâtes Carbonara',
        category: 'Plats',
        quantity: 185,
        revenue: 2775,
        cost: 832,
        margin: 1943,
        margin_percent: 70,
        evolution_percent: 5,
      },
      {
        id: '5',
        name: 'Tiramisu',
        category: 'Desserts',
        quantity: 180,
        revenue: 1350,
        cost: 324,
        margin: 1026,
        margin_percent: 76,
        evolution_percent: 22,
      },
      {
        id: '6',
        name: 'Coca-Cola 33cl',
        category: 'Boissons',
        quantity: 520,
        revenue: 1560,
        cost: 390,
        margin: 1170,
        margin_percent: 75,
        evolution_percent: -5,
      },
    ];

    return {
      metrics: {
        total_products_sold: 1725,
        total_revenue: 14825,
        total_margin: 10267,
        avg_margin_percent: 69.2,
      },
      products: mockProducts,
      comparisons: {
        previous_period: { value: 14200, change: 4.4 },
        year_ago: { value: 12500, change: 18.6 },
      },
    };
  }

  /**
   * Récupère les données options
   */
  getOptionsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    optionTypes: string[],
    productId?: string
  ): OptionsAnalyticsResponse {
    const mockOptions: OptionItem[] = [
      {
        id: '1',
        name: 'Supplément Bacon (Burger)',
        product_name: 'Burger Classique',
        count: 178,
        revenue: 71200,
        adoption_rate: 52.4,
        avg_price: 400,
        basket_impact: 1.2,
        cost_per_unit: 150,
        total_cost: 26700,
        profit: 44500,
        margin_percent: 62.4,
      },
      {
        id: '2',
        name: 'Extra Fromage',
        product_name: 'Pizza Quatre Fromages',
        count: 145,
        revenue: 43500,
        adoption_rate: 50,
        avg_price: 300,
        basket_impact: 1.0,
        cost_per_unit: 80,
        total_cost: 11600,
        profit: 31900,
        margin_percent: 73.3,
      },
      {
        id: '3',
        name: 'Crème fraîche',
        product_name: 'Pâtes Carbonara',
        count: 98,
        revenue: 19600,
        adoption_rate: 52.9,
        avg_price: 200,
        basket_impact: 0.8,
        cost_per_unit: 60,
        total_cost: 5880,
        profit: 13720,
        margin_percent: 70,
      },
      {
        id: '4',
        name: 'Sauce BBQ',
        product_name: 'Burger Classique',
        count: 120,
        revenue: 24000,
        adoption_rate: 35.3,
        avg_price: 200,
        basket_impact: 0.6,
        cost_per_unit: 40,
        total_cost: 4800,
        profit: 19200,
        margin_percent: 80,
      },
      {
        id: '5',
        name: 'Tranche de Gâteau',
        product_name: 'Tiramisu',
        count: 45,
        revenue: 13500,
        adoption_rate: 25,
        avg_price: 300,
        basket_impact: 0.5,
        cost_per_unit: 100,
        total_cost: 4500,
        profit: 9000,
        margin_percent: 66.7,
      },
    ];

    const totalCost = mockOptions.reduce((sum, opt) => sum + opt.total_cost, 0);
    const totalProfit = mockOptions.reduce((sum, opt) => sum + opt.profit, 0);
    const totalRevenue = mockOptions.reduce((sum, opt) => sum + opt.revenue, 0);

    return {
      metrics: {
        total_options: 586,
        options_revenue: totalRevenue,
        avg_adoption_rate: 43.1,
        basket_impact_avg: 0.82,
        total_cost: totalCost,
        total_profit: totalProfit,
        avg_margin_percent: totalProfit > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      options: mockOptions,
      comparisons: {
        previous_period: { value: 154000, change: 11.6 },
        year_ago: { value: 142000, change: 21.1 },
      },
    };
  }

  /**
   * Récupère les données tags
   */
  getTagsAnalytics(
    startDate: Date,
    endDate: Date,
    tags: string[]
  ): TagsAnalyticsResponse {
    const mockTags: TagAnalysis[] = [
      {
        tag: 'Signature du Chef',
        product_count: 5,
        quantity: 420,
        revenue: 4995,
        avg_basket: 11.88,
        revenue_percent: 33.7,
        evolution_percent: 18,
      },
      {
        tag: 'Végétarien',
        product_count: 8,
        quantity: 315,
        revenue: 3465,
        avg_basket: 11,
        revenue_percent: 23.4,
        evolution_percent: 22,
      },
      {
        tag: 'Bio',
        product_count: 4,
        quantity: 198,
        revenue: 2376,
        avg_basket: 12,
        revenue_percent: 16,
        evolution_percent: 45,
      },
      {
        tag: 'Sans gluten',
        product_count: 6,
        quantity: 156,
        revenue: 1872,
        avg_basket: 12,
        revenue_percent: 12.6,
        evolution_percent: 35,
      },
      {
        tag: 'Nouveauté',
        product_count: 3,
        quantity: 132,
        revenue: 1584,
        avg_basket: 12,
        revenue_percent: 10.7,
        evolution_percent: 65,
      },
    ];

    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        'Signature du Chef': Math.floor(120 + Math.random() * 80),
        Végétarien: Math.floor(90 + Math.random() * 60),
        Bio: Math.floor(50 + Math.random() * 40),
        'Sans gluten': Math.floor(40 + Math.random() * 30),
      };
    });

    return {
      metrics: {
        tagged_products: 26,
        tagged_revenue: 14292,
        evolution_percent: 30,
      },
      by_tag: mockTags,
      timeline: mockTimeline,
      comparisons: {
        previous_period: { value: 11020, change: 29.7 },
        year_ago: { value: 8950, change: 59.8 },
      },
    };
  }

  /**
   * Récupère les données annulations
   */
  getCancellationsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    reasons: string[],
    serverId?: string
  ): CancellationsAnalyticsResponse {
    const mockCancellations: CancellationByServer[] = [
      {
        server_name: 'Marie Dupont',
        cancellations: 24,
        cancellation_rate: 3.2,
        amount_lost: 412,
        main_reason: 'Erreur de commande',
        evolution_percent: -15,
      },
      {
        server_name: 'Jean Martin',
        cancellations: 18,
        cancellation_rate: 2.1,
        amount_lost: 315,
        main_reason: 'Client n\'a pas attendu',
        evolution_percent: -8,
      },
      {
        server_name: 'Sophie Bernard',
        cancellations: 31,
        cancellation_rate: 4.8,
        amount_lost: 527,
        main_reason: 'Problème cuisine',
        evolution_percent: 12,
      },
      {
        server_name: 'Autres/Non assigé',
        cancellations: 12,
        cancellation_rate: 2.5,
        amount_lost: 198,
        main_reason: 'Problème paiement',
        evolution_percent: 5,
      },
    ];

    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        rate: 2.5 + (Math.random() - 0.5) * 2,
        sur_place: 2.1 + (Math.random() - 0.5) * 1.5,
        emporter: 3.2 + (Math.random() - 0.5) * 2,
        uber_eats: 2.8 + (Math.random() - 0.5) * 1.8,
        deliveroo: 3.5 + (Math.random() - 0.5) * 2.2,
      };
    });

    return {
      metrics: {
        total_cancellations: 85,
        cancellation_rate: 3.1,
        amount_lost: 1452,
        avg_cancellation: 17.08,
      },
      by_reason: [
        { reason: 'Erreur de commande', count: 32, percentage: 37.6 },
        { reason: 'Problème cuisine', count: 25, percentage: 29.4 },
        { reason: 'Client n\'a pas attendu', count: 18, percentage: 21.2 },
        { reason: 'Problème paiement', count: 7, percentage: 8.2 },
        { reason: 'Autre', count: 3, percentage: 3.5 },
      ],
      by_server: mockCancellations,
      timeline: mockTimeline,
      comparisons: {
        previous_period: { value: 92, change: -7.6 },
        year_ago: { value: 110, change: -22.7 },
      },
    };
  }

  /**
   * Récupère les données remises
   */
  getDiscountsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    discountTypes: string[],
    serverId?: string
  ): DiscountsAnalyticsResponse {
    const mockDiscounts: DiscountByType[] = [
      {
        type: 'Promotion',
        count: 156,
        amount: 702,
        avg_discount: 4.5,
        percent_of_revenue: 4.7,
        margin_impact: 441,
        evolution_percent: -8,
      },
      {
        type: 'Happy Hour',
        count: 98,
        amount: 441,
        avg_discount: 4.5,
        percent_of_revenue: 3,
        margin_impact: 276,
        evolution_percent: 12,
      },
      {
        type: 'Geste Commercial',
        count: 124,
        amount: 558,
        avg_discount: 4.5,
        percent_of_revenue: 3.8,
        margin_impact: 349,
        evolution_percent: 25,
      },
      {
        type: 'Fidélité',
        count: 67,
        amount: 268,
        avg_discount: 4,
        percent_of_revenue: 1.8,
        margin_impact: 134,
        evolution_percent: 15,
      },
      {
        type: 'Codes Promo',
        count: 45,
        amount: 180,
        avg_discount: 4,
        percent_of_revenue: 1.2,
        margin_impact: 90,
        evolution_percent: 8,
      },
    ];

    return {
      metrics: {
        total_discounts: 490,
        discount_rate: 3.2,
        margin_impact: 1290,
        orders_with_discount: 490,
      },
      by_type: mockDiscounts,
      margin_impact: {
        gross_margin_without: 10267,
        gross_margin_with: 8977,
        margin_loss: 1290,
        margin_loss_percent: 12.6,
      },
      comparisons: {
        previous_period: { value: 1968, change: -1.6 },
        year_ago: { value: 1825, change: 14.5 },
      },
    };
  }

  /**
   * Récupère les données clients
   */
  getCustomersAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    segment?: string,
    acquisitionChannels?: string[]
  ): CustomersAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const mockSegments: CustomerSegment[] = [
      {
        segment: 'Nouveaux',
        count: 145,
        total_orders: 156,
        revenue: 2340,
        avg_basket: 15,
        frequency: 1.07,
        revenue_percent: 15.8,
      },
      {
        segment: 'Récurrents (2-4)',
        count: 235,
        total_orders: 658,
        revenue: 7410,
        avg_basket: 11.26,
        frequency: 2.8,
        revenue_percent: 49.9,
      },
      {
        segment: 'Fidèles (5+)',
        count: 89,
        total_orders: 487,
        revenue: 4872,
        avg_basket: 10.01,
        frequency: 5.47,
        revenue_percent: 32.8,
      },
      {
        segment: 'Inactifs (>3m)',
        count: 124,
        total_orders: 0,
        revenue: 0,
        avg_basket: 0,
        frequency: 0,
        revenue_percent: 0,
      },
    ];

    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        new_customers: Math.floor(4 + Math.random() * 6),
      };
    });

    return {
      metrics: {
        new_customers: 145,
        recurring_customers: 324,
        avg_frequency: 2.8,
        avg_basket_by_segment: 12.1,
      },
      new_vs_recurring: {
        new: 2340,
        recurring: 12282,
        new_percent: 16.0,
      },
      by_segment: mockSegments,
      timeline: mockTimeline,
      comparisons: {
        previous_period: { value: 14500, change: 2.4 },
        year_ago: { value: 12800, change: 15.7 },
      },
    };
  }

  /**
   * Récupère les données comparatives restaurants
   */
  getRestaurantsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    restaurantIds?: string[],
    metric: string = 'revenue'
  ): RestaurantsAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const mockRestaurants: RestaurantComparative[] = [
      {
        restaurant_id: '1',
        name: 'Restaurant Paris 8ème',
        value: 14825,
        previous_period: 14200,
        evolution_percent: 4.4,
        rank: 1,
      },
      {
        restaurant_id: '2',
        name: 'Restaurant Marseille',
        value: 12450,
        previous_period: 12100,
        evolution_percent: 2.9,
        rank: 2,
      },
      {
        restaurant_id: '3',
        name: 'Restaurant Lyon',
        value: 8920,
        previous_period: 8650,
        evolution_percent: 3.1,
        rank: 3,
      },
    ];

    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        'Paris 8ème': Math.floor(400 + Math.random() * 200),
        'Marseille': Math.floor(350 + Math.random() * 180),
        'Lyon': Math.floor(250 + Math.random() * 120),
      };
    });

    return {
      by_restaurant: mockRestaurants,
      timeline: metric === 'revenue' ? mockTimeline : undefined,
      comparisons: {
        previous_period: { value: 38950, change: 3.8 },
        year_ago: { value: 35200, change: 14.2 },
      },
    };
  }

  /**
   * Récupère l'historique des commandes
   */
  async getOrderHistory(
    startDate: string | Date,
    endDate: string | Date,
    brands?: string[],
    orderTypes?: string[],
    statuses?: string[],
    search?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<OrderHistoryResponse> {
    const start = toUtcBoundaryISOString(startDate);
    const end = toUtcBoundaryISOString(endDate, true);
    const mockOrders: OrderHistoryItem[] = [
      {
        id: '1',
        number: '#10284',
        date: '08/04/2026',
        time: '14:32',
        customer_name: 'Marie Dubois',
        brand: 'WELLO_RESTO',
        order_type: 'IN',
        status: 'done',
        total: 45.50,
        payment_method: 'card',
      },
      {
        id: '2',
        number: '#10283',
        date: '08/04/2026',
        time: '14:15',
        customer_name: 'Jean Martin',
        brand: 'WELLO_RESTO',
        order_type: 'TAKE_AWAY',
        status: 'done',
        total: 32.80,
        payment_method: 'cash',
      },
      {
        id: '3',
        number: '#10282',
        date: '08/04/2026',
        time: '13:45',
        customer_name: 'Client anonyme',
        brand: 'UBER_EATS',
        order_type: 'DELIVERY',
        status: 'pending',
        total: 28.90,
        payment_method: 'uberpay',
      },
      {
        id: '4',
        number: '#10281',
        date: '08/04/2026',
        time: '13:20',
        customer_name: 'Sophie Bernard',
        brand: 'WELLO_RESTO',
        order_type: 'IN',
        status: 'canceled',
        total: 0,
        payment_method: 'cancelled',
      },
      {
        id: '5',
        number: '#10280',
        date: '08/04/2026',
        time: '12:55',
        customer_name: 'Pierre Durand',
        brand: 'DELIVEROO',
        order_type: 'DELIVERY',
        status: 'denied',
        total: 38.50,
        payment_method: 'applepay',
      },
    ];

    const payload = {
      date_from: start,
      date_to: end,
      channel: brands && brands.length > 0 ? brands.map((brand) => mapBrandFilterForApi(brand)).filter(Boolean) : undefined,
      order_type: orderTypes && orderTypes.length > 0 ? orderTypes.map((orderType) => mapOrderTypeFilterForApi(orderType)).filter(Boolean) : undefined,
      status: statuses && statuses.length > 0 ? statuses : undefined,
      search,
      page,
      limit,
    };

    return withMock(
      () => {
        const normalizedSearch = search?.trim().toLowerCase() || '';
        const filteredMockOrders = mockOrders.filter((order) => {
          const matchesBrand = !brands || brands.length === 0 || brands.includes(order.brand);
          const matchesOrderType = !orderTypes || orderTypes.length === 0 || orderTypes.includes(order.order_type);
          const matchesStatus = !statuses || statuses.length === 0 || statuses.includes(order.status);
          const matchesSearch = !normalizedSearch
            || order.number.toLowerCase().includes(normalizedSearch)
            || order.customer_name.toLowerCase().includes(normalizedSearch);

          return matchesBrand && matchesOrderType && matchesStatus && matchesSearch;
        });

        const totalCount = filteredMockOrders.length;
        const startIndex = (page - 1) * limit;
        const paginatedOrders = filteredMockOrders.slice(startIndex, startIndex + limit);
        const totalRevenue = filteredMockOrders.reduce((sum, o) => sum + o.total, 0);
        const avgBasket = totalCount > 0 ? totalRevenue / totalCount : 0;

        return {
          orders: paginatedOrders,
          total_count: totalCount,
          page,
          per_page: limit,
          total_pages: Math.max(1, Math.ceil(Math.max(totalCount, 1) / limit)),
          total_revenue: totalRevenue,
          avg_basket: avgBasket,
        };
      },
      async () => {
        const response = await apiClient.post<OrderHistoryApiResponse>('/orders/history', payload);
        const orders = (response.data.orders || []).map(mapOrderToHistoryItem);
        const metadata = response.data.metadata;
        const perPage = metadata?.limit ?? limit;
        const totalCount = metadata?.total_items ?? orders.length;
        const totalPages = metadata?.total_pages ?? (perPage > 0 ? Math.ceil(totalCount / perPage) : 1);
        const currentPage = metadata?.current_page ?? page;
        const totalRevenue = (metadata?.total_revenue ?? 0) / 100;
        const avgBasket = metadata?.avg_basket !== undefined
          ? metadata.avg_basket / 100
          : (totalCount > 0 ? totalRevenue / totalCount : 0);

        return {
          orders,
          total_count: totalCount,
          page: currentPage,
          per_page: perPage,
          total_pages: totalPages,
          total_revenue: totalRevenue,
          avg_basket: avgBasket,
        };
      },
      {
        method: 'POST',
        endpoint: '/orders/history',
        payload,
      }
    );
  }

  /**
   * Exporte les données produits en CSV
   */
  async exportProductsCSV(
    startDate: string,
    endDate: string,
    category?: string,
    sortBy?: string
  ): Promise<Blob> {
    try {
      const csv = 'Produit,Catégorie,Quantité,CA,Marge\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting products CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les données options en CSV
   */
  async exportOptionsCSV(
    startDate: string,
    endDate: string,
    optionTypes?: string[],
    productId?: string
  ): Promise<Blob> {
    try {
      const csv = 'Option,Produit,Ajouts,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting options CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les données tags en CSV
   */
  async exportTagsCSV(
    startDate: string,
    endDate: string,
    tags?: string[]
  ): Promise<Blob> {
    try {
      const csv = 'Tag,Produits,Quantité,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting tags CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de vente additionnelle (upsell)
   */
  async getUpsellStats(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<UpsellStatsResponse> {
    const from = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const to = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    return withMock(
      () => {
        const mockByServer: UpsellByServer[] = [
          { server_id: 'srv-1', server_name: 'Marie Dupont', upsell_lines: 42, upsell_revenue_ht: 318.50 },
          { server_id: 'srv-2', server_name: 'Jean Martin', upsell_lines: 35, upsell_revenue_ht: 264.20 },
          { server_id: 'srv-3', server_name: 'Sophie Bernard', upsell_lines: 28, upsell_revenue_ht: 197.80 },
          { server_id: 'srv-4', server_name: 'Lucas Petit', upsell_lines: 19, upsell_revenue_ht: 142.90 },
        ];
        return {
          total_upsell_lines: mockByServer.reduce((sum, s) => sum + s.upsell_lines, 0),
          upsell_revenue_ht: mockByServer.reduce((sum, s) => sum + s.upsell_revenue_ht, 0),
          orders_with_upsell_rate: 18.4,
          by_server: mockByServer,
        };
      },
      async () => {
        const response = await apiClient.get<{
          total_upsell_lines: number;
          upsell_revenue_ht: number;
          orders_with_upsell_rate: number;
          by_server: UpsellByServer[];
        }>(`/stats/upsell?from=${from}&to=${to}`);

        return {
          total_upsell_lines: response.total_upsell_lines,
          upsell_revenue_ht: response.upsell_revenue_ht / 100,
          orders_with_upsell_rate: response.orders_with_upsell_rate,
          by_server: response.by_server.map((server) => ({
            ...server,
            upsell_revenue_ht: server.upsell_revenue_ht / 100,
          })),
        };
      },
      { method: 'GET', endpoint: '/stats/upsell' }
    );
  }

  /**
   * Exporte les données annulations en CSV
   */
  async exportCancellationsCSV(
    startDate: string,
    endDate: string,
    reasons?: string[],
    serverId?: string
  ): Promise<Blob> {
    try {
      const csv = 'Serveur,Annulations,Montant,Motif\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting cancellations CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les données remises en CSV
   */
  async exportDiscountsCSV(
    startDate: string,
    endDate: string,
    discountTypes?: string[],
    serverId?: string
  ): Promise<Blob> {
    try {
      const csv = 'Type,Utilisations,Montant,Impact\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting discounts CSV:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
