import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, MoreVertical, Plus, Settings, Globe, Grid3x3 } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { ProductCard } from '@/components/menu/ProductCard';
import { SimpleProductSheet } from '@/components/menu/SimpleProductSheet';
import { GroupProductSheet } from '@/components/menu/GroupProductSheet';
import { CategoryManagementSheet } from '@/components/menu/CategoryManagementSheet';
import { AttributesManager } from '@/components/menu/AttributesManager';
import { OrganizeModal } from '@/components/menu/OrganizeModal';
import { ExternalMenusSheet } from '@/components/menu/ExternalMenusSheet';
import { ProductCreateSheet } from '@/components/menu/ProductCreateSheet';
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
    saveOrder,
    createCategory,
    createProduct
  } = useMenuData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attributesManagerOpen, setAttributesManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [externalMenusOpen, setExternalMenusOpen] = useState(false);
  const [productCreateOpen, setProductCreateOpen] = useState(false);

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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Menu de l'établissement
          </h1>
          <div className="flex gap-2">
            <Button className="bg-gradient-primary" onClick={() => setProductCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Produit
            </Button>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
              <Folder className="w-4 h-4 mr-2" />
              Catégories
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => setAttributesManagerOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Gérer les Attributs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExternalMenusOpen(true)}>
                  <Globe className="w-4 h-4 mr-2" />
                  Menus Externes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrganizeModalOpen(true)}>
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Organiser (Mode Tablette)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-8">
          {menuData.products_types
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <div key={category.category_id} className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">{category.category_name || category.category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.products
                    .filter((p) => p.category_id === category.category_id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((product) => (
                      <ProductCard
                        key={product.product_id}
                        product={product}
                        onClick={() => handleProductClick(product)}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>

        <SimpleProductSheet
          product={selectedProduct && !selectedProduct.is_product_group ? selectedProduct : null}
          open={sheetOpen && selectedProduct !== null && !selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          tvaRates={tvaRates}
          units={units}
          components={components}
          attributes={attributes}
          categories={menuData.products_types}
          onSave={updateProduct}
          onCreateCategory={createCategory}
        />

        <GroupProductSheet
          product={selectedProduct && selectedProduct.is_product_group ? selectedProduct : null}
          open={sheetOpen && selectedProduct !== null && selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          categories={menuData.products_types}
          onSave={updateProduct}
          onCreateCategory={createCategory}
        />

        <CategoryManagementSheet
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
          categories={menuData.products_types}
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
          categories={menuData.products_types}
          products={menuData.products}
          onSaveOrder={saveOrder}
        />

        <ExternalMenusSheet
          open={externalMenusOpen}
          onOpenChange={setExternalMenusOpen}
        />

        <ProductCreateSheet
          open={productCreateOpen}
          onOpenChange={setProductCreateOpen}
          categories={menuData.products_types}
          tvaRates={tvaRates}
          onCreateProduct={createProduct}
          onCreateCategory={createCategory}
        />
      </div>
    </DashboardLayout>
  );
}
