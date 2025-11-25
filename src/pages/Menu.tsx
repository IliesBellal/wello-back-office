import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { CategorySection } from '@/components/menu/CategorySection';
import { ProductEditModal } from '@/components/menu/ProductEditModal';
import { Product } from '@/types/menu';
import { 
  DndContext, 
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';

export default function Menu() {
  const { tvaRates, menuData, loading, updateProductOrder, updateProduct } = useMenuData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeProduct = menuData.products.find(p => p.id === active.id);
    if (!activeProduct) return;

    const categoryProducts = menuData.products
      .filter(p => p.category_id === activeProduct.category_id)
      .sort((a, b) => a.order - b.order);

    const oldIndex = categoryProducts.findIndex(p => p.id === active.id);
    const newIndex = categoryProducts.findIndex(p => p.id === over.id);

    if (oldIndex === newIndex) return;

    const newOrder = [...categoryProducts];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);

    updateProductOrder(
      activeProduct.category_id,
      newOrder.map(p => p.id)
    );
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Menu de l'établissement
          </h1>
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Catégorie
            </Button>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Produit
            </Button>
          </div>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-8">
            {menuData.categories
              .sort((a, b) => a.order - b.order)
              .map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  products={menuData.products.filter(
                    (p) => p.category_id === category.id
                  )}
                  onProductClick={handleProductClick}
                />
              ))}
          </div>
        </DndContext>

        <ProductEditModal
          product={selectedProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          tvaRates={tvaRates}
          onSave={updateProduct}
        />
      </div>
    </DashboardLayout>
  );
}
