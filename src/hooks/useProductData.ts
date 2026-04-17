import { useState, useEffect } from 'react';
import { Product } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to load a single product's detailed information
 * Called when a product detail/focus sidesheet opens
 * 
 * Usage:
 * const { product, loading, error } = useProductData(productId, isOpen);
 */
export const useProductData = (productId: string | null, isOpen: boolean) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !productId) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await menuService.getProduct(productId);
        setProduct(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load product';
        setError(errorMessage);
        console.error('Error loading product:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les détails du produit',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, isOpen, toast]);

  return { product, loading, error };
};
