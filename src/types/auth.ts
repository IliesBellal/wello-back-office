export type AuthStatus = string;
export type AuthMFAStatus = 'pending' | 'verified' | string;

export interface AuthSessionMerchant {
  id: string;
  name: string;
  business_name: string;
  address?: string;
  city?: string;
  country?: string;
  zip_code?: string;
  lat?: number;
  lng?: number;
  logo_url?: string;
  token: string;
}

export interface UberEatsIntegration {
  store_id?: string | null;
  commission_rate?: number;
  closed_until?: number | null;
  delay_duration?: number;
  delay_until?: number | null;
  estimated_preparation_time?: string;
}

export interface UberDirectIntegration {
  customer_id?: string | null;
}

export interface DeliverooIntegration {
  location_id?: string | null;
  commission_rate?: number;
}

export interface AuthSessionData {
  enabled: boolean;
  token: string;
  merchant_id: string;
  mfa_status?: AuthMFAStatus;
  mfa_type?: string;
  merchants: AuthSessionMerchant[];
}

export interface AuthUser {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  tel: string;
  terms_of_use_accepted: boolean;
  pin_code: string;
  profile_picture: string;
}

export interface AuthMerchantSettings {
  delivery_fees?: number;
  delivery_fees_limit?: number;
  delivery_distance_limit?: number;
  manage_on_site?: boolean;
  manage_take_away?: boolean;
  manage_delivery?: boolean;
  kitchen_show_only_paid?: boolean;
  kitchen_distribution_mode?: string;
  production_display_mode?: string;
  pager_number_required?: boolean;
  service_required_for_ordering?: boolean;
  cash_register_required_for_ordering?: boolean;
  warning_new_order_not_paid?: boolean;
  disable_safety_stock?: boolean;
}

export interface AuthMerchant {
  id: string;
  name: string;
  business_name: string;
  tel: string;
  address: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  web_site?: string;
  currency?: string;
  is_open?: boolean;
  settings: AuthMerchantSettings;
}

export interface AuthAccess {
  admin: boolean;
  apps: Record<string, boolean>;
  permissions: Record<string, boolean>;
}

export interface AuthCapabilities {
  apps: {
    reception: boolean;
    delivery: boolean;
    waiter: boolean;
  };
  modules: {
    menu: boolean;
    planning: boolean;
    users: boolean;
    settings: boolean;
    haccp: boolean;
    reports: boolean;
    financials: boolean;
    customers: boolean;
    stock: boolean;
    hr: boolean;
    scannorder: boolean;
    bookings: boolean;
  };
  order_types: {
    on_site: boolean;
    take_away: boolean;
    delivery: boolean;
  };
  actions: {
    open_cash_drawer: boolean;
    print_merchant_cash_report: boolean;
    manage_menu: boolean;
    manage_plannings: boolean;
    manage_users: boolean;
    manage_settings: boolean;
    manage_haccp: boolean;
    view_reports: boolean;
    export_reports: boolean;
    view_financials: boolean;
    export_financials: boolean;
    manage_customers: boolean;
    export_customers: boolean;
  };
  integrations: {
    uber_eats: boolean;
    uber_direct: boolean;
    deliveroo: boolean;
    scannorder: boolean;
  };
}

export interface AuthIntegrations {
  uber_eats?: UberEatsIntegration | null;
  uber_direct?: UberDirectIntegration | null;
  deliveroo?: DeliverooIntegration | null;
}

export interface AuthData {
  status?: AuthStatus;
  enabled: boolean;
  session: AuthSessionData;
  user: AuthUser;
  merchant: AuthMerchant;
  access: AuthAccess;
  capabilities: AuthCapabilities;
  integrations: AuthIntegrations;
  SNOSettings?: {
    activated?: boolean;
  };
}

export type ModuleCapability = keyof AuthCapabilities['modules'];

/**
 * @deprecated Legacy flat auth payload kept only as a temporary parsing fallback.
 * Do not use these fields in application code. Use the normalized AuthData shape instead.
 */
