import { useEffect, useState } from 'react';
import { Tag, Product } from '@/types/menu';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { menuService } from '@/services/menuService';

interface TagsMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  tags: Tag[];
  onProductsUpdated: (updates: { product_id: string; tags: string[] }[]) => void;
}

// Nombre de requêtes PUT envoyées en parallèle lors de l'enregistrement.
const SAVE_CONCURRENCY = 4;

const getTagIds = (product: Product): string[] =>
  (product.tags || []).map(t => (typeof t === 'string' ? t : t.id));

export const TagsMatrixDialog = ({
  open,
  onOpenChange,
  products,
  tags,
  onProductsUpdated,
}: TagsMatrixDialogProps) => {
  const { toast } = useToast();

  const [matrix, setMatrix] = useState<Map<string, Set<string>>>(new Map());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  const validProducts = products.filter(p => !!p.product_id);

  // Capture un instantané des produits/tags uniquement à l'ouverture,
  // pour ne pas écraser les modifications en cours si le parent re-render.
  useEffect(() => {
    if (!open) return;

    const initialMatrix = new Map<string, Set<string>>();
    validProducts.forEach(p => {
      initialMatrix.set(p.product_id, new Set(getTagIds(p)));
    });
    setMatrix(initialMatrix);
    setDirty(new Set());
    setRowErrors(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCell = (productId: string, tagId: string) => {
    if (saving) return;
    setMatrix(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(productId) ?? []);
      if (current.has(tagId)) {
        current.delete(tagId);
      } else {
        current.add(tagId);
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

    const succeeded: { product_id: string; tags: string[] }[] = [];
    const failedIds: string[] = [];

    let cursor = 0;
    const worker = async () => {
      while (cursor < dirtyIds.length) {
        const productId = dirtyIds[cursor++];
        const tagIds = Array.from(matrix.get(productId) ?? []);
        try {
          await menuService.updateProductTags(productId, tagIds);
          succeeded.push({ product_id: productId, tags: tagIds });
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
          <DialogTitle>Gérer les tags</DialogTitle>
        </DialogHeader>

        {tags.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun tag défini</div>
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
                  {tags.map(tag => (
                    <TableHead
                      key={tag.id}
                      className="bg-muted/40 text-center align-bottom w-28 text-xs leading-tight whitespace-normal"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {tag.color && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.name}
                      </div>
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
                      {tags.map(tag => (
                        <TableCell key={tag.id} className="text-center">
                          <Checkbox
                            checked={rowSet.has(tag.id)}
                            onCheckedChange={() => toggleCell(product.product_id, tag.id)}
                            disabled={saving}
                            aria-label={`${tag.name} — ${product.name}`}
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
