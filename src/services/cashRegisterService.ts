import { apiClient, withMock, logAPI } from '@/services/apiClient';
import { toUTCDateString } from '@/utils/apiDate';

// ============= Types =============
export interface CashRegister {
  id: string;
  cash_desk_name: string;
  start_date: string;
  closed: boolean;
  enclosed: boolean;
  cash_fund: number;
}

export interface SummaryItem {
  mop_code: string;
  label: string;
  amount: number;
}

export interface CustomItem {
  id: string;
  label: string;
  value: number;
  mop_code?: string;
}

export interface ServerSummary {
  user_id: string;
  user_name?: string;
  items: SummaryItem[];
}

export interface CashRegisterSummary {
  cash_fund: number;
  final_cash_fund?: number;
  items: SummaryItem[];
  custom_items: CustomItem[];
  enclosed: boolean;
  enclose_comment?: string;
  users_summary?: ServerSummary[];
}

export interface TvaDetailItem {
  tva_rate: number;
  tva_title: string;
  ttc_sum: number;
  ht_sum: number;
  tva_sum: number;
}

export interface TvaDetails {
  delivery_type_label: string;
  items: TvaDetailItem[];
}

interface ApiEnvelope<T> {
  id: string;
  data: T;
}

interface ApiUserRef {
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface ApiPaymentItem {
  amount: number;
  mop: string;
  enabled?: number | boolean;
  collected_by?: ApiUserRef;
}

interface ApiSummaryItem {
  item_id?: string;
  mop?: string;
  mop_code?: string;
  label?: string;
  amount?: number;
}

interface ApiCustomItem {
  item_id?: string;
  custom_item_id?: string;
  id?: string;
  mop?: string;
  mop_code?: string;
  label?: string;
  value?: number;
  amount?: number;
}

interface ApiCashRegisterSummaryPayload {
  cash_register_id?: string;
  cash_fund?: number;
  final_cash_fund?: number;
  enclosed?: number | boolean;
  closure_comment?: string;
  enclose_comment?: string;
  items?: ApiSummaryItem[];
  custom_items?: ApiCustomItem[] | null;
  payments?: ApiPaymentItem[];
}

type SummaryApiShape =
  | CashRegisterSummary
  | {
      cash_register_summary?: Partial<CashRegisterSummary>;
      summary?: Partial<CashRegisterSummary>;
      cash_register?: ApiCashRegisterSummaryPayload;
      users_summary?: ServerSummary[];
      items_by_user?: ServerSummary[];
      server_details?: ServerSummary[];
      status?: string;
    };

// ============= Mock Data =============
const mockRegisters: CashRegister[] = [
  {
    id: 'cr1',
    cash_desk_name: 'Caisse Principale',
    start_date: new Date().toISOString(),
    closed: false,
    enclosed: false,
    cash_fund: 15000,
  },
  {
    id: 'cr2',
    cash_desk_name: 'Caisse Terrasse',
    start_date: new Date(Date.now() - 3600000).toISOString(),
    closed: true,
    enclosed: false,
    cash_fund: 10000,
  },
  {
    id: 'cr3',
    cash_desk_name: 'Caisse Principale',
    start_date: new Date(Date.now() - 86400000).toISOString(),
    closed: true,
    enclosed: true,
    cash_fund: 15000,
  },
];

const mockSummary: CashRegisterSummary = {
  cash_fund: 15000,
  final_cash_fund: 31900,
  items: [
    { mop_code: 'CB', label: 'Carte Bancaire', amount: 20750 },
    { mop_code: 'CASH', label: 'Espèces', amount: 11650 },
    { mop_code: 'TR', label: 'Ticket Restaurant', amount: 4500 },
  ],
  custom_items: [
    { id: 'ci1', label: 'Espèces', value: 11500, mop_code: 'CASH' },
    { id: 'ci2', label: 'Carte Bancaire', value: 20750, mop_code: 'CB' },
  ],
  enclosed: false,
  users_summary: [
    {
      user_id: 'u1',
      user_name: 'Jean Dupont',
      items: [
        { mop_code: 'CB', label: 'Carte Bancaire', amount: 10500 },
        { mop_code: 'CASH', label: 'Espèces', amount: 5600 },
      ],
    },
    {
      user_id: 'u2',
      user_name: 'Sarah Martin',
      items: [
        { mop_code: 'CB', label: 'Carte Bancaire', amount: 10250 },
        { mop_code: 'TR', label: 'Ticket Restaurant', amount: 4500 },
        { mop_code: 'CASH', label: 'Espèces', amount: 6050 },
      ],
    },
  ],
};

const mockTvaDetails: TvaDetails[] = [
  {
    delivery_type_label: 'Sur Place',
    items: [
      { tva_rate: 10, tva_title: 'TVA 10%', ttc_sum: 18500, ht_sum: 16818, tva_sum: 1682 },
      { tva_rate: 20, tva_title: 'TVA 20%', ttc_sum: 8200, ht_sum: 6833, tva_sum: 1367 },
    ],
  },
  {
    delivery_type_label: 'Emporter',
    items: [
      { tva_rate: 5.5, tva_title: 'TVA 5.5%', ttc_sum: 5500, ht_sum: 5213, tva_sum: 287 },
      { tva_rate: 10, tva_title: 'TVA 10%', ttc_sum: 4700, ht_sum: 4273, tva_sum: 427 },
    ],
  },
];

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
};

