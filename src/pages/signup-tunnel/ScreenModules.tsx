import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { publicTunnelApi, isPublicApiError } from '@/services/publicTunnelApi';
import { formatPrice } from '@/utils/priceInputUtils';
import type { ArchetypeCode, CreateSignupContextResponse } from '@/types/signupTunnel';
import type { TunnelState } from './tunnelState';

/** The only subscription_items codes a cart can toggle — pricing.Cart.Modules
 * on the API side (see ib-welloresto-api's subscriptions.packModuleCodes and
 * pricing.Service.ResolveCheapestPlan). Same set the back-office's own
 * subscription management screen (chantier 3c) exposes, kept as a local
 * constant here since this pre-account tunnel never imports authenticated
 * app services (see publicTunnelApi's own doc comment on why). */
const MODULE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'reservation', label: 'Réservations' },
  { code: 'haccp', label: 'HACCP' },
  { code: 'planning', label: 'Planning' },
  { code: 'marketplaces', label: 'Marketplaces' },
  { code: 'delivery', label: 'Livraison' },
];

const REPRICE_DEBOUNCE_MS = 500;

interface ScreenModulesProps {
  state: TunnelState;
  archetypeCode: ArchetypeCode;
  onPatchState: (patch: Partial<TunnelState>) => void;
  onSubmit: (acceptsTerms: boolean, acceptsMarketing: boolean) => void;
  onBack: () => void;
  submitting: boolean;
  submitError?: string | null;
}

/**
 * LOT B chantier 4b — nouvel écran entre le choix du type de restauration
 * et la création du compte.
 *
 * Pré-cochage :
 *  - un context_token existant (panier du configurateur vitrine, Chantier
 *    11) pré-coche exactement ses modules (state.cartModules) ;
 *  - sinon, GET /v1/public/presets/{code}/suggested-modules (LOT B
 *    chantier 2) pré-coche les modules suggérés par le préréglage choisi,
 *    avec un badge "fréquemment choisi pour ce type d'établissement".
 *
 * Le client peut cocher/décocher librement. Le prix affiché revient
 * toujours de POST /v1/public/signup-context (résolution du pack le moins
 * cher, Chantier 11 déjà en place) — jamais recalculé ici. Chaque
 * changement de sélection réécrit contextToken/resolvedPlan/cartModules
 * dans l'état du tunnel, si bien que la soumission finale (POST /v1/signup)
 * porte déjà le bon context_token.
 */
export const ScreenModules = ({
  state,
  archetypeCode,
  onPatchState,
  onSubmit,
  onBack,
  submitting,
  submitError,
}: ScreenModulesProps) => {
  const hasCartFromContext = !!state.contextToken && !!state.cartModules;

  const [selected, setSelected] = useState<Set<string>>(() => new Set(hasCartFromContext ? state.cartModules ?? [] : []));
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(!hasCartFromContext);
  const [pricing, setPricing] = useState(state.resolvedPlan);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [acceptsTerms, setAcceptsTerms] = useState(state.acceptsTerms);
  const [acceptsMarketing, setAcceptsMarketing] = useState(state.acceptsMarketing);

  // Initial pre-check — vitrine cart if we already have one, otherwise the
  // preset's suggested_modules. Runs once; the archetype was already fixed
  // on the previous screen.
  useEffect(() => {
    if (hasCartFromContext) return;

    let cancelled = false;
    publicTunnelApi
      .get<{ suggested_modules: string[] }>(`/v1/public/presets/${encodeURIComponent(archetypeCode)}/suggested-modules`)
      .then((resp) => {
        if (cancelled) return;
        const codes = (resp.suggested_modules ?? []).filter((code) => MODULE_OPTIONS.some((m) => m.code === code));
        setSelected(new Set(codes));
        setSuggested(new Set(codes));
      })
      .catch(() => {
        // No suggestion available for this preset — nothing pre-checked,
        // never blocks the screen (same posture as the ?ctx= restore in
        // CreerMonCompte.tsx).
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-price on every selection change, server-side only (§ "jamais
  // recalculé côté client"). Debounced so rapid toggling doesn't spam the
  // IP-rate-limited signup-context endpoint (30/h — see the API's
  // signupContextIPThrottleMax).
  useEffect(() => {
    if (loadingSuggestions) return;

    setPricingLoading(true);
    setPricingError(null);
    const modules = Array.from(selected);

    const timer = setTimeout(() => {
      publicTunnelApi
        .post<CreateSignupContextResponse>('/v1/public/signup-context', {
          segment: archetypeCode,
          cart: { modules, employees: 0, kiosks: 0, extra_pos: 0, billing_cycle: 'monthly' },
        })
        .then((resp) => {
          setPricing(resp.resolved_plan);
          onPatchState({
            contextToken: resp.context_token,
            resolvedPlan: resp.resolved_plan,
            cartModules: modules,
          });
        })
        .catch((err) => {
          setPricingError(isPublicApiError(err) ? err.message : 'Impossible de calculer le prix pour le moment.');
        })
        .finally(() => setPricingLoading(false));
    }, REPRICE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loadingSuggestions]);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const canContinue = acceptsTerms && !pricingLoading && !!pricing && !submitting;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Vos modules</h1>
        <p className="text-sm text-slate-600">L'étape 4 sur 4 — ajustez librement, le prix se met à jour automatiquement.</p>
      </div>

      <div className="space-y-2">
        {MODULE_OPTIONS.map((m) => (
          <label
            key={m.code}
            className={`flex flex-col gap-1.5 rounded-xl border p-3 cursor-pointer transition-colors ${
              selected.has(m.code) ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                checked={selected.has(m.code)}
                onChange={() => toggle(m.code)}
                className="h-4 w-4"
              />
              {m.label}
            </span>
            {suggested.has(m.code) && (
              <span className="ml-6 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                fréquemment choisi pour ce type d'établissement
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
        {pricingLoading ? (
          <p className="text-slate-500">Calcul du prix…</p>
        ) : pricingError ? (
          <p className="text-destructive">{pricingError}</p>
        ) : pricing ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Total mensuel estimé</span>
              <span>{formatPrice(pricing.monthly_total_cents)}</span>
            </div>
            <p className="text-xs text-slate-500">Plan {pricing.plan_code} — inclut automatiquement le pack le moins cher pour vos modules.</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 pt-2">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptsTerms}
            onChange={(e) => setAcceptsTerms(e.target.checked)}
            className="mt-0.5"
            required
          />
          <span>J'accepte les conditions générales d'utilisation.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptsMarketing}
            onChange={(e) => setAcceptsMarketing(e.target.checked)}
            className="mt-0.5"
          />
          <span>Je souhaite recevoir des conseils et actualités par e-mail (facultatif).</span>
        </label>
      </div>

      {submitError && <p className="text-sm text-destructive text-center">{submitError}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="h-12 px-6 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Retour
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onSubmit(acceptsTerms, acceptsMarketing)}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
            rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {submitting ? 'Création du compte...' : 'Créer mon compte'}
        </button>
      </div>
    </div>
  );
};