export interface LegacyAuthFlatFields {
  userId?: string;
  user_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  user_mail?: string;
  email?: string;
  user_tel?: string;
  tel?: string;
  merchantId?: string;
  merchant_id?: string;
  merchantName?: string;
  business_name?: string;
  merchantTel?: string;
  merchant_tel?: string;
  merchantAd?: string;
  merchant_address?: string;
  merchant_lat?: number;
  merchant_lng?: number;
  timezone?: string;
  merchant_web_site?: string;
  currency?: string;
  is_open?: boolean;
  admin?: boolean;
  allow_waiter_account?: boolean;
  allow_delivery_account?: boolean;
  /** @deprecated Use capabilities.modules.scannorder instead. */
  scannorder_ready?: boolean;
  /** @deprecated Use capabilities.modules.stock instead. */
  stock_management?: boolean | number;
  hr_management?: boolean | number;
  open_cash_drawer?: boolean;
  print_merchant_cash_report?: boolean;
  manage_on_site?: boolean;
  manage_take_away?: boolean;
  manage_delivery?: boolean;
  kitchen_show_only_paid?: boolean;
  kitchen_distribution_mode?: string;
  production_display_mode?: string;
  pager_number_required?: boolean;
  service_required_for_ordering?: boolean;
  cash_register_required_for_ordering?: boolean;
  warning_new_order_not_paid?: boolean;
  safety_stock_active?: boolean;
  status?: AuthStatus;
  enabled?: boolean | string | number;
  mfa_status?: AuthMFAStatus;
  mfa_type?: string;
  token?: string;
  merchants?: unknown[];
  pin_code?: string;
  profile_picture?: string;
  terms_of_use_accepted?: boolean;
  integration_uber_eats?: UberEatsIntegration | null;
  integration_uber_direct?: UberDirectIntegration | null;
  integration_deliveroo?: DeliverooIntegration | null;
  SNOSettings?: { activated?: boolean };
}

export type RawAuthData = Partial<AuthData> & LegacyAuthFlatFields & {
  session?: Partial<AuthSessionData> & { merchants?: unknown[] };
  user?: Partial<AuthUser>;
  merchant?: Partial<AuthMerchant> & { settings?: Partial<AuthMerchantSettings> };
  access?: Partial<AuthAccess> & {
    apps?: Record<string, boolean>;
    permissions?: Record<string, boolean>;
  };
  capabilities?: Partial<AuthCapabilities> & {
    apps?: Partial<AuthCapabilities['apps']>;
    modules?: Partial<AuthCapabilities['modules']>;
    order_types?: Partial<AuthCapabilities['order_types']>;
    actions?: Partial<AuthCapabilities['actions']>;
    integrations?: Partial<AuthCapabilities['integrations']>;
  };
  integrations?: Partial<AuthIntegrations>;
};

export interface AuthResponse {
  id: string;
  data: AuthData;
}

export interface RawAuthResponse {
  id: string;
  data: RawAuthData;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no', ''].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeMerchantSummary = (merchant: unknown): AuthSessionMerchant => {
  const rawMerchant = asRecord(merchant);
  const id = asString(rawMerchant.id ?? rawMerchant.merchant_id);
  const businessName = asString(rawMerchant.business_name ?? rawMerchant.name ?? rawMerchant.FullName);
  const address = asOptionalString(rawMerchant.address ?? rawMerchant.Address);

  return {
    id,
    name: asString(rawMerchant.name ?? rawMerchant.business_name ?? rawMerchant.FullName),
    business_name: businessName,
    address,
    city: asOptionalString(rawMerchant.city ?? rawMerchant.City),
    country: asOptionalString(rawMerchant.country ?? rawMerchant.Country),
    zip_code: asOptionalString(rawMerchant.zip_code ?? rawMerchant.ZipCode),
    lat: asNumber(rawMerchant.lat ?? rawMerchant.Lat),
    lng: asNumber(rawMerchant.lng ?? rawMerchant.Lng),
    logo_url: asOptionalString(rawMerchant.logo_url),
    token: asString(rawMerchant.token),
  };
};

const normalizeBooleanMap = <T extends Record<string, boolean>>(
  source: Record<string, unknown>,
  keys: Array<keyof T>,
  fallback: Partial<T> = {}
): T => {
  return keys.reduce((acc, key) => {
    acc[key] = asBoolean(source[key as string], fallback[key] ?? false);
    return acc;
  }, {} as T);
};

