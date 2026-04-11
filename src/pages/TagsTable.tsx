import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag } from '@/types/menu';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { menuService } from '@/services/menuService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BulkAssignTagsDialog } from '@/components/menu/BulkAssignTagsDialog';

export default function TagsTable() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const { toast } = useToast();

  const loadTags = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuService.getTags();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tags',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nom pour le tag',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await menuService.createTag(newTagName);
      setTags([...tags, newTag]);
      setNewTagName('');
      toast({
        title: 'Succès',
        description: 'Tag créé avec succès',
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le tag',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
  };

  const handleUpdateTag = async (tagId: string) => {
    if (!editingName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nom pour le tag',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await menuService.updateTag(tagId, editingName);
      setTags(
        tags.map((tag) =>
          tag.id === tagId ? { ...tag, name: editingName } : tag
        )
      );
      setEditingId(null);
      setEditingName('');
      toast({
        title: 'Succès',
        description: 'Tag mis à jour avec succès',
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le tag',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (tagId: string) => {
    setTagToDelete(tagId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    try {
      await menuService.deleteTag(tagToDelete);
      setTags(tags.filter((tag) => tag.id !== tagToDelete));
      toast({
        title: 'Succès',
        description: 'Tag supprimé avec succès',
      });
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le tag',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement des tags...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Tags</h1>
            <Button
              className="bg-gradient-primary"
              onClick={() => setBulkAssignOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Assigner en masse
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nom du nouveau tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              disabled={isCreating}
            />
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-gradient-primary"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Tag</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Aucun tag créé pour le moment
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        {editingId === tag.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateTag(tag.id);
                                }
                              }}
                              disabled={isSaving}
                              autoFocus
                              className="max-w-xs"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateTag(tag.id)}
                              disabled={isSaving}
                              className="bg-gradient-primary"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName('');
                              }}
                              disabled={isSaving}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">{tag.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {editingId !== tag.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(tag)}
                              title="Éditer le tag"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tag.id)}
                              title="Supprimer le tag"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageContainer>

        <BulkAssignTagsDialog
          open={bulkAssignOpen}
          onOpenChange={setBulkAssignOpen}
          tags={tags}
        />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer un tag"
        description={`Êtes-vous sûr de vouloir supprimer le tag "${tags.find((t) => t.id === tagToDelete)?.name}" ? Cette action est irréversible.`}
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
