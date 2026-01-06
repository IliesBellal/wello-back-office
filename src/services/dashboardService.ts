import { withMock, mockDelay, apiClient } from './apiClient';

// Types
export interface DashboardRealtime {
  revenue: {
    current: number;
    currency: string;
    trend_percentage: number;
    trend_direction: 'up' | 'down';
    comparisons: {
      last_year: number;
      last_month: number;
      last_week: number;
    };
    progress_target: number;
  };
  service: {
    avg_time_minutes: number;
    status: 'excellent' | 'warning' | 'critical';
    orders_per_hour: number;
  };
  customers: {
    total_covers: number;
    new_customers: number;
    returning_customers: number;
    satisfaction_rate: number;
  };
  alerts: {
    low_stock_count: number;
    voided_orders: number;
    pending_deliveries: number;
  };
}

export interface HourlyData {
  hour: string;
  sales: number;
}

export interface ActivityEvent {
  id: string;
  type: 'ORDER_PAYMENT' | 'Z_REPORT' | 'STOCK_ALERT' | 'ORDER_CREATED' | 'DELIVERY';
  message: string;
  value: string | null;
  time: string;
}

// Mock Data
const mockRealtimeData: DashboardRealtime = {
  revenue: {
    current: 12480,
    currency: 'EUR',
    trend_percentage: 14,
    trend_direction: 'up',
    comparisons: {
      last_year: 10950,
      last_month: 11950,
      last_week: 12950,
    },
    progress_target: 15000,
  },
  service: {
    avg_time_minutes: 12,
    status: 'excellent',
    orders_per_hour: 24,
  },
  customers: {
    total_covers: 124,
    new_customers: 27,
    returning_customers: 32,
    satisfaction_rate: 4.8,
  },
  alerts: {
    low_stock_count: 3,
    voided_orders: 2,
    pending_deliveries: 5,
  },
};

const mockHourlyData: HourlyData[] = [
  { hour: '11:00', sales: 450 },
  { hour: '12:00', sales: 2100 },
  { hour: '13:00', sales: 3200 },
  { hour: '14:00', sales: 1800 },
  { hour: '15:00', sales: 600 },
  { hour: '16:00', sales: 350 },
  { hour: '17:00', sales: 280 },
  { hour: '18:00', sales: 520 },
  { hour: '19:00', sales: 1450 },
  { hour: '20:00', sales: 2800 },
  { hour: '21:00', sales: 1930 },
];

const mockActivityData: ActivityEvent[] = [
  { id: 'ev1', type: 'ORDER_PAYMENT', message: 'Commande #405 encaissée', value: '45.00€', time: '12:45' },
  { id: 'ev2', type: 'Z_REPORT', message: 'Z de Caisse (Midi) effectué par Julien', value: null, time: '15:30' },
  { id: 'ev3', type: 'STOCK_ALERT', message: 'Stock critique : Mozzarella', value: 'Reste 2kg', time: '14:10' },
  { id: 'ev4', type: 'ORDER_CREATED', message: 'Nouvelle commande #406', value: '78.50€', time: '12:52' },
  { id: 'ev5', type: 'DELIVERY', message: 'Livraison Metro reçue', value: '12 articles', time: '10:30' },
];

// API Functions
export const getDashboardRealtime = (): Promise<DashboardRealtime> => {
  return withMock(
    async () => {
      await mockDelay(400);
      return mockRealtimeData;
    },
    () => apiClient.get<DashboardRealtime>('/stats/dashboard/realtime')
  );
};

export const getDashboardHourly = (): Promise<HourlyData[]> => {
  return withMock(
    async () => {
      await mockDelay(300);
      return mockHourlyData;
    },
    () => apiClient.get<HourlyData[]>('/stats/dashboard/hourly')
  );
};

export const getDashboardActivity = (): Promise<ActivityEvent[]> => {
  return withMock(
    async () => {
      await mockDelay(350);
      return mockActivityData;
    },
    () => apiClient.get<ActivityEvent[]>('/stats/dashboard/activity')
  );
};
