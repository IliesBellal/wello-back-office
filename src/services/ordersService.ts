import { config } from "@/config";

// API Logger
const logAPI = (method: string, url: string, payload?: any) => {
  console.log(`[API] ${method} ${url}`);
  if (payload) {
    console.log('Payload:', payload);
  }
};

export interface OrderCustomer {
  name: string;
  phone: string;
  address?: string;
}

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  options?: string[];
}

export interface OrderPayment {
  mop: string;
  label: string;
  amount: number;
}

export interface Order {
  id: string;
  order_number: string;
  state: 'OPEN' | 'CLOSED';
  brand: 'Uber' | 'Deliveroo' | 'Wello';
  customer: OrderCustomer;
  products: OrderProduct[];
  payments: OrderPayment[];
  totals: {
    ht: number;
    tva: number;
    ttc: number;
  };
  created_at: string;
}

const mockPendingOrders: Order[] = [
  {
    id: "ord_001",
    order_number: "#1234",
    state: "OPEN",
    brand: "Wello",
    customer: {
      name: "Jean Dupont",
      phone: "+33612345678",
      address: "123 Rue de Paris, 75001 Paris"
    },
    products: [
      {
        id: "p1",
        name: "Pizza Margherita",
        quantity: 2,
        price: 2400,
        options: ["Sans oignon", "Extra fromage"]
      },
      {
        id: "p2",
        name: "Coca-Cola",
        quantity: 1,
        price: 350
      }
    ],
    payments: [
      {
        mop: "CB",
        label: "Carte Bancaire",
        amount: 5150
      }
    ],
    totals: {
      ht: 4682,
      tva: 468,
      ttc: 5150
    },
    created_at: "2024-01-15T12:30:00Z"
  },
  {
    id: "ord_002",
    order_number: "#1235",
    state: "OPEN",
    brand: "Uber",
    customer: {
      name: "Marie Martin",
      phone: "+33698765432"
    },
    products: [
      {
        id: "p3",
        name: "Burger Classic",
        quantity: 1,
        price: 1200
      }
    ],
    payments: [
      {
        mop: "CASH",
        label: "Espèces",
        amount: 1200
      }
    ],
    totals: {
      ht: 1091,
      tva: 109,
      ttc: 1200
    },
    created_at: "2024-01-15T13:15:00Z"
  }
];

const mockHistoryOrders: Order[] = Array.from({ length: 50 }, (_, i) => ({
  id: `ord_h${i + 1}`,
  order_number: `#${2000 + i}`,
  state: "CLOSED" as const,
  brand: ["Wello", "Uber", "Deliveroo"][i % 3] as "Wello" | "Uber" | "Deliveroo",
  customer: {
    name: `Client ${i + 1}`,
    phone: `+3361234${String(i).padStart(4, '0')}`
  },
  products: [
    {
      id: `p${i}`,
      name: `Produit ${i + 1}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 2000) + 500
    }
  ],
  payments: [
    {
      mop: ["CB", "CASH", "TR"][i % 3],
      label: ["Carte Bancaire", "Espèces", "Tickets Restaurant"][i % 3],
      amount: Math.floor(Math.random() * 5000) + 1000
    }
  ],
  totals: {
    ht: Math.floor(Math.random() * 4500) + 900,
    tva: Math.floor(Math.random() * 500) + 100,
    ttc: Math.floor(Math.random() * 5000) + 1000
  },
  created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString()
}));

export const ordersService = {
  getPendingOrders: async (): Promise<Order[]> => {
    logAPI('GET', '/orders/pending');
    
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockPendingOrders;
    }

    const response = await fetch(`${config.apiBaseUrl}/orders/pending`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    return response.json();
  },

  getOrderHistory: async (page: number = 1, limit: number = 20): Promise<Order[]> => {
    logAPI('POST', '/orders/history', { page, limit });
    
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const start = (page - 1) * limit;
      const end = start + limit;
      return mockHistoryOrders.slice(start, end);
    }

    const response = await fetch(`${config.apiBaseUrl}/orders/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ page, limit })
    });
    return response.json();
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    logAPI('GET', `/orders/${orderId}`);
    
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const allOrders = [...mockPendingOrders, ...mockHistoryOrders];
      const order = allOrders.find(o => o.id === orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      return order;
    }

    const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Order not found');
    }
    
    return response.json();
  }
};
