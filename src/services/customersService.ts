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
  last_order_date?: string;
  match_score?: number;
}

export type CustomerSortField =
  | "customer_first_name"
  | "customer_email"
  | "customer_tel"
  | "customer_nb_orders"
  | "customer_total_spent"
  | "creation_date"
  | "last_order_date";

export type CustomerSortDirection = "asc" | "desc";

interface CustomerSortOptions {
  sortField?: CustomerSortField;
  sortDir?: CustomerSortDirection;
}

export interface CustomerListMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface CustomerListResult {
  data: Customer[];
  hasMore: boolean;
  metadata: CustomerListMetadata;
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

export interface CustomerOrdersResult {
  data: CustomerOrder[];
  hasMore: boolean;
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  type: "orders_count" | "total_spent" | "product_count";
  current_value: number;
  target_value: number;
  is_active: boolean;
  reward_type?: "fixed_discount" | "percent_discount" | "free_product";
  reward_value?: number;
  target_order_types?: string[];
  reward_order_types?: string[];
  target_products?: Array<{ id: string; name: string }>;
  reward_products?: Array<{ id: string; name: string }>;
  reward_max_discount_value?: number;
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

export interface LoyaltySelectionProduct {
  id: string;
  name: string;
  image_url?: string;
  bg_color?: string;
}

interface LegacyCreateLoyaltyProgramPayload {
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

export interface LoyaltyProgramMutationPayload {
  name: string;
  description: string;
  available: boolean;
  target: {
    type: "orders_count" | "total_spent" | "product_count";
    value: number;
    order_types: string;
    product_ids: string[];
  };
  reward: {
    type: "fixed_discount" | "percent_discount" | "free_product";
    value: number;
    order_types: string;
    min_order_value?: number;
    max_discount_value?: number;
    max_rewards_per_order?: number;
    product_ids: string[];
  };
}

export type CreateLoyaltyProgramPayload = LoyaltyProgramMutationPayload | LegacyCreateLoyaltyProgramPayload;
export type UpdateLoyaltyProgramPayload = Partial<LoyaltyProgramMutationPayload> | Partial<LegacyCreateLoyaltyProgramPayload>;

/** Raw shape returned by the real API */
export interface RawApiCustomer {
  customer_id: string;
  customer_name?: string;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_tel?: string;
  customer_email?: string | null;
  customer_address?: string;
  customer_lat?: number;
  customer_lng?: number;
  customer_total_spent?: number;
  customer_nb_orders?: number;
  acquisition_source?: string;
  customer_brand?: string;
  creation_date?: string | number | null;
  last_order_date?: string | number | null;
  match_score?: number;
}

/** Response envelope from GET /customers/list and /customer/search */
interface CustomerListApiResponse {
  metadata?: {
    total_items?: number;
    total_pages?: number;
    current_page?: number;
    limit?: number;
  };
  customers?: RawApiCustomer[];
  // Backward compatibility with old shape
  result?: RawApiCustomer[];
  status?: string;
}

type CustomerOrdersHistoryApiResponse = WelloApiResponse<{
  orders?: Array<{
    order_id: string;
    order_num: string;
    state?: string;
    brand_status?: string;
    TTC?: number;
    order_type?: string | null;
    fulfillment_type?: string;
    callHour?: string;
    creation_date?: string | number | null;
    products?: Array<{ quantity?: number }>;
  }>;
  metadata?: {
    total_items?: number;
    total_pages?: number;
    current_page?: number;
    limit?: number;
  };
}>;

interface RawLoyaltyProgress {
  loyalty_program_id?: string | number;
  current_value?: number;
  last_update?: string;
  type?: "orders_count" | "total_spent" | "product_count" | string;
  target_value?: number;
  name?: string;
  description?: string;
}

interface RawAvailableReward {
  id?: string | number;
  reward_id?: string | number;
  loyalty_program_id?: string | number;
  program_id?: string | number;
  program_name?: string;
  name?: string;
  reward_type?: "fixed_discount" | "percent_discount" | "free_product" | string;
  reward_value?: number;
  value?: number;
  reward_products?: string[];
  products?: string[];
  is_used?: boolean;
  created_at?: string;
  available_since?: string;
}

type CustomerLoyaltyApiResponse = WelloApiResponse<{
  loyalty?: {
    loyalty_progress?: RawLoyaltyProgress[] | null;
    available_rewards?: RawAvailableReward[] | null;
  } | null;
  status?: string;
}>;

interface RawLoyaltyProgramDefinition {
  id?: string | number;
  merchant_id?: string | number;
  name?: string;
  description?: string;
  enabled?: boolean;
  available?: boolean;
  target?: {
    type?: "orders_count" | "total_spent" | "product_count" | "products_count" | string;
    value?: number;
    order_types?: string | string[];
    products?: Array<{ id?: string | number; name?: string }> | null;
  } | null;
  reward?: {
    type?: "fixed_discount" | "percent_discount" | "free_product" | string;
    value?: number;
    max_discount_value?: number;
    order_types?: string | string[];
    products?: Array<{ id?: string | number; name?: string }> | null;
  } | null;
}

type LoyaltyProgramsApiResponse = WelloApiResponse<{
  status?: string;
  loyalty_programs?: RawLoyaltyProgramDefinition[] | null;
}>;

/** Map raw API customer to the normalized Customer shape used by UI */
const toIsoDateString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    const date = new Date(value > 9999999999 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  const parsedNumeric = Number.parseFloat(value);
  if (Number.isFinite(parsedNumeric) && /^\d+(\.\d+)?$/.test(value.trim())) {
    const date = new Date(parsedNumeric > 9999999999 ? parsedNumeric : parsedNumeric * 1000);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const normalizeCustomer = (raw: RawApiCustomer): Customer => ({
  id: raw.customer_id,
  first_name: raw.customer_first_name ?? undefined,
  last_name: raw.customer_last_name ?? undefined,
  customer_name: raw.customer_name,
  phone: raw.customer_tel,
  email: raw.customer_email ?? undefined,
  customer_total_spent: raw.customer_total_spent ?? 0,
  customer_total_orders: raw.customer_nb_orders ?? 0,
  acquisition_source: raw.acquisition_source ?? raw.customer_brand ?? "",
  created_at: toIsoDateString(raw.creation_date),
  last_order_date: toIsoDateString(raw.last_order_date) || undefined,
  match_score: raw.match_score,
});

const toOrderDateIsoString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString();
  }

  if (typeof value === "number") {
    const date = new Date(value > 9999999999 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const mapHistoryOrderToCustomerOrder = (order: NonNullable<CustomerOrdersHistoryApiResponse["data"]["orders"]>[number]): CustomerOrder => {
  const itemsCount = (order.products || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return {
    id: order.order_id,
    order_number: order.order_num,
    date: toOrderDateIsoString(order.callHour || order.creation_date),
    status: (order.state || order.brand_status || "").toUpperCase() || "UNKNOWN",
    total: order.TTC || 0,
    items_count: itemsCount,
    delivery_type: order.order_type || order.fulfillment_type || "IN",
  };
};

const normalizeLoyaltyType = (type: RawLoyaltyProgress["type"]): LoyaltyProgram["type"] => {
  if (type === "products_count") {
    return "product_count";
  }
  if (type === "total_spent" || type === "product_count") {
    return type;
  }
  return "orders_count";
};

const normalizeRewardType = (type: RawAvailableReward["reward_type"]): Reward["reward_type"] => {
  if (type === "fixed_discount" || type === "free_product") {
    return type;
  }
  return "percent_discount";
};

const parseOrderTypes = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value.split(/\s+/).filter(Boolean);
};

type RawMenuProductsNode = {
  id?: string | number;
  product_id?: string | number;
  name?: string;
  image_url?: string;
  bg_color?: string;
  products?: RawMenuProductsNode[];
  sub_products?: RawMenuProductsNode[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeLoyaltySelectionProducts = (payload: unknown): LoyaltySelectionProduct[] => {
  const output: LoyaltySelectionProduct[] = [];

  const collect = (node: unknown) => {
    if (!isRecord(node)) {
      return;
    }

    const typedNode = node as RawMenuProductsNode;
    const hasNestedProducts = Array.isArray(typedNode.products);
    const hasProductId = typedNode.product_id !== undefined && typedNode.product_id !== null;
    const hasFlatId = typedNode.id !== undefined && typedNode.id !== null;

    // Collect flat products and hierarchical products, but skip category nodes.
    if ((hasProductId || (hasFlatId && !hasNestedProducts)) && typeof typedNode.name === "string" && typedNode.name.trim() !== "") {
      output.push({
        id: String(typedNode.product_id ?? typedNode.id),
        name: typedNode.name,
        image_url: typedNode.image_url,
        bg_color: typedNode.bg_color,
      });
    }

    if (Array.isArray(typedNode.products)) {
      typedNode.products.forEach(collect);
    }

    if (Array.isArray(typedNode.sub_products)) {
      typedNode.sub_products.forEach(collect);
    }
  };

  if (Array.isArray(payload)) {
    payload.forEach(collect);
  } else {
    collect(payload);
  }

  const uniqueProducts = new Map<string, LoyaltySelectionProduct>();
  output.forEach((product) => {
    if (!uniqueProducts.has(product.id)) {
      uniqueProducts.set(product.id, product);
    }
  });

  return Array.from(uniqueProducts.values());
};

const mapProgramProducts = (products: RawLoyaltyProgramDefinition["target"]["products"]): Array<{ id: string; name: string }> => {
  if (!Array.isArray(products)) {
    return [];
  }

  return products.map((product, index) => ({
    id: String(product.id ?? `product_${index}`),
    name: product.name || "Produit",
  }));
};

const mapProgramDefinitionToLoyaltyProgram = (item: RawLoyaltyProgramDefinition, index: number): LoyaltyProgram => ({
  id: String(item.id ?? `program_${index}`),
  name: item.name || "Programme fidélité",
  description: item.description || "",
  type: normalizeLoyaltyType(item.target?.type),
  current_value: 0,
  target_value: item.target?.value ?? 0,
  is_active: item.available ?? item.enabled ?? true,
  reward_type: normalizeRewardType(item.reward?.type),
  reward_value: item.reward?.value ?? 0,
  target_order_types: parseOrderTypes(item.target?.order_types),
  reward_order_types: parseOrderTypes(item.reward?.order_types),
  target_products: mapProgramProducts(item.target?.products),
  reward_products: mapProgramProducts(item.reward?.products),
  reward_max_discount_value: item.reward?.max_discount_value,
});

const normalizeLoyaltyMutationPayload = (
  payload: CreateLoyaltyProgramPayload | UpdateLoyaltyProgramPayload,
  isPatch: boolean
): LoyaltyProgramMutationPayload | Partial<LoyaltyProgramMutationPayload> => {
  if ("target" in payload || "reward" in payload || "enabled" in payload || "available" in payload) {
    const directPayload = payload as Partial<LoyaltyProgramMutationPayload> & { enabled?: boolean };
    const { enabled, ...rest } = directPayload;

    return {
      ...rest,
      ...(enabled !== undefined && rest.available === undefined ? { available: enabled } : {}),
    } as LoyaltyProgramMutationPayload | Partial<LoyaltyProgramMutationPayload>;
  }

  const legacyPayload = payload as Partial<LegacyCreateLoyaltyProgramPayload>;
  const fallbackOrderTypes = ["IN", "TAKE_AWAY", "DELIVERY"];
  const targetOrderTypes = legacyPayload.target_order_types ?? fallbackOrderTypes;
  const targetType = legacyPayload.type ?? "orders_count";
  const rewardType = legacyPayload.reward_type ?? "percent_discount";

  const normalized: Partial<LoyaltyProgramMutationPayload> = {
    ...(legacyPayload.name !== undefined ? { name: legacyPayload.name } : {}),
    ...(legacyPayload.description !== undefined ? { description: legacyPayload.description } : {}),
    available: true,
    ...(legacyPayload.type !== undefined || legacyPayload.target_value !== undefined || legacyPayload.target_order_types !== undefined || legacyPayload.target_products !== undefined
      ? {
          target: {
            type: targetType,
            value: legacyPayload.target_value ?? 0,
            order_types: targetOrderTypes.join(" "),
            product_ids: legacyPayload.target_products ?? [],
          },
        }
      : {}),
    ...(legacyPayload.reward_type !== undefined || legacyPayload.reward_value !== undefined || legacyPayload.reward_products !== undefined
      ? {
          reward: {
            type: rewardType,
            value: legacyPayload.reward_value ?? 0,
            order_types: targetOrderTypes.join(" "),
            min_order_value: 0,
            max_rewards_per_order: 1,
            ...(rewardType === "percent_discount" ? { max_discount_value: 0 } : {}),
            product_ids: legacyPayload.reward_products ?? [],
          },
        }
      : {}),
  };

  if (isPatch) {
    return normalized;
  }

  return {
    name: normalized.name || "",
    description: normalized.description || "",
    available: normalized.available ?? true,
    target: normalized.target || {
      type: "orders_count",
      value: 0,
      order_types: fallbackOrderTypes.join(" "),
      product_ids: [],
    },
    reward: normalized.reward || {
      type: "percent_discount",
      value: 0,
      order_types: fallbackOrderTypes.join(" "),
      min_order_value: 0,
      max_discount_value: 0,
      max_rewards_per_order: 1,
      product_ids: [],
    },
  };
};

const extractLoyaltyProgramDefinitions = (
  response: LoyaltyProgramsApiResponse | RawLoyaltyProgramDefinition[] | RawLoyaltyProgramDefinition
): RawLoyaltyProgramDefinition[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if ("data" in response) {
    return Array.isArray(response.data?.loyalty_programs) ? response.data.loyalty_programs : [];
  }

  return [response];
};

const mapLoyaltyProgressToProgram = (item: RawLoyaltyProgress, index: number): LoyaltyProgram => ({
  id: String(item.loyalty_program_id ?? `program_${index}`),
  name: item.name || "Programme fidélité",
  description: item.description || "",
  type: normalizeLoyaltyType(item.type),
  current_value: item.current_value ?? 0,
  target_value: item.target_value ?? 0,
  is_active: true,
});

const mapAvailableRewardToReward = (item: RawAvailableReward, index: number): Reward => ({
  id: String(item.reward_id ?? item.id ?? `reward_${index}`),
  program_id: String(item.loyalty_program_id ?? item.program_id ?? ""),
  program_name: item.program_name || item.name || "Récompense",
  reward_type: normalizeRewardType(item.reward_type),
  reward_value: item.reward_value ?? item.value ?? 0,
  reward_products: item.reward_products ?? item.products,
  is_used: item.is_used ?? false,
  created_at: item.created_at || item.available_since || new Date().toISOString(),
});

const normalizeCustomerLoyaltyResponse = (
  response: CustomerLoyaltyApiResponse | CustomerLoyalty
): CustomerLoyalty => {
  if ("programs" in response && "rewards" in response) {
    return {
      programs: Array.isArray(response.programs) ? response.programs : [],
      rewards: Array.isArray(response.rewards) ? response.rewards : [],
    };
  }

  const loyalty = response.data?.loyalty;
  const progress = Array.isArray(loyalty?.loyalty_progress) ? loyalty.loyalty_progress : [];
  const availableRewards = Array.isArray(loyalty?.available_rewards) ? loyalty.available_rewards : [];

  return {
    programs: progress.map(mapLoyaltyProgressToProgram),
    rewards: availableRewards.map(mapAvailableRewardToReward),
  };
};

const buildCustomerQuery = (
  page: number,
  limit: number,
  options?: CustomerSortOptions
): string => {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(limit),
  });

  if (options?.sortField && options?.sortDir) {
    query.set("sort_field", options.sortField);
    query.set("sort_dir", options.sortDir);
  }

  return query.toString();
};

const appendSortToSearchQuery = (terms: string, options?: CustomerSortOptions): string => {
  const query = new URLSearchParams({ term: terms });

  if (options?.sortField && options?.sortDir) {
    query.set("sort_field", options.sortField);
    query.set("sort_dir", options.sortDir);
  }

  return query.toString();
};

const normalizeMetadata = (
  metadata: CustomerListApiResponse["metadata"] | undefined,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackCount: number
): CustomerListMetadata => {
  const totalItems = metadata?.total_items ?? fallbackCount;
  const totalPages = Math.max(1, metadata?.total_pages ?? Math.ceil(Math.max(totalItems, 1) / fallbackLimit));
  const rawCurrentPage = metadata?.current_page;
  const currentPage = rawCurrentPage === undefined
    ? fallbackPage
    : Math.max(1, rawCurrentPage <= 0 ? rawCurrentPage + 1 : rawCurrentPage);
  const limit = metadata?.limit ?? fallbackLimit;

  return {
    totalItems,
    totalPages,
    currentPage,
    limit,
  };
};

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
    created_at: "2024-03-15T10:00:00Z",
    last_order_date: "2024-12-10T12:30:00Z"
  },
  {
    id: "c2",
    customer_name: "Jean Martin",
    phone: "0698765432",
    customer_total_spent: 32500,
    customer_total_orders: 12,
    acquisition_source: "UBER_EATS",
    created_at: "2024-06-20T14:30:00Z",
    last_order_date: "2024-12-08T18:00:00Z"
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
    created_at: "2023-11-01T09:00:00Z",
    last_order_date: "2024-12-12T20:00:00Z"
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
    created_at: "2024-09-10T16:45:00Z",
    last_order_date: "2024-12-01T14:20:00Z"
  },
  {
    id: "c5",
    customer_name: "Emma Leroy",
    phone: "0687654321",
    customer_total_spent: 52000,
    customer_total_orders: 18,
    acquisition_source: "JUST_EAT",
    created_at: "2024-01-22T11:20:00Z",
    last_order_date: "2024-12-09T19:45:00Z"
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
  { id: "p1", name: "Burger Classic", bg_color: "#f3f4f6" },
  { id: "p2", name: "Pizza Margherita", bg_color: "#fee2e2" },
  { id: "p3", name: "Salade César", bg_color: "#dcfce7" },
  { id: "p4", name: "Dessert du jour", bg_color: "#fef3c7" },
  { id: "p5", name: "Boisson", bg_color: "#dbeafe" }
];

// ============= API Functions =============
export const getCustomersList = async (
  page: number = 1,
  limit: number = 40,
  options?: CustomerSortOptions
): Promise<CustomerListResult> => {
  const query = buildCustomerQuery(page, limit, options);
  logAPI("GET", `/customers/list?${query}`);
  
  return withMock(
    () => {
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = mockCustomers.slice(start, end);
      const metadata = normalizeMetadata(
        {
          total_items: mockCustomers.length,
          total_pages: Math.ceil(mockCustomers.length / limit),
          current_page: page,
          limit,
        },
        page,
        limit,
        paginatedData.length
      );
      return {
        data: paginatedData,
        hasMore: end < mockCustomers.length,
        metadata,
      };
    },
    () =>
      apiClient
        .get<WelloApiResponse<CustomerListApiResponse>>(`/customers/list?${query}`)
        .then(res => {
          const result = res.data.customers ?? res.data.result ?? [];
          const metadata = normalizeMetadata(res.data.metadata, page, limit, result.length);
          return {
            data: result.map(normalizeCustomer),
            hasMore: metadata.currentPage < metadata.totalPages,
            metadata,
          };
        })
  );
};

export const searchCustomers = async (terms: string, options?: CustomerSortOptions): Promise<Customer[]> => {
  const query = appendSortToSearchQuery(terms, options);
  logAPI("GET", `/customers/search?${query}`);
  
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
        .get<WelloApiResponse<CustomerListApiResponse>>(`/customers/search?${query}`)
        .then(res => (res.data.customers ?? res.data.result ?? []).map(normalizeCustomer))
  );
};

export const getCustomerOrders = async (
  customerId: string,
  options: { page?: number; limit?: number } = {}
): Promise<CustomerOrdersResult> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const payload = { customer_id: customerId, limit, page };
  logAPI("POST", "/orders/history", payload);
  
  return withMock(
    () => {
      const allOrders = mockOrders[customerId] || [];
      const start = (page - 1) * limit;
      const end = start + limit;
      const data = allOrders.slice(start, end);
      const totalItems = allOrders.length;
      const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 1) / limit));

