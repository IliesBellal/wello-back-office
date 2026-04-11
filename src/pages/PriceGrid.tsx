import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TabSystem, PageContainer } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Tag, TrendingUp, TrendingDown, ShoppingCart, BadgePercent, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { Product, Category } from '@/types/menu';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceTPEInput } from '@/components/ui/PriceTPEInput';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPrice = (cents: number | undefined): string => {
  if (cents === undefined || cents === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

type SortKey = 'name' | 'category' | 'price' | 'price_take_away' | 'price_delivery' | 'uber_eats' | 'deliveroo';
type SortDir = 'asc' | 'desc';

function getProductValue(product: Product & { categoryName: string }, key: SortKey): string | number {
  switch (key) {
    case 'name': return product.name.toLowerCase();
    case 'category': return product.categoryName.toLowerCase();
    case 'price': return product.price ?? -1;
    case 'price_take_away': return product.price_take_away ?? -1;
    case 'price_delivery': return product.price_delivery ?? -1;
    case 'uber_eats': return product.integrations?.uber_eats?.enabled ? (product.integrations.uber_eats.price_override ?? -1) : -1;
    case 'deliveroo': return product.integrations?.deliveroo?.enabled ? (product.integrations.deliveroo.price_override ?? -1) : -1;
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface SortIconProps {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}
const SortIcon = ({ col, sortKey, sortDir }: SortIconProps) => {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
};

// ─── main table ──────────────────────────────────────────────────────────────

type EnrichedProduct = Product & { categoryName: string };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Produit' },
  { key: 'category', label: 'Catégorie' },
  { key: 'price', label: 'Sur place' },
  { key: 'price_take_away', label: 'À emporter' },
  { key: 'price_delivery', label: 'Livraison' },
  { key: 'uber_eats', label: 'Uber Eats' },
  { key: 'deliveroo', label: 'Deliveroo' },
];

function ProductPriceTable({ products, categories }: { products: EnrichedProduct[]; categories: Category[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});
  const { toast } = useToast();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Mise à jour d'un prix lors de l'édition
  const updatePrice = useCallback((productId: string, priceField: string, cents: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [priceField]: cents,
      },
    }));
  }, []);

  // Annule l'édition
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedPrices({});
  }, []);

  // Valide et enregistre tous les prix modifiés
  const saveChanges = useCallback(async () => {
    if (Object.keys(editedPrices).length === 0) {
      toast({
        title: 'Aucun changement',
        description: 'Aucun prix n\'a été modifié',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prépare les données pour le bulk update
      const productsToUpdate: Array<{
        product_id: string;
        price?: number;
        price_take_away?: number;
        price_delivery?: number;
      }> = [];

      Object.entries(editedPrices).forEach(([productId, priceUpdates]) => {
        const product: {
          product_id: string;
          price?: number;
          price_take_away?: number;
          price_delivery?: number;
        } = {
          product_id: productId,
        };
        // Ajoute uniquement les prix qui ont été modifiés
        if ('price' in priceUpdates) product.price = priceUpdates.price;
        if ('price_take_away' in priceUpdates) product.price_take_away = priceUpdates.price_take_away;
        if ('price_delivery' in priceUpdates) product.price_delivery = priceUpdates.price_delivery;
        productsToUpdate.push(product);
      });

      await menuService.bulkUpdatePrices(productsToUpdate);
      
      toast({
        title: 'Succès',
        description: `${productsToUpdate.length} produit(s) mis à jour avec succès`,
      });
      
      setIsEditing(false);
      setEditedPrices({});
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les prix',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editedPrices, toast]);

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category_id === categoryFilter);
    }

    return [...result].sort((a, b) => {
      const va = getProductValue(a, sortKey);
      const vb = getProductValue(b, sortKey);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = va as number;
      const nb = vb as number;
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [products, search, categoryFilter, sortKey, sortDir]);

  // Récupère le prix affiché (edited ou original)
  const getDisplayPrice = (productId: string, field: string, originalPrice: number | undefined) => {
    const edited = editedPrices[productId]?.[field];
    return edited !== undefined ? edited : (originalPrice ?? 0);
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.category_id} value={cat.category_id}>
                  {cat.category || cat.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1" />
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-gradient-primary"
                onClick={saveChanges}
                disabled={isSaving || Object.keys(editedPrices).length === 0}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Enregistrer ({Object.keys(editedPrices).length})
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Modifier les prix
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {COLUMNS.map(col => (
                <TableHead
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap hover:bg-muted/60 transition-colors"
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(product => {
                const uberPrice = product.integrations?.uber_eats?.enabled
                  ? product.integrations.uber_eats.price_override
                  : undefined;
                const deliverooPrice = product.integrations?.deliveroo?.enabled
                  ? product.integrations.deliveroo.price_override
                  : undefined;

                return (
                  <TableRow key={product.product_id} className="hover:bg-muted/20 transition-colors">
                    {/* Produit */}
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: product.bg_color || '#e5e7eb' }}
                          />
                        )}
                        <span className="font-medium truncate">{product.name}</span>
                      </div>
                    </TableCell>
                    {/* Catégorie */}
                    <TableCell>
                      {product.categoryName ? (
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {product.categoryName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    {/* Prix sur place */}
                    <TableCell className="font-mono text-sm">
                      {isEditing ? (
                        <PriceTPEInput
                          value={getDisplayPrice(product.product_id, 'price', product.price)}
                          onChange={(cents) => updatePrice(product.product_id, 'price', cents)}
                          autoConfirmOnBlur={false}
                        />
                      ) : (
                        formatPrice(product.price)
                      )}
                    </TableCell>
                    {/* À emporter */}
                    <TableCell className="font-mono text-sm">
                      {isEditing ? (
                        <PriceTPEInput
                          value={getDisplayPrice(product.product_id, 'price_take_away', product.price_take_away)}
                          onChange={(cents) => updatePrice(product.product_id, 'price_take_away', cents)}
                          autoConfirmOnBlur={false}
                        />
                      ) : (
                        formatPrice(product.price_take_away)
                      )}
                    </TableCell>
                    {/* Livraison */}
                    <TableCell className="font-mono text-sm">
                      {isEditing ? (
                        <PriceTPEInput
                          value={getDisplayPrice(product.product_id, 'price_delivery', product.price_delivery)}
                          onChange={(cents) => updatePrice(product.product_id, 'price_delivery', cents)}
                          autoConfirmOnBlur={false}
                        />
                      ) : (
                        formatPrice(product.price_delivery)
                      )}
                    </TableCell>
                    {/* Uber Eats */}
                    <TableCell className="font-mono text-sm">
                      {uberPrice !== undefined ? (
                        formatPrice(uberPrice)
                      ) : (
                        <span className="text-muted-foreground text-xs">Non activé</span>
                      )}
                    </TableCell>
                    {/* Deliveroo */}
                    <TableCell className="font-mono text-sm">
                      {deliverooPrice !== undefined ? (
                        formatPrice(deliverooPrice)
                      ) : (
                        <span className="text-muted-foreground text-xs">Non activé</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROFITABILITY TAB
// ════════════════════════════════════════════════════════════════════════════

// Uber Eats commission rate — TODO: pull from user/establishment settings
const UBER_COMMISSION = 0.30;

type ProfitSortKey = 'name' | 'price' | 'cost' | 'margin' | 'margin_rate' | 'uber_rate';

interface ProfitRow {
  product: EnrichedProduct;
  price: number;        // cents
  cost: number;         // cents
  margin: number;       // cents (price - cost)
  marginRate: number;   // 0-100
  uberPrice: number;    // cents (override or price)
  uberNetRevenue: number; // cents after commission
  uberMarginRate: number; // 0-100
  hasData: boolean;
}

function buildProfitRow(p: EnrichedProduct): ProfitRow {
  const price = p.price ?? 0;
  const cost = p.cost_price ?? 0;
  const hasData = price > 0 && p.cost_price !== undefined;
  const margin = price - cost;
  const marginRate = price > 0 ? (margin / price) * 100 : 0;
  const uberEnabled = p.integrations?.uber_eats?.enabled;
  const uberPrice = uberEnabled && p.integrations?.uber_eats?.price_override
    ? p.integrations.uber_eats.price_override
    : price;
  const uberNetRevenue = uberPrice * (1 - UBER_COMMISSION);
  const uberMarginRate = uberNetRevenue > 0 ? ((uberNetRevenue - cost) / uberNetRevenue) * 100 : 0;
  return { product: p, price, cost, margin, marginRate, uberPrice, uberNetRevenue, uberMarginRate, hasData };
}

/** Tailwind classes for margin/rate colouring */
function rateColor(rate: number): string {
  if (rate >= 50) return 'text-green-600 dark:text-green-400';
  if (rate >= 20) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

/** Same scale for Uber (30pp lower threshold because commission eats into margin) */
function uberRateColor(rate: number): string {
  if (rate >= 30) return 'text-green-600 dark:text-green-400';
  if (rate >= 10) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function marginColor(marginCents: number): string {
  if (marginCents > 0) return 'text-green-600 dark:text-green-400';
  if (marginCents === 0) return 'text-amber-500';
  return 'text-red-500 dark:text-red-400';
}

function fmt(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function fmtPct(v: number): string {
  return v.toFixed(1) + ' %';
}

// ── KPI cards ──

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  valueClass?: string;
}

function KpiCard({ label, value, sub, icon, valueClass }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-muted flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-xl font-bold leading-tight ${valueClass ?? 'text-foreground'}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sort icon (reuse generic) ──

function ProfitSortIcon({ col, sortKey, sortDir }: { col: ProfitSortKey; sortKey: ProfitSortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

const PROFIT_COLS: { key: ProfitSortKey; label: string }[] = [
  { key: 'name', label: 'Produit' },
  { key: 'price', label: 'Prix de vente' },
  { key: 'cost', label: 'Coût matières' },
  { key: 'margin', label: 'Marge (€)' },
  { key: 'margin_rate', label: 'Taux de marge' },
  { key: 'uber_rate', label: `Taux après Uber (${(UBER_COMMISSION * 100).toFixed(0)}%)` },
];

function getProfitValue(row: ProfitRow, key: ProfitSortKey): number | string {
  switch (key) {
    case 'name': return row.product.name.toLowerCase();
    case 'price': return row.price;
    case 'cost': return row.cost;
    case 'margin': return row.margin;
    case 'margin_rate': return row.marginRate;
    case 'uber_rate': return row.uberMarginRate;
  }
}

function ProfitabilityTable({ products }: { products: EnrichedProduct[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<ProfitSortKey>('margin_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: ProfitSortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Only simple products with a price
  const eligibleProducts = useMemo(
    () => products.filter(p => !p.is_product_group && !p.is_group && (p.price ?? 0) > 0),
    [products]
  );

  const rows: ProfitRow[] = useMemo(
    () => eligibleProducts.map(buildProfitRow),
    [eligibleProducts]
  );

  const rowsWithData = useMemo(() => rows.filter(r => r.hasData), [rows]);

  // KPIs — computed on rows that have cost data
  const kpis = useMemo(() => {
    if (rowsWithData.length === 0) return null;
    const avgMargin = rowsWithData.reduce((s, r) => s + r.margin, 0) / rowsWithData.length;
    const avgCost = rowsWithData.reduce((s, r) => s + r.cost, 0) / rowsWithData.length;
    const best = rowsWithData.reduce((b, r) => r.marginRate > b.marginRate ? r : b);
    const worst = rowsWithData.reduce((w, r) => r.marginRate < w.marginRate ? r : w);
    return { avgMargin, avgCost, best, worst };
  }, [rowsWithData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q ? rows.filter(r => r.product.name.toLowerCase().includes(q)) : rows;
    return [...result].sort((a, b) => {
      const va = getProfitValue(a, sortKey);
      const vb = getProfitValue(b, sortKey);
      if (typeof va === 'string' && typeof vb === 'string')
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [rows, search, sortKey, sortDir]);

  return (
    <div className="space-y-5">
      {/* KPI row */}
      {kpis && (
        <div className="flex flex-wrap gap-3">
          <KpiCard
            label="Marge moyenne"
            value={fmt(Math.round(kpis.avgMargin))}
            sub={`sur ${rowsWithData.length} produit${rowsWithData.length !== 1 ? 's' : ''}`}
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          />
          <KpiCard
            label="Meilleur taux"
            value={fmtPct(kpis.best.marginRate)}
            sub={kpis.best.product.name}
            icon={<BadgePercent className="w-5 h-5 text-green-500" />}
            valueClass="text-green-600 dark:text-green-400"
          />
          <KpiCard
            label="Pire taux"
            value={fmtPct(kpis.worst.marginRate)}
            sub={kpis.worst.product.name}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            valueClass="text-red-500 dark:text-red-400"
          />
          <KpiCard
            label="Coût moyen"
            value={fmt(Math.round(kpis.avgCost))}
            sub="coût matières / produit"
            icon={<ShoppingCart className="w-5 h-5 text-muted-foreground" />}
          />
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap self-center">
          {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {PROFIT_COLS.map(col => (
                <TableHead
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap hover:bg-muted/60 transition-colors"
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <ProfitSortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(row => (
                <TableRow key={row.product.product_id} className="hover:bg-muted/20 transition-colors">
                  {/* Produit */}
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      {row.product.image_url ? (
                        <img
                          src={row.product.image_url}
                          alt={row.product.name}
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: row.product.bg_color || '#e5e7eb' }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.product.name}</p>
                        {row.product.categoryName && (
                          <p className="text-xs text-muted-foreground truncate">{row.product.categoryName}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Prix de vente */}
                  <TableCell className="font-mono text-sm">
                    {row.price > 0 ? fmt(row.price) : '—'}
                  </TableCell>

                  {/* Coût matières */}
                  <TableCell className="font-mono text-sm">
                    {row.hasData ? fmt(row.cost) : (
                      <span className="text-muted-foreground text-xs">Non renseigné</span>
                    )}
                  </TableCell>

                  {/* Marge € */}
                  <TableCell>
                    {row.hasData ? (
                      <span className={`font-mono text-sm font-semibold ${marginColor(row.margin)}`}>
                        {fmt(row.margin)}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>

                  {/* Taux de marge */}
                  <TableCell>
                    {row.hasData ? (
                      <span className={`font-mono text-sm font-semibold ${rateColor(row.marginRate)}`}>
                        {fmtPct(row.marginRate)}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>

                  {/* Taux après Uber */}
                  <TableCell>
                    {row.hasData ? (
                      <span className={`font-mono text-sm font-semibold ${uberRateColor(row.uberMarginRate)}`}>
                        {fmtPct(row.uberMarginRate)}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        * Le taux après Uber Eats est calculé après déduction de la commission de {(UBER_COMMISSION * 100).toFixed(0)} % sur le prix de vente Uber Eats.
      </p>
    </div>
  );
}

// ─── skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton({ colCount = 7 }: { colCount?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-52" />
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/40 p-3 flex gap-4">
          {Array.from({ length: colCount }).map((_, i) => (
            <Skeleton key={i} className="h-5 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-t border-border">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            {Array.from({ length: colCount - 1 }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PriceGrid() {
  const { menuData, loading } = useMenuData();
  const [activeTab, setActiveTab] = useState('products');

  const categories: Category[] = useMemo(
    () => menuData?.products_types ?? [],
    [menuData]
  );

  const enrichedProducts: EnrichedProduct[] = useMemo(() => {
    return categories.flatMap(cat =>
      (cat.products ?? []).map(p => ({
        ...p,
        category_id: p.category_id ?? cat.category_id,
        categoryName: cat.category || cat.category_name || '',
      }))
    );
  }, [categories]);

  const tabs = [
    { id: 'products', label: 'Prix produits', icon: Tag },
    { id: 'profitability', label: 'Rentabilité', icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grille de prix</h1>
            <p className="text-muted-foreground mt-1">
              Consultez et comparez les prix de vos produits par canal de vente.
            </p>
          </div>
        }
      >
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={(tabId) => {
            if (tabId === 'products') {
              return loading ? (
                <TableSkeleton />
              ) : (
                <ProductPriceTable products={enrichedProducts} categories={categories} />
              );
            }
            if (tabId === 'profitability') {
              return loading ? (
                <TableSkeleton colCount={6} />
              ) : (
                <ProfitabilityTable products={enrichedProducts} />
              );
            }
            return null;
          }}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
