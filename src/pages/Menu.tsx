import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, ChevronDown, CopyPlus, Upload, Globe, Grid3x3, Search, ShieldAlert, ListChecks, Tags as TagsIcon, PencilRuler, FolderPlus } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { useProductCreateSheet } from '@/contexts/ProductCreateSheetContext';
import { useOrganizeModal } from '@/contexts/OrganizeModalContext';
import { MultiFilter } from '@/components/shared/MultiFilter';
import { ProductsTable } from '@/components/menu/ProductsTable';
import { BulkEditDialog } from '@/components/menu/BulkEditDialog';
import { countProductRows } from '@/components/menu/productRows';
import { SimpleProductSheet } from '@/components/menu/SimpleProductSheet';
import { GroupProductSheet } from '@/components/menu/GroupProductSheet';
import { OrganizeModal } from '@/components/menu/OrganizeModal';
import { AllergensMatrixDialog } from '@/components/menu/AllergensMatrixDialog';
import { AttributesMatrixDialog } from '@/components/menu/AttributesMatrixDialog';
import { TagsMatrixDialog } from '@/components/menu/TagsMatrixDialog';
import { ExternalMenusSheet } from '@/components/menu/ExternalMenusSheet';
import { ProductImportDialog } from '@/components/menu/import/ProductImportDialog';
import { CreateProductCategoryDialog } from '@/components/menu/CreateProductCategoryDialog';
import { Product } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { toast } from 'sonner';

/** Valeur sentinelle du filtre : ouvre la création au lieu de filtrer. */
const CREATE_CATEGORY_OPTION = '__create_category__';

type SortKey = 'name' | 'category' | 'tags' | 'status';
type SortDir = 'asc' | 'desc';

