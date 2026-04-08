import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueDataPoint {
  hour: string;
  revenue: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenueDataPoint }> }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-foreground">{data.hour}</p>
        <p className="text-sm text-muted-foreground">
          CA: <span className="font-semibold text-foreground">{formatCurrency(data.revenue)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const RevenueEvolutionChart = () => {
  const [data, setData] = useState<RevenueDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Mock data for now - replace with actual API call
        // const response = await fetch('/api/dashboard/revenue-evolution');
        // const data = await response.json();
        
        // Mock data showing revenue evolution throughout the day
        const mockData: RevenueDataPoint[] = [
          { hour: '10h', revenue: 125000 },
          { hour: '11h', revenue: 245000 },
          { hour: '12h', revenue: 580000 },
          { hour: '13h', revenue: 720000 },
          { hour: '14h', revenue: 745000 },
          { hour: '15h', revenue: 812000 },
          { hour: '16h', revenue: 945000 },
          { hour: '17h', revenue: 1050000 },
          { hour: '18h', revenue: 1280000 },
          { hour: '19h', revenue: 1650000 },
          { hour: '20h', revenue: 1920000 },
          { hour: '21h', revenue: 2100000 },
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

  const maxRevenue = useMemo(
    () => data ? Math.max(...data.map(d => d.revenue)) : 0,
    [data]
  );

  const chartData = useMemo(
    () => data?.map(d => ({
      ...d,
      displayRevenue: d.revenue / 100, // Convert cents to euros for Y-axis
    })),
    [data]
  );

  if (error) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Évolution du chiffre d'affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Évolution du chiffre d'affaires</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Au cours de la journée</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] rounded-lg" />
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

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
                  domain={[0, Math.ceil(maxRevenue / 100 / 500) * 500]}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="displayRevenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={false}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Aucune donnée disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
