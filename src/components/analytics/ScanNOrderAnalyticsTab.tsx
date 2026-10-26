import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltipProps } from '@/components/analytics/chartTooltip';
import { analyticsService, ComparisonMode, ScanNOrderAnalyticsResponse, ScanNOrderFunnel } from '@/services/analyticsService';
import { AudienceFunnel } from '@/components/analytics/AudienceFunnel';
import { dayLabel, eur, frDate, pct, sourceLabel } from '@/components/analytics/channelFormat';
import { isApiHttpError } from '@/services/apiClient';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';

interface ScanNOrderAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const SNO_COLOR = '#3b82f6';
const VISITS_COLOR = '#94a3b8';

const FUNNEL_STEPS: { key: keyof ScanNOrderFunnel; label: string }[] = [
  { key: 'visits', label: 'Visites du menu' },
  { key: 'product_views', label: 'Produit consulté' },
  { key: 'add_to_cart', label: 'Ajout au panier' },
  { key: 'checkout_start', label: 'Passage au paiement' },
  { key: 'payment_redirect', label: 'Redirection vers le paiement' },
  { key: 'orders', label: 'Commande créée' },
];

/**
 * Onglet ScanNOrder : canal ScanNOrder des établissements sélectionnés,
 * entonnoir et sources (mesure d'audience anonyme). Le hub n'y apparaît que
 * comme source : ses statistiques ont leur page, Franchise → Statistiques
 * (ib-welloresto-api docs/mesure-audience.md).
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

  const { totals, hub, funnel } = data;
  const avgBasket = totals.sno_orders > 0 ? Math.round(totals.sno_revenue_ttc_cents / totals.sno_orders) : null;
  const showByMerchant = comparisonMode === 'compare' && data.by_merchant.length > 1;

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

      <p className="text-xs text-muted-foreground">
        Visites, entonnoir et sources : mesure anonyme (aucune donnée personnelle, aucun cookie)
        {data.audience_since ? `, disponible depuis le ${frDate(data.audience_since)}` : ', pas encore de donnée pour ce périmètre'}.
        Une visite correspond à un onglet ouvert, comptée de nouveau après 30 minutes d'inactivité.
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Entonnoir */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Parcours des visiteurs</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.visits === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune visite mesurée sur cette période.</p>
            ) : (
              <>
                <AudienceFunnel
                  steps={FUNNEL_STEPS.map((step) => ({ ...step, value: funnel[step.key] }))}
                  color={SNO_COLOR}
                  topLabel="visites"
                />
                <p className="mt-4 text-sm">
                  Taux de conversion : <span className="font-semibold">{pct(funnel.orders, funnel.visits)}</span> des visites
                  aboutissent à une commande.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sources */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">D'où viennent les clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.sources.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Visites</TableHead>
                      <TableHead className="text-right">Commandes</TableHead>
                      <TableHead className="text-right">Conversion</TableHead>
                      <TableHead className="text-right">CA TTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sources.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell className="font-medium">{sourceLabel(row.source)}</TableCell>
                        <TableCell className="text-right">{row.visits}</TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right">{row.visits > 0 ? pct(row.orders, row.visits) : '—'}</TableCell>
                        <TableCell className="text-right">{eur(row.revenue_ttc_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produits les plus vus */}
      {data.top_products.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Produits les plus consultés</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Consultations</TableHead>
                    <TableHead className="text-right">Ajouts au panier</TableHead>
                    <TableHead className="text-right">Taux d'ajout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_products.map((row) => (
                    <TableRow key={row.product_id}>
                      <TableCell className="font-medium">{row.name || `Produit ${row.product_id}`}</TableCell>
                      <TableCell className="text-right">{row.views}</TableCell>
                      <TableCell className="text-right">{row.add_to_cart}</TableCell>
                      <TableCell className="text-right">{pct(row.add_to_cart, row.views)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="px-6 py-3 text-xs text-muted-foreground">
              Un produit très consulté mais peu ajouté peut signaler un prix, une photo ou une description à revoir.
            </p>
          </CardContent>
        </Card>
      )}

      {hub.in_franchise && (
        <p className="text-sm text-muted-foreground">
          Visites, clics et commandes venus du hub{hub.franchises.length > 0 ? ` de ${hub.franchises.join(', ')}` : ''} :{' '}
          <Link to="/franchise/statistiques" className="text-primary underline underline-offset-2">
            voir les statistiques de la franchise
          </Link>
        </p>
      )}

      {/* Évolution */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Visites et commandes par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip {...chartTooltipProps} labelFormatter={(v: string) => frDate(v)} />
              <Legend />
              <Bar dataKey="visits" name="Visites du menu" fill={VISITS_COLOR} />
              <Bar dataKey="sno_orders" name="Commandes ScanNOrder" fill={SNO_COLOR} />
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
                    <TableHead className="text-right">Visites</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">CA ScanNOrder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_merchant.map((row) => (
                    <TableRow key={row.merchant_id}>
                      <TableCell className="font-medium">{merchantsById[row.merchant_id] ?? row.merchant_id}</TableCell>
                      <TableCell className="text-right">{row.visits}</TableCell>
                      <TableCell className="text-right">{row.sno_orders}</TableCell>
                      <TableCell className="text-right">{row.visits > 0 ? pct(row.sno_orders, row.visits) : '—'}</TableCell>
                      <TableCell className="text-right">{eur(row.sno_revenue_ttc_cents)}</TableCell>
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
