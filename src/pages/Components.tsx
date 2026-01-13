import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Plus, Trash2 } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { ComponentCreateSheet } from '@/components/menu/ComponentCreateSheet';
import { toast } from 'sonner';
import { Component } from '@/types/menu';

export default function Components() {
  const { 
    menuData,
    components, 
    units,
    loading,
    createComponent,
    createCategory,
    deleteComponent
  } = useMenuData();
  
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group components by category
  const componentsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof components>();
    components.forEach(comp => {
      const catId = (comp as any).category_id || 'uncategorized';
      if (!grouped.has(catId)) {
        grouped.set(catId, []);
      }
      grouped.get(catId)!.push(comp);
    });
    return grouped;
  }, [components]);

  const categories = useMemo(() => {
    // Get categories that have components
    const usedCategoryIds = new Set(
      components.map((c: any) => c.category_id).filter(Boolean)
    );
    return menuData.products_types.filter(cat => usedCategoryIds.has(cat.id || cat.category_id));
  }, [menuData.products_types, components]);

  const displayedComponents = selectedCategoryId
    ? componentsByCategory.get(selectedCategoryId) || []
    : components;

  const handleDeleteClick = (e: React.MouseEvent, component: Component) => {
    e.stopPropagation();
    setComponentToDelete(component);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!componentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteComponent(componentToDelete.id);
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
      <div className="flex h-full">
        {/* Left Sidebar - Categories */}
        <div className="w-64 border-r border-border bg-background p-4 space-y-2">
          <h2 className="text-lg font-semibold mb-4">Catégories</h2>
          <Button
            variant={selectedCategoryId === null ? "default" : "ghost"}
            className={`w-full justify-start ${selectedCategoryId === null ? 'bg-gradient-primary' : ''}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            Tous les composants
          </Button>
          {categories.map((category) => {
            const catId = category.id || category.category_id;
            const catName = category.name || category.category;
            return (
              <Button
                key={catId}
                variant={selectedCategoryId === catId ? "default" : "ghost"}
                className={`w-full justify-start ${selectedCategoryId === catId ? 'bg-gradient-primary' : ''}`}
                onClick={() => setSelectedCategoryId(catId)}
              >
                {catName}
              </Button>
            );
          })}
        </div>

        {/* Main Content - Components Grid */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Composants & Ingrédients
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedCategoryId 
                  ? categories.find(c => (c.id || c.category_id) === selectedCategoryId)?.name || categories.find(c => (c.id || c.category_id) === selectedCategoryId)?.category
                  : `${components.length} composant(s) au total`}
              </p>
            </div>
            <Button 
              className="bg-gradient-primary"
              onClick={() => setCreateSheetOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Composant
            </Button>
          </div>

          {displayedComponents.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun composant trouvé</p>
              <Button 
                className="mt-4 bg-gradient-primary"
                onClick={() => setCreateSheetOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier composant
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedComponents.map((component) => (
                <Card 
                  key={component.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, component)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold text-foreground mb-2 pr-8">
                    {component.name}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-primary">
                      {component.price_per_unit 
                        ? `+${(component.price_per_unit).toFixed(2)} €`
                        : 'Gratuit'}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ComponentCreateSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        categories={menuData.products_types}
        units={units}
        onCreateComponent={createComponent}
        onCreateCategory={createCategory}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce composant ?</AlertDialogTitle>
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
    </DashboardLayout>
  );
}
