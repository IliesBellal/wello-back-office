import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { qk } from '@/lib/queryKeys';
import { alreadyImportedProducts, categoryOptions, indexBlockersByRef } from '@/lib/importDecisions';
import { menuService } from '@/services/menuService';
import type { UseProductImport } from '@/hooks/useProductImport';
import type { ImportPreviewResult } from '@/types/import';

import { ImportAlreadyImported } from './review/ImportAlreadyImported';
import { ImportMissingCategories } from './review/ImportMissingCategories';
import { ImportNameCollisions } from './review/ImportNameCollisions';
import { ImportTagClassification } from './review/ImportTagClassification';
import { ImportTvaResolution } from './review/ImportTvaResolution';
import { ImportWarningsPanel } from './review/ImportWarningsPanel';

interface ImportReviewStepProps {
  preview: ImportPreviewResult;
  wizard: UseProductImport;
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
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          {title}
          {count !== undefined && count > 0 && (
            <Badge variant={tone === 'attention' ? 'destructive' : 'secondary'}>{count}</Badge>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
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
 * Écran de vérification : ce que le fichier va produire, et ce qu'il reste à
 * trancher avant d'enregistrer.
 *
 * Les quatre décisions que l'API réclame ont chacune leur section, dans
 * l'ordre où elles se conditionnent — la classification des libellés détermine
 * les catégories disponibles, qui déterminent quels produits en manquent
 * encore.
 */
export const ImportReviewStep = ({ preview, wizard }: ImportReviewStepProps) => {
  const { state, precheck, isCommitting } = wizard;
  const decisions = state.decisions;

  // Référentiel de TVA du marchand : une vraie lecture, cachée entre deux
  // ouvertures contrairement aux appels d'import.
  const { data: tvaGroups = [], isLoading: loadingRates } = useQuery({
    queryKey: qk.menuTvaRates.all,
    queryFn: () => menuService.getTvaRates(),
    staleTime: 5 * 60 * 1000,
  });

  const blockersByRef = useMemo(() => indexBlockersByRef(state.blockers), [state.blockers]);
  const options = useMemo(
    () => (decisions ? categoryOptions(preview, decisions) : []),
    [decisions, preview],
  );
  const collisionProducts = useMemo(
    () => preview.products.filter((product) => product.name_collision),
    [preview.products],
  );
  const previouslyImported = useMemo(() => alreadyImportedProducts(preview), [preview]);

  if (!decisions || !precheck) return null;

  const { summary } = preview;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Count
          label="Produits à créer"
          value={precheck.materializableCount}
          hint={
            summary.products_already_imported > 0
              ? `${summary.products_already_imported} déjà importés${
                  summary.products_mapping_stale > 0
                    ? `, dont ${summary.products_mapping_stale} supprimés depuis`
                    : ''
                }`
              : undefined
          }
        />
        <Count
          label="Catégories"
          value={summary.categories_to_create + summary.categories_reused}
          hint={
            summary.categories_reused > 0 ? `${summary.categories_reused} réutilisées` : undefined
          }
        />
        <Count
          label="Tags"
          value={summary.tags_to_create + summary.tags_reused}
          hint={summary.tags_reused > 0 ? `${summary.tags_reused} réutilisés` : undefined}
        />
        <Count
          label="Groupes d’options"
          value={summary.attributes_to_create}
          hint={
            summary.options_to_create > 0 ? `${summary.options_to_create} options` : undefined
          }
        />
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

      <Section
        title="Catégories et tags"
        description="Chaque libellé du fichier devient soit une catégorie de caisse, soit un tag."
      >
        <ImportTagClassification
          preview={preview}
          classification={decisions.tag_classification}
          blockersByRef={blockersByRef}
          disabled={isCommitting}
          onChange={wizard.setTagClass}
        />
      </Section>

      <Separator />

      <Section
        title="TVA"
        description="Les taux du fichier doivent correspondre à ceux configurés dans votre caisse."
        count={precheck.unresolvedTva.length}
        tone="attention"
      >
        <ImportTvaResolution
          preview={preview}
          tvaMapping={decisions.tva_mapping}
          tvaGroups={tvaGroups}
          loadingRates={loadingRates}
          blockersByRef={blockersByRef}
          disabled={isCommitting}
          onChange={wizard.setTvaId}
        />
      </Section>

      <Separator />

      <Section
        title="Produits sans catégorie"
        description="Chaque produit doit appartenir à une catégorie de caisse."
        count={precheck.needsCategory.length}
        tone="attention"
      >
        <ImportMissingCategories
          products={precheck.needsCategory}
          options={options}
          categoryPerProduct={decisions.category_per_product}
          blockersByRef={blockersByRef}
          disabled={isCommitting}
          onAssign={wizard.setProductCategory}
          onAssignAll={wizard.assignCategoryToAll}
        />
      </Section>

      <Separator />

      <Section
        title="Noms déjà utilisés"
        description="Ces produits portent le nom d’un produit déjà présent dans votre menu."
        count={collisionProducts.length}
      >
        <ImportNameCollisions
          products={collisionProducts}
          resolutions={decisions.name_collisions}
          blockersByRef={blockersByRef}
          disabled={isCommitting}
          onChange={wizard.setCollisionResolution}
        />
      </Section>

      <Separator />

      <Section
        title="Déjà importés"
        description="Ces produits viennent d’un import précédent du même fichier."
        count={previouslyImported.length}
      >
        <ImportAlreadyImported
          products={previouslyImported}
          resolutions={decisions.already_imported}
          blockersByRef={blockersByRef}
          disabled={isCommitting}
          onChange={wizard.setReimportResolution}
          onChangeAll={wizard.setAllReimportResolutions}
        />
      </Section>

      <Separator />

      <Section title="Points d’attention" description="Pour information — rien de bloquant.">
        <ImportWarningsPanel warnings={preview.warnings} />
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-background px-1 py-3">
        <Button variant="ghost" onClick={wizard.back} disabled={isCommitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Changer de fichier
        </Button>

        <div className="flex items-center gap-3">
          {!precheck.canCommit && (
            <span className="text-sm text-muted-foreground">
              {[
                precheck.needsCategory.length > 0 &&
                  `${precheck.needsCategory.length} sans catégorie`,
                precheck.unresolvedTva.length > 0 &&
                  `${precheck.unresolvedTva.length} TVA à choisir`,
                precheck.unresolvedCollisions.length > 0 &&
                  `${precheck.unresolvedCollisions.length} doublon(s) à trancher`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          <Button onClick={wizard.commit} disabled={!precheck.canCommit || isCommitting}>
            {isCommitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              `Importer ${precheck.materializableCount} produit(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
