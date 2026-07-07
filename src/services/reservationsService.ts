import { apiClient, WelloApiResponse } from "@/services/apiClient";
import { unwrap, type ApiEnvelopeData } from "@/services/apiUnwrap";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "cancelled"
  | "denied"
  | string;

export type ReservationSource = "staff" | "web" | "telephone" | "site" | "google" | "walk-in" | string;

export interface Reservation {
  id: string;
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  phone: string;
  reservedAt: string;
  partySize: number;
  tableName: string;
  status: ReservationStatus;
  source: ReservationSource;
}

export interface ReservationListMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export type ReservationSortField = "guest_name" | "reserved_at" | "party_size" | "status" | "source";
export type ReservationSortDirection = "asc" | "desc";

interface ReservationSortOptions {
  sortField: ReservationSortField;
  sortDir: ReservationSortDirection;
}

export interface ReservationListFilters {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  partySize?: number;
  search?: string;
  source?: string;
  sortBy?: "booking_date_from" | "party_size" | "status" | "customer_name";
  sortDir?: ReservationSortDirection;
  page?: number;
  pageSize?: number;
}

interface ReservationListMetadataApi {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

export interface BookingListItemApi {
  booking_id: string;
  booking_number: string;
  status: string;
  source: string;
  booking_date_from: string;
  party_size: number;
  customer_name: string;
  customer_tel: string;
  assigned_tables: string[];
}

export interface BookingLocation {
  booking_id: string;
  location_id: string;
  location_name: string;
  location_desc: string;
}

export interface BookingCustomer {
  customer_id?: string;
  customer_name: string;
  customer_tel?: string;
  customer_email?: string;
  customer_nb_orders?: number;
  customer_nb_bookings?: number;
}

export interface BookingDetail {
  booking_id: string;
  booking_number: string;
  status: string;
  sequence_number?: number;
  booking_date_from?: number;
  booking_date_to?: number;
  party_size: number;
  creation_date?: number;
  created_by?: string;
  comment?: string | null;
  start_date: string;
  end_date: string;
  locations: BookingLocation[];
  customer: BookingCustomer;
}

export interface BookingSettings {
  enabled: boolean;
  code: string;
  auto_accept_reserve_bookings: boolean;
  slot_interval_minutes: number;
  default_booking_duration: number;
  reserve_maximum_party_size: number;
  reserve_minimum_party_size: number;
  last_booking_offset_minutes: number;
  min_booking_notice_minutes: number;
  max_booking_horizon_days: number;
  overbooking_percent: number;
  cancelable_by_customer: boolean;
  cancel_booking_limit_offset_hours: number;
  pending_expiration_hours: number;
  duration_rules: BookingDurationRule[];
  capacity_warning: boolean;
  physical_capacity: number;
}

export interface PutBookingSettingsRequest {
  enabled: boolean;
  code: string;
  auto_accept_reserve_bookings: boolean;
  slot_interval_minutes: number;
  default_booking_duration: number;
  reserve_maximum_party_size: number;
  reserve_minimum_party_size: number;
  last_booking_offset_minutes: number;
  min_booking_notice_minutes: number;
  max_booking_horizon_days: number;
  overbooking_percent: number;
  cancelable_by_customer: boolean;
  cancel_booking_limit_offset_hours: number;
  pending_expiration_hours: number;
}

export interface BookingDurationRule {
  rule_id: string;
  min_party_size: number;
  max_party_size: number;
  duration_minutes: number;
  enabled: boolean;
}

export interface CreateDurationRuleRequest {
  min_party_size: number;
  max_party_size: number;
  duration_minutes: number;
}

export interface PatchDurationRuleRequest {
  min_party_size?: number;
  max_party_size?: number;
  duration_minutes?: number;
}

export interface BookingHour {
  id: string;
  day_of_week_from: number;
  day_of_week_to: number;
  hour_from: string;
  hour_to: string;
  booking_capacity?: number;
  first_booking_time?: string;
  last_booking_time?: string;
  valid_from?: string;
  valid_to?: string;
  enabled: boolean;
}

export interface BookingHourPatch {
  id?: string;
  day_of_week_from: number;
  day_of_week_to: number;
  hour_from: string;
  hour_to: string;
  booking_capacity?: number;
  first_booking_time?: string;
  last_booking_time?: string;
  valid_from?: string;
  valid_to?: string;
  enabled?: boolean;
}

export interface DenyBookingRequest {
  deletion_reason_id?: string;
}

export interface DeletionReason {
  deletion_reason_id: string;
  deletion_reason_type?: string | null;
  deletion_reason_object: string;
  deletion_reason_desc: string;
  label: string;
  requires_comment: boolean;
}

export interface AssignBookingLocationsRequest {
  locations: BookingLocation[];
}

export interface BookingAvailability {
  status: string;
  merchant?: Record<string, unknown>;
  locations: Array<Record<string, unknown>>;
  time_ranges: Array<Record<string, unknown>>;
  booking_slots: Array<Record<string, unknown>>;
  occupation_by_slot: Record<string, number>;
  requested_date: string;
  day_of_week: number;
}

export interface ReservationSettings {
  autoConfirmOnline: boolean;
  sendSmsReminders: boolean;
  sendEmailReminders: boolean;
  enableWaitlist: boolean;
  allowWalkInsOnFullService: boolean;
  collectDeposit: boolean;
  bookingWindowDays: number;
  maxPartySize: number;
  defaultDurationMinutes: number;
  slotIntervalMinutes: number;
  reminderLeadHours: number;
  depositAmount: number;
  welcomeNote: string;
}

export interface ReservationServiceWindow {
  id: string;
  label: string;
  firstBookingTime: string;
  lastBookingTime: string;
  maxCovers: number;
  channel: "all" | "online" | "manual";
  enabled: boolean;
}

export interface ReservationArea {
  id: string;
  name: string;
  capacity: number;
  turnDurationMinutes: number;
  enabled: boolean;
}

const BOOKINGS_BASE = "/bookings";

const mapSortFieldToApi = (field: ReservationSortField): ReservationListFilters["sortBy"] => {
  if (field === "guest_name") return "customer_name";
  if (field === "reserved_at") return "booking_date_from";
  return field;
};

const toQuery = (filters: ReservationListFilters = {}): string => {
  const params = new URLSearchParams();

  if (filters.status && filters.status.length > 0) {
    filters.status.forEach((status) => params.append("status", status));
  }

  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (typeof filters.partySize === "number") params.set("party_size", String(filters.partySize));
  if (filters.search) params.set("search", filters.search);
  if (filters.source) params.set("source", filters.source);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortDir) params.set("sort_dir", filters.sortDir);
  if (typeof filters.page === "number") params.set("page", String(filters.page));
  if (typeof filters.pageSize === "number") params.set("page_size", String(filters.pageSize));

