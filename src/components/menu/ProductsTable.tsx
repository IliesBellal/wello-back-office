import { memo } from 'react';
import { Product, ProductStatus, PRODUCT_STATUS_HINTS, Tag, Allergen } from '@/types/menu';
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_ORDER as STATUS_ORDER, getProductStatusValue } from './productFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Store, ShoppingBag, Truck, Check, Loader2 } from 'lucide-react';

type SortKey = 'name' | 'category' | 'tags' | 'status' | 'available_in' | 'available_take_away' | 'available_delivery';
type SortDir = 'asc' | 'desc';

interface ProductsTableProps {
  products: Product[];
  categories: Record<string, string>;
  tags?: Tag[];
  allergens?: Allergen[];
  onProductClick: (product: Product) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (key: SortKey) => void;
  /** Changement de statut via la pastille cliquable de la colonne Statut. */
  onStatusChange?: (productId: string, status: ProductStatus) => void;
  /** Produit dont la mise à jour de statut est en cours (pastille désactivée + spinner). */
  updatingProductId?: string | null;
  expandedGroups?: Record<string, boolean>;
  onToggleGroup?: (productId: string) => void;
  /**
   * Sélection pour l'édition de groupe. Absente, la colonne de cases n'est pas
   * rendue du tout — le tableau reste utilisable en lecture seule.
   * Seuls les produits racines sont sélectionnables : les sous-produits suivent
   * leur groupe côté API (statut, suppression, catégorie).
   */
  selectedIds?: Set<string>;
  onToggleSelect?: (productId: string) => void;
  onToggleSelectAll?: () => void;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
};

