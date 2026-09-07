import { apiClient, withMock, WelloApiResponse } from './apiClient';
import type { Order } from './ordersService';
import { toLocalDateString } from '../utils/apiDate';
import {
  mapBrandFilterForApi,
  mapOrderTypeFilterForApi,
  resolveOrderHistoryBrand,
  resolveOrderHistoryType,
} from '../utils/orderHistory';

export interface DateRange {
  from: Date;
  to: Date;
}

// Mirrors internal/modules/analytics.AccessibleMerchant/AccessibleMerchantsResponse
// (ib-welloresto-api repo) — GET /analytics/merchants, PROMPT 24 Phase 1.
// Names every establishment where the caller holds pos.analytics, backing
// the global multi-establishment selector (PROMPT 24 Phase 3).
export interface AccessibleMerchant {
  merchant_id: string;
  name: string;
}

export interface AccessibleMerchantsResponse {
  merchants: AccessibleMerchant[];
}

// ComparisonMode drives both the selector's mode toggle and the group_by
// value sent to the 5 comparable endpoints (Revenue/Orders/Payments/VAT/
// Cancellations) — 'cumule' -> group_by "none", 'compare' -> "merchant".
export type ComparisonMode = 'cumule' | 'compare';

// AnalyticsScopeOptions is threaded into the 5 comparable tabs' service
// calls. groupBy is only meaningful with 2+ merchantIds — a single
// establishment always renders as "none" regardless of mode (PROMPT 24
// Phase 3: "le sélecteur de mode n'a de sens qu'au-delà d'un établissement").
export interface AnalyticsScopeOptions {
  merchantIds?: string[];
  groupBy?: ComparisonMode;
}

const scopeToRequestFields = (options?: AnalyticsScopeOptions) => ({
  merchant_ids: options?.merchantIds && options.merchantIds.length > 0 ? options.merchantIds : undefined,
  group_by: options?.groupBy === 'compare' && (options?.merchantIds?.length ?? 0) > 1 ? 'merchant' : undefined,
});

// Shapes below mirror internal/modules/analytics (ib-welloresto-api repo)
// field-for-field — see RevenueResponse in that module's models.go. Amounts
// are integer cents everywhere (*_ttc_cents, *_ht_cents), never euros: the
// old mock mixed the two (AUDIT.md I2/I3, docs/analytics/), this contract
// doesn't leave room to repeat that.
export interface RevenuePeriodTotals {
  from: string;
  to: string;
  total_ttc_cents: number;
  total_ht_cents?: number;
  order_count: number;
}

export interface RevenueDayPoint {
  local_day: string;
  total_ttc_cents: number;
  by_channel_ttc_cents: Record<string, number>;
}

export interface RevenueChannelTotal {
  channel: string;
  total_ttc_cents: number;
  order_count: number;
}

export interface RevenueMerchantTotal {
  merchant_id: string;
  total_ttc_cents: number;
  order_count: number;
}

export interface RevenueAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: RevenuePeriodTotals;
  previous_period: RevenuePeriodTotals;
  previous_year: RevenuePeriodTotals;
  timeline: RevenueDayPoint[];
  by_channel: RevenueChannelTotal[];
  by_merchant?: RevenueMerchantTotal[];
  ht_computed: boolean;
}

// Shapes below mirror internal/modules/analytics's Orders*/Payments*/VAT*
// types (ib-welloresto-api repo, models.go) field-for-field, same convention
// as RevenueAnalyticsResponse above.

export interface OrdersPeriodTotals {
  from: string;
  to: string;
  order_count: number;
  avg_basket_ttc_cents: number;
  covers_data_available: boolean;
  total_covers?: number;
  avg_basket_per_cover_cents?: number;
}

export interface OrdersDayPoint {
  local_day: string;
  total_orders: number;
  by_channel_orders: Record<string, number>;
}

export interface OrdersChannelTotal {
  channel: string;
  order_count: number;
}

export interface OrdersMerchantTotal {
  merchant_id: string;
  order_count: number;
  total_ttc_cents: number;
}

export interface OrdersAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: OrdersPeriodTotals;
  previous_period: OrdersPeriodTotals;
  previous_year: OrdersPeriodTotals;
  timeline: OrdersDayPoint[];
  by_channel: OrdersChannelTotal[];
  by_merchant?: OrdersMerchantTotal[];
}

export interface PaymentsPeriodTotals {
  from: string;
  to: string;
  total_amount_cents: number;
  payment_count: number;
}

export interface PaymentsDayPoint {
  local_day: string;
  total_amount_cents: number;
  by_method_amount_cents: Record<string, number>;
}

export interface PaymentMethodTotal {
  method: string;
  total_amount_cents: number;
  payment_count: number;
}

export interface PaymentsMerchantTotal {
  merchant_id: string;
  total_amount_cents: number;
  payment_count: number;
}

export interface PaymentsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: PaymentsPeriodTotals;
  previous_period: PaymentsPeriodTotals;
  previous_year: PaymentsPeriodTotals;
  timeline: PaymentsDayPoint[];
  by_method: PaymentMethodTotal[];
  by_merchant?: PaymentsMerchantTotal[];
}

export interface VATPeriodTotals {
  from: string;
  to: string;
  total_ttc_cents: number;
  total_ht_cents: number;
  total_vat_cents: number;
}

export interface VATRateTotal {
  rate: number;
  base_ht_cents: number;
  vat_cents: number;
}

export interface VATChannelTotal {
  channel: string;
  base_ht_cents: number;
  vat_cents: number;
  total_ttc_cents: number;
}

// VATAnalyticsResponse is the canonical analytics VAT view — NOT a fiscal
// document, deliberately not reconciled with pos/reports/tva. See
// VATAnalyticsTab.tsx for the label this drives.
// VATMerchantTotal mirrors internal/modules/analytics.VATMerchantTotal —
// by_rate/by_channel here are apportioned PER ESTABLISHMENT against this
// establishment's own total_ht_cents (PROMPT 24 Phase 2), so they sum
// exactly to this row's own totals, never to the combined scope's.
export interface VATMerchantTotal {
  merchant_id: string;
  total_ttc_cents: number;
  total_ht_cents: number;
  total_vat_cents: number;
  by_rate: VATRateTotal[];
  by_channel: VATChannelTotal[];
}

export interface VATAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: VATPeriodTotals;
  previous_period: VATPeriodTotals;
  previous_year: VATPeriodTotals;
  by_rate: VATRateTotal[];
  by_channel: VATChannelTotal[];
  by_merchant?: VATMerchantTotal[];
}

// Products Analytics — onglet Produits (PROMPT 16), branché sur
// POST /analytics/products (reports.sales.read, même porte que les 5 autres
// onglets). Shapes mirroir internal/modules/analytics/models.go field-for-
// field, même convention que CancellationsAnalyticsResponse.
//
// Coût/marge sont TOUJOURS `null`, jamais `0`, quand le coût de revient n'est
// pas connu — c'est la règle posée au lot 1 (PROMPT 07) et rappelée
// explicitement par PROMPT 16 : un coût à 0 se lit comme un produit gratuit,
// donc une marge de 100%. Rendu à l'écran comme « — », jamais comme un
// montant.
export interface ProductCategoryOption {
  category_id: string;
  name: string;
}

export interface ProductsPeriodTotals {
  from: string;
  to: string;
  quantity_sold: number;
  revenue_ttc_cents: number;
  revenue_ht_cents: number;
}

// margin_cents/margin_percent sont nil dès que coverage_ratio est sous le
// seuil de matérialité (20%, le même que CoversDataAvailable ailleurs dans ce
// même contrat) — dans ce cas afficher revenue_ttc_cents_covered /
// revenue_ttc_cents_total (« marge connue sur X% du CA »), jamais un taux
// calculé sur une part infime des ventes.
export interface ProductsCostCoverage {
  revenue_ttc_cents_total: number;
  revenue_ttc_cents_covered: number;
  coverage_ratio: number;
  margin_cents?: number;
  margin_percent?: number;
  no_recipe_quantity: number;
  incomplete_recipe_quantity: number;
}

// cost_price_cents/margin_cents/margin_percent sont absents (jamais 0) tant
// que cost_known_quantity est 0 pour ce produit — un produit sans recette
// (NO_RECIPE) ou dont la recette est incomplète (INCOMPLETE_RECIPE) n'a
// simplement pas de coût connu sur la période. evolution_percent est absent
// pour un produit sans vente sur la période précédente (jamais un -100%
// trompeur).
export interface ProductRow {
  product_id: string;
  name: string;
  category_id: string;
  category_name: string;
  quantity_sold: number;
  revenue_ttc_cents: number;
  revenue_ht_cents: number;
  cost_known_quantity: number;
  cost_known_revenue_ttc_cents: number;
  cost_price_cents?: number;
  margin_cents?: number;
  margin_percent?: number;
  no_recipe_quantity: number;
  incomplete_recipe_quantity: number;
  evolution_percent?: number;
}

export interface ProductsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  category_id: string;
  sort_by: string;
  sort_dir: string;
  current_period: ProductsPeriodTotals;
  previous_period: ProductsPeriodTotals;
  cost_coverage: ProductsCostCoverage;
  available_categories: ProductCategoryOption[];
  pagination: { total_items: number; total_pages: number; current_page: number; limit: number };
  rows: ProductRow[];
}

export interface ProductsAnalyticsFilters {
  categoryId?: string;
  sortBy?: 'quantity' | 'revenue_ttc' | 'margin';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // merchantIds scopes to a subset of the accessible establishments (PROMPT
  // 24 Phase 3) — no group_by here: Produits is a paginated table, not one
  // of the 5 comparable tabs, so a multi-establishment selection always
  // aggregates.
  merchantIds?: string[];
}

