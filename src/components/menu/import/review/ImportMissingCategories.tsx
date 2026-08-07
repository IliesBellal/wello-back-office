import { useState } from 'react';
import { CheckCircle2, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportCategoryOption } from '@/lib/importDecisions';
import type { ImportPreviewProduct } from '@/types/import';

interface ImportMissingCategoriesProps {
  products: ImportPreviewProduct[];
  options: ImportCategoryOption[];
  categoryPerProduct: Record<string, string>;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onAssign: (productExternalId: string, categoryExternalId: string) => void;
  onAssignAll: (productExternalIds: string[], categoryExternalId: string) => void;
}

/**
 * Produits qu'aucun libellé ne rattache à une catégorie.
 *
 * L'affectation groupée est en tête et non en option : un export réel arrive
 * avec une poignée de lignes de service (frais de livraison, frais de service)
 * qui n'ont aucun libellé et qu'on ne veut pas trancher une par une. Le choix
 * produit par produit reste disponible juste en dessous.
 */
export const ImportMissingCategories = ({
  products,
  options,
  categoryPerProduct,
  blockersByRef,
  disabled,
  onAssign,
  onAssignAll,
}: ImportMissingCategoriesProps) => {
  const [bulkCategory, setBulkCategory] = useState('');

  if (products.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Tous les produits ont une catégorie.
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-destructive">
        Aucune catégorie disponible. Classez au moins un libellé en « Catégorie » dans la section
        précédente.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium">
            Affecter la même catégorie aux {products.length} produit(s) sans catégorie
          </p>
          <Select value={bulkCategory} onValueChange={setBulkCategory} disabled={disabled}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.externalId} value={option.externalId}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={disabled || !bulkCategory}
          onClick={() =>
            onAssignAll(
              products.map((product) => product.external_id),
              bulkCategory,
            )
          }
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Tout affecter
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[260px]">Produit</TableHead>
              <TableHead className="min-w-[240px]">Catégorie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const errors = blockersByRef.get(product.external_id);

              return (
                <TableRow key={product.external_id} className={errors ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">
                    {product.name}
                    {product.status === 'removed_from_menu' && (
                      <p className="text-xs text-muted-foreground">
                        Sans prix : sera importé mais retiré de la carte.
                      </p>
                    )}
                    {errors?.map((message, index) => (
                      <p key={index} className="mt-0.5 text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </TableCell>

                  <TableCell>
                    <Select
                      value={categoryPerProduct[product.external_id] ?? ''}
                      disabled={disabled}
                      onValueChange={(value) => onAssign(product.external_id, value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.externalId} value={option.externalId}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
