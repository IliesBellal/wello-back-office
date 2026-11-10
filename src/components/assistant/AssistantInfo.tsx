import { ArrowLeft, Info, ListChecks, Sparkles } from 'lucide-react';
import type { EngineIndex } from '@/lib/assistant/engine';
import { CapabilitiesView } from './AssistantBlocks';

/**
 * « Comment je fonctionne » : seulement ce qui sert au restaurateur (quoi
 * demander, à quoi s'attendre). Aucun détail sur la technologie.
 */
const GOOD_TO_KNOW = [
  'Une demande à la fois : je vous propose la suite ensuite.',
  'Je vous demande toujours votre accord avant de modifier quelque chose.',
  'Parlez naturellement : « plus de tiramisu », « CA à emporter hier ».',
];

export function AssistantInfo({ index, onBack, onExample }: { index: EngineIndex; onBack: () => void; onExample: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <button type="button" onClick={onBack} className="rounded-full p-2 transition-colors hover:bg-muted" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-[15px] font-semibold">Comment je fonctionne</p>
      </div>
      <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
        <Section icon={Sparkles} title="Je m'améliore avec vous">
          <p>Plus vous m'utilisez, mieux je comprends votre façon de dire les choses.</p>
        </Section>

        <Section icon={ListChecks} title="Ce que je sais faire">
          <CapabilitiesView index={index} onExample={onExample} />
        </Section>

        <Section icon={Info} title="Bon à savoir">
          <ul className="list-disc space-y-1.5 pl-4">
            {GOOD_TO_KNOW.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      <div className="space-y-2.5 text-[14px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
