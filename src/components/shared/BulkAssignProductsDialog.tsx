// Load products on demand for bulk assignment dialog
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@/types/menu';
import { Search, Loader2 } from 'lucide-react';
import { menuService } from '@/services/menuService';

interface BulkAssignProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products?: Product[]; // Optional - will be loaded if not provided
  loading?: boolean;
  onConfirm: (selectedProductIds: string[]) => Promise<void>;
}

export function BulkAssignProductsDialog({
  open,
  onOpenChange,
  categoryName,
  products: initialProducts,
  loading = false,
  onConfirm,
}: BulkAssignProductsDialogProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  // Load products when dialog opens and no initial products provided
  useEffect(() => {
    if (open && !initialProducts && products.length === 0) {
      setLoadingProducts(true);
      menuService.getProducts()
        .then(setProducts)
        .catch((error) => {
          console.error('Error loading products:', error);
          setProducts([]);
        })
        .finally(() => setLoadingProducts(false));
    } else if (initialProducts) {
      setProducts(initialProducts);
    }
  }, [open, initialProducts, products.length]);

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.product_id?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.product_id)));
    }
  };

  const handleConfirm = async () => {
    setIsAssigning(true);
    try {
      await onConfirm(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchTerm('');
      onOpenChange(false);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assigner des produits à "{categoryName}"</DialogTitle>
          <DialogDescription>
            Sélectionnez les produits à assigner à cette catégorie
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des produits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 px-2 py-2 border-b">
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
              indeterminate={selectedIds.size > 0 && selectedIds.size < filteredProducts.length}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium cursor-pointer">
              Sélectionner tout ({filteredProducts.length})
            </label>
          </div>

          {/* Products List */}
          <ScrollArea className="h-64 border rounded-md">
            {loadingProducts ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucun produit trouvé
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleToggleProduct(product.product_id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(product.product_id)}
                      onCheckedChange={() => handleToggleProduct(product.product_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.product_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selection Counter */}
          <div className="flex items-center justify-between px-2 py-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} produit{selectedIds.size !== 1 ? 's' : ''} sélectionné{selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning || loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || isAssigning || loading}
            className="bg-gradient-primary"
          >
            {isAssigning || loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isAssigning || loading ? 'Assignation...' : 'Assigner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
