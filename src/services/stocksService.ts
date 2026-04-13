import { apiClient, USE_MOCK_DATA, withMock, logAPI } from "@/services/apiClient";

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

export type StockMovementType = 'ajout' | 'retrait' | 'perte' | 'consommation';

export interface StockMovement {
  id: string;
  component_id: string;
  component_name: string;
  unit: string;
  quantity: number;
  type: StockMovementType;
  product_name?: string; // Pour les consommations
  created_at: string;
  created_by: string;
  comment?: string;
}

// ============= Mock Data =============
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

const mockStockMovements: StockMovement[] = [
  { id: "m1", component_id: "c1", component_name: "Farine", unit: "kg", quantity: 5, type: "ajout", created_at: "2026-04-13T10:30:00", created_by: "Admin", comment: "Réapprovisionnement" },
  { id: "m2", component_id: "c2", component_name: "Tomates", unit: "kg", quantity: 2.5, type: "consommation", product_name: "Pizza Margherita", created_at: "2026-04-13T12:15:00", created_by: "Cuisine" },
  { id: "m3", component_id: "c3", component_name: "Mozzarella", unit: "kg", quantity: 0.8, type: "consommation", product_name: "Pizza 4 Fromages", created_at: "2026-04-13T12:20:00", created_by: "Cuisine" },
  { id: "m4", component_id: "c5", component_name: "Basilic", unit: "kg", quantity: 0.1, type: "perte", created_at: "2026-04-13T14:00:00", created_by: "Admin", comment: "Expiration détectée" },
  { id: "m5", component_id: "c4", component_name: "Huile d'olive", unit: "L", quantity: 1, type: "retrait", created_at: "2026-04-13T15:30:00", created_by: "Admin", comment: "Ajustement inventaire" },
  { id: "m6", component_id: "c6", component_name: "Jambon", unit: "kg", quantity: 1.5, type: "consommation", product_name: "Pizza Jambon", created_at: "2026-04-13T16:00:00", created_by: "Cuisine" },
  { id: "m7", component_id: "c1", component_name: "Farine", unit: "kg", quantity: 3, type: "consommation", product_name: "Pizza Napolitaine", created_at: "2026-04-12T18:45:00", created_by: "Cuisine" },
  { id: "m8", component_id: "c7", component_name: "Champignons", unit: "kg", quantity: 0.5, type: "consommation", product_name: "Pizza Végétarienne", created_at: "2026-04-12T17:30:00", created_by: "Cuisine" },
  { id: "m9", component_id: "c2", component_name: "Tomates", unit: "kg", quantity: 10, type: "ajout", created_at: "2026-04-12T09:00:00", created_by: "Admin", comment: "Livraison fournisseur" },
  { id: "m10", component_id: "c8", component_name: "Oignons", unit: "kg", quantity: 1.2, type: "perte", created_at: "2026-04-11T11:00:00", created_by: "Admin", comment: "Dommages lors du stockage" },
];

// ============= API Functions =============
export const getStocksList = async (): Promise<StockComponent[]> => {
  logAPI("GET", "/stocks/components/list");
  
  return withMock(
    () => [...mockStockComponents],
    () => apiClient.get<StockComponent[]>("/stocks/components/list")
  );
};

export const updateStockMovement = async (payload: StockMovementPayload): Promise<{ status: string }> => {
  logAPI("PATCH", `/stocks/components/${payload.component_id}`, payload);
  
  return withMock(
    () => {
      const component = mockStockComponents.find((c) => c.component_id === payload.component_id);
      if (component) {
        component.quantity += payload.quantity;
      }
      return { status: "ok" };
    },
    () => apiClient.patch<{ status: string }>(`/stocks/components/${payload.component_id}`, payload)
  );
};

export const getStockMovements = async (from: string, to: string): Promise<StockMovement[]> => {
  logAPI("GET", `/stocks/movements?from=${from}&to=${to}`);
  
  return withMock(
    () => {
      // Filtrer les mouvements par période
      return mockStockMovements.filter(m => {
        const movementDate = m.created_at.split('T')[0];
        return movementDate >= from && movementDate <= to;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    () => apiClient.get<StockMovement[]>(`/stocks/movements?from=${from}&to=${to}`)
  );
};

export const getMovementsSummary = async (from: string, to: string) => {
  logAPI("GET", `/stocks/movements/summary?from=${from}&to=${to}`);
  
  return withMock(
    () => {
      const movements = mockStockMovements.filter(m => {
        const movementDate = m.created_at.split('T')[0];
        return movementDate >= from && movementDate <= to;
      });

      // Résumer les ingrédients consommés
      const consumptions = movements.filter(m => m.type === 'consommation');
      const consumptionMap = new Map<string, { component_name: string; unit: string; total: number }>();
      
      consumptions.forEach(c => {
        const key = c.component_id;
        const existing = consumptionMap.get(key);
        if (existing) {
          existing.total += c.quantity;
        } else {
          consumptionMap.set(key, {
            component_name: c.component_name,
            unit: c.unit,
            total: c.quantity
          });
        }
      });

      return Array.from(consumptionMap.entries()).map(([id, data]) => ({
        component_id: id,
        component_name: data.component_name,
        unit: data.unit,
        total_consumed: data.total
      }));
    },
    () => apiClient.get(`/stocks/movements/summary?from=${from}&to=${to}`)
  );
};
