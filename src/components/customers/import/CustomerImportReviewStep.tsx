import { useMemo } from 'react';
import { AlertCircle, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { indexBlockersByRef, rowsByStatus, type CustomerImportPlanSummary } from '@/lib/customerImportDecisions';
import type { UseCustomerImport } from '@/hooks/useCustomerImport';
import type { CustomerImportPreviewResult } from '@/types/customerImport';

import { ImportAlreadyImported } from './review/ImportAlreadyImported';
import { ImportConflicts } from './review/ImportConflicts';
import { ImportDuplicates } from './review/ImportDuplicates';
import { ImportWarningsPanel } from './review/ImportWarningsPanel';

interface CustomerImportReviewStepProps {
  preview: CustomerImportPreviewResult;
  summary: CustomerImportPlanSummary;
  wizard: UseCustomerImport;
}

interface SectionProps {
  title: string;
  description: string;
  count?: number;
  tone?: 'default' | 'attention';
  children: React.ReactNode;
}

const Section = ({ title, description, count, tone = 'default', children }: SectionProps) => (
  <section className="space-y-3">
    <div>
      <h3 className="flex items-center gap-2 font-semibold">
        {title}
        {count !== undefined && count > 0 && (
          <Badge variant={tone === 'attention' ? 'destructive' : 'secondary'}>{count}</Badge>
        )}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);

const Count = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <Card className="p-4">
    <p className="text-2xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm font-medium">{label}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

/**
 * Écran de vérification : ce que le fichier va produire, et les arbitrages
 * qu'il reste à trancher avant d'enregistrer.
 *
 * Contrairement à l'import produit, le bouton d'envoi reste TOUJOURS actif :
 * chaque statut a une résolution par défaut sûre (skip, sauf create/
 * mapping_stale), il n'y a donc rien qui BLOQUE l'envoi — seulement des choix
 * que l'utilisateur peut affiner. C'est ce que dit le récap à côté du
 * bouton.
 *
 * Sections affichées seulement si non vides, dans l'ordre de gravité :
 * conflits, doublons, déjà importés/périmés, puis les avertissements
 * informatifs.
 */
export const CustomerImportReviewStep = ({ preview, summary, wizard }: CustomerImportReviewStepProps) => {
  const { state, isCommitting } = wizard;

  const blockersByRef = useMemo(() => indexBlockersByRef(state.blockers), [state.blockers]);

  const duplicateRows = useMemo(() => rowsByStatus(preview.rows, 'duplicate'), [preview.rows]);
  const conflictRows = useMemo(() => rowsByStatus(preview.rows, 'conflict'), [preview.rows]);
  const alreadyImportedRows = useMemo(
    () => [...rowsByStatus(preview.rows, 'mapping_stale'), ...rowsByStatus(preview.rows, 'already_imported')],
    [preview.rows],
  );

  const { summary: previewSummary } = preview;

  const recap = [
    summary.toCreate > 0 && `${summary.toCreate} à créer`,
    summary.toUpdate > 0 && `${summary.toUpdate} à mettre à jour`,
    summary.toRecreate > 0 && `${summary.toRecreate} à recréer`,
    summary.skipped > 0 && `${summary.skipped} ignoré(s)`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Count label="À créer" value={previewSummary.to_create} />
        <Count label="Doublons" value={previewSummary.duplicates} />
        <Count label="Conflits" value={previewSummary.conflicts} />
        <Count label="Déjà importés" value={previewSummary.already_imported} />
        <Count label="Mappings périmés" value={previewSummary.mapping_stale} />
      </div>

      {state.error && (
        <Alert variant={state.expired ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{state.error}</span>
            {state.expired && (
              <Button size="sm" variant="outline" onClick={wizard.back}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Recommencer
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {conflictRows.length > 0 && (
        <>
          <Section
            title="Conflits"
            description="L’email et le téléphone de ces lignes désignent deux clients différents."
            count={conflictRows.length}
            tone="attention"
          >
            <ImportConflicts
              rows={conflictRows}
              resolutions={state.resolutions}
              blockersByRef={blockersByRef}
              disabled={isCommitting}
              onChange={wizard.setResolution}
            />
          </Section>
          <Separator />
        </>
      )}

      {duplicateRows.length > 0 && (
        <>
          <Section
            title="Doublons"
            description="Ces lignes correspondent à un client déjà présent, par email ou téléphone."
            count={duplicateRows.length}
          >
            <ImportDuplicates
              rows={duplicateRows}
              resolutions={state.resolutions}
              blockersByRef={blockersByRef}
              disabled={isCommitting}
              onChange={wizard.setResolution}
              onChangeAll={(resolution) => wizard.setAllResolutions('duplicate', resolution)}
            />
          </Section>
          <Separator />
        </>
      )}

      {alreadyImportedRows.length > 0 && (
        <>
          <Section
            title="Déjà importés"
            description="Ces clients viennent d’un import précédent du même fichier."
            count={alreadyImportedRows.length}
          >
            <ImportAlreadyImported
              rows={alreadyImportedRows}
              resolutions={state.resolutions}
              blockersByRef={blockersByRef}
              disabled={isCommitting}
              onChange={wizard.setResolution}
              onChangeAll={wizard.setAllResolutions}
            />
          </Section>
          <Separator />
        </>
      )}

      <Section title="Points d’attention" description="Pour information — rien de bloquant.">
        <ImportWarningsPanel warnings={preview.warnings} />
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-background px-1 py-3">
        <Button variant="ghost" onClick={wizard.back} disabled={isCommitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Changer de fichier
        </Button>

        <div className="flex items-center gap-3">
          {recap && <span className="text-sm text-muted-foreground">{recap}</span>}
          <Button onClick={wizard.commit} disabled={isCommitting}>
            {isCommitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              `Importer ${summary.totalToImport} client(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
