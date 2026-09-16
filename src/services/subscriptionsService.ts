/**
 * Typed API client for LOT B's subscription composition surface —
 * subscription_items (what the merchant is actually billed for). Endpoint
 * paths mirror ib-welloresto-api/cmd/api/routes.go EXACTLY, root-mounted
 * (no `/v1` prefix).
 */

import { apiClient, logAPI } from "@/services/apiClient";
import type { WelloApiResponse } from "@/services/apiClient";
import { unwrap } from "@/services/apiUnwrap";
import type { ApiEnvelopeData } from "@/services/apiUnwrap";

export interface SubscriptionBreakdownLine {
  code: string;
  kind: string;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
}

export interface SubscriptionAmount {
  merchant_id: string;
  billing_cycle: string;
  overridden: boolean;
  total_cents: number;
  breakdown: SubscriptionBreakdownLine[];
}

export interface PackComparison {
  plan_code: string;
  monthly_total_cents: number;
}

export interface SubscriptionPreview {
  merchant_id: string;
  current_total_cents: number;
  new_total_cents: number;
  prorata_cents: number;
  pack_cheaper: boolean;
  pack_comparison?: PackComparison;
  after_breakdown: SubscriptionBreakdownLine[];
}

/** Toggleable à-la-carte modules — the only codes ApplyItems can actually
 * price (see resolveUnitPriceCents in the API): plan codes (essentiel/pro/
 * complet) are a separate plan-change concept, and kiosk/sms/metered codes
 * have no self-service on/off toggle. */
export const SUBSCRIPTION_MODULE_CODES: Array<{ code: string; label: string }> = [
  { code: "reservation", label: "Réservations" },
  { code: "haccp", label: "HACCP" },
  { code: "planning", label: "Planning" },
  { code: "marketplaces", label: "Marketplaces" },
  { code: "delivery", label: "Livraison" },
];

export const subscriptionsApi = {
  /** GET /subscriptions/current — actual active composition, no hypothetical change. */
  getCurrent(): Promise<SubscriptionAmount> {
    logAPI("GET", "/subscriptions/current");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/subscriptions/current")
      .then((resp) => unwrap<{ current: SubscriptionAmount } & Record<string, unknown>>(resp).current);
  },

  /** GET /subscriptions/preview?add=...&remove=... — read-only simulation, writes nothing. */
  preview(add: string[], remove: string[]): Promise<SubscriptionPreview> {
    const params = new URLSearchParams();
    if (add.length > 0) params.set("add", add.join(","));
    if (remove.length > 0) params.set("remove", remove.join(","));
    const qs = params.toString();
    const endpoint = `/subscriptions/preview${qs ? `?${qs}` : ""}`;
    logAPI("GET", endpoint);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(endpoint)
      .then((resp) => unwrap<{ preview: SubscriptionPreview } & Record<string, unknown>>(resp).preview);
  },

  /** POST /subscriptions/items — applies add/remove for real. */
  applyItems(add: string[], remove: string[]): Promise<SubscriptionAmount> {
    logAPI("POST", "/subscriptions/items", { add, remove });
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/subscriptions/items", { add, remove })
      .then((resp) => unwrap<{ amount: SubscriptionAmount } & Record<string, unknown>>(resp).amount);
  },
};
