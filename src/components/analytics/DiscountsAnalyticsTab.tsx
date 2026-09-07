import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import { ChannelFilter } from '@/components/analytics/ChannelFilter';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import {
  analyticsService,
  DiscountsAnalyticsResponse,
  DiscountRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { CHANNEL_ORDER, CHANNEL_LABELS } from '@/utils/channels';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface DiscountsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const CHANNEL_FILTER_OPTIONS = CHANNEL_ORDER.map((c) => ({ id: c, label: CHANNEL_LABELS[c] ?? c }));

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

type SortBy = 'amount' | 'count';
type SortDir = 'asc' | 'desc';

export const DiscountsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: DiscountsAnalyticsTabProps) => {
  const [channels, setChannels] = useState<string[]>([...CHANNEL_ORDER]);
  const [sortBy, setSortBy] = useState<SortBy>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [data, setData] = useState<DiscountsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  // Tout changement de filtre repart page 1 — sinon une page hors bornes
  // peut survivre au changement de canal/tri (même garde que Produits).
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.join(','), sortBy, sortDir, dateRange.from, dateRange.to]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getDiscountsAnalytics(dateRange.from, dateRange.to, {
      channels, sortBy, sortDir, page, pageSize, merchantIds,
    })
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
  }, [dateRange.from, dateRange.to, channels.join(','), sortBy, sortDir, page, merchantIds.join(',')]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const sortHeader = (column: SortBy, label: string) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none text-right"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1 justify-end">
        {label}
        {sortBy === column && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />)}
      </div>
    </TableHead>
  );

  if (isForbidden) {
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const { current_period: current, previous_period: previous, margin_impact: margin } = data;
  const amountChange = pctChange(current.total_discounted_cents, previous.total_discounted_cents);
  const hasReconstructed = current.reconstructed_amount_cents > 0;
  const marginBelowThreshold = margin.margin_impact_cents === undefined;

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />
      {comparisonMode === 'compare' && merchantIds.length > 1 && <AggregationNotice />}

      <ChannelFilter
        label="Canaux inclus"
        options={CHANNEL_FILTER_OPTIONS}
        selected={channels}
        onChange={setChannels}
        columns={4}
      />

      {/* PROMPT 22 : distinction plancher/mesure complète portée par
          is_reconstructed, jamais reléguée à une note de bas de page. Tant
          qu'une part de la période est reconstituée, le montant affiché est
          un minimum, pas un total. */}
      {hasReconstructed && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-4 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-1">
            Montant plancher, pas un total : {eur(current.reconstructed_amount_cents)} sur cette période
            proviennent de commandes antérieures à la bascule vers la mesure directe, reconstitués à partir
            des seules remises encore détectables après coup — rien ne garantit l'exhaustivité de cette part.
          </p>
          <p>
            {data.measurement_complete_from
              ? `La mesure est complète et directe depuis le ${new Date(data.measurement_complete_from).toLocaleDateString('fr-FR')}. Avant cette date, dites "au moins", jamais "exactement".`
              : "Aucune remise n'a encore été enregistrée en direct sur cet établissement — la totalité des chiffres ci-dessous est reconstituée, donc un plancher, pas un total."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          title={hasReconstructed ? 'Au moins remisé' : 'Montant remisé'}
          value={eur(current.total_discounted_cents)}
          isHighlighted
        >
          {amountChange !== null && <EvolutionBadge percent={amountChange} />}
        </Tile>
        <Tile
          title="Taux de remise moyen"
          value={current.discount_rate_percent !== undefined ? `${current.discount_rate_percent.toFixed(2)}%` : '—'}
          subtitle={
            current.discount_rate_percent !== undefined
              ? `${eur(current.total_discounted_cents)} remisés sur ${eur(current.reference_revenue_ttc_cents)} de CA de la période (toutes commandes)`
              : `Effectif insuffisant (${current.discounted_orders_count} commande${current.discounted_orders_count > 1 ? 's' : ''} remisée${current.discounted_orders_count > 1 ? 's' : ''}) — taux non affiché`
          }
        />
        <Tile
          title="Commandes avec remise"
          value={current.orders_with_discount_rate_percent !== undefined ? `${current.orders_with_discount_rate_percent.toFixed(2)}%` : '—'}
          subtitle={`${current.discounted_orders_count} sur ${current.total_orders_count} commandes`}
        />
        <Tile
          title="Impact sur la marge"
          value={marginBelowThreshold ? 'non disponible' : eur(margin.margin_impact_cents as number)}
          subtitle={
            marginBelowThreshold
              ? `Coût connu sur seulement ${(margin.coverage_ratio * 100).toFixed(1)}% des lignes remisées — pas assez pour un impact fiable`
              : `${margin.margin_impact_percent?.toFixed(1)}% de la marge qui aurait été réalisée sans remise — calculé sur ${(margin.coverage_ratio * 100).toFixed(1)}% des lignes remisées`
          }
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Répartition par remise</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune remise appliquée sur cette période</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Remise</TableHead>
                    {sortHeader('amount', 'Montant remisé')}
                    {sortHeader('count', 'Utilisations')}
                    <TableHead className="text-right">dont reconstitué</TableHead>
                    <TableHead className="text-right">dont mesuré en direct</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row: DiscountRow) => (
                    <TableRow key={row.discount_id} className="hover:bg-muted/50">
                      <TableCell>
                        {row.discount_name}
                        {row.is_deleted && <span className="ml-2 text-xs text-muted-foreground">(supprimée)</span>}
                      </TableCell>
                      <TableCell className="text-right">{eur(row.total_amount_cents)}</TableCell>
                      <TableCell className="text-right">{row.redemptions_count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{eur(row.reconstructed_amount_cents)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{eur(row.measured_amount_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.rows.length === 0
            ? '0 remise'
            : `Affichage ${(data.pagination.current_page - 1) * data.pagination.limit + 1} à ${(data.pagination.current_page - 1) * data.pagination.limit + data.rows.length} sur ${data.pagination.total_items}`}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.pagination.current_page <= 1}
            className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
            Page {data.pagination.current_page} sur {Math.max(data.pagination.total_pages, 1)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(Math.max(data.pagination.total_pages, 1), p + 1))}
            disabled={data.pagination.current_page >= data.pagination.total_pages}
            className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <ExportButton
          filename="Remises"
          onExport={() => analyticsService.exportDiscountsCSV(data)}
        />
      </div>
    </div>
  );
};

export default DiscountsAnalyticsTab;
