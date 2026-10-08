import { CheckCircle2 } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportCategoryOption, ImportCategoryTarget } from '@/lib/importDecisions';
import type { ImportPreviewProduct } from '@/types/import';

import { ImportCategorySelect } from './ImportCategorySelect';

interface ImportMissingCategoriesProps {
  products: ImportPreviewProduct[];
  options: ImportCategoryOption[];
  /**
   * Porte photo : catégories de la caisse proposées, et création d'une
   * nouvelle catégorie possible.
   */
  merchantCategories?: string[];
  allowCreate?: boolean;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onAssign: (productExternalIds: string[], target: ImportCategoryTarget) => void;
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
  merchantCategories,
  allowCreate = false,
  blockersByRef,
  disabled,
  onAssign,
}: ImportMissingCategoriesProps) => {
  if (products.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Tous les produits ont une catégorie.
      </div>
    );
  }

  if (options.length === 0 && !allowCreate) {
    return (
      <p className="text-sm text-destructive">
        Aucune catégorie disponible. Classez au moins un libellé en « Catégorie » dans la section
        précédente.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">
          Affecter la même catégorie aux {products.length} produit(s) sans catégorie
        </p>
        <ImportCategorySelect
          value={null}
          options={options}
          merchantCategories={merchantCategories}
          allowCreate={allowCreate}
          disabled={disabled}
          className="h-9"
          ariaLabel="Catégorie de tous les produits sans catégorie"
          onChange={(target) =>
            onAssign(
              products.map((product) => product.external_id),
              target,
            )
          }
        />
      </div>

      <div className="overflow-auto rounded-lg border bg-card">
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
                    <ImportCategorySelect
                      value={null}
                      options={options}
                      merchantCategories={merchantCategories}
                      allowCreate={allowCreate}
                      disabled={disabled}
                      className="h-9"
                      ariaLabel={`Catégorie de ${product.name}`}
                      onChange={(target) => onAssign([product.external_id], target)}
                    />
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
