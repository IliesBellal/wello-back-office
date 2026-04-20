import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChannelToggleButtons, channelColors } from './ChannelToggleButtons';
import type { HourlyChannelData } from '@/services/dashboardService';

type ChannelType = 'all' | 'sur_place' | 'emporter' | 'uber_eats' | 'deliveroo';

interface ChartDataPoint extends HourlyChannelData {
  sur_place: number;
  emporter: number;
  livraison: number;
  uber_eats: number;
  deliveroo: number;
}

interface RevenueEvolutionChartProps {
  data: HourlyChannelData[];
}

const channelLabels: Record<string, string> = {
  sur_place: 'Sur place',
  emporter: 'À emporter',
  livraison: 'Livraison',
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
};

const CustomTooltip = ({
  active,
  payload,
  selectedChannels,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; name: string; value: number; stroke?: string }>;
  selectedChannels: ChannelType[];
}) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">{data.hour}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.stroke }}>
            {entry.name}:{' '}
            <span className="font-semibold">
              {formatCurrency(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const RevenueEvolutionChart = ({ data: hourlyData }: RevenueEvolutionChartProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([
    'all',
    'sur_place',
    'emporter',
    'uber_eats',
    'deliveroo',
  ]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution du chiffre d'affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[360px] text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleChannels = useMemo(() => {
    if (selectedChannels.length === 0 || !selectedChannels.includes('all')) {
      return selectedChannels.filter(c => c !== 'all') as Exclude<ChannelType, 'all'>[];
    }
    return ['sur_place', 'emporter', 'uber_eats', 'deliveroo'] as const;
  }, [selectedChannels]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-lg">Évolution du chiffre d'affaires</CardTitle>
            <p className="text-sm text-muted-foreground">Au cours de la journée</p>
          </div>
          <ChannelToggleButtons selectedChannels={selectedChannels} onChange={setSelectedChannels} />
        </div>
      </CardHeader>
      <CardContent>
        {hourlyData && hourlyData.length > 0 ? (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={hourlyData}
                margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {visibleChannels.map((channel) => (
                    <linearGradient
                      key={`gradient-${channel}`}
                      id={`gradient-${channel}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={channelColors[channel]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={channelColors[channel]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />

                <XAxis
                  dataKey="hour"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '0.875rem' }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />

                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '0.875rem' }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k€` : `${value}€`
                  }
                />

                <Tooltip
                  content={
                    <CustomTooltip selectedChannels={selectedChannels} />
                  }
                />

                {visibleChannels.length > 1 && <Legend />}

                {visibleChannels.includes('sur_place') && (
                  <Line
                    type="monotone"
                    dataKey="sur_place"
                    stroke={channelColors.sur_place}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    name={channelLabels.sur_place}
                  />
                )}

                {visibleChannels.includes('emporter') && (
                  <Line
                    type="monotone"
                    dataKey="emporter"
                    stroke={channelColors.emporter}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    name={channelLabels.emporter}
                  />
                )}

                {visibleChannels.includes('uber_eats') && (
                  <Line
                    type="monotone"
                    dataKey="uber_eats"
                    stroke={channelColors.uber_eats}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    name={channelLabels.uber_eats}
                  />
                )}

                {visibleChannels.includes('deliveroo') && (
                  <Line
                    type="monotone"
                    dataKey="deliveroo"
                    stroke={channelColors.deliveroo}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    name={channelLabels.deliveroo}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[360px] text-muted-foreground">
            <p>Aucune donnée disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