// Les 4 statuts de vente canoniques (cf. ProductStatus) et leur rendu dans la
// pastille + le menu déroulant qu'elle ouvre.
const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  available: { label: PRODUCT_STATUS_LABELS.available, color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  out_of_stock: { label: PRODUCT_STATUS_LABELS.out_of_stock, color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  not_available: { label: PRODUCT_STATUS_LABELS.not_available, color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  removed_from_menu: { label: PRODUCT_STATUS_LABELS.removed_from_menu, color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
};

const getTagLabel = (tag: string | Tag, tags?: Tag[]) => {
  // If tag is already a Tag object with name, return name
  if (typeof tag === 'object' && tag !== null && 'name' in tag) {
    return tag.name;
  }
  // If tag is a string ID, look it up in tags array
  if (typeof tag === 'string') {
    return tags?.find(t => t.id === tag)?.name || tag;
  }
  return 'Unknown tag';
};

const getAllergenLabel = (allergen: string | Allergen, allergens?: Allergen[]) => {
  // If allergen is already an Allergen object with name, return name
  if (typeof allergen === 'object' && allergen !== null && 'name' in allergen) {
    return allergen.name;
  }
  // If allergen is a string ID, look it up in allergens array
  if (typeof allergen === 'string') {
    return allergens?.find(a => a.allergen_id === allergen)?.name || allergen;
  }
  return 'Unknown allergen';
};

interface ProductRowProps {
  product: Product;
  isSubProduct: boolean;
  categoryName: string;
  tags?: Tag[];
  allergens?: Allergen[];
  selectable: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isUpdatingStatus: boolean;
  onProductClick: (product: Product) => void;
  onToggleSelect?: (productId: string) => void;
  onToggleGroup?: (productId: string) => void;
  onStatusChange?: (productId: string, status: ProductStatus) => void;
}

// Une ligne du tableau. Mémoïsée : un changement de filtre, de tri ou de
// sélection ne re-rend que les lignes dont les props changent, au lieu de tout
// le catalogue (chaque ligne porte un menu déroulant Radix, coûteux à monter).
const ProductRow = memo(({
  product,
  isSubProduct,
  categoryName,
  tags,
  allergens,
  selectable,
  isSelected,
  isExpanded,
  isUpdatingStatus,
  onProductClick,
  onToggleSelect,
  onToggleGroup,
  onStatusChange,
}: ProductRowProps) => {
  const statusValue = getProductStatusValue(product);
  const status = STATUS_CONFIG[statusValue];
  const productTags = product.tags || [];
  const productAllergens = product.allergens || [];

  return (
    // transition-none : TableRow anime sa couleur de survol par défaut. Au
    // défilement, chaque ligne qui passe sous le curseur lançait une animation ;
    // le changement de fond reste, mais instantané.
    <TableRow
      className={`${isSubProduct ? 'bg-muted/30 border-l-2 border-l-muted-foreground/20' : ''} ${
        !isSubProduct && isSelected ? 'bg-primary/5' : ''
      } hover:bg-muted/50 transition-none`}
    >
      {/* Sélection pour l'édition de groupe — pas de case sur un
          sous-produit : il suit son groupe côté API. */}
      {selectable && (
        <TableCell className="w-10">
          {!isSubProduct && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(product.product_id)}
              aria-label={`Sélectionner ${product.name}`}
            />
          )}
        </TableCell>
      )}

      {/* Chevron (dans la première colonne Image) */}
      <TableCell className="w-12">
        {product.is_product_group ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleGroup?.(product.product_id);
            }}
            className="p-1 hover:bg-muted rounded transition"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          product.image_url ? (
            // L'API conserve les photos telles qu'envoyées (souvent plusieurs
            // Mo) : sans chargement différé, tout le catalogue se téléchargeait
            // et se décodait d'un coup, et le décodage bloquait le défilement.
            // Taille fixée pour que la ligne ne bouge pas à l'arrivée de l'image.
            <img
              src={product.image_url}
              alt={product.name}
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded"
              style={{ backgroundColor: product.bg_color || '#e5e7eb' }}
            />
          )
        )}
      </TableCell>

      {/* Nom */}
      <TableCell
        className={`font-medium cursor-pointer hover:underline ${isSubProduct ? 'pl-8' : ''}`}
        onClick={() => onProductClick(product)}
      >
        <div className="flex items-center gap-2">
          <span>{product.name}</span>
          {product.is_product_group && (
            <Badge variant="secondary" className="text-xs">
              Groupe
            </Badge>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
      </TableCell>

      {/* Catégorie caisse */}
      <TableCell
        onClick={() => onProductClick(product)}
        className="cursor-pointer"
      >
        {categoryName !== '—' ? (
          <Badge variant="secondary">{categoryName}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Tags */}
      <TableCell
        onClick={() => onProductClick(product)}
        className="cursor-pointer"
      >
        <div className="flex flex-wrap gap-1">
          {productTags.length > 0 ? (
            productTags.slice(0, 2).map((tag, idx) => {
              const tagKey = typeof tag === 'string' ? tag : (tag as Tag)?.id || `tag-${idx}`;
              return (
                <Badge key={tagKey} variant="outline" className="text-xs">
                  {getTagLabel(tag, tags)}
                </Badge>
              );
            })
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
          {productTags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{productTags.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Allergènes */}
      <TableCell
        onClick={() => onProductClick(product)}
        className="cursor-pointer"
      >
        <div className="flex flex-wrap gap-1">
          {productAllergens.length > 0 ? (
            productAllergens.slice(0, 2).map((allergen, idx) => {
              const allergenKey = typeof allergen === 'string' ? allergen : (allergen as Allergen)?.allergen_id || `allergen-${idx}`;
              return (
                <Badge
                  key={allergenKey}
                  variant="destructive"
                  className="text-xs opacity-80"
                >
                  {getAllergenLabel(allergen, allergens)}
                </Badge>
              );
            })
          ) : (
            <span className="text-muted-foreground text-sm">Aucun</span>
          )}
          {productAllergens.length > 2 && (
            <Badge variant="destructive" className="text-xs opacity-80">
              +{productAllergens.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Disponible sur place */}
      <TableCell className="text-center">
        {product.available_in && <Check className="w-4 h-4 text-green-600 mx-auto" />}
      </TableCell>

      {/* Disponible à emporter */}
      <TableCell className="text-center">
        {product.available_take_away && <Check className="w-4 h-4 text-green-600 mx-auto" />}
      </TableCell>

      {/* Disponible en livraison */}
      <TableCell className="text-center">
        {product.available_delivery && <Check className="w-4 h-4 text-green-600 mx-auto" />}
      </TableCell>

      {/* Statut — pastille cliquable ouvrant le choix des 4 statuts de
          vente. onClick doit être stoppé ici : sans ça le clic remonte à
          la ligne et ouvre la fiche produit en même temps que le menu. */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!onStatusChange || isUpdatingStatus}>
            <button
              type="button"
              disabled={!onStatusChange || isUpdatingStatus}
              className="inline-flex disabled:cursor-default"
            >
              <Badge
                className={`text-xs gap-1.5 ${status.color} ${onStatusChange ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                variant="outline"
              >
                {isUpdatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
                {status.label}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {STATUS_ORDER.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => onStatusChange?.(product.product_id, option)}
                className="flex-col items-stretch gap-0.5 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[option].dot}`} />
                  <span className="flex-1">{STATUS_CONFIG[option].label}</span>
                  {option === statusValue && <Check className="w-3.5 h-3.5 shrink-0" />}
                </span>
                <span className="pl-4 text-xs text-muted-foreground">
                  {PRODUCT_STATUS_HINTS[option]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
ProductRow.displayName = 'ProductRow';

// Les sous-produits sont renormalisés (product_id) à chaque rendu du tableau :
// on garde le même objet par sous-produit pour que leur ligne mémoïsée reste valide.
const normalizedSubProducts = new WeakMap<object, Product>();
const normalizeSubProduct = (subProduct: NonNullable<Product['sub_products']>[number]): Product => {
  let normalized = normalizedSubProducts.get(subProduct);
  if (!normalized) {
    // L'API renvoie product_id ; id n'existe que dans l'ancien format
    normalized = { ...subProduct, product_id: subProduct.product_id || subProduct.id || '' } as Product;
    normalizedSubProducts.set(subProduct, normalized);
  }
  return normalized;
};

export const ProductsTable = ({
  products,
  categories,
  tags,
  allergens,
  onProductClick,
  sortKey = 'name',
  sortDir = 'asc',
  onSort,
  onStatusChange,
  updatingProductId = null,
  expandedGroups = {},
  onToggleGroup,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ProductsTableProps) => {
  const selectable = !!selectedIds && !!onToggleSelect;
  const selectedCount = products.reduce(
    (count, product) => count + (selectedIds?.has(product.product_id) ? 1 : 0),
    0
  );
  // Tri-état sur l'en-tête : coché si toutes les lignes visibles le sont,
  // indéterminé dès qu'une partie seulement l'est.
  const headerChecked: boolean | 'indeterminate' =
    selectedCount === 0 ? false : selectedCount === products.length ? true : 'indeterminate';

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun produit trouvé
      </div>
    );
  }

  // Un sous-produit est un produit à part entière : il passe par le même rendu
  // (image, catégorie, tags, allergènes, disponibilités, statut), seule sa
  // place change — imbriqué sous son groupe déplié, sans case de sélection.
  const renderTableRows = (productList: Product[], isSubProduct = false): JSX.Element[] => {

    return productList.flatMap((product) => {
      const categoryName = categories[product.category_id || ''] || product.category || '—';
      const isExpanded = expandedGroups[product.product_id];

      const rows: JSX.Element[] = [];

      const mainRowKey = isSubProduct ? `sub-${product.product_id}` : product.product_id;
      rows.push(
        <ProductRow
          key={mainRowKey}
          product={product}
          isSubProduct={isSubProduct}
          categoryName={categoryName}
          tags={tags}
          allergens={allergens}
          selectable={selectable}
          isSelected={!isSubProduct && !!selectedIds?.has(product.product_id)}
          isExpanded={!!isExpanded}
          isUpdatingStatus={updatingProductId === product.product_id}
          onProductClick={onProductClick}
          onToggleSelect={onToggleSelect}
          onToggleGroup={onToggleGroup}
          onStatusChange={onStatusChange}
        />
      );

      // Lignes des sous-produits d'un groupe déplié
      // (ces lignes supplémentaires sont comptées par countProductRows — cf. productRows.ts)
      if (product.is_product_group && isExpanded && product.sub_products && product.sub_products.length > 0) {
        const subProducts = product.sub_products.map(normalizeSubProduct);
        rows.push(...renderTableRows(subProducts, true));
      }

      return rows;
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={() => onToggleSelectAll?.()}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
            )}
            <TableHead className="w-12"></TableHead>
            <TableHead
              onClick={() => onSort?.('name')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Nom
                {onSort && <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('category')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Catégorie caisse
                {onSort && <SortIcon col="category" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('tags')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Tags
                {onSort && <SortIcon col="tags" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead>Allergènes</TableHead>
            <TableHead
              onClick={() => onSort?.('available_in')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
              title="Disponible sur place"
            >
              <span className="inline-flex items-center">
                <Store className="w-4 h-4" />
                {onSort && <SortIcon col="available_in" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('available_take_away')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
              title="Disponible à emporter"
            >
              <span className="inline-flex items-center">
                <ShoppingBag className="w-4 h-4" />
                {onSort && <SortIcon col="available_take_away" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('available_delivery')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
              title="Disponible en livraison"
            >
              <span className="inline-flex items-center">
                <Truck className="w-4 h-4" />
                {onSort && <SortIcon col="available_delivery" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('status')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Statut
                {onSort && <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderTableRows(products)}
        </TableBody>
      </Table>
    </div>
  );
};
