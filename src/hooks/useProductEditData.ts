import { useState, useEffect, useRef } from 'react';
import { TvaRateGroup, Tag, Allergen, UnitOfMeasure } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

export const useProductEditData = (isOpen: boolean) => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || hasLoadedRef.current) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [rates, tagsData, allergensData, unitsData] = await Promise.all([
          menuService.getTvaRates(),
          menuService.getTags(),
          menuService.getAllergens(),
          menuService.getUnitsOfMeasure()
        ]);
        setTvaRates(rates);
        setTags(tagsData);
        setAllergens(allergensData);
        setUnits(unitsData);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading product edit data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données du produit',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, toast]);

  return { tvaRates, tags, allergens, units, loading };
};
