import { useState, useEffect, useRef } from 'react';
import { menuService } from '@/services/menuService';
import { TvaRateGroup, type Category } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to autonomously load TVA rates and product categories
 * Used by ProductCreateSheet to load data only when needed
 * 
 * This prevents unnecessary API calls when the sheet is not open.
 * Data is cached after first load to avoid duplicate API calls.
 */
interface ApiCategory {
  category_id?: string;
  id?: string;
  category?: string;
  name?: string;
  category_name?: string;
  order?: number;
  bg_color?: string;
}

export const useProductCreateData = (isOpen: boolean) => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    // Only load data when the sheet is opened and hasn't been loaded yet
    if (!isOpen || hasLoadedRef.current) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [rates, menuResponse] = await Promise.all([
          menuService.getTvaRates(),
          menuService.getMenuData(),
        ]);

        setTvaRates(rates);
        
        // Normalize categories from API response
        const apiData = menuResponse.data || menuResponse;
        const normalizedCategories = (apiData.products_types || []).map((cat: ApiCategory) => ({
          category_id: cat.category_id || cat.id || '',
          category: cat.category || cat.name || '',
          category_name: cat.category_name || cat.category || cat.name || '',
          id: cat.id || cat.category_id || '',
          name: cat.name || cat.category || '',
          order: cat.order || 0,
          bg_color: cat.bg_color,
          products: [], // Empty products array for category selector
        } as Category));

        setCategories(normalizedCategories);
        hasLoadedRef.current = true; // Mark as loaded
      } catch (error) {
        console.error('Error loading product create data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données nécessaires',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, toast]);

  return { tvaRates, categories, loading };
};
