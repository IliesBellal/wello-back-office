import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Menu, Product, UnitOfMeasure, Component, Attribute, MenuData, Category, ComponentCategory } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMenuData = () => {
  const [menuData, setMenuData] = useState<MenuData>({ products_types: [], products: [] });
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategory[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
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
      const [categoriesData, unitsData, componentsData, attributesData] = await Promise.all([
        menuService.getMenuData(),  // Returns Category[] with nested products (replaces both getMenuData() and getProducts())
        menuService.getUnitsOfMeasure(),
        menuService.getComponents(),
        menuService.getAttributes()
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

  const createAttribute = async (data: Partial<Attribute>) => {
    try {
      const newAttribute = await menuService.createAttribute(data);
      setAttributes(prev => [...prev, newAttribute]);
      toast({
        title: "Succès",
        description: "Attribut créé avec succès"
      });
      return newAttribute;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'attribut",
        variant: "destructive"
      });
    }
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

  const createProduct = async (data: Partial<Product>) => {
    try {
      const newProduct = await menuService.createProduct(data);
      const productWithId = { ...newProduct, product_id: newProduct.product_id || newProduct.product_id };
      setMenuData(prev => ({
        ...prev,
        products: [...(prev.products || []), productWithId],
        products_types: prev.products_types.map(c => 
          c.category_id === productWithId.category ? {
            ...c,
            products: [...(c.products || []), productWithId]
          } : c
        )
      }));
      toast({
        title: "Succès",
        description: "Produit créé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit",
        variant: "destructive"
      });
    }
  };

  const createComponent = async (data: { name: string; unit_id: number; price: number; category_id?: string; purchase_cost?: number; purchase_unit_id?: string | number }) => {
    try {
      const newComponent = await menuService.createComponent(data);
      setComponents(prev => [...prev, newComponent]);
      toast({
        title: "Succès",
        description: "Composant créé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le composant",
        variant: "destructive"
      });
    }
  };

  const updateComponent = async (componentId: string, data: { name?: string; category_id?: string; unit_id?: number; price?: number; purchase_cost?: number; purchase_unit_id?: string | number }) => {
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

  return {
    menuData,
    units,
    components,
    componentCategories,
    attributes,
    loading,
    updateProduct,
    createAttribute,
    updateAttributeData,
    saveOrder,
    createProductCategory,
    createComponentCategory,
    updateCategory,
    createProduct,
    createComponent,
    updateComponent,
    deleteComponent,
    deleteCategory
  };
};