  const query = params.toString();
  return query ? `?${query}` : "";
};

const unwrapBookingsData = <T extends Record<string, unknown>>(
  response: WelloApiResponse<Record<string, unknown>>,
): T => {
  const rawData = response.data ?? {};
  const normalizedStatus = rawData.status === "1" ? "success" : rawData.status;

  return unwrap<T & ApiEnvelopeData>({
    ...response,
    data: {
      ...rawData,
      status: normalizedStatus,
    } as ApiEnvelopeData,
  }) as T;
};

const mapMetadata = (metadata?: Partial<ReservationListMetadataApi>): ReservationListMetadata => ({
  totalItems: metadata?.total_items ?? 0,
  totalPages: metadata?.total_pages ?? 1,
  currentPage: metadata?.current_page ?? 1,
  limit: metadata?.limit ?? 20,
});

const mapListItemToReservation = (item: BookingListItemApi): Reservation => ({
  id: item.booking_id,
  bookingId: item.booking_id,
  bookingNumber: item.booking_number,
  guestName: item.customer_name,
  phone: item.customer_tel,
  reservedAt: item.booking_date_from,
  partySize: item.party_size,
  tableName: item.assigned_tables.join(", "),
  status: item.status,
  source: item.source,
});

export const getReservationsList = async (
  page: number = 1,
  limit: number = 10,
  sort?: ReservationSortOptions,
): Promise<{ data: Reservation[]; metadata: ReservationListMetadata }> => {
  const filters: ReservationListFilters = {
    page,
    pageSize: limit,
    sortBy: sort ? mapSortFieldToApi(sort.sortField) : "booking_date_from",
    sortDir: sort?.sortDir ?? "desc",
  };

  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${toQuery(filters)}`);
  const data = unwrapBookingsData<{ bookings?: BookingListItemApi[]; metadata?: ReservationListMetadataApi }>(response);

  const rows = Array.isArray(data.bookings) ? data.bookings.map(mapListItemToReservation) : [];
  return {
    data: rows,
    metadata: mapMetadata(data.metadata),
  };
};

export const listBookings = async (
  filters: ReservationListFilters,
): Promise<{ data: BookingListItemApi[]; metadata: ReservationListMetadata }> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${toQuery(filters)}`);
  const data = unwrapBookingsData<{ bookings?: BookingListItemApi[]; metadata?: ReservationListMetadataApi }>(response);
  return {
    data: Array.isArray(data.bookings) ? data.bookings : [],
    metadata: mapMetadata(data.metadata),
  };
};

