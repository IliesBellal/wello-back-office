import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ImportPreviewResult, ImportTagClass } from '@/types/import';

interface ImportTagClassificationProps {
  preview: ImportPreviewResult;
  classification: Record<string, ImportTagClass>;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onChange: (externalId: string, next: ImportTagClass) => void;
}

/**
 * Répartition des libellés du fichier entre catégories caisse et tags.
 *
 * Un export Zelty ne distingue pas les deux : c'est ici que ça se tranche, et
 * la conséquence est immédiate — un libellé passé en catégorie devient
 * assignable aux produits, et devient la catégorie de ceux qui l'ouvrent.
 */
export const ImportTagClassification = ({
  preview,
  classification,
  blockersByRef,
  disabled,
  onChange,
}: ImportTagClassificationProps) => {
  if (preview.tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce fichier ne contient aucun libellé à classer.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[220px]">Libellé</TableHead>
            <TableHead className="w-28 text-right">Produits</TableHead>
            <TableHead className="w-56">Devient</TableHead>
            <TableHead className="min-w-[200px]">Existant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.tags.map((tag) => {
            const current = classification[tag.external_id] ?? tag.class;
            const errors = blockersByRef.get(tag.external_id);

            return (
              <TableRow key={tag.external_id} className={errors ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {tag.name}
                    {tag.synthetic && (
                      <Badge variant="outline" className="text-xs font-normal">
                        absent du fichier
                      </Badge>
                    )}
                  </div>
                  {errors?.map((message, index) => (
                    <p key={index} className="mt-0.5 text-xs text-destructive">
                      {message}
                    </p>
                  ))}
                </TableCell>

                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {tag.product_count}
                </TableCell>

                <TableCell>
                  <ToggleGroup
                    type="single"
                    value={current}
                    onValueChange={(value) => value && onChange(tag.external_id, value as ImportTagClass)}
                    disabled={disabled}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="category" className="text-xs" aria-label={`${tag.name} en catégorie`}>
                      Catégorie
                    </ToggleGroupItem>
                    <ToggleGroupItem value="tag" className="text-xs" aria-label={`${tag.name} en tag`}>
                      Tag
                    </ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {tag.action === 'already_imported' && 'Déjà importé, ignoré'}
                  {tag.action === 'reuse_existing' && 'Rattaché à un élément existant'}
                  {tag.action === 'create' && '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