// Mock fixture for getProductsAnalytics's withMock branch — some rows
// carry a known cost (margin present), some don't (NO_RECIPE/
// INCOMPLETE_RECIPE), matching the real contract's nil-not-zero rule so the
// mock branch exercises the same "—" rendering path as production data.
const mockProductRows: ProductRow[] = [
  {
    product_id: '1', name: 'Burger Classique', category_id: 'plats', category_name: 'Plats',
    quantity_sold: 340, revenue_ttc_cents: 340000, revenue_ht_cents: 291000,
    cost_known_quantity: 340, cost_known_revenue_ttc_cents: 340000,
    cost_price_cents: 119000, margin_cents: 221000, margin_percent: 65,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 0, evolution_percent: 12,
  },
  {
    product_id: '2', name: 'Pizza Quatre Fromages', category_id: 'plats', category_name: 'Plats',
    quantity_sold: 290, revenue_ttc_cents: 406000, revenue_ht_cents: 348000,
    cost_known_quantity: 290, cost_known_revenue_ttc_cents: 406000,
    cost_price_cents: 131800, margin_cents: 274200, margin_percent: 67.5,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 0, evolution_percent: 8,
  },
  {
    product_id: '3', name: 'Salade César', category_id: 'entrees', category_name: 'Entrées',
    quantity_sold: 210, revenue_ttc_cents: 168000, revenue_ht_cents: 144000,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 210, incomplete_recipe_quantity: 0, evolution_percent: 15,
  },
  {
    product_id: '4', name: 'Pâtes Carbonara', category_id: 'plats', category_name: 'Plats',
    quantity_sold: 185, revenue_ttc_cents: 277500, revenue_ht_cents: 238000,
    cost_known_quantity: 90, cost_known_revenue_ttc_cents: 135000,
    cost_price_cents: 45000, margin_cents: 90000, margin_percent: 66.7,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 95, evolution_percent: 5,
  },
  {
    product_id: '5', name: 'Tiramisu', category_id: 'desserts', category_name: 'Desserts',
    quantity_sold: 180, revenue_ttc_cents: 135000, revenue_ht_cents: 116000,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 180, evolution_percent: 22,
  },
  {
    product_id: '6', name: 'Coca-Cola 33cl', category_id: 'boissons', category_name: 'Boissons',
    quantity_sold: 520, revenue_ttc_cents: 156000, revenue_ht_cents: 130000,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 520, incomplete_recipe_quantity: 0, evolution_percent: -5,
  },
];

// Options Analytics — onglet Options (PROMPT 17), branché sur
// POST /analytics/options, même gabarit que Produits (coût/marge nil-not-
// zero, pagination/tri serveur). Shapes miroir internal/modules/analytics/
// models.go field-for-field.
//
// Toutes les valeurs monétaires sont des centimes entiers (*_cents),
// formatées à l'affichage — PROMPT 17 §3 : c'était le seul onglet de
// l'ancienne maquette documenté en centimes tout en affichant des euros sans
// conversion. Ce contrat n'a plus cette ambiguïté.
export const OPTION_TYPE_PAID = 'paid';
export const OPTION_TYPE_FREE = 'free';
export const OPTION_TYPE_REMOVED = 'removed';

export interface OptionsPeriodTotals {
  from: string;
  to: string;
  quantity_sold: number;
  revenue_ttc_cents: number;
}

export interface OptionsCostCoverage {
  revenue_ttc_cents_total: number;
  revenue_ttc_cents_covered: number;
  coverage_ratio: number;
  margin_cents?: number;
  margin_percent?: number;
  no_recipe_quantity: number;
  incomplete_recipe_quantity: number;
}

// quantity_sold (instances vendues, coté CA) et units_with_this (unités
// produit ayant choisi l'option au moins une fois, dénominateur d'adoption)
// sont DEUX nombres différents dès qu'une même ligne sélectionne l'option
// plus d'une fois ("2x bacon" sur un seul burger) — voir options.go
// (ib-welloresto-api repo) pour le détail. adoption_rate est absent (jamais
// une division par zéro) quand product_units_sold est 0.
//
// cost_price_cents/margin_cents/margin_percent sont absents (jamais 0) tant
// que cost_known_quantity est 0 — pour option_type "removed" c'est TOUJOURS
// le cas : `without` ne porte aucun instantané de coût, ce n'est pas une
// donnée manquante, c'est structurellement non applicable.
//
// revenue_ttc_cents est un vrai 0 (jamais absent) pour "free" et "removed" :
// ni une modification gratuite ni un retrait d'ingrédient ne génère de CA.
export interface OptionRow {
  entity_id: string;
  name: string;
  attribute_name?: string;
  product_id: string;
  product_name: string;
  option_type: typeof OPTION_TYPE_PAID | typeof OPTION_TYPE_FREE | typeof OPTION_TYPE_REMOVED;

  quantity_sold: number;

  product_units_sold: number;
  units_with_this: number;
  adoption_rate?: number;

  revenue_ttc_cents: number;

  basket_impact_cents?: number;

  cost_known_quantity: number;
  cost_known_revenue_ttc_cents: number;
  cost_price_cents?: number;
  margin_cents?: number;
  margin_percent?: number;
  no_recipe_quantity: number;
  incomplete_recipe_quantity: number;
}

export interface OptionsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  option_types: string[];
  sort_by: string;
  sort_dir: string;
  current_period: OptionsPeriodTotals;
  previous_period: OptionsPeriodTotals;
  cost_coverage: OptionsCostCoverage;
  pagination: { total_items: number; total_pages: number; current_page: number; limit: number };
  rows: OptionRow[];
}

export interface OptionsAnalyticsFilters {
  optionTypes?: string[];
  sortBy?: 'quantity' | 'revenue_ttc' | 'margin';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // See ProductsAnalyticsFilters.merchantIds's doc comment — same posture.
  merchantIds?: string[];
}

const mockOptionRows: OptionRow[] = [
  {
    entity_id: '1', name: 'Extra Bacon', attribute_name: 'Toppings', product_id: '1', product_name: 'Burger Classique',
    option_type: OPTION_TYPE_PAID,
    quantity_sold: 178, product_units_sold: 340, units_with_this: 170, adoption_rate: 50,
    revenue_ttc_cents: 71200,
    basket_impact_cents: 120,
    cost_known_quantity: 178, cost_known_revenue_ttc_cents: 71200,
    cost_price_cents: 26700, margin_cents: 44500, margin_percent: 62.5,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 0,
  },
  {
    entity_id: '2', name: 'Extra Fromage', attribute_name: 'Toppings', product_id: '2', product_name: 'Pizza Quatre Fromages',
    option_type: OPTION_TYPE_PAID,
    quantity_sold: 145, product_units_sold: 290, units_with_this: 145, adoption_rate: 50,
    revenue_ttc_cents: 43500,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 145, incomplete_recipe_quantity: 0,
  },
  {
    entity_id: '3', name: 'Sans Sel', attribute_name: 'Personnalisation', product_id: '1', product_name: 'Burger Classique',
    option_type: OPTION_TYPE_FREE,
    quantity_sold: 98, product_units_sold: 340, units_with_this: 98, adoption_rate: 28.8,
    revenue_ttc_cents: 0,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 98, incomplete_recipe_quantity: 0,
  },
  {
    entity_id: '4', name: 'Olives', product_id: '2', product_name: 'Pizza Quatre Fromages',
    option_type: OPTION_TYPE_REMOVED,
    quantity_sold: 45, product_units_sold: 290, units_with_this: 45, adoption_rate: 15.5,
    revenue_ttc_cents: 0,
    basket_impact_cents: -80,
    cost_known_quantity: 0, cost_known_revenue_ttc_cents: 0,
    no_recipe_quantity: 0, incomplete_recipe_quantity: 0,
  },
];

// Cancellations Analytics — onglet Annulations, branché sur
// POST /analytics/cancellations (agrégats, reports.sales.read) et
// POST /analytics/cancellations/by-staff (nominatif, reports.staff_performance.read
// — clé distincte, seule route de la page qui ne suit pas reports.sales.read).
// Shapes mirroir internal/modules/analytics/models.go field-for-field
// (CancellationsResponse / CancellationsByStaffResponse), même convention que
// RevenueAnalyticsResponse. Le backend n'émet jamais de taux pré-divisé : ni
// current_period.cancelled_count/total_orders_created, ni
// StaffCancellationRow.cancelled_count/orders_created — seuls les entiers
// bruts sont renvoyés, le front calcule l'affichage.
export interface CancellationsPeriodTotals {
  from: string;
  to: string;
  total_orders_created: number;
  cancelled_count: number;
  cancelled_amount_cents: number;
  internal_cancelled_count: number;
  platform_cancelled_count: number;
  unknown_cancelled_count: number;
}

// reason_id est un identifiant stable (le deletion_reason_id catalogue, ou
// "uncatalogued:<brut>" / "none"), jamais un libellé — c'est label qui porte
// le texte affichable. AUDIT.md avait relevé un filtre sur des slugs anglais
// inventés qui ne matchaient jamais les libellés français réels ; ne jamais
// reproduire ça en filtrant sur autre chose que reason_id.
export interface CancellationReasonTotal {
  reason_id: string;
  label: string;
  count: number;
}

// author_type ∈ STAFF | CUSTOMER | SYSTEM | PLATFORM | UNKNOWN (NULL en base).
export interface CancellationAuthorTypeTotal {
  author_type: string;
  count: number;
  amount_cents: number;
}

