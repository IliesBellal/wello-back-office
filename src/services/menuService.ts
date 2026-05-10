import { apiClient, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";
import { TvaRateGroup, Menu, UnitOfMeasure, Component, Attribute, Product, Category, ComponentCategory, Tag, Allergen, ProductCreatePayload } from "@/types/menu";

// ============= Mock Data =============
const mockTvaRates: TvaRateGroup[] = [
  { 
    id: 59, 
    name: "Sur place", 
    delivery_type: "IN",
    rates: [
      { id: 5, value: 10, label: "TVA 10%" }, 
      { id: 6, value: 20, label: "TVA 20%" }
    ] 
  },
  { 
    id: 60, 
    name: "À livrer", 
    delivery_type: "DELIVERY",
    rates: [
      { id: 8, value: 5.5, label: "TVA 5.5%" }, 
      { id: 7, value: 10, label: "TVA 10%" },
      { id: 9, value: 20, label: "TVA 20%" }
    ] 
  },
  { 
    id: 61, 
    name: "À emporter", 
    delivery_type: "TAKE_AWAY",
    rates: [
      { id: 1, value: 5.5, label: "TVA 5.5%" }, 
      { id: 2, value: 10, label: "TVA 10%" },
      { id: 3, value: 20, label: "TVA 20%" }
    ] 
  }
];

const mockUnitsOfMeasure: UnitOfMeasure[] = [
  { id: "1", name: "Pièces", compatible_with: ["1"] },
  { id: "2", name: "Grammes", compatible_with: ["2", "3"] },
  { id: "3", name: "Kilogrammes", compatible_with: ["2", "3"] },
  { id: "4", name: "Litres", compatible_with: ["4", "5", "6"] },
  { id: "5", name: "Millilitres", compatible_with: ["4", "5", "6"] },
  { id: "6", name: "Centilitres", compatible_with: ["4", "5"] }
];

const mockComponents: Component[] = [
  { component_id: "c1", name: "Farine", price: 500, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1" },
  { component_id: "c2", name: "Sauce Tomate", category: "1", price: 200, unit_of_measure: "Millilitres", unit_of_measure_id: "5", status: "1" },
  { component_id: "c3", name: "Mozzarella", category: "2", price: 100, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1" }
];

const mockComponentCategories: ComponentCategory[] = [
  {
    category_id: "1",
    category_name: "Viande",
    order: 0,
    components: [
      { component_id: "71", name: "Jambon", category: "1", price: 100, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1", purchase_cost: 800, purchase_cost_qty: 500 },
      { component_id: "74", name: "Lardons", category: "1", price: 100, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1", purchase_cost: 650, purchase_cost_qty: 250 },
      { component_id: "79", name: "Poulet", category: "1", price: 100, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1", purchase_cost: 920, purchase_cost_qty: 1000 }
    ]
  },
  {
    category_id: "2",
    category_name: "Fromage",
    order: 1,
    components: [
      { component_id: "85", name: "Mozzarella", category: "2", price: 150, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1", purchase_cost: 1200, purchase_cost_qty: 500 },
      { component_id: "86", name: "Chèvre", category: "2", price: 120, unit_of_measure: "Grammes", unit_of_measure_id: "2", status: "1", purchase_cost: 1100, purchase_cost_qty: 250 }
    ]
  }
];

const mockAttributes: Attribute[] = [
  { 
    id: "attr_1",
    name: "pizza_size",
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
    name: "supplements",
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
    price_take_away: 1200,
    price_delivery: 1300,
    cost_price: 380,
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 1,
    allergens: ["allergen-milk"],
    tags: ["tag_2"],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
    integrations: { 
      uber_eats: { enabled: true, price_override: 1490, id: "ue_123" },
      deliveroo: { enabled: true, price_override: 1490 }
    }
  },
  {
    product_id: "p1b", 
    category_id: "cat1", 
    name: "Regina", 
    description: "Tomate, Mozza, Jambon, Champignons", 
    price: 1400,
    price_take_away: 1400,
    price_delivery: 1500,
    cost_price: 520,
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 2,
    allergens: ["allergen-milk", "allergen-gluten"],
    tags: ["tag_1"],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: false, scan_order: true },
    integrations: { 
      uber_eats: { enabled: true, price_override: 1690 },
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
    price_take_away: 150,
    price_delivery: 200,
    cost_price: 25,
    bg_color: "#ffffff",
    is_group: false, 
    available: true,
    order: 2,
    allergens: [],
    tags: [],
    tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
    availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
    integrations: { 
      uber_eats: { enabled: true, price_override: 250 },
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
  { id: "tag_1", name: "Végétarien", display_order: 0, color: "#00ff00", product_count: 3 },
  { id: "tag_2", name: "Vegan", display_order: 1, color: "#ff9900", product_count: 2 },
  { id: "tag_3", name: "Spicy", display_order: 2, color: "#ff0000", product_count: 1 },
  { id: "tag_4", name: "Nouveau", display_order: 3, color: "#0000ff", product_count: 0 },
  { id: "tag_5", name: "Populaire", display_order: 4, color: "#ffff00", product_count: 5 }
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

  async getMenuData(): Promise<Category[]> {
    // ✅ CONSOLIDATED: Now uses GET /menu/products endpoint
    // Replaces the old GET /menu endpoint
    // Returns categories with nested products (hierarchical structure)
    logAPI('GET', '/menu/products');
    return withMock(
      () => {
        // Create mock categories with nested products
        const cat1: Category = {
          category_id: "cat1",
          category: "Pizzas",
          category_name: "Pizzas",
          id: "cat1",
          name: "Pizzas",
          order: 1,
          bg_color: "#e20000",
          products: [
            {
              product_id: "p1",
              category_id: "cat1",
              category_name: "Pizzas",
              name: "Margherita",
              description: "Tomate, Mozza",
              price: 1200,
              price_take_away: 1200,
              price_delivery: 1300,
              price_uber_eats: 1490,
              price_deliveroo: 1490,
              cost_price: 380,
              foodcost_percent: 31.67,
              margin_percent: 68.33,
              bg_color: "#ffffff",
              is_product_group: false,
              status: "available",
              available: true,
              display_order: 1,
              tags: ["tag_2"],
              allergens: ["allergen-milk"],
              tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
              availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
              integrations: {
                uber_eats: { enabled: true, price_override: 1490, id: "ue_123" },
                deliveroo: { enabled: true, price_override: 1490 }
              }
            },
            {
              product_id: "p1b",
              category_id: "cat1",
              category_name: "Pizzas",
              name: "Regina",
              description: "Tomate, Mozza, Jambon, Champignons",
              price: 1400,
              price_take_away: 1400,
              price_delivery: 1500,
              price_uber_eats: 1690,
              price_deliveroo: 1690,
              cost_price: 520,
              foodcost_percent: 37.14,
              margin_percent: 62.86,
              bg_color: "#ffffff",
              is_product_group: false,
              status: "available",
              available: true,
              display_order: 2,
              tags: ["tag_1"],
              allergens: ["allergen-milk", "allergen-gluten"],
              tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
              availability: { on_site: true, takeaway: true, delivery: false, scan_order: true },
              integrations: {
                uber_eats: { enabled: true, price_override: 1690 },
                deliveroo: { enabled: false }
              }
            }
          ]
        };

        const cat2: Category = {
          category_id: "cat2",
          category: "Boissons",
          category_name: "Boissons",
          id: "cat2",
          name: "Boissons",
          order: 2,
          bg_color: "#3b82f6",
          products: [
            {
              product_id: "p2",
              category_id: "cat2",
              category_name: "Boissons",
              name: "Softs 33cl",
              is_product_group: true,
              status: "available",
              available: true,
              display_order: 1,
              bg_color: "#f0f9ff",
              tags: [],
              allergens: [],
              sub_products: [
                {
                  product_id: "p2_1",
                  name: "Coca Cola",
                  price: 200,
                  price_take_away: 200,
                  price_delivery: 250,
                  price_uber_eats: 250,
                  price_deliveroo: 250,
                  category_id: "cat2",
                  category_name: "Boissons",
                  is_product_group: false,
                  status: "available",
                  display_order: 0,
                  by_product_of: "p2"
                },
                {
                  product_id: "p2_2",
                  name: "Fanta",
                  price: 200,
                  price_take_away: 200,
                  price_delivery: 250,
                  price_uber_eats: 250,
                  price_deliveroo: 250,
                  category_id: "cat2",
                  category_name: "Boissons",
                  is_product_group: false,
                  status: "available",
                  display_order: 1,
                  by_product_of: "p2"
                }
              ]
            },
            {
              product_id: "p3",
              category_id: "cat2",
              category_name: "Boissons",
              name: "Eau Minérale",
              description: "50cl",
              price: 150,
              price_take_away: 150,
              price_delivery: 200,
              price_uber_eats: 250,
              price_deliveroo: 200,
              cost_price: 25,
              foodcost_percent: 16.67,
              margin_percent: 83.33,
              bg_color: "#ffffff",
              is_product_group: false,
              status: "available",
              available: true,
              display_order: 2,
              tags: [],
              allergens: [],
              tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
              availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
              integrations: {
                uber_eats: { enabled: true, price_override: 250 },
                deliveroo: { enabled: false }
              }
            }
          ]
        };

        return [cat1, cat2];
      },
      async () => {
        const response = await apiClient.get<WelloApiResponse<Category[]>>('/menu/products');
        return response.data;
      }
    );
  },

  async getMarketingCategories(): Promise<Category[]> {
    logAPI('GET', '/menu/marketing-categories');
    return withMock(
      () => [...mockCategories],
      async () => {
        const response = await apiClient.get<WelloApiResponse<{ categories: any[] }>>('/menu/marketing-categories');
        const categories = response.data?.categories || [];
        // Map marketing category fields to standard Category structure
        return categories.map((cat: any) => ({
          category_id: cat.category_id,
          category: cat.name,
          category_name: cat.name,
          id: cat.category_id,
          name: cat.name,
          order: cat.display_order ?? 0,
          categ_order: cat.display_order ?? 0,
          available: cat.available ?? true,
          products: [], // Marketing categories don't have nested products
          product_count: cat.product_count ?? 0,
          product_ids: cat.product_ids || []
        }));
      }
    );
  },

  async getProducts(): Promise<Product[]> {
    // ✅ CONSOLIDATED: Now calls getMenuData() internally
    // Returns a flattened array of Product[] for backward compatibility
    // Gets categories from the consolidated endpoint and flattens them
    const categories = await this.getMenuData();
    
    const products: Product[] = [];
    categories.forEach((category) => {
      if (category.products && Array.isArray(category.products)) {
        category.products.forEach(product => {
          products.push(product);
          // Also add sub-products if they exist
          if (product.sub_products && Array.isArray(product.sub_products)) {
            products.push(...product.sub_products);
          }
        });
      }
    });
    
    return products;
  },

  async getProduct(productId: string): Promise<Product> {
    // GET /menu/products/{product_id}
    // Retrieves detailed information for a single product
    logAPI('GET', `/menu/products/${productId}`);
    return withMock(
      () => {
        // Mock: return detailed product data
        return {
          product_id: "69",
          merchant_id: "2",
          name: "Pizza Jambon",
          image_url: "https://pub-528ad8f1b1df4b8f9744fedd19777689.r2.dev/wello_resto_images_storage/merchants/2/products/69.png",
          is_available_on_sno: true,
          available: false,
          components: [
            {
              component_id: "68",
              name: "Tomate",
              quantity: 20,
              unit_of_measure: "Grammes",
              unit_of_measure_id: "2"
            },
            {
              component_id: "69",
              name: "Mozarella",
              quantity: 60,
              unit_of_measure: "Grammes",
              unit_of_measure_id: "2"
            },
            {
              component_id: "70",
              name: "Olives",
              quantity: 10,
              unit_of_measure: "Grammes",
              unit_of_measure_id: "2"
            },
            {
              component_id: "71",
              name: "Jambon",
              quantity: 40,
              unit_of_measure: "Grammes",
              unit_of_measure_id: "2"
            },
            {
              component_id: "72",
              name: "Champignon",
              quantity: 30,
              unit_of_measure: "Grammes",
              unit_of_measure_id: "2"
            }
          ],
          description: "Base tomate, mozzarella, jambon, olives",
          price: 740,
          price_take_away: 720,
          price_delivery: 720,
          price_uber_eats: 0,
          price_deliveroo: 0,
          tva_rate_in: 5,
          tva_rate_delivery: 7,
          tva_rate_take_away: 2,
          available_in: true,
          available_take_away: true,
          available_delivery: true,
          category: "1",
          category_id: "1",
          is_product_group: false,
          bg_color: "#ed8ec4",
          status: "1",
          configuration: {
            attributes: []
          },
          production_color: "#ed8ec4",
          display_order: null,
          sync_deliveroo: true,
          sync_ubereats: true,
          tags: [],
          allergens: []
        } as Product;
      },
      async () => {
        const response = await apiClient.get<WelloApiResponse<{ product: Product }>>(`/menu/products/${productId}`);
        // API returns wrapped in { product: ... }, extract it
        return response.data.product || response.data as Product;
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

  async updateProductAvailability(productId: string, status: boolean): Promise<void> {
    logAPI('PATCH', `/menu/products/${productId}/availability`, { status: status.toString() });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/${productId}/availability`, { status: status.toString() })
    );
  },

  async deleteProduct(productId: string): Promise<{ status: string }> {
    logAPI('DELETE', `/menu/products/${productId}`);
    return withMock(
      () => ({ status: 'success' }),
      () => apiClient.delete<WelloApiResponse<{ status: string }>>(`/menu/products/${productId}`).then(res => res.data)
    );
  },

  async updateCategoryAvailability(categoryId: string, status: boolean): Promise<void> {
    logAPI('PATCH', `/menu/products/category/${categoryId}/availability`, { status: status.toString() });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/category/${categoryId}/availability`, { status: status.toString() })
    );
  },

  async deleteCategory(categoryId: string): Promise<void> {
    logAPI('DELETE', `/menu/products/categories/${categoryId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/products/categories/${categoryId}`)
    );
  },

  async deleteComponentCategory(categoryId: string): Promise<void> {
    logAPI('DELETE', `/menu/components/categories/${categoryId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/components/categories/${categoryId}`)
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
        
        // Flatten components from categories and map API fields to Component fields
        const components: Component[] = [];
        const categories: ComponentCategory[] = [];
        
        interface ApiComponent {
          component_id: string;
          name: string;
          category: string;
          price: number;
          unit_of_measure: string;
          unit_of_measure_id: string;
          unit_of_measure_short_name?: string;
          purchase_price?: number;
          purchase_price_qty?: number;
          purchase_cost?: number;
          purchase_cost_qty?: number;
          status: string;
        }
        
        if (Array.isArray(data)) {
          data.forEach((category) => {
            categories.push(category);
            if (category.components && Array.isArray(category.components)) {
              category.components.forEach((comp: ApiComponent) => {
                components.push({
                  component_id: comp.component_id,
                  name: comp.name,
                  category: comp.category,
                  category_id: category.category_id,
                  price: comp.price,
                  unit_id: parseInt(comp.unit_of_measure_id),
                  unit_of_measure: comp.unit_of_measure,
                  unit_of_measure_id: comp.unit_of_measure_id,
                  unit_of_measure_short_name: comp.unit_of_measure_short_name ?? comp.unit_of_measure,
                  purchase_cost: comp.purchase_price || comp.purchase_cost,
                  purchase_cost_qty: comp.purchase_price_qty || comp.purchase_cost_qty,
                  purchase_price_per_unit: (() => {
                    const cost = comp.purchase_price || comp.purchase_cost;
                    const qty = comp.purchase_price_qty || comp.purchase_cost_qty;
                    return cost && qty ? Math.round(cost / qty) : undefined;
                  })(),
                  status: comp.status,
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
      () => ({ ...data, id: `attr_${Date.now()}`, options: [] } as Attribute),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ attribute: Attribute }>>('/menu/attributes', data);
        // Ensure options array exists
        if (response.data && response.data.attribute) {
          return {
            ...response.data.attribute,
            options: response.data.attribute.options || []
          };
        }
        return { ...data, options: [] } as Attribute;
      }
    );
  },

  async updateAttribute(attributeId: string, data: Partial<Attribute>): Promise<void> {
    logAPI('PATCH', `/menu/attributes/${attributeId}`, data);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/attributes/${attributeId}`, data)
    );
  },

  async deleteAttribute(attributeId: string): Promise<void> {
    logAPI('DELETE', `/menu/attributes/${attributeId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/attributes/${attributeId}`)
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

  async updateMarketingCategoryDisplayOrder(categoryIds: string[]): Promise<void> {
    const payload = { category_ids: categoryIds };
    logAPI('PATCH', '/menu/marketing-categories/display-order', payload);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>('/menu/marketing-categories/display-order', payload)
    );
  },

  async updateTagOrder(tagIds: string[]): Promise<void> {
    const payload = { tags: tagIds.map(id => ({ id })) };
    logAPI('PATCH', '/menu/tags/display-order', payload);
    return withMock(
      () => undefined,
      () => apiClient.patch<void>('/menu/tags/display-order', payload)
    );
  },

  async updateExternalMenu(platform: 'uber-eats' | 'deliveroo'): Promise<void> {
    logAPI('PATCH', `/menu/${platform}/sync`, {});
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/${platform}/sync`, {})
    );
  },

  async createProductCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/products/categories', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ category_id: string; message: string; status: string }>>('/menu/products/categories', { name });
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

  async createMarketingCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/marketing-categories', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ category_id: string; message: string; status: string }>>('/menu/marketing-categories', { name });
        const categoryId = response.data?.category_id || `cat_${Date.now()}`;
        return {
          id: categoryId,
          name,
          order: 99
        };
      }
    );
  },

  async createComponentCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/components/categories', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      async () => {
        const response = await apiClient.post<WelloApiResponse<{ category_id: string; message: string; status: string }>>('/menu/components/categories', { name });
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
    logAPI('PATCH', `/menu/products/categories/${categoryId}`, { name });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/categories/${categoryId}`, { name })
    );
  },

  async updateMarketingCategory(categoryId: string, name: string): Promise<void> {
    logAPI('PATCH', `/menu/marketing-categories/${categoryId}`, { name });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/marketing-categories/${categoryId}`, { name })
    );
  },

  async createProduct(data: Partial<Product> | ProductCreatePayload): Promise<Product> {
    // Map ProductCreatePayload fields to Product fields if needed
    const payload = {
      ...data,
      // Handle both old tva_rate_* and new tva_*_id field names
      ...(('tva_in_id' in data || 'tva_take_away_id' in data || 'tva_delivery_id' in data) ? {
        tva_in_id: data.tva_in_id || data.tva_rate_in,
        tva_take_away_id: data.tva_take_away_id || data.tva_rate_take_away,
        tva_delivery_id: data.tva_delivery_id || data.tva_rate_delivery,
      } : {})
    };
    
    logAPI('POST', '/menu/products', payload);
    return withMock(
      () => ({ 
        product_id: `p_${Date.now()}`, 
        category_id: data.category_id || '',
        name: data.name || '',
        description: data.description || '',
        is_product_group: data.is_product_group || false,
        order: 999,
        ...data,
        integrations: {
          uber_eats: { enabled: false },
          deliveroo: { enabled: false }
        }
      } as Product),
      async () => {
        const response = await apiClient.post<any>('/menu/products', payload);
        // API returns { id, data: { product } }, extract the product
        return response.data?.product || response;
      }
    );
  },

  async createComponent(data: { name: string; unit_id: string; price: number; category_id?: string; purchase_cost?: number; purchase_unit_id?: string; purchase_cost_qty?: number }): Promise<Component> {
    logAPI('POST', '/menu/components', data);
    return withMock(
      () => ({ 
        component_id: `comp_${Date.now()}`, 
        name: data.name,
        unit_id: data.unit_id,
        unit_of_measure_id: data.unit_id,
        unit_of_measure: 'Unité',
        price: data.price / 100,
        category_id: data.category_id,
        category: data.category_id || '',
        purchase_cost: data.purchase_cost,
        purchase_unit_id: data.purchase_unit_id,
        purchase_cost_qty: data.purchase_cost_qty || 1,
        status: '1',
        available: true
      } as unknown as Component),
      async () => {
        interface ApiComponentResponse {
          component_id: string;
          name: string;
          category?: string;
          category_id?: string;
          price: number;
          unit_of_measure: string;
          unit_of_measure_id: string;
          unit_of_measure_short_name?: string;
          purchase_price?: number;
          purchase_price_qty?: number;
          purchase_cost?: number;
          purchase_cost_qty?: number;
          purchase_price_per_unit?: number;
          purchase_unit_of_measure_id?: string;
          purchase_unit_of_measure?: string;
          status: string;
        }

        const response = await apiClient.post<WelloApiResponse<{ component: ApiComponentResponse }>>('/menu/components', data);
        const apiComponent = response.data?.component;

        if (!apiComponent) {
          throw new Error('Invalid create component response: missing component data');
        }

        const purchaseCost = apiComponent.purchase_price ?? apiComponent.purchase_cost;
        const purchaseCostQty = apiComponent.purchase_price_qty ?? apiComponent.purchase_cost_qty;

        return {
          component_id: apiComponent.component_id,
          name: apiComponent.name,
          category: apiComponent.category,
          category_id: apiComponent.category_id || apiComponent.category || data.category_id,
          price: apiComponent.price,
          unit_id: Number.parseInt(apiComponent.unit_of_measure_id, 10),
          unit_of_measure: apiComponent.unit_of_measure,
          unit_of_measure_id: apiComponent.unit_of_measure_id,
          unit_of_measure_short_name: apiComponent.unit_of_measure_short_name ?? apiComponent.unit_of_measure,
          purchase_cost: purchaseCost,
          purchase_cost_qty: purchaseCostQty,
          purchase_price_per_unit: apiComponent.purchase_price_per_unit ?? (purchaseCost && purchaseCostQty ? Math.round(purchaseCost / purchaseCostQty) : undefined),
          purchase_unit_id: apiComponent.purchase_unit_of_measure_id,
          purchase_unit_of_measure: apiComponent.purchase_unit_of_measure,
          purchase_unit_of_measure_id: apiComponent.purchase_unit_of_measure_id,
          status: apiComponent.status,
          available: apiComponent.status === '1'
        } as Component;
      }
    );
  },

  async updateComponent(componentId: string, data: { name?: string; category_id?: string; unit_id?: string; price?: number; purchase_cost?: number; purchase_unit_id?: string }): Promise<Component> {
    logAPI('PATCH', `/menu/components/${componentId}`, data);
    return withMock(
      () => ({ 
        component_id: componentId, 
        ...data
      } as unknown as Component),
      async () => {
        interface ApiComponentResponse {
          component_id: string;
          name: string;
          category: string;
          price: number;
          unit_of_measure: string;
          unit_of_measure_id: string;
          purchase_price?: number;
          purchase_price_qty?: number;
          purchase_cost?: number;
          purchase_cost_qty?: number;
          purchase_unit_of_measure_id: string;
          purchase_unit_of_measure: string;
          status: string;
        }

        const response = await apiClient.patch<WelloApiResponse<{ component: ApiComponentResponse }>>(`/menu/components/${componentId}`, data);
        const apiComponent = response.data.component;

        return {
          component_id: apiComponent.component_id,
          name: apiComponent.name,
          category: apiComponent.category,
          price: apiComponent.price,
          unit_id: parseInt(apiComponent.unit_of_measure_id),
          unit_of_measure: apiComponent.unit_of_measure,
          unit_of_measure_id: apiComponent.unit_of_measure_id,
          purchase_cost: apiComponent.purchase_price || apiComponent.purchase_cost,
          purchase_cost_qty: apiComponent.purchase_price_qty || apiComponent.purchase_cost_qty,
          purchase_unit_id: parseInt(apiComponent.purchase_unit_of_measure_id),
          purchase_unit_of_measure: apiComponent.purchase_unit_of_measure,
          purchase_unit_of_measure_id: apiComponent.purchase_unit_of_measure_id,
          status: apiComponent.status,
          available: apiComponent.status === '1'
        } as Component;
      }
    );
  },

  async deleteComponent(componentId: string): Promise<void> {
    logAPI('DELETE', `/menu/components/${componentId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/components/${componentId}`)
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

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://welloresto-api-prod.onrender.com"}/menu/products/${productId}/image`, {
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

  async createTag(name: string, color?: string): Promise<Tag> {
    const payload = { name, ...(color && { color }) };
    logAPI('POST', '/menu/tags/create', payload);
    return withMock(
      () => ({
        id: `tag_${Date.now()}`,
        name,
        color,
        display_order: 0,
        product_count: 0
      } as Tag),
      async () => {
        const response = await apiClient.post<WelloApiResponse<Tag>>('/menu/tags/create', payload);
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
  },

  async saveDisplayOrder(displayOrder: Array<{ category_id: string; products: string[] }>): Promise<void> {
    logAPI('PATCH', '/menu/display-orders', { display_order: displayOrder });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>('/menu/display-orders', { display_order: displayOrder })
    );
  },

  async deleteTag(tagId: string): Promise<void> {
    logAPI('DELETE', `/menu/tags/${tagId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/tags/${tagId}`)
    );
  },

  async updateTag(tagId: string, name: string, color?: string, displayOrder?: number): Promise<{ id: string; name: string; color?: string }> {
    const payload = { name, ...(color && { color }), ...(displayOrder !== undefined && { display_order: displayOrder }) };
    logAPI('PATCH', `/menu/tags/${tagId}`, payload);
    return withMock(
      () => ({ id: tagId, name, color }),
      async () => {
        const response = await apiClient.patch<WelloApiResponse<{ id: string; name: string; color?: string }>>(`/menu/tags/${tagId}`, payload);
        return response.data;
      }
    );
  },

  async assignTagsToProducts(productIds: string[], tagIds: string[]): Promise<void> {
    logAPI('POST', '/menu/bulk-assign-tags', { product_ids: productIds, tag_ids: tagIds });
    return withMock(
      () => undefined,
      () => apiClient.post<void>('/menu/bulk-assign-tags', { product_ids: productIds, tag_ids: tagIds })
    );
  },

  async bulkUpdatePrices(products: Array<{
    product_id: string;
    price?: number;
    price_take_away?: number;
    price_delivery?: number;
  }>): Promise<Array<{ product_id: string; price?: number; price_take_away?: number; price_delivery?: number }>> {
    logAPI('PATCH', '/menu/products/bulk', { products });
    return withMock(
      () => products,
      async () => {
        await apiClient.patch<WelloApiResponse<{ message: string; status: string }>>('/menu/products/bulk', { products });
        
        // API only returns success message, not updated products
        // Return the original update data so hook can apply it to local state
        return products;
      }
    );
  },

  async bulkAssignProductsToCategory(productIds: string[], categoryId: string): Promise<void> {
    logAPI('PATCH', `/menu/products/categories/${categoryId}/bulk-assign`, { product_ids: productIds });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/categories/${categoryId}/bulk-assign`, { product_ids: productIds })
    );
  },

  async bulkAssignProductsToMarketCategory(productIds: string[], categoryId: string): Promise<void> {
    logAPI('PATCH', `/menu/marketing-categories/${categoryId}/bulk-assign`, { product_ids: productIds });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/marketing-categories/${categoryId}/bulk-assign`, { product_ids: productIds })
    );
  },

  async deleteMarketingCategory(categoryId: string): Promise<void> {
    logAPI('DELETE', `/menu/marketing-categories/${categoryId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/marketing-categories/${categoryId}`)
    );
  },

  async bulkAssignProductsToTag(productIds: string[], tagId: string): Promise<void> {
    logAPI('PATCH', `/menu/tags/${tagId}/bulk_assign`, { product_ids: productIds });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/tags/${tagId}/bulk_assign`, { product_ids: productIds })
    );
  },

  async updateComponentStatus(componentId: string, status: boolean): Promise<void> {
    logAPI('PATCH', `/menu/components/${componentId}/status`, { status: status ? '1' : '0' });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/components/${componentId}/status`, { status: status ? '1' : '0' })
    );
  },

  async updateProductStatus(productId: string, status: boolean): Promise<void> {
    logAPI('PATCH', `/menu/products/${productId}/status`, { status: status ? '1' : '0' });
    return withMock(
      () => undefined,
      () => apiClient.patch<void>(`/menu/products/${productId}/status`, { status: status ? '1' : '0' })
    );
  }
};
