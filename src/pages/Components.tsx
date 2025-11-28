import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { ComponentCreateSheet } from '@/components/menu/ComponentCreateSheet';

export default function Components() {
  const { 
    menuData,
    components, 
    units,
    loading,
    createComponent,
    createCategory
  } = useMenuData();
  
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
    return menuData.categories.filter(cat => usedCategoryIds.has(cat.id));
  }, [menuData.categories, components]);

  const displayedComponents = selectedCategoryId
    ? componentsByCategory.get(selectedCategoryId) || []
    : components;

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
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? "default" : "ghost"}
              className={`w-full justify-start ${selectedCategoryId === category.id ? 'bg-gradient-primary' : ''}`}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {category.name}
            </Button>
          ))}
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
                  ? categories.find(c => c.id === selectedCategoryId)?.name 
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
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <h3 className="font-semibold text-foreground mb-2">
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
        categories={menuData.categories}
        units={units}
        onCreateComponent={createComponent}
        onCreateCategory={createCategory}
      />
    </DashboardLayout>
  );
}
