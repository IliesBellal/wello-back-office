import { ChevronRight, Sparkles, X } from 'lucide-react';
import type { EngineIndex } from '@/lib/assistant/engine';
import { cn } from '@/lib/utils';
import { AssistantOrb } from './AssistantBlocks';
import { QUICK_ACTIONS, type QuickAction } from './quickActions';
import { pickExamples } from './useAssistantConversation';

interface Props {
  firstName?: string;
  index: EngineIndex;
  showOnboarding: boolean;
  onDismissOnboarding: () => void;
  onQuickAction: (action: QuickAction) => void;
  onExample: (text: string) => void;
  onOpenInfo: () => void;
}

export function AssistantWelcome({ firstName, index, showOnboarding, onDismissOnboarding, onQuickAction, onExample, onOpenInfo }: Props) {
  const keys = new Set(index.intents.map((pi) => pi.intent.key));
  const actions = QUICK_ACTIONS.filter((a) => keys.has(a.intentKey));
  const examples = pickExamples(index, 6).filter((ex) => !actions.some((a) => a.label === ex)).slice(0, 4);

  return (
    <div className="flex min-h-full flex-col px-1 pb-2 pt-4">
      <div className="mb-6 px-1">
        <AssistantOrb size={44} className="mb-4" />
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
          {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
        </h2>
        <p className="text-[26px] font-semibold leading-tight tracking-tight text-muted-foreground/70">que puis-je faire&nbsp;?</p>
      </div>

      {showOnboarding && (
        <div className="relative mb-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-4 pr-10">
          <button
            type="button"
            onClick={onDismissOnboarding}
            className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Nouveau
          </p>
          <p className="mt-1 text-[14px] leading-snug">
            Parlez-moi comme à un collègue : « plus de tiramisu », « qui bosse ce soir ? ». Quand je ne comprends pas, votre choix m'apprend.
          </p>
          <button type="button" onClick={onOpenInfo} className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline">
            Comment je fonctionne <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {actions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onQuickAction(a)}
              className="group flex min-h-[92px] flex-col items-start justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all hover:-translate-y-px hover:border-border hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', a.tint)}>
                <a.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-tight">{a.label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{a.sublabel}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {examples.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Essayez de demander</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onExample(ex)}
                className="rounded-full border border-border bg-background px-3.5 py-2 text-[13px] text-foreground/90 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showOnboarding && (
        <button
          type="button"
          onClick={onOpenInfo}
          className="mt-6 flex items-center gap-3 rounded-2xl px-1 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[13px] leading-snug">
            Je m'améliore avec vous : vos choix m'apprennent votre façon de dire les choses.
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      )}
    </div>
  );
}
