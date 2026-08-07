import { CheckCircle2 } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ImportCollisionResolution, ImportPreviewProduct } from '@/types/import';

interface ImportNameCollisionsProps {
  products: ImportPreviewProduct[];
  resolutions: Record<string, ImportCollisionResolution>;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onChange: (productExternalId: string, resolution: ImportCollisionResolution) => void;
}

/**
 * Produits dont le nom est déjà porté par un produit du menu.
 *
 * Le choix est explicite plutôt que deviné : la création unitaire demande une
 * confirmation en renvoyant la requête, mécanique inutilisable sur un lot. Ici
 * chaque cas se tranche une fois, avant d'écrire quoi que ce soit.
 */
export const ImportNameCollisions = ({
  products,
  resolutions,
  blockersByRef,
  disabled,
  onChange,
}: ImportNameCollisionsProps) => {
  if (products.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Aucun nom en double avec votre menu actuel.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[240px]">Produit du fichier</TableHead>
            <TableHead className="min-w-[220px]">Déjà dans votre menu</TableHead>
            <TableHead className="w-64">Que faire</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            if (!product.name_collision) return null;

            const current = resolutions[product.external_id] ?? product.name_collision.resolution;
            const errors = blockersByRef.get(product.external_id);

            return (
              <TableRow key={product.external_id} className={errors ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">
                  {product.name}
                  {errors?.map((message, index) => (
                    <p key={index} className="mt-0.5 text-xs text-destructive">
                      {message}
                    </p>
                  ))}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {product.name_collision.existing_name}
                </TableCell>

                <TableCell>
                  <ToggleGroup
                    type="single"
                    value={current}
                    onValueChange={(value) =>
                      value && onChange(product.external_id, value as ImportCollisionResolution)
                    }
                    disabled={disabled}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="skip" className="text-xs" aria-label={`Ignorer ${product.name}`}>
                      Ne pas importer
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="import_anyway"
                      className="text-xs"
                      aria-label={`Importer ${product.name} malgré le doublon`}
                    >
                      Importer quand même
                    </ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