export interface CancellationChannelTotal {
  channel: string;
  count: number;
  amount_cents: number;
}

export interface CancellationsMerchantTotal {
  merchant_id: string;
  total_orders_created: number;
  cancelled_count: number;
  cancelled_amount_cents: number;
  internal_cancelled_count: number;
  platform_cancelled_count: number;
  unknown_cancelled_count: number;
}

export interface CancellationsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  current_period: CancellationsPeriodTotals;
  previous_period: CancellationsPeriodTotals;
  previous_year: CancellationsPeriodTotals;
  by_reason: CancellationReasonTotal[];
  by_author_type: CancellationAuthorTypeTotal[];
  by_channel: CancellationChannelTotal[];
  by_merchant?: CancellationsMerchantTotal[];
}

// user_id === "unattributed" est la ligne synthétique portant les
// annulations STAFF dont created_by ne correspond à aucun users.user_id réel
// — orders_created y vaut toujours 0 et rate_available toujours false.
export interface StaffCancellationRow {
  user_id: string;
  name: string;
  orders_created: number;
  cancelled_count: number;
  rate_available: boolean;
}

// Pas de comparaisons période préc./N-1 ici : un classement nominatif se lit
// "qui, cette période", pas comme une tendance. min_orders_for_rate vient du
// serveur (pas codé en dur côté front) : c'est le seuil sous lequel
// rate_available bascule à false pour une ligne.
export interface CancellationsByStaffResponse {
  scope: { merchant_ids: string[]; group_by: string };
  from: string;
  to: string;
  min_orders_for_rate: number;
  staff: StaffCancellationRow[];
}

// Upsell Analytics (PROMPT 19) — mirrors internal/modules/analytics's
// Upsell*/UpsellStaffRow types (ib-welloresto-api repo, models.go)
// field-for-field, same convention as CancellationsAnalyticsResponse/
// ClientsAnalyticsResponse. Two endpoints, not one — same split as
// Annulations/Clients: getUpsellAnalytics (agrégats + suggestions,
// reports.sales.read) and getUpsellByStaff (classement nominatif,
// reports.staff_performance.read).
//
// instrumentation_active is the central fact this tab is built around:
// orderitems.is_upsell is false on every line in this system today (only the
// POS channel writes it — Kiosk/ScanNOrder both have working upsell UIs but
// neither serializes the flag yet). While false, current_period/
// previous_period/staff MUST NOT be rendered as real zeros — the tab's
// primary message is then "donnée non collectée," not a KPI row of 0s. It
// flips to true on its own, no redeploy, once any channel starts writing
// is_upsell = true.
//
// suggestions is the one block NOT gated by instrumentation_active: it reads
// upsell_suggestions, a different, already-working write path (populated
// whenever an order references a suggestion, independent of is_upsell).
export interface UpsellPeriodTotals {
  from: string;
  to: string;
  upsell_lines: number;
  upsell_revenue_ht_cents: number;
  orders_with_upsell_count: number;
  total_orders_count: number;
}

// transformation_rate_available gates accepted_count/proposed_count's ratio
// on min_proposed_for_rate — below it, only the two raw counts should be
// shown, never a computed percentage.
export interface UpsellSuggestionsTotals {
  from: string;
  to: string;
  proposed_count: number;
  accepted_count: number;
  transformation_rate_available: boolean;
  min_proposed_for_rate: number;
}

export interface UpsellAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  channels: string[];
  instrumentation_active: boolean;
  current_period: UpsellPeriodTotals;
  previous_period: UpsellPeriodTotals;
  suggestions: UpsellSuggestionsTotals;
}

// user_id/name mirror StaffCancellationRow's naming (renamed from the old
// stats.UpsellServerStat's server_id/server_name for consistency within this
// package's own contracts).
export interface UpsellStaffRow {
  user_id: string;
  name: string;
  upsell_lines: number;
  upsell_revenue_ht_cents: number;
}

export interface UpsellByStaffResponse {
  scope: { merchant_ids: string[]; group_by: string };
  channels: string[];
  from: string;
  to: string;
  instrumentation_active: boolean;
  staff: UpsellStaffRow[];
}

// Discounts Analytics (PROMPT 22) — mirrors internal/modules/analytics's
// Discounts*/DiscountRow types (ib-welloresto-api repo, models.go) field-for-
// field. Single endpoint, no nominative sibling (no per-staff breakdown, no
// data nominative at all — reports.sales.read alone suffices). No
// discount_type anywhere: grouping is by discount_id, never by label, so a
// rename can never fragment or merge a discount's history. No cart-discount
// section: applyCartDiscount does not exist anywhere in the codebase (the
// maquette this replaces described a feature never built).
export interface DiscountsPeriodTotals {
  from: string;
  to: string;
  total_discounted_cents: number;
  // reconstructed_* / measured_* split total_discounted_cents exactly — the
  // 545 rows reconstructed from historical base_price/price mismatches are a
  // FLOOR, not a total (PROMPT 22), never presented as a single ambiguous
  // number. See DiscountsAnalyticsResponse.measurement_complete_from.
  reconstructed_amount_cents: number;
  measured_amount_cents: number;
  reconstructed_redemptions_count: number;
  measured_redemptions_count: number;
  discounted_orders_count: number;
  total_orders_count: number;
  // orders_with_discount_rate_percent / discount_rate_percent are absent
  // (never 0) below the server's materiality threshold (30 discounted
  // orders, same bar as Annulations/Clients/Upsell) — the raw counts above
  // stay visible regardless, so "X sur Y" can always be rendered.
  orders_with_discount_rate_percent?: number;
  reference_revenue_ttc_cents: number;
  // discount_rate_percent = total_discounted_cents / reference_revenue_ttc_cents
  // (this period's whole CA TTC, channel-filtered, ALL orders — not just the
  // discounted ones; the server's own deliberate choice, see PROMPT 22's
  // decisions.md entry for the tradeoff against the other defensible
  // denominator).
  discount_rate_percent?: number;
}

// DiscountsMarginCoverage mirrors ProductsAnalyticsResponse.cost_coverage's
// contract exactly: margin_impact_cents/percent are absent (never 0) below
// 20% coverage — today that is always true, cost_price_unit being null on
// the near-totality of orderitems, so the screen must show "non disponible,"
// never a zero that reads as "this discount costs nothing in margin."
export interface DiscountsMarginCoverage {
  discounted_lines_revenue_ttc_cents_total: number;
  discounted_lines_revenue_ttc_cents_covered: number;
  coverage_ratio: number;
  margin_impact_cents?: number;
  margin_impact_percent?: number;
}

// DiscountRow is one row of the répartition-par-remise table, grouped by
// discount_id (never discount_name) — the question this table answers is
// "laquelle me coûte le plus." is_deleted marks a soft-deleted discount that
// still shows its historical redemptions in full.
export interface DiscountRow {
  discount_id: number;
  discount_name: string;
  is_deleted: boolean;
  total_amount_cents: number;
  redemptions_count: number;
  reconstructed_amount_cents: number;
  measured_amount_cents: number;
}

export interface DiscountsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  channels: string[];
  // measurement_complete_from names the point (YYYY-MM-DD) from which this
  // tab's numbers stop being a floor and start being complete — the earliest
  // live-written (non-reconstructed) redemption, all time, this merchant.
  // Absent when no live write has happened yet: every figure above is then
  // "at least," with no date to anchor a "complete since" statement.
  measurement_complete_from?: string;
  sort_by: string;
  sort_dir: string;
  current_period: DiscountsPeriodTotals;
  previous_period: DiscountsPeriodTotals;
  margin_impact: DiscountsMarginCoverage;
  pagination: { total_items: number; total_pages: number; current_page: number; limit: number };
  rows: DiscountRow[];
}

export interface DiscountsAnalyticsFilters {
  channels?: string[];
  sortBy?: 'amount' | 'count';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // See ProductsAnalyticsFilters.merchantIds's doc comment — same posture.
  merchantIds?: string[];
}

// Clients Analytics (PROMPT 18) — mirrors internal/modules/analytics's
// Clients*/ClientRow types (ib-welloresto-api repo, models.go) field-for-
// field, same convention as RevenueAnalyticsResponse. Two endpoints, not one:
// getClientsAnalytics (agrégats, reports.sales.read) and getClientsTop
// (classement nominatif, customers.manage, plus restrictif) — see both
// methods' doc comments below, same split as Annulations/getCancellationsByStaff.
export interface ClientsCoverage {
  orders_with_customer_id: number;
  total_orders: number;
  coverage_ratio: number;
}

// Une seule interprétation retenue côté serveur par terme ambigu (récurrence,
// segments, fréquence, inactivité) — ces libellés SONT la source de vérité à
// afficher à l'écran, jamais un texte figé côté front qui pourrait diverger
// du calcul réel si le seuil serveur change.
export interface ClientsDefinitions {
  recurrence: string;
  segments: string;
  frequency: string;
  inactivity: string;
}

// avg_basket_ttc_cents est absent quand le segment n'a aucune commande sur la
// période (inactif/dormant, par construction) — jamais une division par 0.
export interface ClientsSegmentCount {
  segment: string;
  count: number;
  avg_basket_ttc_cents?: number;
}

