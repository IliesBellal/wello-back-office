import { withMock, mockDelay, apiClient } from './apiClient';

// ============= Types =============

/** Comparaison temporelle d'un KPI (valeurs brutes pour chaque période) */
export interface KPIComparison {
  today: number;
  yesterday: number;
  same_day_last_week: number;   // Même jour de la semaine passée (ex: lundi dernier)
  same_day_last_year: number;   // Même jour l'année passée
}

/** Données de période (semaine, mois) avec comparaisons */
export interface PeriodComparison {
  current: number;              // Semaine actuelle ou mois actuel
  previous_period: number;      // Semaine ou mois précédent
  same_period_last_year: number; // Même semaine/mois l'année passée
}

/** KPIs principaux du dashboard */
export interface DashboardKPIs {
  /** Chiffre d'affaires */
  revenue: KPIComparison & {
    currency: string;
    target_day: number;         // Objectif CA journalier
    target_week: number;        // Objectif CA hebdomadaire
    target_month: number;       // Objectif CA mensuel
    in_progress_amount: number; // Montant des commandes en cours de préparation
    week: PeriodComparison;     // Données de la semaine
    month: PeriodComparison;    // Données du mois
  };
  /** Ticket moyen = CA / nombre de tickets (encaissements) */
  avg_ticket: KPIComparison & { currency: string };
  /** Panier moyen = CA / nombre de commandes */
  avg_basket: KPIComparison & { currency: string };
  /** Commandes (toutes sources confondues) */
  orders: KPIComparison & {
    in_progress: number;   // Commandes actuellement en préparation
    cancelled_today: number; // Annulées aujourd'hui
  };
}

/** Statistiques par canal de vente */
export interface ChannelStats {
  channel: 'sur_place' | 'emporter' | 'livraison' | 'uber_eats' | 'deliveroo';
  label: string;
  orders: number;
  revenue: number;
  avg_preparation_time_minutes: number;
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
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
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
  user?: string; // opérateur responsable si applicable
}

/** Alertes opérationnelles */
export interface DashboardAlerts {
  low_stock_count: number;
  low_stock_items: string[];        // Noms des articles en rupture/critique
  voided_orders: number;
  pending_deliveries: number;
  cash_register_alerts: number;    // Nb de caisses avec anomalie
  unpaid_orders: number;           // Commandes non encaissées
}

/** Métriques de service (opérations salle/cuisine) */
export interface ServiceMetrics {
  avg_preparation_time_minutes: number;
  avg_table_time_minutes: number;  // Temps moyen d'occupation d'une table
  tables_occupied: number;
  tables_total: number;
  covers_today: number;            // Couverts servis aujourd'hui
  covers_target: number;           // Objectif couverts journalier
  satisfaction_rate: number | null; // Note moyenne (ex. Google / plateforme) — null si absent
}

/** Réponse complète du dashboard */
export interface DashboardSummary {
  kpis: DashboardKPIs;
  channels: DashboardChannels;
  top_products: TopProduct[];
  hourly: HourlyChannelData[];
  activity: ActivityEvent[];
  alerts: DashboardAlerts;
  service: ServiceMetrics;
}

// ============= Mock Data =============

