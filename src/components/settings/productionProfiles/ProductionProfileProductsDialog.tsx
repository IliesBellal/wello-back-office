import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { qk } from '@/lib/queryKeys';
import { menuService } from '@/services/menuService';
import { productionProfileService } from '@/services/productionProfileService';
import type { ProductionProfileEntry, ProductionProfileProductEntry } from '@/types/productionProfiles';

interface ProductionProfileProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ProductionProfileEntry;
}

interface ProfileFlags {
  should_produce: boolean;
  should_monitor: boolean;
}

export function ProductionProfileProductsDialog({
  open,
  onOpenChange,
  profile,
}: ProductionProfileProductsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [matrix, setMatrix] = useState<Map<string, ProfileFlags>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Full product catalog — a lightweight react-query wrapper around
  // menuService.getProducts() rather than the whole useMenuData hook, since
  // this dialog doesn't need units/components/attributes/tags.
  const productsQuery = useQuery({
    queryKey: qk.menuProducts.all,
    queryFn: () => menuService.getProducts(),
    enabled: open,
  });

  // This profile's current (sparse) associations.
  const detailQuery = useQuery({
    queryKey: qk.productionProfiles.detail(profile?.id ?? ''),
    queryFn: () => productionProfileService.getProfile(profile!.id),
    enabled: open && Boolean(profile),
  });

  const mutation = useMutation({
    mutationFn: (items: ProductionProfileProductEntry[]) =>
      productionProfileService.replaceProducts(profile!.id, items),
    onSuccess: () => {
      toast({ title: 'Produits mis à jour' });
      queryClient.invalidateQueries({ queryKey: qk.productionProfiles.detail(profile!.id) });
      queryClient.invalidateQueries({ queryKey: qk.productionProfiles.all });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les produits du profil.',
        variant: 'destructive',
      });
    },
  });

  // Reset on close so the next open re-snapshots from fresh data.
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setMatrix(new Map());
      setDirty(false);
    }
  }, [open]);

  // Snapshot once catalog + current associations have both arrived — not on
  // every background refetch, so it never clobbers in-progress edits (same
  // rationale as AllergensMatrixDialog/TagsMatrixDialog's open-only capture).
  useEffect(() => {
    if (!open || initialized) return;
    if (!productsQuery.data || !detailQuery.data) return;

    const initialMatrix = new Map<string, ProfileFlags>();
    productsQuery.data.forEach((product) => {
      initialMatrix.set(product.product_id, { should_produce: false, should_monitor: false });
    });
    detailQuery.data.products.forEach((p) => {
      initialMatrix.set(p.product_id, {
        should_produce: p.should_produce,
        should_monitor: p.should_monitor,
      });
    });
    setMatrix(initialMatrix);
    setInitialized(true);
  }, [open, initialized, productsQuery.data, detailQuery.data]);

  const toggleCell = (productId: string, field: keyof ProfileFlags) => {
    if (mutation.isPending) return;
    setMatrix((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) ?? { should_produce: false, should_monitor: false };
      next.set(productId, { ...current, [field]: !current[field] });
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    if (!profile) return;
    const items: ProductionProfileProductEntry[] = [];
    matrix.forEach((flags, productId) => {
      if (flags.should_produce || flags.should_monitor) {
        items.push({ product_id: productId, ...flags });
      }
    });
    mutation.mutate(items);
  };

  const isLoading = open && (productsQuery.isLoading || detailQuery.isLoading);
  const products = productsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Produits — {profile?.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun produit trouvé</div>
        ) : (
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="sticky left-0 z-20 bg-muted min-w-[220px]">
                    Produit
                  </TableHead>
                  <TableHead className="bg-muted/40 text-center w-32">À produire</TableHead>
                  <TableHead className="bg-muted/40 text-center w-32">À surveiller</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const flags = matrix.get(product.product_id) ?? {
                    should_produce: false,
                    should_monitor: false,
                  };
                  return (
                    <TableRow key={product.product_id}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={flags.should_produce}
                          onCheckedChange={() => toggleCell(product.product_id, 'should_produce')}
                          disabled={mutation.isPending}
                          aria-label={`À produire — ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={flags.should_monitor}
                          onCheckedChange={() => toggleCell(product.product_id, 'should_monitor')}
                          disabled={mutation.isPending}
                          aria-label={`À surveiller — ${product.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending || !dirty} className="bg-gradient-primary">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
