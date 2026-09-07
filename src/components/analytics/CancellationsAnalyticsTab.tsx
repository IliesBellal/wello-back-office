import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  analyticsService,
  CancellationsAnalyticsResponse,
  CancellationsByStaffResponse,
  StaffCancellationRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '@/utils/channels';
import { ScopeSummary } from '@/components/analytics/ScopeNotice';
import { EstablishmentComparisonChart } from '@/components/analytics/EstablishmentComparisonChart';

interface CancellationsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

// author_type est un enum stable (STAFF/CUSTOMER/SYSTEM/PLATFORM/UNKNOWN),
// pas un référentiel mutable comme les motifs — un libellé FR figé ici ne
// reproduit pas le piège slugs-anglais/labels-français de l'audit, qui
// portait sur le filtrage, pas sur l'affichage d'un enum de code.
const AUTHOR_TYPE_LABELS: Record<string, string> = {
  STAFF: 'Équipe',
  CUSTOMER: 'Client',
  SYSTEM: 'Système',
  PLATFORM: 'Plateforme',
  UNKNOWN: 'Non déterminé',
};

const AUTHOR_TYPE_COLORS: Record<string, string> = {
  STAFF: '#3b82f6',
  CUSTOMER: '#10b981',
  SYSTEM: '#8b5cf6',
  PLATFORM: '#f59e0b',
  UNKNOWN: '#9ca3af',
};

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

const pctChange = (current: number, reference: number): number | null => {
  if (reference === 0) return null;
  return ((current - reference) / reference) * 100;
};

// null quand le dénominateur est 0 (aucune commande créée sur la période) —
// jamais un taux à 0% qui laisserait croire à une mesure réelle.
const rate = (numerator: number, denominator: number): number | null => {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
};

// PROMPT 14 §3 : le volume de référence apparaît toujours à côté du taux —
// "4 annulations sur 62 commandes" se lit, "6,5%" seul se retient de travers.
const rateWithVolume = (numerator: number, denominator: number): string => {
  const r = rate(numerator, denominator);
  const pct = r !== null ? `${r.toFixed(2)}%` : '—';
  return `${pct} (${numerator} sur ${denominator})`;
};

