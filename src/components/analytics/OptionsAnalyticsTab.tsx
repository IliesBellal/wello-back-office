import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiFilter } from '@/components/shared/MultiFilter';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import {
  analyticsService,
  OptionsAnalyticsResponse,
  OptionRow,
  OPTION_TYPE_PAID,
  OPTION_TYPE_FREE,
  OPTION_TYPE_REMOVED,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface OptionsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const OPTION_TYPE_LABELS: Record<string, string> = {
  [OPTION_TYPE_PAID]: 'Payante',
  [OPTION_TYPE_FREE]: 'Gratuite',
  [OPTION_TYPE_REMOVED]: 'Retrait',
};

type SortBy = 'quantity' | 'revenue_ttc' | 'margin';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortBy, string> = {
  quantity: 'Quantité vendue',
  revenue_ttc: 'CA TTC',
  margin: 'Marge',
};

export const OptionsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: OptionsAnalyticsTabProps) => {
  const [data, setData] = useState<OptionsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  const [optionTypes, setOptionTypes] = useState<string[]>([OPTION_TYPE_PAID, OPTION_TYPE_FREE, OPTION_TYPE_REMOVED]);
  const [sortBy, setSortBy] = useState<SortBy>('quantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Tout changement de filtre repart page 1 — sinon une page hors bornes une
  // fois les types d'option changés (même règle que ProductsAnalyticsTab).
  useEffect(() => {
    setPage(1);
  }, [optionTypes, sortBy, sortDir, dateRange.from, dateRange.to]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getOptionsAnalytics(dateRange.from, dateRange.to, {
      optionTypes,
      sortBy,
      sortDir,
      page,
      pageSize,
      merchantIds,
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
  }, [dateRange.from, dateRange.to, optionTypes, sortBy, sortDir, page, merchantIds.join(',')]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const sortHeader = (column: SortBy, label: string, align: 'left' | 'right' = 'right') => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 select-none ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
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

  const { current_period: current, cost_coverage: coverage } = data;
  const marginBelowThreshold = coverage.margin_cents === undefined;

  return (
    <div className="space-y-6">
      <ScopeSummary merchantIds={data.scope.merchant_ids} merchantsById={merchantsById} />
      {comparisonMode === 'compare' && merchantIds.length > 1 && <AggregationNotice />}

      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <MultiFilter
                options={[
                  { id: OPTION_TYPE_PAID, label: 'Suppléments payants' },
                  { id: OPTION_TYPE_FREE, label: 'Modifications gratuites' },
                  { id: OPTION_TYPE_REMOVED, label: 'Ingrédients retirés' },
                ]}
                selectedIds={optionTypes}
                onChange={setOptionTypes}
                label="Types d'option"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Tri</label>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortBy); setSortDir('desc'); }}>
                <SelectTrigger className="bg-background border border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                    <SelectItem key={key} value={key}>{SORT_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Le tri est calculé au niveau du serveur, sur l'ensemble des options de la période — pas seulement la page affichée.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile title="Quantité vendue" value={current.quantity_sold} isHighlighted />
        <Tile title="CA généré par les options" value={eur(current.revenue_ttc_cents)} />
        <Tile
          title="Marge (sur coût connu)"
          value={marginBelowThreshold ? '—' : eur(coverage.margin_cents as number)}
          subtitle={
            marginBelowThreshold
              ? `Coût connu sur seulement ${(coverage.coverage_ratio * 100).toFixed(1)}% du CA — pas assez pour une marge fiable`
              : `Marge ${coverage.margin_percent?.toFixed(1)}% — calculée sur ${(coverage.coverage_ratio * 100).toFixed(1)}% du CA (le reste n'a pas de coût connu)`
          }
        />
        <Tile
          title="Part du CA couverte par un coût connu"
          value={`${(coverage.coverage_ratio * 100).toFixed(1)}%`}
          subtitle={`${eur(coverage.revenue_ttc_cents_covered)} sur ${eur(coverage.revenue_ttc_cents_total)}`}
        />
      </div>

      {(coverage.no_recipe_quantity > 0 || coverage.incomplete_recipe_quantity > 0) && (
        <p className="text-sm text-muted-foreground">
          Sur les unités sans coût : {coverage.no_recipe_quantity} option non reliée à un ingrédient (normal — aucune
          option n'est aujourd'hui reliée à un ingrédient de stock), {coverage.incomplete_recipe_quantity} avec un
          ingrédient lié mais un prix d'achat manquant. Les retraits d'ingrédients n'ont structurellement pas de
          coût suivi et ne comptent dans aucun des deux totaux.
        </p>
      )}

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails des options</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune option sur cette période</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Option</TableHead>
                    <TableHead>Produit</TableHead>
                    {sortHeader('quantity', 'Quantité vendue')}
                    <TableHead className="text-right">Taux d'adoption</TableHead>
                    {sortHeader('revenue_ttc', 'CA TTC')}
                    <TableHead className="text-right">Coût</TableHead>
                    {sortHeader('margin', 'Marge')}
                    <TableHead className="text-right">Marge %</TableHead>
                    <TableHead className="text-right">Impact panier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row: OptionRow) => (
                    <TableRow key={`${row.option_type}-${row.entity_id}-${row.product_id}`} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{OPTION_TYPE_LABELS[row.option_type] || row.option_type}</TableCell>
                      <TableCell>
                        {row.name}
                        {row.attribute_name && <span className="text-muted-foreground text-xs block">{row.attribute_name}</span>}
                      </TableCell>
                      <TableCell>{row.product_name}</TableCell>
                      <TableCell className="text-right">{row.quantity_sold}</TableCell>
                      <TableCell className="text-right">
                        {row.adoption_rate !== undefined ? `${row.adoption_rate.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">{eur(row.revenue_ttc_cents)}</TableCell>
                      <TableCell className="text-right">
                        {row.cost_price_cents !== undefined ? eur(row.cost_price_cents) : <span className="text-muted-foreground">non disponible</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.margin_cents !== undefined ? eur(row.margin_cents) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.margin_percent !== undefined ? `${row.margin_percent.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.basket_impact_cents !== undefined
                          ? <span className={row.basket_impact_cents >= 0 ? 'text-green-600' : 'text-red-600'}>{row.basket_impact_cents >= 0 ? '+' : ''}{eur(row.basket_impact_cents)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
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
            ? `0 option`
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
          filename="Options"
          onExport={() => analyticsService.exportOptionsCSV(data)}
        />
      </div>
    </div>
  );
};

export default OptionsAnalyticsTab;
