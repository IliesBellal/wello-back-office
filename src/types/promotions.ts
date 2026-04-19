export type DiscountType = 'percentage' | 'fixed';
export type DiscountUnit = 'NEWPRICE' | 'PERCENTAGE' | 'CURRENCY';
export type OrderType = 'IN' | 'TAKE_AWAY' | 'DELIVERY' | string;
export type MinOrderUnit = 'QTY' | string;

export interface TimeSlot {
  day: DayOfWeek;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface DiscountProductResponse {
  id: number;
  discount_id: number;
  product_id: string;
  new_price?: number; // In cents for NEWPRICE unit
  enabled: boolean;
}

export interface DiscountScheduleResponse {
  schedule_id: number;
  discount_id: number;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  available_from: string; // HH:mm format
  available_to: string; // HH:mm format
  enabled: boolean;
}

export interface DiscountResponse {
  discount_id: string;
  merchant_id: string;
  discount_name: string;
  discount_desc: string;
  preferred_order: number;
  order_type: OrderType; // "IN TAKE_AWAY DELIVERY" or individual
  discount_value: number | null;
  discount_unit: DiscountUnit;
  valid_from: string; // ISO 8601
  valid_to: string; // ISO 8601
  min_order_value: number;
  min_order_unit: MinOrderUnit;
  discounted_quantity: number;
  is_cumulative: boolean;
  is_time_limited: boolean;
  available: boolean;
  enabled: boolean;
  creation_date: string; // ISO 8601
  products?: DiscountProductResponse[];
  schedules?: DiscountScheduleResponse[];
}

// ─── Internal Promotion Type (mapped from API) ─────────────────────────────────

export interface Promotion {
  id: string; // Maps to discount_id
  name: string; // Maps to discount_name
  description?: string; // Maps to discount_desc
  type: DiscountType; // Derived from discount_unit
  discount_unit?: DiscountUnit; // PERCENTAGE, CURRENCY, or NEWPRICE
  /** Percentage (0-100) or amount in cents for 'fixed' */
  value: number; // Maps to discount_value
  code?: string; // Internal, not from API
  start_date?: string; // ISO date string - maps to valid_from
  end_date?: string; // ISO date string - maps to valid_to
  no_end_date?: boolean; // If true, end_date is ignored
  active: boolean; // Maps to enabled
  time_slots?: TimeSlot[]; // Mapped from schedules
  product_ids?: string[]; // Extracted from products array
  product_prices?: Record<string, number>; // Maps product_id to price in cents for NEWPRICE
  // Additional fields from API response
  order_type?: OrderType;
  min_order_value?: number;
  min_order_unit?: MinOrderUnit;
  max_discount_value?: number; // Optional max discount cap
  max_discount_unit?: string; // Optional max discount unit
  discounted_quantity?: number;
  is_cumulative?: boolean;
  is_time_limited?: boolean;
  available?: boolean;
  preferred_order?: number;
  creation_date?: string;
  // Raw API response data for detailed view
  products?: DiscountProductResponse[];
  schedules?: DiscountScheduleResponse[];
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface Availability {
  id: string;
  name: string;
  days: DayOfWeek[];
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  active: boolean;
  product_ids?: string[]; // Product IDs eligible for this availability
}
