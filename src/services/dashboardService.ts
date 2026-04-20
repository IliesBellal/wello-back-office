import { withMock, mockDelay, apiClient } from './apiClient';

// ============= Types =============

/** Comparaison jour sur jour (aujourd'hui vs hier) */
export interface DayComparison {
  today: number;
  yesterday: number;
}

/** Données de période (semaine, mois) */
export interface PeriodData {
  current: number;         // Semaine/mois actuel
  previous_period: number; // Semaine/mois précédent
}

/** KPIs principaux du dashboard */
export interface DashboardKPIs {
  /** Chiffre d'affaires */
  revenue: DayComparison & {
    currency: string;
    week: PeriodData;     // Données de la semaine
    month: PeriodData;    // Données du mois
  };
  /** Panier moyen = CA / nombre de commandes */
  avg_basket: DayComparison & { currency: string };
  /** Commandes (toutes sources confondues) */
  orders: DayComparison;
}

/** Statistiques par canal de vente */
export interface ChannelStats {
  channel: 'sur_place' | 'emporter' | 'livraison' | 'uber_eats' | 'deliveroo';
  label: string;
  orders: number;
  revenue: number;
  trend_vs_yesterday_pct: number; // % d'évolution vs hier (positif = hausse)
}

export interface DashboardChannels {
  channels: ChannelStats[];
  total_orders: number;
  total_revenue: number;
}

/** Top produit vendu du jour */
export interface TopProduct {
  rank: number;
  name: string;
  revenue: number;
  trend_vs_yesterday: 'up' | 'down' | 'stable';
  trend_percentage: number;
  out_of_stock: boolean;
}

/** Performance horaire multi-canaux (pour le graphique d'évolution) */
export interface HourlyChannelData {
  hour: string;
  sur_place: number;
  emporter: number;
  livraison: number;
  uber_eats: number;
  deliveroo: number;
  total: number;
}

/** Événement du flux d'activité */
export interface ActivityEvent {
  id: string;
  type: 'ORDER_PAYMENT' | 'Z_REPORT' | 'STOCK_ALERT' | 'ORDER_CREATED' | 'DELIVERY' | 'RUPTURE' | 'REFUND';
  message: string;
  value: string | null;
  time: string;
  user?: string;
}

/** Alertes opérationnelles */
export interface DashboardAlerts {
  low_stock_count: number;
  voided_orders: number;
  pending_deliveries: number;
}

/** Réponse complète du dashboard */
export interface DashboardSummary {
  kpis: DashboardKPIs;
  channels: DashboardChannels;
  top_products: TopProduct[];
  hourly: HourlyChannelData[];
  activity: ActivityEvent[];
  alerts: DashboardAlerts;
}

// ============= Mock Data =============

const mockKPIs: DashboardKPIs = {
  revenue: {
    today: 12_480,
    yesterday: 10_920,
    currency: 'EUR',
    week: {
      current: 87_500,
      previous_period: 82_200,
    },
    month: {
      current: 385_200,
      previous_period: 371_600,
    },
  },
  avg_basket: {
    today: 19.75,
    yesterday: 17.90,
    currency: 'EUR',
  },
  orders: {
    today: 439,
    yesterday: 398,
  },
};

const mockChannels: DashboardChannels = {
  total_orders: 439,
  total_revenue: 12_480,
  channels: [
    {
      channel: 'sur_place',
      label: 'Sur place',
      orders: 198,
      revenue: 5_612,
      trend_vs_yesterday_pct: 8.2,
    },
    {
      channel: 'emporter',
      label: 'À emporter',
      orders: 112,
      revenue: 2_890,
      trend_vs_yesterday_pct: 12.5,
    },
    {
      channel: 'livraison',
      label: 'Livraison propre',
      orders: 54,
      revenue: 1_620,
      trend_vs_yesterday_pct: -3.1,
    },
    {
      channel: 'uber_eats',
      label: 'Uber Eats',
      orders: 47,
      revenue: 1_410,
      trend_vs_yesterday_pct: 5.7,
    },
    {
      channel: 'deliveroo',
      label: 'Deliveroo',
      orders: 28,
      revenue: 948,
      trend_vs_yesterday_pct: -8.4,
    },
  ],
};

