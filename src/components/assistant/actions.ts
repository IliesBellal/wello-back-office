/**
 * Gestionnaires d'actions : intention comprise → résultat concret.
 *
 * Chaque intention du modèle porte un identifiant `action` ; le POS ou la
 * borne fourniront leurs propres gestionnaires pour les mêmes identifiants
 * (ou pour les leurs), le moteur restant identique. Toutes les écritures
 * passent par les services habituels : mêmes droits, mêmes validations
 * serveur que l'interface classique.
 */
import type { QueryClient } from '@tanstack/react-query';
import { DAYPART_MINUTES } from '@/lib/assistant/dates';
import type { DateRange, EntityMatch, EntityRecord, ModelIntent } from '@/lib/assistant/types';
import { analyticsService } from '@/services/analyticsService';
import { menuService } from '@/services/menuService';
import { listBookings } from '@/services/reservationsService';
import { planningWeeksApi } from '@/services/welloApi';
import { cachedEmployees, cachedProducts, patchProductAvailability } from './catalog';
import { capitalize, deltaPct, formatEuros, formatNumber, hhmm } from './format';
import type { Block } from './types';
import { uuid } from '@/lib/assistant/tracking';

export interface ActionContext {
  navigate: (path: string) => void;
  logout: () => void;
  openCreateProduct: () => boolean;
  queryClient: QueryClient;
  /** Relance une intention avec ses slots (bouton « Remettre en vente » d'une liste). */
  runIntent: (key: string, slots: Record<string, EntityRecord>) => void;
}

export interface ExecResult {
  outcome: 'action' | 'info' | 'navigate';
  blocks: Block[];
  /**
   * Refermer l'assistant pour laisser voir la page : 'mobile' (plein écran)
   * ou 'always' (un panneau latéral s'ouvre et le panneau le masquerait).
   */
  close?: 'mobile' | 'always';
}

export type ActionHandler = (intent: ModelIntent, slots: Record<string, EntityMatch>, ctx: ActionContext) => Promise<ExecResult>;

const b = <T extends Omit<Block, 'id'>>(block: T) => ({ id: uuid(), ...block }) as Block;

const periodOf = (slots: Record<string, EntityMatch>): DateRange | undefined => slots.period?.date;

const DAYPART_NAME: Record<NonNullable<DateRange['daypart']>, string> = {
  morning: 'le matin',
  lunch: 'le midi',
  afternoon: "l'après-midi",
  evening: 'le soir',
  night: 'la nuit',
};

