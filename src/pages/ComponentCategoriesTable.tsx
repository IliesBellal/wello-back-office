import { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, Trash2, GripVertical, Check, X, AlertTriangle } from 'lucide-react';
import { useComponentsData } from '@/hooks/useComponentsData';
import { ComponentCategory } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

interface SortableCategoryRowProps {
  category: ComponentCategory;
  index: number;
  ingredientCount: number;
  isEditing: boolean;
  editingName: string;
  isSaving: boolean;
  onEditingNameChange: (name: string) => void;
  onStartEdit: (category: ComponentCategory) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (categoryId: string) => void;
  onDelete: (category: ComponentCategory) => void;
}

const SortableCategoryRow = ({
  category,
  index,
  ingredientCount,
  isEditing,
  editingName,
  isSaving,
  onEditingNameChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
}: SortableCategoryRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.category_id,
    // Le glisser-déposer est désactivé pendant l'édition : sinon le drag
    // capture les clics dans le champ de saisie.
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayName = category.category_name || category.category || '';

  if (isEditing) {
    return (
      <TableRow ref={setNodeRef} style={style}>
        <TableCell className="w-10" />
        <TableCell>
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSubmitEdit(category.category_id);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelEdit();
              }
            }}
            className="max-w-sm"
          />
        </TableCell>
        <TableCell className="w-20 text-sm text-muted-foreground">{index + 1}</TableCell>
        <TableCell className="w-32 text-center text-sm text-muted-foreground">
          {ingredientCount}
        </TableCell>
        <TableCell className="w-32 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSubmitEdit(category.category_id)}
              disabled={isSaving || !editingName.trim()}
              title="Valider (Entrée)"
            >
              <Check className="w-4 h-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              disabled={isSaving}
              title="Annuler (Échap)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

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
      <TableCell className="font-medium">{displayName}</TableCell>
      <TableCell className="w-20 text-sm text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="w-32 text-center text-sm text-muted-foreground">
        {ingredientCount}
      </TableCell>
      <TableCell className="w-32 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStartEdit(category)}
            title="Renommer la catégorie"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            title="Supprimer la catégorie"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

type DeleteMode = 'reassign' | 'purge';

