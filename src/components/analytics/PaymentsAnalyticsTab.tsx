import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsService, PaymentsAnalyticsResponse, ComparisonMode } from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ORDER } from '@/utils/paymentMethods';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';
import { EstablishmentComparisonChart } from '@/components/analytics/EstablishmentComparisonChart';
import { PieSyncGroup, SyncedPie, EstablishmentSectionTitle } from '@/components/analytics/ChartSync';
import { usePerMerchantAnalytics } from '@/hooks/usePerMerchantAnalytics';

interface PaymentsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
// methodPieDataOf's `value` is already in euros (cents / 100 applied once) —
// unlike `eur` above, this formats it as-is, no second division.
const eurValue = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

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

// Plain (non-hook) helpers — same rationale as RevenueAnalyticsTab.tsx: reused
// both for the combined `data` (via useMemo) and per establishment inside the
// "Détail par établissement" .map (hooks can't be called there).
const presentMethodsOf = (resp: PaymentsAnalyticsResponse): string[] => {
  const present = new Set<string>();
  for (const point of resp.timeline) {
    for (const method of Object.keys(point.by_method_amount_cents)) {
      present.add(method);
    }
  }
  return PAYMENT_METHOD_ORDER.filter((m) => present.has(m));
};

const timelineChartDataOf = (resp: PaymentsAnalyticsResponse, presentMethods: string[]) =>
  resp.timeline.map((point) => {
    const row: Record<string, string | number> = { date: point.local_day };
    for (const method of presentMethods) {
      row[method] = (point.by_method_amount_cents[method] ?? 0) / 100;
    }
    return row;
  });

const methodPieDataOf = (resp: PaymentsAnalyticsResponse) =>
  resp.by_method
    .filter((m) => m.total_amount_cents > 0)
    .map((m) => ({
      key: m.method,
      name: PAYMENT_METHOD_LABELS[m.method] ?? m.method,
      value: m.total_amount_cents / 100,
      color: PAYMENT_METHOD_COLORS[m.method],
    }));

// Ce tab n'inclut que les paiements payments.enabled=true (1,5% désactivés
// sur PROD, AUDIT.md P13) et bucketise mop sur les 7 valeurs canoniques —
// aucune ne correspond au "paiement mobile" de l'ancienne maquette, retiré
// délibérément (voir docs/analytics/AUDIT.md).
export const PaymentsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: PaymentsAnalyticsTabProps) => {
  const [data, setData] = useState<PaymentsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getPaymentsAnalytics(dateRange.from, dateRange.to, { merchantIds, groupBy: comparisonMode })
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

  const presentMethods = useMemo(() => (data ? presentMethodsOf(data) : []), [data]);

  const timelineChartData = useMemo(
    () => (data ? timelineChartDataOf(data, presentMethods) : []),
    [data, presentMethods]
  );

  const methodPieData = useMemo(() => (data ? methodPieDataOf(data) : []), [data]);

  // Compare mode : voir le commentaire équivalent dans RevenueAnalyticsTab.tsx
  // — Règlements ne porte pas non plus de ventilation par établissement dans
  // by_merchant, d'où l'appel par établissement.
  const compareMerchantIds = useMemo(
    () => (data?.scope.group_by === 'merchant' ? (data.by_merchant ?? []).map((m) => m.merchant_id) : []),
    [data]
  );

  const { perMerchant } = usePerMerchantAnalytics(
    compareMerchantIds.length > 0,
    compareMerchantIds,
    dateRange,
    (from, to, merchantId) => analyticsService.getPaymentsAnalytics(from, to, { merchantIds: [merchantId] })
  );

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current, previous_period: previous, previous_year: previousYear } = data;
  const currentVsPrevious = pctChange(current.total_amount_cents, previous.total_amount_cents);
  const currentVsLastYear = pctChange(current.total_amount_cents, previousYear.total_amount_cents);

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile title="Encaissements" value={eur(current.total_amount_cents)} isHighlighted>
          {currentVsPrevious !== null && <EvolutionBadge percent={currentVsPrevious} />}
        </Tile>
        <Tile title="Période Préc." value={eur(previous.total_amount_cents)} />
        <Tile title="Année Passée" value={eur(previousYear.total_amount_cents)}>
          {currentVsLastYear !== null && <EvolutionBadge percent={currentVsLastYear} />}
        </Tile>
      </div>

      {data.scope.group_by === 'merchant' && data.by_merchant && data.by_merchant.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Règlements par établissement</CardTitle>
          </CardHeader>
          <CardContent>
            <EstablishmentComparisonChart
              valueLabel="Encaissements"
              valueFormatter={eur}
              data={data.by_merchant.map((row) => ({
                merchantId: row.merchant_id,
                label: merchantsById[row.merchant_id] ?? row.merchant_id,
                value: row.total_amount_cents,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {compareMerchantIds.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-base font-semibold text-foreground">Détail par établissement</h3>
          <PieSyncGroup>
            {perMerchant.map(({ merchantId, data: merchantData }) => {
              if (!merchantData) return null;
              const merchantPresentMethods = presentMethodsOf(merchantData);
              const merchantTimelineData = timelineChartDataOf(merchantData, merchantPresentMethods);
              const merchantPieData = methodPieDataOf(merchantData);

              return (
                <div key={merchantId} className="space-y-3">
                  <EstablishmentSectionTitle merchantId={merchantId} label={merchantsById[merchantId] ?? merchantId} />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-card border border-border lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Évolution des règlements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={merchantTimelineData} syncId="payments-evolution-sync" syncMethod="value">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                              formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            />
                            <Legend />
                            {merchantPresentMethods.map((method) => (
                              <Area
                                key={method}
                                type="monotone"
                                dataKey={method}
                                stackId="1"
                                stroke={PAYMENT_METHOD_COLORS[method]}
                                fill={PAYMENT_METHOD_COLORS[method]}
                                name={PAYMENT_METHOD_LABELS[method]}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Répartition par méthode</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SyncedPie
                          sourceId={merchantId}
                          data={merchantPieData}
                          valueFormatter={eurValue}
                          innerRadius={45}
                          outerRadius={80}
                          height={260}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </PieSyncGroup>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution des règlements</CardTitle>
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
                {presentMethods.map((method) => (
                  <Area
                    key={method}
                    type="monotone"
                    dataKey={method}
                    stackId="1"
                    stroke={PAYMENT_METHOD_COLORS[method]}
                    fill={PAYMENT_METHOD_COLORS[method]}
                    name={PAYMENT_METHOD_LABELS[method]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par méthode</CardTitle>
          </CardHeader>
          <CardContent>
            {methodPieData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={methodPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label
                  >
                    {methodPieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
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
          filename="Règlements"
          onExport={() => analyticsService.exportPaymentsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            presentMethods as unknown as string[],
            'all'
          )}
        />
      </div>
    </div>
  );
};

export default PaymentsAnalyticsTab;
