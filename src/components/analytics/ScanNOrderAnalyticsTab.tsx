import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltipProps } from '@/components/analytics/chartTooltip';
import { analyticsService, ComparisonMode, ScanNOrderAnalyticsResponse } from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';

interface ScanNOrderAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const SNO_COLOR = '#3b82f6';
const HUB_COLOR = '#f97316';

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const pct = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1)} %` : '—');
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

/**
 * Onglet ScanNOrder : le canal ScanNOrder des établissements sélectionnés, puis
 * ce que leur apporte le hub de leur franchise (ib-welloresto-api
 * docs/franchises.md, D16 à D18).
 */
export const ScanNOrderAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: ScanNOrderAnalyticsTabProps) => {
  const [data, setData] = useState<ScanNOrderAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);
    analyticsService
      .getScanNOrderAnalytics(dateRange.from, dateRange.to, merchantIds)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (isApiHttpError(error) && error.status === 403) setIsForbidden(true);
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, merchantIds.join(',')]);

  if (isForbidden) return null;
  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { totals, hub } = data;
  const avgBasket = totals.sno_orders > 0 ? Math.round(totals.sno_revenue_ttc_cents / totals.sno_orders) : null;
  const showByMerchant = comparisonMode === 'compare' && data.by_merchant.length > 1;
  const hasHubActivity = hub.views + hub.order_clicks + hub.reservation_clicks + hub.orders > 0;

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      {/* Canal ScanNOrder */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile title="CA ScanNOrder TTC" value={eur(totals.sno_revenue_ttc_cents)} isHighlighted />
        <Tile title="Commandes ScanNOrder" value={totals.sno_orders} />
        <Tile title="Panier moyen" value={avgBasket !== null ? eur(avgBasket) : '—'} />
        <Tile
          title="Part du CA total"
          value={pct(totals.sno_revenue_ttc_cents, totals.all_revenue_ttc_cents)}
          subtitle={`sur ${eur(totals.all_revenue_ttc_cents)} tous canaux`}
        />
      </div>

      {/* Hub de franchise */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Hub de franchise{hub.franchises.length > 0 ? ` · ${hub.franchises.join(', ')}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hub.in_franchise ? (
            <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Aucune franchise pour {data.scope.merchant_ids.length > 1 ? 'ces établissements' : 'cet établissement'}</p>
              <p className="mt-1">
                Une franchise réunit vos établissements sur une page commune où vos clients choisissent le leur.{' '}
                <Link to="/franchise" className="text-primary underline underline-offset-2">Créer ou gérer une franchise</Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Affichages comptés pour toute la franchise (une visite du hub montre tous ses établissements) ; clics et commandes
                pour {data.scope.merchant_ids.length > 1 ? 'les établissements sélectionnés' : 'cet établissement'}. Mesure anonyme
                {hub.tracking_since ? `, depuis le ${new Date(hub.tracking_since).toLocaleDateString('fr-FR')}` : ''}. Une commande
                est attribuée au hub quand elle suit un clic « Commander » dans les 2 h.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Tile title="Visites du hub" value={hub.views} />
                <Tile title="Clics « Commander »" value={hub.order_clicks} subtitle={`${pct(hub.order_clicks, hub.views)} des visites`} />
                <Tile title="Clics « Réserver »" value={hub.reservation_clicks} />
                <Tile title="Commandes venues du hub" value={hub.orders} subtitle={`${pct(hub.orders, totals.sno_orders)} des commandes ScanNOrder`} />
                <Tile title="CA venu du hub TTC" value={eur(hub.revenue_ttc_cents)} />
                <Tile title="Conversion clic → commande" value={pct(hub.orders, hub.order_clicks)} />
              </div>
              {!hasHubActivity && (
                <p className="text-sm text-muted-foreground">Aucune activité du hub sur cette période.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Évolution */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Commandes ScanNOrder par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip {...chartTooltipProps} labelFormatter={(v: string) => new Date(v).toLocaleDateString('fr-FR')} />
              <Legend />
              <Bar dataKey="sno_orders" name="Commandes ScanNOrder" fill={SNO_COLOR} />
              {hub.in_franchise && <Bar dataKey="hub_orders" name="dont venues du hub" fill={HUB_COLOR} />}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Détail par établissement (mode comparé) */}
      {showByMerchant && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Par établissement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Établissement</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">CA ScanNOrder</TableHead>
                    <TableHead className="text-right">Clics Commander</TableHead>
                    <TableHead className="text-right">Clics Réserver</TableHead>
                    <TableHead className="text-right">Commandes hub</TableHead>
                    <TableHead className="text-right">CA hub</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_merchant.map((row) => (
                    <TableRow key={row.merchant_id}>
                      <TableCell className="font-medium">{merchantsById[row.merchant_id] ?? row.merchant_id}</TableCell>
                      <TableCell className="text-right">{row.sno_orders}</TableCell>
                      <TableCell className="text-right">{eur(row.sno_revenue_ttc_cents)}</TableCell>
                      <TableCell className="text-right">{row.order_clicks}</TableCell>
                      <TableCell className="text-right">{row.reservation_clicks}</TableCell>
                      <TableCell className="text-right">{row.hub_orders}</TableCell>
                      <TableCell className="text-right">{eur(row.hub_revenue_ttc_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScanNOrderAnalyticsTab;
