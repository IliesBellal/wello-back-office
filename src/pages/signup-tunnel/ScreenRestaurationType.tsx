import { useEffect, useState } from 'react';
import { RESTAURATION_ARCHETYPES, archetypeFromNAF, type ArchetypeCode } from '@/types/signupTunnel';
import { Beer, CheckCircle2, Croissant, Pizza, Sandwich, ShoppingBag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { TunnelState } from './tunnelState';

const ARCHETYPE_VISUALS: Record<ArchetypeCode, { icon: LucideIcon; tint: string }> = {
  traditional: { icon: UtensilsCrossed, tint: 'bg-blue-50 text-blue-600' },
  brasserie: { icon: Beer, tint: 'bg-amber-50 text-amber-600' },
  pizzeria: { icon: Pizza, tint: 'bg-red-50 text-red-600' },
  fast_food: { icon: Sandwich, tint: 'bg-orange-50 text-orange-600' },
  snack: { icon: ShoppingBag, tint: 'bg-emerald-50 text-emerald-600' },
  bakery: { icon: Croissant, tint: 'bg-yellow-50 text-yellow-700' },
};

const ArchetypeIcon = ({ code }: { code: ArchetypeCode }) => {
  const Icon = ARCHETYPE_VISUALS[code].icon;
  return <Icon className="h-6 w-6" strokeWidth={1.75} />;
};

interface ScreenRestaurationTypeProps {
  state: TunnelState;
  onNext: (archetypeCode: ArchetypeCode) => void;
  onBack: () => void;
}

/**
 * LOT A Semaine 3, Chantier 14, §5.5 — six tiles, one pre-selected from the
 * resolved NAF code (Chantier 12) or, failing that, the context_token's
 * segment (Chantier 11) — §5.5.1's real table. Pre-selection is a
 * best-effort suggestion, always changeable.
 *
 * LOT B chantier 4a (2026-09-15) : le résumé en trois lignes de ce que le
 * préréglage active a été retiré (spec explicite). Le consentement et la
 * soumission finale, qui vivaient ici, sont passés à l'écran 4
 * (ScreenModules) — cet écran ne fait plus que le choix d'archétype.
 */
export const ScreenRestaurationType = ({ state, onNext, onBack }: ScreenRestaurationTypeProps) => {
  const [selected, setSelected] = useState<ArchetypeCode | null>(state.archetypeCode);

  useEffect(() => {
    if (selected) return;
    const fromNAF = archetypeFromNAF(state.naf);
    const fromSegment = RESTAURATION_ARCHETYPES.find((a) => a.code === state.segment)?.code ?? null;
    setSelected(fromNAF ?? fromSegment ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.naf, state.segment]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Votre type d'établissement</h1>
        <p className="text-sm text-slate-600">L'étape 3 sur 4 — pour préconfigurer votre caisse.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {RESTAURATION_ARCHETYPES.map((a) => (
          <button
            key={a.code}
            type="button"
            onClick={() => setSelected(a.code)}
            className={`relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors ${
              selected === a.code ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            {selected === a.code && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />}
            <span className={`flex h-12 w-12 items-center justify-center rounded-full ${ARCHETYPE_VISUALS[a.code].tint}`}>
              <ArchetypeIcon code={a.code} />
            </span>
            <span className="font-semibold text-sm text-slate-900">{a.label}</span>
          </button>
        ))}
      </div>

      {!selected && (
        <button
          type="button"
          onClick={() => setSelected('traditional')}
          className="w-full text-sm text-slate-500 hover:text-slate-700 text-center underline transition-colors"
        >
          je changerai plus tard
        </button>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
            rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          Continuer
        </button>
      </div>
    </div>
  );
};
