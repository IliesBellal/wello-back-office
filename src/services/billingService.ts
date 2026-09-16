/**
 * Typed API client for LOT B's platform billing surface — the merchant's OWN
 * subscription to WelloResto (activation status, SEPA mandate, billing
 * portal, dunning retry). Distinct from integrationsService's Stripe Connect
 * functions, which are about the merchant's END CUSTOMERS paying THEM.
 *
 * Endpoint paths mirror ib-welloresto-api/cmd/api/routes.go EXACTLY — all
 * root-mounted (no `/v1` prefix): see docs/decisions.md's "bug du préfixe
 * /v1/" entry in that repo for why this matters.
 */

import { apiClient, logAPI } from "@/services/apiClient";
import type { WelloApiResponse } from "@/services/apiClient";
import { unwrap } from "@/services/apiUnwrap";
import type { ApiEnvelopeData } from "@/services/apiUnwrap";

export interface ActivationStatus {
  activation_state: "SETUP" | "LIVE";
  subscription_status: string;
  /** Set only while this merchant is LIVE via an active, unexpired trial (§7.3). */
  trial_ends_at?: string | null;
}

export const billingApi = {
  /** GET /merchant/activation-status — always fresh, never read from the cached login/user object (see banner's own doc comment). */
  getActivationStatus(): Promise<ActivationStatus> {
    logAPI("GET", "/merchant/activation-status");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/merchant/activation-status", { suppressErrorToast: true })
      .then((resp) => unwrap<{ activation_status: ActivationStatus } & Record<string, unknown>>(resp).activation_status);
  },

  /** POST /billing/sepa/setup — returns a Stripe SetupIntent client_secret for the SEPA Debit Element. */
  createSepaSetup(): Promise<{ client_secret: string }> {
    logAPI("POST", "/billing/sepa/setup");
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/billing/sepa/setup", {})
      .then((resp) => unwrap<{ client_secret: string } & Record<string, unknown>>(resp));
  },

  /** POST /billing/portal — returns a Stripe-hosted Customer Portal URL (invoices, IBAN change). */
  createPortalSession(returnUrl: string): Promise<{ url: string }> {
    logAPI("POST", "/billing/portal", { return_url: returnUrl });
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/billing/portal", { return_url: returnUrl })
      .then((resp) => unwrap<{ url: string } & Record<string, unknown>>(resp));
  },

  /** POST /billing/retry-now — retries the merchant's latest open invoice against the payment method already on file. */
  retryNow(): Promise<void> {
    logAPI("POST", "/billing/retry-now");
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/billing/retry-now", {})
      .then((resp) => {
        unwrap(resp);
      });
  },
};
