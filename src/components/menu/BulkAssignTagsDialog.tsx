import { useState, useEffect } from 'react';
import { Tag, Product } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMenuData } from '@/hooks/useMenuData';
import { menuService } from '@/services/menuService';

interface BulkAssignTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
}

export const BulkAssignTagsDialog = ({
  open,
  onOpenChange,
  tags,
}: BulkAssignTagsDialogProps) => {
  const { menuData } = useMenuData();
  const { toast } = useToast();
  
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTagsQuery, setSearchTagsQuery] = useState('');
  const [searchProductsQuery, setSearchProductsQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Extract all products from menuData
  useEffect(() => {
    if (menuData.products_types) {
      const products: Product[] = [];
      menuData.products_types.forEach((category) => {
        if (category.products) {
          products.push(...category.products);
        }
      });
      setAllProducts(products);
    }
  }, [menuData]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTagsQuery.toLowerCase())
  );

  const filteredProducts = allProducts.filter((product) =>
    (product.name || '')
      .toLowerCase()
      .includes(searchProductsQuery.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAllTags = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map((tag) => tag.id)));
    }
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((product) => product.product_id)));
    }
  };

  const handleAssign = async () => {
    if (selectedTags.size === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un tag',
        variant: 'destructive',
      });
      return;
    }

    if (selectedProducts.size === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un produit',
        variant: 'destructive',
      });
      return;
    }

    setIsAssigning(true);
    try {
      await menuService.assignTagsToProducts(
        Array.from(selectedProducts),
        Array.from(selectedTags)
      );
      toast({
        title: 'Succès',
        description: `${selectedProducts.size} produit(s) ont reçu ${selectedTags.size} tag(s)`,
      });
      setSelectedTags(new Set());
      setSelectedProducts(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning tags:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner les tags aux produits',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assigner des Tags en Masse</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
          {/* Tags Selection */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div>
              <Label className="text-sm font-semibold text-foreground">
                Tags ({selectedTags.size} sélectionnés)
              </Label>
            </div>
            <Input
              placeholder="Chercher des tags..."
              value={searchTagsQuery}
              onChange={(e) => setSearchTagsQuery(e.target.value)}
              className="h-9"
            />
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id="select-all-tags"
                checked={
                  selectedTags.size > 0 && selectedTags.size === filteredTags.length
                }
                onCheckedChange={toggleAllTags}
              />
              <Label htmlFor="select-all-tags" className="text-xs cursor-pointer">
                Sélectionner tous ({filteredTags.length})
              </Label>
            </div>
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-3 space-y-2">
                {filteredTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun tag trouvé</p>
                ) : (
                  filteredTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTags.has(tag.id)}
                        onCheckedChange={() => toggleTag(tag.id)}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                        {tag.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Products Selection */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div>
              <Label className="text-sm font-semibold text-foreground">
                Produits ({selectedProducts.size} sélectionnés)
              </Label>
            </div>
            <Input
              placeholder="Chercher des produits..."
              value={searchProductsQuery}
              onChange={(e) => setSearchProductsQuery(e.target.value)}
              className="h-9"
            />
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id="select-all-products"
                checked={
                  selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length
                }
                onCheckedChange={toggleAllProducts}
              />
              <Label htmlFor="select-all-products" className="text-xs cursor-pointer">
                Sélectionner tous ({filteredProducts.length})
              </Label>
            </div>
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-3 space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun produit trouvé</p>
                ) : (
                  filteredProducts.map((product) => (
                    <div key={product.product_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.product_id}`}
                        checked={selectedProducts.has(product.product_id)}
                        onCheckedChange={() => toggleProduct(product.product_id)}
                      />
                      <Label
                        htmlFor={`product-${product.product_id}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {product.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || selectedTags.size === 0 || selectedProducts.size === 0}
            className="bg-gradient-primary"
          >
            {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assigner ({selectedProducts.size} produit{selectedProducts.size !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