      return {
        data,
        hasMore: page < totalPages,
        metadata: {
          totalItems,
          totalPages,
          currentPage: page,
          limit,
        },
      };
    },
    () =>
      apiClient
        .post<CustomerOrdersHistoryApiResponse>("/orders/history", payload)
        .then((res) => {
          const apiOrders = (res.data.orders || []).map(mapHistoryOrderToCustomerOrder);
          const metadata = res.data.metadata;
          const rawCurrentPage = metadata?.current_page;
          const currentPage = rawCurrentPage === undefined
            ? page
            : Math.max(1, rawCurrentPage <= 0 ? rawCurrentPage + 1 : rawCurrentPage);
          const resolvedLimit = metadata?.limit ?? limit;
          const hasMetadata = metadata?.total_pages !== undefined || metadata?.total_items !== undefined;
          const inferredHasMore = apiOrders.length >= resolvedLimit;
          const totalItems = metadata?.total_items ?? ((currentPage - 1) * resolvedLimit + apiOrders.length);
          const totalPages = hasMetadata
            ? Math.max(1, metadata?.total_pages ?? Math.ceil(Math.max(totalItems, 1) / resolvedLimit))
            : currentPage + (inferredHasMore ? 1 : 0);
          const hasMore = hasMetadata ? currentPage < totalPages : inferredHasMore;

          return {
            data: apiOrders,
            hasMore,
            metadata: {
              totalItems,
              totalPages,
              currentPage,
              limit: resolvedLimit,
            },
          };
        })
  );
};

