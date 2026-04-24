import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { HourlyChannelData } from '@/services/dashboardService';

type ChannelType = 'sur_place' | 'emporter' | 'livraison' | 'uber_eats' | 'deliveroo';
type DisplayMode = 'global' | 'channels';
const ALL_CHANNELS: ChannelType[] = ['sur_place', 'emporter', 'livraison', 'uber_eats', 'deliveroo'];

interface ChartDataPoint extends HourlyChannelData {
  global_total: number;
}

interface RevenueEvolutionChartProps {
  data: HourlyChannelData[];
}

const channelColors: Record<ChannelType, string> = {
  sur_place: '#3b82f6',
  emporter: '#10b981',
  livraison: '#f59e0b',
  uber_eats: '#06b6d4',
  deliveroo: '#14b8a6',
};

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

const formatShortCurrency = (value: number) => {
  if (Math.abs(value) >= 100000) {
    return `${(value / 100000).toFixed(1)}k€`;
  }
  return `${Math.round(value / 100)}€`;
};

const CustomTooltip = ({
  active,
  payload,
  mode,
  visibleChannels,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; name: string; value: number; stroke?: string; dataKey?: string }>;
  mode: DisplayMode;
  visibleChannels: ChannelType[];
}) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;

    if (mode === 'global') {
      return (
        <div className="bg-white border border-border rounded-lg shadow-lg p-3 space-y-1">
          <p className="text-sm font-semibold text-foreground">{data.hour}</p>
          <p className="text-xs text-blue-600">
            CA global: <span className="font-semibold">{formatCurrency(data.global_total)}</span>
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">{data.hour}</p>
        {visibleChannels.map((channel) => {
          const value = data[channel] ?? 0;
          return (
            <p key={channel} className="text-xs" style={{ color: channelColors[channel] }}>
              {channelLabels[channel]}:{' '}
              <span className="font-semibold">{formatCurrency(value)}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export const RevenueEvolutionChart = ({ data: hourlyData }: RevenueEvolutionChartProps) => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<DisplayMode>('global');
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([
    'sur_place',
    'emporter',
    'livraison',
    'uber_eats',
    'deliveroo',
  ]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    return (hourlyData || []).map((point) => ({
      ...point,
      global_total:
        point.total ??
        point.sur_place +
          point.emporter +
          point.livraison +
          point.uber_eats +
          point.deliveroo,
    }));
  }, [hourlyData]);

    const availableChannels = useMemo<ChannelType[]>(() => {
      if (chartData.length === 0) {
        return [];
      }

      return ALL_CHANNELS.filter((channel) =>
        chartData.some((point) => (point[channel] ?? 0) > 0)
      );
    }, [chartData]);

    const visibleChannels = useMemo(() => {
      if (mode === 'global') {
        return [] as ChannelType[];
      }

      const selectedAndAvailable = selectedChannels.filter((channel) =>
        availableChannels.includes(channel)
      );

      if (selectedAndAvailable.length === 0) {
        return availableChannels;
      }

      return selectedAndAvailable;
    }, [mode, selectedChannels, availableChannels]);

  const displayData = useMemo<ChartDataPoint[]>(() => {
    const isPointZero = (point: ChartDataPoint) => {
      if (mode === 'global') {
        return (point.global_total ?? 0) <= 0;
      }

      return visibleChannels.every((channel) => (point[channel] ?? 0) <= 0);
    };

    const firstNonZeroIndex = chartData.findIndex((point) => !isPointZero(point));

    if (firstNonZeroIndex === -1) {
      return [];
    }

    // Keep up to 2 zero-value points right before the first non-zero point
    // so users can still see the start of activity.
    const startIndex = Math.max(0, firstNonZeroIndex - 2);
    return chartData.slice(startIndex);
  }, [chartData, mode, visibleChannels]);

  const toggleChannel = (channel: ChannelType) => {
    setSelectedChannels((prev) => {
        const selectable = prev.filter((item) => availableChannels.includes(item));

      if (prev.includes(channel)) {
        // Keep at least one channel visible in "par canaux" mode.
          if (selectable.length <= 1) {
          return prev;
        }
        return prev.filter((item) => item !== channel);
      }
      return [...prev, channel];
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="w-full space-y-1">
            <CardTitle className="text-lg">Évolution du chiffre d'affaires</CardTitle>
            <p className="text-sm text-muted-foreground">CA par heure sur la journée</p>
          </div>
          <div className="w-full md:w-auto">
            <div className="inline-flex w-full rounded-md border border-border p-1 bg-muted/40 md:w-auto">
            <Button
              size="sm"
              variant={mode === 'global' ? 'default' : 'ghost'}
              className="h-8 flex-1 md:flex-none"
              onClick={() => setMode('global')}
            >
              Global
            </Button>
            <Button
              size="sm"
              variant={mode === 'channels' ? 'default' : 'ghost'}
              className="h-8 flex-1 md:flex-none"
              onClick={() => setMode('channels')}
            >
              Par canaux
            </Button>
            </div>
          </div>
        </div>

        {mode === 'channels' && (
          <div className="flex gap-2 flex-wrap pt-4">
            {availableChannels.map((channel) => {
              const isSelected = selectedChannels.includes(channel);
              return (
                <Button
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'rounded-full text-xs font-semibold transition-all duration-150 ease-out',
                    isSelected && 'text-white shadow-sm hover:shadow-md',
                    !isSelected && 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                  style={isSelected ? { backgroundColor: channelColors[channel] } : undefined}
                >
                  {channelLabels[channel]}
                </Button>
              );
            })}
            {availableChannels.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun canal disponible sur cette période.</p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {displayData.length > 0 ? (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayData}
                margin={{ top: 5, right: isMobile ? 8 : 30, left: 0, bottom: 0 }}
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
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />

                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '0.875rem' }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatShortCurrency}
                />

                <Tooltip
                  content={
                    <CustomTooltip mode={mode} visibleChannels={visibleChannels} />
                  }
                />

                {mode === 'channels' && visibleChannels.length > 1 && <Legend />}

                {mode === 'global' && (
                  <Line
                    type="monotone"
                    dataKey="global_total"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive
                    name="CA global"
                  />
                )}

                {mode === 'channels' && visibleChannels.includes('sur_place') && (
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

                {mode === 'channels' && visibleChannels.includes('emporter') && (
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

                {mode === 'channels' && visibleChannels.includes('livraison') && (
                  <Line
                    type="monotone"
                    dataKey="livraison"
                    stroke={channelColors.livraison}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    name={channelLabels.livraison}
                  />
                )}

                {mode === 'channels' && visibleChannels.includes('uber_eats') && (
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

                {mode === 'channels' && visibleChannels.includes('deliveroo') && (
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
