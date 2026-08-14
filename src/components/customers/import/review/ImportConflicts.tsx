import { CheckCircle2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { effectiveResolution } from '@/lib/customerImportDecisions';
import type { CustomerImportResolution, CustomerImportRow } from '@/types/customerImport';

interface ImportConflictsProps {
  rows: CustomerImportRow[];
  resolutions: Record<string, CustomerImportResolution>;
  blockersByRef: Map<string, { message: string }>;
  disabled: boolean;
  onChange: (externalId: string, resolution: CustomerImportResolution) => void;
}

/**
 * Lignes dont l'email et le téléphone désignent deux clients EXISTANTS
 * différents — aucun rapprochement automatique n'est possible, l'API renvoie
 * les deux candidats plutôt que de choisir à la place de l'utilisateur.
 *
 * Pas d'identifiant plus parlant qu'un numéro de fiche à afficher : l'API ne
 * renvoie que `email_customer_id`/`phone_customer_id` à ce stade, pas le nom
 * de la fiche visée. Rare en pratique (une poignée de lignes au plus dans un
 * fichier), ça reste consultable en le recherchant après coup.
 */
export const ImportConflicts = ({
  rows,
  resolutions,
  blockersByRef,
  disabled,
  onChange,
}: ImportConflictsProps) => {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Aucun conflit détecté.
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[220px]">Client du fichier</TableHead>
            <TableHead className="min-w-[220px]">Fiches candidates</TableHead>
            <TableHead className="w-80">Que faire</TableHead>
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
                  <p>Email → fiche existante n°{row.email_customer_id}</p>
                  <p>Téléphone → fiche existante n°{row.phone_customer_id}</p>
                </TableCell>

                <TableCell>
                  <ToggleGroup
                    type="single"
                    value={current}
                    onValueChange={(value) => value && onChange(row.external_id, value as CustomerImportResolution)}
                    disabled={disabled}
                    className="flex-wrap justify-start"
                  >
                    <ToggleGroupItem value="skip" className="text-xs" aria-label={`Ignorer ${row.display_name}`}>
                      Ignorer
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="update_to_email"
                      className="text-xs"
                      aria-label={`Rattacher ${row.display_name} à la fiche de l’email`}
                    >
                      Rattacher à l’email
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="update_to_phone"
                      className="text-xs"
                      aria-label={`Rattacher ${row.display_name} à la fiche du téléphone`}
                    >
                      Rattacher au téléphone
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
  );
};