export const getCustomerLoyalty = async (customerId: string): Promise<CustomerLoyalty> => {
  logAPI("GET", `/customers/${customerId}/loyalty`);
  
  return withMock(
    () => mockLoyalty[customerId] || { programs: [], rewards: [] },
    () =>
      apiClient
        .get<CustomerLoyaltyApiResponse | CustomerLoyalty>(`/customers/${customerId}/loyalty`)
        .then(normalizeCustomerLoyaltyResponse)
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
  logAPI("PATCH", `/customers/${customerId}/rewards/${rewardId}`, { is_used: isUsed });
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.patch<{ status: string }>(`/customers/${customerId}/rewards/${rewardId}`, { is_used: isUsed })
  );
};

export const createLoyaltyProgram = async (payload: CreateLoyaltyProgramPayload): Promise<{ status: string; id: string }> => {
  const normalizedPayload = normalizeLoyaltyMutationPayload(payload, false) as LoyaltyProgramMutationPayload;
  logAPI("POST", "/customers/loyalty-programs", normalizedPayload);
  
  return withMock(
    () => ({ status: "ok", id: `lp_${Date.now()}` }),
    () => apiClient.post<{ status: string; id: string }>("/customers/loyalty-programs", normalizedPayload)
  );
};

export const getProducts = async (): Promise<LoyaltySelectionProduct[]> => {
  logAPI("GET", "/menu/products (for loyalty selection)");
  
  return withMock(
    () => [...mockProducts],
    () =>
      apiClient
        .get<unknown>("/menu/products")
        .then((response) => {
          const data = isRecord(response) && "data" in response
            ? response.data
            : response;

          return normalizeLoyaltySelectionProducts(data);
        })
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
        reward_type: "free_product",
        reward_value: 0,
        target_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
        reward_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
        target_products: [],
        reward_products: [],
      },
      {
        id: "lp_2",
        name: "Réduction dépense",
        description: "Réduction pour chaque tranche de 100€ dépensée",
        type: "total_spent",
        current_value: 0,
        target_value: 100,
        is_active: true,
        reward_type: "fixed_discount",
        reward_value: 1000,
        target_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
        reward_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
        target_products: [],
        reward_products: [],
      },
    ],
    () =>
      apiClient
        .get<LoyaltyProgramsApiResponse | RawLoyaltyProgramDefinition[]>("/customers/loyalty-programs")
        .then((response) => extractLoyaltyProgramDefinitions(response).map(mapProgramDefinitionToLoyaltyProgram))
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
      reward_type: "free_product",
      reward_value: 0,
      target_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
      reward_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
      target_products: [],
      reward_products: [],
    }),
    () =>
      apiClient
        .get<LoyaltyProgramsApiResponse | RawLoyaltyProgramDefinition | RawLoyaltyProgramDefinition[]>(`/customers/loyalty-programs/${programId}`)
        .then((response) => {
          const program = extractLoyaltyProgramDefinitions(response)[0];

          return mapProgramDefinitionToLoyaltyProgram(program ?? {}, 0);
        })
  );
};

export const updateLoyaltyProgram = async (programId: string, payload: UpdateLoyaltyProgramPayload): Promise<{ status: string }> => {
  const normalizedPayload = normalizeLoyaltyMutationPayload(payload, true);
  logAPI("PATCH", `/customers/loyalty-programs/${programId}`, normalizedPayload);
  
  return withMock(
    () => ({ status: "ok" }),
    () => apiClient.patch<{ status: string }>(`/customers/loyalty-programs/${programId}`, normalizedPayload)
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
