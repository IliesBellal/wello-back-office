import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag } from '@/types/menu';
import { Plus, Pencil, Trash2, LinkIcon, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { menuService } from '@/services/menuService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { BulkAssignTagsDialog } from '@/components/menu/BulkAssignTagsDialog';

interface SortableTagRowProps {
  tag: Tag;
  productCount: number;
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
  onBulkAssign: (tag: Tag) => void;
}

const SortableTagRow = ({
  tag,
  productCount,
  onEdit,
  onDelete,
  onBulkAssign,
}: SortableTagRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
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
      <TableCell className="font-medium">{tag.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {tag.order ?? 0}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {productCount}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBulkAssign(tag)}
            title="Assigner des produits"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(tag)}
            title="Éditer le tag"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(tag.id)}
            title="Supprimer le tag"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function TagsTable() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingOrder, setEditingOrder] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedTagForBulk, setSelectedTagForBulk] = useState<Tag | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const saveOrderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const loadTags = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tagsData, productsData] = await Promise.all([
        menuService.getTags(),
        menuService.getProducts(),
      ]);
      const sortedTags = [...tagsData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTags(sortedTags);
      setProducts(productsData || []);
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

    try {
      const newTag = await menuService.createTag(newTagName);
      setTags([...tags, newTag]);
      setNewTagName('');
      setCreateDialogOpen(false);
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
    }
  };

  const handleCreateNewTag = handleCreate;

  const handleBulkAssign = (tag: Tag) => {
    setSelectedTagForBulk(tag);
    setBulkAssignOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingOrder(tag.order ?? 0);
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

    try {
      await menuService.updateTag(tagId, editingName);
      
      // Update order if changed
      const updatedTag = tags.find(t => t.id === tagId);
      if (updatedTag && editingOrder !== (updatedTag.order ?? 0)) {
        const newTags = tags.map(t => 
          t.id === tagId ? { ...t, order: editingOrder } : t
        );
        setTags(newTags);
        
        // Debounce save
        if (saveOrderTimeoutRef.current) {
          clearTimeout(saveOrderTimeoutRef.current);
        }
        saveOrderTimeoutRef.current = setTimeout(() => {
          debouncedSaveOrder(newTags);
        }, 500);
      }
      
      setEditingId(null);
      setEditingName('');
      setEditingOrder(0);
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
    }
  };

  const debouncedSaveOrder = async (tagsToSave: Tag[]) => {
    try {
      const tagOrder = tagsToSave.map((t) => t.id);
      await menuService.updateTagOrder(tagOrder);
    } catch (error) {
      console.error('Error saving tag order:', error);
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

    const oldIndex = tags.findIndex((t) => t.id === active.id);
    const newIndex = tags.findIndex((t) => t.id === over.id);

    const newTags = [...tags];
    const [movedItem] = newTags.splice(oldIndex, 1);
    newTags.splice(newIndex, 0, movedItem);

    const updatedTags = newTags.map((t, i) => ({ ...t, order: i }));
    setTags(updatedTags);

    // Debounce save
    if (saveOrderTimeoutRef.current) {
      clearTimeout(saveOrderTimeoutRef.current);
    }
    saveOrderTimeoutRef.current = setTimeout(() => {
      debouncedSaveOrder(updatedTags);
    }, 500);
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
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau tag
            </Button>
          </div>
        }
      >
        <div className="space-y-4">

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nom du Tag</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucun tag créé pour le moment
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {tags.map((tag) => {
                        const productCount = products.filter(p => 
                          Array.isArray(p.tags) && p.tags.includes(tag.id)
                        ).length;

                        return editingId === tag.id ? (
                          <TableRow key={tag.id}>
                            <TableCell></TableCell>
                            <TableCell>
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateTag(tag.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                autoFocus
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={editingOrder}
                                onChange={(e) => setEditingOrder(parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateTag(tag.id);
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
                                  onClick={() => handleUpdateTag(tag.id)}
                                >
                                  Enregistrer
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  Annuler
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableTagRow
                            key={tag.id}
                            tag={tag}
                            productCount={productCount}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onBulkAssign={handleBulkAssign}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageContainer>

        {/* Create New Tag Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewTag();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateNewTag}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer un tag"
          description={`Êtes-vous sûr de vouloir supprimer le tag "${tags.find((t) => t.id === tagToDelete)?.name}" ? Cette action est irréversible.`}
          isDangerous
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
        />

        {/* Bulk Assign Dialog */}
        {selectedTagForBulk && (
          <BulkAssignTagsDialog
            open={bulkAssignOpen}
            onOpenChange={setBulkAssignOpen}
            tags={tags}
          />
        )}
    </DashboardLayout>
  );
}
