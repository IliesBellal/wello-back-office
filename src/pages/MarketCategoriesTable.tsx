import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMarketingCategoryData } from '@/hooks/useMarketingCategoryData';
import { Category } from '@/types/menu';
import { Plus, Pencil, Trash2, GripVertical, LinkIcon, ImageIcon, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BulkAssignProductsDialog } from '@/components/shared/BulkAssignProductsDialog';
import { menuService } from '@/services/menuService';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SortableCategoryRowProps {
  category: Category;
  productCount: number;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onBulkAssign: (category: Category) => void;
  onImageUpload: (categoryId: string) => void;
  onImageDelete: (categoryId: string) => void;
  isImageUploading: boolean;
  canDeleteImage: boolean;
}

const SortableCategoryRow = ({
  category,
  productCount,
  onEdit,
  onDelete,
  onBulkAssign,
  onImageUpload,
  onImageDelete,
  isImageUploading,
  canDeleteImage,
}: SortableCategoryRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.category_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-10">
        <div
          {...listeners}
          {...attributes}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:opacity-70"
          title="Glissez pour réorganiser"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{category.category_name || category.category}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-12 w-12 rounded-md border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.category_name || category.category}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImageUpload(category.category_id)}
              disabled={isImageUploading}
              title={category.image_url ? 'Remplacer l\'image' : 'Ajouter une image'}
            >
              {isImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImageDelete(category.category_id)}
              disabled={!canDeleteImage || isImageUploading}
              title="Supprimer l'image"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {category.categ_order ?? category.order ?? 0}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {productCount}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBulkAssign(category)}
            title="Assigner des produits"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            title="Éditer la catégorie"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category.category_id)}
            title="Supprimer la catégorie"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function MarketCategoriesTable() {
  const {
    menuData,
    loading,
    createMarketingCategory,
    updateMarketingCategory,
    deleteMarketingCategory,
    uploadMarketingCategoryImage,
    deleteMarketingCategoryImage,
  } = useMarketingCategoryData();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingOrder, setEditingOrder] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedCategoryForBulk, setSelectedCategoryForBulk] = useState<Category | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [imageUploadingCategoryId, setImageUploadingCategoryId] = useState<string | null>(null);
  const saveOrderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Sort categories by order when menuData changes
    if (menuData.products_types) {
      setCategories(
        [...menuData.products_types].sort(
          (a, b) => (a.categ_order ?? a.order ?? 0) - (b.categ_order ?? b.order ?? 0)
        )
      );
    }
  }, [menuData.products_types]);

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createMarketingCategory(newCategoryName);
      setNewCategoryName('');
      setCreateDialogOpen(false);
      toast({
        title: 'Succès',
        description: 'Catégorie créée avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la catégorie',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNewCategory = handleCreate;

  const handleEdit = (category: Category) => {
    setEditingId(category.category_id);
    setEditingName(category.category_name || category.category);
    setEditingOrder(category.categ_order ?? category.order ?? 0);
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingName.trim()) return;

    try {
      await updateMarketingCategory(categoryId, editingName);

      // Update order if changed
      const updatedCategory = categories.find(c => c.category_id === categoryId);
      if (updatedCategory && editingOrder !== (updatedCategory.categ_order ?? updatedCategory.order ?? 0)) {
        const newCategories = categories.map(c =>
          c.category_id === categoryId ? { ...c, categ_order: editingOrder } : c
        );
        setCategories(newCategories);

        // Debounce save
        if (saveOrderTimeoutRef.current) {
          clearTimeout(saveOrderTimeoutRef.current);
        }
        saveOrderTimeoutRef.current = setTimeout(() => {
          debouncedSaveOrder(newCategories);
        }, 500);
      }

      setEditingId(null);
      setEditingName('');
      setEditingOrder(0);
      toast({
        title: 'Succès',
        description: 'Catégorie mise à jour avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la catégorie',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMarketingCategory(categoryToDelete);
      toast({
        title: 'Succès',
        description: 'Catégorie supprimée avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la catégorie',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleBulkAssign = (category: Category) => {
    setSelectedCategoryForBulk(category);
    setBulkAssignOpen(true);
  };

  const handleBulkAssignConfirm = async (productIds: string[]) => {
    if (!selectedCategoryForBulk) return;

    setIsAssigning(true);
    try {
      await menuService.bulkAssignProductsToMarketCategory(productIds, selectedCategoryForBulk.category_id);
      toast({
        title: 'Succès',
        description: `${productIds.length} produit(s) assigné(s) à la catégorie`,
      });
      setBulkAssignOpen(false);
      setSelectedCategoryForBulk(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner les produits',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleImageUploadClick = (categoryId: string) => {
    fileInputRefs.current[categoryId]?.click();
  };

  const handleImageFileChange = async (categoryId: string, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez sélectionner un fichier JPG, PNG ou WebP.',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: `La taille maximale autorisée est de 5 Mo. Votre fichier fait ${(file.size / 1024 / 1024).toFixed(2)} Mo.`,
        variant: 'destructive',
      });
      return;
    }

    setImageUploadingCategoryId(categoryId);
    try {
      await uploadMarketingCategoryImage(categoryId, file);
      toast({
        title: 'Succès',
        description: 'Image de catégorie mise à jour.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'uploader l\'image.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRefs.current[categoryId]) {
        fileInputRefs.current[categoryId]!.value = '';
      }
      setImageUploadingCategoryId(null);
    }
  };

  const handleImageDelete = async (categoryId: string) => {
    setImageUploadingCategoryId(categoryId);
    try {
      await deleteMarketingCategoryImage(categoryId);
      toast({
        title: 'Succès',
        description: 'Image de catégorie supprimée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer l\'image.',
        variant: 'destructive',
      });
    } finally {
      setImageUploadingCategoryId(null);
    }
  };

  const debouncedSaveOrder = async (categoriesToSave: Category[]) => {
    try {
      const categoryOrder = categoriesToSave.map((c) => c.category_id);
      await menuService.updateMarketingCategoryDisplayOrder(categoryOrder);
    } catch (error) {
      console.error('Error saving category order:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder l\'ordre',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.category_id === active.id);
    const newIndex = categories.findIndex((c) => c.category_id === over.id);

    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, movedItem);

    const updatedCategories = newCategories.map((c, i) => ({ ...c, categ_order: i }));
    setCategories(updatedCategories);

    // Debounce save
    if (saveOrderTimeoutRef.current) {
      clearTimeout(saveOrderTimeoutRef.current);
    }
    saveOrderTimeoutRef.current = setTimeout(() => {
      debouncedSaveOrder(updatedCategories);
    }, 500);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Catégories Vitrine</h1>
            <Button
              className="bg-gradient-primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Categories Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-64">Image</TableHead>
                  <TableHead className="w-20">Ordre</TableHead>
                  <TableHead className="text-center">Produits</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune catégorie. Créez-en une pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories.map((c) => c.category_id)} strategy={verticalListSortingStrategy}>
                      {categories.map((category) => {
                        const productCount = category.product_count ?? 0;

                        return editingId === category.category_id ? (
                          <TableRow key={category.category_id}>
                            <TableCell></TableCell>
                            <TableCell>
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateCategory(category.category_id);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                autoFocus
                              />
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={editingOrder}
                                onChange={(e) => setEditingOrder(parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateCategory(category.category_id);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateCategory(category.category_id)}
                                >
                                  Enregistrer
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                  Annuler
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableCategoryRow
                            key={category.category_id}
                            category={category}
                            productCount={productCount}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onBulkAssign={handleBulkAssign}
                            onImageUpload={handleImageUploadClick}
                            onImageDelete={handleImageDelete}
                            isImageUploading={imageUploadingCategoryId === category.category_id}
                            canDeleteImage={Boolean(category.image_url)}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
            {categories.map((category) => (
              <input
                key={`image-input-${category.category_id}`}
                ref={(element) => {
                  fileInputRefs.current[category.category_id] = element;
                }}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(event) => handleImageFileChange(category.category_id, event.target.files?.[0] || null)}
                disabled={imageUploadingCategoryId === category.category_id}
              />
            ))}
          </div>
        </div>
        </div>
      </PageContainer>

        {/* Create New Category Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle catégorie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nom de la catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewCategory();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateNewCategory}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer la catégorie"
          description="Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible."
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          confirmText="Supprimer"
          isDangerous={true}
        />

        {/* Bulk Assign Dialog */}
        {selectedCategoryForBulk && (
          <BulkAssignProductsDialog
            open={bulkAssignOpen}
            onOpenChange={setBulkAssignOpen}
            categoryName={selectedCategoryForBulk.category_name || selectedCategoryForBulk.category}
            products={menuData.products && menuData.products.length > 0 ? menuData.products : undefined}
            initialSelectedIds={selectedCategoryForBulk.product_ids}
            loading={isAssigning}
            onConfirm={handleBulkAssignConfirm}
          />
        )}
    </DashboardLayout>
  );
}
