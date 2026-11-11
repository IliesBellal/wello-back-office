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
import { cachedEmployees, cachedProducts, patchProductStatus, productStatus } from './catalog';
import { capitalize, deltaPct, formatEuros, formatNumber, hhmm } from './format';
import type { Block, DownloadGroup, DownloadItem } from './types';
import { financialReportsService } from '@/services/financialReportsService';
import { fiscalArchivesService } from '@/services/fiscalArchivesService';
import { payoutDocumentsService } from '@/services/payoutDocumentsService';
import { subscriptionInvoicesService } from '@/services/subscriptionInvoicesService';
import { exportRegistersPDF } from '@/services/cashRegisterHistoryService';
import { uuid } from '@/lib/assistant/tracking';
import { normalize } from '@/lib/assistant/normalize';
import { channelMeta } from '@/lib/assistant/channels';
import { toIsoDay, withFilters, type PageFilters } from '@/lib/pageFilters';
import { DEFAULT_ORDER_FILTER, type OrderFilterSelection } from '@/utils/orderFilters';

export interface ActionContext {
  /** Établissement de la session : les chiffres ne portent que sur lui. */
  merchantId?: string;
  /** « Le Bistrot » ou, si plusieurs établissements, « Le Bistrot · 12 rue X ». */
  merchantLabel?: string;
  /** Phrase d'origine (statut de commande demandé, type de document mis en avant). */
  query?: string;
  /** Droit détenu par l'utilisateur (documents réservés aux gérants). */
  can?: (permission: string) => boolean;
  /**
   * Mots de la phrase que l'intention n'explique pas, tels que tapés
   * (« Fiche client Dupont » → « Dupont ») : terme de recherche libre.
   */
  freeText?: string;
  /** Ouvre une page depuis un bouton de carte (mêmes règles de redirection). */
  openPage?: (path: string, label: string) => void;
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
  /** Page ouverte, pour le message « Vous êtes sur … » (mobile). */
  redirectLabel?: string;
}

export type ActionHandler = (intent: ModelIntent, slots: Record<string, EntityMatch>, ctx: ActionContext) => Promise<ExecResult>;

const b = <T extends Omit<Block, 'id'>>(block: T) => ({ id: uuid(), ...block }) as Block;

const periodOf = (slots: Record<string, EntityMatch>): DateRange | undefined => slots.period?.date;

/** Canal demandé → filtre canal × type de l'API (l'autre dimension reste « tout »). */
function channelFilter(slots: Record<string, EntityMatch>): { filter?: OrderFilterSelection; label?: string; url: PageFilters } {
  const meta = channelMeta(slots.channel?.record);
  if (!meta) return { url: {} };
  const filter: OrderFilterSelection = {
    sources: meta.field === 'sources' ? [meta.value] : DEFAULT_ORDER_FILTER.sources,
    orderTypes: meta.field === 'orderTypes' ? [meta.value] : DEFAULT_ORDER_FILTER.orderTypes,
  };
  return { filter, label: meta.label, url: meta.field === 'sources' ? { sources: [meta.value] } : { types: [meta.value] } };
}

/** Statut de commande demandé dans la phrase (historique des commandes). */
const ORDER_STATUS_WORDS: Array<[RegExp, string]> = [
  [/\bannul/, 'canceled'],
  [/\brefus/, 'denied'],
  [/\ben attente\b/, 'pending'],
  [/\btermin/, 'done'],
];

/** Statut de réservation demandé (« réservations en attente »). */
const BOOKING_STATUS_WORDS: Array<[RegExp, string]> = [
  [/\ben attente\b|\ba confirmer\b|\bnon confirmees?\b/, 'pending'],
  [/\bconfirmees?\b(?<!non confirmees?)/, 'confirmed'],
  [/\binstallees?\b|\bassis\b/, 'seated'],
  [/\brefusees?\b/, 'denied'],
  [/\bannulees?\b/, 'cancelled'],
];

/**
 * Adresse filtrée d'une page : période dite dans la phrase, canal, statut.
 * Sans précision, la page s'ouvre telle quelle.
 */
