import { apiClient, USE_MOCK_DATA, withMock, logAPI } from "@/services/apiClient";
import { toUTCDateString } from '@/utils/apiDate';

export interface StockUnit {
  unit_id?: string;
  unit_name: string;
  unit_short_name: string;
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
  unit_id: string;
  quantity: number;
  type: Exclude<StockMovementType, 'consumption'>;
  comment?: string;
}

export type StockMovementType = 'add' | 'remove' | 'loss' | 'consumption';
type ApiStockMovementType = StockMovementType | 'ajout' | 'retrait' | 'perte' | 'consommation' | '1' | '2' | '3' | '4';

export interface StockMovement {
  id: string;
  component_id: string;
  component_name: string;
  unit: StockUnit;
  quantity: number;
  type: StockMovementType;
  product_name?: string; // Pour les consommations
  created_at: string;
  created_by: string;
  comment?: string;
}

interface StockMovementsApiEnvelope {
  id?: string;
  data?: {
    components?: Array<Omit<StockMovement, 'type'> & { type: ApiStockMovementType }>;
  };
}

interface StocksListApiEnvelope {
  id?: string;
  data?: {
    components?: StockComponent[];
  };
}

// ============= Mock Data =============
const mockStockComponents: StockComponent[] = [
  { component_id: "c1", name: "Farine", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 5.2, alert_threshold: 10, purchasing_price: 120 },
  { component_id: "c2", name: "Tomates", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 50, alert_threshold: 5, purchasing_price: 250 },
  { component_id: "c3", name: "Mozzarella", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 8.5, alert_threshold: 15, purchasing_price: 890 },
  { component_id: "c4", name: "Huile d'olive", unit: { unit_id: "2", unit_name: "Litre", unit_short_name: "L" }, quantity: 12, alert_threshold: 5, purchasing_price: 650 },
  { component_id: "c5", name: "Basilic", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 0.3, alert_threshold: 0.5, purchasing_price: 1200 },
  { component_id: "c6", name: "Jambon", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 4.2, alert_threshold: 3, purchasing_price: 1450 },
  { component_id: "c7", name: "Champignons", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 2.1, alert_threshold: 4, purchasing_price: 680 },
  { component_id: "c8", name: "Oignons", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 25, alert_threshold: 10, purchasing_price: 150 },
];

const mockStockMovements: StockMovement[] = [
  { id: "m1", component_id: "c1", component_name: "Farine", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 5, type: "add", created_at: "2026-04-13T10:30:00", created_by: "Admin", comment: "Réapprovisionnement" },
  { id: "m2", component_id: "c2", component_name: "Tomates", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 2.5, type: "consumption", product_name: "Pizza Margherita", created_at: "2026-04-13T12:15:00", created_by: "Cuisine" },
  { id: "m3", component_id: "c3", component_name: "Mozzarella", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 0.8, type: "consumption", product_name: "Pizza 4 Fromages", created_at: "2026-04-13T12:20:00", created_by: "Cuisine" },
  { id: "m4", component_id: "c5", component_name: "Basilic", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 0.1, type: "loss", created_at: "2026-04-13T14:00:00", created_by: "Admin", comment: "Expiration détectée" },
  { id: "m5", component_id: "c4", component_name: "Huile d'olive", unit: { unit_id: "2", unit_name: "Litre", unit_short_name: "L" }, quantity: 1, type: "remove", created_at: "2026-04-13T15:30:00", created_by: "Admin", comment: "Ajustement inventaire" },
  { id: "m6", component_id: "c6", component_name: "Jambon", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 1.5, type: "consumption", product_name: "Pizza Jambon", created_at: "2026-04-13T16:00:00", created_by: "Cuisine" },
  { id: "m7", component_id: "c1", component_name: "Farine", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 3, type: "consumption", product_name: "Pizza Napolitaine", created_at: "2026-04-12T18:45:00", created_by: "Cuisine" },
  { id: "m8", component_id: "c7", component_name: "Champignons", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 0.5, type: "consumption", product_name: "Pizza Végétarienne", created_at: "2026-04-12T17:30:00", created_by: "Cuisine" },
  { id: "m9", component_id: "c2", component_name: "Tomates", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 10, type: "add", created_at: "2026-04-12T09:00:00", created_by: "Admin", comment: "Livraison fournisseur" },
  { id: "m10", component_id: "c8", component_name: "Oignons", unit: { unit_id: "1", unit_name: "Kilogramme", unit_short_name: "kg" }, quantity: 1.2, type: "loss", created_at: "2026-04-11T11:00:00", created_by: "Admin", comment: "Dommages lors du stockage" },
];

