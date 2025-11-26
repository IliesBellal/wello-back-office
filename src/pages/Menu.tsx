import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Settings, Folder, Globe, Grid3x3 } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { ProductCard } from '@/components/menu/ProductCard';
import { ProductDetailsSheet } from '@/components/menu/ProductDetailsSheet';
import { CategoryManagementSheet } from '@/components/menu/CategoryManagementSheet';
import { AttributesManager } from '@/components/menu/AttributesManager';
import { OrganizeModal } from '@/components/menu/OrganizeModal';
import { ExternalMenusSheet } from '@/components/menu/ExternalMenusSheet';
import { Product } from '@/types/menu';

export default function Menu() {
  const { 
    tvaRates, 
    menuData, 
    units, 
    components, 
    attributes, 
    loading, 
    updateProduct,
    createAttribute,
    updateAttributeData,
    saveOrder
  } = useMenuData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attributesManagerOpen, setAttributesManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [externalMenusOpen, setExternalMenusOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
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
            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
              <Folder className="w-4 h-4 mr-2" />
              Catégories
            </Button>
            <Button variant="outline" onClick={() => setAttributesManagerOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Gérer les Attributs
            </Button>
            <Button variant="outline" onClick={() => setExternalMenusOpen(true)}>
              <Globe className="w-4 h-4 mr-2" />
              Menus Externes
            </Button>
            <Button className="bg-gradient-primary" onClick={() => setOrganizeModalOpen(true)}>
              <Grid3x3 className="w-4 h-4 mr-2" />
              Organiser (Mode Tablette)
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {menuData.categories
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <div key={category.id} className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">{category.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {menuData.products
                    .filter((p) => p.category_id === category.id)
                    .sort((a, b) => a.order - b.order)
                    .map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => handleProductClick(product)}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>

        <ProductDetailsSheet
          product={selectedProduct}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tvaRates={tvaRates}
          units={units}
          components={components}
          attributes={attributes}
          onSave={updateProduct}
        />

        <CategoryManagementSheet
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
          categories={menuData.categories}
        />

        <AttributesManager
          open={attributesManagerOpen}
          onOpenChange={setAttributesManagerOpen}
          attributes={attributes}
          onCreateAttribute={createAttribute}
          onUpdateAttribute={updateAttributeData}
        />

        <OrganizeModal
          open={organizeModalOpen}
          onOpenChange={setOrganizeModalOpen}
          categories={menuData.categories}
          products={menuData.products}
          onSaveOrder={saveOrder}
        />

        <ExternalMenusSheet
          open={externalMenusOpen}
          onOpenChange={setExternalMenusOpen}
        />
      </div>
    </DashboardLayout>
  );
}
