import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Component, ComponentCategory, UnitOfMeasure, ComponentCreatePayload } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook spécialisé pour la page Components
 * Charge uniquement: getComponents() et getUnitsOfMeasure()
 * N'appelle PAS getAttributes() qui est inutile
 */
export const useComponentsData = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load only components and units - no attributes needed
      const [componentsData, unitsData] = await Promise.all([
        menuService.getComponents(),
        menuService.getUnitsOfMeasure(),
      ]);

      const { components: flattenedComponents, categories: componentCategoriesFromApi } = componentsData;

      setComponents(flattenedComponents);
      setComponentCategories(componentCategoriesFromApi);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading components data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les composants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createComponent = async (data: ComponentCreatePayload): Promise<void> => {
    const newComponent = await menuService.createComponent({
      name: data.name,
      category_id: data.category_id,
      unit_id: data.unit_id,
      price: data.price,
      purchase_cost: data.purchase_cost,
      purchase_unit_id: data.purchase_unit_id
    });
    setComponents(prev => [...prev, newComponent]);
  };

  const updateComponent = async (componentId: string, data: { name?: string; category_id?: string; unit_id?: string; price?: number; purchase_cost?: number; purchase_unit_id?: string }): Promise<void> => {
    const updated = await menuService.updateComponent(componentId, data);
    setComponents(prev => prev.map(c => c.component_id === componentId ? updated : c));
  };

  const deleteComponent = async (componentId: string): Promise<void> => {
    await menuService.deleteComponent(componentId);
    setComponents(prev => prev.filter(c => c.component_id !== componentId));
  };

  const createComponentCategory = async (name: string): Promise<{ category_id: string }> => {
    const result = await menuService.createComponentCategory(name);
    const newCategory: ComponentCategory = {
      category_id: result.id,
      category_name: name,
      category: name,
      components: []
    };
    setComponentCategories(prev => [...prev, newCategory]);
    return { category_id: result.id };
  };

  const deleteComponentCategory = async (categoryId: string): Promise<void> => {
    await menuService.deleteComponentCategory(categoryId);
    setComponentCategories(prev => prev.filter(c => c.category_id !== categoryId));
  };

  return {
    components,
    componentCategories,
    units,
    loading,
    createComponent,
    createComponentCategory,
    updateComponent,
    deleteComponent,
    deleteComponentCategory,
  };
};
