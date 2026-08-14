import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomerImportCommitSummary } from '@/types/customerImport';

interface CustomerImportDoneStepProps {
  result: CustomerImportCommitSummary;
  onClose: () => void;
  onImportAnother: () => void;
}

const ROWS: { label: string; pick: (result: CustomerImportCommitSummary) => number }[] = [
  { label: 'Créés', pick: (result) => result.created },
  { label: 'Mis à jour', pick: (result) => result.updated },
  { label: 'Recréés', pick: (result) => result.recreated },
  { label: 'Ignorés', pick: (result) => result.skipped },
];

/**
 * Résumé de ce qui a réellement été écrit.
 *
 * Quatre lignes plutôt que le tableau créé/réutilisé/ignoré du produit :
 * l'import clients n'a pas de notion d'entité « réutilisée », seulement
 * créée, mise à jour, recréée (un mapping périmé remplacé) ou ignorée.
 */
export const CustomerImportDoneStep = ({ result, onClose, onImportAnother }: CustomerImportDoneStepProps) => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Import terminé</h3>
        <p className="text-sm text-muted-foreground">
          {result.created + result.updated + result.recreated} client(s) créé(s) ou mis à jour.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Résultat</TableHead>
            <TableHead className="w-24 text-right">Clients</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">{row.pick(result)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <div className="flex justify-between gap-2">
      <Button variant="ghost" onClick={onImportAnother}>
        Importer un autre fichier
      </Button>
      <Button onClick={onClose}>Voir mes clients</Button>
    </div>
  </div>
);
