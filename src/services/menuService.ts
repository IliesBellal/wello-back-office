import { apiClient, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";
import { TvaRateGroup, Menu, UnitOfMeasure, Component, Attribute, Product, Category, ComponentCategory, Tag, Allergen } from "@/types/menu";

// ============= Mock Data =============
const mockTvaRates: TvaRateGroup[] = [
  { 
    id: 1, 
    name: "Sur Place", 
    rates: [
      { id: 10, value: 10, label: "TVA 10%" }, 
      { id: 20, value: 20, label: "TVA 20%" }
    ] 
  },
  { 
    id: 2, 
    name: "Emporter", 
    rates: [
      { id: 5, value: 5.5, label: "TVA 5.5%" }, 
      { id: 10, value: 10, label: "TVA 10%" }
    ] 
  },
  { 
    id: 3, 
    name: "Livraison", 
    rates: [
      { id: 20, value: 20, label: "TVA 20%" }
    ] 
  }
];

const mockUnitsOfMeasure: UnitOfMeasure[] = [
  { id: 10, name: "Grammes (g)", compatible_with: ["10", "11", "12"] },
  { id: 11, name: "Kilogrammes (kg)", compatible_with: ["10", "11", "12"] },
  { id: 12, name: "Milligrammes (mg)", compatible_with: ["10", "11", "12"] },
  { id: 20, name: "Litres (L)", compatible_with: ["20", "21"] },
  { id: 21, name: "Centilitres (cL)", compatible_with: ["20", "21"] }
];

const mockComponents: Component[] = [
  { component_id: "c1", name: "Farine", price: 500, status: "1" },
  { component_id: "c2", name: "Sauce Tomate", category: "1", price: 200, status: "1" },
  { component_id: "c3", name: "Mozzarella", category: "2", price: 100, status: "1" }
];

const mockComponentCategories: ComponentCategory[] = [
  {
    category_id: "1",
    category_name: "Viande",
    order: 0,
    components: [
      { component_id: "71", name: "Jambon", category: "1", price: 100, status: "1" },
      { component_id: "74", name: "Lardons", category: "1", price: 100, status: "1" },
      { component_id: "79", name: "Poulet", category: "1", price: 100, status: "1" }
    ]
  },
  {
    category_id: "2",
    category_name: "Fromage",
    order: 1,
    components: [
      { component_id: "85", name: "Mozzarella", category: "2", price: 150, status: "1" },
      { component_id: "86", name: "Chèvre", category: "2", price: 120, status: "1" }
    ]
  }
];

const mockAttributes: Attribute[] = [
  { 
    id: "attr_1", 
    title: "Taille Pizza", 
    type: "CHECK", 
    min: 1, 
    max: 1,
    options: [
      { id: "opt_1", title: "Junior", price: 0 },
      { id: "opt_2", title: "Senior", price: 200 },
      { id: "opt_3", title: "Mega", price: 500 }
    ]
  },
  { 
    id: "attr_2", 
    title: "Suppléments", 
    type: "CHECK", 
    min: 0, 
    max: 5,
    options: [
      { id: "opt_4", title: "Olive", price: 50 },
      { id: "opt_5", title: "Oeuf", price: 100 }
    ]
  }
];

const mockCategories: Category[] = [
  { category_id: "cat1", category: "Pizzas", id: "cat1", name: "Pizzas", order: 1, products: [] },
  { category_id: "cat2", category: "Boissons", id: "cat2", name: "Boissons", order: 2, products: [] }
];

const mockProducts: Product[] = [
  {
    product_id: "p1", 
    category_id: "cat1", 
    name: "Margherita", 
    description: "Tomate, Mozza", 
    price: 1200, 
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 1,
    allergens: ["allergen-milk"],
    tags: ["tag_2"],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
    integrations: { 
      uber_eats: { enabled: true, price_override: 1350, id: "ue_123" },
      deliveroo: { enabled: false }
    }
  },
  {
    product_id: "p1b", 
    category_id: "cat1", 
    name: "Regina", 
    description: "Tomate, Mozza, Jambon, Champignons", 
    price: 1400, 
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 2,
    allergens: ["allergen-milk", "allergen-gluten"],
    tags: ["tag_1"],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: false, scan_order: true },
    integrations: { 
      uber_eats: { enabled: false },
      deliveroo: { enabled: false }
    }
  },
  {
    product_id: "p2", 
    category_id: "cat2", 
    name: "Softs 33cl", 
    is_group: true,
    is_product_group: true,
    available: true,
    order: 1,
    allergens: [],
    tags: [],
    bg_color: "#f0f9ff",
    sub_products: [
      { id: "p2_1", name: "Coca Cola", price: 200 },
      { id: "p2_2", name: "Fanta", price: 200 },
      { id: "p2_3", name: "Sprite", price: 200 }
    ]
  },
  {
    product_id: "p3", 
    category_id: "cat2", 
    name: "Eau Minérale", 
    description: "50cl", 
    price: 150, 
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 2,
    allergens: [],
    tags: [],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
    integrations: { 
      uber_eats: { enabled: false },
      deliveroo: { enabled: false }
    }
  }
];

