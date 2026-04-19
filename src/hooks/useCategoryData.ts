import { useState, useEffect } from 'react';
import { menuService } from '@/services/menuService';
import { Category, MenuData } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

export const useCategoryData = () => {
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
      // ✅ OPTIMIZED: Only load GET /menu/products
      // Categories page only needs categories and products for counting
      // No need for units, components, or attributes
      const categoriesData = await menuService.getMenuData();

      const productsTypes = categoriesData.map((cat: Category) => ({
        category_id: cat.category_id || cat.id || '',
        category: cat.category || cat.name || '',
        category_name: cat.category_name || cat.category || cat.name || '',
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category || '',
        order: cat.order || 0,
        categ_order: cat.categ_order || cat.order || 0,
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
            allProducts.push(...product.sub_products);
          }
        });
      });

      setMenuData({
        products_types: productsTypes,
        products: allProducts
      });
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProductCategory = async (categoryName: string) => {
    try {
      const newCategoryData = await menuService.createProductCategory(categoryName);
      
      // Calculate the next order (current count of categories)
      const nextOrder = menuData.products_types.length;
      
      // Create the new category with the proper structure
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
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, categoryName: string) => {
    try {
      await menuService.updateCategory(categoryId, categoryName);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.map(c =>
          c.category_id === categoryId
            ? { ...c, category_name: categoryName, category: categoryName }
            : c
        )
      }));
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await menuService.deleteCategory(categoryId);
      setMenuData(prev => ({
        ...prev,
        products_types: prev.products_types.filter(c => c.category_id !== categoryId),
        products: prev.products.filter(p => p.category_id !== categoryId)
      }));
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return {
    menuData,
    loading,
    createProductCategory,
    updateCategory,
    deleteCategory,
    refreshCategoryData: loadData
  };
};
