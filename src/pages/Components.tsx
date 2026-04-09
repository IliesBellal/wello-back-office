import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Search, Edit2, X } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { menuService } from '@/services/menuService';
import { IngredientsTable } from '@/components/menu/IngredientsTable';
import { ComponentCreateSheet } from '@/components/menu/ComponentCreateSheet';
import { toast } from 'sonner';
import { Component, ComponentCategory } from '@/types/menu';

type SortKey = 'name' | 'category' | 'price' | 'unit';
type SortDir = 'asc' | 'desc';

function getComponentValue(component: Component, key: SortKey, categories: Record<string, string>): string | number {
  switch (key) {
    case 'name': return component.name.toLowerCase();
    case 'category': return (categories[component.category_id || ''] || component.category || '').toLowerCase();
    case 'price': return component.price ?? -1;
    case 'unit': return component.unit_of_measure?.toLowerCase() || '';
  }
}

export default function Components() {
  const { 
    components, 
    componentCategories,
    units,
    loading,
    createComponent,
    createComponentCategory,
    deleteComponent
  } = useMenuData();
  
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingComponentId, setUpdatingComponentId] = useState<string | null>(null);
  const [componentStatusMap, setComponentStatusMap] = useState<Record<string, boolean>>({});

  // Filtres et tri
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Category management  
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [categoryDeleteOpen, setCategoryDeleteOpen] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Build category mapping
  const categoryMap = useMemo(() => {
    return componentCategories.reduce((acc, cat) => {
      acc[cat.category_id] = cat.category_name || cat.category;
      return acc;
    }, {} as Record<string, string>);
  }, [componentCategories]);

  // Get filtered and sorted ingredients
  const filteredComponents = useMemo(() => {
    let result = components || [];

    // Filtre recherche
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q)
      );
    }

    // Filtre catégorie
    if (categoryFilter !== 'all') {
      result = result.filter(c => c.category_id === categoryFilter);
    }

    // Tri
    return [...result].sort((a, b) => {
      const va = getComponentValue(a, sortKey, categoryMap);
      const vb = getComponentValue(b, sortKey, categoryMap);
      
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      
      const na = va as number;
      const nb = vb as number;
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [components, search, categoryFilter, sortKey, sortDir, categoryMap]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDeleteClick = (component: Component) => {
    setComponentToDelete(component);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async (componentId: string, status: boolean) => {
    // Immédiatement mettre à jour le statut localement (optimistic update)
    setComponentStatusMap(prev => ({
      ...prev,
      [componentId]: status
    }));
    
    // Désactiver le switch pendant l'appel
    setUpdatingComponentId(componentId);
    
    try {
      await menuService.updateComponentStatus(componentId, status);
      toast.success(status ? 'Ingrédient disponible' : 'Ingrédient indisponible');
    } catch (error) {
      // En cas d'erreur, revenir à l'état précédent
      setComponentStatusMap(prev => ({
        ...prev,
        [componentId]: !status
      }));
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      // Re-activer le switch
      setUpdatingComponentId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!componentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteComponent(componentToDelete.component_id);
      toast.success(`"${componentToDelete.name}" supprimé`);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setComponentToDelete(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    setIsCreatingCategory(true);
    try {
      await createComponentCategory(newCategoryName);
      toast.success('Catégorie créée avec succès');
      setNewCategoryName('');
      setCategoryDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la création de la catégorie");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    // TODO: Implement delete category when API is available
    toast.error('Suppression de catégorie non encore implémentée');
    setCategoryDeleteOpen(false);
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Ingrédients & Composants
          </h1>
          <div className="flex gap-2">
            <Button className="bg-gradient-primary" onClick={() => setCreateSheetOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Ingrédient
            </Button>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Catégorie
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter une catégorie d'ingrédient</DialogTitle>
                  <DialogDescription>
                    Créez une nouvelle catégorie pour organiser vos ingrédients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nom de la catégorie (ex: Fruits & Légumes)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCategory();
                      }
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="bg-gradient-primary"
                  >
                    {isCreatingCategory ? 'Création...' : 'Créer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Recherche */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ingrédient…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtre catégorie */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {componentCategories.map(cat => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.category_name || cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Compteur */}
              <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                {filteredComponents.length} ingrédient{filteredComponents.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Catégories managées (affichage complet) */}
        {componentCategories.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Catégories ({componentCategories.length})</h3>
            <div className="flex flex-wrap gap-2">
              {componentCategories.map(cat => (
                <div
                  key={cat.category_id}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm"
                >
                  <span>{cat.category_name || cat.category}</span>
                  <button
                    onClick={() => {
                      setDeletingCategoryId(cat.category_id);
                      setCategoryDeleteOpen(true);
                    }}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <IngredientsTable
            ingredients={filteredComponents}
            categories={categoryMap}
            units={units || []}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onDelete={handleDeleteClick}
            onStatusChange={handleStatusChange}
            componentStatusMap={componentStatusMap}
            updatingComponentId={updatingComponentId}
          />
        </div>

        <ComponentCreateSheet
          open={createSheetOpen}
          onOpenChange={setCreateSheetOpen}
          categories={componentCategories}
          units={units || []}
          onCreateComponent={createComponent}
          onCreateCategory={createComponentCategory}
        />

        {/* Delete ingredient dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet ingrédient ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer "{componentToDelete?.name}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete category dialog */}
        <AlertDialog open={categoryDeleteOpen} onOpenChange={setCategoryDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette catégorie ? Les ingrédients seront déplacés dans "Non catégorisé".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCategory}>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCategory} 
                disabled={isDeletingCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingCategory ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
