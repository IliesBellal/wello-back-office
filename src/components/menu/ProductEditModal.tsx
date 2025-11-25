import { useState, useEffect } from 'react';
import { Product, TvaRateGroup, UnitOfMeasure, Component, Attribute, ProductAttribute, ProductComposition } from '@/types/menu';
import { ProductOptionsTab } from './ProductOptionsTab';
import { ProductCompositionTab } from './ProductCompositionTab';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductEditModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tvaRates: TvaRateGroup[];
  units: UnitOfMeasure[];
  components: Component[];
  attributes: Attribute[];
  onSave: (productId: string, data: Partial<Product>) => void;
}

export const ProductEditModal = ({
  product,
  open,
  onOpenChange,
  tvaRates,
  units,
  components,
  attributes,
  onSave
}: ProductEditModalProps) => {
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  if (!product) return null;

  const handleSave = () => {
    onSave(product.id, formData);
    onOpenChange(false);
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return '';
    return (cents / 100).toFixed(2);
  };

  const parsePrice = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const getTvaRatesByType = (type: string) => {
    const group = tvaRates.find(g => 
      g.name.toLowerCase().includes(type.toLowerCase())
    );
    return group?.rates || [];
  };

  if (product.is_group) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce produit contient plusieurs articles :
            </p>
            <div className="space-y-2">
              {product.sub_products?.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-primary font-bold">
                      {formatPrice(sub.price)} €
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="pricing">Tarifs & TVA</TabsTrigger>
            <TabsTrigger value="availability">Disponibilité</TabsTrigger>
            <TabsTrigger value="composition">Composition</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bg_color">Couleur de fond</Label>
              <Input
                id="bg_color"
                type="color"
                value={formData.bg_color || '#ffffff'}
                onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix standard (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formatPrice(formData.price)}
                onChange={(e) => setFormData({ ...formData, price: parsePrice(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Prix en centimes : {formData.price || 0}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>TVA Sur Place</Label>
                <Select
                  value={formData.tva_ids?.on_site?.toString()}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    tva_ids: { ...formData.tva_ids!, on_site: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTvaRatesByType('sur place').map((rate) => (
                      <SelectItem key={rate.id} value={rate.id.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TVA Emporter</Label>
                <Select
                  value={formData.tva_ids?.takeaway?.toString()}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    tva_ids: { ...formData.tva_ids!, takeaway: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTvaRatesByType('emporter').map((rate) => (
                      <SelectItem key={rate.id} value={rate.id.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TVA Livraison</Label>
                <Select
                  value={formData.tva_ids?.delivery?.toString()}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    tva_ids: { ...formData.tva_ids!, delivery: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTvaRatesByType('livraison').map((rate) => (
                      <SelectItem key={rate.id} value={rate.id.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Disponibilité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="on_site">Sur place</Label>
                  <Switch
                    id="on_site"
                    checked={formData.availability?.on_site || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      availability: { ...formData.availability!, on_site: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="takeaway">Emporter</Label>
                  <Switch
                    id="takeaway"
                    checked={formData.availability?.takeaway || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      availability: { ...formData.availability!, takeaway: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="delivery">Livraison</Label>
                  <Switch
                    id="delivery"
                    checked={formData.availability?.delivery || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      availability: { ...formData.availability!, delivery: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="scan_order">Scan & Order</Label>
                  <Switch
                    id="scan_order"
                    checked={formData.availability?.scan_order || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      availability: { ...formData.availability!, scan_order: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uber Eats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="uber_eats_enabled">Activer sur Uber Eats</Label>
                  <Switch
                    id="uber_eats_enabled"
                    checked={formData.integrations?.uber_eats?.enabled || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      integrations: {
                        ...formData.integrations,
                        uber_eats: { ...formData.integrations?.uber_eats, enabled: checked }
                      }
                    })}
                  />
                </div>

                {formData.integrations?.uber_eats?.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="uber_price">Prix Uber Eats (€)</Label>
                    <Input
                      id="uber_price"
                      type="number"
                      step="0.01"
                      value={formatPrice(formData.integrations?.uber_eats?.price_override)}
                      onChange={(e) => setFormData({
                        ...formData,
                        integrations: {
                          ...formData.integrations,
                          uber_eats: {
                            ...formData.integrations?.uber_eats!,
                            price_override: parsePrice(e.target.value)
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
                <CardTitle className="text-base">Deliveroo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="deliveroo_enabled">Activer sur Deliveroo</Label>
                  <Switch
                    id="deliveroo_enabled"
                    checked={formData.integrations?.deliveroo?.enabled || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      integrations: {
                        ...formData.integrations,
                        deliveroo: { ...formData.integrations?.deliveroo, enabled: checked }
                      }
                    })}
                  />
                </div>

                {formData.integrations?.deliveroo?.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="deliveroo_price">Prix Deliveroo (€)</Label>
                    <Input
                      id="deliveroo_price"
                      type="number"
                      step="0.01"
                      value={formatPrice(formData.integrations?.deliveroo?.price_override)}
                      onChange={(e) => setFormData({
                        ...formData,
                        integrations: {
                          ...formData.integrations,
                          deliveroo: {
                            ...formData.integrations?.deliveroo!,
                            price_override: parsePrice(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="composition" className="space-y-4">
            <ProductCompositionTab
              composition={formData.composition || []}
              components={components}
              units={units}
              onChange={(composition) => setFormData({ ...formData, composition })}
            />
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <ProductOptionsTab
              productAttributes={formData.attributes || []}
              availableAttributes={attributes}
              onChange={(attributes) => setFormData({ ...formData, attributes })}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary">
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
