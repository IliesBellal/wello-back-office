import { CheckCircle2, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { effectiveResolution } from '@/lib/customerImportDecisions';
import type { CustomerImportResolution, CustomerImportRow } from '@/types/customerImport';

interface ImportAlreadyImportedProps {
  rows: CustomerImportRow[];
  resolutions: Record<string, CustomerImportResolution>;
  blockersByRef: Map<string, { message: string }>;
  disabled: boolean;
  onChange: (externalId: string, resolution: CustomerImportResolution) => void;
  onChangeAll: (status: 'already_imported' | 'mapping_stale', resolution: CustomerImportResolution) => void;
}

/**
 * Clients qu'un import précédent du même fichier a déjà créés
 * (`already_imported`), ou dont la fiche créée a depuis été supprimée
 * (`mapping_stale`).
 *
 * Regroupés dans une même section car l'arbitrage est le même (ignorer ou
 * recréer), mais le défaut diffère : `already_imported` reste ignoré (c'est
 * ce qui rend un import rejouable sans dupliquer), `mapping_stale` est
 * recréé d'office — sinon rejouer un fichier après avoir supprimé ses
 * clients n'aurait aucun effet.
 */
export const ImportAlreadyImported = ({
  rows,
  resolutions,
  blockersByRef,
  disabled,
  onChange,
  onChangeAll,
}: ImportAlreadyImportedProps) => {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Aucun client de ce fichier n’a encore été importé.
      </div>
    );
  }

  const staleRows = rows.filter((row) => row.status === 'mapping_stale');
  const recreatedCount = rows.filter(
    (row) => effectiveResolution(row, resolutions) === 'recreate',
  ).length;

  return (
    <div className="space-y-4">
      {staleRows.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm">
              <span className="font-medium">
                {staleRows.length} client(s) importé(s) puis supprimé(s) depuis.
              </span>{' '}
              Ils sont recréés par défaut — sinon rejouer ce fichier n’aurait aucun effet.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {rows.length} client(s) déjà importé(s)
          {recreatedCount > 0 && ` — ${recreatedCount} à recréer`}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChangeAll('already_imported', 'recreate');
            onChangeAll('mapping_stale', 'recreate');
          }}
        >
          Tout recréer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChangeAll('already_imported', 'skip');
            onChangeAll('mapping_stale', 'skip');
          }}
        >
          Tout ignorer
        </Button>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[220px]">Client</TableHead>
              <TableHead className="min-w-[180px]">État</TableHead>
              <TableHead className="w-60">Que faire</TableHead>
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
                    {row.status === 'mapping_stale' ? (
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
                      onValueChange={(value) => value && onChange(row.external_id, value as CustomerImportResolution)}
                      disabled={disabled}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="skip" className="text-xs" aria-label={`Ignorer ${row.display_name}`}>
                        Ignorer
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="recreate"
                        className="text-xs"
                        aria-label={`Recréer ${row.display_name}`}
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