export const CancellationsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: CancellationsAnalyticsTabProps) => {
  const [data, setData] = useState<CancellationsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 403 sur l'agrégat masque l'onglet entier (même consigne que les 4 autres
  // onglets et la tuile d'accueil) — c'est reports.sales.read.
  const [isForbidden, setIsForbidden] = useState(false);

  // Bloc nominatif : endpoint séparé (reports.staff_performance.read, plus
  // sensible), chargé indépendamment. Un 403 ici ne masque QUE ce bloc — le
  // reste de l'onglet doit rester intact (PROMPT 14 §1).
  const [staffData, setStaffData] = useState<CancellationsByStaffResponse | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [isStaffForbidden, setIsStaffForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getCancellationsAnalytics(dateRange.from, dateRange.to, { merchantIds, groupBy: comparisonMode })
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

  // Bloc nominatif : toujours fusionné quel que soit le mode (PROMPT 24,
  // décision explicite) — merchantIds est transmis (le serveur exige
  // reports.staff_performance.read sur CHAQUE établissement sélectionné et
  // renvoie un 403 sinon, masquant ce bloc seul), mais jamais de group_by.
  useEffect(() => {
    let isMounted = true;
    setIsStaffLoading(true);
    setIsStaffForbidden(false);

    analyticsService.getCancellationsByStaff(dateRange.from, dateRange.to, merchantIds)
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
  }, [dateRange.from, dateRange.to, merchantIds.join(',')]);

  const authorTypeChartData = useMemo(() => {
    if (!data) return [];
    return data.by_author_type
      .filter((a) => a.count > 0)
      .map((a) => ({
        author_type: a.author_type,
        name: AUTHOR_TYPE_LABELS[a.author_type] ?? a.author_type,
        count: a.count,
      }));
  }, [data]);

  const channelPieData = useMemo(() => {
    if (!data) return [];
    return data.by_channel
      .filter((c) => c.count > 0)
      .map((c) => ({
        channel: c.channel,
        name: CHANNEL_LABELS[c.channel] ?? c.channel,
        value: c.count,
      }));
  }, [data]);

  const reasonRows = useMemo(() => {
    if (!data) return [];
    const total = data.current_period.cancelled_count;
    return [...data.by_reason]
      .sort((a, b) => b.count - a.count)
      .map((r) => ({
        ...r,
        percentage: total > 0 ? (r.count / total) * 100 : 0,
      }));
  }, [data]);

  const staffColumns: ColumnConfig<StaffCancellationRow>[] = [
    { key: 'name', label: 'Membre de l\'équipe', sortable: true },
    { key: 'orders_created', label: 'Commandes créées', sortable: true, align: 'right' },
    { key: 'cancelled_count', label: 'Annulations', sortable: true, align: 'right' },
    {
      key: 'rate_available',
      label: 'Taux',
      align: 'right',
      render: (_val: boolean, row: StaffCancellationRow) => (
        row.rate_available
          ? `${((row.cancelled_count / row.orders_created) * 100).toFixed(2)}%`
          : <span className="text-muted-foreground">effectif insuffisant</span>
      ),
    },
  ];

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current, previous_period: previous } = data;
  const volumeChange = pctChange(current.cancelled_count, previous.cancelled_count);
  const noOrders = current.total_orders_created === 0;
  const noCancellations = !noOrders && current.cancelled_count === 0;
  const internalRate = rate(current.internal_cancelled_count, current.total_orders_created);

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />

      {/* Lecture principale de l'écran (PROMPT 14 §2) : le taux INTERNE
          (STAFF+CUSTOMER+SYSTEM), distinct du taux plateforme — une
          annulation Uber Eats/Deliveroo ne dit rien de l'exploitation du
          restaurant et rendrait le taux global illisible mélangée dedans. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          title="Taux d'annulation interne"
          value={internalRate !== null ? internalRate.toFixed(2) + '%' : '—'}
          subtitle={`${current.internal_cancelled_count} sur ${current.total_orders_created} commandes`}
          isHighlighted
        />
        <Tile
          title="Annulations plateforme"
          value={rateWithVolume(current.platform_cancelled_count, current.total_orders_created)}
        />
        <Tile
          title="Annulations totales"
          value={current.cancelled_count}
        >
          {volumeChange !== null && <EvolutionBadge percent={volumeChange} />}
        </Tile>
        <Tile
          title="Montant perdu"
          value={eur(current.cancelled_amount_cents)}
        />
      </div>

      {current.unknown_cancelled_count > 0 && (
        <p className="text-sm text-muted-foreground">
          Dont {current.unknown_cancelled_count} annulation{current.unknown_cancelled_count > 1 ? 's' : ''} à
          {' '}typologie d'auteur non déterminée (jamais retirée du total ci-dessus).
        </p>
      )}

      {noOrders && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Aucune commande créée sur cette période pour cet établissement — aucun taux à calculer.
        </div>
      )}
      {noCancellations && (
        <div className="rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 text-sm text-green-900 dark:text-green-200">
          Aucune annulation sur cette période — bon résultat, pas une erreur d'affichage.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par typologie d'auteur</CardTitle>
          </CardHeader>
          <CardContent>
            {authorTypeChartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={authorTypeChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Bar dataKey="count" name="Annulations">
                    {authorTypeChartData.map((entry) => (
                      <Cell key={entry.author_type} fill={AUTHOR_TYPE_COLORS[entry.author_type] ?? '#9ca3af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par canal</CardTitle>
          </CardHeader>
          <CardContent>
            {channelPieData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={channelPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {channelPieData.map((entry) => (
                      <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? CHANNEL_COLORS.unknown} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Motifs d'annulation</CardTitle>
        </CardHeader>
        <CardContent>
          {reasonRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune donnée sur cette période</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Motif</th>
                    <th className="px-4 py-2 font-medium text-right">Annulations</th>
                    <th className="px-4 py-2 font-medium text-right">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {reasonRows.map((r) => (
                    <tr key={r.reason_id} className="border-b border-border/50">
                      <td className="px-4 py-2">{r.label}</td>
                      <td className="px-4 py-2 text-right">{r.count}</td>
                      <td className="px-4 py-2 text-right">{r.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.scope.group_by === 'merchant' && data.by_merchant && data.by_merchant.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Annulations par établissement</CardTitle>
          </CardHeader>
          <CardContent>
            <EstablishmentComparisonChart
              valueLabel="Annulations"
              valueFormatter={(v) => `${v} annulations`}
              data={data.by_merchant.map((row) => ({
                merchantId: row.merchant_id,
                label: merchantsById[row.merchant_id] ?? row.merchant_id,
                value: row.cancelled_count,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Bloc nominatif — endpoint séparé, permission séparée. Absent du DOM
          (pas seulement vide) quand isStaffForbidden : PROMPT 14 §1 impose
          de masquer CE bloc, pas de casser l'onglet. */}
      {!isStaffForbidden && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Classement nominatif par membre de l'équipe</CardTitle>
          </CardHeader>
          <CardContent>
            {isStaffLoading || !staffData ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  En dessous de {staffData.min_orders_for_rate} commandes créées sur la période, le taux
                  n'est pas affiché — seul le nombre d'annulations l'est, un taux calculé sur trop peu de
                  commandes désignerait quelqu'un sur du bruit.
                </p>
                <ExpandableDataTable<StaffCancellationRow>
                  columns={staffColumns}
                  data={staffData.staff}
                  initialSortBy="cancelled_count"
                  initialSortDir="desc"
                  emptyMessage="Aucune annulation attribuée à un membre de l'équipe identifié sur cette période."
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <ExportButton
          filename="Annulations"
          onExport={() => analyticsService.exportCancellationsCSV(data, staffData)}
        />
      </div>
    </div>
  );
};

export default CancellationsAnalyticsTab;