function minutesOf(time: string): number {
  const [h, m] = hhmm(time).split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Le créneau [start, end[ chevauche-t-il le moment de la journée demandé ? */
function overlapsDaypart(start: string, end: string, daypart: NonNullable<DateRange['daypart']>): boolean {
  const [ds, de] = DAYPART_MINUTES[daypart];
  let s = minutesOf(start);
  let e = minutesOf(end);
  if (e <= s) e += 24 * 60; // service qui finit après minuit
  if (daypart === 'night' && s < 6 * 60) s += 24 * 60;
  return s < de && e > ds;
}

/** Une heure d'arrivée tombe-t-elle dans le créneau ? */
function inDaypart(time: string, daypart: NonNullable<DateRange['daypart']>): boolean {
  const [ds, de] = DAYPART_MINUTES[daypart];
  let m = minutesOf(time);
  if (daypart === 'night' && m < 6 * 60) m += 24 * 60;
  return m >= ds && m < de;
}

export const ACTIONS: Record<string, ActionHandler> = {
  async navigate(intent, _slots, ctx) {
    const path = String(intent.params.path ?? '/');
    ctx.navigate(path);
    return { outcome: 'navigate', close: 'mobile', blocks: [b({ type: 'text', text: `C'est parti pour « ${intent.label} ».`, tone: 'muted' })] };
  },

  async 'product.set_availability'(intent, slots, ctx) {
    const product = slots.product.record!;
    const available = Boolean(intent.params.available);
    await menuService.updateProductAvailability(product.id, available);
    patchProductAvailability(product.id, available);
    void ctx.queryClient.invalidateQueries({ queryKey: ['menu'] });
    return {
      outcome: 'action',
      blocks: [
        b({
          type: 'text',
          tone: 'success',
          text: available ? `${product.name} est de nouveau en vente.` : `${product.name} est en rupture. Il n'est plus proposé à la vente.`,
        }),
      ],
    };
  },

  async 'product.create'(_intent, _slots, ctx) {
    ctx.navigate('/menu/products');
    const opened = ctx.openCreateProduct();
    return {
      outcome: 'navigate',
      close: 'always',
      blocks: [b({ type: 'text', tone: 'muted', text: opened ? 'Le formulaire de création est ouvert.' : 'Voici la carte : cliquez sur « Nouveau produit ».' })],
    };
  },

  async 'info.revenue'(_intent, slots) {
    const period = periodOf(slots)!;
    const data = await analyticsService.getRevenueAnalytics(period.from, period.to);
    const cur = data.current_period;
    const prev = data.previous_period;
    const basket = cur.order_count ? Math.round(cur.total_ttc_cents / cur.order_count) : 0;
    const prevBasket = prev?.order_count ? Math.round(prev.total_ttc_cents / prev.order_count) : 0;
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'metrics',
          title: "Chiffre d'affaires",
          subtitle: capitalize(period.label),
          items: [
            { label: 'CA TTC', value: formatEuros(cur.total_ttc_cents), delta: prev ? deltaPct(cur.total_ttc_cents, prev.total_ttc_cents) : null },
            { label: 'Commandes', value: formatNumber(cur.order_count), delta: prev ? deltaPct(cur.order_count, prev.order_count) : null },
            { label: 'Panier moyen', value: formatEuros(basket, true), delta: prevBasket ? deltaPct(basket, prevBasket) : null },
          ],
          note: period.daypart
            ? `Chiffres de la journée entière : le détail par service est dans l'analyse.`
            : prev
              ? 'Comparé à la période précédente.'
              : undefined,
          link: { label: "Voir l'analyse", path: '/dashboard/analysis' },
        }),
      ],
    };
  },

  async 'info.top_products'(_intent, slots) {
    const period = periodOf(slots)!;
    const data = await analyticsService.getProductsAnalytics(period.from, period.to, { sortBy: 'quantity', sortDir: 'desc', pageSize: 5 });
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'list',
          title: 'Meilleures ventes',
          subtitle: capitalize(period.label),
          empty: 'Aucune vente sur cette période.',
          items: data.rows.slice(0, 5).map((r, i) => ({
            id: r.product_id,
            primary: `${i + 1}. ${r.name}`,
            secondary: r.category_name || undefined,
            trailing: `${formatNumber(r.quantity_sold)} · ${formatEuros(r.revenue_ttc_cents)}`,
          })),
          link: { label: 'Analyse produits', path: '/dashboard/analysis' },
        }),
      ],
    };
  },

  async 'info.out_of_stock_list'(_intent, _slots, ctx) {
    let products = cachedProducts();
    if (!products.length) {
      const list = await menuService.getProducts();
      products = list.map((p) => ({ type: 'product' as const, id: String(p.product_id), name: p.name, meta: { available: p.available !== false } }));
    }
    const out = products.filter((p) => p.meta?.available === false);
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'list',
          title: 'Produits en rupture',
          subtitle: out.length ? `${out.length} produit${out.length > 1 ? 's' : ''}` : undefined,
          empty: 'Aucun produit en rupture. Tout est en vente.',
          items: out.slice(0, 12).map((p) => ({
            id: p.id,
            primary: p.name,
            action: { label: 'Remettre en vente', run: () => ctx.runIntent('menu.product.back_in_stock', { product: p }) },
          })),
          link: out.length > 12 ? { label: 'Toute la carte', path: '/menu/products' } : undefined,
        }),
      ],
    };
  },

  async 'info.staff_on_shift'(_intent, slots) {
    const period = periodOf(slots)!;
    const shifts = await planningWeeksApi.getShiftsByRange(period.from, period.to);
    const names = new Map(cachedEmployees().map((e) => [e.id, e.name]));
    const relevant = shifts
      .filter((s) => s.employee_id && s.status !== 'cancelled')
      .filter((s) => !period.daypart || overlapsDaypart(s.start_time, s.end_time, period.daypart))
      .sort((a, c) => a.shift_date.localeCompare(c.shift_date) || a.start_time.localeCompare(c.start_time));
    // « Aujourd'hui » + créneau courant par défaut : on précise lequel.
    const subtitle =
      period.daypart && !/(matin|midi|soir|nuit)/.test(period.label)
        ? `${capitalize(period.label)}, ${DAYPART_NAME[period.daypart]}`
        : capitalize(period.label);
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'list',
          title: relevant.length ? `${relevant.length} personne${relevant.length > 1 ? 's' : ''} au planning` : 'Personne au planning',
          subtitle,
          empty: 'Aucun service planifié sur ce créneau.',
          items: relevant.map((s) => ({
            id: s.id,
            primary: names.get(s.employee_id!) ?? 'Équipier',
            secondary: s.position ?? undefined,
            trailing: `${period.grain === 'day' ? '' : `${new Date(s.shift_date).toLocaleDateString('fr-FR', { weekday: 'short' })} `}${hhmm(s.start_time)}–${hhmm(s.end_time)}`,
          })),
          link: { label: 'Ouvrir le planning', path: '/equipe/planning' },
        }),
      ],
    };
  },

  async 'info.bookings'(_intent, slots) {
    const period = periodOf(slots)!;
    const { data } = await listBookings({ dateFrom: period.from, dateTo: period.to, pageSize: 100, sortBy: 'booking_date_from', sortDir: 'asc' });
    const active = data
      .filter((r) => !['cancelled', 'denied', 'refused', 'no_show'].includes(String(r.status).toLowerCase()))
      .filter((r) => !period.daypart || inDaypart(hhmm(r.booking_date_from), period.daypart));
    const covers = active.reduce((sum, r) => sum + (r.party_size || 0), 0);
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'metrics',
          title: 'Réservations',
          subtitle: capitalize(period.label),
          items: [
            { label: 'Réservations', value: formatNumber(active.length) },
            { label: 'Couverts', value: formatNumber(covers) },
          ],
        }),
        b({
          type: 'list',
          title: 'Détail',
          empty: 'Aucune réservation sur ce créneau.',
          items: active.slice(0, 10).map((r) => ({
            id: r.booking_id,
            primary: r.customer_name || 'Client',
            secondary: r.assigned_tables?.length ? `Table ${r.assigned_tables.join(', ')}` : undefined,
            trailing: `${period.grain === 'day' ? '' : `${new Date(r.booking_date_from).toLocaleDateString('fr-FR', { weekday: 'short' })} `}${hhmm(r.booking_date_from)} · ${r.party_size} pers.`,
          })),
          link: { label: 'Toutes les réservations', path: '/reservations/list' },
        }),
      ],
    };
  },

  async 'system.help'() {
    return { outcome: 'info', blocks: [b({ type: 'capabilities' })] };
  },

  async 'system.logout'(_intent, _slots, ctx) {
    ctx.logout();
    return { outcome: 'action', blocks: [b({ type: 'text', tone: 'muted', text: 'À bientôt !' })] };
  },
};

