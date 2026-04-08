import { apiClient, withMock, logAPI, WelloApiResponse } from "@/services/apiClient";

// ============= Types =============
export interface CustomerAddress {
  street_number?: string;
  street?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  customer_name?: string;
  email?: string;
  phone?: string;
  address?: CustomerAddress;
  customer_total_spent: number;
  customer_total_orders: number;
  acquisition_source: string;
  created_at: string;
  match_score?: number;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  date: string;
  status: string;
  total: number;
  items_count: number;
  delivery_type: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  type: "orders_count" | "total_spent" | "product_count";
  current_value: number;
  target_value: number;
  is_active: boolean;
}

export interface Reward {
  id: string;
  program_id: string;
  program_name: string;
  reward_type: "fixed_discount" | "percent_discount" | "free_product";
  reward_value: number;
  reward_products?: string[];
  is_used: boolean;
  created_at: string;
}

export interface CustomerLoyalty {
  programs: LoyaltyProgram[];
  rewards: Reward[];
}

export interface CreateLoyaltyProgramPayload {
  name: string;
  description: string;
  type: "orders_count" | "total_spent" | "product_count";
  target_value: number;
  target_order_types: string[];
  target_products?: string[];
  reward_type: "fixed_discount" | "percent_discount" | "free_product";
  reward_value: number;
  reward_products?: string[];
}

/** Raw shape returned by the real API */
export interface RawApiCustomer {
  customer_id: string;
  customer_name?: string;
  customer_tel?: string;
  customer_email?: string | null;
  customer_address?: string;
  customer_lat?: number;
  customer_lng?: number;
  customer_total_spent?: number;
  customer_nb_orders?: number;
  acquisition_source?: string;
  creation_date?: string | null;
  match_score?: number;
}

/** Response envelope from GET /customer/list and /customer/search */
interface CustomerListApiResponse {
  result: RawApiCustomer[];
  status: string;
}

/** Map raw API customer to the normalized Customer shape used by UI */
const normalizeCustomer = (raw: RawApiCustomer): Customer => ({
  id: raw.customer_id,
  customer_name: raw.customer_name,
  phone: raw.customer_tel,
  email: raw.customer_email ?? undefined,
  customer_total_spent: raw.customer_total_spent ?? 0,
  customer_total_orders: raw.customer_nb_orders ?? 0,
  acquisition_source: raw.acquisition_source ?? "",
  created_at: raw.creation_date ?? "",
  match_score: raw.match_score,
});

// ============= Mock Data =============
const mockCustomers: Customer[] = [
  {
    id: "c1",
    first_name: "Marie",
    last_name: "Dupont",
    email: "marie.dupont@email.com",
    phone: "0612345678",
    address: {
      street_number: "15",
      street: "Rue de Rivoli",
      zip_code: "75001",
      city: "Paris",
      country: "France",
      lat: 48.8606,
      lng: 2.3376
    },
    customer_total_spent: 75000,
    customer_total_orders: 24,
    acquisition_source: "WELLO_RESTO_APPS",
    created_at: "2024-03-15T10:00:00Z"
  },
  {
    id: "c2",
    customer_name: "Jean Martin",
    phone: "0698765432",
    customer_total_spent: 32500,
    customer_total_orders: 12,
    acquisition_source: "UBER_EATS",
    created_at: "2024-06-20T14:30:00Z"
  },
  {
    id: "c3",
    first_name: "Sophie",
    last_name: "Bernard",
    email: "sophie.b@gmail.com",
    phone: "0654321098",
    address: {
      street_number: "8",
      street: "Avenue des Champs-Élysées",
      zip_code: "75008",
      city: "Paris",
      country: "France",
      lat: 48.8698,
      lng: 2.3075
    },
    customer_total_spent: 128000,
    customer_total_orders: 45,
    acquisition_source: "DELIVEROO",
    created_at: "2023-11-01T09:00:00Z"
  },
  {
    id: "c4",
    first_name: "Lucas",
    last_name: "Petit",
    email: "lucas.petit@work.fr",
    phone: "0676543210",
    customer_total_spent: 18500,
    customer_total_orders: 7,
    acquisition_source: "WELLO_RESTO_APPS",
    created_at: "2024-09-10T16:45:00Z"
  },
  {
    id: "c5",
    customer_name: "Emma Leroy",
    phone: "0687654321",
    customer_total_spent: 52000,
    customer_total_orders: 18,
    acquisition_source: "JUST_EAT",
    created_at: "2024-01-22T11:20:00Z"
  }
];

