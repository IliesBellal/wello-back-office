import { useState, useEffect, useRef } from 'react';
import { TvaRateGroup } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

export const useProductEditData = (isOpen: boolean) => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || hasLoadedRef.current) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const rates = await menuService.getTvaRates();
        setTvaRates(rates);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading TVA rates:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les taux TVA',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, toast]);

  return { tvaRates, loading };
};