export const searchReservations = async (
  term: string,
  sort?: ReservationSortOptions,
): Promise<Reservation[]> => {
  const response = await listBookings({
    search: term,
    page: 1,
    pageSize: 100,
    sortBy: sort ? mapSortFieldToApi(sort.sortField) : "booking_date_from",
    sortDir: sort?.sortDir ?? "desc",
  });

  return response.data.map(mapListItemToReservation);
};

export const getBookingById = async (bookingId: string): Promise<BookingDetail> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${bookingId}`);
  const data = unwrapBookingsData<{ booking: BookingDetail }>(response);
  return data.booking;
};

export const acceptBooking = async (bookingId: string): Promise<BookingDetail> => {
  const response = await apiClient.patch<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${bookingId}/accept`);
  const data = unwrapBookingsData<{ booking: BookingDetail }>(response);
  return data.booking;
};

export const denyBooking = async (bookingId: string, payload: DenyBookingRequest = {}): Promise<BookingDetail> => {
  const response = await apiClient.patch<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${bookingId}/deny`, payload);
  const data = unwrapBookingsData<{ booking: BookingDetail }>(response);
  return data.booking;
};

export const assignBookingLocations = async (
  bookingId: string,
  payload: AssignBookingLocationsRequest,
): Promise<BookingDetail> => {
  const response = await apiClient.patch<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/${bookingId}/locations`, payload);
  const data = unwrapBookingsData<{ booking: BookingDetail }>(response);
  return data.booking;
};

export const getBookingSettings = async (): Promise<BookingSettings> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings`);
  const data = unwrapBookingsData<{ settings: BookingSettings }>(response);
  return data.settings;
};

export const putBookingSettings = async (payload: PutBookingSettingsRequest): Promise<BookingSettings> => {
  const response = await apiClient.put<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings`, payload);
  const data = unwrapBookingsData<{ settings: BookingSettings }>(response);
  return data.settings;
};

export const listBookingDurationRules = async (): Promise<BookingDurationRule[]> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/duration-rules`);
  const data = unwrapBookingsData<{ rules?: BookingDurationRule[] }>(response);
  return Array.isArray(data.rules) ? data.rules : [];
};

export const createBookingDurationRule = async (payload: CreateDurationRuleRequest): Promise<BookingDurationRule> => {
  const response = await apiClient.post<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/duration-rules`, payload);
  const data = unwrapBookingsData<{ rule: BookingDurationRule }>(response);
  return data.rule;
};

export const patchBookingDurationRule = async (
  ruleId: string,
  payload: PatchDurationRuleRequest,
): Promise<BookingDurationRule> => {
  const response = await apiClient.patch<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/duration-rules/${ruleId}`, payload);
  const data = unwrapBookingsData<{ rule: BookingDurationRule }>(response);
  return data.rule;
};

export const deleteBookingDurationRule = async (ruleId: string): Promise<void> => {
  await apiClient.delete<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/duration-rules/${ruleId}`);
};

