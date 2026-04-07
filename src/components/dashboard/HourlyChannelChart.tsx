import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HourlyChannelData } from '@/services/dashboardService';

interface HourlyChannelChartProps {
  data: HourlyChannelData[];
}

const CHANNEL_COLORS: Record<string, string> = {
  sur_place: '#6366f1', // indigo
  emporter: '#22c55e', // green
  livraison: '#f97316', // orange
  uber_eats: '#1c1917', // black
  deliveroo: '#00ccbc', // teal
};

const CHANNEL_LABELS: Record<string, string> = {
  sur_place: 'Sur place',
  emporter: 'À emporter',
  livraison: 'Livraison',
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Hourly Revenue by Channel Evolution Chart
 * 
 * Shows the evolution of revenue throughout the day
 * broken down by channel using stacked areas.
 * 
 * Display:
 * - Y axis: Revenue per channel per hour (in EUR)
 */
export const HourlyChannelChart = ({ data }: HourlyChannelChartProps) => {
  // Transform hourly data to include revenue estimate per channel
  const chartData = data.map((hour) => {
    // Estimated revenue per channel (based on typical pricing)
    const surPlaceRevenue = hour.sur_place * 22; // ~22€ avg
    const emporterRevenue = hour.emporter * 18; // ~18€ avg
    const livraisonRevenue = hour.livraison * 25; // ~25€ avg
    const uberRevenue = hour.uber_eats * 28; // ~28€ avg
    const deliverooRevenue = hour.deliveroo * 28; // ~28€ avg

    return {
      hour: hour.hour,
      // Revenue by channel (for stacked areas)
      sur_place_revenue: surPlaceRevenue,
      emporter_revenue: emporterRevenue,
      livraison_revenue: livraisonRevenue,
      uber_eats_revenue: uberRevenue,
      deliveroo_revenue: deliverooRevenue,
      // Total for reference
      totalRevenue: surPlaceRevenue + emporterRevenue + livraisonRevenue + uberRevenue + deliverooRevenue,
    };
  });

  // Custom tooltip to show revenue breakdown by channel
  interface ChartData {
    hour: string;
    sur_place_revenue: number;
    emporter_revenue: number;
    livraison_revenue: number;
    uber_eats_revenue: number;
    deliveroo_revenue: number;
    totalRevenue: number;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartData }> }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
          <p className="font-semibold text-foreground">{data.hour}</p>
          
          {/* Total revenue */}
          <div className="border-b border-border pb-2">
            <p className="text-sm font-medium text-foreground">
              CA: {formatCurrency(data.totalRevenue)}
            </p>
          </div>
          
          {/* Revenue breakdown by channel */}
          <div className="space-y-1 text-xs">
            {[
              { key: 'sur_place_revenue', label: 'Sur place' },
              { key: 'emporter_revenue', label: 'À emporter' },
              { key: 'livraison_revenue', label: 'Livraison' },
              { key: 'uber_eats_revenue', label: 'Uber Eats' },
              { key: 'deliveroo_revenue', label: 'Deliveroo' },
            ].map(({ key, label }) => {
              const revenue = (data[key as keyof typeof data] as number) || 0;
              if (revenue > 0) {
                const channelKey = key.replace('_revenue', '');
                return (
                  <p key={key} className="text-muted-foreground">
                    <span style={{ color: CHANNEL_COLORS[channelKey] }}>●</span> {label}: {formatCurrency(revenue)}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Évolution - Commandes & Chiffre d'affaires
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Au cours de la journée
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '0.875rem' }}
              />
              
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '0.875rem' }}
                label={{ value: 'Chiffre d\'affaires (€)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '1rem' }}
              />
              
              {/* Lines for Revenue by Channel */}
              <Line
                type="monotone"
                dataKey="sur_place_revenue"
                stroke={CHANNEL_COLORS.sur_place}
                strokeWidth={2.5}
                dot={{ fill: CHANNEL_COLORS.sur_place, r: 3 }}
                activeDot={{ r: 5 }}
                name="Sur place"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="emporter_revenue"
                stroke={CHANNEL_COLORS.emporter}
                strokeWidth={2.5}
                dot={{ fill: CHANNEL_COLORS.emporter, r: 3 }}
                activeDot={{ r: 5 }}
                name="À emporter"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="livraison_revenue"
                stroke={CHANNEL_COLORS.livraison}
                strokeWidth={2.5}
                dot={{ fill: CHANNEL_COLORS.livraison, r: 3 }}
                activeDot={{ r: 5 }}
                name="Livraison"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="uber_eats_revenue"
                stroke={CHANNEL_COLORS.uber_eats}
                strokeWidth={2.5}
                dot={{ fill: CHANNEL_COLORS.uber_eats, r: 3 }}
                activeDot={{ r: 5 }}
                name="Uber Eats"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="deliveroo_revenue"
                stroke={CHANNEL_COLORS.deliveroo}
                strokeWidth={2.5}
                dot={{ fill: CHANNEL_COLORS.deliveroo, r: 3 }}
                activeDot={{ r: 5 }}
                name="Deliveroo"
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Pic de CA</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(Math.max(...chartData.map((d) => d.totalRevenue)))}
            </p>
            <p className="text-xs text-muted-foreground">
              à {chartData.reduce((prev, current) =>
                current.totalRevenue > prev.totalRevenue ? current : prev
              ).hour}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">CA moyen / heure</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(chartData.reduce((sum, d) => sum + d.totalRevenue, 0) / chartData.length)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">CA total</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(chartData.reduce((sum, d) => sum + d.totalRevenue, 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
