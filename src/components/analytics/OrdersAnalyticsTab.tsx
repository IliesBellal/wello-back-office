import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsService, OrdersAnalyticsResponse } from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_ORDER } from '@/utils/channels';

interface OrdersAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

const pctChange = (current: number, reference: number): number | null => {
  if (reference === 0) return null;
  return ((current - reference) / reference) * 100;
};

export const OrdersAnalyticsTab = ({ dateRange }: OrdersAnalyticsTabProps) => {
  const [data, setData] = useState<OrdersAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Même fusible que l'onglet CA : un 403 masque le contenu au lieu de casser la page.
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getOrdersAnalytics(dateRange.from, dateRange.to)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (isApiHttpError(error) && error.status === 403) {
          setIsForbidden(true);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.from, dateRange.to]);

  const presentChannels = useMemo(() => {
    if (!data) return [];
    const present = new Set<string>();
    for (const point of data.timeline) {
      for (const channel of Object.keys(point.by_channel_orders)) {
        present.add(channel);
      }
    }
    return CHANNEL_ORDER.filter((c) => present.has(c));
  }, [data]);

  const timelineChartData = useMemo(() => {
    if (!data) return [];
    return data.timeline.map((point) => {
      const row: Record<string, string | number> = { date: point.local_day };
      for (const channel of presentChannels) {
        row[channel] = point.by_channel_orders[channel] ?? 0;
      }
      return row;
    });
  }, [data, presentChannels]);

  const channelPieData = useMemo(() => {
    if (!data) return [];
    return data.by_channel
      .filter((c) => c.order_count > 0)
      .map((c) => ({
        name: CHANNEL_LABELS[c.channel] ?? c.channel,
        value: c.order_count,
        channel: c.channel,
      }));
  }, [data]);

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current, previous_period: previous, previous_year: previousYear } = data;
  const currentVsPrevious = pctChange(current.order_count, previous.order_count);
  const currentVsLastYear = pctChange(current.order_count, previousYear.order_count);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile title="Commandes" value={current.order_count} isHighlighted>
          {currentVsPrevious !== null && <EvolutionBadge percent={currentVsPrevious} />}
        </Tile>
        <Tile title="Panier moyen (TTC)" value={eur(current.avg_basket_ttc_cents)} />
        {current.covers_data_available ? (
          <>
            <Tile title="Couverts" value={current.total_covers ?? 0} />
            <Tile title="Panier/couvert" value={eur(current.avg_basket_per_cover_cents ?? 0)} />
          </>
        ) : (
          <>
            <Tile title="Couverts" value="Donnée non saisie" />
            <Tile title="Panier/couvert" value="Donnée non saisie" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tile title="Période Préc." value={previous.order_count}>
          {currentVsPrevious !== null && <EvolutionBadge percent={currentVsPrevious} />}
        </Tile>
        <Tile title="Année Passée" value={previousYear.order_count}>
          {currentVsLastYear !== null && <EvolutionBadge percent={currentVsLastYear} />}
        </Tile>
      </div>

      {!current.covers_data_available && (
        <p className="text-sm text-muted-foreground">
          Le nombre de couverts n'est pas saisi sur cette période (donnée non renseignée au POS).
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution des commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                <Legend />
                {presentChannels.map((channel) => (
                  <Line
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    stroke={CHANNEL_COLORS[channel]}
                    name={CHANNEL_LABELS[channel]}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par canal</CardTitle>
          </CardHeader>
          <CardContent>
            {channelPieData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {channelPieData.map((entry) => (
                      <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number) => `${value} commandes`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportButton
          filename="Commandes"
          onExport={() => analyticsService.exportOrdersCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            presentChannels as unknown as string[],
            'all'
          )}
        />
      </div>
    </div>
  );
};

export default OrdersAnalyticsTab;