/** Libellés de la carte de confirmation. */
export function confirmationFor(intent: ModelIntent, slots: Record<string, EntityMatch>) {
  const product = slots.product?.record;
  switch (intent.action) {
    case 'product.set_availability':
      return intent.params.available
        ? { title: `Remettre ${product?.name} en vente ?`, description: 'Il sera de nouveau proposé sur tous vos canaux.', confirmLabel: 'Remettre en vente' }
        : {
            title: `Passer ${product?.name} en rupture ?`,
            description: "Il ne sera plus proposé à la vente jusqu'à ce que vous le remettiez.",
            confirmLabel: 'Marquer en rupture',
            destructive: true,
          };
    case 'system.logout':
      return { title: 'Se déconnecter ?', confirmLabel: 'Se déconnecter', destructive: true };
    default:
      return { title: `${intent.label} ?`, confirmLabel: 'Confirmer' };
  }
}

/** Titre court d'une suggestion (« Marquer une rupture · Tiramisu »). */
export function suggestionLabel(intent: ModelIntent, slots: Record<string, EntityMatch>): { label: string; sublabel?: string } {
  const entity = Object.values(slots).find((s) => s.record)?.record;
  const date = Object.values(slots).find((s) => s.date && s.start >= 0)?.date;
  return { label: intent.label, sublabel: entity?.name ?? (date ? capitalize(date.label) : undefined) };
}
