import { useEffect, useState } from 'react';
import { Attribute, Category, Product } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { menuService } from '@/services/menuService';
import { cn } from '@/lib/utils';

interface AttributesMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  attributes: Attribute[];
  categories: Category[];
  onProductsUpdated: (updates: { product_id: string; attribute_ids: string[] }[]) => void;
}

// Nombre de requêtes PATCH envoyées en parallèle lors de l'enregistrement.
const SAVE_CONCURRENCY = 4;

// La liste des groupes assignés à un produit arrive soit sous forme d'IDs,
// soit imbriquée dans configuration.attributes (objets Attribute complets).
const getAttributeIds = (product: Product): string[] => {
  const config = product.configuration;
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const nested = config.attributes;
    if (Array.isArray(nested)) {
      return nested.map(a => a.id).filter(Boolean);
    }
  }
  if (Array.isArray(config)) {
    return config as string[];
  }
  return (product.attributes || []).map(a => a.attribute_id);
};

// 4 teintes distinctes pour croiser l'alternance ligne/colonne (effet damier).
const cellShade = (rowOdd: boolean, colOdd: boolean) => {
  if (rowOdd && colOdd) return 'bg-muted/50';
  if (rowOdd) return 'bg-muted/25';
  if (colOdd) return 'bg-muted/20';
  return 'bg-transparent';
};

const headerShade = (colOdd: boolean) => (colOdd ? 'bg-muted/60' : 'bg-muted/40');

