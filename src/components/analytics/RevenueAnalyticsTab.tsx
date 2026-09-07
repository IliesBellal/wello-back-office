import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsService, RevenueAnalyticsResponse, ComparisonMode } from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_ORDER } from '@/utils/channels';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';
import { EstablishmentComparisonChart } from '@/components/analytics/EstablishmentComparisonChart';

interface RevenueAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

// current vs. reference, both in cents — null when the reference period had
// no revenue at all (a 0 -> N% change would be meaningless/infinite).
const pctChange = (currentCents: number, referenceCents: number): number | null => {
  if (referenceCents === 0) return null;
  return ((currentCents - referenceCents) / referenceCents) * 100;
};

export const RevenueAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: RevenueAnalyticsTabProps) => {
  const [data, setData] = useState<RevenueAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // RBAC lot 8 (docs/analytics/DROITS.md, §6.3 convention): a 403 on this
  // endpoint hides the tab's content instead of breaking the page — the
  // same treatment already used for the homepage reporting tile.
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getRevenueAnalytics(dateRange.from, dateRange.to, { merchantIds, groupBy: comparisonMode })
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
  }, [dateRange.from, dateRange.to, merchantIds.join(','), comparisonMode]);

  // Channels present in the timeline, in the fixed display order — only
  // series that actually have data get an <Area>, never a hardcoded 7 (or
  // 3) regardless of what's real (AUDIT.md I4).
  const presentChannels = useMemo(() => {
    if (!data) return [];
    const present = new Set<string>();
    for (const point of data.timeline) {
      for (const channel of Object.keys(point.by_channel_ttc_cents)) {
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
        row[channel] = (point.by_channel_ttc_cents[channel] ?? 0) / 100;
      }
      return row;
    });
  }, [data, presentChannels]);

  // Real channel breakdown for the pie chart — GROUP BY on the server, not
  // hardcoded coefficients applied to the total (AUDIT.md I8).
  const channelPieData = useMemo(() => {
    if (!data) return [];
    return data.by_channel
      .filter((c) => c.total_ttc_cents > 0)
      .map((c) => ({
        name: CHANNEL_LABELS[c.channel] ?? c.channel,
        value: c.total_ttc_cents / 100,
        channel: c.channel,
      }));
  }, [data]);

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const currentVsPrevious = pctChange(data.current_period.total_ttc_cents, data.previous_period.total_ttc_cents);
  const currentVsLastYear = pctChange(data.current_period.total_ttc_cents, data.previous_year.total_ttc_cents);

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile title="CA Actuel (TTC)" value={eur(data.current_period.total_ttc_cents)} isHighlighted />
        <Tile title="Période Préc." value={eur(data.previous_period.total_ttc_cents)}>
          {currentVsPrevious !== null && <EvolutionBadge percent={currentVsPrevious} />}
        </Tile>
        <Tile title="Année Passée" value={eur(data.previous_year.total_ttc_cents)}>
          {currentVsLastYear !== null && <EvolutionBadge percent={currentVsLastYear} />}
        </Tile>
      </div>

      {data.scope.group_by === 'merchant' && data.by_merchant && data.by_merchant.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">CA par établissement</CardTitle>
          </CardHeader>
          <CardContent>
            <EstablishmentComparisonChart
              valueLabel="CA TTC"
              valueFormatter={eur}
              data={data.by_merchant.map((row) => ({
                merchantId: row.merchant_id,
                label: merchantsById[row.merchant_id] ?? row.merchant_id,
                value: row.total_ttc_cents,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {!data.ht_computed && (
        <p className="text-sm text-muted-foreground">
          Le HT n'a pas été calculé pour cette période.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution CA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                />
                <Legend />
                {presentChannels.map((channel) => (
                  <Area
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    stackId="1"
                    stroke={CHANNEL_COLORS[channel]}
                    fill={CHANNEL_COLORS[channel]}
                    name={CHANNEL_LABELS[channel]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition CA par canal</CardTitle>
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
                    formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
          filename="CA"
          onExport={() => analyticsService.exportRevenueCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            presentChannels
          )}
        />
      </div>
    </div>
  );
};

export default RevenueAnalyticsTab;
