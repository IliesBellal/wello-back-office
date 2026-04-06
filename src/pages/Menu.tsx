import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, MoreVertical, Plus, Globe, Grid3x3, AlertCircle, Tag as TagIcon } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { ProductCard } from '@/components/menu/ProductCard';
import { SimpleProductSheet } from '@/components/menu/SimpleProductSheet';
import { GroupProductSheet } from '@/components/menu/GroupProductSheet';
import { CategoryManagementSheet } from '@/components/menu/CategoryManagementSheet';
import { OrganizeModal } from '@/components/menu/OrganizeModal';
import { ExternalMenusSheet } from '@/components/menu/ExternalMenusSheet';
import { AllergensSheet } from '@/components/menu/AllergensSheet';
import { TagsSheet } from '@/components/menu/TagsSheet';
import { ProductCreateSheet } from '@/components/menu/ProductCreateSheet';
import { Product, Tag, Allergen } from '@/types/menu';
import { menuService } from '@/services/menuService';

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
    createProductCategory,
    updateCategory,
    deleteCategory,
    createProduct
  } = useMenuData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [externalMenusOpen, setExternalMenusOpen] = useState(false);
  const [productCreateOpen, setProductCreateOpen] = useState(false);
  const [allergensSheetOpen, setAllergensSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // Load tags and allergens on mount
  useEffect(() => {
    const loadTagsAndAllergens = async () => {
      try {
        const [tagsData, allergensData] = await Promise.all([
          menuService.getTags(),
          menuService.getAllergens()
        ]);
        setTags(tagsData);
        setAllergens(allergensData);
      } catch (error) {
        console.error('Error loading tags or allergens:', error);
      }
    };

    loadTagsAndAllergens();
  }, []);

  const handleTagCreated = (newTag: { id: string; name: string }) => {
    setTags(prevTags => {
      // Check if tag already exists (prevent duplicates)
      if (prevTags.some(t => t.id === newTag.id)) {
        return prevTags;
      }
      return [...prevTags, newTag];
    });
  };

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
                <DropdownMenuItem onClick={() => setExternalMenusOpen(true)}>
                  <Globe className="w-4 h-4 mr-2" />
                  Menus Externes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrganizeModalOpen(true)}>
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Organiser (Mode Tablette)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAllergensSheetOpen(true)}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Allergènes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTagsSheetOpen(true)}>
                  <TagIcon className="w-4 h-4 mr-2" />
                  Tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-8">
          {menuData.products_types
            .sort((a, b) => (a.categ_order ?? a.order ?? 0) - (b.categ_order ?? b.order ?? 0))
            .map((category) => (
              <div key={category.category_id} className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">{category.category_name || category.category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.products
                    .filter((p) => p.category_id === category.category_id)
                    .sort((a, b) => (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0))
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
          tags={tags}
          allergens={allergens}
          onSave={updateProduct}
          onCreateCategory={createProductCategory}
          onTagCreated={handleTagCreated}
        />

        <GroupProductSheet
          product={selectedProduct && selectedProduct.is_product_group ? selectedProduct : null}
          open={sheetOpen && selectedProduct !== null && selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          categories={menuData.products_types}
          onSave={updateProduct}
          onCreateCategory={createProductCategory}
        />

        <CategoryManagementSheet
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
          categories={menuData.products_types}
          onCreateCategory={createProductCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
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
          onCreateCategory={createProductCategory}
        />

        <AllergensSheet
          open={allergensSheetOpen}
          onOpenChange={setAllergensSheetOpen}
          allergens={allergens}
        />

        <TagsSheet
          open={tagsSheetOpen}
          onOpenChange={setTagsSheetOpen}
          tags={tags}
          onTagCreated={(newTag) => setTags([...tags, newTag])}
        />
      </div>
    </DashboardLayout>
  );
}