export function filteredPath(navId: string, base: string, slots: Record<string, EntityMatch>, query: string): string {
  const period = slots.period && slots.period.start >= 0 ? slots.period.date : undefined;
  const channel = channelMeta(slots.channel?.record);
  if (navId === 'dashboard-order-history') {
    // Paramètres propres à l'historique (useOrderHistorySearchParams).
    const p = new URLSearchParams();
    if (period) {
      p.set('startDate', period.from);
      p.set('endDate', period.to);
    }
    const q = normalize(query);
    const statuses = ORDER_STATUS_WORDS.filter(([re]) => re.test(q)).map(([, v]) => v);
    if (statuses.length) p.set('status', statuses.join(','));
    if (channel?.field === 'orderTypes') p.set('type', channel.value);
    if (channel?.field === 'sources') p.set('brand', channel.value === 'UBER_EATS' || channel.value === 'DELIVEROO' ? channel.value : 'WELLO_RESTO');
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  }
  const filters: PageFilters = {};
  if (period) {
    filters.from = period.from;
    filters.to = period.to;
  }
  const channelFilters: PageFilters = channel ? (channel.field === 'sources' ? { sources: [channel.value] } : { types: [channel.value] }) : {};
  if (navId === 'dashboard-analysis' && (period || channel)) {
    filters.tab = 'ca';
    Object.assign(filters, channelFilters);
  }
  if (navId === 'vat-declaration') Object.assign(filters, channelFilters);
  let path = withFilters(base, filters);
  const extra = new URLSearchParams();
  // Pointages d'un équipier : identifiant planning de l'équipier.
  if (navId === 'pointages' && slots.employee?.record) extra.set('employee', slots.employee.record.id);
  if (navId === 'reservations-list') {
    const q = normalize(query);
    const statuses = BOOKING_STATUS_WORDS.filter(([re]) => re.test(q)).map(([, v]) => v);
    if (statuses.length) extra.set('status', statuses.join(','));
    const party = q.match(/\b(\d{1,3}) (?:personnes?|pers|couverts?|convives?)\b/);
    if (party) extra.set('party', party[1]);
  }
  const qs = extra.toString();
  if (qs) path += (path.includes('?') ? '&' : '?') + qs;
  return path;
}

const subtitleOf = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ');

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


// ─── Documents ─────────────────────────────────────────────────────────────

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayOf = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const settled = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' ? r.value : fallback);

/** Groupe mis en avant selon la demande (« virements de mars » → virements d'abord). */
const DOC_FOCUS: Array<[RegExp, string]> = [
  [/\b(virement|versement|releve)/, 'payouts'],
  [/\b(facture|commission|abonnement|recapitulatif)/, 'invoices'],
  [/\b(rapport|comptab|export|tva|reglement|registre)/, 'reports'],
  [/\barchive/, 'archives'],
];

async function linkOf(p: Promise<{ download_url: string }>): Promise<string> {
  const link = await p;
  if (!link.download_url) throw new Error('Document indisponible.');
  return link.download_url;
}

