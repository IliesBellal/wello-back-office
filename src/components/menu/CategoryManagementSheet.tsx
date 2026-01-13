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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreateCategory?: (name: string) => Promise<void>;
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

  const handleDelete = async (categoryId: string) => {
    try {
      await onDeleteCategory?.(categoryId);
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive"
      });
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
                        onClick={() => handleDelete(category.category_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
