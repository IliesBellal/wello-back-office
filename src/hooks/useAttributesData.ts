import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Attribute, Component, ComponentCategory, UnitOfMeasure } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook spécialisé pour la page Attributes
 * Charge uniquement: getAttributes(), getComponents(), getUnitsOfMeasure()
 * N'appelle PAS getMenuData() qui charge les produits inutilement
 */
export const useAttributesData = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * `silent` : rechargement en arrière-plan, sans repasser `loading` à `true`.
   * La page remplace tout son contenu par un squelette tant que `loading` est
   * vrai : un rechargement non silencieux déclenché depuis le formulaire
   * d'édition (ex. après l'upload d'une image d'option) le démonte, puis le
   * recrée à partir de l'attribut figé à l'ouverture — la nouvelle image
   * disparaît de l'écran et les modifications non enregistrées sont perdues.
   */
  const loadData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      // Load only attributes, components and units - no products needed
      const [attributesData, componentsData, unitsData] = await Promise.all([
        menuService.getAttributes(),
        menuService.getComponents(),
        menuService.getUnitsOfMeasure(),
      ]);

      const { components: flattenedComponents, categories } = componentsData;

      setAttributes(attributesData);
      setComponents(flattenedComponents);
      setComponentCategories(categories);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading attributes data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les attributs",
        variant: "destructive"
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const createAttribute = async (data: Partial<Attribute>) => {
    const newAttribute = await menuService.createAttribute(data);
    setAttributes(prev => [...prev, newAttribute]);
    return newAttribute;
  };

  const updateAttributeData = async (attributeId: string, data: Partial<Attribute>) => {
    await menuService.updateAttribute(attributeId, data);
    setAttributes(prev => prev.map(a => a.id === attributeId ? { ...a, ...data } : a));
  };

  const deleteAttribute = async (attributeId: string) => {
    await menuService.deleteAttribute(attributeId);
    setAttributes(prev => prev.filter(a => a.id !== attributeId));
  };

  return {
    attributes,
    components,
    componentCategories,
    units,
    loading,
    createAttribute,
    updateAttributeData,
    deleteAttribute,
    // Toujours silencieux : seul appelant, le formulaire d'édition (voir
    // `loadData`).
    refreshAttributes: () => loadData({ silent: true }),
  };
};
