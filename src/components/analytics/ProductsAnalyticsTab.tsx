import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tile } from '@/components/shared/Tile';
import { ExportButton } from '@/components/analytics';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import {
  analyticsService,
  ProductsAnalyticsResponse,
  ProductRow,
  ComparisonMode,
} from '@/services/analyticsService';
import { isApiHttpError } from '@/services/apiClient';
import { ScopeSummary, AggregationNotice } from '@/components/analytics/ScopeNotice';

interface ProductsAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
  merchantIds?: string[];
  comparisonMode?: ComparisonMode;
  merchantsById?: Record<string, string>;
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

type SortBy = 'quantity' | 'revenue_ttc' | 'margin';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortBy, string> = {
  quantity: 'Quantité vendue',
  revenue_ttc: 'CA TTC',
  margin: 'Marge',
};

export const ProductsAnalyticsTab = ({ dateRange, merchantIds = [], comparisonMode = 'cumule', merchantsById = {} }: ProductsAnalyticsTabProps) => {
  const [data, setData] = useState<ProductsAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  const [categoryId, setCategoryId] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('quantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Tout changement de filtre repart page 1 — sinon une page 4 peut se
  // retrouver hors bornes une fois la catégorie changée.
  useEffect(() => {
    setPage(1);
  }, [categoryId, sortBy, sortDir, dateRange.from, dateRange.to]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsForbidden(false);

    analyticsService.getProductsAnalytics(dateRange.from, dateRange.to, {
      categoryId: categoryId || undefined,
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
  }, [dateRange.from, dateRange.to, categoryId, sortBy, sortDir, page, merchantIds.join(',')]);

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
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Catégorie</label>
              <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-background border border-input">
                  <SelectValue placeholder="Toutes catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {data.available_categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <p className="text-xs text-muted-foreground mt-1">Le tri est calculé au niveau du serveur, sur l'ensemble des produits de la période — pas seulement la page affichée.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile title="Quantité vendue" value={current.quantity_sold} isHighlighted />
        <Tile title="CA TTC" value={eur(current.revenue_ttc_cents)} />
        <Tile title="CA HT" value={eur(current.revenue_ht_cents)} />
        <Tile
          title="Marge (sur coût connu)"
          value={marginBelowThreshold ? '—' : eur(coverage.margin_cents as number)}
          subtitle={
            marginBelowThreshold
              ? `Coût connu sur seulement ${(coverage.coverage_ratio * 100).toFixed(1)}% du CA — pas assez pour une marge fiable`
              : `Marge ${coverage.margin_percent?.toFixed(1)}% — calculée sur ${(coverage.coverage_ratio * 100).toFixed(1)}% du CA (le reste n'a pas de coût connu)`
          }
        />
      </div>

      {(coverage.no_recipe_quantity > 0 || coverage.incomplete_recipe_quantity > 0) && (
        <p className="text-sm text-muted-foreground">
          Sur les unités sans coût : {coverage.no_recipe_quantity} sans recette définie (normal pour un produit
          revendu tel quel), {coverage.incomplete_recipe_quantity} avec une recette incomplète (prix d'achat
          manquant sur au moins un ingrédient — à corriger dans la fiche produit pour que la marge apparaisse).
        </p>
      )}

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails des produits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune vente sur cette période</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Catégorie</TableHead>
                    {sortHeader('quantity', 'Quantité vendue')}
                    {sortHeader('revenue_ttc', 'CA TTC')}
                    <TableHead className="text-right">CA HT</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                    {sortHeader('margin', 'Marge')}
                    <TableHead className="text-right">Marge %</TableHead>
                    <TableHead className="text-right">Évolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row: ProductRow) => (
                    <TableRow key={row.product_id} className="hover:bg-muted/50">
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category_name || '—'}</TableCell>
                      <TableCell className="text-right">{row.quantity_sold}</TableCell>
                      <TableCell className="text-right">{eur(row.revenue_ttc_cents)}</TableCell>
                      <TableCell className="text-right">{eur(row.revenue_ht_cents)}</TableCell>
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
                        {row.evolution_percent !== undefined ? <div className="flex justify-end"><EvolutionBadge percent={row.evolution_percent} /></div> : <span className="text-muted-foreground">nouveau</span>}
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
            ? `0 produit`
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
          filename="Produits"
          onExport={() => analyticsService.exportProductsCSV(data)}
        />
      </div>
    </div>
  );
};

export default ProductsAnalyticsTab;
