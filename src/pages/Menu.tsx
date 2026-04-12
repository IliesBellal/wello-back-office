import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Globe, Grid3x3, Search } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { useProductCreateSheet } from '@/contexts/ProductCreateSheetContext';
import { useOrganizeModal } from '@/contexts/OrganizeModalContext';
import { MultiFilter } from '@/components/shared/MultiFilter';
import { ProductsTable } from '@/components/menu/ProductsTable';
import { SimpleProductSheet } from '@/components/menu/SimpleProductSheet';
import { GroupProductSheet } from '@/components/menu/GroupProductSheet';
import { OrganizeModal } from '@/components/menu/OrganizeModal';
import { ExternalMenusSheet } from '@/components/menu/ExternalMenusSheet';
import { ProductCreateSheet } from '@/components/menu/ProductCreateSheet';
import { Product } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { toast } from 'sonner';

type SortKey = 'name' | 'category' | 'tags' | 'status';
type SortDir = 'asc' | 'desc';

function getProductValue(product: Product, key: SortKey, categories: Record<string, string>): string | number {
  switch (key) {
    case 'name': return product.name.toLowerCase();
    case 'category': return (categories[product.category_id || ''] || product.category || '').toLowerCase();
    case 'tags': return (product.tags?.length ?? 0);
    case 'status': {
      const statuses = [];
      if (product.available_in || (product.available !== false && !('available_in' in product))) {
        statuses.push('1');
      }
      if (product.available_take_away) {
        statuses.push('2');
      }
      if (product.available_delivery) {
        statuses.push('3');
      }
      return statuses.length || 0;
    }
  }
}

export default function Menu() {
  const { 
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
  const [externalMenusOpen, setExternalMenusOpen] = useState(false);
  const { isOpen: productCreateOpen, setIsOpen: setProductCreateOpen } = useProductCreateSheet();
  const { isOpen: organizeModalOpen, setIsOpen: setOrganizeModalOpen } = useOrganizeModal();
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [productStatusMap, setProductStatusMap] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Filtres et tri
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  const handleToggleGroup = (productId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleProductStatusChange = async (productId: string, status: boolean) => {
    // Immédiatement mettre à jour le statut localement (optimistic update)
    setProductStatusMap(prev => ({
      ...prev,
      [productId]: status
    }));
    
    // Désactiver le switch pendant l'appel
    setUpdatingProductId(productId);
    
    try {
      await menuService.updateProductStatus(productId, status);
      
      // Aussi actualiser le produit sélectionné si c'est celui-ci
      if (selectedProduct?.product_id === productId) {
        setSelectedProduct(prev => prev ? { ...prev, available: status } : null);
      }
      toast.success(status ? 'Produit disponible' : 'Produit indisponible');
    } catch (error) {
      // En cas d'erreur, revenir à l'état précédent
      setProductStatusMap(prev => ({
        ...prev,
        [productId]: !status
      }));
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      // Re-activer le switch
      setUpdatingProductId(null);
    }
  };

  // Build category mapping
  const categoryMap = useMemo(() => {
    if (!menuData) return {} as Record<string, string>;
    return menuData.products_types.reduce((acc, cat) => {
      acc[cat.category_id] = cat.category_name || cat.category;
      return acc;
    }, {} as Record<string, string>);
  }, [menuData]);

  // Get all products and apply filters/sorting
  const filteredProducts = useMemo(() => {
    if (!menuData) return [];

    let result = menuData.products || [];

    // Filtre recherche
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Filtre catégorie
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category_id === categoryFilter);
    }

    // Tri
    return [...result].sort((a, b) => {
      const va = getProductValue(a, sortKey, categoryMap);
      const vb = getProductValue(b, sortKey, categoryMap);
      
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      
      const na = va as number;
      const nb = vb as number;
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [menuData, search, categoryFilter, sortKey, sortDir, categoryMap]);

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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">
              Produits
            </h1>
            <div className="flex gap-2">
            <Button className="bg-gradient-primary" onClick={() => setProductCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Produit
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        }
      >
        <div className="space-y-8">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Recherche */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit…"
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
                  {menuData?.products_types?.map(cat => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.category_name || cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Compteur */}
              <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <ProductsTable
            products={filteredProducts}
            categories={categoryMap}
            onProductClick={handleProductClick}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onStatusChange={handleProductStatusChange}
            productStatusMap={productStatusMap}
            updatingProductId={updatingProductId}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
          />
        </div>

        <SimpleProductSheet
          product={selectedProduct && !selectedProduct.is_product_group ? selectedProduct : null}
          open={sheetOpen && selectedProduct !== null && !selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          units={units}
          components={components}
          attributes={attributes}
          categories={menuData?.products_types || []}
          onSave={updateProduct}
          onCreateCategory={createProductCategory}
        />

        <GroupProductSheet
          product={selectedProduct && selectedProduct.is_product_group ? selectedProduct : null}
          open={sheetOpen && selectedProduct !== null && selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          categories={menuData?.products_types || []}
          onSave={updateProduct}
          onCreateCategory={createProductCategory}
        />

        <OrganizeModal
          open={organizeModalOpen}
          onOpenChange={setOrganizeModalOpen}
          categories={menuData?.products_types || []}
          products={menuData?.products || []}
          onSaveOrder={saveOrder}
        />

        <ExternalMenusSheet
          open={externalMenusOpen}
          onOpenChange={setExternalMenusOpen}
        />

        <ProductCreateSheet
          open={productCreateOpen}
          onOpenChange={setProductCreateOpen}
          onCreateProduct={createProduct}
          onCreateCategory={createProductCategory}
        />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