const mockOrders: Record<string, CustomerOrder[]> = {
  c1: [
    { id: "o1", order_number: "CMD-2024-001", date: "2024-12-10T12:30:00Z", status: "COMPLETED", total: 3500, items_count: 3, delivery_type: "IN" },
    { id: "o2", order_number: "CMD-2024-002", date: "2024-12-08T19:15:00Z", status: "COMPLETED", total: 2800, items_count: 2, delivery_type: "DELIVERY" },
    { id: "o3", order_number: "CMD-2024-003", date: "2024-12-05T13:00:00Z", status: "COMPLETED", total: 4200, items_count: 4, delivery_type: "TAKE_AWAY" }
  ],
  c3: [
    { id: "o4", order_number: "CMD-2024-004", date: "2024-12-12T20:00:00Z", status: "COMPLETED", total: 5600, items_count: 5, delivery_type: "DELIVERY" },
    { id: "o5", order_number: "CMD-2024-005", date: "2024-12-11T12:45:00Z", status: "COMPLETED", total: 2100, items_count: 2, delivery_type: "IN" }
  ]
};

const mockLoyalty: Record<string, CustomerLoyalty> = {
  c1: {
    programs: [
      { id: "lp1", name: "10 commandes = 1 offerte", description: "Cumulez 10 commandes pour obtenir une réduction", type: "orders_count", current_value: 7, target_value: 10, is_active: true },
      { id: "lp2", name: "Fidélité VIP", description: "Dépensez 100€ pour débloquer des avantages", type: "total_spent", current_value: 7500, target_value: 10000, is_active: true }
    ],
    rewards: [
      { id: "r1", program_id: "lp1", program_name: "10 commandes = 1 offerte", reward_type: "percent_discount", reward_value: 20, is_used: false, created_at: "2024-11-15T10:00:00Z" },
      { id: "r2", program_id: "lp2", program_name: "Fidélité VIP", reward_type: "free_product", reward_value: 0, reward_products: ["Dessert du jour"], is_used: true, created_at: "2024-10-20T14:00:00Z" }
    ]
  },
  c3: {
    programs: [
      { id: "lp1", name: "10 commandes = 1 offerte", description: "Cumulez 10 commandes pour obtenir une réduction", type: "orders_count", current_value: 10, target_value: 10, is_active: true }
    ],
    rewards: [
      { id: "r3", program_id: "lp1", program_name: "10 commandes = 1 offerte", reward_type: "percent_discount", reward_value: 20, is_used: false, created_at: "2024-12-01T10:00:00Z" }
    ]
  }
};

const mockProducts = [
  { id: "p1", name: "Burger Classic" },
  { id: "p2", name: "Pizza Margherita" },
  { id: "p3", name: "Salade César" },
  { id: "p4", name: "Dessert du jour" },
  { id: "p5", name: "Boisson" }
];

// ============= API Functions =============
export const getCustomersList = async (page: number = 1, limit: number = 40): Promise<{ data: Customer[]; hasMore: boolean }> => {
  logAPI("GET", `/customer/list?page=${page}&page_size=${limit}`);
  
  return withMock(
    () => {
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = mockCustomers.slice(start, end);
      return { data: paginatedData, hasMore: end < mockCustomers.length };
    },
    () =>
      apiClient
        .get<WelloApiResponse<CustomerListApiResponse>>(`/customer/list?page=${page}&page_size=${limit}`)
        .then(res => {
          const result = res.data.result ?? [];
          return {
            data: result.map(normalizeCustomer),
            hasMore: result.length === limit,
          };
        })
  );
};

export const searchCustomers = async (terms: string): Promise<Customer[]> => {
  logAPI("GET", `/customer/search?term=${terms}`);
  
  return withMock(
    () => {
      const lowerTerms = terms.toLowerCase();
      return mockCustomers
        .filter(c => {
          const name = c.first_name ? `${c.first_name} ${c.last_name}` : c.customer_name || "";
          return name.toLowerCase().includes(lowerTerms) || c.phone?.includes(terms) || c.email?.toLowerCase().includes(lowerTerms);
        })
        .map((c, i) => ({ ...c, match_score: 100 - i * 10 }));
    },
    () =>
      apiClient
        .get<WelloApiResponse<CustomerListApiResponse>>(`/customer/search?term=${encodeURIComponent(terms)}`)
        .then(res => (res.data.result ?? []).map(normalizeCustomer))
  );
};