// recurring_rate est absent sous min_customers_for_rate identified_customers
// (seuil de matérialité, PROMPT 18 §6, même seuil que
// CancellationsByStaffResponse.min_orders_for_rate) — recurring_count et
// identified_customers_in_period restent toujours affichés en valeur absolue.
export interface ClientsAnalyticsResponse {
  scope: { merchant_ids: string[]; group_by: string };
  channels: string[];
  from: string;
  to: string;
  coverage: ClientsCoverage;
  definitions: ClientsDefinitions;
  no_identified_customers: boolean;
  identified_customers_in_period: number;
  new_customers_count: number;
  recurring_count: number;
  recurring_rate?: number;
  min_customers_for_rate: number;
  avg_orders_per_active_customer: number;
  segment_rates_available: boolean;
  segments: ClientsSegmentCount[];
}

// lifetime_value_cents/lifetime_orders/avg_basket_ttc_cents sont calculés sur
// TOUT l'historique du client, jamais bornés à la période demandée — voir
// ClientsAnalyticsResponse et le commentaire de clients.go (ib-welloresto-api
// repo) sur "valeur vie cumulée depuis toujours".
export interface ClientRow {
  customer_id: string;
  name: string;
  lifetime_value_cents: number;
  lifetime_orders: number;
  last_order_date: string;
  avg_basket_ttc_cents: number;
}

export interface ClientsTopResponse {
  scope: { merchant_ids: string[]; group_by: string };
  channels: string[];
  from: string;
  to: string;
  identified_customers_in_period: number;
  top_clients: ClientRow[];
}

// Restaurants Comparative
interface RestaurantComparative {
  restaurant_id: string;
  name: string;
  value: number;
  previous_period: number;
  evolution_percent: number;
  rank: number;
}

interface RestaurantsAnalyticsResponse {
  by_restaurant: RestaurantComparative[];
  timeline?: Array<{ date: string; [key: string]: unknown }>;
  breakdown?: Array<{ name: string; value: number }>;
  comparisons: {
    previous_period: { value: number; change: number };
    year_ago: { value: number; change: number };
  };
}

// Order History
export interface OrderHistoryItem {
  id: string;
  number: string;
  date: string;
  time: string;
  customer_name: string;
  brand: string;
  order_type: string;
  status: 'canceled' | 'done' | 'pending' | 'denied';
  total: number;
  payment_method: string;
}

export interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages?: number;
  total_revenue: number;
  avg_basket: number;
}

type OrderHistoryApiResponse = WelloApiResponse<{
  orders: Order[];
  metadata?: {
    total_items?: number;
    total_pages?: number;
    current_page?: number;
    limit?: number;
    total_revenue?: number;
    avg_basket?: number;
  };
}>;

const formatOrderHistoryDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('fr-FR');
};

const formatOrderHistoryTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toUtcBoundaryISOString = (value: string | Date, endOfDay = false): string => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = value.getMonth();
    const day = value.getDate();

    return new Date(
      Date.UTC(year, month, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    ).toISOString();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);

    return new Date(
      Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    ).toISOString();
  }

  const parsed = new Date(value);
  return parsed.toISOString();
};

const getOrderHistoryTimestamp = (order: Order): string => {
  if (order.creation_date) {
    return new Date(order.creation_date * 1000).toISOString();
  }

  return new Date().toISOString();
};

const mapOrderHistoryStatus = (order: Order): OrderHistoryItem['status'] => {
  const state = order.state?.toLowerCase() || '';
  const brandStatus = order.brand_status?.toLowerCase() || '';
  const merchantApproval = order.merchant_approval?.toLowerCase() || '';

  if (
    state.includes('deny') ||
    state.includes('reject') ||
    brandStatus.includes('deny') ||
    brandStatus.includes('reject') ||
    merchantApproval.includes('deny')
  ) {
    return 'denied';
  }

  if (state.includes('cancel') || brandStatus.includes('cancel')) {
    return 'canceled';
  }

  if (
    state.includes('open') ||
    state.includes('pending') ||
    brandStatus.includes('pending') ||
    brandStatus.includes('preparing')
  ) {
    return 'pending';
  }

  return 'done';
};

const mapOrderHistoryPaymentMethod = (order: Order): string => {
  const paymentMethod = order.payments[0]?.mop?.toLowerCase() || '';

  if (paymentMethod === 'cb') {
    return 'card';
  }

  if (paymentMethod === 'cash' || paymentMethod === 'espèces') {
    return 'cash';
  }

  if (paymentMethod.includes('apple')) {
    return 'applepay';
  }

  return paymentMethod || 'card';
};

const mapOrderToHistoryItem = (order: Order): OrderHistoryItem => {
  const timestamp = getOrderHistoryTimestamp(order);

  return {
    id: order.order_id,
    number: order.order_num.startsWith('#') ? order.order_num : `#${order.order_num}`,
    date: formatOrderHistoryDate(timestamp),
    time: formatOrderHistoryTime(timestamp),
    customer_name: order.customer?.customer_name || '—',
    brand: resolveOrderHistoryBrand(order.brand, order.fulfillment_type),
    order_type: resolveOrderHistoryType(order.order_type),
    status: mapOrderHistoryStatus(order),
    total: order.TTC / 100,
    payment_method: mapOrderHistoryPaymentMethod(order),
  };
};

/**
 * Analytics Service - Données pour la page Analyses du Tableau de bord
 */
