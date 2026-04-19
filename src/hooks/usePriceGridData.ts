import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Menu, Category } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook spécialisé pour la page PriceGrid
 * Charge uniquement: getMenuData()
 * N'appelle PAS getUnitsOfMeasure(), getComponents(), getAttributes()
 */
export const usePriceGridData = () => {
  const [menuData, setMenuData] = useState<Menu>({ products_types: [], products: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load only menu data (categories with nested products)
      const categoriesData = await menuService.getMenuData();

      const productsTypes = categoriesData.map((cat: Category) => ({
        category_id: cat.category_id || cat.id || '',
        category: cat.category || cat.name || '',
        category_name: cat.category_name || cat.category || cat.name || '',
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category || '',
        order: cat.order || 0,
        bg_color: cat.bg_color,
        available: cat.available ?? cat.availability,
        products: cat.products || []
      }));

      // Flatten all products from categories (including sub-products)
      const allProducts = [];
      productsTypes.forEach((cat: Category) => {
        (cat.products || []).forEach((product) => {
          allProducts.push(product);
          if (product.sub_products && Array.isArray(product.sub_products)) {
            allProducts.push(...(product.sub_products));
          }
        });
      });

      setMenuData({
        products_types: productsTypes,
        products: allProducts
      });
    } catch (error) {
      console.error('Error loading price grid data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de la grille de prix",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdatePrices = async (products: Array<{ product_id: string; price?: number; price_take_away?: number; price_delivery?: number }>) => {
    try {
      const updatePromises = products.map(p =>
        menuService.updateProduct(p.product_id, {
          price: p.price,
          price_take_away: p.price_take_away,
          price_delivery: p.price_delivery,
        })
      );
      await Promise.all(updatePromises);
      toast({
        title: 'Succès',
        description: `${products.length} produit(s) mis à jour`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les prix',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    menuData,
    loading,
    bulkUpdatePrices,
  };
};
