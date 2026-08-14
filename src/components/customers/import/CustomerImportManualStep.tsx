import { AlertCircle, ArrowLeft, Loader2, Plus } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UseCustomerImport } from '@/hooks/useCustomerImport';

import { ImportManualRow } from './manual/ImportManualRow';

interface CustomerImportManualStepProps {
  wizard: UseCustomerImport;
}

/**
 * Saisie manuelle : la troisième porte de l'import.
 *
 * Grille neuve — il n'existe pas d'écran client réutilisable pour de la
 * saisie en masse, `CustomerDetailsSheet` étant en lecture seule. Elle ne
 * fait que produire le même canonique que les deux autres portes : la grille
 * remplie part en prévisualisation, et c'est l'écran de vérification qui
 * prend le relais (dédup email/téléphone, doublons, enregistrement).
 *
 * Volontairement sobre : pas de prix ni de TVA, spécifiques à l'import
 * produit — uniquement des champs client.
 */
export const CustomerImportManualStep = ({ wizard }: CustomerImportManualStepProps) => {
  const { state, manualValidation, isSubmittingManual } = wizard;
  const submittableCount = manualValidation.submittable.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Un client par ligne. Le nom est obligatoire, ainsi que l’email ou le téléphone (l’un des deux
        suffit). Appuyez sur <kbd className="rounded border px-1 text-xs">Entrée</kbd> depuis le
        dernier client pour en ajouter un.
      </p>

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-[240px]">
                Nom * <span className="font-normal text-muted-foreground">prénom, nom de famille</span>
              </TableHead>
              <TableHead className="min-w-[200px]">
                Contact <span className="font-normal text-muted-foreground">email ou téléphone *</span>
              </TableHead>
              <TableHead className="min-w-[200px]">Adresse et société</TableHead>
              <TableHead className="min-w-[140px]">Naissance</TableHead>
              <TableHead className="min-w-[220px]">Notes</TableHead>
              <TableHead className="w-20 text-center">Consentement</TableHead>
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
                onChange={wizard.setManualCell}
                onToggleConsent={wizard.setManualConsent}
                onDuplicate={wizard.duplicateManualRow}
                onRemove={wizard.removeManualRow}
                onAppendRow={wizard.addManualRow}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={wizard.addManualRow}
          disabled={isSubmittingManual}
        >
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
            {submittableCount === 0 ? 'Aucun client saisi' : `${submittableCount} client(s) à vérifier`}
          </span>
          <Button onClick={wizard.submitManual} disabled={!manualValidation.canSubmit || isSubmittingManual}>
            {isSubmittingManual ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse…
              </>
            ) : (
              `Vérifier ${submittableCount} client(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
