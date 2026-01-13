import { useState, useEffect } from 'react';
import { Product, TvaRateGroup, UnitOfMeasure, Component, Attribute } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Edit, Save, X } from 'lucide-react';
import { ProductCompositionTab } from './ProductCompositionTab';
import { ProductOptionsTab } from './ProductOptionsTab';

interface ProductDetailsSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tvaRates: TvaRateGroup[];
  units: UnitOfMeasure[];
  components: Component[];
  attributes: Attribute[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
}

export const ProductDetailsSheet = ({
  product,
  open,
  onOpenChange,
  tvaRates,
  units,
  components,
  attributes,
  onSave
}: ProductDetailsSheetProps) => {
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="price">Tarifs</TabsTrigger>
            <TabsTrigger value="composition">Composition</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-4">
                <div>
                  <Label>Image</Label>
                  <div className="mt-2 w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    {product.bg_color ? (
                      <div 
                        className="w-full h-full rounded-lg" 
                        style={{ backgroundColor: product.bg_color }}
                      />
                    ) : (
                      <p className="text-muted-foreground">Aucune image</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Nom</Label>
                  <p className="mt-1 text-foreground">{product.name}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-foreground">{product.description || 'Aucune description'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Image</Label>
                  <div className="mt-2 w-full h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground">Glisser-déposer une image ici</p>
                  </div>
                </div>
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
                  <Label>Couleur de fond</Label>
                  <Input
                    type="color"
                    value={formData.bg_color || '#ffffff'}
                    onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-4">
                <div>
                  <Label>Prix Standard</Label>
                  <p className="mt-1 text-foreground">{((product.price || 0) / 100).toFixed(2)} €</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sur Place</Label>
                    <div className="flex items-center gap-4">
                      <span>{product.availability?.on_site ? '✓' : '✗'}</span>
                      <span>{((product.price || 0) / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Emporter</Label>
                    <div className="flex items-center gap-4">
                      <span>{product.availability?.takeaway ? '✓' : '✗'}</span>
                      <span>{((product.price || 0) / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Livraison</Label>
                    <div className="flex items-center gap-4">
                      <span>{product.availability?.delivery ? '✓' : '✗'}</span>
                      <span>{((product.price || 0) / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Prix Standard (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={((formData.price || 0) / 100).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, price: Math.round(parseFloat(e.target.value) * 100) })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sur Place</Label>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={formData.availability?.on_site || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          availability: { ...formData.availability!, on_site: checked }
                        })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={((formData.price || 0) / 100).toFixed(2)}
                        onChange={(e) => setFormData({ ...formData, price: Math.round(parseFloat(e.target.value) * 100) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Emporter</Label>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={formData.availability?.takeaway || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          availability: { ...formData.availability!, takeaway: checked }
                        })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={((formData.price || 0) / 100).toFixed(2)}
                        onChange={(e) => setFormData({ ...formData, price: Math.round(parseFloat(e.target.value) * 100) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Livraison</Label>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={formData.availability?.delivery || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          availability: { ...formData.availability!, delivery: checked }
                        })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={((formData.price || 0) / 100).toFixed(2)}
                        onChange={(e) => setFormData({ ...formData, price: Math.round(parseFloat(e.target.value) * 100) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">UE</span>
                        </div>
                        Uber Eats
                      </CardTitle>
                      <CardDescription>
                        Configuration du prix pour Uber Eats
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Activer sur Uber Eats</Label>
                        <Switch
                          checked={formData.integrations?.uber_eats?.enabled || false}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            integrations: {
                              ...formData.integrations,
                              uber_eats: {
                                ...formData.integrations?.uber_eats,
                                enabled: checked,
                                id: formData.integrations?.uber_eats?.id || ''
                              }
                            }
                          })}
                        />
                      </div>
                      {formData.integrations?.uber_eats?.enabled && (
                        <div>
                          <Label>Prix Uber Eats (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((formData.integrations?.uber_eats?.price_override || formData.price || 0) / 100).toFixed(2)}
                            onChange={(e) => setFormData({
                              ...formData,
                              integrations: {
                                ...formData.integrations,
                                uber_eats: {
                                  ...formData.integrations?.uber_eats!,
                                  price_override: Math.round(parseFloat(e.target.value) * 100)
                                }
                              }
                            })}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="w-8 h-8 bg-[#00CCBC] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">D</span>
                        </div>
                        Deliveroo
                      </CardTitle>
                      <CardDescription>
                        Configuration du prix pour Deliveroo
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Activer sur Deliveroo</Label>
                        <Switch
                          checked={formData.integrations?.deliveroo?.enabled || false}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            integrations: {
                              ...formData.integrations,
                              deliveroo: {
                                ...formData.integrations?.deliveroo,
                                enabled: checked,
                                id: formData.integrations?.deliveroo?.id || ''
                              }
                            }
                          })}
                        />
                      </div>
                      {formData.integrations?.deliveroo?.enabled && (
                        <div>
                          <Label>Prix Deliveroo (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((formData.integrations?.deliveroo?.price_override || formData.price || 0) / 100).toFixed(2)}
                            onChange={(e) => setFormData({
                              ...formData,
                              integrations: {
                                ...formData.integrations,
                                deliveroo: {
                                  ...formData.integrations?.deliveroo!,
                                  price_override: Math.round(parseFloat(e.target.value) * 100)
                                }
                              }
                            })}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="composition">
            <ProductCompositionTab
              composition={formData.composition || []}
              components={components}
              units={units}
              onChange={(composition) => setFormData({ ...formData, composition })}
              disabled={!isEditMode}
            />
          </TabsContent>

          <TabsContent value="options">
            <ProductOptionsTab
              productAttributes={formData.attributes || []}
              availableAttributes={attributes}
              onChange={(attributes) => setFormData({ ...formData, attributes })}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