export const getBookingHours = async (): Promise<BookingHour[]> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/hours`);
  const data = unwrapBookingsData<{ hours?: BookingHour[] }>(response);
  return Array.isArray(data.hours) ? data.hours : [];
};

export const putBookingHours = async (hours: BookingHourPatch[]): Promise<BookingHour[]> => {
  const response = await apiClient.put<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/settings/hours`, { hours });
  const data = unwrapBookingsData<{ hours?: BookingHour[] }>(response);
  return Array.isArray(data.hours) ? data.hours : [];
};

export const getBookingAvailability = async (date: string): Promise<BookingAvailability> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>(`${BOOKINGS_BASE}/availability/${date}`);
  const data = unwrapBookingsData<{ data: BookingAvailability }>(response);
  return data.data;
};

export const getDeletionReasonsForBookings = async (): Promise<DeletionReason[]> => {
  const response = await apiClient.get<WelloApiResponse<Record<string, unknown>>>("/pos/deletion_reasons/bookings");
  const data = unwrapBookingsData<{ deletions_reasons?: DeletionReason[] }>(response);
  return Array.isArray(data.deletions_reasons) ? data.deletions_reasons : [];
};

const fromBookingSettingsToLegacy = (settings: BookingSettings): ReservationSettings => ({
  autoConfirmOnline: settings.auto_accept_reserve_bookings,
  sendSmsReminders: false,
  sendEmailReminders: true,
  enableWaitlist: false,
  allowWalkInsOnFullService: settings.overbooking_percent > 0,
  collectDeposit: false,
  bookingWindowDays: settings.max_booking_horizon_days,
  maxPartySize: settings.reserve_maximum_party_size,
  defaultDurationMinutes: settings.default_booking_duration,
  slotIntervalMinutes: settings.slot_interval_minutes,
  reminderLeadHours: settings.pending_expiration_hours,
  depositAmount: 0,
  welcomeNote: "",
});

export const getReservationSettings = async (): Promise<ReservationSettings> => {
  const settings = await getBookingSettings();
  return fromBookingSettingsToLegacy(settings);
};

export const updateReservationSettings = async (
  nextSettings: ReservationSettings,
): Promise<ReservationSettings> => {
  const current = await getBookingSettings();

  const payload: PutBookingSettingsRequest = {
    enabled: current.enabled,
    code: current.code,
    auto_accept_reserve_bookings: nextSettings.autoConfirmOnline,
    slot_interval_minutes: nextSettings.slotIntervalMinutes,
    default_booking_duration: nextSettings.defaultDurationMinutes,
    reserve_maximum_party_size: nextSettings.maxPartySize,
    reserve_minimum_party_size: current.reserve_minimum_party_size,
    last_booking_offset_minutes: current.last_booking_offset_minutes,
    min_booking_notice_minutes: current.min_booking_notice_minutes,
    max_booking_horizon_days: nextSettings.bookingWindowDays,
    overbooking_percent: current.overbooking_percent,
    cancelable_by_customer: current.cancelable_by_customer,
    cancel_booking_limit_offset_hours: current.cancel_booking_limit_offset_hours,
    pending_expiration_hours: Math.max(1, nextSettings.reminderLeadHours),
  };

  const updated = await putBookingSettings(payload);
  return fromBookingSettingsToLegacy(updated);
};

export const getReservationServiceWindows = async (): Promise<ReservationServiceWindow[]> => {
  const hours = await getBookingHours();

  return hours.map((hour) => ({
    id: hour.id,
    label: `Jour ${hour.day_of_week_from}`,
    firstBookingTime: hour.first_booking_time ?? hour.hour_from,
    lastBookingTime: hour.last_booking_time ?? hour.hour_to,
    maxCovers: hour.booking_capacity ?? 0,
    channel: "all",
    enabled: hour.enabled,
  }));
};

export const getReservationAreas = async (): Promise<ReservationArea[]> => {
  return [];
};