import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportPreviewProduct } from '@/types/import';

interface ImportProductSelectionProps {
  products: ImportPreviewProduct[];
  excluded: Record<string, boolean>;
  disabled: boolean;
  onChange: (productExternalId: string, excluded: boolean) => void;
  onChangeAll: (productExternalIds: string[], excluded: boolean) => void;
}

/**
 * Sélection du sous-ensemble à importer — porte « autre établissement »
 * uniquement.
 *
 * Pas d'écran de choix séparé en amont : le catalogue entier est prévisualisé
 * d'un coup, et c'est ici qu'on en écarte ce qu'on ne veut pas. Coché =
 * inclus, à l'inverse de `excluded_products` qui ne retient que les exclusions
 * — un produit absent de la décision est inclus par défaut, ce que reflète le
 * `!excluded[...]` ci-dessous.
 */
export const ImportProductSelection = ({
  products,
  excluded,
  disabled,
  onChange,
  onChangeAll,
}: ImportProductSelectionProps) => {
  if (products.length === 0) return null;

  const allIds = products.map((product) => product.external_id);
  const excludedCount = products.filter((product) => excluded[product.external_id]).length;
  const includedCount = products.length - excludedCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {includedCount} sur {products.length} produit(s) seront importés
        </span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChangeAll(allIds, false)}>
          Tout inclure
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChangeAll(allIds, true)}>
          Tout exclure
        </Button>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10" />
              <TableHead className="min-w-[260px]">Produit</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isExcluded = Boolean(excluded[product.external_id]);
              return (
                <TableRow key={product.external_id} className={isExcluded ? 'opacity-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={!isExcluded}
                      disabled={disabled}
                      onCheckedChange={(checked) => onChange(product.external_id, checked !== true)}
                      aria-label={isExcluded ? `Inclure ${product.name}` : `Exclure ${product.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.action === 'already_imported' ? 'déjà importé' : 'nouveau'}
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
