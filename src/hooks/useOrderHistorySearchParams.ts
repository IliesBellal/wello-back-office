import { subDays } from 'date-fns';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const formatLocalDatePart = (value: number): string => {
  return String(value).padStart(2, '0');
};

const parseLocalDateString = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parsePositiveInt = (value: string | null, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseDateParam = (value: string | null, fallback: Date): Date => {
  if (!value) {
    return fallback;
  }

  const localDate = parseLocalDateString(value);
  if (localDate) {
    return localDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
};

const serializeDate = (date: Date): string => {
  return `${date.getFullYear()}-${formatLocalDatePart(date.getMonth() + 1)}-${formatLocalDatePart(date.getDate())}`;
};

const parseListParam = (value: string | null, fallback: string[] = []): string[] => {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : fallback;
};

const serializeListParam = (values: string[]): string | null => {
  const items = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return items.length > 0 ? items.join(',') : null;
};

interface OrderHistoryUrlState {
  page: number;
  limit: number;
  startDate: Date;
  endDate: Date;
  brands: string[];
  orderTypes: string[];
  statuses: string[];
  search: string;
  orderId: string | null;
}

interface OrderHistoryFiltersInput {
  startDate: Date;
  endDate: Date;
  brands: string[];
  orderTypes: string[];
  statuses: string[];
  search: string;
}

interface UseOrderHistorySearchParamsResult extends OrderHistoryUrlState {
  setPage: (nextPage: number) => void;
  handlePageChange: (nextPage: number) => void;
  setLimit: (nextLimit: number) => void;
  setDateRange: (from: Date, to: Date) => void;
  setBrands: (brands: string[]) => void;
  setOrderTypes: (orderTypes: string[]) => void;
  setStatuses: (statuses: string[]) => void;
  setSearch: (search: string) => void;
  setOrderId: (orderId: string) => void;
  clearOrderId: () => void;
  applyFilters: (filters: OrderHistoryFiltersInput) => void;
}

export const useOrderHistorySearchParams = (): UseOrderHistorySearchParamsResult => {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaults = useMemo(
    () => ({
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    }),
    []
  );

  const state: OrderHistoryUrlState = {
    page: parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE),
    limit: parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT),
    startDate: parseDateParam(searchParams.get('startDate'), defaults.startDate),
    endDate: parseDateParam(searchParams.get('endDate'), defaults.endDate),
    brands: parseListParam(searchParams.get('brand'), parseListParam(searchParams.get('channel'))),
    orderTypes: parseListParam(searchParams.get('type'), parseListParam(searchParams.get('orderType'))),
    statuses: parseListParam(searchParams.get('status')),
    search: searchParams.get('search') || '',
    orderId: searchParams.get('orderId'),
  };

  const updateParams = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  };

  const setPage = (nextPage: number) => {
    updateParams({ page: Math.max(1, nextPage) });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const setLimit = (nextLimit: number) => {
    updateParams({
      limit: Math.max(1, nextLimit),
      page: DEFAULT_PAGE,
    });
  };

  const setDateRange = (from: Date, to: Date) => {
    updateParams({
      startDate: serializeDate(from),
      endDate: serializeDate(to),
      page: DEFAULT_PAGE,
    });
  };

  const setBrands = (brands: string[]) => {
    updateParams({
      brand: serializeListParam(brands),
      channel: null,
      page: DEFAULT_PAGE,
    });
  };

  const setOrderTypes = (orderTypes: string[]) => {
    updateParams({
      type: serializeListParam(orderTypes),
      orderType: null,
      page: DEFAULT_PAGE,
    });
  };

  const setStatuses = (statuses: string[]) => {
    updateParams({ status: serializeListParam(statuses), page: DEFAULT_PAGE });
  };

  const setSearch = (search: string) => {
    updateParams({ search: search.trim() ? search : null, page: DEFAULT_PAGE });
  };

  const setOrderId = (orderId: string) => {
    updateParams({ orderId: orderId.trim() || null });
  };

  const clearOrderId = () => {
    updateParams({ orderId: null });
  };

  const applyFilters = (filters: OrderHistoryFiltersInput) => {
    updateParams({
      startDate: serializeDate(filters.startDate),
      endDate: serializeDate(filters.endDate),
      brand: serializeListParam(filters.brands),
      channel: null,
      type: serializeListParam(filters.orderTypes),
      orderType: null,
      status: serializeListParam(filters.statuses),
      search: filters.search.trim() ? filters.search : null,
      page: DEFAULT_PAGE,
    });
  };

  return {
    ...state,
    setPage,
    handlePageChange,
    setLimit,
    setDateRange,
    setBrands,
    setOrderTypes,
    setStatuses,
    setSearch,
    setOrderId,
    clearOrderId,
    applyFilters,
  };
};
