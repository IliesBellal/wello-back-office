import { useEffect, useState } from 'react';
import { RESTAURATION_ARCHETYPES, archetypeFromNAF, type ArchetypeCode } from '@/types/signupTunnel';
import { CheckCircle2 } from 'lucide-react';
import type { TunnelState } from './tunnelState';

/**
 * Three-line summary of what each archetype activates — content taken from
 * migration 131's actual v2 config (LOT A Semaine 3, Chantier 9), not the
 * unavailable §5.5 reference doc, so it's accurate to what ApplyPreset
 * really does rather than a guess.
 */
const ARCHETYPE_SUMMARY: Record<ArchetypeCode, string[]> = {
  traditional: ['Service à table, salle et terrasse (20 couverts).', 'Couverts requis à la commande.', 'Suggestions : réservation, planning.'],
  brasserie: ['Salle, comptoir et terrasse (25 couverts).', 'Couverts requis à la commande.', 'Suggestions : planning, HACCP.'],
  pizzeria: ['Sur place, à emporter et livraison.', 'Salle unique (10 tables).', 'Suggestions : marketplaces, livraison.'],
  fast_food: ['Sur place, à emporter et livraison, sans plan de salle.', 'Numéro de commande appelé.', 'Suggestions : borne, marketplaces, livraison.'],
  snack: ['Sur place, à emporter et livraison, sans plan de salle.', 'Numéro de commande appelé.', 'Suggestions : marketplaces, HACCP.'],
  bakery: ['Vente sur place et à emporter, sans plan de salle.', 'Pas de numéro de commande appelé.', 'Suggestions : HACCP, planning.'],
};

interface ScreenRestaurationTypeProps {
  state: TunnelState;
  onSubmit: (archetypeCode: ArchetypeCode, acceptsTerms: boolean, acceptsMarketing: boolean) => void;
  onBack: () => void;
  submitting: boolean;
  submitError?: string | null;
}

/**
 * LOT A Semaine 3, Chantier 14, §5.5 — six tiles, one pre-selected from the
 * resolved NAF code (Chantier 12) or, failing that, the context_token's
 * segment (Chantier 11) — §5.5.1's real table. Pre-selection is a
 * best-effort suggestion, always changeable.
 *
 * Also carries §5.6's accepts_terms/accepts_marketing consent — collected
 * here, the one screen both identity paths (password and Google) converge
 * on before the single POST /v1/signup call.
 */
export const ScreenRestaurationType = ({ state, onSubmit, onBack, submitting, submitError }: ScreenRestaurationTypeProps) => {
  const [selected, setSelected] = useState<ArchetypeCode | null>(null);
  const [acceptsTerms, setAcceptsTerms] = useState(state.acceptsTerms);
  const [acceptsMarketing, setAcceptsMarketing] = useState(state.acceptsMarketing);

  useEffect(() => {
    if (selected) return;
    const fromNAF = archetypeFromNAF(state.naf);
    const fromSegment = RESTAURATION_ARCHETYPES.find((a) => a.code === state.segment)?.code ?? null;
    setSelected(fromNAF ?? fromSegment ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.naf, state.segment]);

  const canContinue = !!selected && acceptsTerms;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Votre type d'établissement</h1>
        <p className="text-sm text-slate-600">L'étape 3 sur 3 — pour préconfigurer votre caisse.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {RESTAURATION_ARCHETYPES.map((a) => (
          <button
            key={a.code}
            type="button"
            onClick={() => setSelected(a.code)}
            className={`relative text-left rounded-xl border p-4 transition-colors ${
              selected === a.code ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            {selected === a.code && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />}
            <span className="font-semibold text-sm text-slate-900">{a.label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
          {ARCHETYPE_SUMMARY[selected].map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {!selected && (
        <button
          type="button"
          onClick={() => setSelected('traditional')}
          className="w-full text-sm text-slate-500 hover:text-slate-700 text-center underline transition-colors"
        >
          je changerai plus tard
        </button>
      )}

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
          disabled={!canContinue || submitting}
          onClick={() => selected && onSubmit(selected, acceptsTerms, acceptsMarketing)}
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
