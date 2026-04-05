import { useState, useEffect, useRef } from 'react';
import { Product, TvaRateGroup, UnitOfMeasure, Component, Attribute, Category, Tag, Allergen } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Edit, Save, X, ImageIcon, Loader2, Plus } from 'lucide-react';
import { ProductCompositionTab } from './ProductCompositionTab';
import { ProductOptionsTab } from './ProductOptionsTab';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

interface SimpleProductSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tvaRates: TvaRateGroup[];
  units: UnitOfMeasure[];
  components: Component[];
  attributes: Attribute[];
  categories: Category[];
  tags: Tag[];
  allergens: Allergen[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
  onTagCreated?: (newTag: { id: string; name: string }) => void;
}

export const SimpleProductSheet = ({
  product,
  open,
  onOpenChange,
  tvaRates,
  units,
  components,
  attributes,
  categories,
  tags,
  allergens,
  onSave,
  onCreateCategory,
  onTagCreated
}: SimpleProductSheetProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData(product);
      setIsEditMode(false);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [product]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleSave = async () => {
    if (!product) return;

    setIsUploadingImage(true);
    try {
      // Upload image first if it has changed
      if (selectedImageFile) {
        const result = await menuService.uploadProductImage(product.product_id, selectedImageFile);
        formData.image_url = result.photo_url;
      }

      // Build payload - keep all formData fields but ensure IDs-only arrays for specific fields
      const payloadData = { ...formData } as Partial<Product>;
      
      // Ensure configuration only contains attribute IDs (strings)
      if (formData.attributes && formData.attributes.length > 0) {
        payloadData.configuration = formData.attributes.map(attr => attr.attribute_id);
      } else {
        payloadData.configuration = [];
      }
      
      // Ensure tags only contains IDs (strings)
      payloadData.tags = Array.isArray(formData.tags) 
        ? formData.tags.filter(tag => typeof tag === 'string')
        : [];
      
      // Ensure allergens only contains IDs (strings)
      payloadData.allergens = Array.isArray(formData.allergens)
        ? formData.allergens.filter(allergen => typeof allergen === 'string')
        : [];

      // Save all product data
      await onSave(product.product_id, payloadData);
      
      // Clear image state after successful save
      setSelectedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsEditMode(false);

      toast({
        title: "Succès",
        description: "Le produit a été enregistré avec succès."
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer le produit.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom pour le tag.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingTag(true);
    try {
      const newTag = await menuService.createTag(newTagName);
      setNewTagName('');
      toast({
        title: "Succès",
        description: "Le tag a été créé avec succès."
      });
      // Update parent's tags list
      if (onTagCreated) {
        onTagCreated(newTag);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le tag.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCancel = () => {
    if (product) {
      setFormData(product);
      setIsEditMode(false);
      setSelectedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier JPG, PNG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5 MB max)
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale autorisée est de 5 Mo. Votre fichier fait ${(file.size / 1024 / 1024).toFixed(2)} Mo.`,
        variant: "destructive"
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setSelectedImageFile(file);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle>{product.name}</SheetTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant={product.integrations?.uber_eats?.enabled ? "default" : "secondary"}>
                  Uber Eats
                </Badge>
                <Badge variant={product.integrations?.deliveroo?.enabled ? "default" : "secondary"}>
                  Deliveroo
                </Badge>
              </div>
            </div>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="price">Tarifs</TabsTrigger>
            <TabsTrigger value="composition">Composition</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="tags">Tags & Allergènes</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-4">
                {/* Image and Name/Description Side by Side */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-32 h-32">
                    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : product.bg_color ? (
                        <div 
                          className="w-full h-full rounded-lg" 
                          style={{ backgroundColor: product.bg_color }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                          <ImageIcon className="w-8 h-8" />
                          <p>Aucune image</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs font-semibold">Nom</Label>
                      <p className="mt-1 text-foreground font-medium">{product.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Description</Label>
                      <p className="mt-1 text-foreground text-sm">{product.description || 'Aucune description'}</p>
                    </div>
                  </div>
                </div>
                {/* Category and Background Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Catégorie</Label>
                    <p className="mt-1 text-foreground">
                      {categories.find(c => c.category_id === product.category_id)?.category_name || 'Non défini'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Couleur de fond</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full border border-input"
                        style={{ backgroundColor: product.bg_color || '#ffffff' }}
                      />
                      <p className="text-foreground text-sm">{product.bg_color || '#ffffff'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image and Name/Description Side by Side */}
                <div className="flex gap-4">
                  <div 
                    className="flex-shrink-0 w-32 h-32 cursor-pointer"
                    onClick={handleImageClick}
                  >
                    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed hover:border-primary transition-colors">
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                      {imagePreviewUrl ? (
                        <img 
                          src={imagePreviewUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : formData.image_url ? (
                        <img 
                          src={formData.image_url} 
                          alt={formData.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : formData.bg_color ? (
                        <div 
                          className="w-full h-full rounded-lg" 
                          style={{ backgroundColor: formData.bg_color }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                          <ImageIcon className="w-6 h-6" />
                          <p>Cliquer pour ajouter</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
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
                        className="resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageSelect}
                  disabled={isUploadingImage}
                  className="hidden"
                />

                {/* Category and Background Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Catégorie</Label>
                    <CategorySelector
                      categories={categories}
                      value={formData.category_id || ''}
                      onValueChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
                      onCreateCategory={onCreateCategory}
                    />
                  </div>
                  <div>
                    <Label>Couleur de fond</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={formData.bg_color || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                        className="w-12 h-10 rounded-full cursor-pointer"
                      />
                      <Input
                        value={formData.bg_color || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="space-y-4">
            {/* Base Pricing - Always Visible */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sur Place</Label>
                <div className="flex items-center gap-4">
                  {isEditMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span>{product.availability?.on_site ? '✓' : '✗'}</span>
                      <span className="font-medium">{((product.price || 0) / 100).toFixed(2)} €</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Emporter</Label>
                <div className="flex items-center gap-4">
                  {isEditMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span>{product.availability?.takeaway ? '✓' : '✗'}</span>
                      <span className="font-medium">{((product.price || 0) / 100).toFixed(2)} €</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Livraison</Label>
                <div className="flex items-center gap-4">
                  {isEditMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span>{product.availability?.delivery ? '✓' : '✗'}</span>
                      <span className="font-medium">{((product.price || 0) / 100).toFixed(2)} €</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Uber Eats - Always Visible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">UE</span>
                  </div>
                  Uber Eats
                </CardTitle>
                <CardDescription>
                  Configuration de synchronisation et prix
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Activer sur Uber Eats</Label>
                  {isEditMode ? (
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
                  ) : (
                    <span className="font-medium">{product.integrations?.uber_eats?.enabled ? '✓' : '✗'}</span>
                  )}
                </div>
                {(product.integrations?.uber_eats?.enabled || formData.integrations?.uber_eats?.enabled) && (
                  <div>
                    <Label>Prix Uber Eats (€)</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={((formData.integrations?.uber_eats?.price_override || formData.price || 0) / 100).toFixed(2)}
                        onChange={(e) => setFormData({
                          ...formData,
                          integrations: {
                            ...formData.integrations,
                            uber_eats: {
                              ...(formData.integrations?.uber_eats || {}),
                              price_override: Math.round(parseFloat(e.target.value) * 100)
                            }
                          }
                        })}
                      />
                    ) : (
                      <p className="mt-1 text-foreground font-medium">{((product.integrations?.uber_eats?.price_override || product.price || 0) / 100).toFixed(2)} €</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deliveroo - Always Visible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 bg-[#00CCBC] rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">D</span>
                  </div>
                  Deliveroo
                </CardTitle>
                <CardDescription>
                  Configuration de synchronisation et prix
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Activer sur Deliveroo</Label>
                  {isEditMode ? (
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
                  ) : (
                    <span className="font-medium">{product.integrations?.deliveroo?.enabled ? '✓' : '✗'}</span>
                  )}
                </div>
                {(product.integrations?.deliveroo?.enabled || formData.integrations?.deliveroo?.enabled) && (
                  <div>
                    <Label>Prix Deliveroo (€)</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={((formData.integrations?.deliveroo?.price_override || formData.price || 0) / 100).toFixed(2)}
                        onChange={(e) => setFormData({
                          ...formData,
                          integrations: {
                            ...formData.integrations,
                            deliveroo: {
                              ...(formData.integrations?.deliveroo || {}),
                              price_override: Math.round(parseFloat(e.target.value) * 100)
                            }
                          }
                        })}
                      />
                    ) : (
                      <p className="mt-1 text-foreground font-medium">{((product.integrations?.deliveroo?.price_override || product.price || 0) / 100).toFixed(2)} €</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
              disabled={!isEditMode}
            />
          </TabsContent>

          <TabsContent value="tags" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Allergens Column */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Allergènes ({allergens.length})</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                  {allergens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun allergène disponible</p>
                  ) : (
                    allergens.map((allergen) => (
                      <div key={allergen.allergen_id} className="flex items-center gap-2">
                        {isEditMode ? (
                          <input
                            type="checkbox"
                            id={`allergen-${allergen.allergen_id}`}
                            checked={formData.allergens?.includes(allergen.allergen_id) || false}
                            onChange={(e) => {
                              const newAllergens = e.target.checked
                                ? [...(formData.allergens || []), allergen.allergen_id]
                                : (formData.allergens || []).filter(a => a !== allergen.allergen_id);
                              setFormData({ ...formData, allergens: newAllergens });
                            }}
                            className="rounded"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            id={`allergen-${allergen.allergen_id}`}
                            checked={product.allergens?.includes(allergen.allergen_id) || false}
                            disabled
                            className="rounded"
                          />
                        )}
                        <label
                          htmlFor={`allergen-${allergen.allergen_id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {allergen.name}
                          {allergen.icon && <span className="ml-1">{allergen.icon}</span>}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tags Column */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Tags</h3>
                
                {/* Create Tag Form - Only in edit mode */}
                {isEditMode && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajouter un tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTag();
                        }
                      }}
                      disabled={isCreatingTag}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleCreateTag}
                      disabled={isCreatingTag || !newTagName.trim()}
                      size="sm"
                      variant="outline"
                      className="px-3"
                    >
                      {isCreatingTag ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Tags List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                  {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun tag disponible</p>
                  ) : (
                    tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        {isEditMode ? (
                          <input
                            type="checkbox"
                            id={`tag-${tag.id}`}
                            checked={formData.tags?.includes(tag.id) || false}
                            onChange={(e) => {
                              const newTags = e.target.checked
                                ? [...(formData.tags || []), tag.id]
                                : (formData.tags || []).filter(t => t !== tag.id);
                              setFormData({ ...formData, tags: newTags });
                            }}
                            className="rounded"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            id={`tag-${tag.id}`}
                            checked={product.tags?.includes(tag.id) || false}
                            disabled
                            className="rounded"
                          />
                        )}
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {tag.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