const mockKPIs: DashboardKPIs = {
  revenue: {
    today: 12_480,
    yesterday: 10_920,
    same_day_last_week: 11_350,
    same_day_last_year: 9_870,
    currency: 'EUR',
    target_day: 15_000,
    target_week: 98_000,
    target_month: 420_000,
    in_progress_amount: 640,
    week: {
      current: 87_500,
      previous_period: 82_200,
      same_period_last_year: 79_800,
    },
    month: {
      current: 385_200,
      previous_period: 371_600,
      same_period_last_year: 356_900,
    },
  },
  avg_ticket: {
    today: 28.40,
    yesterday: 25.10,
    same_day_last_week: 26.80,
    same_day_last_year: 23.50,
    currency: 'EUR',
  },
  avg_basket: {
    today: 19.75,
    yesterday: 17.90,
    same_day_last_week: 18.60,
    same_day_last_year: 16.20,
    currency: 'EUR',
  },
  orders: {
    today: 439,
    yesterday: 398,
    same_day_last_week: 422,
    same_day_last_year: 371,
    in_progress: 12,
    cancelled_today: 4,
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
      avg_preparation_time_minutes: 14,
      trend_vs_yesterday_pct: 8.2,
    },
    {
      channel: 'emporter',
      label: 'À emporter',
      orders: 112,
      revenue: 2_890,
      avg_preparation_time_minutes: 9,
      trend_vs_yesterday_pct: 12.5,
    },
    {
      channel: 'livraison',
      label: 'Livraison propre',
      orders: 54,
      revenue: 1_620,
      avg_preparation_time_minutes: 22,
      trend_vs_yesterday_pct: -3.1,
    },
    {
      channel: 'uber_eats',
      label: 'Uber Eats',
      orders: 47,
      revenue: 1_410,
      avg_preparation_time_minutes: 26,
      trend_vs_yesterday_pct: 5.7,
    },
    {
      channel: 'deliveroo',
      label: 'Deliveroo',
      orders: 28,
      revenue: 948,
      avg_preparation_time_minutes: 24,
      trend_vs_yesterday_pct: -8.4,
    },
  ],
};

const mockTopProducts: TopProduct[] = [
  {
    rank: 1,
    id: 'prod_001',
    name: 'Burger Classic',
    category: 'Burgers',
    quantity_sold: 87,
    revenue: 1_479,
    trend_vs_yesterday: 'up',
    trend_percentage: 18,
    out_of_stock: false,
  },
  {
    rank: 2,
    id: 'prod_002',
    name: 'Pizza Margherita',
    category: 'Pizzas',
    quantity_sold: 64,
    revenue: 1_152,
    trend_vs_yesterday: 'stable',
    trend_percentage: 2,
    out_of_stock: false,
  },
  {
    rank: 3,
    id: 'prod_003',
    name: 'Salade César',
    category: 'Salades',
    quantity_sold: 52,
    revenue: 780,
    trend_vs_yesterday: 'up',
    trend_percentage: 31,
    out_of_stock: false,
  },
  {
    rank: 4,
    id: 'prod_004',
    name: 'Tiramisu Maison',
    category: 'Desserts',
    quantity_sold: 48,
    revenue: 528,
    trend_vs_yesterday: 'down',
    trend_percentage: 12,
    out_of_stock: false,
  },
  {
    rank: 5,
    id: 'prod_005',
    name: 'Entrecôte 300g',
    category: 'Viandes',
    quantity_sold: 31,
    revenue: 1_054,
    trend_vs_yesterday: 'up',
    trend_percentage: 7,
    out_of_stock: true, // en rupture
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
  low_stock_items: ['Mozzarella', 'Entrecôte 300g', 'Tiramisu'],
  voided_orders: 2,
  pending_deliveries: 1,
  cash_register_alerts: 0,
  unpaid_orders: 1,
};

const mockService: ServiceMetrics = {
  avg_preparation_time_minutes: 14,
  avg_table_time_minutes: 52,
  tables_occupied: 11,
  tables_total: 18,
  covers_today: 198,
  covers_target: 250,
  satisfaction_rate: 4.7,
};

const mockDashboardSummary: DashboardSummary = {
  kpis: mockKPIs,
  channels: mockChannels,
  top_products: mockTopProducts,
  hourly: mockHourlyData,
  activity: mockActivity,
  alerts: mockAlerts,
  service: mockService,
};

// ============= API Functions =============

/**
 * GET /pos/stats/dashboard/summary
 * Retourne l'ensemble des données du dashboard en un seul appel.
 */
export const getDashboardSummary = (): Promise<DashboardSummary> => {
  return withMock(
    async () => {
      await mockDelay(450);
      return mockDashboardSummary;
    },
    () => apiClient.get<DashboardSummary>('/pos/stats/dashboard/summary')
  );
};