const documentsList: ActionHandler = async (_intent, slots, ctx) => {
  const period = periodOf(slots)!;
  const inPeriod = (iso?: string) => {
    const d = dayOf(iso);
    return !!d && d >= period.from && d <= period.to;
  };
  const can = ctx.can ?? (() => true);

  const [payoutsR, commissionsR, subsR, archivesR] = await Promise.allSettled([
    payoutDocumentsService.list(),
    payoutDocumentsService.listCommissionInvoices(),
    can('settings.manage') ? subscriptionInvoicesService.list() : Promise.resolve([]),
    fiscalArchivesService.list(),
  ]);

  const item = (x: DownloadItem) => x;

  // Rapports générés à la demande sur la période.
  const reports: DownloadItem[] = [
    item({
      id: 'report-accounting',
      label: 'Rapport comptable',
      sublabel: 'Ventes, TVA, règlements',
      format: 'PDF',
      mode: 'link',
      generated: true,
      get: () => linkOf(financialReportsService.exportGlobal(period.from, period.to)),
    }),
    item({ id: 'report-vat', label: 'Rapport de TVA', format: 'PDF', mode: 'link', generated: true, get: () => linkOf(financialReportsService.exportVAT(period.from, period.to)) }),
    item({ id: 'report-payments', label: 'Rapport des règlements', format: 'PDF', mode: 'link', generated: true, get: () => linkOf(financialReportsService.exportPayments(period.from, period.to)) }),
    item({
      id: 'report-registers',
      label: 'Registres de caisse',
      sublabel: 'Un PDF par registre clôturé',
      format: 'ZIP',
      mode: 'file',
      generated: true,
      get: async () => {
        await exportRegistersPDF({ dateFrom: period.from, dateTo: period.to });
      },
    }),
  ];

  // Factures Wello Resto : commission mensuelle (+ récapitulatif), abonnement.
  const commissions = settled(commissionsR, []).filter((c) => inPeriod(c.period_month));
  const invoices: DownloadItem[] = [];
  commissions.forEach((c) => {
    const month = MONTH_FMT.format(new Date(c.period_month));
    if (c.has_invoice) {
      invoices.push(item({ id: `commission-${c.number}`, label: `Facture de commission ${c.number}`, sublabel: `${month} · ${formatEuros(c.amount_ttc, true)}`, format: 'PDF', mode: 'link', get: () => linkOf(payoutDocumentsService.getCommissionInvoiceLink(c.number, 'invoice')) }));
    }
    if (c.has_recap) {
      invoices.push(item({ id: `recap-${c.number}`, label: 'Récapitulatif des commissions', sublabel: month, format: 'PDF', mode: 'link', get: () => linkOf(payoutDocumentsService.getCommissionInvoiceLink(c.number, 'recap')) }));
    }
  });
  settled(subsR, [])
    .filter((inv) => inv.has_pdf && (inPeriod(inv.paid_at) || inPeriod(inv.period_start)))
    .forEach((inv) =>
      invoices.push(item({ id: `sub-${inv.invoice_id}`, label: `Facture d'abonnement ${inv.number}`, sublabel: `${DAY_FMT.format(new Date(inv.paid_at))} · ${formatEuros(inv.amount_paid, true)}`, format: 'PDF', mode: 'link', get: () => linkOf(subscriptionInvoicesService.getLink(inv.invoice_id)) })),
    );

  // Virements reçus : relevé (et facture de commission si elle n'est pas déjà listée).
  const listed = new Set(commissions.map((c) => c.number));
  const payouts: DownloadItem[] = [];
  settled(payoutsR, [])
    .filter((p) => inPeriod(p.arrival_date))
    .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date))
    .forEach((p) => {
      const when = `${DAY_FMT.format(new Date(p.arrival_date))} · ${formatEuros(p.amount, true)}`;
      if (p.has_statement) payouts.push(item({ id: `payout-${p.payout_id}`, label: 'Relevé de virement', sublabel: when, format: 'PDF', mode: 'link', get: () => linkOf(payoutDocumentsService.getLink(p, 'statement')) }));
      if (p.has_invoice && p.invoice_number && !listed.has(p.invoice_number)) {
        listed.add(p.invoice_number);
        payouts.push(item({ id: `payout-inv-${p.payout_id}`, label: `Facture de commission ${p.invoice_number}`, sublabel: when, format: 'PDF', mode: 'link', get: () => linkOf(payoutDocumentsService.getLink(p, 'invoice')) }));
      }
    });

  // Archive fiscale mensuelle (conformité caisse).
  const archives: DownloadItem[] = settled(archivesR, [])
    .filter((a) => a.kind === 'MONTH' && inPeriod(a.period_start))
    .map((a) => item({ id: `archive-${a.id}`, label: 'Archive fiscale', sublabel: MONTH_FMT.format(new Date(a.period_start)), format: 'ZIP', mode: 'link', get: () => linkOf(fiscalArchivesService.getLink(a.id)) }));

  const groups: DownloadGroup[] = [
    { id: 'reports', title: 'Rapports', items: reports },
    { id: 'invoices', title: 'Factures Wello Resto', items: invoices },
    { id: 'payouts', title: 'Virements', items: payouts },
    { id: 'archives', title: 'Archive fiscale', items: archives },
  ].filter((g) => g.items.length > 0);

  const q = normalize(ctx.query ?? '');
  const focus = DOC_FOCUS.filter(([re]) => re.test(q)).map(([, id]) => id);
  groups.sort((a, b) => {
    const ia = focus.indexOf(a.id);
    const ib = focus.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const missing = focus.filter((f) => !groups.some((g) => g.id === f));
  const NONE: Record<string, string> = {
    payouts: 'aucun virement',
    invoices: 'aucune facture',
    archives: "pas encore d'archive fiscale",
  };
  const absent = missing.map((m) => NONE[m]).filter(Boolean);
  return {
    outcome: 'info',
    blocks: [
      b({
        type: 'downloads',
        title: 'Documents',
        subtitle: subtitleOf(capitalize(period.label), ctx.merchantLabel),
        groups,
        note: absent.length ? `${capitalize(absent.join(', '))} sur cette période. Voici les autres documents disponibles.` : undefined,
      }),
    ],
  };
};

// ─── Fiches : commande, équipier, produit, client ──────────────────────────

const orderOpen: ActionHandler = async (_intent, slots, ctx) => {
  const wanted = String(slots.number?.quantity ?? slots.number?.text ?? '').replace(/^#/, '');
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  const res = await analyticsService.getOrderHistory(from, to, undefined, undefined, undefined, wanted, 1, 20);
  const historyLink = `/dashboard/order-history?${new URLSearchParams({ search: wanted, startDate: toIsoDay(from), endDate: toIsoDay(to) })}`;
  // Le numéro affiché (« #42098 ») ou l'identifiant ; la recherche est partielle.
  const exact = res.orders.filter((o) => o.number.replace(/^#/, '') === wanted || o.id === wanted);
  if (exact.length === 1) {
    const o = exact[0];
    const path = `/dashboard/order-history?${new URLSearchParams({ orderId: o.id, search: wanted, startDate: toIsoDay(from), endDate: toIsoDay(to) })}`;
    ctx.navigate(path);
    return {
      outcome: 'navigate',
      close: 'always',
      redirectLabel: `Commande ${o.number}`,
      blocks: [b({ type: 'text', tone: 'muted', text: `Voici la commande ${o.number} du ${o.date}${o.customer_name ? ` (${o.customer_name})` : ''}.` })],
    };
  }
  const list = exact.length ? exact : res.orders;
  if (!list.length) {
    return {
      outcome: 'info',
      blocks: [b({ type: 'text', text: `Je ne trouve pas de commande n° ${wanted} sur les 12 derniers mois.` })],
    };
  }
  return {
    outcome: 'info',
    blocks: [
      b({
        type: 'list',
        title: exact.length ? `${exact.length} commandes n° ${wanted}` : `Commandes contenant « ${wanted} »`,
        subtitle: 'Sur les 12 derniers mois',
        empty: '',
        items: list.slice(0, 8).map((o) => ({
          id: o.id,
          primary: `${o.number}${o.customer_name ? ` · ${o.customer_name}` : ''}`,
          secondary: `${o.date} ${o.time}`.trim(),
          trailing: formatEuros(Math.round(o.total * 100), true),
          action: {
            label: 'Ouvrir',
            run: () =>
              ctx.openPage?.(`/dashboard/order-history?${new URLSearchParams({ orderId: o.id, search: wanted, startDate: toIsoDay(from), endDate: toIsoDay(to) })}`, `Commande ${o.number}`),
          },
        })),
        link: { label: "Voir dans l'historique", path: historyLink },
      }),
    ],
  };
};

const staffOpen: ActionHandler = async (_intent, slots, ctx) => {
  const employee = slots.employee.record!;
  const userId = employee.meta?.user_id as string | undefined;
  // La fiche s'ouvre sur le compte de connexion ; sans compte, la liste de l'équipe.
  ctx.navigate(userId ? `/equipe/equipiers?${new URLSearchParams({ openMember: userId })}` : '/equipe/equipiers');
  return {
    outcome: 'navigate',
    close: 'always',
    redirectLabel: userId ? `Fiche de ${employee.name}` : 'Équipiers',
    blocks: [
      b({
        type: 'text',
        tone: 'muted',
        text: userId ? `Voici la fiche de ${employee.name}.` : `${employee.name} n'a pas de compte de connexion : voici la liste de l'équipe.`,
      }),
    ],
  };
};

const productOpen: ActionHandler = async (_intent, slots, ctx) => {
  const product = slots.product.record!;
  ctx.navigate(`/menu/products?${new URLSearchParams({ product: product.id })}`);
  return {
    outcome: 'navigate',
    close: 'always',
    redirectLabel: `Fiche ${product.name}`,
    blocks: [b({ type: 'text', tone: 'muted', text: `Voici la fiche de ${product.name}.` })],
  };
};

const customerSearch: ActionHandler = async (_intent, _slots, ctx) => {
  const term = (ctx.freeText ?? '').trim();
  if (!term) {
    ctx.navigate('/customers/list');
    return { outcome: 'navigate', close: 'mobile', redirectLabel: 'Liste clients', blocks: [b({ type: 'text', tone: 'muted', text: 'Voici la liste des clients.' })] };
  }
  // Fiche ouverte directement si la recherche ne donne qu'un client.
  ctx.navigate(`/customers/list?${new URLSearchParams({ search: term, open: '1' })}`);
  return {
    outcome: 'navigate',
    close: 'always',
    redirectLabel: `Clients · « ${term} »`,
    blocks: [b({ type: 'text', tone: 'muted', text: `Je cherche « ${term} » dans vos clients.` })],
  };
};

export const ACTIONS: Record<string, ActionHandler> = {
  'documents.list': documentsList,
  'order.open': orderOpen,
  'staff.open': staffOpen,
  'product.open': productOpen,
  'customer.search': customerSearch,

  async navigate(intent, slots, ctx) {
    const base = String(intent.params.path ?? '/');
    const path = filteredPath(String(intent.params.nav_id ?? ''), base, slots, ctx.query ?? '');
    ctx.navigate(path);
    const period = slots.period && slots.period.start >= 0 ? slots.period.date : undefined;
    return {
      outcome: 'navigate',
      close: 'mobile',
      redirectLabel: period ? `${intent.label} · ${period.label}` : intent.label,
      blocks: [
        b({
          type: 'text',
          tone: 'muted',
          text: period ? `Voici « ${intent.label} » pour ${period.label}.` : `Voici « ${intent.label} ».`,
        }),
      ],
    };
  },

  async 'product.set_availability'(intent, slots, ctx) {
    const product = slots.product.record!;
    const available = Boolean(intent.params.available);
    // Statut de vente réel, comme l'édition groupée du tableau produits :
    // « out_of_stock » (rupture) ou « available » (de nouveau en vente).
    const status = available ? 'available' : 'out_of_stock';
    await menuService.bulkUpdateProductsStatus([product.id], status);
    patchProductStatus(product.id, status);
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
      redirectLabel: 'Produits',
      blocks: [b({ type: 'text', tone: 'muted', text: opened ? 'Le formulaire de création est ouvert.' : 'Voici la carte : cliquez sur « Nouveau produit ».' })],
    };
  },

  async 'info.revenue'(_intent, slots, ctx) {
    const period = periodOf(slots)!;
    const channel = channelFilter(slots);
    const data = await analyticsService.getRevenueAnalytics(period.from, period.to, {
      merchantIds: ctx.merchantId ? [ctx.merchantId] : undefined,
      orderFilter: channel.filter,
    });
    const cur = data.current_period;
    const prev = data.previous_period;
    const basket = cur.order_count ? Math.round(cur.total_ttc_cents / cur.order_count) : 0;
    const prevBasket = prev?.order_count ? Math.round(prev.total_ttc_cents / prev.order_count) : 0;
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'metrics',
          title: channel.label ? `Chiffre d'affaires · ${channel.label}` : "Chiffre d'affaires",
          subtitle: subtitleOf(capitalize(period.label), ctx.merchantLabel),
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
          link: { label: "Voir l'analyse", path: withFilters('/dashboard/analysis', { tab: 'ca', from: period.from, to: period.to, ...channel.url }) },
        }),
      ],
    };
  },

  async 'info.top_products'(_intent, slots, ctx) {
    const period = periodOf(slots)!;
    const channel = channelFilter(slots);
    const data = await analyticsService.getProductsAnalytics(period.from, period.to, {
      sortBy: 'quantity',
      sortDir: 'desc',
      pageSize: 5,
      merchantIds: ctx.merchantId ? [ctx.merchantId] : undefined,
      orderFilter: channel.filter,
    });
    return {
      outcome: 'info',
      blocks: [
        b({
          type: 'list',
          title: channel.label ? `Meilleures ventes · ${channel.label}` : 'Meilleures ventes',
          subtitle: subtitleOf(capitalize(period.label), ctx.merchantLabel),
          empty: 'Aucune vente sur cette période.',
          items: data.rows.slice(0, 5).map((r, i) => ({
            id: r.product_id,
            primary: `${i + 1}. ${r.name}`,
            secondary: r.category_name || undefined,
            trailing: `${formatNumber(r.quantity_sold)} · ${formatEuros(r.revenue_ttc_cents)}`,
          })),
          link: { label: 'Analyse produits', path: withFilters('/dashboard/analysis', { tab: 'produits', from: period.from, to: period.to, ...channel.url }) },
        }),
      ],
    };
  },

  async 'info.out_of_stock_list'(_intent, _slots, ctx) {
    let products = cachedProducts();
    if (!products.length) {
      const list = await menuService.getProducts();
      products = list.map((p) => ({ type: 'product' as const, id: String(p.product_id), name: p.name, meta: { status: productStatus(p) } }));
    }
    const out = products.filter((p) => p.meta?.status === 'out_of_stock');
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
          link: { label: 'Toutes les réservations', path: withFilters('/reservations/list', { from: period.from, to: period.to }) },
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
