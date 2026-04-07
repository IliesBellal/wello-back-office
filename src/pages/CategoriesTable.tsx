import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMenuData } from '@/hooks/useMenuData';
import { Category } from '@/types/menu';
import { Plus, Pencil, Trash2, GripVertical, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

const SortableCategoryRow = ({
  category,
  onEdit,
  onDelete,
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
      <TableCell className="text-sm text-muted-foreground">
        {category.categ_order ?? category.order ?? 0}
      </TableCell>
      <TableCell className="text-right space-x-2">
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
      </TableCell>
    </TableRow>
  );
};

export default function CategoriesTable() {
  const { menuData, loading, createProductCategory, updateCategory, deleteCategory } = useMenuData();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      await createProductCategory(newCategoryName);
      setNewCategoryName('');
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

  const handleEdit = (category: Category) => {
    setEditingId(category.category_id);
    setEditingName(category.category_name || category.category);
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingName.trim()) return;

    try {
      await updateCategory(categoryId, editingName);
      setEditingId(null);
      setEditingName('');
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
      await deleteCategory(categoryToDelete);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.category_id === active.id);
    const newIndex = categories.findIndex((c) => c.category_id === over.id);

    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, movedItem);

    setCategories(newCategories.map((c, i) => ({ ...c, categ_order: i })));
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const categoryOrder = categories.map((c) => c.category_id);
      await menuService.updateCategoryOrder(categoryOrder);
      toast({
        title: 'Succès',
        description: 'Ordre des catégories sauvegardé avec succès',
      });
    } catch (error) {
      console.error('Error saving category order:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder l\'ordre',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Catégories Caisse</h1>
          <Button className="bg-gradient-primary" onClick={handleSaveOrder} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Enregistrement...' : 'Enregistrer l\'ordre'}
          </Button>
        </div>

        {/* Create New Category */}
        <div className="space-y-3 bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold">Nouvelle Catégorie</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la catégorie..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
            <Button onClick={handleCreate} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Créer
            </Button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-20">Ordre</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucune catégorie. Créez-en une pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories.map((c) => c.category_id)} strategy={verticalListSortingStrategy}>
                      {categories.map((category) =>
                        editingId === category.category_id ? (
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
                            <TableCell className="text-right space-x-2">
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
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableCategoryRow
                            key={category.category_id}
                            category={category}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        )
                      )}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

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
      </div>
    </DashboardLayout>
  );
}
