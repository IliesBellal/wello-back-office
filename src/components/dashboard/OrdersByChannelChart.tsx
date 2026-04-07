import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardChannels } from '@/services/dashboardService';

interface OrdersByChannelChartProps {
  data: DashboardChannels;
}

const CHANNEL_COLORS: Record<string, string> = {
  sur_place:  '#6366f1', // indigo
  emporter:   '#22c55e', // green
  livraison:  '#f97316', // orange
  uber_eats:  '#1c1917', // black (Uber brand)
  deliveroo:  '#00ccbc', // teal (Deliveroo brand)
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const OrdersByChannelChart = ({ data }: OrdersByChannelChartProps) => {
  const pieData = data.channels.map((c) => ({
    name: c.label,
    value: c.orders,
    channel: c.channel,
    revenue: c.revenue,
    trend: c.trend_vs_yesterday_pct,
    avgPrepTime: c.avg_preparation_time_minutes,
  }));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Commandes par canal</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.total_orders} commandes · {formatCurrency(data.total_revenue)}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Donut */}
          <div className="w-full lg:w-1/2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.channel}
                      fill={CHANNEL_COLORS[entry.channel] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
                          <p className="font-semibold text-foreground">{d.name}</p>
                          <p className="text-muted-foreground">{d.value} commandes</p>
                          <p className="text-muted-foreground">{formatCurrency(d.revenue)}</p>
                          <p className="text-muted-foreground">Prépa moy. : {d.avgPrepTime} min</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende détaillée */}
          <div className="w-full lg:w-1/2 space-y-2">
            {data.channels.map((ch) => {
              const isUp = ch.trend_vs_yesterday_pct > 0;
              const isDown = ch.trend_vs_yesterday_pct < 0;
              const pct = Math.abs(ch.trend_vs_yesterday_pct);
              const shareOrders = Math.round((ch.orders / data.total_orders) * 100);
              return (
                <div key={ch.channel} className="flex items-center gap-2">
                  {/* Dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHANNEL_COLORS[ch.channel] ?? '#94a3b8' }}
                  />
                  {/* Label + share */}
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                    {ch.label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">
                    {shareOrders}%
                  </span>
                  <span className="text-xs font-semibold text-foreground tabular-nums w-8 text-right">
                    {ch.orders}
                  </span>
                  {/* Trend */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-medium w-14 justify-end',
                      isUp && 'text-green-600',
                      isDown && 'text-destructive',
                      !isUp && !isDown && 'text-muted-foreground'
                    )}
                  >
                    {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : null}
                    {isUp ? '+' : isDown ? '-' : ''}{pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
