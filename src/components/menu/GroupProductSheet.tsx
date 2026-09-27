import { useEffect, useMemo, useRef, useState } from 'react';
import { Product, Category, ProductCreatePayload, GroupDeleteMode } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit, Save, X, Plus, Trash2, ImageIcon, Loader2, PenLine } from 'lucide-react';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { BulkAssignProductsDialog } from '@/components/shared/BulkAssignProductsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useObjectUrlPreview } from '@/hooks/useObjectUrlPreview';
import { useProductEditData } from '@/hooks/useProductEditData';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

interface GroupProductSheetProps {
  /** null en mode création (rien à afficher tant que le groupe n'existe pas). */
  product: Product | null;
  createMode?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Catalogue complet (racines + sous-produits), pour le picker d'ajout. */
  allProducts: Product[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
  onCreate: (data: ProductCreatePayload) => Promise<Product>;
  onDelete: (groupId: string, subProductIds: string[], mode: GroupDeleteMode) => Promise<void>;
  onSetMembers: (groupId: string, addIds: string[], removeIds: string[]) => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
  /** Ferme cette fiche et ouvre la fiche produit normale sur ce sous-produit. */
  onOpenProduct: (productId: string) => void;
}

/** Choix proposés à la suppression d'un groupe qui a des sous-produits. */
const DELETE_MODE_CHOICES: { value: GroupDeleteMode; label: string; hint: string }[] = [
  {
    value: 'detach',
    label: 'Sortir du groupe',
    hint: 'Ils redeviennent des produits indépendants, toujours en vente.',
  },
  {
    value: 'deactivate',
    label: 'Sortir et désactiver',
    hint: 'Ils redeviennent indépendants mais sont retirés du menu de vente. Ils restent dans le catalogue, prêts à être réactivés.',
  },
  {
    value: 'delete',
    label: 'Supprimer',
    hint: 'Ils sont supprimés avec le groupe.',
  },
];

const DRAFT: Partial<Product> = {
  name: '',
  description: '',
  category_id: '',
  bg_color: '#e5e7eb',
  available_in: true,
  available_take_away: true,
  available_delivery: true,
  is_available_on_sno: true,
};

export const GroupProductSheet = ({
  product,
  createMode = false,
  open,
  onOpenChange,
  categories,
  allProducts,
  onSave,
  onCreate,
  onDelete,
  onSetMembers,
  onCreateCategory,
  onOpenProduct,
}: GroupProductSheetProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<GroupDeleteMode>('detach');
  const [isDeleting, setIsDeleting] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { tvaRates } = useProductEditData(open);
  const imagePreviewUrl = useObjectUrlPreview(selectedImageFile);

  // Le groupe créé prend le relais dès que la création aboutit : la fiche
  // reste ouverte et se comporte alors comme une fiche d'édition normale.
  // createdProduct n'est qu'un instantané de la réponse de création : on lui
  // préfère sa version rechargée dans le catalogue, seule à porter les
  // sous-produits rattachés ensuite. L'image envoyée juste après la création
  // n'y figure qu'après un rechargement : on garde celle de l'instantané d'ici là.
  const liveCreatedProduct = useMemo(() => {
    if (!createdProduct) return null;
    const live = allProducts.find((p) => p.product_id === createdProduct.product_id);
    if (!live) return createdProduct;
    return live.image_url ? live : { ...live, image_url: createdProduct.image_url };
  }, [createdProduct, allProducts]);
  const activeProduct = liveCreatedProduct || product;
  const isCreateMode = createMode && !activeProduct;

  // Ouverture en création : repartir d'un brouillon vierge.
  useEffect(() => {
    if (!createMode || !open) return;
    setCreatedProduct(null);
    setFormData(DRAFT);
    setSelectedImageFile(null);
    setIsEditMode(true);
    setActiveTab('general');
  }, [createMode, open]);

  // Resynchronise le formulaire dès qu'un groupe réel devient la source de
  // vérité : un groupe existant qu'on ouvre/rafraîchit, ou celui qu'on vient
  // de créer (createdProduct prend le relais juste après handleCreate, ce qui
  // fait passer isCreateMode à false et déclenche cette resynchronisation).
  useEffect(() => {
    if (isCreateMode) return;
    if (activeProduct) {
      setFormData(activeProduct);
      setIsEditMode(false);
      setSelectedImageFile(null);
    }
  }, [activeProduct, isCreateMode]);

  const findTvaRates = (deliveryType: string) =>
    tvaRates.find((group) => group.delivery_type === deliveryType)?.rates || [];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedImageFile(file);
  };

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast({ title: 'Champ manquant', description: 'Le nom du groupe est requis.', variant: 'destructive' });
      return;
    }
    if (!formData.category_id) {
      toast({ title: 'Champ manquant', description: 'La catégorie est requise.', variant: 'destructive' });
      return;
    }
    // Un groupe n'a pas de prix de vente propre (chaque sous-produit porte le
    // sien) mais l'API exige quand même une catégorie TVA valide sur chaque
    // canal à la création : on prend le premier taux actif de chaque canal,
    // invisible pour l'utilisateur — cf. plan (INNER JOIN tva_categories sur
    // quasi toutes les lectures produit côté API, un tva_in_id=0 ferait
    // disparaître le groupe de toutes les listes).
    const tvaIn = findTvaRates('IN')[0]?.id?.toString();
    const tvaTakeAway = findTvaRates('TAKE_AWAY')[0]?.id?.toString();
    const tvaDelivery = findTvaRates('DELIVERY')[0]?.id?.toString();
    if (!tvaIn || !tvaTakeAway || !tvaDelivery) {
      toast({ title: 'Erreur', description: 'Taux de TVA indisponibles, réessayez dans un instant.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const created = await onCreate({
        name: formData.name.trim(),
        description: formData.description || '',
        price: 0,
        price_take_away: 0,
        price_delivery: 0,
        category_id: formData.category_id,
        tva_in_id: tvaIn,
        tva_take_away_id: tvaTakeAway,
        tva_delivery_id: tvaDelivery,
        available_in: formData.available_in ?? true,
        available_take_away: formData.available_take_away ?? true,
        available_delivery: formData.available_delivery ?? true,
        is_product_group: true,
        bg_color: formData.bg_color,
        is_available_on_sno: formData.is_available_on_sno,
      });

      let imageUrl = created.image_url;
      if (selectedImageFile) {
        const result = await menuService.uploadProductImage(created.product_id, selectedImageFile);
        imageUrl = result.photo_url;
        setSelectedImageFile(null);
      }

      setCreatedProduct({ ...created, image_url: imageUrl });
      setIsEditMode(false);
      setActiveTab('subproducts');
    } catch {
      // apiClient affiche déjà un toast d'erreur spécifique (ex. nom en doublon).
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!activeProduct) return;
    setIsSaving(true);
    try {
      let imageUrl = formData.image_url;
      if (selectedImageFile) {
        const result = await menuService.uploadProductImage(activeProduct.product_id, selectedImageFile);
        imageUrl = result.photo_url;
      }

      const payload: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        category: formData.category_id,
        bg_color: formData.bg_color,
        image_url: imageUrl,
        available_in: formData.available_in,
        available_take_away: formData.available_take_away,
        available_delivery: formData.available_delivery,
        is_available_on_sno: formData.is_available_on_sno,
      };

      await onSave(activeProduct.product_id, payload);
      setFormData((prev) => ({ ...prev, image_url: imageUrl }));
      setSelectedImageFile(null);
      setIsEditMode(false);
      toast({ title: 'Succès', description: 'Groupe mis à jour avec succès.' });
    } catch (error) {
      // On reste en édition : la saisie n'est pas perdue et peut être renvoyée.
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible d'enregistrer le groupe.",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (activeProduct) {
      setFormData(activeProduct);
    }
    setSelectedImageFile(null);
    setIsEditMode(false);
  };

  const subProducts = activeProduct?.sub_products || [];
  const currentSubIds = useMemo(
    () => (activeProduct?.sub_products || []).map((sp) => sp.product_id || sp.id).filter((id): id is string => !!id),
    [activeProduct]
  );

  // Groupe actuel de chaque sous-produit du catalogue, d'après l'imbrication
  // renvoyée par l'API (même source que le tableau).
  const parentGroupNameById = useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p) => {
      if (!p.is_product_group) return;
      p.sub_products?.forEach((sp) => {
        const id = sp.product_id || sp.id;
        if (id) map.set(id, p.name);
      });
    });
    return map;
  }, [allProducts]);

  // Un groupe ne peut pas contenir un autre groupe, ni se contenir lui-même.
  // Seuls les produits de la catégorie du groupe sont proposés, plus ses
  // sous-produits actuels même rangés ailleurs : absents de la liste, ils ne
  // pourraient pas être décochés et seraient retirés du groupe à la validation.
  // Les sous-produits actuels (précochés) passent en tête, puis le reste par nom.
  const pickerCandidates = useMemo(() => {
    if (!activeProduct) return [];
    const current = new Set(currentSubIds);
    return allProducts
      .filter((p) => !p.is_product_group && p.product_id !== activeProduct.product_id)
      .filter((p) => current.has(p.product_id) || p.category_id === activeProduct.category_id)
      .sort((a, b) => {
        const rank = Number(!current.has(a.product_id)) - Number(!current.has(b.product_id));
        return rank || (a.name || '').localeCompare(b.name || '');
      });
  }, [allProducts, activeProduct, currentSubIds]);

  // Nom et vignette suffisent ; une seule ligne d'avertissement quand cocher
  // le produit le retirerait d'un autre groupe.
  const getPickerHint = (candidate: Product) => {
    const parentName = parentGroupNameById.get(candidate.product_id);
    if (!parentName || currentSubIds.includes(candidate.product_id)) return undefined;
    return `Dans le groupe « ${parentName} » — le cocher l'y retire`;
  };

  const handleConfirmMembers = async (selectedIds: string[]) => {
    if (!activeProduct) return;
    const addIds = selectedIds.filter((id) => !currentSubIds.includes(id));
    const removeIds = currentSubIds.filter((id) => !selectedIds.includes(id));
    if (addIds.length === 0 && removeIds.length === 0) return;
    await onSetMembers(activeProduct.product_id, addIds, removeIds);
  };

  const handleDetach = async (subProductId: string) => {
    if (!activeProduct) return;
    setDetachingId(subProductId);
    try {
      await onSetMembers(activeProduct.product_id, [], [subProductId]);
    } catch {
      // toast d'erreur déjà affiché par onSetMembers.
    } finally {
      setDetachingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeProduct) return;
    setIsDeleting(true);
    try {
      await onDelete(activeProduct.product_id, currentSubIds, deleteMode);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch {
      // toast d'erreur déjà géré par onDelete.
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isCreateMode && !activeProduct) return null;

  const title = isCreateMode ? 'Nouveau groupe de produits' : activeProduct?.name || '';

  const generalTab = (
    <TabsContent value="general" className="space-y-4 mt-4">
      {!isEditMode ? (
        <div className="space-y-4">
          {activeProduct?.image_url && (
            <img src={activeProduct.image_url} alt={activeProduct.name} className="w-full h-32 rounded-lg object-cover" />
          )}
          <div>
            <Label>Nom</Label>
            <p className="mt-1 text-foreground">{activeProduct?.name}</p>
          </div>
          <div>
            <Label>Description</Label>
            <p className="mt-1 text-foreground">{activeProduct?.description || 'Aucune description'}</p>
          </div>
          <div>
            <Label>Catégorie</Label>
            <p className="mt-1 text-foreground">
              {categories.find((c) => c.category_id === activeProduct?.category_id)?.category_name || 'Non défini'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sur place</Label>
              <p className="mt-1 text-foreground">{activeProduct?.available_in ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <Label>Emporter</Label>
              <p className="mt-1 text-foreground">{activeProduct?.available_take_away ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <Label>Livraison</Label>
              <p className="mt-1 text-foreground">{activeProduct?.available_delivery ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <Label>Scan &amp; Order</Label>
              <p className="mt-1 text-foreground">{activeProduct?.is_available_on_sno ? 'Oui' : 'Non'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="cursor-pointer w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30 relative"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : formData.image_url ? (
              <img src={formData.image_url} alt={formData.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground/70">Cliquer pour ajouter une image</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div>
            <Label>Nom</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex. Pizzas"
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
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Sur place</Label>
              <Switch
                checked={formData.available_in ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, available_in: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Emporter</Label>
              <Switch
                checked={formData.available_take_away ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, available_take_away: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Livraison</Label>
              <Switch
                checked={formData.available_delivery ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, available_delivery: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Scan &amp; Order</Label>
              <Switch
                checked={formData.is_available_on_sno ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available_on_sno: checked })}
              />
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );

  const subProductsTab = (
    <TabsContent value="subproducts" className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <Label>Sous-produits ({subProducts.length})</Label>
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {subProducts.map((subProduct) => {
          const subId = subProduct.product_id || subProduct.id || '';
          return (
            <Card key={subId}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex-1 min-w-0 flex items-center gap-3 text-left hover:underline"
                  onClick={() => onOpenProduct(subId)}
                >
                  {subProduct.image_url ? (
                    <img
                      src={subProduct.image_url}
                      alt={subProduct.name}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded shrink-0"
                      style={{ backgroundColor: subProduct.bg_color || '#e5e7eb' }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{subProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {((subProduct.price || 0) / 100).toFixed(2)} €
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" title="Modifier ce produit" onClick={() => onOpenProduct(subId)}>
                    <PenLine className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Retirer du groupe"
                    disabled={detachingId === subId}
                    onClick={() => handleDetach(subId)}
                  >
                    {detachingId === subId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {subProducts.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Aucun sous-produit. Cliquez sur « Ajouter » pour rattacher des produits existants du catalogue.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Retirer un sous-produit ne le supprime pas : il redevient un produit indépendant du catalogue.
      </p>
    </TabsContent>
  );

  const content = (
    <>
      {!isCreateMode && (
        <div className="flex items-center justify-end mb-2">
          <div className="flex gap-2">
            {!isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Toujours repartir du choix le moins destructeur.
                    setDeleteMode('detach');
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  Supprimer
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={isCreateMode ? 'grid w-full grid-cols-1' : 'grid w-full grid-cols-2'}>
          <TabsTrigger value="general">Général</TabsTrigger>
          {!isCreateMode && <TabsTrigger value="subproducts">Sous-produits</TabsTrigger>}
        </TabsList>
        {generalTab}
        {!isCreateMode && subProductsTab}
      </Tabs>

      {isCreateMode && (
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleCreate} className="flex-1 bg-gradient-primary" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSaving ? 'Création...' : 'Créer le groupe'}
          </Button>
        </div>
      )}

      {activeProduct && (
        <BulkAssignProductsDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          categoryName={activeProduct.name}
          products={pickerCandidates}
          initialSelectedIds={currentSubIds}
          onConfirm={handleConfirmMembers}
          title={`Sous-produits de "${activeProduct.name}"`}
          description={`Produits de la catégorie « ${
            categories.find((c) => c.category_id === activeProduct.category_id)?.category_name || 'du groupe'
          } ». Les sous-produits actuels sont cochés : cochez pour rattacher, décochez pour retirer.`}
          confirmLabel="Valider"
          getProductHint={getPickerHint}
          showImages
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentSubIds.length > 0
                ? `Le groupe "${activeProduct?.name}" sera supprimé. Que faire de ses ${currentSubIds.length} sous-produit${currentSubIds.length > 1 ? 's' : ''} ?`
                : `Le groupe "${activeProduct?.name}" sera supprimé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {currentSubIds.length > 0 && (
            <RadioGroup
              value={deleteMode}
              onValueChange={(value) => setDeleteMode(value as GroupDeleteMode)}
              className="space-y-2"
              disabled={isDeleting}
            >
              {DELETE_MODE_CHOICES.map((choice) => (
                <Label
                  key={choice.value}
                  htmlFor={`group-delete-${choice.value}`}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer font-normal ${
                    deleteMode === choice.value
                      ? choice.value === 'delete'
                        ? 'border-destructive bg-destructive/5'
                        : 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <RadioGroupItem value={choice.value} id={`group-delete-${choice.value}`} className="mt-0.5" />
                  <span className="space-y-1">
                    <span className="block font-medium">{choice.label}</span>
                    <span className="block text-sm text-muted-foreground">{choice.hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Garde le dialogue ouvert pendant l'appel : il se ferme sur succès.
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className={deleteMode === 'delete' && currentSubIds.length > 0 ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {deleteMode === 'delete' && currentSubIds.length > 0 ? 'Tout supprimer' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !p-0 !gap-0 !rounded-none flex flex-col overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold truncate">{title}</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">{content}</div>
      </SheetContent>
    </Sheet>
  );
};
