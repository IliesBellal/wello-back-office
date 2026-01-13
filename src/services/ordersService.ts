import { apiClient, USE_MOCK_DATA, withMock, logAPI } from "@/services/apiClient";

// ============= Types =============
export interface OrderComponent {
  component_id: number;
  product_id: string;
  name: string;
  price: number;
  status: number;
  quantity: number;
  unit_of_measure: string;
}

export interface OrderComment {
  order_id: string;
  user_name: string | null;
  content: string;
  creation_date: string | null;
}

export interface OrderProductConfiguration {
  attributes: unknown[];
}

export interface OrderProduct {
  order_id: string;
  order_item_id: string;
  product_id: string;
  ordered_on: number;
  production_status: string;
  production_status_done_quantity: number;
  name: string;
  image_url: string;
  components: OrderComponent[];
  description: string;
  price: number;
  price_take_away: number;
  price_delivery: number;
  tva_rate_in: number;
  tva_rate_delivery: number;
  tva_rate_take_away: number;
  available_in: boolean;
  available_take_away: boolean;
  available_delivery: boolean;
  category: string;
  category_id: string;
  is_product_group: boolean;
  status: number;
  sub_products: unknown;
  configuration: OrderProductConfiguration;
  quantity: number;
  paid_quantity: number;
  distributed_quantity: number;
  ready_for_distribution_quantity: number;
  isPaid: number;
  isDistributed: number;
  discount_id: string | null;
  discount_name: string | null;
  discounted_price: unknown;
  production_color: string;
  extra: unknown[];
  without: unknown[];
  customers: unknown[];
  comment: OrderComment;
}

export interface OrderPayment {
  order_id: string;
  payment_id: number;
  mop: string;
  amount: number;
  payment_date: string;
  enabled: number;
}

export interface OrderCustomer {
  customer_id: string;
  customer_code: string | null;
  customer_name: string;
  customer_tel: string;
  customer_email: string | null;
  customer_temporary_phone: string | null;
  customer_temporary_phone_code: string | null;
  customer_nb_orders: number;
  customer_nb_bookings: unknown;
  customer_total_spent: unknown;
  match_score: unknown;
  customer_additional_info: unknown;
  customer_zone_code: unknown;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  customer_floor_number: string | null;
  customer_door_number: string | null;
  customer_additional_address: string | null;
  merchant_id: string;
  customer_business_name: string | null;
  customer_birthdate: string | null;
  customer_temporary_address: string | null;
  customer_temporary_lat: unknown;
  customer_temporary_lng: unknown;
  customer_temporary_door_number: unknown;
  customer_temporary_floor_number: unknown;
  customer_temporary_additional_address: unknown;
  creation_date: unknown;
}

export interface Order {
  order_id: string;
  order_num: string;
  delivery_session_id: string;
  brand: string;
  brand_order_id: string | null;
  brand_order_num: string | null;
  brand_status: string;
  order_type: string | null;
  cutlery_notes: string;
  state: string;
  scheduled: boolean;
  TTC: number;
  TVA: number;
  HT: number;
  places_settings: number;
  pager_number: string | null;
  isPaid: boolean;
  isDistributed: boolean;
  isSNO: boolean;
  callHour: string;
  estimated_ready: number | null;
  isDelivery: number;
  merchant_approval: string;
  delivery_fees: number;
  customer: OrderCustomer | null;
  comments: unknown[];
  payments: OrderPayment[];
  responsible: unknown;
  location: unknown[];
  products: OrderProduct[];
  priority: unknown;
  creation_date: number;
  fulfillment_type: string;
  last_update: number;
}

export interface PendingOrdersResponse {
  id: string;
  data: {
    orders: Order[];
  };
}

// ============= Mock Data =============
const mockPendingOrders: Order[] = [
  {
    order_id: "22461",
    order_num: "55",
    delivery_session_id: "",
    brand: "WELLO_RESTO",
    brand_order_id: null,
    brand_order_num: null,
    brand_status: "PENDING",
    order_type: "IN",
    cutlery_notes: "0",
    state: "OPEN",
    scheduled: false,
    TTC: 3270,
    TVA: 297,
    HT: 2973,
    places_settings: 0,
    pager_number: null,
    isPaid: true,
    isDistributed: false,
    isSNO: false,
    callHour: "2026-01-04T15:30:33Z",
    estimated_ready: 1767540933,
    isDelivery: 0,
    merchant_approval: "ACCEPTED",
    delivery_fees: 0,
    customer: null,
    comments: [],
    payments: [
      {
        order_id: "22461",
        payment_id: 22958,
        mop: "CB",
        amount: 3270,
        payment_date: "2026-01-04T15:30:33Z",
        enabled: 1
      }
    ],
    responsible: null,
    location: [],
    products: [
      {
        order_id: "22461",
        order_item_id: "54415",
        product_id: "91",
        ordered_on: 1767540633,
        production_status: "DONE",
        production_status_done_quantity: 3,
        name: "Couscous végétarien",
        image_url: "https://storage.welloresto.fr/merchants/2_brasserie_du_midi/products/default.jpg",
        components: [
          {
            component_id: 96,
            product_id: "91",
            name: "Semoule",
            price: 100,
            status: 1,
            quantity: 320,
            unit_of_measure: "Grammes"
          }
        ],
        description: "Semoule, légumes, pois chiches, raisins secs, harissa",
        price: 1090,
        price_take_away: 1090,
        price_delivery: 1090,
        tva_rate_in: 10,
        tva_rate_delivery: 10,
        tva_rate_take_away: 10,
        available_in: true,
        available_take_away: true,
        available_delivery: true,
        category: "Couscous",
        category_id: "Couscous",
        is_product_group: false,
        status: 0,
        sub_products: null,
        configuration: {
          attributes: []
        },
        quantity: 3,
        paid_quantity: 0,
        distributed_quantity: 0,
        ready_for_distribution_quantity: 0,
        isPaid: 0,
        isDistributed: 0,
        discount_id: null,
        discount_name: null,
        discounted_price: null,
        production_color: "#00bfff",
        extra: [],
        without: [],
        customers: [],
        comment: {
          order_id: "",
          user_name: null,
          content: "",
          creation_date: null
        }
      }
    ],
    priority: null,
    creation_date: 1767540633,
    fulfillment_type: "DELIVERY_BY_RESTAURANT",
    last_update: 1767540633
  }
];

