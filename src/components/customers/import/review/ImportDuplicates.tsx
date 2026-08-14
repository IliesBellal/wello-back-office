import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { effectiveResolution, matchedByLabel } from '@/lib/customerImportDecisions';
import type { CustomerImportResolution, CustomerImportRow } from '@/types/customerImport';

interface ImportDuplicatesProps {
  rows: CustomerImportRow[];
  resolutions: Record<string, CustomerImportResolution>;
  blockersByRef: Map<string, { message: string }>;
  disabled: boolean;
  onChange: (externalId: string, resolution: CustomerImportResolution) => void;
  onChangeAll: (resolution: CustomerImportResolution) => void;
}

/**
 * Lignes rapprochées d'un client existant par email ou téléphone.
 *
 * Ignorées par défaut : dédupliquer sans arbitrage explicite serait aussi
 * dangereux qu'écraser une fiche sans le vouloir. L'utilisateur tranche ligne
 * par ligne, ou en masse quand le fichier entier vient de la même source
 * (par exemple un export déjà connu).
 */
export const ImportDuplicates = ({
  rows,
  resolutions,
  blockersByRef,
  disabled,
  onChange,
  onChangeAll,
}: ImportDuplicatesProps) => {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Aucun doublon détecté.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{rows.length} client(s) déjà présent(s) dans votre fichier client</span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChangeAll('update')}>
          Tout mettre à jour
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChangeAll('skip')}>
          Tout ignorer
        </Button>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[220px]">Client</TableHead>
              <TableHead className="min-w-[180px]">Rapproché par</TableHead>
              <TableHead className="w-72">Que faire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const current = effectiveResolution(row, resolutions);
              const blocker = blockersByRef.get(row.external_id);

              return (
                <TableRow key={row.external_id} className={blocker ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">
                    {row.display_name || row.external_id}
                    {blocker && <p className="mt-0.5 text-xs text-destructive">{blocker.message}</p>}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {matchedByLabel(row.matched_by)}
                  </TableCell>

                  <TableCell>
                    <ToggleGroup
                      type="single"
                      value={current}
                      onValueChange={(value) => value && onChange(row.external_id, value as CustomerImportResolution)}
                      disabled={disabled}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="skip" className="text-xs" aria-label={`Ignorer ${row.display_name}`}>
                        Ignorer
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="update"
                        className="text-xs"
                        aria-label={`Mettre à jour ${row.display_name}`}
                      >
                        Mettre à jour
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="import_anyway"
                        className="text-xs"
                        aria-label={`Importer ${row.display_name} comme nouveau`}
                      >
                        Importer comme nouveau
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