export default function ComponentCategoriesTable() {
  const {
    components,
    componentCategories,
    loading,
    createComponentCategory,
    updateComponentCategory,
    updateComponentCategoriesOrder,
    deleteComponentCategory,
  } = useComponentsData();

  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState<ComponentCategory | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('reassign');
  const [reassignTo, setReassignTo] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const saveOrderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCategories(componentCategories);
  }, [componentCategories]);

  useEffect(() => {
    return () => {
      if (saveOrderTimeoutRef.current) {
        clearTimeout(saveOrderTimeoutRef.current);
      }
    };
  }, []);

  // Nombre d'ingrédients par catégorie, calculé une fois pour toutes les lignes
  const countByCategory = useMemo(() => {
    return (components || []).reduce((acc, component) => {
      const key = component.category_id || '';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [components]);

  const deleteCount = categoryToDelete ? countByCategory[categoryToDelete.category_id] || 0 : 0;
  const reassignTargets = categoryToDelete
    ? categories.filter(c => c.category_id !== categoryToDelete.category_id)
    : [];
  // Une catégorie non vide ne peut être vidée que vers une autre catégorie :
  // s'il n'en existe aucune, seule la purge reste possible.
  const canReassign = reassignTargets.length > 0;

  const handleCreate = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    setIsCreating(true);
    try {
      await createComponentCategory(name);
      setNewCategoryName('');
      setCreateDialogOpen(false);
      toast({ title: 'Succès', description: 'Catégorie créée avec succès' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer la catégorie',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (category: ComponentCategory) => {
    setEditingId(category.category_id);
    setEditingName(category.category_name || category.category || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSubmitEdit = async (categoryId: string) => {
    const name = editingName.trim();
    if (!name) return;

    const current = categories.find(c => c.category_id === categoryId);
    if (current && (current.category_name || current.category) === name) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await updateComponentCategory(categoryId, name);
      handleCancelEdit();
      toast({ title: 'Succès', description: 'Catégorie renommée avec succès' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de renommer la catégorie',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (category: ComponentCategory) => {
    const count = countByCategory[category.category_id] || 0;
    const targets = categories.filter(c => c.category_id !== category.category_id);
    setCategoryToDelete(category);
    setDeleteMode(count > 0 && targets.length === 0 ? 'purge' : 'reassign');
    setReassignTo(targets[0]?.category_id ?? '');
  };

  const handleCloseDelete = () => {
    setCategoryToDelete(null);
    setReassignTo('');
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      if (deleteCount === 0) {
        await deleteComponentCategory(categoryToDelete.category_id);
      } else if (deleteMode === 'reassign') {
        await deleteComponentCategory(categoryToDelete.category_id, {
          mode: 'reassign',
          reassignTo,
        });
      } else {
        await deleteComponentCategory(categoryToDelete.category_id, { mode: 'purge' });
      }

      toast({
        title: 'Succès',
        description:
          deleteCount > 0 && deleteMode === 'purge'
            ? `Catégorie et ${deleteCount} ingrédient${deleteCount > 1 ? 's' : ''} supprimés`
            : 'Catégorie supprimée avec succès',
      });
      handleCloseDelete();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer la catégorie',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const saveOrder = async (ordered: ComponentCategory[]) => {
    try {
      await updateComponentCategoriesOrder(ordered.map(c => c.category_id));
    } catch (error) {
      // L'ordre local est conservé : l'utilisateur peut réessayer en déplaçant
      // à nouveau une ligne, sans perdre son agencement à l'écran.
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

    const oldIndex = categories.findIndex(c => c.category_id === active.id);
    const newIndex = categories.findIndex(c => c.category_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const withOrder = reordered.map((c, i) => ({ ...c, order: i + 1 }));
    setCategories(withOrder);

    if (saveOrderTimeoutRef.current) {
      clearTimeout(saveOrderTimeoutRef.current);
    }
    saveOrderTimeoutRef.current = setTimeout(() => {
      saveOrder(withOrder);
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
            <div>
              <h1 className="text-3xl font-bold text-foreground">Catégories d'ingrédients</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Glissez les lignes pour définir l'ordre d'affichage.
              </p>
            </div>
            <Button className="bg-gradient-primary" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>
        }
      >
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-20">Ordre</TableHead>
                  <TableHead className="w-32 text-center">Ingrédients</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune catégorie. Créez-en une pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={categories.map(c => c.category_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categories.map((category, index) => (
                        <SortableCategoryRow
                          key={category.category_id}
                          category={category}
                          index={index}
                          ingredientCount={countByCategory[category.category_id] || 0}
                          isEditing={editingId === category.category_id}
                          editingName={editingName}
                          isSaving={isSaving}
                          onEditingNameChange={setEditingName}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onSubmitEdit={handleSubmitEdit}
                          onDelete={handleOpenDelete}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Création */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle catégorie d'ingrédient</DialogTitle>
              <DialogDescription>
                Créez une nouvelle catégorie pour organiser vos ingrédients.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Nom de la catégorie (ex: Fruits & Légumes)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newCategoryName.trim()}
                className="bg-gradient-primary"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suppression */}
        <Dialog open={categoryToDelete !== null} onOpenChange={(open) => !open && handleCloseDelete()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Supprimer «&nbsp;{categoryToDelete?.category_name || categoryToDelete?.category}&nbsp;» ?
              </DialogTitle>
              <DialogDescription>
                {deleteCount === 0
                  ? 'Cette catégorie ne contient aucun ingrédient. Cette action est irréversible.'
                  : `${deleteCount} ingrédient${deleteCount > 1 ? 's sont rattachés' : ' est rattaché'} à cette catégorie.`}
              </DialogDescription>
            </DialogHeader>

            {deleteCount > 0 && (
              <RadioGroup
                value={deleteMode}
                onValueChange={(value) => setDeleteMode(value as DeleteMode)}
                className="gap-4"
              >
                <div className="flex gap-3">
                  <RadioGroupItem value="reassign" id="delete-reassign" disabled={!canReassign} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="delete-reassign"
                      className={canReassign ? 'font-medium cursor-pointer' : 'font-medium text-muted-foreground'}
                    >
                      Déplacer les ingrédients vers une autre catégorie
                    </Label>
                    {canReassign ? (
                      <Select
                        value={reassignTo}
                        onValueChange={setReassignTo}
                        disabled={deleteMode !== 'reassign'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {reassignTargets.map(c => (
                            <SelectItem key={c.category_id} value={c.category_id}>
                              {c.category_name || c.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune autre catégorie disponible pour accueillir ces ingrédients.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <RadioGroupItem value="purge" id="delete-purge" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="delete-purge" className="font-medium cursor-pointer">
                      Supprimer la catégorie et ses {deleteCount} ingrédient{deleteCount > 1 ? 's' : ''}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ils disparaîtront de la liste, ainsi que des recettes et des suppléments qui
                      les utilisent.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            )}

            {deleteCount > 0 && deleteMode === 'purge' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  {deleteCount} ingrédient{deleteCount > 1 ? 's seront supprimés' : ' sera supprimé'} en
                  même temps que la catégorie.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDelete} disabled={isDeleting}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting || (deleteCount > 0 && deleteMode === 'reassign' && !reassignTo)}
                className={
                  deleteCount > 0 && deleteMode === 'reassign'
                    ? 'bg-gradient-primary'
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }
              >
                {isDeleting
                  ? 'Suppression...'
                  : deleteCount > 0 && deleteMode === 'reassign'
                    ? 'Déplacer & supprimer'
                    : deleteCount > 0
                      ? `Supprimer la catégorie et ${deleteCount} ingrédient${deleteCount > 1 ? 's' : ''}`
                      : 'Supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </DashboardLayout>
  );
}
