import { config } from "@/config";
import { TvaRateGroup, MenuData } from "@/types/menu";

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
  }
};
