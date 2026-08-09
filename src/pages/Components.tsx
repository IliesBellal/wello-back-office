import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Settings2 } from 'lucide-react';
import { useComponentsData } from '@/hooks/useComponentsData';
import { IngredientsTable } from '@/components/menu/IngredientsTable';
import { IngredientDetailSheet } from '@/components/menu/IngredientDetailSheet';
import { ComponentCreateSheet } from '@/components/menu/ComponentCreateSheet';
import { toast } from 'sonner';
import { Component } from '@/types/menu';

type SortKey = 'name' | 'category' | 'price' | 'unit';
type SortDir = 'asc' | 'desc';

function getComponentValue(component: Component, key: SortKey, categories: Record<string, string>): string | number {
  switch (key) {
    case 'name': return (component.name || '').toLowerCase();
    case 'category': return (categories[component.category_id || ''] || component.category || '').toLowerCase();
    case 'price': return component.price ?? -1;
    case 'unit': return (component.unit_of_measure || '').toLowerCase();
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
    updateComponent,
    deleteComponent,
  } = useComponentsData();
  
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Component | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtres et tri
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Build category mapping
  const categoryMap = useMemo(() => {
    return componentCategories.reduce((acc, cat) => {
      acc[cat.category_id] = cat.category_name || cat.category;
      return acc;
    }, {} as Record<string, string>);
  }, [componentCategories]);

  // Compteur par catégorie affiché sur les pastilles de filtre
  const countByCategory = useMemo(() => {
    return (components || []).reduce((acc, component) => {
      const key = component.category_id || '';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [components]);

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
            <h1 className="text-3xl font-bold text-foreground">
              Ingrédients
            </h1>
            <div className="flex gap-2">
              <Button className="bg-gradient-primary" onClick={() => setCreateSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvel Ingrédient
              </Button>
            </div>
          </div>
        }
        className="space-y-6"
      >
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

            {/* Compteur */}
            <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
              {filteredComponents.length} ingrédient{filteredComponents.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Catégories : filtres rapides. Renommage, ordre et suppression vivent
            sur /menu/components/categories */}
        {componentCategories.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Catégories ({componentCategories.length})</h3>
              <Button variant="outline" size="sm" asChild>
                <Link to="/menu/components/categories">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Gérer les catégories
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/70'
                }`}
              >
                Toutes <span className="opacity-70">{components.length}</span>
              </button>
              {componentCategories
                .filter(cat => cat.category_id && cat.category_id.trim() !== '')
                .map(cat => (
                  <button
                    key={cat.category_id}
                    onClick={() => setCategoryFilter(cat.category_id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      categoryFilter === cat.category_id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {cat.category_name || cat.category}{' '}
                    <span className="opacity-70">{countByCategory[cat.category_id] || 0}</span>
                  </button>
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
            onRowClick={(component) => {
              setSelectedIngredient(component);
              setDetailSheetOpen(true);
            }}
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

        {/* Ingredient Detail Sheet */}
        {selectedIngredient && (
          <IngredientDetailSheet
            component={selectedIngredient}
            componentId={selectedIngredient?.component_id}
            open={detailSheetOpen}
            onOpenChange={setDetailSheetOpen}
            units={units || []}
            categories={componentCategories}
            onSave={async (componentId, data) => {
              const convertedData = {
                ...data,
                unit_id: data.unit_id ? String(data.unit_id) : undefined,
                purchase_unit_id: data.purchase_unit_id ? String(data.purchase_unit_id) : undefined
              };
              await updateComponent(componentId, convertedData);
              setDetailSheetOpen(false);
              setSelectedIngredient(null);
            }}
            onDelete={async (componentId) => {
              await deleteComponent(componentId);
              setDetailSheetOpen(false);
              setSelectedIngredient(null);
            }}
          />
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