export const getCustomerOrders = async (customerId: string): Promise<CustomerOrder[]> => {
  logAPI("GET", `/customers/${customerId}/orders`);
  
  return withMock(
    () => mockOrders[customerId] || [],
    () => apiClient.get<CustomerOrder[]>(`/customers/${customerId}/orders`)
  );
};

export const getCustomerLoyalty = async (customerId: string): Promise<CustomerLoyalty> => {
  logAPI("GET", `/customer/${customerId}/loyalty`);
  
  return withMock(
    () => mockLoyalty[customerId] || { programs: [], rewards: [] },
    () => apiClient.get<CustomerLoyalty>(`/customer/${customerId}/loyalty`)
  );
};

export const updateLoyaltyProgress = async (customerId: string, programId: string, newValue: number): Promise<{ status: string }> => {
  logAPI("PATCH", `/customers/${customerId}/loyalty/${programId}`, { current_value: newValue });
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.patch<{ status: string }>(`/customers/${customerId}/loyalty/${programId}`, { current_value: newValue })
  );
};

export const updateRewardStatus = async (customerId: string, rewardId: string, isUsed: boolean): Promise<{ status: string }> => {
  logAPI("PATCH", `/customers/${customerId}/rewards/${rewardId}`, { is_used: isUsed ? "1" : "0" });
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.patch<{ status: string }>(`/customers/${customerId}/rewards/${rewardId}`, { is_used: isUsed ? "1" : "0" })
  );
};

export const createLoyaltyProgram = async (payload: CreateLoyaltyProgramPayload): Promise<{ status: string; id: string }> => {
  logAPI("POST", "/customers/loyalty", payload);
  
  return withMock(
    () => ({ status: "ok", id: `lp_${Date.now()}` }),
    () => apiClient.post<{ status: string; id: string }>("/customers/loyalty", payload)
  );
};

export const getProducts = async (): Promise<{ id: string; name: string }[]> => {
  logAPI("GET", "/menu/products (for loyalty selection)");
  
  return withMock(
    () => [...mockProducts],
    () => apiClient.get<{ id: string; name: string }[]>("/menu/products")
  );
};

export const getLoyaltyPrograms = async (): Promise<LoyaltyProgram[]> => {
  logAPI("GET", "/customers/loyalty-programs");
  
  return withMock(
    () => [
      {
        id: "lp_1",
        name: "Points par commandes",
        description: "Gagnez des points à chaque commande",
        type: "orders_count",
        current_value: 0,
        target_value: 10,
        is_active: true,
      },
      {
        id: "lp_2",
        name: "Réduction dépense",
        description: "Réduction pour chaque tranche de 100€ dépensée",
        type: "total_spent",
        current_value: 0,
        target_value: 100,
        is_active: true,
      },
    ],
    () => apiClient.get<LoyaltyProgram[]>("/customers/loyalty-programs").then(res => res.data)
  );
};

export const getLoyaltyProgramById = async (programId: string): Promise<LoyaltyProgram> => {
  logAPI("GET", `/customers/loyalty-programs/${programId}`);
  
  return withMock(
    () => ({
      id: programId,
      name: "Programme test",
      description: "Description test",
      type: "orders_count",
      current_value: 0,
      target_value: 10,
      is_active: true,
    }),
    () => apiClient.get<LoyaltyProgram>(`/customers/loyalty-programs/${programId}`).then(res => res.data)
  );
};

export const updateLoyaltyProgram = async (programId: string, payload: Partial<CreateLoyaltyProgramPayload>): Promise<{ status: string }> => {
  logAPI("PATCH", `/customers/loyalty-programs/${programId}`, payload);
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.patch<{ status: string }>(`/customers/loyalty-programs/${programId}`, payload)
  );
};

export const deleteLoyaltyProgram = async (programId: string): Promise<{ status: string }> => {
  logAPI("DELETE", `/customers/loyalty-programs/${programId}`);
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.delete<{ status: string }>(`/customers/loyalty-programs/${programId}`)
  );
};

// ============= Constants =============
export const acquisitionSourceLabels: Record<string, string> = {
  WELLO_RESTO_APPS: "Caisse",
  UBER_EATS: "Uber Eats",
  DELIVEROO: "Deliveroo",
  JUST_EAT: "Just Eat",
  GLOVO: "Glovo"
};

export const deliveryTypeLabels: Record<string, string> = {
  IN: "Sur Place",
  TAKE_AWAY: "Emporter",
  DELIVERY: "Livraison"
};
