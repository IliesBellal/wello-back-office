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
import { BulkAssignProductsDialog } from '@/components/shared/BulkAssignProductsDialog';

interface SortableTagRowProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
  onBulkAssign: (tag: Tag) => void;
}

const SortableTagRow = ({
  tag,
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
      <TableCell className="w-12">
        {tag.color && (
          <div
            className="w-8 h-8 rounded-full border border-border"
            style={{ backgroundColor: tag.color }}
            title={tag.color}
          />
        )}
      </TableCell>
      <TableCell className="font-medium">{tag.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {tag.display_order ?? 0}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {tag.product_count ?? 0}
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
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ffffff');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [editingOrder, setEditingOrder] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedTagForBulk, setSelectedTagForBulk] = useState<Tag | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const saveOrderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingColorRef = useRef('');
  const newTagColorRef = useRef('#ffffff');
  const { toast } = useToast();

  const loadTags = React.useCallback(async () => {
    setLoading(true);
    try {
      const tagsData = await menuService.getTags();
      const sortedTags = [...tagsData].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setTags(sortedTags);
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
      const newTag = await menuService.createTag(newTagName, newTagColor);
      setTags([...tags, newTag]);
      setNewTagName('');
      setNewTagColor('#ffffff');
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

  const handleBulkAssignConfirm = async (productIds: string[]) => {
    if (!selectedTagForBulk) return;

    setIsAssigning(true);
    try {
      await menuService.bulkAssignProductsToTag(productIds, selectedTagForBulk.id);
      toast({
        title: 'Succès',
        description: `${productIds.length} produit(s) assigné(s) au tag`,
      });
      setBulkAssignOpen(false);
      setSelectedTagForBulk(null);
    } catch (error) {
      console.error('Error assigning products to tag:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner les produits',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    const color = tag.color || '#ffffff';
    setEditingColor(color);
    editingColorRef.current = color;
    setEditingOrder(tag.display_order ?? 0);
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
      await menuService.updateTag(tagId, editingName, editingColor, editingOrder);
      
      // Update local state
      const updatedTags = tags.map(t => 
        t.id === tagId 
          ? { ...t, name: editingName, color: editingColor, display_order: editingOrder }
          : t
      );
      setTags(updatedTags);
      
      setEditingId(null);
      setEditingName('');
      setEditingColor('');
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

    const updatedTags = newTags.map((t, i) => ({ ...t, display_order: i }));
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                  <TableHead className="w-12"></TableHead>
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
                        return editingId === tag.id ? (
                          <TableRow key={tag.id}>
                            <TableCell></TableCell>
                            <TableCell>
                              <input
                                type="color"
                                value={editingColor}
                                onChange={(e) => (editingColorRef.current = e.target.value)}
                                onBlur={() => setEditingColor(editingColorRef.current)}
                                className="w-10 h-8 rounded cursor-pointer border border-input"
                              />
                            </TableCell>
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
              <div>
                <label className="text-sm font-medium">Nom du tag</label>
                <Input
                  placeholder="Nom du tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewTag();
                    }
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Couleur</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    defaultValue={newTagColor}
                    onChange={(e) => (newTagColorRef.current = e.target.value)}
                    onBlur={() => setNewTagColor(newTagColorRef.current)}
                    className="w-12 h-10 rounded cursor-pointer border border-input"
                  />
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    placeholder="#ffffff"
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>
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
          <BulkAssignProductsDialog
            open={bulkAssignOpen}
            onOpenChange={setBulkAssignOpen}
            categoryName={selectedTagForBulk.name}
            loading={isAssigning}
            onConfirm={handleBulkAssignConfirm}
          />
        )}
    </DashboardLayout>
  );
}
