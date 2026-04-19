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
      // Load only attributes, components and units - no products needed
      const [attributesData, componentsData, unitsData] = await Promise.all([
        menuService.getAttributes(),
        menuService.getComponents(),
        menuService.getUnitsOfMeasure(),
      ]);

      const { components: flattenedComponents } = componentsData;

      setAttributes(attributesData);
      setComponents(flattenedComponents);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading attributes data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les attributs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    units,
    loading,
    createAttribute,
    updateAttributeData,
    deleteAttribute,
  };
};
