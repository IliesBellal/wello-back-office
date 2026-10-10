import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { chartTooltipProps } from '@/components/analytics/chartTooltip';
import {
  analyticsService,
  UpsellAnalyticsResponse,
  UpsellByStaffResponse,
  UpsellStaffRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { orderFilterKey, ORDER_TYPE_OPTIONS, type OrderFilterSelection } from '@/utils/orderFilters';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface UpsellAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
  orderFilter?: OrderFilterSelection;
}

const UPSELL_BAR_COLOR = '#8b5cf6';
const TOP_SERVERS_LIMIT = 10;

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const UpsellAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {}, orderFilter }: UpsellAnalyticsTabProps) => {
  const filterKey = orderFilterKey(orderFilter);
  // Filtré par le filtre de page canal × type de commande (orderFilter).
  // L'ancien filtre `channels` de l'endpoint (brand × type) reste à "tous" :
  // il recouvrait les mêmes dimensions. Côté Suggestions (upsell_suggestions,
  // aucune commande rattachée tant qu'elle n'est pas acceptée), seul le canal
  // s'applique — POS/SNO/KIOSK, voir order_filter.go côté API.
  const [data, setData] = useState<UpsellAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  // Bloc nominatif : endpoint séparé (reports.staff_performance.read, plus
  // sensible), chargé indépendamment. Un 403 ici ne masque QUE ce bloc.
  const [staffData, setStaffData] = useState<UpsellByStaffResponse | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [isStaffForbidden, setIsStaffForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getUpsellAnalytics(dateRange.from, dateRange.to, undefined, merchantIds, orderFilter)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, merchantIds.join(','), filterKey]);

  // Bloc nominatif : toujours fusionné quel que soit le mode (PROMPT 24) —
  // merchantIds transmis (le serveur exige reports.staff_performance.read sur
  // CHAQUE établissement sélectionné, 403 sinon, masquant ce bloc seul).
  useEffect(() => {
    let isMounted = true;
    setIsStaffLoading(true);
    setIsStaffForbidden(false);

    analyticsService.getUpsellByStaff(dateRange.from, dateRange.to, undefined, merchantIds, orderFilter)
      .then((result) => {
        if (!isMounted) return;
        setStaffData(result);
        setIsStaffLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (isApiHttpError(error) && error.status === 403) {
          setIsStaffForbidden(true);
        }
        setIsStaffLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, merchantIds.join(','), filterKey]);

  const staffColumns: ColumnConfig<UpsellStaffRow>[] = [
    { key: 'name', label: 'Serveur', sortable: true },
    { key: 'upsell_lines', label: 'Lignes upsell', sortable: true, align: 'right' },
    {
      key: 'upsell_revenue_ttc_cents',
      label: 'CA upsell TTC',
      sortable: true,
      align: 'right',
      render: (v: number) => eur(v),
    },
  ];

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current, suggestions } = data;
  const rate = current.total_orders_count > 0 ? (current.orders_with_upsell_count / current.total_orders_count) * 100 : null;
  const transformationRate = suggestions.proposed_count > 0 ? (suggestions.accepted_count / suggestions.proposed_count) * 100 : 0;
  const chartData = (staffData?.staff ?? []).slice(0, TOP_SERVERS_LIMIT);
  // `?? []` : réponse en cache côté navigateur antérieure à top_products.
  const topProducts = data.top_products ?? [];

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />
      {comparisonMode === 'compare' && merchantIds.length > 1 && <AggregationNotice />}

      {/* Tant qu'aucune ligne upsell n'existe pour l'établissement (upsell
          désactivé ou jamais accepté), ce message remplace les tuiles : des
          zéros laisseraient croire à un résultat mesuré. */}
      {!data.instrumentation_active ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-4 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-1">Aucune vente additionnelle enregistrée sur cet établissement</p>
          <p>
            Aucune ligne de commande n'a encore été ajoutée depuis une suggestion de vente
            additionnelle ici : l'upsell n'est pas activé sur la caisse, la borne ou Scan&amp;Order,
            ou aucune suggestion n'a encore été acceptée. Les indicateurs s'afficheront d'eux-mêmes
            dès la première vente additionnelle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tile title="Lignes upsell" value={current.upsell_lines} isHighlighted />
          <Tile title="CA upsell TTC" value={eur(current.upsell_revenue_ttc_cents)} />
          <Tile
            title="Taux de commandes avec upsell"
            value={rate !== null ? `${rate.toFixed(1)}%` : '—'}
            subtitle={`${current.orders_with_upsell_count} sur ${current.total_orders_count} commandes (au sens CA/Commandes/TVA)`}
          />
        </div>
      )}

      {/* Top articles : dérivé de is_upsell comme les tuiles ci-dessus, donc
          masqué tant que la collecte n'est pas active. Classement fait côté
          serveur (unités vendues, puis CA TTC) — pas de tri client. */}
      {data.instrumentation_active && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top des articles vendus en vente additionnelle</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Aucun article vendu en vente additionnelle sur cette période.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">Unités vendues</TableHead>
                      <TableHead className="text-right">CA upsell TTC</TableHead>
                      <TableHead className="text-right">Part du CA upsell</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((row, idx) => (
                      <TableRow key={row.product_id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.quantity_sold}</TableCell>
                        <TableCell className="text-right">{eur(row.upsell_revenue_ttc_cents)}</TableCell>
                        <TableCell className="text-right">
                          {current.upsell_revenue_ttc_cents > 0
                            ? `${((row.upsell_revenue_ttc_cents / current.upsell_revenue_ttc_cents) * 100).toFixed(1)}%`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bloc Suggestions : indépendant d'instrumentation_active — lit
          upsell_suggestions, un chemin d'écriture différent, déjà actif sur
          tous les canaux. C'est la métrique la plus utile de cet onglet
          aujourd'hui. */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Suggestions générées et transformation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Mesure indépendante de ce qui précède : chaque suggestion de vente additionnelle proposée
            au client, et si elle a effectivement été ajoutée à la commande — sur la caisse, la borne
            et Scan&amp;Order.
            {orderFilter && orderFilter.orderTypes.length < ORDER_TYPE_OPTIONS.length && (
              <> Le filtre de type de commande ne s'applique pas à ce bloc (une suggestion non acceptée n'est rattachée à aucune commande) : seul le canal est pris en compte.</>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Tile title="Suggestions proposées" value={suggestions.proposed_count} />
            <Tile title="Suggestions acceptées" value={suggestions.accepted_count} />
            <Tile
              title="Taux de transformation"
              value={suggestions.transformation_rate_available ? `${transformationRate.toFixed(1)}%` : '—'}
              subtitle={
                suggestions.transformation_rate_available
                  ? `${suggestions.accepted_count} sur ${suggestions.proposed_count} suggestions`
                  : `Effectif sous ${suggestions.min_proposed_for_rate} suggestions proposées — taux non affiché`
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Bloc nominatif — endpoint séparé, permission séparée. Absent du DOM
          (pas seulement vide) quand isStaffForbidden. */}
      {!isStaffForbidden && (
        <>
          {(staffData?.staff.length ?? 0) > 0 && (
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">CA upsell par serveur</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" width={120} />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value: number) => eur(value)}
                    />
                    <Bar dataKey="upsell_revenue_ttc_cents" fill={UPSELL_BAR_COLOR} name="CA upsell TTC" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Classement par serveur</CardTitle>
            </CardHeader>
            <CardContent>
              {isStaffLoading || !staffData ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : !staffData.instrumentation_active ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Aucune vente additionnelle enregistrée sur cet établissement — voir le message en haut de l'onglet.
                </div>
              ) : (
                <ExpandableDataTable<UpsellStaffRow>
                  columns={staffColumns}
                  data={staffData.staff}
                  initialSortBy="upsell_revenue_ttc_cents"
                  initialSortDir="desc"
                  emptyMessage="Aucune vente additionnelle attribuée à un membre de l'équipe sur cette période."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default UpsellAnalyticsTab;