const mockTopProducts: TopProduct[] = [
  {
    rank: 1,
    name: 'Burger Classic',
    revenue: 1_479,
    trend_vs_yesterday: 'up',
    trend_percentage: 18,
    out_of_stock: false,
  },
  {
    rank: 2,
    name: 'Pizza Margherita',
    revenue: 1_152,
    trend_vs_yesterday: 'stable',
    trend_percentage: 2,
    out_of_stock: false,
  },
  {
    rank: 3,
    name: 'Salade César',
    revenue: 780,
    trend_vs_yesterday: 'up',
    trend_percentage: 31,
    out_of_stock: false,
  },
  {
    rank: 4,
    name: 'Tiramisu Maison',
    revenue: 528,
    trend_vs_yesterday: 'down',
    trend_percentage: 12,
    out_of_stock: false,
  },
  {
    rank: 5,
    name: 'Entrecôte 300g',
    revenue: 1_054,
    trend_vs_yesterday: 'up',
    trend_percentage: 7,
    out_of_stock: true,
  },
];

const mockHourlyData: HourlyChannelData[] = [
  { hour: '10:00', sur_place: 0,   emporter: 120, livraison: 80,  uber_eats: 60,  deliveroo: 40,  total: 300  },
  { hour: '11:00', sur_place: 180, emporter: 210, livraison: 130, uber_eats: 90,  deliveroo: 50,  total: 660  },
  { hour: '12:00', sur_place: 980, emporter: 560, livraison: 310, uber_eats: 280, deliveroo: 180, total: 2310 },
  { hour: '13:00', sur_place: 1420,emporter: 720, livraison: 390, uber_eats: 340, deliveroo: 210, total: 3080 },
  { hour: '14:00', sur_place: 640, emporter: 380, livraison: 210, uber_eats: 190, deliveroo: 120, total: 1540 },
  { hour: '15:00', sur_place: 120, emporter: 150, livraison: 90,  uber_eats: 80,  deliveroo: 40,  total: 480  },
  { hour: '16:00', sur_place: 80,  emporter: 110, livraison: 60,  uber_eats: 50,  deliveroo: 30,  total: 330  },
  { hour: '17:00', sur_place: 60,  emporter: 90,  livraison: 40,  uber_eats: 40,  deliveroo: 20,  total: 250  },
  { hour: '18:00', sur_place: 280, emporter: 200, livraison: 120, uber_eats: 110, deliveroo: 70,  total: 780  },
  { hour: '19:00', sur_place: 820, emporter: 410, livraison: 280, uber_eats: 240, deliveroo: 140, total: 1890 },
  { hour: '20:00', sur_place: 1180,emporter: 530, livraison: 350, uber_eats: 310, deliveroo: 170, total: 2540 },
  { hour: '21:00', sur_place: 850, emporter: 320, livraison: 210, uber_eats: 180, deliveroo: 110, total: 1670 },
];

const mockActivity: ActivityEvent[] = [
  { id: 'ev1', type: 'ORDER_PAYMENT', message: 'Commande #1042 encaissée', value: '67.50 €', time: '13:52', user: 'Julien' },
  { id: 'ev2', type: 'RUPTURE',       message: 'Rupture déclarée : Entrecôte 300g', value: null, time: '13:45', user: 'Camille' },
  { id: 'ev3', type: 'STOCK_ALERT',   message: 'Stock critique : Mozzarella', value: 'Reste 800g', time: '13:10' },
  { id: 'ev4', type: 'ORDER_CREATED', message: 'Nouvelle commande Uber Eats #1041', value: '34.20 €', time: '13:08' },
  { id: 'ev5', type: 'REFUND',        message: 'Remboursement commande #1035', value: '-18.00 €', time: '12:55', user: 'Julien' },
  { id: 'ev6', type: 'Z_REPORT',      message: 'Z de Caisse (Midi) — Caisse 1', value: '5 842 €', time: '14:00', user: 'Julien' },
  { id: 'ev7', type: 'DELIVERY',      message: 'Livraison fournisseur reçue', value: '14 articles', time: '10:30' },
  { id: 'ev8', type: 'ORDER_PAYMENT', message: 'Commande #1038 encaissée', value: '112.00 €', time: '12:48', user: 'Camille' },
];

const mockAlerts: DashboardAlerts = {
  low_stock_count: 3,
  voided_orders: 2,
  pending_deliveries: 1,
};

const mockDashboardSummary: DashboardSummary = {
  kpis: mockKPIs,
  channels: mockChannels,
  top_products: mockTopProducts,
  hourly: mockHourlyData,
  activity: mockActivity,
  alerts: mockAlerts,
};

// ============= API Functions =============

/**
 * GET /stats/dashboard/summary
 * Retourne l'ensemble des données du dashboard en un seul appel.
 */
export const getDashboardSummary = (): Promise<DashboardSummary> => {
  return withMock(
    async () => {
      await mockDelay(450);
      return mockDashboardSummary;
    },
    async () => {
      const response = await apiClient.get<{ id: string; data: DashboardSummary }>('/stats/dashboard/summary');
      return response.data;
    }
  );
};
