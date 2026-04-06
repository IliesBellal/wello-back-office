import { useState } from 'react';
import { Tag } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { menuService } from '@/services/menuService';

interface TagsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onTagCreated?: (newTag: { id: string; name: string }) => void;
}

export const TagsSheet = ({
  open,
  onOpenChange,
  tags: initialTags,
  onTagCreated
}: TagsSheetProps) => {
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom pour le tag.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await menuService.createTag(newTagName);
      setTags([...tags, newTag]);
      setNewTagName('');
      toast({
        title: "Succès",
        description: "Le tag a été créé avec succès."
      });
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
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    try {
      await menuService.deleteTag(tagToDelete.id);
      setTags(tags.filter(t => t.id !== tagToDelete.id));
      toast({
        title: "Succès",
        description: "Le tag a été supprimé avec succès."
      });
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le tag.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Gérer les Tags</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 flex flex-col h-[calc(100vh-180px)]">
          <div className="space-y-2">
            <Label htmlFor="new-tag">Nouveau Tag</Label>
            <div className="flex gap-2">
              <Input
                id="new-tag"
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                disabled={isCreating}
              />
              <Button 
                onClick={handleCreateTag} 
                disabled={isCreating}
                size="icon"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <Label>Tags Existants</Label>
            <div className="space-y-2 overflow-y-auto pr-4">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun tag pour le moment</p>
              ) : (
                tags.map((tag) => (
                  <div 
                    key={tag.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <span className="font-medium text-foreground">{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(tag)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer un tag</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le tag "{tagToDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
