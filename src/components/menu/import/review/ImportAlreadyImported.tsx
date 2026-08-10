import { CheckCircle2, RotateCcw, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ImportPreviewProduct, ImportReimportResolution } from '@/types/import';

interface ImportAlreadyImportedProps {
  products: ImportPreviewProduct[];
  resolutions: Record<string, ImportReimportResolution>;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onChange: (productExternalId: string, resolution: ImportReimportResolution) => void;
  onChangeAll: (productExternalIds: string[], resolution: ImportReimportResolution) => void;
}

/**
 * Produits qu'un import précédent du même fichier a déjà créés.
 *
 * Ils sont ignorés par défaut — c'est ce qui rend un import rejouable sans
 * dupliquer le menu. Mais la correspondance survit au produit : le supprimer
 * dans Wello ne l'en retire pas. Sans arbitrage, quelqu'un qui efface son menu
 * pour le réimporter obtenait un commit sans effet, et aucun moyen d'en sortir.
 *
 * Les produits dont le produit Wello a disparu sont listés en premier : ce sont
 * ceux qu'un réimport répare, et l'action groupée est là pour eux.
 */
export const ImportAlreadyImported = ({
  products,
  resolutions,
  blockersByRef,
  disabled,
  onChange,
  onChangeAll,
}: ImportAlreadyImportedProps) => {
  if (products.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Aucun produit de ce fichier n’a encore été importé.
      </div>
    );
  }

  const staleProducts = products.filter((product) => product.mapping_stale);
  const allIds = products.map((product) => product.external_id);
  const recreatedCount = products.filter(
    (product) => (resolutions[product.external_id] ?? 'skip') === 'recreate',
  ).length;

  return (
    <div className="space-y-4">
      {staleProducts.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm">
              <span className="font-medium">
                {staleProducts.length} produit(s) importé(s) puis supprimé(s) de votre menu.
              </span>{' '}
              Ils restent ignorés tant que vous ne demandez pas leur recréation.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() =>
              onChangeAll(
                staleProducts.map((product) => product.external_id),
                'recreate',
              )
            }
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Tout recréer
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {products.length} produit(s) déjà importé(s)
          {recreatedCount > 0 && ` — ${recreatedCount} à recréer`}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onChangeAll(allIds, 'recreate')}
        >
          Tout réimporter
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onChangeAll(allIds, 'skip')}
        >
          Tout ignorer
        </Button>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[260px]">Produit</TableHead>
              <TableHead className="min-w-[200px]">État dans votre menu</TableHead>
              <TableHead className="w-60">Que faire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const current = resolutions[product.external_id] ?? 'skip';
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
                    {product.mapping_stale ? (
                      <Badge variant="outline" className="font-normal text-amber-700">
                        supprimé depuis
                      </Badge>
                    ) : (
                      'toujours présent'
                    )}
                  </TableCell>

                  <TableCell>
                    <ToggleGroup
                      type="single"
                      value={current}
                      onValueChange={(value) =>
                        value && onChange(product.external_id, value as ImportReimportResolution)
                      }
                      disabled={disabled}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="skip" className="text-xs" aria-label={`Ignorer ${product.name}`}>
                        Ignorer
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="recreate"
                        className="text-xs"
                        aria-label={`Recréer ${product.name}`}
                      >
                        Recréer
                      </ToggleGroupItem>
                    </ToggleGroup>
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
