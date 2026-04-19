import { apiClient, withMock, logAPI, WelloApiResponse } from '@/services/apiClient';
import { Promotion, Availability, DiscountResponse, DiscountScheduleResponse, DayOfWeek, TimeSlot } from '@/types/promotions';

// ─── Mapping Functions ────────────────────────────────────────────────────────

/**
 * Convert day of week number (0=Sunday, 1=Monday, ..., 6=Saturday) to DayOfWeek string
 */
function dayOfWeekNumberToString(dayNum: number): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNum] ?? 'monday';
}

/**
 * Convert DayOfWeek string to day of week number (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
function stringToDayOfWeekNumber(day: DayOfWeek): number {
  const mapping: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return mapping[day] ?? 1;
}

/**
 * Map API DiscountResponse to internal Promotion type
 */
function mapDiscountResponseToPromotion(discount: DiscountResponse): Promotion {
  // Extract time slots from schedules (handle undefined)
  const time_slots: TimeSlot[] = (discount.schedules ?? [])
    .filter(s => s.enabled)
    .map(s => ({
      day: dayOfWeekNumberToString(s.day_of_week),
      start_time: s.available_from,
      end_time: s.available_to,
    }));

  // Extract product IDs (handle undefined)
  const product_ids = (discount.products ?? [])
    .filter(p => p.enabled)
    .map(p => p.product_id);

  // Determine discount type from discount_unit
  const type = discount.discount_unit === 'PERCENTAGE' ? 'percentage' : 'fixed';

  return {
    id: discount.discount_id,
    name: discount.discount_name,
    description: discount.discount_desc,
    type,
    discount_unit: discount.discount_unit,
    value: discount.discount_value ?? 0,
    start_date: discount.valid_from,
    end_date: discount.valid_to,
    active: discount.enabled,
    time_slots: time_slots.length > 0 ? time_slots : undefined,
    product_ids: product_ids.length > 0 ? product_ids : undefined,
    order_type: discount.order_type,
    min_order_value: discount.min_order_value,
    min_order_unit: discount.min_order_unit,
    discounted_quantity: discount.discounted_quantity,
    is_cumulative: discount.is_cumulative,
    is_time_limited: discount.is_time_limited,
    available: discount.available,
    preferred_order: discount.preferred_order,
    creation_date: discount.creation_date,
    products: discount.products,
    schedules: discount.schedules,
  };
}

/**
 * Transform internal Promotion type to API payload format (Go struct CreateDiscountRequest)
 * Maps field names and converts types as needed
 */
