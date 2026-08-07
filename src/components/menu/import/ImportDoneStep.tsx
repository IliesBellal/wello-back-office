import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportCommitCounts, ImportCommitResponse } from '@/types/import';

interface ImportDoneStepProps {
  result: ImportCommitResponse;
  onClose: () => void;
  onImportAnother: () => void;
}

const ROWS: { label: string; pick: (result: ImportCommitResponse) => ImportCommitCounts }[] = [
  { label: 'Produits', pick: (result) => result.summary.products },
  { label: 'Catégories', pick: (result) => result.summary.categories },
  { label: 'Tags', pick: (result) => result.summary.tags },
  { label: 'Groupes d’options', pick: (result) => result.summary.attributes },
];

/**
 * Résumé de ce qui a réellement été écrit.
 *
 * Les trois colonnes reprennent le vocabulaire de l'API : créé, réutilisé
 * (une entité du même nom existait déjà), ignoré (déjà importé auparavant, ou
 * doublon écarté). C'est ce qui rend un second import compréhensible : tout y
 * apparaît en « ignoré », et rien n'a été dupliqué.
 */
export const ImportDoneStep = ({ result, onClose, onImportAnother }: ImportDoneStepProps) => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Import terminé</h3>
        <p className="text-sm text-muted-foreground">
          {result.summary.products.created} produit(s) ajouté(s) à votre menu.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Élément</TableHead>
            <TableHead className="w-24 text-right">Créés</TableHead>
            <TableHead className="w-28 text-right">Réutilisés</TableHead>
            <TableHead className="w-24 text-right">Ignorés</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => {
            const counts = row.pick(result);
            return (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{counts.created}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {counts.reused}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {counts.skipped}
                </TableCell>
              </TableRow>
            );
          })}
          {result.summary.options_created > 0 && (
            <TableRow>
              <TableCell className="font-medium">Options</TableCell>
              <TableCell className="text-right tabular-nums">
                {result.summary.options_created}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    {result.summary.attributes.created > 0 && (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Les groupes d’options ont été créés sans être rattachés aux produits. Associez-les depuis
        « Options &amp; Suppléments » quand vous serez prêt.
      </p>
    )}

    <div className="flex justify-between gap-2">
      <Button variant="ghost" onClick={onImportAnother}>
        Importer un autre fichier
      </Button>
      <Button onClick={onClose}>Voir mes produits</Button>
    </div>
  </div>
);
