import { apiClient, withMock, logAPI } from '@/services/apiClient';
import { Promotion, Availability } from '@/types/promotions';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockPromotions: Promotion[] = [
  {
    id: 'promo_1',
    name: 'Happy Hour -20%',
    description: 'Réduction de 20% sur toute la carte',
    type: 'percentage',
    value: 20,
    code: 'HAPPY20',
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    active: true,
  },
  {
    id: 'promo_2',
    name: 'Offre du midi',
    description: '2€ de réduction sur les menus du midi',
    type: 'fixed',
    value: 200,
    start_date: '2026-04-01',
    active: true,
  },
  {
    id: 'promo_3',
    name: 'Code fidélité',
    type: 'percentage',
    value: 10,
    code: 'FIDELITE10',
    active: false,
  },
];

const mockAvailabilities: Availability[] = [
  {
    id: 'avail_1',
    name: 'Service du midi',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '11:30',
    end_time: '14:30',
    active: true,
  },
  {
    id: 'avail_2',
    name: 'Service du soir',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    start_time: '18:30',
    end_time: '22:30',
    active: true,
  },
  {
    id: 'avail_3',
    name: 'Brunch du week-end',
    days: ['saturday', 'sunday'],
    start_time: '10:00',
    end_time: '14:00',
    active: false,
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const promotionsService = {
  // ── Promotions ──────────────────────────────────────────────────────────────

  async getPromotions(): Promise<Promotion[]> {
    logAPI('GET', '/menu/promotions');
    return withMock(
      () => [...mockPromotions],
      () => apiClient.get<Promotion[]>('/menu/promotions')
    );
  },

  async createPromotion(data: Omit<Promotion, 'id'>): Promise<Promotion> {
    logAPI('POST', '/menu/promotions', data);
    return withMock(
      () => ({ ...data, id: `promo_${Date.now()}` }),
      () => apiClient.post<Promotion>('/menu/promotions', data)
    );
  },

  async updatePromotion(id: string, data: Partial<Omit<Promotion, 'id'>>): Promise<Promotion> {
    logAPI('PATCH', `/menu/promotions/${id}`, data);
    return withMock(
      () => {
        const found = mockPromotions.find(p => p.id === id);
        return { ...found!, ...data };
      },
      () => apiClient.patch<Promotion>(`/menu/promotions/${id}`, data)
    );
  },

  async deletePromotion(id: string): Promise<void> {
    logAPI('DELETE', `/menu/promotions/${id}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/promotions/${id}`)
    );
  },

  // ── Availabilities ──────────────────────────────────────────────────────────

  async getAvailabilities(): Promise<Availability[]> {
    logAPI('GET', '/menu/availabilities');
    return withMock(
      () => [...mockAvailabilities],
      () => apiClient.get<Availability[]>('/menu/availabilities')
    );
  },

  async createAvailability(data: Omit<Availability, 'id'>): Promise<Availability> {
    logAPI('POST', '/menu/availabilities', data);
    return withMock(
      () => ({ ...data, id: `avail_${Date.now()}` }),
      () => apiClient.post<Availability>('/menu/availabilities', data)
    );
  },

  async updateAvailability(id: string, data: Partial<Omit<Availability, 'id'>>): Promise<Availability> {
    logAPI('PATCH', `/menu/availabilities/${id}`, data);
    return withMock(
      () => {
        const found = mockAvailabilities.find(a => a.id === id);
        return { ...found!, ...data };
      },
      () => apiClient.patch<Availability>(`/menu/availabilities/${id}`, data)
    );
  },

  async deleteAvailability(id: string): Promise<void> {
    logAPI('DELETE', `/menu/availabilities/${id}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/availabilities/${id}`)
    );
  },
};
