import { Product, Tag, Allergen } from '@/types/menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

type SortKey = 'name' | 'category' | 'tags' | 'status';
type SortDir = 'asc' | 'desc';

interface ProductsTableProps {
  products: Product[];
  categories: Record<string, string>;
  tags: Tag[];
  allergens: Allergen[];
  onProductClick: (product: Product) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (key: SortKey) => void;
  onStatusChange?: (productId: string, status: boolean) => void;
  productStatusMap?: Record<string, boolean>;
  updatingProductId?: string | null;
  expandedGroups?: Record<string, boolean>;
  onToggleGroup?: (productId: string) => void;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
};

const getProductStatus = (product: Product) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'available': { label: 'Disponible', color: 'bg-green-100 text-green-800' },
    'out_of_stock': { label: 'Rupture de stock', color: 'bg-orange-100 text-orange-800' },
    'unavailable': { label: 'Indisponible', color: 'bg-red-100 text-red-800' },
    'removed_from_menu': { label: 'Supprimé du menu', color: 'bg-gray-100 text-gray-800' },
  };

  const statusValue = product.status?.toString() || 'available';
  return statusMap[statusValue] || { label: 'Disponible', color: 'bg-green-100 text-green-800' };
};

const getTagLabel = (tagId: string, tags: Tag[]) => {
  return tags.find(t => t.id === tagId)?.name || tagId;
};

const getAllergenLabel = (allergenId: string, allergens: Allergen[]) => {
  return allergens.find(a => a.allergen_id === allergenId)?.name || allergenId;
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
  productStatusMap = {},
  updatingProductId = null,
  expandedGroups = {},
  onToggleGroup,
}: ProductsTableProps) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun produit trouvé
      </div>
    );
  }

  const renderTableRows = (productList: Product[], isSubProduct = false, parentIndent = 0) => {
    return productList.flatMap((product) => {
      const status = getProductStatus(product);
      const productTags = product.tags || [];
      const productAllergens = product.allergens || [];
      const categoryName = categories[product.category_id || ''] || product.category || '—';
      const isExpanded = expandedGroups[product.product_id];

      const rows: JSX.Element[] = [];

      // Main row
      rows.push(
        <TableRow
          key={product.product_id}
          className={`${isSubProduct ? 'bg-muted/30' : ''} hover:bg-muted/50 transition-colors`}
        >
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
                <img
                  src={product.image_url}
                  alt={product.name}
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
            className="font-medium cursor-pointer hover:underline"
            onClick={() => !product.is_product_group && onProductClick(product)}
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
                productTags.slice(0, 2).map((tagId) => (
                  <Badge key={tagId} variant="outline" className="text-xs">
                    {getTagLabel(tagId, tags)}
                  </Badge>
                ))
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
                productAllergens.slice(0, 2).map((allergenId) => (
                  <Badge
                    key={allergenId}
                    variant="destructive"
                    className="text-xs opacity-80"
                  >
                    {getAllergenLabel(allergenId, allergens)}
                  </Badge>
                ))
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

          {/* Statut */}
          <TableCell
            onClick={() => onProductClick(product)}
            className="cursor-pointer"
          >
            <Badge
              className={`text-xs ${status.color}`}
              variant="outline"
            >
              {status.label}
            </Badge>
          </TableCell>

          {/* Disponible */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={productStatusMap[product.product_id] !== undefined ? productStatusMap[product.product_id] : (product.available ?? true)}
              onCheckedChange={(checked) => onStatusChange?.(product.product_id, checked)}
              disabled={updatingProductId === product.product_id}
            />
          </TableCell>
        </TableRow>
      );

      // Sub-products rows if group is expanded
      if (product.is_product_group && isExpanded && product.sub_products && product.sub_products.length > 0) {
        product.sub_products.forEach((subProduct) => {
          const subProductData: Product = {
            product_id: subProduct.id,
            name: subProduct.name,
            price: subProduct.price,
            is_product_group: false,
            available: true,
            tags: [],
            allergens: [],
          };

          const subStatus = getProductStatus(subProductData);

          rows.push(
            <TableRow
              key={`sub-${subProduct.id}`}
              className="bg-muted/30 border-l-2 border-muted-foreground/20 hover:bg-muted/50 transition-colors"
            >
              {/* Chevron cell - empty for sub-products */}
              <TableCell className="w-12"></TableCell>

              {/* Nom */}
              <TableCell 
                className="font-medium text-sm cursor-pointer hover:underline pl-6"
                onClick={() => onProductClick(subProductData)}
              >
                {subProduct.name}
              </TableCell>

              {/* Catégorie caisse */}
              <TableCell
                onClick={() => onProductClick(subProductData)}
                className="cursor-pointer"
              >
                <span className="text-muted-foreground">—</span>
              </TableCell>

              {/* Tags */}
              <TableCell
                onClick={() => onProductClick(subProductData)}
                className="cursor-pointer"
              >
                <span className="text-muted-foreground text-sm">—</span>
              </TableCell>

              {/* Allergènes */}
              <TableCell
                onClick={() => onProductClick(subProductData)}
                className="cursor-pointer"
              >
                <span className="text-muted-foreground text-sm">Aucun</span>
              </TableCell>

              {/* Statut */}
              <TableCell
                onClick={() => onProductClick(subProductData)}
                className="cursor-pointer"
              >
                <Badge
                  className={`text-xs ${subStatus.color}`}
                  variant="outline"
                >
                  {subStatus.label}
                </Badge>
              </TableCell>

              {/* Disponible */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={productStatusMap[subProduct.id] !== undefined ? productStatusMap[subProduct.id] : true}
                  onCheckedChange={(checked) => onStatusChange?.(subProduct.id, checked)}
                  disabled={updatingProductId === subProduct.id}
                />
              </TableCell>
            </TableRow>
          );
        });
      }

      return rows;
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
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
              onClick={() => onSort?.('status')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Statut
                {onSort && <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead>Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderTableRows(products)}
        </TableBody>
      </Table>
    </div>
  );
};
