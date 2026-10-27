import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltipProps } from '@/components/analytics/chartTooltip';
import { analyticsService, ComparisonMode, KioskAnalyticsResponse, KioskCount, KioskFunnel, KioskSplitRow } from '@/services/analyticsService';
import { AudienceFunnel } from '@/components/analytics/AudienceFunnel';
import { dayLabel, durationLabel, eur, frDate, pct } from '@/components/analytics/channelFormat';
import { isApiHttpError } from '@/services/apiClient';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';

interface KioskAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const KIOSK_COLOR = '#8b5cf6';
const SESSIONS_COLOR = '#94a3b8';
const ABANDON_COLOR = '#f97316';

const FUNNEL_STEPS: { key: keyof KioskFunnel; label: string }[] = [
  { key: 'sessions', label: 'Sessions (écran de veille touché)' },
  { key: 'fulfillment_chosen', label: 'Mode choisi (sur place / à emporter)' },
  { key: 'product_views', label: 'Produit consulté' },
  { key: 'add_to_cart', label: 'Ajout au panier' },
  { key: 'summary_views', label: 'Panier affiché' },
  { key: 'payment_starts', label: 'Paiement choisi' },
  { key: 'orders', label: 'Commande aboutie' },
];

const STEP_LABELS: Record<string, string> = {
  fulfillment: 'Choix du mode',
  menu: 'Menu',
  cart: 'Panier',
  upsell: 'Suggestions',
  pager: 'Numéro de chevalet',
  payment: 'Paiement',
  unknown: 'Non précisée',
};

const ABANDON_REASON_LABELS: Record<string, string> = {
  inactivity: 'Inactivité',
  cancel: 'Abandon par le client',
  other: 'Autre (coupure réseau, paiement non confirmé…)',
};

const PAYMENT_FAILURE_LABELS: Record<string, string> = {
  declined: 'Carte refusée',
  canceled: 'Paiement annulé ou expiré',
  terminal_unavailable: 'Terminal de paiement indisponible',
  error: 'Erreur technique',
};

const ORDER_TYPE_LABELS: Record<string, string> = { IN: 'Sur place', TAKE_AWAY: 'À emporter' };
const PAYMENT_LABELS: Record<string, string> = { card: 'Carte à la borne', counter: 'Au comptoir' };

const label = (labels: Record<string, string>, key: string) => labels[key] ?? key;

