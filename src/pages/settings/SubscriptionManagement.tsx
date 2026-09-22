/**
 * LOT B chantier 3c — écran de gestion d'abonnement (§7.7).
 *
 * Composition actuelle : GET /subscriptions/current (distinct de /preview,
 * qui calcule toujours un changement hypothétique — jamais l'état réel).
 * Ajout/retrait de module : GET /subscriptions/preview (lecture seule) puis
 * POST /subscriptions/items (écrit réellement). La comparaison pack-vs-à-la-
 * carte (§7.7) vient telle quelle de la réponse serveur, jamais recalculée
 * ici.
 */
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CreditCard, Package, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { SettingsCard, SettingsGrid, SettingsPageContainer } from "@/components/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { usePermissions } from "@/hooks/usePermissions";
import { qk } from "@/lib/queryKeys";
import { formatPrice } from "@/utils/priceInputUtils";
import { billingApi } from "@/services/billingService";
import {
  SUBSCRIPTION_MODULE_CODES,
  subscriptionsApi,
  type SubscriptionAmount,
} from "@/services/subscriptionsService";

export default function SubscriptionManagement() {
  const { canManageSettings } = usePermissions();
  if (!canManageSettings) {
    return <Navigate to="/" replace />;
  }
  return <SubscriptionManagementContent />;
}

