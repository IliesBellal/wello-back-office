import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { analyticsService, VATAnalyticsResponse, ComparisonMode } from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '@/utils/channels';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';
import { EstablishmentComparisonChart } from '@/components/analytics/EstablishmentComparisonChart';

interface VATAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const VATAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: VATAnalyticsTabProps) => {
  const [data, setData] = useState<VATAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getVATAnalytics(dateRange.from, dateRange.to, { merchantIds, groupBy: comparisonMode })
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

  const byRateChartData = useMemo(() => {
    if (!data) return [];
    return data.by_rate.map((r) => ({
      rate: `${r.rate}%`,
      rateValue: r.rate,
      base_ht: r.base_ht_cents / 100,
      vat: r.vat_cents / 100,
    }));
  }, [data]);

  const byChannelPieData = useMemo(() => {
    if (!data) return [];
    return data.by_channel
      .filter((c) => c.vat_cents > 0)
      .map((c) => ({
        name: CHANNEL_LABELS[c.channel] ?? c.channel,
        value: c.vat_cents / 100,
        channel: c.channel,
      }));
  }, [data]);

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current } = data;

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      {/* Périmètre analytique canonique, toutes marques — pas un document
          comptable. Ne remplace pas le rapport TVA de pos/reports, qui
          restreint à WELLO_RESTO et exclut ScanNOrder : les deux chiffres
          diffèrent par construction — one-sentence label, PROMPT 06 §3. */}
      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        <strong>Vue analytique, pas un document comptable</strong> — elle diffère par construction du rapport TVA
        officiel (Point de vente → Rapports → TVA), qui exclut les marketplaces et ScanNOrder.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile title="TVA collectée" value={eur(current.total_vat_cents)} isHighlighted />
        <Tile title="Base HT" value={eur(current.total_ht_cents)} />
        <Tile title="Total TTC" value={eur(current.total_ttc_cents)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">TVA par taux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byRateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="rate" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                />
                <Legend />
                <Bar dataKey="base_ht" fill="#3b82f6" name="Base HT" />
                <Bar dataKey="vat" fill="#f59e0b" name="TVA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">TVA par canal</CardTitle>
          </CardHeader>
          <CardContent>
            {byChannelPieData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byChannelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {byChannelPieData.map((entry) => (
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

      {data.scope.group_by === 'merchant' && data.by_merchant && data.by_merchant.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">TVA par établissement</CardTitle>
          </CardHeader>
          <CardContent>
            <EstablishmentComparisonChart
              valueLabel="TVA collectée"
              valueFormatter={eur}
              data={data.by_merchant.map((row) => ({
                merchantId: row.merchant_id,
                label: merchantsById[row.merchant_id] ?? row.merchant_id,
                value: row.total_vat_cents,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <ExportButton
          filename="TVA"
          onExport={() => analyticsService.exportVatCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0]
          )}
        />
      </div>
    </div>
  );
};

export default VATAnalyticsTab;
