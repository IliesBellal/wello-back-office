import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Category, MenuData } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useMarketingCategoryData = () => {
  const [menuData, setMenuData] = useState<MenuData>({ products_types: [], products: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, productsData] = await Promise.all([
        menuService.getMarketingCategories(),
        menuService.getProducts(),
      ]);

      // Marketing categories are already in the correct structure with field mapping done in the service
      const productsTypes = categoriesData.map((cat: Category) => ({
        category_id: cat.category_id || cat.id || '',
        category: cat.category || cat.name || '',
        category_name: cat.category_name || cat.category || cat.name || '',
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category || '',
        order: cat.order || cat.categ_order || 0,
        categ_order: cat.categ_order || cat.order || 0,
        bg_color: cat.bg_color,
        available: cat.available ?? true,
        products: cat.products || [], // Marketing categories don't have nested products
        product_count: cat.product_count ?? 0,
        product_ids: cat.product_ids || []
      }));

      // Marketing categories don't contain products, so we don't flatten them
      setMenuData({
        products_types: productsTypes,
        // Use regular products list for bulk-assign dialog in market categories page
        products: productsData || []
      });
    } catch (error) {
      console.error('Erreur lors du chargement des catégories vitrines:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories vitrines',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createMarketingCategory = async (categoryName: string) => {
    try {
      const newCategoryData = await menuService.createMarketingCategory(categoryName);
      const nextOrder = menuData.products_types.length;

      const newCategory: Category = {
        category_id: newCategoryData.id,
        category: categoryName,
        category_name: categoryName,
        id: newCategoryData.id,
        name: categoryName,
        order: nextOrder,
        categ_order: nextOrder,
        bg_color: undefined,
        available: true,
        products: []
      };

      setMenuData(prev => ({
        ...prev,
        products_types: [...prev.products_types, newCategory]
      }));
      return newCategory;
    } catch (error) {
      console.error('Error creating marketing category:', error);
      throw error;
    }
  };

  const updateMarketingCategory = async (categoryId: string, categoryName: string) => {
    try {
      await menuService.updateMarketingCategory(categoryId, categoryName);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.map(c =>
          c.category_id === categoryId
            ? { ...c, category_name: categoryName, category: categoryName }
            : c
        )
      }));
    } catch (error) {
      console.error('Error updating marketing category:', error);
      throw error;
    }
  };

  const deleteMarketingCategory = async (categoryId: string) => {
    try {
      await menuService.deleteMarketingCategory(categoryId);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.filter(c => c.category_id !== categoryId),
        products: prev.products.filter(p => p.category_id !== categoryId)
      }));
    } catch (error) {
      console.error('Error deleting marketing category:', error);
      throw error;
    }
  };

  return {
    menuData,
    loading,
    createMarketingCategory,
    updateMarketingCategory,
    deleteMarketingCategory,
    refreshMarketingCategoryData: loadData
  };
};