const normalizeStockMovementType = (type: ApiStockMovementType): StockMovementType => {
  if (type === "add" || type === "remove" || type === "loss" || type === "consumption") {
    return type;
  }

  if (type === "ajout" || type === "1") {
    return "add";
  }

  if (type === "retrait" || type === "2") {
    return "remove";
  }

  if (type === "perte" || type === "4") {
    return "loss";
  }

  // "3" = consumption, plus legacy "consommation"
  return "consumption";
};

// ============= API Functions =============
export const getStocksList = async (): Promise<StockComponent[]> => {
  logAPI("GET", "/stocks/components/list");
  
  return withMock(
    () => [...mockStockComponents],
    () =>
      apiClient
        .get<StockComponent[] | StocksListApiEnvelope>("/stocks/components/list")
        .then((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          const components = response.data?.components;
          return Array.isArray(components) ? components : [];
        })
  );
};

export const updateStockMovement = async (payload: StockMovementPayload): Promise<{ status: string }> => {
  logAPI("PUT", `/stocks/components/${payload.component_id}`, payload);
  
  return withMock(
    () => {
      const component = mockStockComponents.find((c) => c.component_id === payload.component_id);
      if (component) {
        if (payload.type === "add") {
          component.quantity += payload.quantity;
        } else {
          component.quantity -= payload.quantity;
        }
      }
      return { status: "ok" };
    },
    () => apiClient.put<{ status: string }>(`/stocks/components/${payload.component_id}`, payload)
  );
};

export const getStockMovements = async (from: Date | string, to: Date | string): Promise<StockMovement[]> => {
  const fromUTC = toUTCDateString(from);
  const toUTC = toUTCDateString(to);

  logAPI("GET", `/stocks/movements?from=${fromUTC}&to=${toUTC}`);
  
  return withMock(
    () => {
      // Filtrer les mouvements par période
      return mockStockMovements.filter(m => {
        const movementDate = m.created_at.split('T')[0];
        return movementDate >= fromUTC && movementDate <= toUTC;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    () =>
      apiClient
        .get<StockMovementsApiEnvelope>(`/stocks/movements?from=${fromUTC}&to=${toUTC}`)
        .then((response) => {
          const items = Array.isArray(response) ? response : (response.data?.components ?? []);
          return items.map((item) => ({
            ...item,
            type: normalizeStockMovementType(item.type),
          }));
        })
  );
};

export const getMovementsSummary = async (from: Date | string, to: Date | string) => {
  const fromUTC = toUTCDateString(from);
  const toUTC = toUTCDateString(to);

  logAPI("GET", `/stocks/movements/summary?from=${fromUTC}&to=${toUTC}`);
  
  return withMock(
    () => {
      const movements = mockStockMovements.filter(m => {
        const movementDate = m.created_at.split('T')[0];
        return movementDate >= fromUTC && movementDate <= toUTC;
      });

      // Résumer les ingrédients consommés
      const consumptions = movements.filter(m => m.type === 'consumption');
      const consumptionMap = new Map<string, { component_name: string; unit: string; total: number }>();
      
      consumptions.forEach(c => {
        const key = c.component_id;
        const existing = consumptionMap.get(key);
        if (existing) {
          existing.total += c.quantity;
        } else {
          consumptionMap.set(key, {
            component_name: c.component_name,
            unit: c.unit.unit_short_name,
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
    () => apiClient.get(`/stocks/movements/summary?from=${fromUTC}&to=${toUTC}`)
  );
};