class AnalyticsService {
  /**
   * Récupère les établissements accessibles à l'utilisateur (ceux où il
   * détient pos.analytics) — GET /analytics/merchants, PROMPT 24 Phase 1.
   * Alimente le sélecteur global multi-établissements (PROMPT 24 Phase 3).
   * Contrairement aux autres endpoints de ce service, celui-ci ne prend ni
   * date ni scope : la liste est entièrement fonction du token.
   */
  async getAccessibleMerchants(): Promise<AccessibleMerchantsResponse> {
    return withMock(
      () => ({
        merchants: [
          { merchant_id: 'mock-1', name: 'Établissement Mock' },
        ],
      }),
      async () => {
        const response = await apiClient.get<{ id: string; data: AccessibleMerchantsResponse }>(
          '/analytics/merchants'
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données de chiffre d'affaires avec comparaisons.
   * Onglet CA — premier onglet branché en SQL direct sur
   * POST /analytics/revenue (internal/modules/analytics, ib-welloresto-api
   * repo). Les périodes de comparaison sont calculées côté serveur, en un
   * seul appel — voir docs/analytics/ PROMPT 03 Partie 2.
   */
  async getRevenueAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    scope?: AnalyticsScopeOptions
  ): Promise<RevenueAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => {
        const mockTimeline: RevenueDayPoint[] = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_ttc_cents: 0,
            by_channel_ttc_cents: {
              dine_in: Math.floor(850000 + Math.random() * 200000),
              takeaway: Math.floor(320000 + Math.random() * 80000),
              delivery: Math.floor(180000 + Math.random() * 40000),
            },
          };
        }).map((point) => ({
          ...point,
          total_ttc_cents: Object.values(point.by_channel_ttc_cents).reduce((a, b) => a + b, 0),
        }));

        return {
          scope: { merchant_ids: ['mock'], group_by: 'none' },
          current_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1442000, total_ht_cents: 1201700, order_count: 320 },
          previous_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1420000, total_ht_cents: 1183300, order_count: 305 },
          previous_year: { from: dateFrom, to: dateTo, total_ttc_cents: 1288000, total_ht_cents: 1073300, order_count: 280 },
          timeline: mockTimeline,
          by_channel: [
            { channel: 'dine_in', total_ttc_cents: 850000, order_count: 180 },
            { channel: 'takeaway', total_ttc_cents: 320000, order_count: 70 },
            { channel: 'delivery', total_ttc_cents: 180000, order_count: 30 },
            { channel: 'ubereats_takeaway', total_ttc_cents: 45000, order_count: 12 },
            { channel: 'ubereats_delivery', total_ttc_cents: 27000, order_count: 8 },
            { channel: 'deliveroo_takeaway', total_ttc_cents: 12000, order_count: 4 },
            { channel: 'deliveroo_delivery', total_ttc_cents: 8000, order_count: 2 },
          ],
          ht_computed: true,
        };
      },
      async () => {
        const response = await apiClient.post<{ id: string; data: RevenueAnalyticsResponse }>(
          '/analytics/revenue',
          { date_from: dateFrom, date_to: dateTo, ...scopeToRequestFields(scope) }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données de commandes avec comparaisons.
   * Onglet Commandes — branché en SQL direct sur POST /analytics/orders
   * (internal/modules/analytics, ib-welloresto-api repo), même gabarit que
   * l'onglet CA. Couverts jamais un zéro silencieux : total_covers /
   * avg_basket_per_cover_cents sont absents quand covers_data_available est
   * false (places_settings non saisi sur 99,9% du périmètre PROD).
   */
  async getOrdersAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    scope?: AnalyticsScopeOptions
  ): Promise<OrdersAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: {
          from: dateFrom, to: dateTo, order_count: 320, avg_basket_ttc_cents: 4506,
          covers_data_available: false,
        },
        previous_period: {
          from: dateFrom, to: dateTo, order_count: 305, avg_basket_ttc_cents: 4656,
          covers_data_available: false,
        },
        previous_year: {
          from: dateFrom, to: dateTo, order_count: 280, avg_basket_ttc_cents: 4600,
          covers_data_available: false,
        },
        timeline: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_orders: Math.floor(8 + Math.random() * 6),
            by_channel_orders: { dine_in: Math.floor(4 + Math.random() * 3), takeaway: Math.floor(2 + Math.random() * 2) },
          };
        }),
        by_channel: [
          { channel: 'dine_in', order_count: 180 },
          { channel: 'takeaway', order_count: 70 },
          { channel: 'delivery', order_count: 30 },
          { channel: 'ubereats_takeaway', order_count: 12 },
          { channel: 'ubereats_delivery', order_count: 8 },
          { channel: 'deliveroo_takeaway', order_count: 4 },
          { channel: 'deliveroo_delivery', order_count: 2 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: OrdersAnalyticsResponse }>(
          '/analytics/orders',
          { date_from: dateFrom, date_to: dateTo, ...scopeToRequestFields(scope) }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données CA en CSV
   */
  async exportRevenueCSV(
    startDate: string,
    endDate: string,
    channels: string[]
  ): Promise<Blob> {
    try {
      const csv = 'Date,Canal,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting revenue CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les données commandes en CSV
   */
  async exportOrdersCSV(
    startDate: string,
    endDate: string,
    orderModes: string[],
    serviceType: string
  ): Promise<Blob> {
    try {
      const csv = 'Date,Type,Commandes,CA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting orders CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données de règlements avec comparaisons.
   * Onglet Règlements — branché en SQL direct sur POST /analytics/payments.
   * `by_method` utilise les 7 valeurs canoniques de `mop` + "other" — voir
   * src/utils/paymentMethods.ts. Aucune valeur "mobile" : le référentiel réel
   * n'en comporte pas (DROITS.md/AUDIT.md P14).
   */
  async getPaymentsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    scope?: AnalyticsScopeOptions
  ): Promise<PaymentsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: { from: dateFrom, to: dateTo, total_amount_cents: 1442000, payment_count: 320 },
        previous_period: { from: dateFrom, to: dateTo, total_amount_cents: 1420000, payment_count: 305 },
        previous_year: { from: dateFrom, to: dateTo, total_amount_cents: 1288000, payment_count: 280 },
        timeline: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            local_day: date.toISOString().split('T')[0],
            total_amount_cents: Math.floor(35000 + Math.random() * 15000),
            by_method_amount_cents: {
              CB: Math.floor(25000 + Math.random() * 8000),
              ES: Math.floor(8000 + Math.random() * 3000),
            },
          };
        }),
        by_method: [
          { method: 'CB', total_amount_cents: 865200, payment_count: 210 },
          { method: 'ES', total_amount_cents: 288400, payment_count: 68 },
          { method: 'STRIPE', total_amount_cents: 144200, payment_count: 30 },
          { method: 'UBER_EATS', total_amount_cents: 86520, payment_count: 8 },
          { method: 'DELIVEROO', total_amount_cents: 43260, payment_count: 3 },
          { method: 'other', total_amount_cents: 14420, payment_count: 1 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: PaymentsAnalyticsResponse }>(
          '/analytics/payments',
          { date_from: dateFrom, date_to: dateTo, ...scopeToRequestFields(scope) }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données règlements en CSV
   */
  async exportPaymentsCSV(
    startDate: string,
    endDate: string,
    paymentMethods?: string[],
    channel?: string
  ): Promise<Blob> {
    try {
      const csv = 'Date,Méthode,Montant\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting payments CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données TVA avec comparaisons.
   * Onglet TVA — branché en SQL direct sur POST /analytics/vat. Périmètre
   * analytique canonique, toutes marques — CE N'EST PAS un document
   * comptable, ne pas le confondre avec pos/reports/tva (VATAnalyticsTab.tsx
   * porte le libellé explicite).
   */
  async getVATAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    scope?: AnalyticsScopeOptions
  ): Promise<VATAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1442000, total_ht_cents: 1201700, total_vat_cents: 240300 },
        previous_period: { from: dateFrom, to: dateTo, total_ttc_cents: 1420000, total_ht_cents: 1183300, total_vat_cents: 236700 },
        previous_year: { from: dateFrom, to: dateTo, total_ttc_cents: 1288000, total_ht_cents: 1073300, total_vat_cents: 214700 },
        by_rate: [
          { rate: 20, base_ht_cents: 180000, vat_cents: 36000 },
          { rate: 10, base_ht_cents: 950000, vat_cents: 95000 },
          { rate: 5.5, base_ht_cents: 71700, vat_cents: 3900 },
        ],
        by_channel: [
          { channel: 'dine_in', base_ht_cents: 708300, vat_cents: 141700, total_ttc_cents: 850000 },
          { channel: 'takeaway', base_ht_cents: 266700, vat_cents: 53300, total_ttc_cents: 320000 },
          { channel: 'delivery', base_ht_cents: 150000, vat_cents: 30000, total_ttc_cents: 180000 },
          { channel: 'ubereats_takeaway', base_ht_cents: 37500, vat_cents: 7500, total_ttc_cents: 45000 },
          { channel: 'ubereats_delivery', base_ht_cents: 22500, vat_cents: 4500, total_ttc_cents: 27000 },
          { channel: 'deliveroo_takeaway', base_ht_cents: 10000, vat_cents: 2000, total_ttc_cents: 12000 },
          { channel: 'deliveroo_delivery', base_ht_cents: 6700, vat_cents: 1300, total_ttc_cents: 8000 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: VATAnalyticsResponse }>(
          '/analytics/vat',
          { date_from: dateFrom, date_to: dateTo, ...scopeToRequestFields(scope) }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données TVA en CSV
   */
  async exportVatCSV(startDate: string, endDate: string): Promise<Blob> {
    try {
      const csv = 'Taux,Base HT,TVA\nMock CSV export';
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error exporting VAT CSV:', error);
      throw error;
    }
  }

  /**
   * Récupère les données produits — onglet Produits (PROMPT 16), branché sur
   * POST /analytics/products, même gabarit scope/cache que CA/Commandes/
   * Règlements/TVA/Annulations. Pagination et tri sont résolus côté serveur
   * (voir ProductsAnalyticsFilters) — jamais tronqués/triés côté client
   * (PROMPT 16 §3, le défaut central de la maquette à ne pas reproduire).
   */
  async getProductsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    filters: ProductsAnalyticsFilters = {}
  ): Promise<ProductsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);
    const { categoryId, sortBy = 'quantity', sortDir = 'desc', page = 1, pageSize = 50, merchantIds } = filters;

    const mockPeriod = (from: string, to: string): ProductsPeriodTotals => ({
      from, to, quantity_sold: 1725, revenue_ttc_cents: 1482500, revenue_ht_cents: 1268500,
    });

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        category_id: categoryId ?? '',
        sort_by: sortBy,
        sort_dir: sortDir,
        current_period: mockPeriod(dateFrom, dateTo),
        previous_period: mockPeriod(dateFrom, dateTo),
        cost_coverage: {
          revenue_ttc_cents_total: 1482500,
          revenue_ttc_cents_covered: 1026700,
          coverage_ratio: 0.692,
          margin_cents: 613100,
          margin_percent: 41.35,
          no_recipe_quantity: 320,
          incomplete_recipe_quantity: 85,
        },
        available_categories: [
          { category_id: 'plats', name: 'Plats' },
          { category_id: 'entrees', name: 'Entrées' },
          { category_id: 'desserts', name: 'Desserts' },
          { category_id: 'boissons', name: 'Boissons' },
        ],
        pagination: { total_items: 6, total_pages: 1, current_page: page, limit: pageSize },
        rows: mockProductRows,
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ProductsAnalyticsResponse }>(
          '/analytics/products',
          {
            date_from: dateFrom, date_to: dateTo,
            category_id: categoryId || undefined,
            sort_by: sortBy, sort_dir: sortDir,
            page, page_size: pageSize,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données produits en CSV — reconstruit à partir des lignes
   * déjà chargées par l'onglet (la page courante), jamais régénéré côté
   * serveur (aucun endpoint CSV n'existe, même limite que exportCancellationsCSV).
   */
  async exportProductsCSV(data: ProductsAnalyticsResponse): Promise<Blob> {
    const header = 'Produit,Catégorie,Quantité vendue,CA TTC (€),CA HT (€),Coût (€),Marge (€),Marge (%),Évolution (%)\n';
    const rows = data.rows.map((r) => {
      const cost = r.cost_price_cents !== undefined ? (r.cost_price_cents / 100).toFixed(2) : '';
      const margin = r.margin_cents !== undefined ? (r.margin_cents / 100).toFixed(2) : '';
      const marginPct = r.margin_percent !== undefined ? r.margin_percent.toFixed(1) : '';
      const evolution = r.evolution_percent !== undefined ? r.evolution_percent.toFixed(1) : '';
      return [
        r.name, r.category_name, r.quantity_sold,
        (r.revenue_ttc_cents / 100).toFixed(2), (r.revenue_ht_cents / 100).toFixed(2),
        cost, margin, marginPct, evolution,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    return new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Récupère les données options — onglet Options (PROMPT 17), branché sur
   * POST /analytics/options, même gabarit scope/pagination/tri que Produits
   * (POST /analytics/products). option_types est réellement appliqué côté
   * serveur (contrairement à l'ancien mock qui l'acceptait sans jamais le
   * brancher sur le calcul, PROMPT 17 §3).
   */
  async getOptionsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    filters: OptionsAnalyticsFilters = {}
  ): Promise<OptionsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);
    const { optionTypes, sortBy = 'quantity', sortDir = 'desc', page = 1, pageSize = 50, merchantIds } = filters;

    const mockPeriod = (from: string, to: string): OptionsPeriodTotals => ({
      from, to, quantity_sold: 466, revenue_ttc_cents: 114700,
    });

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        option_types: optionTypes && optionTypes.length > 0 ? optionTypes : [OPTION_TYPE_PAID, OPTION_TYPE_FREE, OPTION_TYPE_REMOVED],
        sort_by: sortBy,
        sort_dir: sortDir,
        current_period: mockPeriod(dateFrom, dateTo),
        previous_period: mockPeriod(dateFrom, dateTo),
        cost_coverage: {
          revenue_ttc_cents_total: 114700,
          revenue_ttc_cents_covered: 71200,
          coverage_ratio: 0.621,
          margin_cents: 44500,
          margin_percent: 62.5,
          no_recipe_quantity: 243,
          incomplete_recipe_quantity: 0,
        },
        pagination: { total_items: mockOptionRows.length, total_pages: 1, current_page: page, limit: pageSize },
        rows: mockOptionRows,
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: OptionsAnalyticsResponse }>(
          '/analytics/options',
          {
            date_from: dateFrom, date_to: dateTo,
            option_types: optionTypes && optionTypes.length > 0 ? optionTypes : undefined,
            sort_by: sortBy, sort_dir: sortDir,
            page, page_size: pageSize,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données annulations (agrégats).
   * Onglet Annulations — branché en SQL direct sur POST /analytics/cancellations
   * (internal/modules/analytics, ib-welloresto-api repo), reports.sales.read,
   * même gabarit que CA/Commandes/Règlements/TVA. Le bloc nominatif par
   * serveur est un endpoint séparé, voir getCancellationsByStaff — une route
   * ne peut porter qu'une seule permission (reports.staff_performance.read
   * y est plus restrictive), d'où le découpage en deux appels indépendants.
   */
  async getCancellationsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    scope?: AnalyticsScopeOptions
  ): Promise<CancellationsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    const mockPeriod = (from: string, to: string): CancellationsPeriodTotals => ({
      from, to,
      total_orders_created: 10474,
      cancelled_count: 830,
      cancelled_amount_cents: 1567382,
      internal_cancelled_count: 775,
      platform_cancelled_count: 53,
      unknown_cancelled_count: 2,
    });

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        current_period: mockPeriod(dateFrom, dateTo),
        previous_period: mockPeriod(dateFrom, dateTo),
        previous_year: mockPeriod(dateFrom, dateTo),
        by_reason: [
          { reason_id: '3', label: 'Client n\'a pas attendu', count: 340 },
          { reason_id: '7', label: 'Erreur de commande', count: 210 },
          { reason_id: 'none', label: 'Motif non renseigné', count: 190 },
          { reason_id: '12', label: 'Problème cuisine', count: 90 },
        ],
        by_author_type: [
          { author_type: 'STAFF', count: 775, amount_cents: 1420000 },
          { author_type: 'PLATFORM', count: 53, amount_cents: 98000 },
          { author_type: 'CUSTOMER', count: 0, amount_cents: 0 },
          { author_type: 'SYSTEM', count: 0, amount_cents: 0 },
          { author_type: 'UNKNOWN', count: 2, amount_cents: 4200 },
        ],
        by_channel: [
          { channel: 'dine_in', count: 520, amount_cents: 950000 },
          { channel: 'takeaway', count: 210, amount_cents: 380000 },
          { channel: 'delivery', count: 100, amount_cents: 237382 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: CancellationsAnalyticsResponse }>(
          '/analytics/cancellations',
          { date_from: dateFrom, date_to: dateTo, ...scopeToRequestFields(scope) }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère le classement nominatif par serveur (bloc distinct, endpoint
   * séparé) — reports.staff_performance.read, PROMPT 10 §2/§6. Un 403 ici ne
   * doit masquer que ce bloc, jamais le reste de l'onglet Annulations : c'est
   * pourquoi cet appel est indépendant de getCancellationsAnalytics et non
   * groupé dans un seul Promise.all côté composant.
   */
  async getCancellationsByStaff(
    startDate: string | Date,
    endDate: string | Date,
    merchantIds?: string[]
  ): Promise<CancellationsByStaffResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        from: dateFrom,
        to: dateTo,
        min_orders_for_rate: 30,
        staff: [
          { user_id: '226', name: 'Marie Dupont', orders_created: 4102, cancelled_count: 774, rate_available: true },
          { user_id: '2', name: 'Jean Martin', orders_created: 18, cancelled_count: 1, rate_available: false },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: CancellationsByStaffResponse }>(
          '/analytics/cancellations/by-staff',
          { date_from: dateFrom, date_to: dateTo, merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données remises (PROMPT 22) — onglet Remises, branché en SQL
   * direct sur POST /analytics/discounts (internal/modules/analytics,
   * ib-welloresto-api repo), reports.sales.read, même gabarit que Produits/
   * Options (pagination et tri côté serveur sur la répartition par remise,
   * channels via ChannelFilter comme Clients/Upsell). Un seul endpoint : pas
   * de classement nominatif pour cet onglet.
   */
  async getDiscountsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    filters: DiscountsAnalyticsFilters = {}
  ): Promise<DiscountsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);
    const { channels, sortBy = 'amount', sortDir = 'desc', page = 1, pageSize = 50, merchantIds } = filters;

    const mockPeriod = (from: string, to: string): DiscountsPeriodTotals => ({
      from, to,
      total_discounted_cents: 110840,
      reconstructed_amount_cents: 110840,
      measured_amount_cents: 0,
      reconstructed_redemptions_count: 367,
      measured_redemptions_count: 0,
      discounted_orders_count: 186,
      total_orders_count: 9619,
      orders_with_discount_rate_percent: 1.93,
      reference_revenue_ttc_cents: 16016930,
      discount_rate_percent: 0.69,
    });

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        channels: channels && channels.length > 0 ? channels : [],
        measurement_complete_from: undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        current_period: mockPeriod(dateFrom, dateTo),
        previous_period: mockPeriod(dateFrom, dateTo),
        margin_impact: {
          discounted_lines_revenue_ttc_cents_total: 253040,
          discounted_lines_revenue_ttc_cents_covered: 0,
          coverage_ratio: 0,
        },
        pagination: { total_items: 1, total_pages: 1, current_page: page, limit: pageSize },
        rows: [
          { discount_id: 3, discount_name: '2 pizzas pour 12€', is_deleted: false, total_amount_cents: 110840, redemptions_count: 367, reconstructed_amount_cents: 110840, measured_amount_cents: 0 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: DiscountsAnalyticsResponse }>(
          '/analytics/discounts',
          {
            date_from: dateFrom, date_to: dateTo,
            channels: channels && channels.length > 0 ? channels : undefined,
            sort_by: sortBy, sort_dir: sortDir,
            page, page_size: pageSize,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données clients (agrégats) — onglet Clients, branché en SQL
   * direct sur POST /analytics/clients (internal/modules/analytics,
   * ib-welloresto-api repo), reports.sales.read, même gabarit que CA/
   * Commandes/Annulations. Le classement nominatif (Top Clients) est un
   * endpoint séparé, voir getClientsTop — customers.manage y est plus
   * restrictif (is_sensitive), d'où le découpage en deux appels indépendants,
   * même raison que Annulations/getCancellationsByStaff.
   *
   * channels filtre par canal (channels.ts/CHANNEL_ORDER) — vide ou omis
   * signifie "tous les canaux", jamais un filtre appliqué à moitié : 86% des
   * commandes en propre (Wello Resto) n'ont aucun client identifié, contre
   * la quasi-totalité des commandes marketplace qui en portent un, donc un
   * classement "meilleurs clients" sans ce filtre serait dominé par des
   * comptes Uber Eats/Deliveroo.
   */
  async getClientsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    channels?: string[],
    merchantIds?: string[]
  ): Promise<ClientsAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        channels: channels && channels.length > 0 ? channels : [],
        from: dateFrom,
        to: dateTo,
        coverage: { orders_with_customer_id: 1350, total_orders: 9620, coverage_ratio: 0.1403 },
        definitions: {
          recurrence: 'Part des clients actifs sur la période ayant au moins 2 commandes au total depuis toujours (pas seulement sur la période).',
          segments: 'Nouveau : première commande de tous les temps tombe dans la période. Fidèle : actif sur la période et au moins 5 commandes au total depuis toujours. Récurrent : actif sur la période, moins de 5 commandes au total. Inactif : dernière commande il y a plus de 180 jours (calculé à la date de fin de la période). Dormant : dernière commande avant la période mais il y a moins de 180 jours — ni actif ni inactif.',
          frequency: "Nombre moyen de commandes par client actif sur la période (commandes de la période ÷ clients ayant commandé sur la période) — pas l'intervalle moyen entre deux commandes.",
          inactivity: 'Dernière commande il y a plus de 180 jours, calculé à la date de fin de la période analysée — pas à la date du jour.',
        },
        no_identified_customers: false,
        identified_customers_in_period: 3341,
        new_customers_count: 3115,
        recurring_count: 523,
        recurring_rate: 0.1565,
        min_customers_for_rate: 30,
        avg_orders_per_active_customer: 1.31,
        segment_rates_available: true,
        segments: [
          { segment: 'nouveau', count: 3115, avg_basket_ttc_cents: 1450 },
          { segment: 'recurrent', count: 150, avg_basket_ttc_cents: 1620 },
          { segment: 'fidele', count: 76, avg_basket_ttc_cents: 1780 },
          { segment: 'inactif', count: 1010 },
          { segment: 'dormant', count: 0 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ClientsAnalyticsResponse }>(
          '/analytics/clients',
          {
            date_from: dateFrom, date_to: dateTo,
            channels: channels && channels.length > 0 ? channels : undefined,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère le classement nominatif Top Clients (bloc distinct, endpoint
   * séparé) — customers.manage, PROMPT 18 §2. Un 403 ici ne doit masquer que
   * ce bloc, jamais le reste de l'onglet Clients : c'est pourquoi cet appel
   * est indépendant de getClientsAnalytics et non groupé dans un seul
   * Promise.all côté composant.
   */
  async getClientsTop(
    startDate: string | Date,
    endDate: string | Date,
    channels?: string[],
    merchantIds?: string[]
  ): Promise<ClientsTopResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        channels: channels && channels.length > 0 ? channels : [],
        from: dateFrom,
        to: dateTo,
        identified_customers_in_period: 3341,
        top_clients: [
          { customer_id: '781', name: 'Augustin', lifetime_value_cents: 198160, lifetime_orders: 40, last_order_date: '2026-07-05', avg_basket_ttc_cents: 4954 },
          { customer_id: '4102', name: 'Marie Dupont', lifetime_value_cents: 87400, lifetime_orders: 22, last_order_date: '2026-06-18', avg_basket_ttc_cents: 3973 },
        ],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: ClientsTopResponse }>(
          '/analytics/clients/top',
          {
            date_from: dateFrom, date_to: dateTo,
            channels: channels && channels.length > 0 ? channels : undefined,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère les données comparatives restaurants
   */
  getRestaurantsAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    restaurantIds?: string[],
    metric: string = 'revenue'
  ): RestaurantsAnalyticsResponse {
    // Convert Date to string if needed
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const mockRestaurants: RestaurantComparative[] = [
      {
        restaurant_id: '1',
        name: 'Restaurant Paris 8ème',
        value: 14825,
        previous_period: 14200,
        evolution_percent: 4.4,
        rank: 1,
      },
      {
        restaurant_id: '2',
        name: 'Restaurant Marseille',
        value: 12450,
        previous_period: 12100,
        evolution_percent: 2.9,
        rank: 2,
      },
      {
        restaurant_id: '3',
        name: 'Restaurant Lyon',
        value: 8920,
        previous_period: 8650,
        evolution_percent: 3.1,
        rank: 3,
      },
    ];

    const mockTimeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        'Paris 8ème': Math.floor(400 + Math.random() * 200),
        'Marseille': Math.floor(350 + Math.random() * 180),
        'Lyon': Math.floor(250 + Math.random() * 120),
      };
    });

    return {
      by_restaurant: mockRestaurants,
      timeline: metric === 'revenue' ? mockTimeline : undefined,
      comparisons: {
        previous_period: { value: 38950, change: 3.8 },
        year_ago: { value: 35200, change: 14.2 },
      },
    };
  }

  /**
   * Récupère l'historique des commandes
   */
  async getOrderHistory(
    startDate: string | Date,
    endDate: string | Date,
    brands?: string[],
    orderTypes?: string[],
    statuses?: string[],
    search?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<OrderHistoryResponse> {
    const start = toUtcBoundaryISOString(startDate);
    const end = toUtcBoundaryISOString(endDate, true);
    const mockOrders: OrderHistoryItem[] = [
      {
        id: '1',
        number: '#10284',
        date: '08/04/2026',
        time: '14:32',
        customer_name: 'Marie Dubois',
        brand: 'WELLO_RESTO',
        order_type: 'IN',
        status: 'done',
        total: 45.50,
        payment_method: 'card',
      },
      {
        id: '2',
        number: '#10283',
        date: '08/04/2026',
        time: '14:15',
        customer_name: 'Jean Martin',
        brand: 'WELLO_RESTO',
        order_type: 'TAKE_AWAY',
        status: 'done',
        total: 32.80,
        payment_method: 'cash',
      },
      {
        id: '3',
        number: '#10282',
        date: '08/04/2026',
        time: '13:45',
        customer_name: 'Client anonyme',
        brand: 'UBER_EATS',
        order_type: 'DELIVERY',
        status: 'pending',
        total: 28.90,
        payment_method: 'uberpay',
      },
      {
        id: '4',
        number: '#10281',
        date: '08/04/2026',
        time: '13:20',
        customer_name: 'Sophie Bernard',
        brand: 'WELLO_RESTO',
        order_type: 'IN',
        status: 'canceled',
        total: 0,
        payment_method: 'cancelled',
      },
      {
        id: '5',
        number: '#10280',
        date: '08/04/2026',
        time: '12:55',
        customer_name: 'Pierre Durand',
        brand: 'DELIVEROO',
        order_type: 'DELIVERY',
        status: 'denied',
        total: 38.50,
        payment_method: 'applepay',
      },
    ];

    const payload = {
      date_from: start,
      date_to: end,
      channel: brands && brands.length > 0 ? brands.map((brand) => mapBrandFilterForApi(brand)).filter(Boolean) : undefined,
      order_type: orderTypes && orderTypes.length > 0 ? orderTypes.map((orderType) => mapOrderTypeFilterForApi(orderType)).filter(Boolean) : undefined,
      status: statuses && statuses.length > 0 ? statuses : undefined,
      search,
      page,
      limit,
    };

    return withMock(
      () => {
        const normalizedSearch = search?.trim().toLowerCase() || '';
        const filteredMockOrders = mockOrders.filter((order) => {
          const matchesBrand = !brands || brands.length === 0 || brands.includes(order.brand);
          const matchesOrderType = !orderTypes || orderTypes.length === 0 || orderTypes.includes(order.order_type);
          const matchesStatus = !statuses || statuses.length === 0 || statuses.includes(order.status);
          const matchesSearch = !normalizedSearch
            || order.number.toLowerCase().includes(normalizedSearch)
            || order.customer_name.toLowerCase().includes(normalizedSearch);

          return matchesBrand && matchesOrderType && matchesStatus && matchesSearch;
        });

        const totalCount = filteredMockOrders.length;
        const startIndex = (page - 1) * limit;
        const paginatedOrders = filteredMockOrders.slice(startIndex, startIndex + limit);
        const totalRevenue = filteredMockOrders.reduce((sum, o) => sum + o.total, 0);
        const avgBasket = totalCount > 0 ? totalRevenue / totalCount : 0;

        return {
          orders: paginatedOrders,
          total_count: totalCount,
          page,
          per_page: limit,
          total_pages: Math.max(1, Math.ceil(Math.max(totalCount, 1) / limit)),
          total_revenue: totalRevenue,
          avg_basket: avgBasket,
        };
      },
      async () => {
        const response = await apiClient.post<OrderHistoryApiResponse>('/orders/history', payload);
        const orders = (response.data.orders || []).map(mapOrderToHistoryItem);
        const metadata = response.data.metadata;
        const perPage = metadata?.limit ?? limit;
        const totalCount = metadata?.total_items ?? orders.length;
        const totalPages = metadata?.total_pages ?? (perPage > 0 ? Math.ceil(totalCount / perPage) : 1);
        const currentPage = metadata?.current_page ?? page;
        const totalRevenue = (metadata?.total_revenue ?? 0) / 100;
        const avgBasket = metadata?.avg_basket !== undefined
          ? metadata.avg_basket / 100
          : (totalCount > 0 ? totalRevenue / totalCount : 0);

        return {
          orders,
          total_count: totalCount,
          page: currentPage,
          per_page: perPage,
          total_pages: totalPages,
          total_revenue: totalRevenue,
          avg_basket: avgBasket,
        };
      },
      {
        method: 'POST',
        endpoint: '/orders/history',
        payload,
      }
    );
  }

  /**
   * Exporte les données options en CSV — reconstruit à partir des lignes déjà
   * chargées par l'onglet (la page courante), même limite que
   * exportProductsCSV (aucun endpoint CSV backend n'existe).
   */
  async exportOptionsCSV(data: OptionsAnalyticsResponse): Promise<Blob> {
    const header = 'Type,Option,Attribut,Produit,Quantité vendue,Unités concernées,Taux d\'adoption (%),CA TTC (€),Coût (€),Marge (€),Marge (%),Impact panier (€)\n';
    const rows = data.rows.map((r) => {
      const adoption = r.adoption_rate !== undefined ? r.adoption_rate.toFixed(1) : '';
      const cost = r.cost_price_cents !== undefined ? (r.cost_price_cents / 100).toFixed(2) : '';
      const margin = r.margin_cents !== undefined ? (r.margin_cents / 100).toFixed(2) : '';
      const marginPct = r.margin_percent !== undefined ? r.margin_percent.toFixed(1) : '';
      const basketImpact = r.basket_impact_cents !== undefined ? (r.basket_impact_cents / 100).toFixed(2) : '';
      return [
        r.option_type, r.name, r.attribute_name || '', r.product_name,
        r.quantity_sold, r.units_with_this, adoption,
        (r.revenue_ttc_cents / 100).toFixed(2), cost, margin, marginPct, basketImpact,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    return new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Récupère les données de vente additionnelle (agrégats + suggestions).
   * Onglet Vente additionnelle (PROMPT 19) — branché en SQL direct sur
   * POST /analytics/upsell (reports.sales.read, même porte que les 7 autres
   * onglets), remplace l'ancien GET /stats/upsell (pos.analytics seul, hors
   * du contrat unifié). Le bloc nominatif par serveur est un endpoint séparé,
   * voir getUpsellByStaff — reports.staff_performance.read est plus
   * restrictif, d'où le découpage en deux appels indépendants (même raison
   * que getCancellationsByStaff/getClientsTop).
   */
  async getUpsellAnalytics(
    startDate: string | Date,
    endDate: string | Date,
    channels?: string[],
    merchantIds?: string[]
  ): Promise<UpsellAnalyticsResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    const mockPeriod = (from: string, to: string): UpsellPeriodTotals => ({
      from, to, upsell_lines: 0, upsell_revenue_ht_cents: 0, orders_with_upsell_count: 0, total_orders_count: 1935,
    });

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        channels: channels && channels.length > 0 ? channels : [],
        instrumentation_active: false,
        current_period: mockPeriod(dateFrom, dateTo),
        previous_period: mockPeriod(dateFrom, dateTo),
        suggestions: {
          from: dateFrom, to: dateTo,
          proposed_count: 287, accepted_count: 1,
          transformation_rate_available: true, min_proposed_for_rate: 30,
        },
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: UpsellAnalyticsResponse }>(
          '/analytics/upsell',
          {
            date_from: dateFrom, date_to: dateTo,
            channels: channels && channels.length > 0 ? channels : undefined,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Récupère le classement nominatif CA upsell par serveur (bloc distinct,
   * endpoint séparé) — reports.staff_performance.read. Un 403 ici ne doit
   * masquer que ce bloc, jamais le reste de l'onglet Vente additionnelle.
   */
  async getUpsellByStaff(
    startDate: string | Date,
    endDate: string | Date,
    channels?: string[],
    merchantIds?: string[]
  ): Promise<UpsellByStaffResponse> {
    const dateFrom = toLocalDateString(startDate);
    const dateTo = toLocalDateString(endDate);

    return withMock(
      () => ({
        scope: { merchant_ids: ['mock'], group_by: 'none' },
        channels: channels && channels.length > 0 ? channels : [],
        from: dateFrom,
        to: dateTo,
        instrumentation_active: false,
        staff: [],
      }),
      async () => {
        const response = await apiClient.post<{ id: string; data: UpsellByStaffResponse }>(
          '/analytics/upsell/by-staff',
          {
            date_from: dateFrom, date_to: dateTo,
            channels: channels && channels.length > 0 ? channels : undefined,
            merchant_ids: merchantIds && merchantIds.length > 0 ? merchantIds : undefined,
          }
        );
        return response.data;
      }
    );
  }

  /**
   * Exporte les données annulations en CSV.
   * Aucun endpoint CSV backend n'existe pour ce module (seulement les deux
   * routes JSON) — contrairement à la chaîne littérale "Mock CSV export"
   * héritée du mock, ce CSV est reconstruit ligne à ligne à partir des
   * données déjà chargées par l'onglet (agrégat + nominatif), jamais
   * régénéré côté serveur. staffData est optionnel : un 403 sur
   * /by-staff ne doit pas empêcher l'export du reste.
   */
  async exportCancellationsCSV(
    data: CancellationsAnalyticsResponse,
    staffData: CancellationsByStaffResponse | null
  ): Promise<Blob> {
    const lines: string[] = [];
    const { current_period: p } = data;

    lines.push('Section,Clé,Libellé,Valeur');
    lines.push(`Période,,Du,${p.from}`);
    lines.push(`Période,,Au,${p.to}`);
    lines.push(`Agrégat,,Commandes créées,${p.total_orders_created}`);
    lines.push(`Agrégat,,Annulations totales,${p.cancelled_count}`);
    lines.push(`Agrégat,,Annulations internes (staff+client+système),${p.internal_cancelled_count}`);
    lines.push(`Agrégat,,Annulations plateforme,${p.platform_cancelled_count}`);
    lines.push(`Agrégat,,Annulations typologie non déterminée,${p.unknown_cancelled_count}`);
    lines.push(`Agrégat,,Montant perdu (centimes),${p.cancelled_amount_cents}`);

    for (const r of data.by_reason) {
      lines.push(`Motif,${r.reason_id},${r.label.replace(/,/g, ';')},${r.count}`);
    }
    for (const a of data.by_author_type) {
      lines.push(`Typologie auteur,${a.author_type},${a.author_type},${a.count}`);
    }
    for (const c of data.by_channel) {
      lines.push(`Canal,${c.channel},${c.channel},${c.count}`);
    }

    if (staffData) {
      lines.push(`Nominatif,,Seuil taux (commandes),${staffData.min_orders_for_rate}`);
      for (const s of staffData.staff) {
        const rate = s.rate_available ? ((s.cancelled_count / s.orders_created) * 100).toFixed(2) + '%' : 'n/a';
        lines.push(`Nominatif,${s.user_id},${s.name.replace(/,/g, ';')},${s.cancelled_count} sur ${s.orders_created} (${rate})`);
      }
    }

    const csv = lines.join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Exporte les données clients en CSV.
   * Aucun endpoint CSV backend n'existe pour ce module (seulement les deux
   * routes JSON, même limite que exportCancellationsCSV) — ce CSV est
   * reconstruit ligne à ligne à partir des données déjà chargées par
   * l'onglet (agrégat + Top Clients), jamais régénéré côté serveur. topData
   * est optionnel : un 403 sur /clients/top ne doit pas empêcher l'export du
   * reste.
   */
  async exportClientsCSV(
    data: ClientsAnalyticsResponse,
    topData: ClientsTopResponse | null
  ): Promise<Blob> {
    const lines: string[] = [];

    lines.push('Section,Clé,Libellé,Valeur');
    lines.push(`Période,,Du,${data.from}`);
    lines.push(`Période,,Au,${data.to}`);
    lines.push(`Période,,Canaux,${data.channels.join(';') || 'tous'}`);
    lines.push(`Couverture,,Commandes avec client identifié,${data.coverage.orders_with_customer_id}`);
    lines.push(`Couverture,,Commandes totales sur la période,${data.coverage.total_orders}`);
    lines.push(`Couverture,,Taux de couverture,${(data.coverage.coverage_ratio * 100).toFixed(1)}%`);
    lines.push(`Agrégat,,Nouveaux clients,${data.new_customers_count}`);
    lines.push(`Agrégat,,Clients actifs sur la période,${data.identified_customers_in_period}`);
    lines.push(`Agrégat,,Clients récurrents (>=2 commandes au total),${data.recurring_count}`);
    lines.push(`Agrégat,,Taux de récurrence,${data.recurring_rate !== undefined ? (data.recurring_rate * 100).toFixed(1) + '%' : 'n/a (effectif insuffisant)'}`);
    lines.push(`Agrégat,,Fréquence d'achat moyenne,${data.avg_orders_per_active_customer.toFixed(2)}`);

    for (const s of data.segments) {
      const basket = s.avg_basket_ttc_cents !== undefined ? (s.avg_basket_ttc_cents / 100).toFixed(2) + '€' : 'n/a';
      lines.push(`Segment,${s.segment},${s.segment},${s.count} (panier moyen ${basket})`);
    }

    if (topData) {
      lines.push(`Top Clients,,Clients identifiés sur la période,${topData.identified_customers_in_period}`);
      for (const c of topData.top_clients) {
        lines.push(`Top Clients,${c.customer_id},${c.name.replace(/,/g, ';')},${(c.lifetime_value_cents / 100).toFixed(2)}€ (${c.lifetime_orders} commandes, dernière visite ${c.last_order_date})`);
      }
    }

    const csv = lines.join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Exporte les données remises en CSV. Aucun endpoint CSV backend n'existe
   * pour ce module (même limite que exportCancellationsCSV/exportClientsCSV)
   * — reconstruit ligne à ligne à partir des données déjà chargées par
   * l'onglet, y compris la répartition par remise (seulement la page
   * actuellement affichée : pagination/tri sont côté serveur).
   */
  async exportDiscountsCSV(data: DiscountsAnalyticsResponse): Promise<Blob> {
    const lines: string[] = [];
    const { current_period: p } = data;

    lines.push('Section,Clé,Libellé,Valeur');
    lines.push(`Période,,Du,${p.from}`);
    lines.push(`Période,,Au,${p.to}`);
    lines.push(`Période,,Canaux,${data.channels.join(';') || 'tous'}`);
    lines.push(`Agrégat,,Montant total remisé (centimes),${p.total_discounted_cents}`);
    lines.push(`Agrégat,,dont reconstitué avant bascule (centimes),${p.reconstructed_amount_cents}`);
    lines.push(`Agrégat,,dont mesuré en direct (centimes),${p.measured_amount_cents}`);
    lines.push(`Agrégat,,Mesure complète à partir de,${data.measurement_complete_from ?? 'jamais (aucune écriture en direct pour le moment)'}`);
    lines.push(`Agrégat,,Commandes avec remise,${p.discounted_orders_count} sur ${p.total_orders_count}`);
    lines.push(`Agrégat,,Taux de commandes avec remise,${p.orders_with_discount_rate_percent !== undefined ? p.orders_with_discount_rate_percent.toFixed(2) + '%' : 'n/a (effectif insuffisant)'}`);
    lines.push(`Agrégat,,CA de référence (centimes),${p.reference_revenue_ttc_cents}`);
    lines.push(`Agrégat,,Taux de remise moyen (sur CA de la période),${p.discount_rate_percent !== undefined ? p.discount_rate_percent.toFixed(2) + '%' : 'n/a (effectif insuffisant)'}`);
    lines.push(`Marge,,CA des lignes remisées à coût connu,${data.margin_impact.discounted_lines_revenue_ttc_cents_covered} sur ${data.margin_impact.discounted_lines_revenue_ttc_cents_total}`);
    lines.push(`Marge,,Impact sur la marge (centimes),${data.margin_impact.margin_impact_cents ?? 'non disponible'}`);

    for (const r of data.rows) {
      lines.push(`Remise,${r.discount_id},${r.discount_name.replace(/,/g, ';')}${r.is_deleted ? ' (supprimée)' : ''},${r.total_amount_cents} sur ${r.redemptions_count} utilisations`);
    }

    const csv = lines.join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }
}

export const analyticsService = new AnalyticsService();
