import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltipProps } from '@/components/analytics/chartTooltip';
import { analyticsService, ComparisonMode, ScanNOrderAnalyticsResponse, ScanNOrderFunnel } from '@/services/analyticsService';
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
const VISITS_COLOR = '#94a3b8';

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const pct = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1)} %` : '—');
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

const SOURCE_LABELS: Record<string, string> = {
  qr_table: 'QR de table',
  direct: 'Direct ou QR principal',
  hub: 'Hub de franchise',
  search: 'Moteur de recherche',
  social: 'Réseaux sociaux',
  referral: 'Autre site',
  unknown: 'Origine inconnue',
};
const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? `Lien « ${source} »`;

const FUNNEL_STEPS: { key: keyof ScanNOrderFunnel; label: string }[] = [
  { key: 'visits', label: 'Visites du menu' },
  { key: 'product_views', label: 'Produit consulté' },
  { key: 'add_to_cart', label: 'Ajout au panier' },
  { key: 'checkout_start', label: 'Passage au paiement' },
  { key: 'payment_redirect', label: 'Redirection vers le paiement' },
  { key: 'orders', label: 'Commande créée' },
];

/** Entonnoir : chaque étape en part des visites, et la perte depuis l'étape précédente. */
function Funnel({ funnel }: { funnel: ScanNOrderFunnel }) {
  const top = funnel.visits;
  return (
    <div className="space-y-3">
      {FUNNEL_STEPS.map((step, i) => {
        const value = funnel[step.key];
        const previous = i > 0 ? funnel[FUNNEL_STEPS[i - 1].key] : null;
        const width = top > 0 ? Math.max(2, (value / top) * 100) : 0;
        return (
          <div key={step.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{value.toLocaleString('fr-FR')}</span>
                {i > 0 && ` · ${pct(value, top)} des visites`}
                {previous !== null && previous > 0 && value < previous && (
                  <span className="text-destructive"> · −{pct(previous - value, previous)}</span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-muted">
              <div className="h-2.5 rounded-full" style={{ width: `${width}%`, backgroundColor: SNO_COLOR }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Onglet ScanNOrder : canal ScanNOrder des établissements sélectionnés,
 * entonnoir et sources (mesure d'audience anonyme), apport du hub de leur
 * franchise (ib-welloresto-api docs/franchises.md, D16 à D23).
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
  const several = data.scope.merchant_ids.length > 1;

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
                <Funnel funnel={funnel} />
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
              <p className="font-medium text-foreground">Aucune franchise pour {several ? 'ces établissements' : 'cet établissement'}</p>
              <p className="mt-1">
                Une franchise réunit vos établissements sur une page commune où vos clients choisissent le leur.{' '}
                <Link to="/franchise" className="text-primary underline underline-offset-2">Créer ou gérer une franchise</Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Visites comptées pour toute la franchise (une visite du hub montre tous ses établissements) ; clics et commandes
                pour {several ? 'les établissements sélectionnés' : 'cet établissement'}. Une commande est attribuée au hub quand
                elle suit un clic « Commander » dans les 2 h.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Tile title="Visites du hub" value={hub.views} />
                <Tile title="Clics « Commander »" value={hub.order_clicks} subtitle={`${pct(hub.order_clicks, hub.views)} des visites`} />
                <Tile title="Clics « Réserver »" value={hub.reservation_clicks} />
                <Tile title="Commandes venues du hub" value={hub.orders} subtitle={`${pct(hub.orders, totals.sno_orders)} des commandes ScanNOrder`} />
                <Tile title="CA venu du hub TTC" value={eur(hub.revenue_ttc_cents)} />
                <Tile title="Conversion clic → commande" value={pct(hub.orders, hub.order_clicks)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                    <TableHead className="text-right">Visites</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">CA ScanNOrder</TableHead>
                    <TableHead className="text-right">Clics hub</TableHead>
                    <TableHead className="text-right">Commandes hub</TableHead>
                    <TableHead className="text-right">CA hub</TableHead>
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
                      <TableCell className="text-right">{row.order_clicks + row.reservation_clicks}</TableCell>
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