const normalizeMopCode = (value: string | undefined): string => {
  const raw = (value ?? '').toUpperCase();
  if (raw === 'ES' || raw === 'CASH') return 'CASH';
  if (raw === 'CB') return 'CB';
  if (raw === 'TR') return 'TR';
  if (raw === 'CHEQUE' || raw === 'CHQ') return 'CHEQUE';
  return raw || 'OTHER';
};

const normalizeSummaryItems = (items: ApiSummaryItem[] | SummaryItem[] | undefined): SummaryItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const source = item as ApiSummaryItem;
    const code = normalizeMopCode(source.mop_code ?? source.mop);
    const labelByCode: Record<string, string> = {
      CB: 'Carte Bancaire',
      CASH: 'Espèces',
      TR: 'Ticket Resto',
      CHEQUE: 'Chèque',
    };

    return {
      mop_code: code,
      label: source.label ?? labelByCode[code] ?? code,
      amount: Number(source.amount ?? 0),
    };
  });
};

const normalizeCustomItems = (items: ApiCustomItem[] | CustomItem[] | null | undefined): CustomItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const source = item as ApiCustomItem;
    return {
      id: String(source.id ?? source.custom_item_id ?? source.item_id ?? `custom_${index}`),
      label: source.label ?? 'Montant réel',
      value: Number(source.value ?? source.amount ?? 0),
      mop_code: normalizeMopCode(source.mop_code ?? source.mop),
    };
  });
};

const buildUsersSummaryFromPayments = (
  payments: ApiPaymentItem[] | undefined,
  fallbackItems: SummaryItem[]
): ServerSummary[] => {
  if (!Array.isArray(payments)) return [];

  const labelByCode = new Map<string, string>(fallbackItems.map((item) => [item.mop_code, item.label]));
  const usersMap = new Map<string, { user_name?: string; itemsMap: Map<string, number> }>();

  payments.forEach((payment) => {
    if (!toBool(payment.enabled ?? true)) return;

    const mopCode = normalizeMopCode(payment.mop);
    const userId = payment.collected_by?.user_id ? String(payment.collected_by.user_id) : '__unknown__';
    const fullName = `${payment.collected_by?.first_name ?? ''} ${payment.collected_by?.last_name ?? ''}`.trim();

    if (!usersMap.has(userId)) {
      usersMap.set(userId, {
        user_name: fullName || undefined,
        itemsMap: new Map<string, number>(),
      });
    }

    const userEntry = usersMap.get(userId);
    if (!userEntry) return;

    userEntry.itemsMap.set(
      mopCode,
      (userEntry.itemsMap.get(mopCode) ?? 0) + Number(payment.amount ?? 0)
    );

    if (!userEntry.user_name && fullName) {
      userEntry.user_name = fullName;
    }
  });

  return Array.from(usersMap.entries()).map(([userId, userData]) => ({
    user_id: userId,
    user_name: userData.user_name,
    items: Array.from(userData.itemsMap.entries()).map(([mopCode, amount]) => ({
      mop_code: mopCode,
      label: labelByCode.get(mopCode) ?? mopCode,
      amount,
    })),
  }));
};

const normalizeSummary = (payload: SummaryApiShape): CashRegisterSummary => {
  const root = payload as Record<string, unknown>;
  const nested = (root.cash_register_summary ?? root.summary) as Partial<CashRegisterSummary> | undefined;
  const cashRegister = root.cash_register as ApiCashRegisterSummaryPayload | undefined;
  const source = (cashRegister ?? nested ?? payload) as Partial<CashRegisterSummary> &
    ApiCashRegisterSummaryPayload;

  const normalizedItems = normalizeSummaryItems(source.items as ApiSummaryItem[] | SummaryItem[] | undefined);
  const normalizedCustomItems = normalizeCustomItems(
    source.custom_items as ApiCustomItem[] | CustomItem[] | null | undefined
  );

  const usersSummaryFromPayload =
    source.users_summary ??
    (root.users_summary as ServerSummary[] | undefined) ??
    (root.items_by_user as ServerSummary[] | undefined) ??
    (root.server_details as ServerSummary[] | undefined);

  const usersSummary = Array.isArray(usersSummaryFromPayload)
    ? usersSummaryFromPayload
    : buildUsersSummaryFromPayments(source.payments, normalizedItems);

  return {
    cash_fund: Number(source.cash_fund ?? 0),
    final_cash_fund:
      source.final_cash_fund !== undefined ? Number(source.final_cash_fund) : undefined,
    items: normalizedItems,
    custom_items: normalizedCustomItems,
    enclosed: toBool(source.enclosed),
    enclose_comment: source.enclose_comment ?? source.closure_comment,
    users_summary: Array.isArray(usersSummary) ? usersSummary : [],
  };
};

