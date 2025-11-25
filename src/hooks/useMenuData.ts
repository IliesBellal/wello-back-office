import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { TvaRateGroup, MenuData, Product } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMenuData = () => {
  const [tvaRates, setTvaRates] = useState<TvaRateGroup[]>([]);
  const [menuData, setMenuData] = useState<MenuData>({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rates, menu] = await Promise.all([
        menuService.getTvaRates(),
        menuService.getMenuData()
      ]);
      setTvaRates(rates);
      setMenuData(menu);
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

  const updateProductOrder = (categoryId: string, productIds: string[]) => {
    setMenuData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.category_id === categoryId) {
          const newOrder = productIds.indexOf(p.id);
          return newOrder >= 0 ? { ...p, order: newOrder } : p;
        }
        return p;
      })
    }));
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

  return {
    tvaRates,
    menuData,
    loading,
    updateProductOrder,
    updateProduct
  };
};