const mockAllergens: Allergen[] = [
  { allergen_id: "allergen-sulphites", name: "Anhydride sulfureux et sulfites", code: "SULPHITES" },
  { allergen_id: "allergen-peanuts", name: "Arachides", code: "PEANUTS" },
  { allergen_id: "allergen-celery", name: "Céleri", code: "CELERY" },
  { allergen_id: "allergen-crustaceans", name: "Crustacés", code: "CRUSTACEANS" },
  { allergen_id: "allergen-tree_nuts", name: "Fruits à coque", code: "TREE_NUTS" },
  { allergen_id: "allergen-gluten", name: "Gluten", code: "GLUTEN" },
  { allergen_id: "allergen-sesame", name: "Graines de sésame", code: "SESAME" },
  { allergen_id: "allergen-milk", name: "Lait", code: "MILK" },
  { allergen_id: "allergen-lupin", name: "Lupin", code: "LUPIN" },
  { allergen_id: "allergen-molluscs", name: "Mollusques", code: "MOLLUSCS" },
  { allergen_id: "allergen-mustard", name: "Moutarde", code: "MUSTARD" },
  { allergen_id: "allergen-eggs", name: "Œufs", code: "EGGS" },
  { allergen_id: "allergen-fish", name: "Poissons", code: "FISH" },
  { allergen_id: "allergen-soy", name: "Soja", code: "SOY" }
];

const mockTags: Tag[] = [
  { id: "tag_1", name: "Végétarien" },
  { id: "tag_2", name: "Vegan" },
  { id: "tag_3", name: "Spicy" },
  { id: "tag_4", name: "Nouveau" },
  { id: "tag_5", name: "Populaire" }
];

const mockMenuData: Menu = {
  products_types: mockCategories,
  products: mockProducts
};

