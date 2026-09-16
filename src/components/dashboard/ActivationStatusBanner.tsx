import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { qk } from "@/lib/queryKeys";
import { billingApi } from "@/services/billingService";

/**
 * Persistent activation/trial banner (LOT B §7.6) — mounted once in
 * DashboardLayout so it spans every authenticated page, not a route of its
 * own. Always reads GET /merchant/activation-status fresh (never the
 * login-cached user object, which auth.Service caches server-side for 60
 * minutes — see the API's own doc comment on that endpoint) so it disappears
 * immediately once a merchant goes LIVE, not up to an hour later.
 *
 * Two distinct messages, mutually exclusive, matching the two cases the
 * endpoint actually carries — invisible in every other case (LIVE without a
 * trial, or SUSPENDED, which has its own separate treatment per §7.6).
 */
export function ActivationStatusBanner() {
  const { data } = useQuery({
    queryKey: qk.billing.activationStatus,
    queryFn: () => billingApi.getActivationStatus(),
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!data) return null;

  if (data.activation_state === "SETUP") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium">
            Mode configuration — renseignez un moyen de paiement pour activer votre caisse
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white/60 hover:bg-white">
          <Link to="/settings/billing/payment-method">Configurer mon moyen de paiement</Link>
        </Button>
      </div>
    );
  }

  if (data.trial_ends_at) {
    const formattedDate = format(new Date(data.trial_ends_at), "d MMMM yyyy", { locale: fr });
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium">
            Votre accès gratuit se termine le {formattedDate}. Renseignez un moyen de paiement pour continuer sans interruption.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="border-blue-300 bg-white/60 hover:bg-white">
          <Link to="/settings/billing/payment-method">Configurer mon moyen de paiement</Link>
        </Button>
      </div>
    );
  }

  return null;
}