function SubscriptionManagementContent() {
  const currentQ = useQuery({
    queryKey: qk.subscriptions.current,
    queryFn: () => subscriptionsApi.getCurrent(),
  });

  const activationQ = useQuery({
    queryKey: qk.billing.activationStatus,
    queryFn: () => billingApi.getActivationStatus(),
  });

  return (
    <DashboardLayout>
      <PageContainer
        header={<h1 className="text-3xl font-bold text-foreground">Abonnement & facturation</h1>}
        description="Consultez votre abonnement WelloResto et gérez les modules activés."
      >
        {currentQ.isLoading ? (
          <SettingsPageContainer>
            <SettingsGrid>
              <SettingsCard title="Chargement…">
                <Skeleton className="h-32 w-full" />
              </SettingsCard>
            </SettingsGrid>
          </SettingsPageContainer>
        ) : currentQ.error || !currentQ.data ? (
          <SettingsPageContainer>
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Impossible de charger votre abonnement.</p>
                <p className="text-sm">{(currentQ.error as Error | null)?.message ?? "Erreur inconnue."}</p>
              </div>
            </div>
          </SettingsPageContainer>
        ) : (
          <SettingsPageContainer>
            <SettingsGrid>
              <CompositionCard current={currentQ.data} />
              <ModulesCard current={currentQ.data} />
              <BillingCard
                activationState={activationQ.data?.activation_state}
                subscriptionStatus={activationQ.data?.subscription_status}
              />
            </SettingsGrid>
          </SettingsPageContainer>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Composition actuelle
// ─────────────────────────────────────────────────────────────────────────

function CompositionCard({ current }: { current: SubscriptionAmount }) {
  return (
    <SettingsCard title="Composition actuelle" description="Ce que vous payez aujourd'hui." icon={Package}>
      <div className="space-y-2">
        {current.breakdown.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun produit souscrit.</p>
        ) : (
          current.breakdown.map((line) => (
            <div key={line.code} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{line.code}</span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {line.kind}
                </Badge>
                {line.quantity !== 1 && <span className="text-xs text-muted-foreground">× {line.quantity}</span>}
              </div>
              <span className="font-medium">{formatPrice(line.amount_cents)}</span>
            </div>
          ))
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold">
          <span>Total {current.billing_cycle === "annual" ? "annuel" : "mensuel"}</span>
          <span>{formatPrice(current.total_cents)}</span>
        </div>
        {current.overridden && (
          <p className="text-xs italic text-muted-foreground">
            Un tarif dérogatoire s'applique — le détail ci-dessus reste indicatif.
          </p>
        )}
      </div>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Modules — add/remove + preview
// ─────────────────────────────────────────────────────────────────────────

function ModulesCard({ current }: { current: SubscriptionAmount }) {
  const qc = useQueryClient();

  const activeModuleCodes = useMemo(
    () => new Set(current.breakdown.filter((l) => l.kind === "module").map((l) => l.code)),
    [current.breakdown],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(activeModuleCodes));

  const add = useMemo(
    () => SUBSCRIPTION_MODULE_CODES.map((m) => m.code).filter((c) => selected.has(c) && !activeModuleCodes.has(c)),
    [selected, activeModuleCodes],
  );
  const remove = useMemo(
    () => SUBSCRIPTION_MODULE_CODES.map((m) => m.code).filter((c) => !selected.has(c) && activeModuleCodes.has(c)),
    [selected, activeModuleCodes],
  );
  const dirty = add.length > 0 || remove.length > 0;

  const previewQ = useQuery({
    queryKey: qk.subscriptions.preview(add, remove),
    queryFn: () => subscriptionsApi.preview(add, remove),
    enabled: dirty,
  });

  const applyMut = useMutation({
    mutationFn: () => subscriptionsApi.applyItems(add, remove),
    onSuccess: (amount) => {
      toast.success("Abonnement mis à jour.");
      qc.setQueryData(qk.subscriptions.current, amount);
      qc.invalidateQueries({ queryKey: qk.billing.activationStatus });
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message ?? "Échec de la mise à jour de l'abonnement.");
    },
  });

  const toggle = (code: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const reset = () => setSelected(new Set(activeModuleCodes));

  return (
    <SettingsCard
      title="Modules"
      description="Ajoutez ou retirez des modules à la carte."
      icon={Sparkles}
      colSpan="full"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUBSCRIPTION_MODULE_CODES.map((m) => (
          <label
            key={m.code}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
          >
            <Checkbox checked={selected.has(m.code)} onCheckedChange={(v) => toggle(m.code, v === true)} />
            {m.label}
          </label>
        ))}
      </div>

      {dirty && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
          {previewQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : previewQ.error ? (
            <p className="text-sm text-destructive">
              {(previewQ.error as Error)?.message ?? "Impossible de calculer l'aperçu du changement."}
            </p>
          ) : previewQ.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total actuel</span>
                <span>{formatPrice(previewQ.data.current_total_cents)}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>Nouveau total</span>
                <span>{formatPrice(previewQ.data.new_total_cents)}</span>
              </div>
              {previewQ.data.prorata_cents !== 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ajustement au prorata (période en cours)</span>
                  <span>{formatPrice(previewQ.data.prorata_cents)}</span>
                </div>
              )}
              {previewQ.data.pack_cheaper && previewQ.data.pack_comparison && (
                <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                  Un pack tout-inclus ({previewQ.data.pack_comparison.plan_code}) reviendrait moins cher :{" "}
                  {formatPrice(previewQ.data.pack_comparison.monthly_total_cents)} / mois.
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={reset} disabled={applyMut.isPending}>
              Annuler
            </Button>
            <Button onClick={() => applyMut.mutate()} disabled={applyMut.isPending || previewQ.isLoading}>
              {applyMut.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Facturation — portail Stripe + relance impayé
// ─────────────────────────────────────────────────────────────────────────

function BillingCard({
  activationState,
  subscriptionStatus,
}: {
  activationState?: string;
  subscriptionStatus?: string;
}) {
  const [openingPortal, setOpeningPortal] = useState(false);

  const retryMut = useMutation({
    mutationFn: () => billingApi.retryNow(),
    onSuccess: () => toast.success("Nouvelle tentative de paiement lancée."),
    onError: (err: unknown) => toast.error((err as Error)?.message ?? "Échec de la relance du paiement."),
  });

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await billingApi.createPortalSession(window.location.href);
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error)?.message ?? "Impossible d'ouvrir le portail de facturation.");
      setOpeningPortal(false);
    }
  };

  return (
    <SettingsCard title="Facturation" description="Moyen de paiement, factures et relances." icon={CreditCard}>
      <div className="space-y-3">
        {activationState === "SETUP" ? (
          <Button asChild className="w-full">
            <Link to="/settings/billing/payment-method">Configurer mon moyen de paiement</Link>
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={openPortal} disabled={openingPortal}>
            {openingPortal ? "Ouverture…" : "Historique des factures / changer d'IBAN"}
          </Button>
        )}

        {subscriptionStatus === "past_due" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="mb-2 font-medium">Un paiement est en attente.</p>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white/60 hover:bg-white"
              onClick={() => retryMut.mutate()}
              disabled={retryMut.isPending}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {retryMut.isPending ? "Nouvelle tentative…" : "Réessayer maintenant"}
            </Button>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
