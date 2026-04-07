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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
};

const getProductStatus = (product: Product) => {
  const statuses = [];
  
  if (product.available_in || (product.available !== false && !('available_in' in product))) {
    statuses.push({ label: 'Sur place', color: 'bg-green-100 text-green-800' });
  }
  if (product.available_take_away) {
    statuses.push({ label: 'Emporter', color: 'bg-blue-100 text-blue-800' });
  }
  if (product.available_delivery) {
    statuses.push({ label: 'Livraison', color: 'bg-orange-100 text-orange-800' });
  }
  
  if (statuses.length === 0) {
    statuses.push({ label: 'Indisponible', color: 'bg-red-100 text-red-800' });
  }
  
  return statuses;
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
}: ProductsTableProps) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun produit trouvé
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-12">Image</TableHead>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const statuses = getProductStatus(product);
            const productTags = product.tags || [];
            const productAllergens = product.allergens || [];
            const categoryName = categories[product.category_id || ''] || product.category || '—';

            return (
              <TableRow
                key={product.product_id}
                onClick={() => onProductClick(product)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {/* Image */}
                <TableCell className="w-12">
                  {product.image_url ? (
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
                  )}
                </TableCell>

                {/* Nom */}
                <TableCell className="font-medium">
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
                <TableCell>
                  {categoryName !== '—' ? (
                    <Badge variant="secondary">{categoryName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Tags */}
                <TableCell>
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
                <TableCell>
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
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {statuses.map((status) => (
                      <Badge
                        key={status.label}
                        className={`text-xs ${status.color}`}
                        variant="outline"
                      >
                        {status.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
