import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '@/services/authService';
import { publicTunnelApi, isPublicApiError } from '@/services/publicTunnelApi';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from '@/lib/idempotencyKey';
import type {
  ArchetypeCode,
  GetSignupContextResponse,
  SignupRequestPayload,
  SignupResponsePayload,
} from '@/types/signupTunnel';
import { initialTunnelState, type TunnelState } from './tunnelState';
import { ScreenIdentity } from './ScreenIdentity';
import { ScreenEstablishment } from './ScreenEstablishment';
import { ScreenRestaurationType } from './ScreenRestaurationType';

type Step = 1 | 2 | 3;

/**
 * LOT A Semaine 3, Chantier 14 — /creer-mon-compte, the public self-onboarding
 * tunnel: three one-field-at-a-time screens (§5.2/§5.4/§5.5), submitted once
 * at the end (the API's POST /v1/signup is atomic — there is no partial
 * "save screen 1" call to make, so cross-device resume of an IN-PROGRESS
 * tunnel is not implemented here; only the ?ctx= pre-signup context from the
 * vitrine site, which IS a real per-screen backend resource, is restored).
 * State otherwise lives in memory (+ this component's own effect below
 * persists it to sessionStorage so an accidental refresh on the SAME device
 * doesn't lose progress — a smaller guarantee than the brief's "reprise sur
 * un autre appareil", called out explicitly in the chantier report).
 */
const CreerMonCompte = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<TunnelState>(() => {
    const saved = sessionStorage.getItem('signup-tunnel:state');
    return saved ? { ...initialTunnelState, ...JSON.parse(saved) } : initialTunnelState;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailTakenError, setEmailTakenError] = useState(false);

  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem('signup-tunnel:state', JSON.stringify(state));
  }, [state]);

  // Restore a pre-signup context from the vitrine site (?ctx=<token>,
  // Chantier 11) — the price shown must always come from this server call,
  // never be inferred client-side.
  useEffect(() => {
    const ctx = searchParams.get('ctx');
    if (!ctx || state.contextToken === ctx) return;

    publicTunnelApi
      .get<GetSignupContextResponse>(`/v1/public/signup-context/${encodeURIComponent(ctx)}`)
      .then((resp) => {
        setState((prev) => ({
          ...prev,
          contextToken: ctx,
          resolvedPlan: resp.resolved_plan,
          segment: resp.segment ?? null,
        }));
      })
      .catch(() => {
        // An expired/unknown context must never block the tunnel — proceed
        // without it, same posture as companies/resolve's own degradation.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const patchState = (patch: Partial<TunnelState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setEmailTakenError(false);
    setSubmitError(null);
  };

  const goToStep2 = (patch: Partial<TunnelState>) => {
    patchState(patch);
    setStep(2);
  };

  const goToStep3 = (patch: Partial<TunnelState>) => {
    patchState(patch);
    setStep(3);
  };

  const handleFinalSubmit = async (archetypeCode: ArchetypeCode, acceptsTerms: boolean, acceptsMarketing: boolean) => {
    setSubmitting(true);
    setSubmitError(null);

    // §5.6's exact nested shape.
    const payload: SignupRequestPayload = {
      context_token: state.contextToken ?? undefined,
      identity: {
        provider: state.provider,
        email: state.provider === 'password' ? state.email : undefined,
        password: state.provider === 'password' ? state.password : undefined,
        id_token: state.provider === 'google' ? state.idToken ?? undefined : undefined,
        first_name: state.firstName,
        last_name: state.lastName,
      },
      merchant: {
        full_name: state.businessName,
        address: state.address,
        zip_code: state.zipCode,
        city: state.city,
        country: state.country,
        lat: state.lat,
        lng: state.lng,
        tel: state.phone,
        email: state.email,
        siret: state.siret,
        place_id: state.placeId,
      },
      preset_code: archetypeCode,
      accepts_terms: acceptsTerms,
      accepts_marketing: acceptsMarketing,
    };

    try {
      const result = await publicTunnelApi.post<SignupResponsePayload>('/v1/signup', payload, {
        'Idempotency-Key': getOrCreateIdempotencyKey(),
      });

      // The signup response's token is the opaque users_rights.token —
      // exchange it for a real session the same way CreateEstablishmentDialog
      // already does (loginWithToken -> setAuthData), then enter the app.
      const session = await authService.loginWithToken(result.token);
      setAuthData(session.data);
      clearIdempotencyKey();
      sessionStorage.removeItem('signup-tunnel:state');
      navigate('/');
    } catch (error) {
      // A real HTTP response means the API already resolved this
      // Idempotency-Key to a terminal (failed) session — retrying with the
      // SAME key would just replay this exact cached error for up to
      // SignupSessionTTL (24h) server-side, even after the payload is fixed
      // (see signup/handler.go's replay()). Only a network-level failure
      // (no response reaches us at all) keeps the key, so that retry can
      // still safely dedupe against a request that may have gone through.
      if (isPublicApiError(error)) {
        clearIdempotencyKey();
      }
      if (isPublicApiError(error) && error.code === 'email_already_used') {
        setEmailTakenError(true);
        setStep(1);
        return;
      }
      if (isPublicApiError(error) && (error.code === 'invalid_siret_format' || error.code === 'siret_already_registered')) {
        setStep(2);
        setSubmitError(
          error.code === 'siret_already_registered'
            ? 'Cet établissement semble déjà enregistré. Contactez-nous pour être rattaché.'
            : 'Le SIRET saisi est invalide. Vérifiez-le et réessayez.',
        );
        return;
      }
      setSubmitError(
        error instanceof Error ? error.message : "Impossible de créer le compte. Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden p-6 md:p-8">
          <div className="flex gap-1.5 mb-6" aria-hidden>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {step === 1 && (
            <ScreenIdentity state={state} onNext={goToStep2} emailTakenError={emailTakenError} />
          )}
          {step === 2 && (
            <ScreenEstablishment state={state} onNext={goToStep3} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <ScreenRestaurationType
              state={state}
              onSubmit={handleFinalSubmit}
              onBack={() => setStep(2)}
              submitting={submitting}
              submitError={submitError}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CreerMonCompte;