// ============= API Functions =============
export const getCashRegisterHistory = (date: Date | string) => {
  const utcDate = toUTCDateString(date);
  logAPI('GET', `/cash_register/history/${utcDate}`);
  return withMock(
    () => [...mockRegisters],
    () => apiClient.get<CashRegister[]>(`/cash_register/history/${utcDate}`)
  );
};

export const closeCashRegister = (id: string) => {
  logAPI('PATCH', `/cash_register/${id}/close`);
  return withMock(
    () => ({ status: 'ok' as string, error: undefined as string | undefined }),
    () => apiClient.patch<{ status: string; error?: string }>(`/cash_register/${id}/close`)
  );
};

export const getCashRegisterSummary = (id: string) => {
  logAPI('GET', `/cash_register/${id}/summary`);
  return withMock(
    () => ({
      ...mockSummary,
      enclosed: mockRegisters.find((r) => r.id === id)?.enclosed || false,
    }),
    async () => {
      const response = await apiClient.get<ApiEnvelope<SummaryApiShape> | SummaryApiShape>(
        `/cash_register/${id}/summary`
      );
      const payload =
        response && typeof response === 'object' && 'data' in response
          ? (response as ApiEnvelope<SummaryApiShape>).data
          : (response as SummaryApiShape);
      return normalizeSummary(payload);
    }
  );
};

export const getCashRegisterTvaDetails = (id: string) => {
  logAPI('GET', `/cash_register/${id}/tva_details`);
  return withMock(
    () => [...mockTvaDetails],
    () => apiClient.get<TvaDetails[]>(`/cash_register/${id}/tva_details`)
  );
};

export const addCustomItem = (
  registerId: string,
  payload: { label: string; value: number; mop_code?: string }
) => {
  logAPI('POST', `/cash_register/${registerId}/custom_items`, payload);
  return withMock(
    () => ({ id: `ci${Date.now()}`, ...payload }),
    async () => {
      const response = await apiClient.post<
        | ApiEnvelope<CustomItem>
        | ApiEnvelope<{ status?: string; data1?: string }>
        | CustomItem
        | { status?: string; data1?: string }
      >(
        `/cash_register/${registerId}/custom_items`,
        payload
      );

      if (response && typeof response === 'object' && 'data' in response) {
        const wrappedData = (response as ApiEnvelope<unknown>).data;

        if (wrappedData && typeof wrappedData === 'object' && 'data1' in (wrappedData as Record<string, unknown>)) {
          const data1 = (wrappedData as { data1?: string }).data1;
          return {
            id: String(data1 ?? `ci${Date.now()}`),
            label: payload.label,
            value: payload.value,
            mop_code: payload.mop_code,
          } as CustomItem;
        }

        return wrappedData as CustomItem;
      }

      if (response && typeof response === 'object' && 'data1' in response) {
        const data1 = (response as { data1?: string }).data1;
        return {
          id: String(data1 ?? `ci${Date.now()}`),
          label: payload.label,
          value: payload.value,
          mop_code: payload.mop_code,
        } as CustomItem;
      }

      return response as CustomItem;
    }
  );
};

export const deleteCustomItem = (registerId: string, itemId: string) => {
  logAPI('DELETE', `/cash_register/${registerId}/custom_items/${itemId}`);
  return withMock(
    () => undefined,
    async () => {
      try {
        await apiClient.delete<void>(`/cash_register/${registerId}/custom_items/${itemId}`);
      } catch {
        // Backward compatibility for environments still exposing the singular route.
        await apiClient.delete<void>(`/cash_register/${registerId}/custom_items/${itemId}`);
      }
    }
  );
};

export const encloseCashRegister = (id: string, payload: { comment?: string }) => {
  logAPI('PATCH', `/cash_register/${id}/enclose`, payload);
  return withMock(
    () => ({ status: 'ok' as string, error: undefined as string | undefined }),
    () => apiClient.patch<{ status: string; error?: string }>(`/cash_register/${id}/enclose`, payload)
  );
};