function CountList({ rows, labels, total }: { rows: KioskCount[]; labels: Record<string, string>; total: number }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucun sur cette période.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {rows.map((row) => (
        <li key={row.key} className="flex justify-between gap-2">
          <span>{label(labels, row.key)}</span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{row.count}</span> · {pct(row.count, total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SplitTable({
  title,
  rows,
  labels,
  totalOrders,
  footer,
}: {
  title: string;
  rows: KioskSplitRow[];
  labels: Record<string, string>;
  totalOrders: number;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucune commande sur cette période.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead className="text-right">Part</TableHead>
                <TableHead className="text-right">CA TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="whitespace-nowrap font-medium">{label(labels, row.key)}</TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">{pct(row.orders, totalOrders)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">{eur(row.revenue_ttc_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {footer && <div className="px-6 pb-6 pt-2">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * Onglet Borne : canal borne des établissements sélectionnés et mesure
 * d'audience anonyme des bornes — sessions, entonnoir, abandons, échecs de
 * paiement carte, durée d'une commande (ib-welloresto-api
 * docs/mesure-audience.md, D27 à D33).
 */
export const KioskAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: KioskAnalyticsTabProps) => {
  const [data, setData] = useState<KioskAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);
    analyticsService
      .getKioskAnalytics(dateRange.from, dateRange.to, merchantIds)
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

  const { totals, funnel, abandonments, payment_failures: failures, duration } = data;
  const avgBasket = totals.kiosk_orders > 0 ? Math.round(totals.kiosk_revenue_ttc_cents / totals.kiosk_orders) : null;
  const showByMerchant = comparisonMode === 'compare' && data.by_merchant.length > 1;
  const several = data.scope.merchant_ids.length > 1;

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      {/* Canal borne */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile title="CA borne TTC" value={eur(totals.kiosk_revenue_ttc_cents)} isHighlighted />
        <Tile title="Commandes borne" value={totals.kiosk_orders} />
        <Tile title="Panier moyen" value={avgBasket !== null ? eur(avgBasket) : '—'} />
        <Tile
          title="Part du CA total"
          value={pct(totals.kiosk_revenue_ttc_cents, totals.all_revenue_ttc_cents)}
          subtitle={`sur ${eur(totals.all_revenue_ttc_cents)} tous canaux`}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Sessions, parcours, abandons, paiements et durées : mesure anonyme
        {data.audience_since ? `, disponible depuis le ${frDate(data.audience_since)}` : ', pas encore de donnée pour ce périmètre'}{' '}
        (une borne ne mesure qu'une fois mise à jour). Une session va du toucher de l'écran de veille au retour en veille.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile
          title="Sessions abandonnées"
          value={abandonments.sessions}
          subtitle={`${pct(abandonments.sessions, funnel.sessions)} des sessions`}
        />
        <Tile
          title="Paniers abandonnés"
          value={eur(abandonments.amount_cents)}
          info="Montant des paniers laissés lors des abandons."
        />
        <Tile
          title="Échecs de paiement carte"
          value={failures.failures}
          subtitle={failures.card_starts > 0 ? `pour ${failures.card_starts} paiements carte lancés` : undefined}
        />
        <Tile
          title="Durée d'une commande"
          value={durationLabel(duration.median_seconds)}
          subtitle={duration.p90_seconds !== null ? `9 commandes sur 10 en moins de ${durationLabel(duration.p90_seconds)}` : undefined}
          info="Temps médian entre le toucher de l'écran de veille et la commande aboutie."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Entonnoir */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Parcours des clients</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.sessions === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune session mesurée sur cette période.</p>
            ) : (
              <>
                <AudienceFunnel
                  steps={FUNNEL_STEPS.map((step) => ({ ...step, value: funnel[step.key] }))}
                  color={KIOSK_COLOR}
                  topLabel="sessions"
                />
                <p className="mt-4 text-sm">
                  Taux de conversion : <span className="font-semibold">{pct(funnel.orders, funnel.sessions)}</span> des sessions
                  aboutissent à une commande.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Abandons */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Où les clients abandonnent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {abandonments.by_step.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucun abandon mesuré sur cette période.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Étape quittée</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Paniers laissés</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abandonments.by_step.map((row) => (
                      <TableRow key={row.step}>
                        <TableCell className="font-medium">{label(STEP_LABELS, row.step)}</TableCell>
                        <TableCell className="text-right">{row.sessions}</TableCell>
                        <TableCell className="text-right">{eur(row.amount_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-6 pb-6">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Raisons</p>
                  <CountList rows={abandonments.by_reason} labels={ABANDON_REASON_LABELS} total={abandonments.sessions} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SplitTable title="Sur place ou à emporter" rows={data.by_order_type} labels={ORDER_TYPE_LABELS} totalOrders={totals.kiosk_orders} />
        <SplitTable
          title="Paiement"
          rows={data.by_payment}
          labels={PAYMENT_LABELS}
          totalOrders={totals.kiosk_orders}
          footer={
            <>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Échecs de paiement carte</p>
              <CountList rows={failures.by_reason} labels={PAYMENT_FAILURE_LABELS} total={failures.failures} />
            </>
          }
        />
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
          </CardContent>
        </Card>
      )}

      {/* Évolution */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Sessions, commandes et abandons par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip {...chartTooltipProps} labelFormatter={(v: string) => frDate(v)} />
              <Legend />
              <Bar dataKey="sessions" name="Sessions" fill={SESSIONS_COLOR} />
              <Bar dataKey="kiosk_orders" name="Commandes borne" fill={KIOSK_COLOR} />
              <Bar dataKey="abandonments" name="Abandons" fill={ABANDON_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Par borne */}
      {data.by_kiosk.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Par borne</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borne</TableHead>
                    {several && <TableHead>Établissement</TableHead>}
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">CA TTC</TableHead>
                    <TableHead className="text-right">Abandons</TableHead>
                    <TableHead className="text-right">Échecs carte</TableHead>
                    <TableHead className="text-right">Durée médiane</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_kiosk.map((row) => (
                    <TableRow key={row.kiosk_id}>
                      <TableCell className="font-medium">
                        {row.name || <span className="text-muted-foreground">Borne supprimée</span>}
                      </TableCell>
                      {several && <TableCell>{merchantsById[row.merchant_id] ?? row.merchant_id}</TableCell>}
                      <TableCell className="text-right">{row.sessions}</TableCell>
                      <TableCell className="text-right">{row.orders}</TableCell>
                      <TableCell className="text-right">{eur(row.revenue_ttc_cents)}</TableCell>
                      <TableCell className="text-right">{row.abandonments}</TableCell>
                      <TableCell className="text-right">{row.payment_failures}</TableCell>
                      <TableCell className="text-right">{durationLabel(row.median_seconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">CA borne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_merchant.map((row) => (
                    <TableRow key={row.merchant_id}>
                      <TableCell className="font-medium">{merchantsById[row.merchant_id] ?? row.merchant_id}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
                      <TableCell className="text-right">{row.kiosk_orders}</TableCell>
                      <TableCell className="text-right">{row.sessions > 0 ? pct(row.kiosk_orders, row.sessions) : '—'}</TableCell>
                      <TableCell className="text-right">{eur(row.kiosk_revenue_ttc_cents)}</TableCell>
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

export default KioskAnalyticsTab;
