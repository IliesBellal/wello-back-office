export type DiscountType = 'percentage' | 'fixed';

export interface TimeSlot {
  day: DayOfWeek;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: DiscountType;
  /** Percentage (0-100) or amount in cents for 'fixed' */
  value: number;
  code?: string;
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  no_end_date?: boolean; // If true, end_date is ignored
  active: boolean;
  time_slots?: TimeSlot[]; // Restricted time slots for application
  product_ids?: string[]; // Product IDs eligible for this promotion
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
