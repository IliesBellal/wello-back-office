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

export const RevenueEvolutionChart = () => {
  const [data, setData] = useState<ChartDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([
    'all',
    'sur_place',
    'emporter',
    'uber_eats',
    'deliveroo',
  ]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Mock data
        const mockData: ChartDataPoint[] = [
          { hour: '10:00', sur_place: 0, emporter: 120, livraison: 80, uber_eats: 60, deliveroo: 40, total: 300 },
          { hour: '11:00', sur_place: 180, emporter: 210, livraison: 130, uber_eats: 90, deliveroo: 50, total: 660 },
          { hour: '12:00', sur_place: 980, emporter: 560, livraison: 310, uber_eats: 280, deliveroo: 180, total: 2310 },
          { hour: '13:00', sur_place: 1420, emporter: 720, livraison: 390, uber_eats: 340, deliveroo: 210, total: 3080 },
          { hour: '14:00', sur_place: 640, emporter: 380, livraison: 210, uber_eats: 190, deliveroo: 120, total: 1540 },
          { hour: '15:00', sur_place: 120, emporter: 150, livraison: 90, uber_eats: 80, deliveroo: 40, total: 480 },
          { hour: '16:00', sur_place: 80, emporter: 110, livraison: 60, uber_eats: 50, deliveroo: 30, total: 330 },
          { hour: '17:00', sur_place: 60, emporter: 90, livraison: 40, uber_eats: 40, deliveroo: 20, total: 250 },
          { hour: '18:00', sur_place: 280, emporter: 200, livraison: 120, uber_eats: 110, deliveroo: 70, total: 780 },
          { hour: '19:00', sur_place: 820, emporter: 410, livraison: 280, uber_eats: 240, deliveroo: 140, total: 1890 },
          { hour: '20:00', sur_place: 1180, emporter: 530, livraison: 350, uber_eats: 310, deliveroo: 170, total: 2540 },
          { hour: '21:00', sur_place: 850, emporter: 320, livraison: 210, uber_eats: 180, deliveroo: 110, total: 1670 },
        ];

        setData(mockData);
      } catch (err) {
        setError('Impossible de charger les données');
        console.error('Error loading revenue evolution:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const visibleChannels = useMemo(() => {
    if (selectedChannels.length === 0 || !selectedChannels.includes('all')) {
      return selectedChannels.filter(c => c !== 'all') as Exclude<ChannelType, 'all'>[];
    }
    return ['sur_place', 'emporter', 'uber_eats', 'deliveroo'] as const;
  }, [selectedChannels]);

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
        {loading ? (
          <Skeleton className="h-[360px] rounded-lg" />
        ) : data && data.length > 0 ? (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
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
