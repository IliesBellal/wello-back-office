import { config } from "@/config";

export interface StockUnit {
  unit_name: string;
}

export interface StockComponent {
  component_id: string;
  name: string;
  unit: StockUnit;
  quantity: number;
  alert_threshold: number;
  purchasing_price: number;
}

export interface StockMovementPayload {
  component_id: string;
  unit: string;
  quantity: number;
  comment?: string;
}

const mockStockComponents: StockComponent[] = [
  { component_id: "c1", name: "Farine", unit: { unit_name: "kg" }, quantity: 5.2, alert_threshold: 10, purchasing_price: 120 },
  { component_id: "c2", name: "Tomates", unit: { unit_name: "kg" }, quantity: 50, alert_threshold: 5, purchasing_price: 250 },
  { component_id: "c3", name: "Mozzarella", unit: { unit_name: "kg" }, quantity: 8.5, alert_threshold: 15, purchasing_price: 890 },
  { component_id: "c4", name: "Huile d'olive", unit: { unit_name: "L" }, quantity: 12, alert_threshold: 5, purchasing_price: 650 },
  { component_id: "c5", name: "Basilic", unit: { unit_name: "kg" }, quantity: 0.3, alert_threshold: 0.5, purchasing_price: 1200 },
  { component_id: "c6", name: "Jambon", unit: { unit_name: "kg" }, quantity: 4.2, alert_threshold: 3, purchasing_price: 1450 },
  { component_id: "c7", name: "Champignons", unit: { unit_name: "kg" }, quantity: 2.1, alert_threshold: 4, purchasing_price: 680 },
  { component_id: "c8", name: "Oignons", unit: { unit_name: "kg" }, quantity: 25, alert_threshold: 10, purchasing_price: 150 },
];

export const getStocksList = async (): Promise<StockComponent[]> => {
  console.log("[API] GET /stocks/components/list");
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockStockComponents;
  }
  
  const response = await fetch(`${config.apiBaseUrl}/stocks/components/list`);
  return response.json();
};

export const updateStockMovement = async (payload: StockMovementPayload): Promise<{ status: string }> => {
  console.log("[API] PATCH /stocks/components/" + payload.component_id);
  console.log("Payload:", payload);
  
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const component = mockStockComponents.find((c) => c.component_id === payload.component_id);
    if (component) {
      component.quantity += payload.quantity;
    }
    
    return { status: "ok" };
  }
  
  const response = await fetch(`${config.apiBaseUrl}/stocks/components/${payload.component_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};
