import { useEffect, useState } from 'react';
import { Allergen, Product } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { menuService } from '@/services/menuService';

interface AllergensMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onProductsUpdated: (updates: { product_id: string; allergens: string[] }[]) => void;
}

// Nombre de requêtes PUT envoyées en parallèle lors de l'enregistrement.
const SAVE_CONCURRENCY = 4;

const getAllergenIds = (product: Product): string[] =>
  (product.allergens || []).map(a => (typeof a === 'string' ? a : a.allergen_id));

export const AllergensMatrixDialog = ({
  open,
  onOpenChange,
  products,
  onProductsUpdated,
}: AllergensMatrixDialogProps) => {
  const { toast } = useToast();

  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loadingAllergens, setLoadingAllergens] = useState(false);
  const [matrix, setMatrix] = useState<Map<string, Set<string>>>(new Map());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const validProducts = products.filter(p => !!p.product_id);

  // Capture un instantané des produits/allergènes uniquement à l'ouverture,
  // pour ne pas écraser les modifications en cours si le parent re-render.
  useEffect(() => {
    if (!open) return;

    const initialMatrix = new Map<string, Set<string>>();
    validProducts.forEach(p => {
      initialMatrix.set(p.product_id, new Set(getAllergenIds(p)));
    });
    setMatrix(initialMatrix);
    setDirty(new Set());
    setRowErrors(new Map());

    setLoadingAllergens(true);
    menuService
      .getAllergens()
      .then(setAllergens)
      .catch(() => {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la liste des allergènes',
          variant: 'destructive',
        });
      })
      .finally(() => setLoadingAllergens(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCell = (productId: string, allergenId: string) => {
    if (saving) return;
    setMatrix(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(productId) ?? []);
      if (current.has(allergenId)) {
        current.delete(allergenId);
      } else {
        current.add(allergenId);
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

    const succeeded: { product_id: string; allergens: string[] }[] = [];
    const failedIds: string[] = [];

    let cursor = 0;
    const worker = async () => {
      while (cursor < dirtyIds.length) {
        const productId = dirtyIds[cursor++];
        const allergenIds = Array.from(matrix.get(productId) ?? []);
        try {
          await menuService.updateProductAllergens(productId, allergenIds);
          succeeded.push({ product_id: productId, allergens: allergenIds });
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

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      if (dirty.size > 0 && !(await saveDirtyChanges())) {
        // Échec partiel : le PDF refléterait des données obsolètes, on n'y va pas.
        return;
      }
      await menuService.downloadAllergensPoster();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de télécharger l'affiche des allergènes",
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && !downloadingPdf && onOpenChange(next)}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les allergènes</DialogTitle>
        </DialogHeader>

        {loadingAllergens ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : validProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun produit trouvé</div>
        ) : (
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="sticky left-0 z-20 bg-muted min-w-[220px]">
                    Produit
                  </TableHead>
                  {allergens.map(allergen => (
                    <TableHead
                      key={allergen.allergen_id}
                      className="bg-muted/40 text-center align-bottom w-28 text-xs leading-tight whitespace-normal"
                    >
                      {allergen.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {validProducts.map(product => {
                  const rowSet = matrix.get(product.product_id) ?? new Set<string>();
                  const rowError = rowErrors.get(product.product_id);
                  return (
                    <TableRow key={product.product_id} className={rowError ? 'bg-destructive/5' : ''}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        {product.name}
                        {rowError && (
                          <p className="text-xs text-destructive mt-0.5">{rowError}</p>
                        )}
                      </TableCell>
                      {allergens.map(allergen => (
                        <TableCell key={allergen.allergen_id} className="text-center">
                          <Checkbox
                            checked={rowSet.has(allergen.allergen_id)}
                            onCheckedChange={() => toggleCell(product.product_id, allergen.allergen_id)}
                            disabled={saving}
                            aria-label={`${allergen.name} — ${product.name}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || saving}
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Télécharger le PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || downloadingPdf}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || downloadingPdf || dirty.size === 0}
              className="bg-gradient-primary"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer ({dirty.size} modification{dirty.size > 1 ? 's' : ''})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
