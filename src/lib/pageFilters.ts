/**
 * Filtres de page portés par l'URL (?from=2026-01-01&to=2026-01-31&tab=ca
 * &sources=KIOSK&types=TAKE_AWAY) : un lien (assistant, notification, favori)
 * ouvre une page déjà filtrée. Lu par la page Analyse et les registres de caisse.
 */
import { DEFAULT_ORDER_FILTER, type OrderFilterSelection } from '@/utils/orderFilters';

export interface PageFilters {
  /** AAAA-MM-JJ, inclus. */
  from?: string;
  to?: string;
  tab?: string;
  sources?: string[];
  types?: string[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function filtersToSearch(f: PageFilters): string {
  const p = new URLSearchParams();
  if (f.tab) p.set('tab', f.tab);
  if (f.from && ISO_DAY.test(f.from)) p.set('from', f.from);
  if (f.to && ISO_DAY.test(f.to)) p.set('to', f.to);
  if (f.sources?.length) p.set('sources', f.sources.join(','));
  if (f.types?.length) p.set('types', f.types.join(','));
  const q = p.toString();
  return q ? `?${q}` : '';
}

export function withFilters(path: string, f: PageFilters): string {
  return `${path}${filtersToSearch(f)}`;
}

/** Date locale à minuit (pas d'UTC : « 2026-01-31 » reste le 31 janvier). */
function parseDay(v: string | null): Date | null {
  if (!v || !ISO_DAY.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readDateRange(params: URLSearchParams): { from: Date; to: Date } | null {
  const from = parseDay(params.get('from'));
  const to = parseDay(params.get('to'));
  if (!from || !to || from > to) return null;
  return { from, to };
}

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Filtre canal × type : la dimension absente reste « tout ». */
export function readOrderFilter(params: URLSearchParams): OrderFilterSelection | null {
  const sources = list(params.get('sources')).filter((s) => DEFAULT_ORDER_FILTER.sources.includes(s));
  const types = list(params.get('types')).filter((t) => DEFAULT_ORDER_FILTER.orderTypes.includes(t));
  if (!sources.length && !types.length) return null;
  return {
    sources: sources.length ? sources : DEFAULT_ORDER_FILTER.sources,
    orderTypes: types.length ? types : DEFAULT_ORDER_FILTER.orderTypes,
  };
}