export const AttributesMatrixDialog = ({
  open,
  onOpenChange,
  products,
  attributes,
  categories,
  onProductsUpdated,
}: AttributesMatrixDialogProps) => {
  const { toast } = useToast();

  const [matrix, setMatrix] = useState<Map<string, Set<string>>>(new Map());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  // Rang de chaque catégorie = sa position dans products_types (ordre d'affichage caisse/carte).
  const categoryRank = new Map(categories.map((cat, idx) => [cat.category_id, idx]));
  const categoryNameById = new Map(categories.map(cat => [cat.category_id, cat.category_name || cat.category]));

  const validProducts = products
    .filter(p => !!p.product_id && !p.is_product_group && !p.is_group)
    .sort((a, b) => {
      const rankA = categoryRank.get(a.category_id ?? '') ?? Number.MAX_SAFE_INTEGER;
      const rankB = categoryRank.get(b.category_id ?? '') ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0);
    });

  // Capture un instantané des produits/attributs uniquement à l'ouverture,
  // pour ne pas écraser les modifications en cours si le parent re-render.
  useEffect(() => {
    if (!open) return;

    const initialMatrix = new Map<string, Set<string>>();
    validProducts.forEach(p => {
      initialMatrix.set(p.product_id, new Set(getAttributeIds(p)));
    });
    setMatrix(initialMatrix);
    setDirty(new Set());
    setRowErrors(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCell = (productId: string, attributeId: string) => {
    if (saving) return;
    setMatrix(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(productId) ?? []);
      if (current.has(attributeId)) {
        current.delete(attributeId);
      } else {
        current.add(attributeId);
      }
      next.set(productId, current);
      return next;
    });
    setDirty(prev => new Set(prev).add(productId));
    setRowErrors(prev => {
      if (!prev.has(productId)) return prev;
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

  // Enregistre les lignes modifiées. Retourne false si au moins une a échoué
  // (les lignes en échec restent "dirty" pour permettre un nouvel essai).
  const saveDirtyChanges = async (): Promise<boolean> => {
    const dirtyIds = Array.from(dirty);
    if (dirtyIds.length === 0) return true;

    setSaving(true);
    setRowErrors(new Map());

    const succeeded: { product_id: string; attribute_ids: string[] }[] = [];
    const failedIds: string[] = [];

    let cursor = 0;
    const worker = async () => {
      while (cursor < dirtyIds.length) {
        const productId = dirtyIds[cursor++];
        const attributeIds = Array.from(matrix.get(productId) ?? []);
        try {
          await menuService.updateProductAttributes(productId, attributeIds);
          succeeded.push({ product_id: productId, attribute_ids: attributeIds });
        } catch (error) {
          failedIds.push(productId);
          setRowErrors(prev => new Map(prev).set(productId, "Échec de l'enregistrement"));
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(SAVE_CONCURRENCY, dirtyIds.length) }, worker)
    );

    if (succeeded.length > 0) {
      onProductsUpdated(succeeded);
    }
    setDirty(new Set(failedIds));
    setSaving(false);

    if (failedIds.length === 0) {
      toast({
        title: 'Succès',
        description: `${succeeded.length} produit(s) mis à jour`,
      });
      return true;
    }

    toast({
      title: 'Enregistrement partiel',
      description: `${succeeded.length} produit(s) mis à jour, ${failedIds.length} en erreur`,
      variant: 'destructive',
    });
    return false;
  };

  const handleSave = async () => {
    if (await saveDirtyChanges()) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les options et suppléments</DialogTitle>
        </DialogHeader>

        {attributes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun groupe d'options défini
          </div>
        ) : validProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun produit trouvé</div>
        ) : (
          <div className="flex-1 overflow-auto bg-card rounded-lg border border-border">
            {/* <table> brut (pas le wrapper <Table>) : celui-ci ajoute son propre
                div overflow-auto, ce qui casse le sticky des en-têtes puisqu'ils
                se figeraient alors par rapport à ce conteneur interne (qui ne
                scrolle jamais lui-même) plutôt que par rapport à ce div, le
                véritable conteneur qui scrolle. */}
            <table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead
                    style={{ zIndex: 500 }}
                    // h-32 aligné sur la hauteur des en-têtes pivotés : un <th> sticky ne
                    // remplit pas toujours le fond sur toute la hauteur "partagée" de la
                    // ligne s'il n'a pas lui-même une hauteur explicite, ce qui laissait
                    // filtrer un éclat de la ligne précédente pendant le scroll.
                    className="sticky left-0 top-0 h-32 bg-muted min-w-[220px] align-middle"
                  >
                    Produit
                  </TableHead>
                  {attributes.map((attribute, colIdx) => {
                    const colOdd = colIdx % 2 === 1;
                    const label = attribute.name || attribute.title;
                    return (
                      <TableHead
                        key={attribute.id}
                        // z-index décroissant : chaque colonne doit rester visible au-dessus de
                        // la suivante, car son libellé pivoté déborde vers la droite dans son
                        // en-tête voisin (sinon le fond opaque de la colonne suivante le masque).
                        style={{ zIndex: 200 - colIdx }}
                        className={cn(
                          'sticky top-0 p-0 align-bottom text-center w-11 min-w-11 h-32 border-l border-border/40',
                          headerShade(colOdd)
                        )}
                      >
                        <div className="flex h-full items-end justify-start pl-2 pb-2">
                          <span
                            className="inline-block origin-bottom-left -rotate-45 whitespace-nowrap text-xs font-medium leading-none"
                            title={label}
                          >
                            {label}
                          </span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {validProducts.map((product, rowIdx) => {
                  const rowOdd = rowIdx % 2 === 1;
                  const rowSet = matrix.get(product.product_id) ?? new Set<string>();
                  const rowError = rowErrors.get(product.product_id);
                  return (
                    <TableRow key={product.product_id}>
                      <TableCell
                        className={cn(
                          'sticky left-0 z-10 font-medium border-r border-border/40',
                          rowError ? 'bg-destructive/10' : rowOdd ? 'bg-muted/25' : 'bg-card'
                        )}
                      >
                        {product.name}
                        {categoryNameById.get(product.category_id ?? '') && (
                          <p className="text-xs text-muted-foreground font-normal">
                            {categoryNameById.get(product.category_id ?? '')}
                          </p>
                        )}
                        {rowError && (
                          <p className="text-xs text-destructive mt-0.5">{rowError}</p>
                        )}
                      </TableCell>
                      {attributes.map((attribute, colIdx) => {
                        const colOdd = colIdx % 2 === 1;
                        return (
                          <TableCell
                            key={attribute.id}
                            className={cn(
                              'text-center border-l border-border/40',
                              rowError ? 'bg-destructive/10' : cellShade(rowOdd, colOdd)
                            )}
                          >
                            <Checkbox
                              checked={rowSet.has(attribute.id)}
                              onCheckedChange={() => toggleCell(product.product_id, attribute.id)}
                              disabled={saving}
                              aria-label={`${attribute.name || attribute.title} — ${product.name}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="bg-gradient-primary"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer ({dirty.size} modification{dirty.size > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