function getProductValue(product: Product, key: SortKey, categories: Record<string, string>): string | number {
  switch (key) {
    case 'name': return (product.name || '').toLowerCase();
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
    loadData, 
    units, 
    components,
    attributes,
    tags,
    loading,
    updateProduct,
    registerTag,
    createAttribute,
    updateAttributeData,
    saveOrder,
    createProductCategory,
    updateCategory,
    deleteCategory,
    deleteProduct,
    createProduct,
    applyProductsAllergens,
    applyProductsAttributes,
    applyProductsTags,
    bulkDeleteProducts,
    bulkSetProductsStatus,
    bulkSetProductsAttributes,
    bulkAssignProductsToCategory,
    bulkAssignProductsToMarketingCategory
  } = useMenuData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [externalMenusOpen, setExternalMenusOpen] = useState(false);
  const [allergensModalOpen, setAllergensModalOpen] = useState(false);
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const { isOpen: productCreateOpen, setIsOpen: setProductCreateOpen } = useProductCreateSheet();
  const { isOpen: organizeModalOpen, setIsOpen: setOrganizeModalOpen } = useOrganizeModal();
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [productStatusMap, setProductStatusMap] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

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

  // La sélection survit aux changements de filtre : on peut chercher « pizza »,
  // cocher, puis chercher autre chose et compléter. Le compteur du bouton
  // d'édition de groupe reste la source de vérité sur ce qui sera modifié.
  const handleToggleSelect = (productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
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

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      setSelectedProduct(null);
      setSheetOpen(false);
    } catch (error) {
      console.error('Error deleting product:', error);
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

  // Un groupe déplié ajoute une ligne par sous-produit : le compteur doit
  // refléter les lignes affichées, pas seulement les produits filtrés.
  const displayedRowCount = useMemo(
    () => countProductRows(filteredProducts, expandedGroups),
    [filteredProducts, expandedGroups]
  );

  // Produits réellement visés par l'édition de groupe. On repart de la liste
  // complète, pas des produits filtrés : une sélection faite avant un
  // changement de filtre reste valide.
  const selectedProducts = useMemo(
    () => (menuData?.products || []).filter(p => selectedIds.has(p.product_id)),
    [menuData, selectedIds]
  );

  // L'en-tête ne pilote que les lignes affichées : tout cocher sous filtre ne
  // doit pas embarquer le reste du catalogue.
  const handleToggleSelectAll = () => {
    const visibleIds = filteredProducts.map(p => p.product_id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      visibleIds.forEach(id => (allVisibleSelected ? next.delete(id) : next.add(id)));
      return next;
    });
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
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-3xl font-bold text-foreground">
                Produits
              </h1>
              <div className="flex gap-2 flex-wrap">
                {/* Split button : le dégradé est porté par le conteneur pour
                    rester continu d'une moitié à l'autre. */}
                <div className="flex items-stretch rounded-md bg-gradient-primary">
                  <Button
                    className="rounded-r-none bg-transparent hover:bg-white/10"
                    onClick={() => setProductCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Produit
                  </Button>
                  <div className="my-2 w-px bg-primary-foreground/25" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        aria-label="Autres options de création"
                        className="rounded-l-none bg-transparent hover:bg-white/10"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => toast.info('Création multiple - à implémenter')}>
                        <CopyPlus className="w-4 h-4 mr-2" />
                        Créer plusieurs produits
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setImportOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Importer des produits
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCreateCategoryOpen(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Nouvelle catégorie caisse
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                    <DropdownMenuItem onClick={() => setAllergensModalOpen(true)}>
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Gérer les allergènes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAttributesModalOpen(true)}>
                      <ListChecks className="w-4 h-4 mr-2" />
                      Gérer les options et suppléments
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTagsModalOpen(true)}>
                      <TagsIcon className="w-4 h-4 mr-2" />
                      Gérer les tags
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        }
        description="Gérez votre catalogue de produits, catégories et disponibilités"
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
              <Select
                value={categoryFilter}
                onValueChange={value => {
                  // Entrée d'action et non valeur de filtre : on ouvre la
                  // création et on laisse le filtre courant intact.
                  if (value === CREATE_CATEGORY_OPTION) {
                    setCreateCategoryOpen(true);
                    return;
                  }
                  setCategoryFilter(value);
                }}
              >
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
                  <SelectSeparator />
                  <SelectItem value={CREATE_CATEGORY_OPTION} className="text-primary">
                    <span className="flex items-center gap-2">
                      <FolderPlus className="w-4 h-4" />
                      Nouvelle catégorie caisse
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Compteur */}
              <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                {displayedRowCount} produit{displayedRowCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Édition de groupe : sur la ligne de recherche, tout à droite */}
            <Button
              variant="outline"
              onClick={() => setBulkEditOpen(true)}
              disabled={selectedIds.size === 0}
              className="w-full sm:w-auto shrink-0"
            >
              <PencilRuler className="w-4 h-4 mr-2" />
              Édition de groupe
              {selectedIds.size > 0 && ` (${selectedIds.size})`}
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <ProductsTable
            products={filteredProducts}
            categories={categoryMap}
            tags={tags}
            onProductClick={handleProductClick}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onStatusChange={handleProductStatusChange}
            productStatusMap={productStatusMap}
            updatingProductId={updatingProductId}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        </div>

        <BulkEditDialog
          open={bulkEditOpen}
          onOpenChange={setBulkEditOpen}
          selectedProducts={selectedProducts}
          attributes={attributes}
          categories={menuData?.products_types || []}
          onCreateCategory={createProductCategory}
          onDeleteProducts={bulkDeleteProducts}
          onSetStatus={bulkSetProductsStatus}
          onSetAttributes={bulkSetProductsAttributes}
          onAssignCategory={bulkAssignProductsToCategory}
          onAssignMarketingCategory={bulkAssignProductsToMarketingCategory}
          onApplied={() => setSelectedIds(new Set())}
        />

        <SimpleProductSheet
          productId={selectedProduct && !selectedProduct.is_product_group ? selectedProduct.product_id : null}
          open={sheetOpen && selectedProduct !== null && !selectedProduct.is_product_group}
          onOpenChange={setSheetOpen}
          units={units}
          components={components}
          attributes={attributes}
          categories={menuData?.products_types || []}
          onSave={updateProduct}
          onDelete={handleDeleteProduct}
          onCreateCategory={createProductCategory}
          onTagCreated={registerTag}
          onTagsPersisted={(product_id, tags) => applyProductsTags([{ product_id, tags }])}
          onAllergensPersisted={(product_id, allergens) =>
            applyProductsAllergens([{ product_id, allergens }])
          }
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

        <AllergensMatrixDialog
          open={allergensModalOpen}
          onOpenChange={setAllergensModalOpen}
          products={menuData?.products || []}
          onProductsUpdated={applyProductsAllergens}
        />

        <AttributesMatrixDialog
          open={attributesModalOpen}
          onOpenChange={setAttributesModalOpen}
          products={menuData?.products || []}
          attributes={attributes}
          categories={menuData?.products_types || []}
          onProductsUpdated={applyProductsAttributes}
        />

        <TagsMatrixDialog
          open={tagsModalOpen}
          onOpenChange={setTagsModalOpen}
          products={menuData?.products || []}
          tags={tags}
          onProductsUpdated={applyProductsTags}
        />

        {/* Création : même fiche que la modification, tous onglets disponibles.
            L'API accepte le produit complet en un seul appel, donc pas de
            création en deux temps. */}
        <SimpleProductSheet
          createMode
          open={productCreateOpen}
          onOpenChange={setProductCreateOpen}
          units={units}
          components={components}
          attributes={attributes}
          categories={menuData?.products_types || []}
          onSave={updateProduct}
          onCreate={createProduct}
          onDelete={handleDeleteProduct}
          onCreateCategory={createProductCategory}
          onTagCreated={registerTag}
          onTagsPersisted={(product_id, tags) => applyProductsTags([{ product_id, tags }])}
          onAllergensPersisted={(product_id, allergens) =>
            applyProductsAllergens([{ product_id, allergens }])
          }
        />

        <ProductImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={loadData}
          existingCategories={(menuData?.products_types || []).map(
            (category) => category.category_name || category.category
          )}
        />

        <CreateProductCategoryDialog
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
          onCreateCategory={createProductCategory}
        />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
