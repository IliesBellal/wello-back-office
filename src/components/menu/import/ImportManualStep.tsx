import { useId, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2, Plus } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { manualCategorySuggestions } from '@/lib/manualImport';
import { qk } from '@/lib/queryKeys';
import { menuService } from '@/services/menuService';
import type { UseProductImport } from '@/hooks/useProductImport';

import { ImportManualRow } from './manual/ImportManualRow';

interface ImportManualStepProps {
  wizard: UseProductImport;
  /**
   * Catégories déjà présentes dans le menu, proposées en autocomplétion.
   * Facultatif : sans elles, la grille se contente de proposer ce qui y est
   * déjà saisi, ce qui suffit à garder les lignes cohérentes entre elles.
   */
  existingCategories?: string[];
}

/**
 * Saisie de masse : la troisième porte de l'import.
 *
 * Elle ne fait que produire le même canonique que les deux autres. La grille
 * remplie part en prévisualisation, et c'est l'écran de vérification déjà en
 * place qui prend le relais — classification, TVA, doublons, enregistrement.
 */
export const ImportManualStep = ({ wizard, existingCategories = [] }: ImportManualStepProps) => {
  const { state, manualValidation, isSubmittingManual } = wizard;
  const categoryListId = useId();
  const rateListId = useId();

  // Les taux configurés chez le marchand : les proposer évite de saisir un
  // taux qui n'existe pas, et donc un aller-retour « TVA non reconnue » dans
  // l'écran suivant.
  const { data: tvaGroups = [] } = useQuery({
    queryKey: qk.menuTvaRates.all,
    queryFn: () => menuService.getTvaRates(),
    staleTime: 5 * 60 * 1000,
  });

  const rateSuggestions = useMemo(() => {
    const values = new Set<number>();
    for (const group of tvaGroups) {
      for (const rate of group.rates) values.add(rate.value);
    }
    return [...values].sort((a, b) => a - b);
  }, [tvaGroups]);

  const categorySuggestions = useMemo(
    () => manualCategorySuggestions(state.manualRows, existingCategories),
    [existingCategories, state.manualRows],
  );

  const submittableCount = manualValidation.submittable.length;

  return (
    <div className="flex flex-col gap-4">
      <datalist id={categoryListId}>
        {categorySuggestions.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <datalist id={rateListId}>
        {rateSuggestions.map((rate) => (
          <option key={rate} value={String(rate).replace('.', ',')} />
        ))}
      </datalist>

      <p className="text-sm text-muted-foreground">
        Un produit par ligne, chacun sur deux niveaux : le nom au-dessus de sa description, et le
        prix au-dessus de sa TVA pour chaque canal de vente. Les prix sont en euros (9,50), les TVA
        en pourcentage (10). Appuyez sur <kbd className="rounded border px-1 text-xs">Entrée</kbd>
        depuis le dernier produit pour en ajouter un.
      </p>

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-[260px]">
                Nom * <span className="font-normal text-muted-foreground">et description</span>
              </TableHead>
              <TableHead className="min-w-[170px]">Catégorie *</TableHead>
              <TableHead className="min-w-[130px]">
                Sur place
                <span className="block text-xs font-normal text-muted-foreground">prix puis TVA</span>
              </TableHead>
              <TableHead className="min-w-[130px]">
                À emporter
                <span className="block text-xs font-normal text-muted-foreground">prix puis TVA</span>
              </TableHead>
              <TableHead className="min-w-[130px]">
                En livraison
                <span className="block text-xs font-normal text-muted-foreground">prix puis TVA</span>
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.manualRows.map((row, index) => (
              <ImportManualRow
                key={row.id}
                row={row}
                index={index}
                isLast={index === state.manualRows.length - 1}
                errors={manualValidation.errors.get(row.id)}
                disabled={isSubmittingManual}
                categoryListId={categoryListId}
                rateListId={rateListId}
                onChange={wizard.setManualCell}
                onDuplicate={wizard.duplicateManualRow}
                onRemove={wizard.removeManualRow}
                onAppendRow={wizard.addManualRow}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={wizard.addManualRow} disabled={isSubmittingManual}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une ligne
        </Button>
      </div>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-background px-1 py-3">
        <Button variant="ghost" onClick={wizard.back} disabled={isSubmittingManual}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {submittableCount === 0
              ? 'Aucun produit saisi'
              : `${submittableCount} produit(s) à vérifier`}
          </span>
          <Button
            onClick={wizard.submitManual}
            disabled={!manualValidation.canSubmit || isSubmittingManual}
          >
            {isSubmittingManual ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse…
              </>
            ) : (
              'Vérifier avant d’enregistrer'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
