import { apiClient } from './apiClient';

export interface DateRange {
  from: Date;
  to: Date;
}

interface RevenuePeriodData {
  total: number;
  by_channel: Record<string, number>;
  timeline: TimepointData[];
}

interface PeriodComparison {
  total: number;
  change_percent: number;
}

interface TimepointData {
  [key: string]: any;
  date: string;
}

interface RevenueAnalyticsResponse {
  current_period: RevenuePeriodData;
  previous_period: PeriodComparison;
  year_ago: PeriodComparison;
}

interface OrdersMetrics {
  total_orders: number;
  avg_basket: number;
  total_covers: number;
  avg_per_cover: number;
}

interface OrderTimeline {
  date: string;
  orders: number;
  revenue: number;
}

interface PaymentMethod {
  amount: number;
  percentage: number;
}

interface OrderMode {
  mode: string;
  orders: number;
  revenue: number;
  avg_basket: number;
}

interface OrdersComparison {
  orders: number;
  change: number;
}

interface OrdersAnalyticsResponse {
  metrics: OrdersMetrics;
  timeline: OrderTimeline[];
  payment_methods: Record<string, PaymentMethod>;
  by_mode: OrderMode[];
  comparisons: {
    previous_period: OrdersComparison;
    year_ago: OrdersComparison;
  };
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
}

