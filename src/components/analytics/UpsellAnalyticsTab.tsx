import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import { ChannelFilter } from '@/components/analytics/ChannelFilter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  analyticsService,
  UpsellAnalyticsResponse,
  UpsellByStaffResponse,
  UpsellStaffRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_ORDER, CHANNEL_LABELS } from '@/utils/channels';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface UpsellAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const UPSELL_BAR_COLOR = '#8b5cf6';
const TOP_SERVERS_LIMIT = 10;

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const CHANNEL_FILTER_OPTIONS = CHANNEL_ORDER.map((c) => ({ id: c, label: CHANNEL_LABELS[c] ?? c }));

export const UpsellAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: UpsellAnalyticsTabProps) => {
  // Vide = tous les canaux (même convention que Clients) — ne filtre que les
  // chiffres issus d'orderitems (lignes/CA/classement), jamais le bloc
  // Suggestions (upsell_suggestions.channel est POS/SNO/KIOSK, une autre
  // nomenclature, voir analyticsService.ts).
  const [channels, setChannels] = useState<string[]>([...CHANNEL_ORDER]);

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

    analyticsService.getUpsellAnalytics(dateRange.from, dateRange.to, channels, merchantIds)
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

  // Bloc nominatif : toujours fusionné quel que soit le mode (PROMPT 24) —
  // merchantIds transmis (le serveur exige reports.staff_performance.read sur
  // CHAQUE établissement sélectionné, 403 sinon, masquant ce bloc seul).
  useEffect(() => {
    let isMounted = true;
    setIsStaffLoading(true);
    setIsStaffForbidden(false);

    analyticsService.getUpsellByStaff(dateRange.from, dateRange.to, channels, merchantIds)
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
  }, [dateRange.from, dateRange.to, channels.join(','), merchantIds.join(',')]);

  const staffColumns: ColumnConfig<UpsellStaffRow>[] = [
    { key: 'name', label: 'Serveur', sortable: true },
    { key: 'upsell_lines', label: 'Lignes upsell', sortable: true, align: 'right' },
    {
      key: 'upsell_revenue_ht_cents',
      label: 'CA upsell HT',
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

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />
      {comparisonMode === 'compare' && merchantIds.length > 1 && <AggregationNotice />}

      <ChannelFilter
        label="Canaux inclus (lignes de commande upsell)"
        options={CHANNEL_FILTER_OPTIONS}
        selected={channels}
        onChange={setChannels}
        columns={4}
      />

      {/* PROMPT 19 : message principal tant que la collecte n'est pas active
          — jamais une note en bas de page, jamais des zéros affichés comme
          un résultat. Remplace les tuiles d'agrégat, pas juste un warning
          à côté. */}
      {!data.instrumentation_active ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-4 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-1">Donnée non collectée sur cet établissement</p>
          <p>
            Aucune ligne de commande n'a jamais été marquée comme issue d'une suggestion de vente
            additionnelle ici — pas parce qu'il n'y a pas eu de vente additionnelle, mais parce que
            l'instrumentation qui l'enregistre (canaux Kiosk et ScanNOrder) n'est pas encore branchée
            sur ce canal de commande. Les chiffres ci-dessous ne seraient que des zéros trompeurs ;
            cet écran s'allumera de lui-même, sans mise à jour, dès que la collecte démarrera.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tile title="Lignes upsell" value={current.upsell_lines} isHighlighted />
          <Tile title="CA upsell HT" value={eur(current.upsell_revenue_ht_cents)} />
          <Tile
            title="Taux de commandes avec upsell"
            value={rate !== null ? `${rate.toFixed(1)}%` : '—'}
            subtitle={`${current.orders_with_upsell_count} sur ${current.total_orders_count} commandes (au sens CA/Commandes/TVA)`}
          />
        </div>
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
            au client, et si elle a effectivement été ajoutée à la commande — fonctionne dès
            aujourd'hui sur POS, Kiosk et ScanNOrder.
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
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      formatter={(value: number) => eur(value)}
                    />
                    <Bar dataKey="upsell_revenue_ht_cents" fill={UPSELL_BAR_COLOR} name="CA upsell HT" />
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
                  Donnée non collectée sur cet établissement — voir le message en haut de l'onglet.
                </div>
              ) : (
                <ExpandableDataTable<UpsellStaffRow>
                  columns={staffColumns}
                  data={staffData.staff}
                  initialSortBy="upsell_revenue_ht_cents"
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
