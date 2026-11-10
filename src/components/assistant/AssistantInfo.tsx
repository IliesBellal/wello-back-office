import { ArrowLeft, Ban, Brain, ListChecks, ShieldCheck } from 'lucide-react';
import type { EngineIndex } from '@/lib/assistant/engine';
import { CapabilitiesView } from './AssistantBlocks';

const LIMITS = [
  ['Une demande à la fois', '« Mets le saumon en rupture et dis-moi le CA » : je fais la première, puis je vous propose la suite.'],
  ['Un produit à la fois', 'Pour plusieurs produits, je les traite l’un après l’autre.'],
  ['Pas de conversation libre', 'Je ne rédige pas de texte et je ne donne pas de conseils : je réponds aux demandes courantes du restaurant.'],
  ['Pas de mémoire d’une fois sur l’autre', 'Je me souviens du produit dont on parle (« remets-le en vente »), le temps de la conversation seulement.'],
  ['Toujours votre accord', 'Une action qui modifie quelque chose (rupture, déconnexion…) attend votre confirmation.'],
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
        <Section icon={Brain} title="J'apprends de vos demandes">
          <p>
            Je reconnais vos demandes grâce à un vocabulaire de mots et d'expressions, directement dans votre navigateur : c'est instantané,
            gratuit et rien n'est envoyé à une IA externe.
          </p>
          <p>
            Quand je ne comprends pas, je vous propose les options les plus proches. Si vous en choisissez une et que l'action aboutit, je retiens
            votre formulation. Après quelques confirmations, elle rejoint mon vocabulaire pour votre restaurant, puis pour tous si elle est
            utilisée ailleurs.
          </p>
          <p>Si un mot appris me fait souvent proposer la mauvaise action, je l'oublie de moi-même. L'équipe Wello peut aussi corriger.</p>
        </Section>

        <Section icon={ListChecks} title="Ce que je sais faire">
          <CapabilitiesView index={index} onExample={onExample} />
        </Section>

        <Section icon={Ban} title="Mes limites">
          <ul className="space-y-3">
            {LIMITS.map(([title, text]) => (
              <li key={title}>
                <p className="font-medium text-foreground">{title}</p>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={ShieldCheck} title="Vos données">
          <p>
            Pour m'améliorer, j'enregistre vos demandes et ce que vous en faites. Les e-mails et numéros de téléphone sont masqués avant tout envoi,
            le texte des demandes est effacé au bout de 90 jours, et seule l'équipe Wello y a accès.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Brain; title: string; children: React.ReactNode }) {
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