function transformPromotionForAPI(promo: Omit<Promotion, 'id'> | Partial<Omit<Promotion, 'id'>>) {
  const payload: Record<string, unknown> = {};

  // Map simple fields with camelCase
  if (promo.name !== undefined) payload.discount_name = promo.name;
  if (promo.description !== undefined) payload.discount_desc = promo.description;
  if (promo.preferred_order !== undefined) payload.preferred_order = promo.preferred_order;
  if (promo.code !== undefined) payload.discount_code = promo.code || null;
  if (promo.order_type !== undefined) payload.order_type = promo.order_type || null;
  if (promo.value !== undefined) payload.discount_value = promo.value;
  if (promo.discount_unit !== undefined) payload.discount_unit = promo.discount_unit;
  if (promo.start_date !== undefined) payload.valid_from = promo.start_date;
  if (promo.end_date !== undefined) payload.valid_to = promo.end_date || null;
  if (promo.min_order_value !== undefined) payload.min_order_value = promo.min_order_value || null;
  if (promo.min_order_unit !== undefined) payload.min_order_unit = promo.min_order_unit || null;
  
  // Optional max discount fields (if they exist in Promotion type)
  const promoRecord = promo as Record<string, unknown>;
  if (promoRecord.max_discount_value !== undefined) {
    payload.max_discount_value = promoRecord.max_discount_value || null;
  }
  if (promoRecord.max_discount_unit !== undefined) {
    payload.max_discount_unit = promoRecord.max_discount_unit || null;
  }

  if (promo.discounted_quantity !== undefined) payload.discounted_quantity = promo.discounted_quantity;
  if (promo.is_cumulative !== undefined) payload.is_cumulative = promo.is_cumulative;
  if (promo.is_time_limited !== undefined) payload.is_time_limited = promo.is_time_limited;
  if (promo.available !== undefined) payload.available = promo.available;

  // Transform time_slots to schedules with day_of_week numbers
  if (promo.time_slots && promo.time_slots.length > 0) {
    payload.schedules = promo.time_slots.map(slot => {
      return {
        day_of_week: stringToDayOfWeekNumber(slot.day),
        available_from: slot.start_time, // HH:mm format
        available_to: slot.end_time,     // HH:mm format
      };
    });
  }

  // Combine product_ids and product_prices into products array
  if (promo.product_ids && promo.product_ids.length > 0) {
    payload.products = promo.product_ids.map(productId => {
      const newPrice = promo.product_prices?.[productId];
      return {
        product_id: productId,
        new_price: newPrice ? Math.round(newPrice) : null, // Convert to int64 (cents)
      };
    });
  }

  return payload;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockDiscountResponses: DiscountResponse[] = [
  {
    discount_id: '4',
    merchant_id: '2',
    discount_name: '2 pizzas pour 12€',
    discount_desc: 'Ajoutez 2 pizzas dans votre panier pour bénéficier de cette offre !',
    preferred_order: 0,
    order_type: 'IN TAKE_AWAY DELIVERY',
    discount_value: 1200, // 12€ in cents
    discount_unit: 'NEWPRICE',
    valid_from: '2026-04-19T11:42:20Z',
    valid_to: '2030-02-28T12:37:26Z',
    min_order_value: 2,
    min_order_unit: 'QTY',
    discounted_quantity: 2,
    is_cumulative: true,
    is_time_limited: false,
    available: true,
    enabled: true,
    creation_date: '2023-06-27T12:10:32Z',
    products: [
      { id: 29, discount_id: 4, product_id: '67', new_price: 600, enabled: true },
      { id: 30, discount_id: 4, product_id: '68', new_price: 600, enabled: true },
      { id: 31, discount_id: 4, product_id: '69', new_price: 600, enabled: true },
    ],
    schedules: [
      { schedule_id: 16, discount_id: 4, day_of_week: 1, available_from: '08:45', available_to: '13:00', enabled: true },
      { schedule_id: 17, discount_id: 4, day_of_week: 2, available_from: '08:45', available_to: '13:00', enabled: true },
      { schedule_id: 18, discount_id: 4, day_of_week: 3, available_from: '08:45', available_to: '13:00', enabled: true },
      { schedule_id: 19, discount_id: 4, day_of_week: 4, available_from: '08:45', available_to: '13:00', enabled: true },
      { schedule_id: 20, discount_id: 4, day_of_week: 5, available_from: '08:45', available_to: '13:00', enabled: true },
    ],
  },
  {
    discount_id: '11',
    merchant_id: '2',
    discount_name: 'La 3ème pizza à 50%',
    discount_desc: 'Commandez 2 pizzas et bénéficiez de 50% de réduction sur la 3ème',
    preferred_order: 6,
    order_type: 'TAKE_AWAY',
    discount_value: 50,
    discount_unit: 'PERCENTAGE',
    valid_from: '2026-04-17T08:21:02Z',
    valid_to: '2030-12-31T23:59:59Z',
    min_order_value: 1,
    min_order_unit: 'QTY',
    discounted_quantity: 1,
    is_cumulative: false,
    is_time_limited: false,
    available: true,
    enabled: true,
    creation_date: '2025-06-29T12:10:32Z',
    products: [
      { id: 303, discount_id: 11, product_id: '68', enabled: true },
    ],
    schedules: [],
  },
  {
    discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e',
    merchant_id: '2',
    discount_name: 'Happy Hour',
    discount_desc: 'zedsfgdf',
    preferred_order: 0,
    order_type: 'IN',
    discount_value: 25,
    discount_unit: 'PERCENTAGE',
    valid_from: '2026-04-23T00:00:00Z',
    valid_to: '2026-04-30T00:00:00Z',
    min_order_value: null,
    min_order_unit: 'EUR',
    discounted_quantity: 1,
    is_cumulative: true,
    is_time_limited: false,
    available: true,
    enabled: true,
    creation_date: '2026-04-19T13:44:28Z',
    products: [
      { id: 359, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '67', enabled: true },
      { id: 360, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '69', enabled: true },
      { id: 361, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '68', enabled: true },
      { id: 362, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '72', enabled: true },
      { id: 363, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '73', enabled: true },
      { id: 364, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, product_id: '74', enabled: true },
    ],
    schedules: [
      { schedule_id: '71' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 2, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '72' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 3, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '73' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 4, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '74' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 5, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '75' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 6, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '76' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 0, available_from: '19:00', available_to: '22:30', enabled: true },
      { schedule_id: '77' as unknown as number, discount_id: 'discount-55b12e18-7f29-46c0-af83-5ea68fc4009e' as unknown as number, day_of_week: 1, available_from: '19:00', available_to: '22:30', enabled: true },
    ],
  },
];

const mockPromotions: Promotion[] = mockDiscountResponses.map(mapDiscountResponseToPromotion);

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
    logAPI('GET', '/menu/discounts/all');
    return withMock(
      () => [...mockPromotions],
      async () => {
        const response = await apiClient.get<WelloApiResponse<DiscountResponse[]>>('/menu/discounts/all');
        return response.data.map(mapDiscountResponseToPromotion);
      }
    );
  },

  async createPromotion(data: Omit<Promotion, 'id'>): Promise<Promotion> {
    const payload = transformPromotionForAPI(data);
    logAPI('POST', '/menu/discounts', payload);
    return withMock(
      () => ({ ...data, id: `promo_${Date.now()}` }),
      () => apiClient.post<Promotion>('/menu/discounts', payload)
    );
  },

  async updatePromotion(id: string, data: Partial<Omit<Promotion, 'id'>>): Promise<Promotion> {
    const payload = transformPromotionForAPI(data);
    logAPI('PATCH', `/menu/discounts/${id}`, payload);
    return withMock(
      () => {
        const found = mockPromotions.find(p => p.id === id);
        return { ...found!, ...data };
      },
      () => apiClient.patch<Promotion>(`/menu/discounts/${id}`, payload)
    );
  },

  async deletePromotion(id: string): Promise<void> {
    logAPI('DELETE', `/menu/discounts/${id}`);
    return withMock(
      () => undefined,
      () => apiClient.delete<void>(`/menu/discounts/${id}`)
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
