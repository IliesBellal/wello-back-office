import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Component, ComponentCategory, UnitOfMeasure, ComponentCreatePayload } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

/** Tri par ordre d'affichage, avec le nom comme départage stable. */
const sortByOrder = (categories: ComponentCategory[]): ComponentCategory[] =>
  [...categories].sort((a, b) => {
    const diff = (a.order ?? 0) - (b.order ?? 0);
    if (diff !== 0) return diff;
    return (a.category_name || a.category || '').localeCompare(b.category_name || b.category || '');
  });

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
      setComponentCategories(sortByOrder(componentCategoriesFromApi));
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
      purchase_unit_id: data.purchase_unit_id,
      purchase_cost_qty: data.purchase_cost_qty
    });
    setComponents(prev => [...prev, newComponent]);
  };

  const updateComponent = async (componentId: string, data: { name?: string; category_id?: string; unit_id?: string; price?: number; purchase_cost?: number; purchase_unit_id?: string; purchase_cost_qty?: number; conservation_days?: number | null; conservation_type?: string; storage_temp_min?: number | null; storage_temp_max?: number | null }): Promise<void> => {
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
      // Nouvelle catégorie en fin de liste tant que l'ordre n'a pas été enregistré
      order: componentCategories.length + 1,
      components: []
    };
    setComponentCategories(prev => [...prev, newCategory]);
    return { category_id: result.id };
  };

  const updateComponentCategory = async (categoryId: string, name: string): Promise<void> => {
    await menuService.updateComponentCategory(categoryId, name);
    setComponentCategories(prev =>
      prev.map(c => (c.category_id === categoryId ? { ...c, category_name: name, category: name } : c))
    );
  };

  const updateComponentCategoriesOrder = async (orderedIds: string[]): Promise<void> => {
    await menuService.updateComponentCategoriesDisplayOrder(orderedIds);
    setComponentCategories(prev =>
      sortByOrder(
        prev.map(c => {
          const index = orderedIds.indexOf(c.category_id);
          return index === -1 ? c : { ...c, order: index + 1 };
        })
      )
    );
  };

  /**
   * Supprime une catégorie.
   * - `reassign` : les ingrédients basculent sur `reassignTo`
   * - `purge`    : les ingrédients sont supprimés avec la catégorie
   * L'état local reflète l'effet côté serveur pour éviter d'afficher des
   * ingrédients rattachés à une catégorie qui n'existe plus.
   */
  const deleteComponentCategory = async (
    categoryId: string,
    options?: { mode: 'reassign'; reassignTo: string } | { mode: 'purge' }
  ): Promise<void> => {
    await menuService.deleteComponentCategory(categoryId, options);

    if (options?.mode === 'reassign') {
      const target = options.reassignTo;
      setComponents(prev =>
        prev.map(c => (c.category_id === categoryId ? { ...c, category_id: target } : c))
      );
    } else {
      setComponents(prev => prev.filter(c => c.category_id !== categoryId));
    }

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
    updateComponentCategory,
    updateComponentCategoriesOrder,
    deleteComponent,
    deleteComponentCategory,
  };
};
