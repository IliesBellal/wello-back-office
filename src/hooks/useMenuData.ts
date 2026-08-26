import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Menu, Product, ProductStatus, UnitOfMeasure, Component, Attribute, MenuData, Category, ComponentCategory, Tag, ProductCreatePayload, BulkAvailabilityFields } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMenuData = () => {
  const [menuData, setMenuData] = useState<MenuData>({ products_types: [], products: [] });
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategory[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // ✅ CONSOLIDATED: Single API call to getMenuData()
      // Now returns categories with nested products directly
      const [categoriesData, unitsData, componentsData, attributesData, tagsData] = await Promise.all([
        menuService.getMenuData(),  // Returns Category[] with nested products (replaces both getMenuData() and getProducts())
        menuService.getUnitsOfMeasure(),
        menuService.getComponents(),
        menuService.getAttributes(),
        // Tag catalog: used to resolve tag IDs to names in the products table.
        // Non-blocking — a tag fetch failure must not break the whole menu.
        menuService.getTags().catch(() => [] as Tag[])
      ]);

      // Categories already come with nested products, no need to filter/remap
      const productsTypes = categoriesData.map((cat: Category) => ({
        category_id: cat.category_id || cat.id || '',
        category: cat.category || cat.name || '',
        category_name: cat.category_name || cat.category || cat.name || '',
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category || '',
        order: cat.order || 0,
        bg_color: cat.bg_color,
        available: cat.available ?? cat.availability,
        products: cat.products || []
      }));

      // Flatten all products from categories (including sub-products)
      const allProducts: Product[] = [];
      productsTypes.forEach((cat: Category) => {
        (cat.products || []).forEach((product: Product) => {
          allProducts.push(product);
          // Also include sub-products in the flat array (cast to Product for compatibility)
          if (product.sub_products && Array.isArray(product.sub_products)) {
            allProducts.push(...(product.sub_products as Product[]));
          }
        });
      });

      // Extract components and categories from the API response
      const { components: flattenedComponents, categories: componentCategoriesFromApi } = componentsData;

      setMenuData({
        products_types: productsTypes,
        products: allProducts
      });
      setUnits(unitsData);
      setComponents(flattenedComponents);
      setComponentCategories(componentCategoriesFromApi);
      setAttributes(attributesData);
      setTags(tagsData ?? []);
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du menu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (categoryOrder: string[], productOrder: string[]) => {
    try {
      await Promise.all([
        menuService.updateCategoryOrder(categoryOrder),
        menuService.updateProductOrder(productOrder)
      ]);
      
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.map(c => ({
          ...c,
          order: categoryOrder.indexOf(c.category_id),
          products: c.products?.map(p => ({
            ...p,
            order: productOrder.indexOf(p.product_id)
          }))
        })),
        products: prev.products?.map(p => ({
          ...p,
          order: productOrder.indexOf(p.product_id)
        }))
      }));

      toast({
        title: "Succès",
        description: "Ordre sauvegardé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ordre",
        variant: "destructive"
      });
    }
  };

  const updateProduct = async (productId: string, data: Partial<Product>) => {
    try {
      await menuService.updateProduct(productId, data);
      setMenuData(prev => ({
        ...prev,
        products: prev.products?.map(p => 
          p.product_id === productId ? { ...p, ...data } : p
        ),
        products_types: prev.products_types.map(c => ({
          ...c,
          products: c.products?.map(p => 
            p.product_id === productId ? { ...p, ...data } : p
          )
        }))
      }));
      toast({
        title: "Succès",
        description: "Produit mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le produit",
        variant: "destructive"
      });
    }
  };

  // Errors (e.g. duplicate name) are intentionally left to propagate: the caller
  // needs them to keep its form open, and apiClient's automatic toast already
  // surfaces a specific message for them.
  const createAttribute = async (data: Partial<Attribute>) => {
    const newAttribute = await menuService.createAttribute(data);
    setAttributes(prev => [...prev, newAttribute]);
    toast({
      title: "Succès",
      description: "Attribut créé avec succès"
    });
    return newAttribute;
  };

  const updateAttributeData = async (attributeId: string, data: Partial<Attribute>) => {
    try {
      await menuService.updateAttribute(attributeId, data);
      setAttributes(prev => prev.map(a => a.id === attributeId ? { ...a, ...data } : a));
      toast({
        title: "Succès",
        description: "Attribut mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'attribut",
        variant: "destructive"
      });
    }
  };

  const deleteAttribute = async (attributeId: string) => {
    try {
      await menuService.deleteAttribute(attributeId);
      setAttributes(prev => prev.filter(a => a.id !== attributeId));
      toast({
        title: "Succès",
        description: "Attribut supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'attribut",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createProductCategory = async (name: string): Promise<{ category_id: string }> => {
    try {
      const newCategory = await menuService.createProductCategory(name);
      // Normalize to have all required properties
      const categoryWithProps: Category = { 
        category_id: newCategory.id,
        category: name,
        category_name: name,
        id: newCategory.id,
        name: name,
        order: newCategory.order,
        products: []
      };
      setMenuData(prev => ({
        ...prev,
        products_types: [...prev.products_types, categoryWithProps]
      }));
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      });
      return { category_id: newCategory.id };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createComponentCategory = async (name: string): Promise<{ category_id: string }> => {
    try {
      const newCategory = await menuService.createComponentCategory(name);
      // Create a normalized component category
      const categoryWithProps: ComponentCategory = {
        category_id: newCategory.id,
        category_name: name,
        order: newCategory.order,
        components: []
      };
      setComponentCategories(prev => [...prev, categoryWithProps]);
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      });
      return { category_id: newCategory.id };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Retourne le produit créé : la fiche de création reste ouverte dessus et
  // enchaîne (upload photo, passage en mode édition) — elle a besoin de l'ID.
  // Les erreurs remontent telles quelles, notamment le conflit de nom en
  // doublon dont apiClient affiche déjà le message de confirmation.
  const createProduct = async (data: Partial<Product> | ProductCreatePayload): Promise<Product> => {
    const newProduct = await menuService.createProduct(data);
    const categoryId = newProduct.category_id || newProduct.category;
    setMenuData(prev => ({
      ...prev,
      products: [...(prev.products || []), newProduct],
      products_types: prev.products_types.map(c =>
        c.category_id === categoryId ? {
          ...c,
          products: [...(c.products || []), newProduct]
        } : c
      )
    }));
    toast({
      title: "Succès",
      description: "Produit créé avec succès"
    });
    return newProduct;
  };

  const createComponent = async (data: { name: string; unit_id: string; price: number; category_id?: string; purchase_cost?: number; purchase_unit_id?: string; purchase_cost_qty?: number }) => {
    const newComponent = await menuService.createComponent(data);
    setComponents(prev => [...prev, newComponent]);
    toast({
      title: "Succès",
      description: "Composant créé avec succès"
    });
  };

  const updateComponent = async (componentId: string, data: { name?: string; category_id?: string; unit_id?: string; price?: number; purchase_cost?: number; purchase_unit_id?: string; purchase_cost_qty?: number }) => {
    try {
      const updatedComponent = await menuService.updateComponent(componentId, data);
      setComponents(prev => prev.map(c => c.component_id === componentId ? updatedComponent : c));
      toast({
        title: "Succès",
        description: "Composant mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le composant",
        variant: "destructive"
      });
    }
  };

  const deleteComponent = async (componentId: string) => {
    await menuService.deleteComponent(componentId);
    setComponents(prev => prev.filter(c => c.component_id !== componentId));
  };

  const updateCategory = async (categoryId: string, name: string) => {
    try {
      await menuService.updateCategory(categoryId, name);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.map(c =>
          c.category_id === categoryId
            ? {
                ...c,
                category: name,
                category_name: name,
                name: name
              }
            : c
        )
      }));
      toast({
        title: "Succès",
        description: "Catégorie mise à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la catégorie",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await menuService.deleteProduct(productId);
      setMenuData(prev => ({
        ...prev,
        products: prev.products?.filter(p => p.product_id !== productId),
        products_types: prev.products_types.map(cat => ({
          ...cat,
          products: cat.products?.filter(p => p.product_id !== productId) || []
        }))
      }));
      toast({
        title: "Succès",
        description: "Produit supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive"
      });
      throw error;
    }
  };

  // ===== Groupes de produits =====
  // L'appartenance à un groupe (by_product_of) fait bouger un produit entre
  // la liste racine de sa catégorie et la liste sous_products de son groupe :
  // un patch local fidèle demanderait de dupliquer cette logique de
  // placement. Un rechargement complet est plus sûr et reste bon marché ici
  // (action d'admin peu fréquente), et garantit que l'affichage suit
  // exactement ce que l'API considère comme racine vs sous-produit.
  const setGroupMembers = async (groupId: string, addIds: string[], removeIds: string[]) => {
    try {
      await Promise.all([
        ...addIds.map(id => menuService.updateProduct(id, { by_product_of: groupId })),
        ...removeIds.map(id => menuService.updateProduct(id, { by_product_of: '' })),
      ]);
      await loadData();
      toast({
        title: "Succès",
        description: "Sous-produits mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les sous-produits",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Un groupe supprimé détache ses sous-produits plutôt que de les supprimer
  // en cascade : ce sont de vrais produits du catalogue, ils restent
  // vendables de façon autonome après la suppression du groupe.
  const deleteProductGroup = async (groupId: string, subProductIds: string[]) => {
    try {
      await Promise.all(subProductIds.map(id => menuService.updateProduct(id, { by_product_of: '' })));
      await menuService.deleteProduct(groupId);
      await loadData();
      toast({
        title: "Succès",
        description: "Groupe supprimé, les sous-produits ont été conservés"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await menuService.deleteCategory(categoryId);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.filter(c => c.category_id !== categoryId),
        products: prev.products?.filter(p => p.category_id !== categoryId)
      }));
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteComponentCategory = async (categoryId: string) => {
    try {
      await menuService.deleteComponentCategory(categoryId);
      setComponentCategories(prev => prev.filter(c => c.category_id !== categoryId));
      toast({
        title: "Succès",
        description: "Catégorie d'ingrédient supprimée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie d'ingrédient",
        variant: "destructive"
      });
      throw error;
    }
  };

  const bulkUpdatePrices = async (products: Array<{
    product_id: string;
    price?: number;
    price_take_away?: number;
    price_delivery?: number;
  }>) => {
    try {
      const priceUpdates = await menuService.bulkUpdatePrices(products);
      
      // Create a map of product updates
      const updatesMap = new Map(priceUpdates.map(p => [p.product_id, p]));
      
      // Update menuData by merging the price updates with existing products
      setMenuData(prev => {
        return {
          ...prev,
          products: prev.products.map(p => {
            const updates = updatesMap.get(p.product_id);
            return updates ? { ...p, ...updates } : p;
          }),
          products_types: prev.products_types.map(cat => ({
            ...cat,
            products: (cat.products || []).map(p => {
              const updates = updatesMap.get(p.product_id);
              return updates ? { ...p, ...updates } : p;
            })
          }))
        };
      });
    } catch (error) {
      console.error('Error updating prices:', error);
      throw error;
    }
  };

  // ===== Édition de groupe =====
  // Chaque action tape un endpoint groupé puis reflète le résultat en local :
  // le menu n'étant pas sur react-query, un refetch complet serait le seul
  // autre moyen de rafraîchir le tableau.

  // Applique une transformation aux produits ciblés, dans la liste à plat comme
  // dans les produits imbriqués sous leur catégorie (les deux alimentent l'UI).
  const patchProducts = (
    productIds: string[],
    patch: (product: Product) => Product
  ) => {
    const targeted = new Set(productIds);
    const applyToProduct = (p: Product) => (targeted.has(p.product_id) ? patch(p) : p);

    setMenuData(prev => ({
      ...prev,
      products: prev.products?.map(applyToProduct),
      products_types: prev.products_types.map(cat => ({
        ...cat,
        products: cat.products?.map(applyToProduct)
      }))
    }));
  };

  const bulkDeleteProducts = async (productIds: string[]) => {
    await menuService.bulkDeleteProducts(productIds);
    // Les sous-produits sont désactivés côté API avec leur groupe : on les
    // retire aussi du state, sinon ils resteraient affichés à la réouverture.
    const deleted = new Set(productIds);
    setMenuData(prev => {
      const isDeleted = (p: Product) =>
        deleted.has(p.product_id) || (p.by_product_of ? deleted.has(p.by_product_of) : false);
      return {
        ...prev,
        products: prev.products?.filter(p => !isDeleted(p)),
        products_types: prev.products_types.map(cat => ({
          ...cat,
          products: cat.products?.filter(p => !isDeleted(p)) || []
        }))
      };
    });
  };

  const bulkSetProductsStatus = async (productIds: string[], status: ProductStatus) => {
    await menuService.bulkUpdateProductsStatus(productIds, status);
    patchProducts(productIds, p => ({ ...p, status, available: status === 'available' }));
  };

  const bulkSetProductsAttributes = async (productIds: string[], attributeIds: string[]) => {
    await menuService.bulkUpdateProductsAttributes(productIds, attributeIds);
    const attributesById = new Map(attributes.map(a => [a.id, a]));
    const matched = attributeIds
      .map(id => attributesById.get(id))
      .filter((a): a is Attribute => !!a);
    patchProducts(productIds, p => ({ ...p, configuration: { attributes: matched } }));
  };

  // Ajoute un groupe d'options/suppléments sans retirer ceux déjà attachés :
  // chaque produit ciblé garde sa propre configuration existante en plus du
  // nouveau groupe, d'où un merge par produit plutôt qu'un remplacement global.
  const bulkAddProductsAttribute = async (productIds: string[], attributeId: string) => {
    await menuService.bulkAssignAttributeToProducts(productIds, attributeId);
    const attribute = attributes.find(a => a.id === attributeId);
    if (!attribute) return;
    patchProducts(productIds, p => {
      const existing = (p.configuration && !Array.isArray(p.configuration) ? p.configuration.attributes : []) || [];
      if (existing.some(a => a.id === attributeId)) return p;
      return { ...p, configuration: { attributes: [...existing, attribute] } };
    });
  };

  // Remplace la liste complète des tags des produits ciblés par la même liste.
  const bulkSetProductsTags = async (productIds: string[], tagIds: string[]) => {
    await menuService.bulkSetProductsTags(productIds, tagIds);
    patchProducts(productIds, p => ({ ...p, tags: tagIds }));
  };

  // Ajoute des tags sans retirer ceux déjà présents : un appel API par tag
  // (l'endpoint additif ne porte qu'un seul tag_id), fusion locale par produit
  // puisque chacun peut partir d'une liste de tags différente.
  const bulkAddProductsTags = async (productIds: string[], tagIds: string[]) => {
    await Promise.all(tagIds.map(tagId => menuService.bulkAssignTagToProducts(productIds, tagId)));
    patchProducts(productIds, p => {
      const existingIds = new Set((p.tags || []).map(t => (typeof t === 'string' ? t : t.id)));
      const additions = tagIds.filter(id => !existingIds.has(id));
      if (additions.length === 0) return p;
      return { ...p, tags: [...(p.tags || []), ...additions] };
    });
  };

  // Applique un taux de TVA à un seul type de vente (scope) pour les produits
  // ciblés. Pas de patch local fin : refetch, comme setGroupMembers /
  // deleteProductGroup, pour rester fidèle aux libellés de taux résolus côté API.
  const bulkSetProductsTva = async (productIds: string[], scope: 'on_site' | 'take_away' | 'delivery', tvaId: string) => {
    await menuService.bulkSetProductsTva(productIds, scope, tvaId);
    await loadData();
  };

  // Patch local ciblé plutôt que refetch : contrairement à la TVA, ces champs
  // n'ont pas de libellé résolu côté API à récupérer, un patch immédiat suffit
  // à refléter les colonnes disponibilité de ProductsTable.
  const bulkSetProductsAvailability = async (productIds: string[], fields: BulkAvailabilityFields) => {
    await menuService.bulkSetProductsAvailability(productIds, fields);
    patchProducts(productIds, p => {
      const next: Product = { ...p };
      if (fields.available_in !== undefined) next.available_in = fields.available_in;
      if (fields.available_take_away !== undefined) next.available_take_away = fields.available_take_away;
      if (fields.available_delivery !== undefined) next.available_delivery = fields.available_delivery;
      if (fields.is_available_on_sno !== undefined) next.is_available_on_sno = fields.is_available_on_sno;
      if (fields.sync_uber_eats !== undefined || fields.sync_deliveroo !== undefined) {
        next.integrations = {
          ...p.integrations,
          ...(fields.sync_uber_eats !== undefined && {
            uber_eats: { ...p.integrations?.uber_eats, enabled: fields.sync_uber_eats }
          }),
          ...(fields.sync_deliveroo !== undefined && {
            deliveroo: { ...p.integrations?.deliveroo, enabled: fields.sync_deliveroo }
          })
        };
      }
      return next;
    });
  };

  const bulkAssignProductsToCategory = async (productIds: string[], categoryId: string) => {
    await menuService.bulkAssignProductsToCategory(productIds, categoryId);
    // La catégorie caisse est un champ unique : les produits quittent leur
    // catégorie précédente, il faut donc les déplacer dans products_types.
    const moved = new Set(productIds);
    setMenuData(prev => {
      const movedProducts = (prev.products || [])
        .filter(p => moved.has(p.product_id))
        .map(p => ({ ...p, category_id: categoryId, category: categoryId }));

      return {
        ...prev,
        products: prev.products?.map(p =>
          moved.has(p.product_id) ? { ...p, category_id: categoryId, category: categoryId } : p
        ),
        products_types: prev.products_types.map(cat => {
          const kept = (cat.products || []).filter(p => !moved.has(p.product_id));
          return {
            ...cat,
            products: cat.category_id === categoryId ? [...kept, ...movedProducts] : kept
          };
        })
      };
    });
  };

  // Catégorie marketing : rattachement additif, la catégorie caisse du produit
  // n'est pas touchée — rien à refléter dans menuData, qui ne la porte pas.
  const bulkAssignProductsToMarketingCategory = async (productIds: string[], categoryId: string) => {
    await menuService.bulkAssignProductsToMarketCategory(productIds, categoryId);
  };

  // Merges already-persisted allergen assignments into local state (no API call, no refetch).
  const applyProductsAllergens = (updates: Array<{ product_id: string; allergens: string[] }>) => {
    if (updates.length === 0) return;
    const updatesMap = new Map(updates.map(u => [u.product_id, u.allergens]));

    setMenuData(prev => ({
      ...prev,
      products: prev.products?.map(p =>
        updatesMap.has(p.product_id) ? { ...p, allergens: updatesMap.get(p.product_id) } : p
      ),
      products_types: prev.products_types.map(cat => ({
        ...cat,
        products: cat.products?.map(p =>
          updatesMap.has(p.product_id) ? { ...p, allergens: updatesMap.get(p.product_id) } : p
        )
      }))
    }));
  };

  // Merges already-persisted tag assignments into local state (no API call, no refetch).
  const applyProductsTags = (updates: Array<{ product_id: string; tags: string[] }>) => {
    if (updates.length === 0) return;
    const updatesMap = new Map(updates.map(u => [u.product_id, u.tags]));

    setMenuData(prev => ({
      ...prev,
      products: prev.products?.map(p =>
        updatesMap.has(p.product_id) ? { ...p, tags: updatesMap.get(p.product_id) } : p
      ),
      products_types: prev.products_types.map(cat => ({
        ...cat,
        products: cat.products?.map(p =>
          updatesMap.has(p.product_id) ? { ...p, tags: updatesMap.get(p.product_id) } : p
        )
      }))
    }));
  };

  // Merges already-persisted attribute (options/suppléments) assignments into local state (no API call, no refetch).
  const applyProductsAttributes = (updates: Array<{ product_id: string; attribute_ids: string[] }>) => {
    if (updates.length === 0) return;
    const updatesMap = new Map(updates.map(u => [u.product_id, u.attribute_ids]));
    const attributesById = new Map(attributes.map(a => [a.id, a]));

    const applyToProduct = (p: Product): Product => {
      if (!updatesMap.has(p.product_id)) return p;
      const matchedAttributes = (updatesMap.get(p.product_id) || [])
        .map(id => attributesById.get(id))
        .filter((a): a is Attribute => !!a);
      return { ...p, configuration: { attributes: matchedAttributes } };
    };

    setMenuData(prev => ({
      ...prev,
      products: prev.products?.map(applyToProduct),
      products_types: prev.products_types.map(cat => ({
        ...cat,
        products: cat.products?.map(applyToProduct)
      }))
    }));
  };

  return {
    menuData,
    // Rechargement complet, exposé pour les flux qui écrivent hors de ce hook
    // — l'import de produits en masse notamment. Le menu n'étant pas sur
    // react-query, il n'y a pas d'invalidation de cache possible.
    loadData,
    units,
    components,
    componentCategories,
    attributes,
    tags,
    loading,
    updateProduct,
    createAttribute,
    updateAttributeData,
    deleteAttribute,
    saveOrder,
    createProductCategory,
    createComponentCategory,
    updateCategory,
    deleteProduct,
    createProduct,
    setGroupMembers,
    deleteProductGroup,
    createComponent,
    updateComponent,
    deleteComponent,
    deleteCategory,
    deleteComponentCategory,
    bulkUpdatePrices,
    bulkDeleteProducts,
    bulkSetProductsStatus,
    bulkSetProductsAttributes,
    bulkAddProductsAttribute,
    bulkSetProductsTags,
    bulkAddProductsTags,
    bulkSetProductsTva,
    bulkSetProductsAvailability,
    bulkAssignProductsToCategory,
    bulkAssignProductsToMarketingCategory,
    applyProductsAllergens,
    applyProductsAttributes,
    applyProductsTags
  };
};
