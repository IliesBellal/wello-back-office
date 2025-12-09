import { config } from '@/config';

export interface UserAddress {
  street_number?: string;
  street?: string;
  zip_code?: string;
  city?: string;
  country?: string;
}

export interface UserPermissions {
  enabled: boolean;
  is_admin: boolean;
  [key: string]: boolean;
}

export interface UserActivity {
  type: string;
  date: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  color: string;
  permissions: UserPermissions;
  address: UserAddress;
  last_actions?: UserActivity[];
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface UpdateUserPayload {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  color?: string;
  pin_code?: string;
  permissions?: UserPermissions;
  address?: UserAddress;
}

const mockUsers: User[] = [
  {
    id: 'u1',
    first_name: 'Walid',
    last_name: 'Admin',
    email: 'walid@wello.fr',
    phone: '0600000000',
    color: '#3b82f6',
    permissions: { enabled: true, is_admin: true },
    address: {
      street_number: '10',
      street: 'Rue de la Paix',
      zip_code: '75001',
      city: 'Paris',
      country: 'France'
    },
    last_actions: [
      { type: 'ORDER_CREATION', date: '2025-12-05 12:23:43' },
      { type: 'ORDER_PRICING', date: '2025-12-05 12:23:43' },
      { type: 'PAYMENT_CREATION', date: '2025-12-05 12:23:43' },
      { type: 'ORDER_EDITING', date: '2025-12-05 12:23:43' },
      { type: 'PAYMENT_DELETION', date: '2025-12-05 12:23:43' }
    ]
  },
  {
    id: 'u2',
    first_name: 'Alex',
    last_name: 'Staff',
    email: 'alex@wello.fr',
    phone: '0611111111',
    color: '#10b981',
    permissions: { enabled: true, is_admin: false },
    address: {}
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const usersService = {
  async getUsers(): Promise<User[]> {
    console.log('[API] GET /users');
    
    if (config.useMockData) {
      await delay(500);
      return mockUsers;
    }
    
    const response = await fetch(`${config.apiBaseUrl}/users`);
    return response.json();
  },

  async getUserActivity(userId: string): Promise<UserActivity[]> {
    console.log(`[API] GET /users/${userId}/activity`);
    
    if (config.useMockData) {
      await delay(800);
      const user = mockUsers.find(u => u.id === userId);
      return user?.last_actions || [];
    }
    
    const response = await fetch(`${config.apiBaseUrl}/users/${userId}/activity`);
    return response.json();
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    console.log('[API] POST /users/create');
    console.log('Payload:', payload);
    
    if (config.useMockData) {
      await delay(1000);
      const newUser: User = {
        id: `u${Date.now()}`,
        ...payload,
        color: '#6366f1',
        permissions: { enabled: true, is_admin: false },
        address: {}
      };
      mockUsers.push(newUser);
      return newUser;
    }
    
    const response = await fetch(`${config.apiBaseUrl}/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async updateUser(payload: UpdateUserPayload): Promise<User> {
    console.log(`[API] PATCH /users/${payload.user_id}`);
    console.log('Payload:', payload);
    
    if (config.useMockData) {
      await delay(800);
      const userIndex = mockUsers.findIndex(u => u.id === payload.user_id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = {
          ...mockUsers[userIndex],
          ...payload,
          permissions: payload.permissions || mockUsers[userIndex].permissions,
          address: payload.address || mockUsers[userIndex].address
        };
        return mockUsers[userIndex];
      }
      throw new Error('User not found');
    }
    
    const response = await fetch(`${config.apiBaseUrl}/users/${payload.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async deleteUser(userId: string): Promise<void> {
    console.log(`[API] DELETE /users/${userId}`);
    
    if (config.useMockData) {
      await delay(500);
      const index = mockUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        mockUsers.splice(index, 1);
      }
      return;
    }
    
    await fetch(`${config.apiBaseUrl}/users/${userId}`, {
      method: 'DELETE'
    });
  }
};
