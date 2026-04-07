import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardChannels } from '@/services/dashboardService';

interface CombinedChannelChartProps {
  data: DashboardChannels;
}

const CHANNEL_COLORS: Record<string, string> = {
  sur_place: '#6366f1', // indigo
  emporter: '#22c55e', // green
  livraison: '#f97316', // orange
  uber_eats: '#1c1917', // black
  deliveroo: '#00ccbc', // teal
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR').format(value);

/**
 * Combined Chart: Shows both Orders and Revenue by Channel
 * 
 * Displays:
 * - Number of orders (left axis, discrete values)
 * - Revenue in EUR (right axis, continuous values)
 * 
 * This unified view helps restore owners quickly see:
 * - Which channels generate the most volume (orders)
 * - Which channels generate the most revenue
 * - Performance across all channels in one view
 */
export const CombinedChannelChart = ({ data }: CombinedChannelChartProps) => {
  const chartData = data.channels.map((c) => ({
    name: c.label,
    channel: c.channel,
    orders: c.orders,
    revenue: c.revenue,
    trend: c.trend_vs_yesterday_pct,
    avgPrepTime: c.avg_preparation_time_minutes,
  }));

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Canaux : Commandes & Chiffre d'affaires</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.total_orders} commandes · {formatCurrency(data.total_revenue)}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                }}
                dy={8}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11,
                }}
                label={{
                  value: 'Commandes',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: {
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  },
                }}
                dx={-6}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11,
                }}
                tickFormatter={(v) => formatCurrency(v)}
                label={{
                  value: 'Chiffre d\'affaires',
                  angle: 90,
                  position: 'insideRight',
                  offset: 10,
                  style: {
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  },
                }}
                dx={6}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg shadow-lg p-3 space-y-2">
                        <p className="font-semibold text-foreground">{data.name}</p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: '#6366f1' }}
                              />
                              <span className="text-muted-foreground">Commandes</span>
                            </div>
                            <span className="font-medium text-foreground">
                              {formatNumber(data.orders)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: '#22c55e' }}
                              />
                              <span className="text-muted-foreground">Chiffre d'affaires</span>
                            </div>
                            <span className="font-medium text-foreground">
                              {formatCurrency(data.revenue)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-t border-border pt-1.5">
                            <span className="text-muted-foreground">Vs hier</span>
                            <span
                              className={`font-medium ${
                                data.trend >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '16px',
                }}
                iconType="square"
              />
              <Bar
                yAxisId="left"
                dataKey="orders"
                name="Commandes"
                fill="url(#gradOrders)"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="revenue"
                name="Chiffre d'affaires (€)"
                fill="url(#gradRevenue)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
