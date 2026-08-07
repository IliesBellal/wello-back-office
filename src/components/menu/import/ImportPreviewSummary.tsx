import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ImportPreviewResult } from '@/types/import';

interface ImportPreviewSummaryProps {
  preview: ImportPreviewResult;
  onBack: () => void;
}

interface CountProps {
  label: string;
  value: number;
  hint?: string;
}

const Count = ({ label, value, hint }: CountProps) => (
  <Card className="p-4">
    <p className="text-2xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm font-medium">{label}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

/**
 * Récapitulatif de la prévisualisation.
 *
 * Volontairement limité aux compteurs : l'écran de vérification détaillé —
 * classification des libellés, correspondance des taux de TVA, arbitrage des
 * doublons — arrive à l'étape suivante du chantier. Tout le `PreviewResult`
 * est déjà en mémoire, il n'y aura qu'à le rendre ici.
 */
export const ImportPreviewSummary = ({ preview, onBack }: ImportPreviewSummaryProps) => {
  const { summary, warnings } = preview;
  const blocking =
    summary.products_needing_category + summary.unresolved_tva_rates + summary.products_with_name_collision;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">Fichier analysé</p>
          <p className="text-sm text-muted-foreground">
            Voici ce que contient votre fichier. Rien n’a encore été enregistré.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Count
          label="Produits à créer"
          value={summary.products_to_create}
          hint={
            summary.products_already_imported > 0
              ? `${summary.products_already_imported} déjà importés, ignorés`
              : undefined
          }
        />
        <Count
          label="Catégories"
          value={summary.categories_to_create + summary.categories_reused}
          hint={
            summary.categories_reused > 0
              ? `${summary.categories_reused} existantes réutilisées`
              : undefined
          }
        />
        <Count
          label="Tags"
          value={summary.tags_to_create + summary.tags_reused}
          hint={summary.tags_reused > 0 ? `${summary.tags_reused} existants réutilisés` : undefined}
        />
        <Count
          label="Groupes d’options"
          value={summary.attributes_to_create}
          hint={
            summary.options_to_create > 0 ? `${summary.options_to_create} options au total` : undefined
          }
        />
      </div>

      {blocking > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{blocking} point(s) à vérifier avant de valider :</span>{' '}
            {[
              summary.products_needing_category > 0 &&
                `${summary.products_needing_category} produit(s) sans catégorie`,
              summary.unresolved_tva_rates > 0 &&
                `${summary.unresolved_tva_rates} taux de TVA non reconnu(s)`,
              summary.products_with_name_collision > 0 &&
                `${summary.products_with_name_collision} nom(s) déjà utilisé(s)`,
            ]
              .filter(Boolean)
              .join(', ')}
            .
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{warnings.length} avertissement(s)</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-3">
            {warnings.slice(0, 50).map((warning, index) => (
              <li key={`${warning.code}-${warning.ref}-${index}`} className="text-sm text-muted-foreground">
                {warning.message}
              </li>
            ))}
            {warnings.length > 50 && (
              <li className="text-sm italic text-muted-foreground">
                … et {warnings.length - 50} autre(s).
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Prévisualisation <span className="font-mono">{preview.token}</span>, valable jusqu’à{' '}
        {new Date(preview.expires_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
        .
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Changer de fichier
        </Button>
        <Button disabled title="Écran de vérification à venir">
          Valider l’import
        </Button>
      </div>
    </div>
  );
};
