import { useState } from 'react';
import { Category } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { menuService } from '@/services/menuService';

interface CategoryManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreateCategory?: (name: string) => Promise<{ category_id: string }>;
  onUpdateCategory?: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
}

export const CategoryManagementSheet = ({
  open,
  onOpenChange,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManagementSheetProps) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [deleteAvailabilityDialogOpen, setDeleteAvailabilityDialogOpen] = useState(false);
  const [categoryToToggleAvailability, setCategoryToToggleAvailability] = useState<Category | null>(null);
  const [categoryToDeleteFromAvailability, setCategoryToDeleteFromAvailability] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await onCreateCategory?.(newCategoryName);
      setNewCategoryName('');
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async (categoryId: string) => {
    if (!editingName.trim()) return;
    
    try {
      await onUpdateCategory?.(categoryId, editingName);
      setEditingId(null);
      setEditingName('');
      toast({
        title: "Succès",
        description: "Catégorie mise à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la catégorie",
        variant: "destructive"
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
      await onDeleteCategory?.(categoryToDelete);
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès"
      });
      setCategoryToDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAvailability = (category: Category) => {
    setCategoryToToggleAvailability(category);
    setAvailabilityDialogOpen(true);
  };

  const handleToggleAvailabilityConfirm = async () => {
    if (!categoryToToggleAvailability) return;

    setIsProcessing(true);
    try {
      const newStatus = !categoryToToggleAvailability.availability;
      await menuService.updateCategoryAvailability(categoryToToggleAvailability.category_id, newStatus);

      // Update local category state
      categoryToToggleAvailability.availability = newStatus;
      setAvailabilityDialogOpen(false);

      toast({
        title: "Succès",
        description: newStatus
          ? "Catégorie réactivée avec succès. Elle est maintenant visible dans le menu."
          : "Catégorie désactivée. Elle a été retirée du menu."
      });
    } catch (error) {
      console.error('Error updating category availability:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour la disponibilité.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFromAvailability = (categoryId: string) => {
    setCategoryToDeleteFromAvailability(categoryId);
    setDeleteAvailabilityDialogOpen(true);
  };

  const handleDeleteFromAvailabilityConfirm = async () => {
    if (!categoryToDeleteFromAvailability) return;

    setIsProcessing(true);
    try {
      await menuService.deleteCategory(categoryToDeleteFromAvailability);

      setDeleteAvailabilityDialogOpen(false);

      toast({
        title: "Succès",
        description: "Catégorie supprimée définitivement."
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la catégorie.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Gestion des Catégories</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Nouvelle Catégorie</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Catégories Existantes</Label>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.category_id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                  {editingId === category.category_id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdate(category.category_id)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleUpdate(category.category_id)}>
                        OK
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        ✗
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-foreground">{category.category_name || category.category}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(category.category_id);
                          setEditingName(category.category_name || category.category);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAvailability(category)}
                        disabled={isProcessing}
                        title={category.availability ? "Retirer du menu" : "Ajouter au menu"}
                      >
                        {category.availability ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      {!category.availability && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFromAvailability(category.category_id)}
                          disabled={isProcessing}
                          className="text-destructive hover:text-destructive"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer une catégorie"
        description="Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les produits présents à l'intérieur seront également supprimés."
        onConfirm={handleDeleteConfirm}
        confirmText="Supprimer"
        cancelText="Annuler"
        isDangerous={true}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        open={availabilityDialogOpen}
        onOpenChange={setAvailabilityDialogOpen}
        title={categoryToToggleAvailability?.availability ? "Retirer du menu" : "Ajouter au menu"}
        description={categoryToToggleAvailability?.availability 
          ? "La catégorie sera retirée du menu et ne sera plus visible pour les clients."
          : "La catégorie sera ajoutée au menu et sera visible pour les clients."}
        onConfirm={handleToggleAvailabilityConfirm}
        confirmText={categoryToToggleAvailability?.availability ? "Retirer" : "Ajouter"}
        cancelText="Annuler"
        isDangerous={categoryToToggleAvailability?.availability}
        isLoading={isProcessing}
      />

      <ConfirmDialog
        open={deleteAvailabilityDialogOpen}
        onOpenChange={setDeleteAvailabilityDialogOpen}
        title="Supprimer une catégorie"
        description="Êtes-vous sûr de vouloir supprimer définitivement cette catégorie ? Cette action est irréversible."
        onConfirm={handleDeleteFromAvailabilityConfirm}
        confirmText="Supprimer"
        cancelText="Annuler"
        isDangerous={true}
        isLoading={isProcessing}
      />
    </Sheet>
  );
};
