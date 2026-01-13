import { useState, useEffect } from 'react';
import { Product, Category } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { CategorySelector } from '@/components/shared/CategorySelector';

interface GroupProductSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
  onCreateCategory: (name: string) => Promise<any>;
}

export const GroupProductSheet = ({
  product,
  open,
  onOpenChange,
  categories,
  onSave,
  onCreateCategory
}: GroupProductSheetProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    if (product) {
      setFormData(product);
      setIsEditMode(false);
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    await onSave(product.product_id, formData);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    if (product) {
      setFormData(product);
      setIsEditMode(false);
    }
  };

  const handleAddSubProduct = () => {
    const newSubProduct = {
      id: `sp_${Date.now()}`,
      name: '',
      price: 0
    };
    setFormData({
      ...formData,
      sub_products: [...(formData.sub_products || []), newSubProduct]
    });
  };

  const handleRemoveSubProduct = (id: string) => {
    setFormData({
      ...formData,
      sub_products: (formData.sub_products || []).filter(sp => sp.id !== id)
    });
  };

  const handleSubProductChange = (id: string, field: 'name' | 'price', value: string | number) => {
    setFormData({
      ...formData,
      sub_products: (formData.sub_products || []).map(sp =>
        sp.id === id ? { ...sp, [field]: value } : sp
      )
    });
  };

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{product.name}</SheetTitle>
            <div className="flex gap-2">
              {!isEditMode ? (
                <Button variant="outline" onClick={() => setIsEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="subproducts">Sous-produits</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <p className="mt-1 text-foreground">{product.name}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-foreground">{product.description || 'Aucune description'}</p>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <p className="mt-1 text-foreground">
                    {categories.find(c => c.category_id === product.category_id)?.category_name || 'Non défini'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <CategorySelector
                    categories={categories}
                    value={formData.category_id || ''}
                    onValueChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
                    onCreateCategory={onCreateCategory}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subproducts" className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-2">
                {(product.sub_products || []).map((subProduct) => (
                  <Card key={subProduct.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{subProduct.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {((subProduct.price || 0) / 100).toFixed(2)} €
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!product.sub_products || product.sub_products.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun sous-produit
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Sous-produits</Label>
                  <Button variant="outline" size="sm" onClick={handleAddSubProduct}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.sub_products || []).map((subProduct) => (
                    <Card key={subProduct.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label>Nom</Label>
                              <Input
                                value={subProduct.name}
                                onChange={(e) => handleSubProductChange(subProduct.id, 'name', e.target.value)}
                                placeholder="Nom du sous-produit"
                              />
                            </div>
                            <div className="w-32">
                              <Label>Prix (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={((subProduct.price || 0) / 100).toFixed(2)}
                                onChange={(e) => handleSubProductChange(
                                  subProduct.id,
                                  'price',
                                  Math.round(parseFloat(e.target.value) * 100)
                                )}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSubProduct(subProduct.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!formData.sub_products || formData.sub_products.length === 0) && (
                    <p className="text-muted-foreground text-center py-8">
                      Aucun sous-produit. Cliquez sur "Ajouter" pour en créer un.
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
