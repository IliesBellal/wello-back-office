import { Component, UnitOfMeasure } from '@/types/menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortKey = 'name' | 'category' | 'price' | 'unit';
type SortDir = 'asc' | 'desc';

interface IngredientsTableProps {
  ingredients: Component[];
  categories: Record<string, string>;
  units: UnitOfMeasure[];
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (key: SortKey) => void;
  onDelete?: (component: Component) => void;
}

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
};

const formatPrice = (cents: number | undefined): string => {
  if (cents === undefined || cents === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

const getUnitLabel = (unitId: string | number | undefined, units: UnitOfMeasure[]): string => {
  if (!unitId) return '—';
  return units.find(u => u.id === unitId || u.id.toString() === unitId.toString())?.name || unitId.toString();
};

export const IngredientsTable = ({
  ingredients,
  categories,
  units,
  sortKey = 'name',
  sortDir = 'asc',
  onSort,
  onDelete,
}: IngredientsTableProps) => {
  if (ingredients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun ingrédient trouvé
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
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
                Catégorie
                {onSort && <SortIcon col="category" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('price')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Prix supplément
                {onSort && <SortIcon col="price" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead
              onClick={() => onSort?.('unit')}
              className={onSort ? 'cursor-pointer select-none hover:bg-muted/60 transition-colors' : ''}
            >
              <span className="inline-flex items-center">
                Unité de mesure
                {onSort && <SortIcon col="unit" sortKey={sortKey} sortDir={sortDir} />}
              </span>
            </TableHead>
            <TableHead>Prix d'achat / Unité</TableHead>
            {onDelete && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ingredient) => {
            const categoryName = ingredient.category_id 
              ? categories[ingredient.category_id] || ingredient.category || '—'
              : ingredient.category || '—';
            const unitLabel = getUnitLabel(ingredient.unit_of_measure_id || ingredient.unit_id, units);

            return (
              <TableRow
                key={ingredient.component_id}
                className="hover:bg-muted/20 transition-colors"
              >
                <TableCell className="font-medium">{ingredient.name}</TableCell>
                <TableCell>
                  {categoryName !== '—' ? (
                    <Badge variant="secondary">{categoryName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{formatPrice(ingredient.price)}</TableCell>
                <TableCell>{unitLabel}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {ingredient.cost ? formatPrice(ingredient.cost) : '—'}
                </TableCell>
                {onDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(ingredient)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