// ============= API Functions =============
export const menuService = {
  async getTvaRates(): Promise<TvaRateGroup[]> {
    logAPI('GET', '/pos/tva_rates');
    return withMock(
      () => [...mockTvaRates],
      () => apiClient.get<WelloApiResponse<TvaRateGroup[]>>('/pos/tva_rates').then(res => res.data)
    );
  },

  async getMenuData(): Promise<Menu> {
    logAPI('GET', '/menu');
    return withMock(
      () => ({ 
        ...mockMenuData, 
        products_types: [...mockMenuData.products_types!], 
        products: [...mockMenuData.products!] 
      }),
      () => apiClient.get<Menu>('/menu')
    );
  },

  async getProducts(): Promise<Product[]> {
    logAPI('GET', '/menu/products');
    return withMock(
      () => [...mockProducts],
      async () => {
        const response = await apiClient.get<WelloApiResponse<Category[]>>('/menu/products');
        const data = response.data;
        
        // Flatten products from categories - the API returns categories with nested products
        const products: Product[] = [];
        
        if (Array.isArray(data)) {
          data.forEach((category) => {
            if (category.products && Array.isArray(category.products)) {
              products.push(...category.products);
            }
          });
        }
        
        return products;
      }
    );
  },

  async updateProduct(productId: string, data: Partial<unknown>): Promise<void> {
    logAPI('PATCH', `/menu/products/${productId}`, data);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/${productId}`, data)
    );
  },

  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    logAPI('GET', '/menu/units_of_measures');
    return withMock(
      () => [...mockUnitsOfMeasure],
      () => apiClient.get<WelloApiResponse<UnitOfMeasure[]>>('/menu/units_of_measures').then(res => res.data)
    );
  },

  async getComponents(): Promise<{ components: Component[]; categories: ComponentCategory[] }> {
    logAPI('GET', '/menu/components');
    return withMock(
      () => {
        // Flatten components from categories for mock
        const flattenedComponents = mockComponentCategories.flatMap(cat =>
          cat.components.map(comp => ({
            ...comp,
            category_id: cat.category_id,
            available: comp.status === '1'
          }))
        );
        return {
          components: flattenedComponents,
          categories: mockComponentCategories
        };
      },
      async () => {
        const response = await apiClient.get<WelloApiResponse<ComponentCategory[]>>('/menu/components');
        const data = response.data;
        
        // Flatten components from categories
        const components: Component[] = [];
        const categories: ComponentCategory[] = [];
        
        if (Array.isArray(data)) {
          data.forEach((category) => {
            categories.push(category);
            if (category.components && Array.isArray(category.components)) {
              category.components.forEach((comp) => {
                components.push({
                  ...comp,
                  category_id: category.category_id,
                  available: comp.status === '1'
                });
              });
            }
          });
        }
        
        return { components, categories };
      }
    );
  },

  async getAttributes(): Promise<Attribute[]> {
    logAPI('GET', '/menu/attributes');
    return withMock(
      () => [...mockAttributes],
      () => apiClient.get<WelloApiResponse<Attribute[]>>('/menu/attributes').then(res => res.data)
    );
  },

  async createAttribute(data: Partial<Attribute>): Promise<Attribute> {
    logAPI('POST', '/menu/attributes', data);
    return withMock(
      () => ({ ...data, id: `attr_${Date.now()}` } as Attribute),
      () => apiClient.post<Attribute>('/menu/attributes', data)
    );
  },

  async updateAttribute(attributeId: string, data: Partial<Attribute>): Promise<void> {
    logAPI('PATCH', `/menu/attributes/${attributeId}`, data);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/attributes/${attributeId}`, data)
    );
  },

  async updateProductOrder(productIds: string[]): Promise<void> {
    const payload = { products: productIds.map(id => ({ product_id: id })) };
    logAPI('PATCH', '/menu/products/order', payload);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>('/menu/products/order', payload)
    );
  },

  async updateCategoryOrder(categoryIds: string[]): Promise<void> {
    const payload = { categories: categoryIds.map(id => ({ category_id: id })) };
    logAPI('PATCH', '/menu/categories/order', payload);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>('/menu/categories/order', payload)
    );
  },

  async updateExternalMenu(platform: 'uber_eats' | 'deliveroo'): Promise<void> {
    logAPI('PATCH', `/menu/${platform}`, {});
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/${platform}`, {})
    );
  },

  async createProductCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/products/category/create', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ category_id: string; message: string; status: string }>>('/menu/products/category/create', { name });
        // Extract category_id from response.data
        const categoryId = response.data?.category_id || `cat_${Date.now()}`;
        return {
          id: categoryId,
          name: name,
          order: 99 // Default order since API doesn't return it
        };
      }
    );
  },

  async createComponentCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/components/category/create', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ category_id: string; message: string; status: string }>>('/menu/components/category/create', { name });
        // Extract category_id from response.data
        const categoryId = response.data?.category_id || `cat_${Date.now()}`;
        return {
          id: categoryId,
          name: name,
          order: 99 // Default order since API doesn't return it
        };
      }
    );
  },

  async updateCategory(categoryId: string, name: string): Promise<void> {
    logAPI('PATCH', `/menu/categories/${categoryId}`, { name });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/categories/${categoryId}`, { name })
    );
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    logAPI('POST', '/menu/product/create', data);
    return withMock(
      () => ({ 
        product_id: `p_${Date.now()}`, 
        category_id: data.category_id || '',
        name: data.name || '',
        is_product_group: data.is_product_group || false,
        order: 999,
        ...data,
        integrations: {
          uber_eats: { enabled: false },
          deliveroo: { enabled: false }
        }
      } as Product),
      () => apiClient.post<Product>('/menu/product/create', data)
    );
  },

  async createComponent(data: { name: string; unit_id: number; price: number; category_id?: string }): Promise<Component> {
    logAPI('POST', '/menu/components/create', data);
    return withMock(
      () => ({ 
        component_id: `comp_${Date.now()}`, 
        name: data.name,
        unit_id: data.unit_id,
        price_per_unit: data.price / 100,
        category_id: data.category_id
      } as Component),
      () => apiClient.post<Component>('/menu/components/create', data)
    );
  },

  async deleteComponent(componentId: string): Promise<void> {
    logAPI('DELETE', `/menu/components/${componentId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/components/${componentId}`)
    );
  },

  async deleteCategory(categoryId: string): Promise<void> {
    logAPI('DELETE', `/menu/products/category/${categoryId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/products/category/${categoryId}`)
    );
  },

  async uploadProductImage(productId: string, file: File): Promise<{ photo_url: string }> {
    logAPI('PUT', `/menu/product/${productId}/img`, { fileName: file.name, fileSize: file.size });
    
    return withMock(
      async () => {
        // Mock: simulate upload delay and return fake URL
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { photo_url: `https://storage.welloresto.fr/merchants/2/products/mock_${Date.now()}.jpg` };
      },
      async () => {
        // Real upload: use FormData and fetch directly (bypassing JSON serialization)
        const formData = new FormData();
        formData.append('photo', file);
        
        const authToken = localStorage.getItem("authData");
        let token = null;
        if (authToken) {
          try {
            const parsed = JSON.parse(authToken);
            token = parsed.token;
          } catch {
            // ignore
          }
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://welloresto-api-prod.onrender.com"}/menu/product/${productId}/image`, {
          method: 'PUT',
          headers,
          body: formData
        });

        if (!response.ok) {
          let errorMessage = 'Upload failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const data = await response.json() as WelloApiResponse<{ photo_url: string }>;
        return data.data;
      }
    );
  },

  async createTag(name: string): Promise<{ id: string; name: string }> {
    logAPI('POST', '/menu/tags/create', { name });
    return withMock(
      () => ({ id: `tag_${Date.now()}`, name }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ id: string; name: string }>>('/menu/tags/create', { name });
        return response.data;
      }
    );
  },

  async getTags(): Promise<Tag[]> {
    logAPI('GET', '/menu/tags');
    return withMock(
      () => [...mockTags],
      () => apiClient.get<WelloApiResponse<Tag[]>>('/menu/tags').then(res => res.data)
    );
  },

  async getAllergens(): Promise<Allergen[]> {
    logAPI('GET', '/allergens');
    return withMock(
      () => [...mockAllergens],
      () => apiClient.get<WelloApiResponse<Allergen[]>>('/allergens').then(res => res.data)
    );
  }
};
