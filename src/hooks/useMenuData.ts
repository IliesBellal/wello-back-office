import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { TvaRateGroup, Menu, Product, UnitOfMeasure, Component, Attribute, MenuData } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMenuData = () => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [menuData, setMenuData] = useState<MenuData>({ products_types: [], products: [] });
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
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
      const [rates, menuResponse, unitsData, attributesData] = await Promise.all([
        menuService.getTvaRates(),
        menuService.getMenuData(),
        menuService.getUnitsOfMeasure(),
        menuService.getAttributes()
      ]);

      // L'API retourne { id, data: { status, products_types, components_types, ... } }
      const apiData = (menuResponse as unknown as { id: string; data: MenuData }).data || (menuResponse as MenuData);
      
      // Garder la structure API telle quelle, sans transformation inutile
      const productsTypes = (apiData.products_types || []).map((cat: Category) => ({
        category_id: cat.category_id,
        category: cat.category,
        category_name: cat.category_name || cat.category, // fallback pour compatibilité
        order: cat.order || 0,
        bg_color: cat.bg_color,
        products: (cat.products || [])
      }));

      const allProducts = productsTypes.flatMap((cat: Category) => cat.products || []);

      // Les composants sont déjà retournés par GET /menu dans components_types
      const componentsFromMenu = (apiData.components_types || []) as Component[];

      setTvaRates(rates);
      setMenuData({
        status: apiData.status,
        last_menu_update: apiData.last_menu_update,
        products_types: productsTypes,
        products: allProducts,
        components_types: apiData.components_types,
        delays: apiData.delays
      });
      setUnits(unitsData);
      setComponents(componentsFromMenu);
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
        products: prev.products.map(p => ({
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
        products: prev.products.map(p => 
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

  const createCategory = async (name: string) => {
    try {
      const newCategory = await menuService.createCategory(name);
      // On s'assure d'avoir category_id et category corrects pour correspondre à l'API
      const categoryWithProps = { 
        ...newCategory, 
        category_id: newCategory.category_id || newCategory.id,
        category: newCategory.category || name,
        category_name: newCategory.category || name,
        products: newCategory.products || []
      };
      setMenuData(prev => ({
        ...prev,
        products_types: [...prev.products_types, categoryWithProps]
      }));
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      });
      return newCategory;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      });
    }
  };

  const createProduct = async (data: Partial<Product>) => {
    try {
      const newProduct = await menuService.createProduct(data);
      const productWithId = { ...newProduct, product_id: newProduct.product_id || newProduct.product_id };
      setMenuData(prev => ({
        ...prev,
        products: [...prev.products, productWithId],
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

  const createComponent = async (data: Omit<Component, 'id'>) => {
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

  const deleteComponent = async (componentId: string) => {
    await menuService.deleteComponent(componentId);
    setComponents(prev => prev.filter(c => c.id !== componentId));
  };

  return {
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
    createProduct,
    createComponent,
    deleteComponent
  };
};
