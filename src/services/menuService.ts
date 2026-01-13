import { apiClient, withMock, logAPI } from "@/services/apiClient";
import { TvaRateGroup, Menu, UnitOfMeasure, Component, Attribute, Product } from "@/types/menu";

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
  { id: "c1", name: "Farine", unit_id: 10, price_per_unit: 0.05 },
  { id: "c2", name: "Sauce Tomate", unit_id: 20, price_per_unit: 2.00 },
  { id: "c3", name: "Mozzarella", unit_id: 10, price_per_unit: 0.10 }
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

const mockMenuData: Menu = {
  products_types: [
    { id: "cat1", name: "Pizzas", order: 1 },
    { id: "cat2", name: "Boissons", order: 2 }
  ],
  products: [
    {
      id: "p1", 
      category_id: "cat1", 
      name: "Margherita", 
      description: "Tomate, Mozza", 
      price: 1200, 
      bg_color: "#ffffff",
      is_group: false, 
      order: 1,
      tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
      availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
      integrations: { 
        uber_eats: { enabled: true, price_override: 1350, id: "ue_123" },
        deliveroo: { enabled: false }
      }
    },
    {
      id: "p1b", 
      category_id: "cat1", 
      name: "Regina", 
      description: "Tomate, Mozza, Jambon, Champignons", 
      price: 1400, 
      bg_color: "#ffffff",
      is_group: false, 
      order: 2,
      tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
      availability: { on_site: true, takeaway: true, delivery: false, scan_order: true },
      integrations: { 
        uber_eats: { enabled: false },
        deliveroo: { enabled: false }
      }
    },
    {
      id: "p2", 
      category_id: "cat2", 
      name: "Softs 33cl", 
      is_group: true, 
      order: 1,
      bg_color: "#f0f9ff",
      sub_products: [
        { id: "p2_1", name: "Coca Cola", price: 200 },
        { id: "p2_2", name: "Fanta", price: 200 },
        { id: "p2_3", name: "Sprite", price: 200 }
      ]
    },
    {
      id: "p3", 
      category_id: "cat2", 
      name: "Eau Minérale", 
      description: "50cl", 
      price: 150, 
      bg_color: "#ffffff",
      is_group: false, 
      order: 2,
      tva_ids: { on_site: 10, takeaway: 5, delivery: 20 },
      availability: { on_site: true, takeaway: true, delivery: true, scan_order: true },
      integrations: { 
        uber_eats: { enabled: false },
        deliveroo: { enabled: false }
      }
    }
  ]
};

// ============= API Functions =============
export const menuService = {
  async getTvaRates(): Promise<TvaRateGroup[]> {
    logAPI('GET', '/pos/tva_rates');
    return withMock(
      () => [...mockTvaRates],
      () => apiClient.get<TvaRateGroup[]>('/pos/tva_rates')
    );
  },

  async getMenuData(): Promise<Menu> {
    logAPI('GET', '/menu');
    return withMock(
      () => ({ ...mockMenuData, products_types: [...mockMenuData.products_types], products: [...mockMenuData.products] }),
      () => apiClient.get<Menu>('/menu')
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
      () => apiClient.get<UnitOfMeasure[]>('/menu/units_of_measures')
    );
  },

  async getComponents(): Promise<Component[]> {
    logAPI('GET', '/menu/components');
    return withMock(
      () => [...mockComponents],
      () => apiClient.get<Component[]>('/menu/components')
    );
  },

  async getAttributes(): Promise<Attribute[]> {
    logAPI('GET', '/menu/attributes');
    return withMock(
      () => [...mockAttributes],
      () => apiClient.get<Attribute[]>('/menu/attributes')
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

  async createCategory(name: string): Promise<{ id: string; name: string; order: number }> {
    logAPI('POST', '/menu/categories', { name });
    return withMock(
      () => ({ id: `cat_${Date.now()}`, name, order: 99 }),
      () => apiClient.post<{ id: string; name: string; order: number }>('/menu/categories', { name })
    );
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    logAPI('POST', '/menu/products', data);
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
      () => apiClient.post<Product>('/menu/products', data)
    );
  },

  async createComponent(data: { name: string; unit_id: number; price: number; category_id?: string }): Promise<Component> {
    logAPI('POST', '/menu/components', data);
    return withMock(
      () => ({ 
        id: `comp_${Date.now()}`, 
        name: data.name,
        unit_id: data.unit_id,
        price_per_unit: data.price / 100,
        category_id: data.category_id
      } as Component),
      () => apiClient.post<Component>('/menu/components', data)
    );
  },

  async deleteComponent(componentId: string): Promise<void> {
    logAPI('DELETE', `/menu/components/${componentId}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/components/${componentId}`)
    );
  }
};
