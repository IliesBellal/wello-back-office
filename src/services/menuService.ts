import { config } from "@/config";
import { TvaRateGroup, MenuData, UnitOfMeasure, Component, Attribute } from "@/types/menu";

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

const mockMenuData: MenuData = {
  categories: [
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

export const menuService = {
  async getTvaRates(): Promise<TvaRateGroup[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockTvaRates;
    }
    const response = await fetch(`${config.apiBaseUrl}/establishment/tva_rates`);
    return response.json();
  },

  async getMenuData(): Promise<MenuData> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockMenuData;
    }
    const response = await fetch(`${config.apiBaseUrl}/menu`);
    return response.json();
  },

  async updateProduct(productId: string, data: Partial<any>): Promise<void> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await fetch(`${config.apiBaseUrl}/menu/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockUnitsOfMeasure;
    }
    const response = await fetch(`${config.apiBaseUrl}/establishment/units_of_measures`);
    return response.json();
  },

  async getComponents(): Promise<Component[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockComponents;
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/components`);
    return response.json();
  },

  async getAttributes(): Promise<Attribute[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockAttributes;
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/attributes`);
    return response.json();
  },

  async createAttribute(data: Partial<Attribute>): Promise<Attribute> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { ...data, id: `attr_${Date.now()}` } as Attribute;
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async updateAttribute(attributeId: string, data: Partial<Attribute>): Promise<void> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await fetch(`${config.apiBaseUrl}/menu/attributes/${attributeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async updateProductOrder(productIds: string[]): Promise<void> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await fetch(`${config.apiBaseUrl}/menu/products/order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: productIds.map(id => ({ product_id: id })) })
    });
  },

  async updateCategoryOrder(categoryIds: string[]): Promise<void> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await fetch(`${config.apiBaseUrl}/menu/categories/order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: categoryIds.map(id => ({ category_id: id })) })
    });
  },

  async updateExternalMenu(platform: 'uber_eats' | 'deliveroo'): Promise<void> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await fetch(`${config.apiBaseUrl}/menu/${platform}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
  },

  async createCategory(name: string): Promise<any> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: `cat_${Date.now()}`, name, order: 99 };
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return response.json();
  },

  async createProduct(data: any): Promise<any> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        id: `p_${Date.now()}`, 
        ...data,
        order: 999,
        integrations: {
          uber_eats: { enabled: false },
          deliveroo: { enabled: false }
        }
      };
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async createComponent(data: any): Promise<any> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        id: `comp_${Date.now()}`, 
        name: data.name,
        unit_id: data.unit_id,
        price_per_unit: data.price / 100, // Convert back from cents for display
        category_id: data.category_id
      };
    }
    const response = await fetch(`${config.apiBaseUrl}/menu/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