interface OptionsMetrics {
  total_options: number;
  options_revenue: number;
  avg_adoption_rate: number;
  basket_impact_avg: number;
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
  timeline: Array<{ date: string; [key: string]: any }>;
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

// VAT Analytics
interface VATByRate {
  rate: number;
  base_ht: number;
  vat_amount: number;
}

interface VATByChannel {
  channel: string;
  base_ht: number;
  vat_10: number;
  vat_5_5: number;
  vat_total: number;
  total_ttc: number;
}

interface VATAnalyticsResponse {
  total_vat: number;
  total_base_ht: number;
  total_ttc: number;
  by_rate: VATByRate[];
  by_channel: VATByChannel[];
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
  timeline?: Array<{ date: string; [key: string]: any }>;
  breakdown?: Array<{ name: string; value: number }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Order History
interface OrderHistoryItem {
  id: string;
  number: string;
  date: string;
  time: string;
  customer_name: string;
  channel: string;
  status: 'completed' | 'cancelled' | 'refunded';
  total: number;
  payment_method: string;
}

interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  total_count: number;
  page: number;
  per_page: number;
}

/**
 * Analytics Service - Données pour la page Analyses du Tableau de bord
 */
class AnalyticsService {
  /**
   * Récupère les données de chiffre d'affaires avec comparaisons
   */
  getRevenueAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    channels: string[],
    aggregation: 'day' | 'week' | 'month' = 'day'
  ): RevenueAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    // Mock data response
    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        restaurant: Math.floor(8500 + Math.random() * 2000),
        takeaway: Math.floor(3200 + Math.random() * 800),
        delivery: Math.floor(1800 + Math.random() * 400),
      };
    });

    return {
      timeline: mockTimeline,
      current_period: {
        total: 14420,
        by_channel: {
          restaurant: 8500,
          takeaway: 3200,
          delivery: 1800,
          ubereats: 720,
          deliveroo: 200,
        },
      },
      previous_period: { total: 14200, change: 1.5 },
      year_ago: { total: 12880, change: 11.9 },
    };
  }

  /**
   * Récupère les données de commandes avec comparaisons
   */
  getOrdersAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    orderModes: string[],
    serviceType: 'all' | 'dine_in' | 'takeaway' | 'delivery' = 'all'
  ): OrdersAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    // Mock data response
    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        total_orders: Math.floor(80 + Math.random() * 40),
      };
    });

    return {
      metrics: {
        total_orders: 2600,
        avg_basket: 12.3,
        covers: 215,
        avg_per_cover: 12.1,
      },
      by_mode: [
        { mode: 'Restaurant', count: 1560, revenue: 18600 },
        { mode: 'À emporter', count: 680, revenue: 7640 },
        { mode: 'Livraison', count: 360, revenue: 3960 },
      ],
      by_payment: [
        { method: 'Carte', count: 1820, revenue: 21840 },
        { method: 'Espèces', count: 520, revenue: 5200 },
        { method: 'App', count: 260, revenue: 3160 },
      ],
      timeline: mockTimeline,
      comparisons: {
        previous_period: { value: 2450, change: 6.1 },
        year_ago: { value: 2200, change: 18.2 },
      },
    };
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
      const response = await apiClient.post(
        '/analytics/revenue/export-csv',
        {
          start_date: startDate,
          end_date: endDate,
          channels,
        },
        {
          responseType: 'blob',
        }
      );
      return response as any;
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
      const response = await apiClient.post(
        '/analytics/orders/export-csv',
        {
          start_date: startDate,
          end_date: endDate,
          order_modes: orderModes,
          service_type: serviceType,
        },
        {
          responseType: 'blob',
        }
      );
      return response as any;
    } catch (error) {
      console.error('Error exporting orders CSV:', error);
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
        revenue: 712,
        adoption_rate: 52.4,
        avg_price: 4,
        basket_impact: 1.2,
      },
      {
        id: '2',
        name: 'Extra Fromage',
        product_name: 'Pizza Quatre Fromages',
        count: 145,
        revenue: 435,
        adoption_rate: 50,
        avg_price: 3,
        basket_impact: 1.0,
      },
      {
        id: '3',
        name: 'Crème fraîche',
        product_name: 'Pâtes Carbonara',
        count: 98,
        revenue: 196,
        adoption_rate: 52.9,
        avg_price: 2,
        basket_impact: 0.8,
      },
      {
        id: '4',
        name: 'Sauce BBQ',
        product_name: 'Burger Classique',
        count: 120,
        revenue: 240,
        adoption_rate: 35.3,
        avg_price: 2,
        basket_impact: 0.6,
      },
      {
        id: '5',
        name: 'Tranche de Gâteau',
        product_name: 'Tiramisu',
        count: 45,
        revenue: 135,
        adoption_rate: 25,
        avg_price: 3,
        basket_impact: 0.5,
      },
    ];

    return {
      metrics: {
        total_options: 586,
        options_revenue: 1718,
        avg_adoption_rate: 43.1,
        basket_impact_avg: 0.82,
      },
      options: mockOptions,
      comparisons: {
        previous_period: { value: 1540, change: 11.6 },
        year_ago: { value: 1420, change: 21.1 },
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
   * Récupère les données TVA
   */
  getVATAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    channels?: string[]
  ): VATAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const mockByChannel: VATByChannel[] = [
      {
        channel: 'Restaurant',
        base_ht: 8500,
        vat_10: 850,
        vat_5_5: 156,
        vat_total: 1006,
        total_ttc: 9506,
      },
      {
        channel: 'À emporter',
        base_ht: 3200,
        vat_10: 320,
        vat_5_5: 59,
        vat_total: 379,
        total_ttc: 3579,
      },
      {
        channel: 'Uber Eats',
        base_ht: 1800,
        vat_10: 180,
        vat_5_5: 33,
        vat_total: 213,
        total_ttc: 2013,
      },
      {
        channel: 'Deliveroo',
        base_ht: 1320,
        vat_10: 132,
        vat_5_5: 24,
        vat_total: 156,
        total_ttc: 1476,
      },
    ];

    return {
      total_vat: 1754,
      total_base_ht: 14820,
      total_ttc: 16574,
      by_rate: [
        { rate: 10, base_ht: 10500, vat_amount: 1050 },
        { rate: 5.5, base_ht: 4320, vat_amount: 237.6 },
        { rate: 20, base_ht: 0, vat_amount: 0 },
      ],
      by_channel: mockByChannel,
      comparisons: {
        previous_period: { value: 1680, change: 4.4 },
        year_ago: { value: 1520, change: 15.4 },
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
  getOrderHistory(
    startDate: string | Date,
    endDate: string | Date,
    channel?: string,
    status?: string,
    search?: string,
    page: number = 1
  ): OrderHistoryResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const mockOrders: OrderHistoryItem[] = [
      {
        id: '1',
        number: '#10284',
        date: '08/04/2026',
        time: '14:32',
        customer_name: 'Marie Dubois',
        channel: 'restaurant',
        status: 'completed',
        total: 45.50,
        payment_method: 'card',
      },
      {
        id: '2',
        number: '#10283',
        date: '08/04/2026',
        time: '14:15',
        customer_name: 'Jean Martin',
        channel: 'takeaway',
        status: 'completed',
        total: 32.80,
        payment_method: 'cash',
      },
      {
        id: '3',
        number: '#10282',
        date: '08/04/2026',
        time: '13:45',
        customer_name: 'Client anonyme',
        channel: 'ubereats',
        status: 'completed',
        total: 28.90,
        payment_method: 'uberpay',
      },
      {
        id: '4',
        number: '#10281',
        date: '08/04/2026',
        time: '13:20',
        customer_name: 'Sophie Bernard',
        channel: 'restaurant',
        status: 'cancelled',
        total: 0,
        payment_method: 'cancelled',
      },
      {
        id: '5',
        number: '#10280',
        date: '08/04/2026',
        time: '12:55',
        customer_name: 'Pierre Durand',
        channel: 'deliveroo',
        status: 'completed',
        total: 38.50,
        payment_method: 'applepay',
      },
    ];

    return {
      orders: mockOrders,
      total_count: 150,
      page,
      per_page: 50,
    };
  }
}

export const analyticsService = new AnalyticsService();