export const normalizeAuthData = (rawData: RawAuthData | AuthData): AuthData => {
  const raw = asRecord(rawData) as RawAuthData;
  const rawSession = asRecord(raw.session);
  const rawUser = asRecord(raw.user);
  const rawMerchant = asRecord(raw.merchant);
  const rawMerchantSettings = asRecord(rawMerchant.settings);
  const rawAccess = asRecord(raw.access);
  const rawCapabilities = asRecord(raw.capabilities);
  const rawCapabilityApps = asRecord(rawCapabilities.apps);
  const rawCapabilityModules = asRecord(rawCapabilities.modules);
  const rawCapabilityOrderTypes = asRecord(rawCapabilities.order_types);
  const rawCapabilityActions = asRecord(rawCapabilities.actions);
  const rawCapabilityIntegrations = asRecord(rawCapabilities.integrations);
  const rawIntegrations = asRecord(raw.integrations);
  const rawSNOSettings = asRecord(raw.SNOSettings);

  const merchantsSource = Array.isArray(rawSession.merchants)
    ? rawSession.merchants
    : Array.isArray(raw.merchants)
      ? raw.merchants
      : [];

  const merchants = merchantsSource.map(normalizeMerchantSummary);
  const sessionMerchantId = asString(rawSession.merchant_id ?? raw.merchant_id ?? raw.merchantId);
  const activeMerchant = merchants.find((merchant) => merchant.id === sessionMerchantId);

  const capabilities = {
    apps: normalizeBooleanMap<AuthCapabilities['apps']>(rawCapabilityApps, ['reception', 'delivery', 'waiter'], {
      delivery: asBoolean(raw.allow_delivery_account),
      waiter: asBoolean(raw.allow_waiter_account),
    }),
    modules: normalizeBooleanMap<AuthCapabilities['modules']>(rawCapabilityModules, ['menu', 'planning', 'users', 'settings', 'haccp', 'reports', 'financials', 'customers', 'stock', 'hr', 'scannorder', 'bookings'], {
      planning: true,
      haccp: true,
      stock: asBoolean(raw.stock_management, true),
      hr: asBoolean(raw.hr_management),
      scannorder: asBoolean(raw.scannorder_ready ?? rawSNOSettings.activated, true),
      bookings: true,
    }),
    order_types: normalizeBooleanMap<AuthCapabilities['order_types']>(rawCapabilityOrderTypes, ['on_site', 'take_away', 'delivery'], {
      on_site: asBoolean(raw.manage_on_site),
      take_away: asBoolean(raw.manage_take_away),
      delivery: asBoolean(raw.manage_delivery),
    }),
    actions: normalizeBooleanMap<AuthCapabilities['actions']>(rawCapabilityActions, ['open_cash_drawer', 'print_merchant_cash_report', 'manage_menu', 'manage_plannings', 'manage_users', 'manage_settings', 'manage_haccp', 'view_reports', 'export_reports', 'view_financials', 'export_financials', 'manage_customers', 'export_customers'], {
      open_cash_drawer: asBoolean(raw.open_cash_drawer),
      print_merchant_cash_report: asBoolean(raw.print_merchant_cash_report),
    }),
    integrations: normalizeBooleanMap<AuthCapabilities['integrations']>(rawCapabilityIntegrations, ['uber_eats', 'uber_direct', 'deliveroo', 'scannorder'], {
      uber_eats: Boolean(asRecord(rawIntegrations.uber_eats).store_id ?? raw.integration_uber_eats?.store_id),
      uber_direct: Boolean(asRecord(rawIntegrations.uber_direct).customer_id ?? raw.integration_uber_direct?.customer_id),
      deliveroo: Boolean(asRecord(rawIntegrations.deliveroo).location_id ?? raw.integration_deliveroo?.location_id),
      scannorder: asBoolean(rawSNOSettings.activated ?? raw.scannorder_ready),
    }),
  };

  const integrations: AuthIntegrations = {
    uber_eats: (rawIntegrations.uber_eats as UberEatsIntegration | null | undefined) ?? raw.integration_uber_eats ?? null,
    uber_direct: (rawIntegrations.uber_direct as UberDirectIntegration | null | undefined) ?? raw.integration_uber_direct ?? null,
    deliveroo: (rawIntegrations.deliveroo as DeliverooIntegration | null | undefined) ?? raw.integration_deliveroo ?? null,
  };

  const session: AuthSessionData = {
    enabled: asBoolean(rawSession.enabled ?? raw.enabled, true),
    token: asString(rawSession.token ?? raw.token),
    merchant_id: sessionMerchantId,
    mfa_status: asOptionalString(rawSession.mfa_status ?? raw.mfa_status),
    mfa_type: asOptionalString(rawSession.mfa_type ?? raw.mfa_type),
    merchants,
  };

  return {
    status: asOptionalString(raw.status),
    enabled: asBoolean(raw.enabled ?? rawSession.enabled, true),
    session,
    user: {
      id: asString(rawUser.id ?? raw.userId ?? raw.user_id),
      name: asString(rawUser.name ?? raw.name),
      first_name: asString(rawUser.first_name ?? raw.first_name),
      last_name: asString(rawUser.last_name ?? raw.last_name),
      email: asString(rawUser.email ?? raw.user_mail ?? raw.email),
      tel: asString(rawUser.tel ?? raw.user_tel ?? raw.tel),
      terms_of_use_accepted: asBoolean(rawUser.terms_of_use_accepted ?? raw.terms_of_use_accepted),
      pin_code: asString(rawUser.pin_code ?? raw.pin_code),
      profile_picture: asString(rawUser.profile_picture ?? raw.profile_picture),
    },
    merchant: {
      id: asString(rawMerchant.id ?? raw.merchant_id ?? raw.merchantId ?? activeMerchant?.id),
      name: asString(rawMerchant.name ?? raw.merchantName ?? raw.business_name ?? activeMerchant?.business_name),
      business_name: asString(rawMerchant.business_name ?? raw.business_name ?? raw.merchantName ?? activeMerchant?.business_name),
      tel: asString(rawMerchant.tel ?? raw.merchantTel ?? raw.merchant_tel),
      address: asString(rawMerchant.address ?? raw.merchant_address ?? raw.merchantAd ?? activeMerchant?.address),
      lat: asNumber(rawMerchant.lat ?? raw.merchant_lat ?? activeMerchant?.lat),
      lng: asNumber(rawMerchant.lng ?? raw.merchant_lng ?? activeMerchant?.lng),
      timezone: asOptionalString(rawMerchant.timezone ?? raw.timezone),
      web_site: asOptionalString(rawMerchant.web_site ?? raw.merchant_web_site),
      currency: asOptionalString(rawMerchant.currency ?? raw.currency),
      is_open: typeof (rawMerchant.is_open ?? raw.is_open) === 'undefined'
        ? undefined
        : asBoolean(rawMerchant.is_open ?? raw.is_open),
      settings: {
        delivery_fees: asNumber(rawMerchantSettings.delivery_fees ?? raw.delivery_fees),
        delivery_fees_limit: asNumber(rawMerchantSettings.delivery_fees_limit ?? raw.delivery_fees_limit),
        delivery_distance_limit: asNumber(rawMerchantSettings.delivery_distance_limit ?? raw.delivery_distance_limit),
        manage_on_site: asBoolean(rawMerchantSettings.manage_on_site ?? raw.manage_on_site),
        manage_take_away: asBoolean(rawMerchantSettings.manage_take_away ?? raw.manage_take_away),
        manage_delivery: asBoolean(rawMerchantSettings.manage_delivery ?? raw.manage_delivery),
        kitchen_show_only_paid: asBoolean(rawMerchantSettings.kitchen_show_only_paid ?? raw.kitchen_show_only_paid),
        kitchen_distribution_mode: asOptionalString(rawMerchantSettings.kitchen_distribution_mode ?? raw.kitchen_distribution_mode),
        production_display_mode: asOptionalString(rawMerchantSettings.production_display_mode ?? raw.production_display_mode),
        pager_number_required: asBoolean(rawMerchantSettings.pager_number_required ?? raw.pager_number_required),
        service_required_for_ordering: asBoolean(rawMerchantSettings.service_required_for_ordering ?? raw.service_required_for_ordering),
        cash_register_required_for_ordering: asBoolean(rawMerchantSettings.cash_register_required_for_ordering ?? raw.cash_register_required_for_ordering),
        warning_new_order_not_paid: asBoolean(rawMerchantSettings.warning_new_order_not_paid ?? raw.warning_new_order_not_paid),
        disable_safety_stock: typeof (rawMerchantSettings.disable_safety_stock ?? raw.safety_stock_active) === 'undefined'
          ? undefined
          : asBoolean(rawMerchantSettings.disable_safety_stock, false) || !asBoolean(raw.safety_stock_active, true),
      },
    },
    access: {
      admin: asBoolean(rawAccess.admin ?? raw.admin),
      apps: Object.keys(rawAccess.apps ?? {}).reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = asBoolean(asRecord(rawAccess.apps)[key]);
        return acc;
      }, {}),
      permissions: Object.keys(rawAccess.permissions ?? {}).reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = asBoolean(asRecord(rawAccess.permissions)[key]);
        return acc;
      }, {}),
    },
    capabilities,
    integrations,
    SNOSettings: {
      activated: asBoolean(rawSNOSettings.activated),
    },
  };
};

export const normalizeAuthResponse = (response: RawAuthResponse | AuthResponse): AuthResponse => ({
  id: response.id,
  data: normalizeAuthData(response.data),
});

export const parseStoredAuthData = (serializedAuthData: string | null): AuthData | null => {
  if (!serializedAuthData) return null;

  try {
    return normalizeAuthData(JSON.parse(serializedAuthData) as RawAuthData);
  } catch {
    return null;
  }
};

export const getStoredAuthToken = (): string | null => {
  const authData = parseStoredAuthData(localStorage.getItem('authData'));
  return authData?.session.token || null;
};
