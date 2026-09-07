import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import { ChannelFilter } from '@/components/analytics/ChannelFilter';
import {
  analyticsService,
  ClientsAnalyticsResponse,
  ClientsTopResponse,
  ClientsSegmentCount,
  ClientRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_ORDER, CHANNEL_LABELS } from '@/utils/channels';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface ClientsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

// Libellés d'affichage des 5 segments — les clés elles-mêmes viennent du
// serveur (ClientsSegmentCount.segment), jamais devinées côté front.
const SEGMENT_LABELS: Record<string, string> = {
  nouveau: 'Nouveaux',
  recurrent: 'Récurrents',
  fidele: 'Fidèles',
  inactif: 'Inactifs',
  dormant: 'Dormants',
};

const SEGMENT_BADGE_CLASS: Record<string, string> = {
  fidele: 'bg-green-100 text-green-700',
  recurrent: 'bg-blue-100 text-blue-700',
  nouveau: 'bg-purple-100 text-purple-700',
  inactif: 'bg-gray-100 text-gray-700',
  dormant: 'bg-amber-100 text-amber-700',
};

const CHANNEL_FILTER_OPTIONS = CHANNEL_ORDER.map((c) => ({ id: c, label: CHANNEL_LABELS[c] ?? c }));

export const ClientsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: ClientsAnalyticsTabProps) => {
  // Vide = tous les canaux (même convention que le backend : channels.go's
  // ChannelFilter traite une liste vide comme "tous"). Les cases démarrent
  // toutes cochées pour représenter "pas de filtre" de façon visible plutôt
  // qu'un état "rien coché" ambigu.
  const [channels, setChannels] = useState<string[]>([...CHANNEL_ORDER]);

  const [data, setData] = useState<ClientsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 403 sur l'agrégat masque l'onglet entier — reports.sales.read, même
  // consigne que les autres onglets réels.
  const [isForbidden, setIsForbidden] = useState(false);

  // Bloc nominatif (Top Clients) : endpoint séparé (customers.manage, plus
  // sensible), chargé indépendamment. Un 403 ici ne masque QUE ce bloc — le
  // reste de l'onglet doit rester intact (PROMPT 18 §2).
  const [topData, setTopData] = useState<ClientsTopResponse | null>(null);
  const [isTopLoading, setIsTopLoading] = useState(true);
  const [isTopForbidden, setIsTopForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getClientsAnalytics(dateRange.from, dateRange.to, channels, merchantIds)
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
  }, [dateRange.from, dateRange.to, channels.join(','), merchantIds.join(',')]);

  // Bloc nominatif (Top Clients) : toujours fusionné quel que soit le mode
  // (PROMPT 24) — merchantIds transmis (le serveur exige customers.manage sur
  // CHAQUE établissement sélectionné, 403 sinon, masquant ce bloc seul).
  useEffect(() => {
    let isMounted = true;
    setIsTopLoading(true);
    setIsTopForbidden(false);

    analyticsService.getClientsTop(dateRange.from, dateRange.to, channels, merchantIds)
      .then((result) => {
        if (!isMounted) return;
        setTopData(result);
        setIsTopLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (isApiHttpError(error) && error.status === 403) {
          setIsTopForbidden(true);
        }
        setIsTopLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, channels.join(','), merchantIds.join(',')]);

  const topColumns: ColumnConfig<ClientRow>[] = [
    { key: 'name', label: 'Client', sortable: true },
    { key: 'lifetime_orders', label: 'Commandes (total)', sortable: true, align: 'right' },
    {
      key: 'lifetime_value_cents',
      label: 'Valeur vie',
      sortable: true,
      align: 'right',
      render: (val: number) => eur(val),
    },
    {
      key: 'avg_basket_ttc_cents',
      label: 'Panier moyen',
      sortable: true,
      align: 'right',
      render: (val: number) => eur(val),
    },
    { key: 'last_order_date', label: 'Dernière visite', sortable: true },
  ];

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const coveragePct = (data.coverage.coverage_ratio * 100).toFixed(1);
  const segmentTotal = data.segments.reduce((sum: number, s: ClientsSegmentCount) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />
      {comparisonMode === 'compare' && merchantIds.length > 1 && <AggregationNotice />}

      <ChannelFilter
        label="Canaux inclus dans l'analyse"
        options={CHANNEL_FILTER_OPTIONS}
        selected={channels}
        onChange={setChannels}
        columns={4}
      />

      {/* PROMPT 18 §1 : la couverture est LA donnée centrale de cet onglet —
          toujours visible, quel que soit le filtre canal appliqué. */}
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
        Analyse portant sur <span className="font-semibold">{coveragePct}%</span> des commandes de la période
        ({data.coverage.orders_with_customer_id.toLocaleString('fr-FR')} sur {data.coverage.total_orders.toLocaleString('fr-FR')} avec un client identifié).
        {' '}Les commandes sans client identifié sont exclues de tout ce qui suit.
      </div>

      {data.no_identified_customers ? (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Aucun client identifié sur cette période pour cet établissement (avec ce filtre de canal) — pas de données à analyser, pas une erreur.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile
              title="Nouveaux clients"
              value={data.new_customers_count.toLocaleString('fr-FR')}
              subtitle="Première commande de tous les temps sur la période"
              isHighlighted
            />
            <Tile
              title="Taux de récurrence"
              value={
                data.recurring_rate !== undefined
                  ? `${(data.recurring_rate * 100).toFixed(1)}%`
                  : `${data.recurring_count} sur ${data.identified_customers_in_period}`
              }
              subtitle={
                data.recurring_rate === undefined
                  ? `Effectif sous ${data.min_customers_for_rate} clients — taux non affiché`
                  : `${data.recurring_count} sur ${data.identified_customers_in_period} clients actifs`
              }
            />
            <Tile
              title="Fréquence d'achat"
              value={`${data.avg_orders_per_active_customer.toFixed(2)}x`}
              subtitle="Commandes par client actif sur la période"
            />
            <Tile
              title="Clients actifs sur la période"
              value={data.identified_customers_in_period.toLocaleString('fr-FR')}
              subtitle="Au moins une commande avec client identifié"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.segments.map((seg) => (
              <Card key={seg.segment} className="bg-card border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">
                    <span className={`px-2 py-1 rounded-full ${SEGMENT_BADGE_CLASS[seg.segment] ?? 'bg-gray-100 text-gray-700'}`}>
                      {SEGMENT_LABELS[seg.segment] ?? seg.segment}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seg.count.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.segment_rates_available
                      ? `${segmentTotal > 0 ? ((seg.count / segmentTotal) * 100).toFixed(1) : '0'}% des clients identifiés`
                      : `sur ${segmentTotal} clients identifiés (effectif sous ${data.min_customers_for_rate} — taux non affiché)`}
                  </div>
                  <div className="pt-2 mt-2 border-t border-border/50 text-xs">
                    {seg.avg_basket_ttc_cents !== undefined
                      ? <>Panier moyen : <span className="font-semibold">{eur(seg.avg_basket_ttc_cents)}</span></>
                      : <span className="text-muted-foreground">Aucune commande sur la période</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Définitions retenues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Taux de récurrence : </span>{data.definitions.recurrence}</p>
          <p><span className="font-medium text-foreground">Segments : </span>{data.definitions.segments}</p>
          <p><span className="font-medium text-foreground">Fréquence d'achat : </span>{data.definitions.frequency}</p>
          <p><span className="font-medium text-foreground">Inactivité : </span>{data.definitions.inactivity}</p>
        </CardContent>
      </Card>

      {/* Bloc nominatif — endpoint séparé, permission séparée (customers.manage).
          Absent du DOM (pas seulement vide) quand isTopForbidden : PROMPT 18 §2
          impose de masquer CE bloc, pas de casser l'onglet. */}
      {!isTopForbidden && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isTopLoading || !topData ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <ExpandableDataTable<ClientRow>
                columns={topColumns}
                data={topData.top_clients}
                expandableRowKey="customer_id"
                initialSortBy="lifetime_value_cents"
                initialSortDir="desc"
                emptyMessage="Aucun client identifié sur cette période pour cet établissement."
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <ExportButton
          filename="Clients"
          onExport={() => analyticsService.exportClientsCSV(data, topData)}
        />
      </div>
    </div>
  );
};

export default ClientsAnalyticsTab;
