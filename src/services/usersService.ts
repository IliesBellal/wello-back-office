import { apiClient, withMock, logAPI } from "@/services/apiClient";

// ============= Types =============
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

// ============= Mock Data =============
const mockUsers: User[] = [
  {
    id: 'u1',
    first_name: 'Walid',
    last_name: 'Admin',
    email: 'walid@wello.fr',
    phone: '0600000000',
    color: '#3b82f6',
    permissions: { enabled: true, is_admin: true },
    address: { street_number: '10', street: 'Rue de la Paix', zip_code: '75001', city: 'Paris', country: 'France' },
    last_actions: [
      { type: 'ORDER_CREATION', date: '2025-12-05 12:23:43' },
      { type: 'ORDER_PRICING', date: '2025-12-05 12:23:43' },
      { type: 'PAYMENT_CREATION', date: '2025-12-05 12:23:43' }
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

// ============= API Functions =============
export const usersService = {
  async getUsers(): Promise<User[]> {
    logAPI('GET', '/pos/users');
    return withMock(
      () => [...mockUsers], 
      async () => {
        const response = await apiClient.get<{ data: { users: Array<{ user_id: string; first_name: string; last_name: string; lat: number | null; lng: number | null; status: string }> } }>('/pos/users');
        // Transform API response to our User type
        return response.data.users.map(u => ({
          id: u.user_id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: '',
          phone: '',
          color: '#6366f1',
          permissions: { enabled: u.status === 'AVAILABLE', is_admin: false },
          address: {}
        }));
      }
    );
  },

  async getUserActivity(userId: string): Promise<UserActivity[]> {
    logAPI('GET', `/users/${userId}/activity`);
    return withMock(
      () => mockUsers.find(u => u.id === userId)?.last_actions || [],
      () => apiClient.get<UserActivity[]>(`/users/${userId}/activity`)
    );
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    logAPI('POST', '/users/create', payload);
    return withMock(
      () => {
        const newUser: User = { id: `u${Date.now()}`, ...payload, color: '#6366f1', permissions: { enabled: true, is_admin: false }, address: {} };
        mockUsers.push(newUser);
        return newUser;
      },
      () => apiClient.post<User>('/users/create', payload)
    );
  },

  async updateUser(payload: UpdateUserPayload): Promise<User> {
    logAPI('PATCH', `/users/${payload.user_id}`, payload);
    return withMock(
      () => {
        const idx = mockUsers.findIndex(u => u.id === payload.user_id);
        if (idx !== -1) {
          mockUsers[idx] = { ...mockUsers[idx], ...payload, permissions: payload.permissions || mockUsers[idx].permissions, address: payload.address || mockUsers[idx].address };
          return mockUsers[idx];
        }
        throw new Error('User not found');
      },
      () => apiClient.patch<User>(`/users/${payload.user_id}`, payload)
    );
  },

  async deleteUser(userId: string): Promise<void> {
    logAPI('DELETE', `/users/${userId}`);
    return withMock(
      () => { const idx = mockUsers.findIndex(u => u.id === userId); if (idx !== -1) mockUsers.splice(idx, 1); },
      () => apiClient.delete<void>(`/users/${userId}`)
    );
  }
};
