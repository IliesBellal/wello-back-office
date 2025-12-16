import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { TvaRateGroup, MenuData, Product, UnitOfMeasure, Component, Attribute } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMenuData = () => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [menuData, setMenuData] = useState<MenuData>({ categories: [], products: [] });
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rates, menu, unitsData, componentsData, attributesData] = await Promise.all([
        menuService.getTvaRates(),
        menuService.getMenuData(),
        menuService.getUnitsOfMeasure(),
        menuService.getComponents(),
        menuService.getAttributes()
      ]);
      setTvaRates(rates);
      setMenuData(menu);
      setUnits(unitsData);
      setComponents(componentsData);
      setAttributes(attributesData);
    } catch (error) {
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
        categories: prev.categories.map(c => ({
          ...c,
          order: categoryOrder.indexOf(c.id)
        })),
        products: prev.products.map(p => ({
          ...p,
          order: productOrder.indexOf(p.id)
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
          p.id === productId ? { ...p, ...data } : p
        )
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
      setMenuData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
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

  const createProduct = async (data: any) => {
    try {
      const newProduct = await menuService.createProduct(data);
      setMenuData(prev => ({
        ...prev,
        products: [...prev.products, newProduct]
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

  const createComponent = async (data: any) => {
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
    try {
      await menuService.deleteComponent(componentId);
      setComponents(prev => prev.filter(c => c.id !== componentId));
    } catch (error) {
      throw error;
    }
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