const mockHistoryOrders: Order[] = Array.from({ length: 50 }, (_, i) => {
  const mockCustomer: OrderCustomer = {
    customer_id: `${1338 + i}`,
    customer_code: null,
    customer_name: ["Robin", "Marie", "Jean", "Sophie", "Pierre"][i % 5],
    customer_tel: `+336${String(21452876 + i).slice(-8)}`,
    customer_email: null,
    customer_temporary_phone: null,
    customer_temporary_phone_code: null,
    customer_nb_orders: 28 + i,
    customer_nb_bookings: null,
    customer_total_spent: null,
    match_score: null,
    customer_additional_info: null,
    customer_zone_code: null,
    customer_address: "1 Rue Vauban, 57000 Metz, France",
    customer_lat: 0,
    customer_lng: 0,
    customer_floor_number: null,
    customer_door_number: null,
    customer_additional_address: null,
    merchant_id: "",
    customer_business_name: null,
    customer_birthdate: null,
    customer_temporary_address: null,
    customer_temporary_lat: null,
    customer_temporary_lng: null,
    customer_temporary_door_number: null,
    customer_temporary_floor_number: null,
    customer_temporary_additional_address: null,
    creation_date: null,
  };

  return {
    order_id: `${1009 + i}`,
    order_num: `${12 + i}`,
    delivery_session_id: "",
    brand: ["WELLO_RESTO", "UBER", "DELIVEROO"][i % 3],
    brand_order_id: null,
    brand_order_num: null,
    brand_status: "DONE",
    order_type: null,
    cutlery_notes: "0",
    state: "CLOSED",
    scheduled: false,
    TTC: Math.floor(Math.random() * 5000) + 1000,
    TVA: Math.floor(Math.random() * 500) + 100,
    HT: Math.floor(Math.random() * 4500) + 900,
    places_settings: 0,
    pager_number: null,
    isPaid: true,
    isDistributed: true,
    isSNO: false,
    callHour: new Date(2024, 1, Math.floor(Math.random() * 28) + 1).toISOString(),
    estimated_ready: null,
    isDelivery: i % 3 === 0 ? 1 : 0,
    merchant_approval: "1",
    delivery_fees: i % 3 === 0 ? 300 : 0,
    customer: mockCustomer,
    comments: [],
    payments: [
      {
        order_id: `${1009 + i}`,
        payment_id: 968 + i,
        mop: ["CB", "CASH"][i % 2],
        amount: Math.floor(Math.random() * 5000) + 1000,
        payment_date: new Date(2024, 3, Math.floor(Math.random() * 30) + 1).toISOString(),
        enabled: 1
      }
    ],
    responsible: null,
    location: [],
    products: [],
    priority: null,
    creation_date: 1707091965 + i * 86400,
    fulfillment_type: "DELIVERY_BY_RESTAURANT",
    last_update: 1708783698 + i * 86400
  };
});

// ============= API Functions =============
export const ordersService = {
  getPendingOrders: async (): Promise<Order[]> => {
    logAPI('GET', '/orders/pending');
    
    return withMock(
      () => [...mockPendingOrders],
      () => apiClient.get<PendingOrdersResponse>('/orders/pending').then(res => res.data.orders)
    );
  },

  getOrderHistory: async (page: number = 1, limit: number = 20): Promise<Order[]> => {
    logAPI('POST', '/orders/history', { page, limit });
    
    return withMock(
      () => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return mockHistoryOrders.slice(start, end);
      },
      () => apiClient.post<PendingOrdersResponse>('/orders/history', { page, limit }).then(res => res.data.orders)
    );
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    logAPI('GET', `/orders/${orderId}`);
    
    return withMock(
      () => {
        const allOrders = [...mockPendingOrders, ...mockHistoryOrders];
        const order = allOrders.find(o => o.order_id === orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        return order;
      },
      () => apiClient.get<Order>(`/orders/${orderId}`)
    );
  }
};
