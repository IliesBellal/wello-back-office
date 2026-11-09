import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TabSystem, PageContainer } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Tag, TrendingUp, TrendingDown, ShoppingCart, BadgePercent, Edit2, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import { usePriceGridData, PriceGridPriceUpdate } from '@/hooks/usePriceGridData';
import { Product, Category } from '@/types/menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { useMarketplaceCommissionRates, MarketplaceCommissionRate } from '@/hooks/useMarketplaceCommissionRates';
import { usePermissions } from '@/hooks/usePermissions';
import {
  MarketplacePlatform,
  MarketplacePrice,
  effectiveMarketplacePrice,
  inheritedMarketplacePrice,
  isPublishedOn,
  marketplaceMargin,
  marketplacePriceOverride,
} from '@/utils/marketplacePricing';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPrice = (cents: number | undefined): string => {
  if (cents === undefined || cents === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

const PLATFORM_LABEL: Record<MarketplacePlatform, string> = {
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
};

const PRICE_SOURCE_HINT: Record<MarketplacePrice['source'], string> = {
  override: 'Prix spécifique à la plateforme',
  delivery: 'Aucun prix spécifique : prix livraison appliqué',
  on_site: 'Aucun prix spécifique ni prix livraison : prix sur place appliqué',
};

type SortKey = 'name' | 'category' | 'price' | 'price_take_away' | 'price_delivery' | 'uber_eats' | 'deliveroo';
type SortDir = 'asc' | 'desc';
type PriceField = 'price' | 'price_take_away' | 'price_delivery' | 'price_uber_eats' | 'price_deliveroo';

const PLATFORM_PRICE_FIELD: Record<MarketplacePlatform, PriceField> = {
  uber_eats: 'price_uber_eats',
  deliveroo: 'price_deliveroo',
};

type EnrichedProduct = Product & { categoryName: string };

const isGroupProduct = (product: Product): boolean => Boolean(product.is_product_group || product.is_group);

/** Un groupe n'est jamais publié lui-même : ses sous-produits le sont à sa place. */
const groupSubProducts = (product: Product): Product[] =>
  isGroupProduct(product) ? ((product.sub_products ?? []) as Product[]).filter((s) => !!s.product_id) : [];

function getProductValue(product: EnrichedProduct, key: SortKey): string | number {
  switch (key) {
    case 'name': return (product.name || '').toLowerCase();
    case 'category': return (product.categoryName || '').toLowerCase();
    case 'price': return product.price ?? -1;
    case 'price_take_away': return product.price_take_away ?? -1;
    case 'price_delivery': return product.price_delivery ?? -1;
    case 'uber_eats':
    case 'deliveroo':
      return isPublishedOn(product, key) ? effectiveMarketplacePrice(product, key).cents : -1;
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

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Produit' },
  { key: 'category', label: 'Catégorie' },
  { key: 'price', label: 'Sur place' },
  { key: 'price_take_away', label: 'À emporter' },
  { key: 'price_delivery', label: 'Livraison' },
  { key: 'uber_eats', label: 'Uber Eats' },
  { key: 'deliveroo', label: 'Deliveroo' },
];

interface ProductPriceTableProps {
  products: EnrichedProduct[];
  categories: Category[];
  bulkUpdatePrices: (updates: PriceGridPriceUpdate[]) => Promise<void>;
  setMarketplacePublication: (productIds: string[], platform: MarketplacePlatform, enabled: boolean) => Promise<void>;
}

function ProductPriceTable({ products, categories, bulkUpdatePrices, setMarketplacePublication }: ProductPriceTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<Record<PriceField, number>>>>({});
  const [priceDisplayValues, setPriceDisplayValues] = useState<Record<string, Partial<Record<PriceField, string>>>>({});
  // Switches en cours d'enregistrement, clé `${product_id}:${plateforme}`.
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { statuses } = useIntegrationStatus();
  const { canManageMenu } = usePermissions();

  const activePlatforms = useMemo(() => {
    const list: MarketplacePlatform[] = [];
    if (statuses.uberEats.active) list.push('uber_eats');
    if (statuses.deliveroo.active) list.push('deliveroo');
    return list;
  }, [statuses]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((col) => {
      if (col.key === 'uber_eats') return statuses.uberEats.active;
      if (col.key === 'deliveroo') return statuses.deliveroo.active;
      return true;
    }),
    [statuses]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Mise à jour d'un prix lors de l'édition
  const updatePrice = useCallback((productId: string, priceField: PriceField, cents: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [priceField]: cents,
      },
    }));
  }, []);

  // Mise à jour de la valeur d'affichage d'un prix (pour éviter la perte de focus)
  const updatePriceDisplay = useCallback((productId: string, priceField: PriceField, displayValue: string) => {
    setPriceDisplayValues(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [priceField]: displayValue,
      },
    }));
  }, []);

  // Récupère la valeur d'affichage d'un prix
  const getDisplayPriceValue = (productId: string, field: PriceField, originalPrice: number | undefined) => {
    const displayValue = priceDisplayValues[productId]?.[field];
    if (displayValue !== undefined) return displayValue;
    return priceToDisplayValue(originalPrice);
  };

  // Annule l'édition
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedPrices({});
    setPriceDisplayValues({});
  }, []);

  // Valide et enregistre tous les prix modifiés
  const saveChanges = useCallback(async () => {
    const productsToUpdate: PriceGridPriceUpdate[] = Object.entries(editedPrices)
      .filter(([, fields]) => Object.keys(fields).length > 0)
      .map(([productId, fields]) => ({ product_id: productId, ...fields }));

    if (productsToUpdate.length === 0) {
      toast({
        title: 'Aucun changement',
        description: 'Aucun prix n\'a été modifié',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await bulkUpdatePrices(productsToUpdate);

      toast({
        title: 'Succès',
        description: `${productsToUpdate.length} produit(s) mis à jour avec succès`,
      });

      setIsEditing(false);
      setEditedPrices({});
      setPriceDisplayValues({});
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
  }, [editedPrices, bulkUpdatePrices, toast]);

  const togglePublication = useCallback(async (product: Product, platform: MarketplacePlatform, enabled: boolean) => {
    const subs = groupSubProducts(product);
    // Groupe : on (dé)coche ses sous-produits — ce sont eux qui sont publiés —
    // et le groupe lui-même pour garder sa case cohérente.
    const ids = [product.product_id, ...subs.map((s) => s.product_id)];
    const key = `${product.product_id}:${platform}`;
    setPendingToggles((prev) => new Set(prev).add(key));
    try {
      await setMarketplacePublication(ids, platform, enabled);
    } catch {
      // Toast d'erreur et annulation déjà gérés par le hook.
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [setMarketplacePublication]);

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

  const editedCount = Object.values(editedPrices).filter((fields) => Object.keys(fields).length > 0).length;

  const renderPriceInput = (product: EnrichedProduct, field: PriceField, value: number | undefined, placeholder = '0,00') => (
    <Input
      type="text"
      inputMode="decimal"
      value={getDisplayPriceValue(product.product_id, field, value)}
      onChange={(e) => {
        updatePriceDisplay(product.product_id, field, e.target.value);
        updatePrice(product.product_id, field, parsePriceInput(e.target.value));
      }}
      onBlur={(e) => {
        const cents = parsePriceInput(e.target.value);
        // Sur une plateforme, un champ vidé = pas de prix spécifique : on
        // laisse le champ vide plutôt que d'afficher « 0,00 ».
        const isPlatformField = field === 'price_uber_eats' || field === 'price_deliveroo';
        updatePriceDisplay(product.product_id, field, isPlatformField && cents === 0 ? '' : priceToDisplayValue(cents));
      }}
      placeholder={placeholder}
      className="h-8 text-xs font-mono min-w-[5.5rem]"
    />
  );

  const renderMarketplaceCell = (product: EnrichedProduct, platform: MarketplacePlatform) => {
    const label = PLATFORM_LABEL[platform];
    const pending = pendingToggles.has(`${product.product_id}:${platform}`);
    const subs = groupSubProducts(product);

    // Ligne groupe : la case pilote tous ses sous-produits.
    if (isGroupProduct(product)) {
      if (subs.length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      const publishedCount = subs.filter((s) => isPublishedOn(s, platform)).length;
      const allPublished = publishedCount === subs.length;
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={allPublished}
            disabled={pending || !canManageMenu}
            onCheckedChange={(checked) => togglePublication(product, platform, checked)}
            aria-label={`${allPublished ? 'Retirer' : 'Publier'} les sous-produits de ${product.name} sur ${label}`}
            title={allPublished ? `Retirer tous les sous-produits de ${label}` : `Publier tous les sous-produits sur ${label}`}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {publishedCount}/{subs.length} publié{publishedCount > 1 ? 's' : ''}
          </span>
        </div>
      );
    }

    const published = isPublishedOn(product, platform);
    const effective = effectiveMarketplacePrice(product, platform);
    const priceField = PLATFORM_PRICE_FIELD[platform];

    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={published}
          disabled={pending || !canManageMenu}
          onCheckedChange={(checked) => togglePublication(product, platform, checked)}
          aria-label={`${published ? 'Retirer' : 'Publier'} ${product.name} sur ${label}`}
          title={published ? `Publié sur ${label}` : `Non publié sur ${label}`}
        />
        {isEditing ? (
          renderPriceInput(
            product,
            priceField,
            marketplacePriceOverride(product, platform),
            // Le placeholder montre le prix appliqué si le champ reste vide.
            `auto ${priceToDisplayValue(inheritedMarketplacePrice(product).cents)}`,
          )
        ) : (
          <span
            className={`font-mono text-sm whitespace-nowrap ${
              !published ? 'text-muted-foreground/60 line-through' : effective.source === 'override' ? '' : 'text-muted-foreground'
            }`}
            title={published ? PRICE_SOURCE_HINT[effective.source] : `Non publié sur ${label}`}
          >
            {formatPrice(effective.cents)}
          </span>
        )}
      </div>
    );
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
        {canManageMenu && (
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
                  disabled={isSaving || editedCount === 0}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Enregistrer ({editedCount})
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
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {visibleColumns.map(col => (
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
                <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product, index) => {
                const isGroup = isGroupProduct(product);

                return (
                  <TableRow key={`${product.product_id}-${index}`} className={`hover:bg-muted/20 transition-colors ${isGroup ? 'bg-muted/15 font-semibold' : ''}`}>
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
                      {isEditing ? renderPriceInput(product, 'price', product.price) : formatPrice(product.price)}
                    </TableCell>
                    {/* À emporter */}
                    <TableCell className="font-mono text-sm">
                      {isEditing ? renderPriceInput(product, 'price_take_away', product.price_take_away) : formatPrice(product.price_take_away)}
                    </TableCell>
                    {/* Livraison */}
                    <TableCell className="font-mono text-sm">
                      {isEditing ? renderPriceInput(product, 'price_delivery', product.price_delivery) : formatPrice(product.price_delivery)}
                    </TableCell>
                    {/* Uber Eats / Deliveroo */}
                    {activePlatforms.map((platform) => (
                      <TableCell key={platform}>
                        {renderMarketplaceCell(product, platform)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {activePlatforms.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            * Le switch publie ou retire le produit de la plateforme ; il est pris en compte à la prochaine publication du menu.
            Sur une ligne de groupe, il s'applique à tous ses sous-produits (un groupe n'est jamais publié lui-même).
          </p>
          <p>
            * Prix en gris : aucun prix spécifique, la plateforme reprend le prix livraison (à défaut le prix sur place).
            {isEditing && ' Laissez le champ vide pour ne pas fixer de prix spécifique.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROFITABILITY TAB
// ════════════════════════════════════════════════════════════════════════════

type ProfitSortKey = 'name' | 'price' | 'cost' | 'margin' | 'margin_rate' | 'uber_rate' | 'deliveroo_rate';

interface PlatformProfit {
  published: boolean;
  price: number;        // cents, prix publié sur la plateforme
  netRevenue: number;   // cents, après commission
  margin: number;       // cents, après commission et coût matières
  marginRate: number;   // 0-100, rapporté au prix plateforme
}

interface ProfitRow {
  product: EnrichedProduct;
  price: number;        // cents
  cost: number;         // cents
  margin: number;       // cents (price - cost)
  marginRate: number;   // 0-100
  uberEats: PlatformProfit;
  deliveroo: PlatformProfit;
  hasData: boolean;
}

function buildPlatformProfit(p: EnrichedProduct, platform: MarketplacePlatform, cost: number, commissionRate: number): PlatformProfit {
  const { cents } = effectiveMarketplacePrice(p, platform);
  const { netRevenue, margin, marginRate } = marketplaceMargin(cents, cost, commissionRate);
  return { published: isPublishedOn(p, platform), price: cents, netRevenue, margin, marginRate };
}

function buildProfitRow(p: EnrichedProduct, uberCommissionRate: number, deliverooCommissionRate: number): ProfitRow {
  const price = p.price ?? 0;
  const cost = p.cost_price ?? 0;
  const hasData = price > 0 && p.cost_price !== undefined;
  const margin = price - cost;
  const marginRate = price > 0 ? (margin / price) * 100 : 0;

  return {
    product: p,
    price,
    cost,
    margin,
    marginRate,
    uberEats: buildPlatformProfit(p, 'uber_eats', cost, uberCommissionRate),
    deliveroo: buildPlatformProfit(p, 'deliveroo', cost, deliverooCommissionRate),
    hasData
  };
}

/** Tailwind classes for margin/rate colouring */
function rateColor(rate: number): string {
  if (rate >= 50) return 'text-green-600 dark:text-green-400';
  if (rate >= 20) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

/** Seuils abaissés pour les plateformes : la commission ampute le taux de marge */
function platformRateColor(rate: number): string {
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

function fmtRate(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)} %`;
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
];

// Un produit non publié (ou sans coût) n'a pas de taux plateforme : il passe
// après tous les autres, quel que soit le sens du tri.
const NO_PLATFORM_RATE = Number.NEGATIVE_INFINITY;

function getProfitValue(row: ProfitRow, key: ProfitSortKey): number | string {
  switch (key) {
    case 'name': return row.product.name.toLowerCase();
    case 'price': return row.price;
    case 'cost': return row.cost;
    case 'margin': return row.margin;
    case 'margin_rate': return row.marginRate;
    case 'uber_rate': return row.hasData && row.uberEats.published ? row.uberEats.marginRate : NO_PLATFORM_RATE;
    case 'deliveroo_rate': return row.hasData && row.deliveroo.published ? row.deliveroo.marginRate : NO_PLATFORM_RATE;
  }
}

const compareNumbers = (a: number, b: number, dir: SortDir): number => {
  if (a === b) return 0;
  if (a === NO_PLATFORM_RATE) return 1;
  if (b === NO_PLATFORM_RATE) return -1;
  return dir === 'asc' ? a - b : b - a;
};

const PLATFORM_ROUTE: Record<MarketplacePlatform, string> = {
  uber_eats: '/integrations/uber-eats',
  deliveroo: '/integrations/deliveroo',
};

function CommissionNote({ platform, commission }: { platform: MarketplacePlatform; commission: MarketplaceCommissionRate }) {
  const label = PLATFORM_LABEL[platform];
  if (commission.rate === 0) {
    return (
      <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Aucun taux de commission {label} n'est renseigné : le calcul se fait à 0 %.{' '}
          <Link to={PLATFORM_ROUTE[platform]} className="underline underline-offset-2">Renseigner le taux</Link>
        </span>
      </p>
    );
  }
  return (
    <p>
      * Taux après {label} : (prix {label} × (1 − {fmtRate(commission.rate)}) − coût matières) ÷ prix {label}.
      Le prix {label} est le prix spécifique s'il est renseigné, sinon le prix livraison, à défaut le prix sur place.
      {commission.source === 'session' && ' Taux lu dans votre session (le taux à jour n\'a pas pu être chargé).'}
    </p>
  );
}

function ProfitabilityTable({ products }: { products: EnrichedProduct[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<ProfitSortKey>('margin_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { statuses } = useIntegrationStatus();
  const commissions = useMarketplaceCommissionRates();
  const uberRate = commissions.uberEats.rate;
  const deliverooRate = commissions.deliveroo.rate;

  const visibleProfitCols = useMemo(() => {
    const dynamicCols: { key: ProfitSortKey; label: string }[] = [...PROFIT_COLS];

    if (statuses.uberEats.active) {
      dynamicCols.push({
        key: 'uber_rate',
        label: `Uber Eats (${fmtRate(uberRate)})`,
      });
    }

    if (statuses.deliveroo.active) {
      dynamicCols.push({
        key: 'deliveroo_rate',
        label: `Deliveroo (${fmtRate(deliverooRate)})`,
      });
    }

    return dynamicCols;
  }, [statuses, uberRate, deliverooRate]);

  const handleSort = (key: ProfitSortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Only simple products with a price
  const eligibleProducts = useMemo(
    () => products.filter(p => !isGroupProduct(p) && (p.price ?? 0) > 0),
    [products]
  );

  const rows: ProfitRow[] = useMemo(
    () => eligibleProducts.map((p) => buildProfitRow(p, uberRate, deliverooRate)),
    [eligibleProducts, uberRate, deliverooRate]
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
      return compareNumbers(va as number, vb as number, sortDir);
    });
  }, [rows, search, sortKey, sortDir]);

  const renderPlatformRate = (row: ProfitRow, platform: MarketplacePlatform) => {
    const profit = platform === 'uber_eats' ? row.uberEats : row.deliveroo;
    if (!profit.published) {
      return <span className="text-muted-foreground text-xs">Non publié</span>;
    }
    if (!row.hasData) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
      <div className="leading-tight">
        <span className={`font-mono text-sm font-semibold ${platformRateColor(profit.marginRate)}`}>
          {fmtPct(profit.marginRate)}
        </span>
        <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          marge {fmt(Math.round(profit.margin))} · prix {fmt(profit.price)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI row */}
      {kpis && (
        <div className="flex flex-col md:flex-row flex-wrap gap-3">
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
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {visibleProfitCols.map(col => (
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
                <TableCell colSpan={visibleProfitCols.length} className="text-center py-12 text-muted-foreground">
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
                  {statuses.uberEats.active && (
                    <TableCell>{renderPlatformRate(row, 'uber_eats')}</TableCell>
                  )}

                  {/* Taux après Deliveroo */}
                  {statuses.deliveroo.active && (
                    <TableCell>{renderPlatformRate(row, 'deliveroo')}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        {statuses.uberEats.active && <CommissionNote platform="uber_eats" commission={commissions.uberEats} />}
        {statuses.deliveroo.active && <CommissionNote platform="deliveroo" commission={commissions.deliveroo} />}
      </div>
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
            <Skeleton key={`header-col-${i}`} className="h-5 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`skeleton-row-${i}`} className="flex gap-4 p-3 border-t border-border">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            {Array.from({ length: colCount - 1 }).map((_, j) => (
              <Skeleton key={`skeleton-row-${i}-col-${j}`} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PriceGrid() {
  const { menuData, loading, bulkUpdatePrices, setMarketplacePublication } = usePriceGridData();
  const [activeTab, setActiveTab] = useState('products');
  const { statuses } = useIntegrationStatus();

  const productTableColCount = useMemo(() => {
    let count = 5;
    if (statuses.uberEats.active) count += 1;
    if (statuses.deliveroo.active) count += 1;
    return count;
  }, [statuses]);

  const profitabilityTableColCount = useMemo(() => {
    let count = 5;
    if (statuses.uberEats.active) count += 1;
    if (statuses.deliveroo.active) count += 1;
    return count;
  }, [statuses]);

  const categories: Category[] = useMemo(
    () => menuData?.products_types ?? [],
    [menuData]
  );

  const enrichedProducts: EnrichedProduct[] = useMemo(() => {
    return categories.flatMap(cat => {
      const products: EnrichedProduct[] = [];

      (cat.products ?? []).forEach(p => {
        const enriched = {
          ...p,
          category_id: p.category_id ?? cat.category_id,
          categoryName: cat.category || cat.category_name || '',
        };

        // Add product (group or simple)
        products.push(enriched);

        // If it's a group, also add its sub-products
        if (p.is_product_group && p.sub_products && p.sub_products.length > 0) {
          p.sub_products.forEach(subProduct => {
            products.push({
              ...subProduct,
              category_id: subProduct.category_id ?? cat.category_id,
              categoryName: cat.category || cat.category_name || '',
            } as EnrichedProduct);
          });
        }
      });

      return products;
    });
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
                <TableSkeleton colCount={productTableColCount} />
              ) : (
                <ProductPriceTable
                  products={enrichedProducts}
                  categories={categories}
                  bulkUpdatePrices={bulkUpdatePrices}
                  setMarketplacePublication={setMarketplacePublication}
                />
              );
            }
            if (tabId === 'profitability') {
              return loading ? (
                <TableSkeleton colCount={profitabilityTableColCount} />
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
