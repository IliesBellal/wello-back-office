import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Download, FileArchive, FileText, Loader2, Search, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { normalize } from '@/lib/assistant/normalize';
import type { EngineIndex } from '@/lib/assistant/engine';
import { cn } from '@/lib/utils';
import type { Block, DownloadItem, Message } from './types';
import { WelloAssistantMark } from './WelloAssistantMark';

// ─── Avatar ─────────────────────────────────────────────────────────────────

export function AssistantOrb({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <WelloAssistantMark
      size={size}
      className={cn('shadow-[0_4px_12px_-4px_rgb(15_23_42/0.18)]', className)}
    />
  );
}

// ─── Messages ───────────────────────────────────────────────────────────────

export function UserBubble({ message }: { message: Extract<Message, { role: 'user' }> }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-snug text-primary-foreground shadow-sm">
        {message.text}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" aria-label="L'assistant réfléchit">
      <AssistantOrb size={26} />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
    </div>
  );
}

export function AssistantMessage({
  message,
  showAvatar,
  index,
  onExample,
}: {
  message: Extract<Message, { role: 'assistant' }>;
  showAvatar: boolean;
  index: EngineIndex;
  onExample: (text: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-[26px] shrink-0 pt-0.5">{showAvatar && <AssistantOrb size={26} />}</div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.blocks.map((b) => (
          <BlockView key={b.id} block={b} index={index} onExample={onExample} />
        ))}
      </div>
    </div>
  );
}

function BlockView({ block, index, onExample }: { block: Block; index: EngineIndex; onExample: (t: string) => void }) {
  switch (block.type) {
    case 'text':
      return (
        <p
          className={cn(
            'text-[15px] leading-relaxed',
            block.tone === 'muted' && 'text-muted-foreground',
            block.tone === 'error' && 'text-destructive',
            block.tone === 'notice' && 'text-muted-foreground',
            block.tone === 'success' && 'flex items-start gap-2 font-medium text-foreground',
          )}
        >
          {block.tone === 'success' && (
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          <span>{block.text}</span>
        </p>
      );
    case 'suggestions':
      return <SuggestionsView block={block} />;
    case 'confirm':
      return <ConfirmView block={block} />;
    case 'picker':
      return <PickerView block={block} />;
    case 'metrics':
      return <MetricsView block={block} />;
    case 'list':
      return <ListView block={block} />;
    case 'downloads':
      return <DownloadsView block={block} />;
    case 'capabilities':
      return <CapabilitiesView index={index} onExample={onExample} />;
    case 'learning':
      return (
        <div className="flex items-start gap-2 rounded-xl bg-primary/[0.06] px-3 py-2 text-[13px] leading-snug text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{block.text}</span>
        </div>
      );
    case 'feedback':
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {block.value ? (
            <span className="py-1">Merci pour votre retour.</span>
          ) : (
            <>
              <span className="mr-1">Utile ?</span>
              <button type="button" onClick={() => block.onRate('up')} className="rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground" aria-label="Utile">
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => block.onRate('down')} className="rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground" aria-label="Pas utile">
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      );
  }
}

const card = 'rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

function SuggestionsView({ block }: { block: Extract<Block, { type: 'suggestions' }> }) {
  // Peu d'éléments courts : pastilles ; sinon lignes pleine largeur (plus faciles à toucher).
  const asPills = block.items.every((i) => !i.sublabel) && block.items.length > 0 && block.hint?.startsWith('Essayez');
  return (
    <div className="space-y-2">
      {block.hint && asPills && <p className="text-xs text-muted-foreground">{block.hint}</p>}
      {asPills ? (
        <div className="flex flex-wrap gap-2">
          {block.items.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={block.used}
              onClick={s.onSelect}
              className="rounded-full border border-border bg-background px-3.5 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div className={cn(card, 'divide-y divide-border/70 overflow-hidden')}>
          {block.items.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={block.used}
              onClick={s.onSelect}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{s.label}</span>
                {s.sublabel && <span className="block truncate text-xs text-muted-foreground">{s.sublabel}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </button>
          ))}
        </div>
      )}
      {block.hint && !asPills && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          {block.hint}
        </p>
      )}
    </div>
  );
}

function ConfirmView({ block }: { block: Extract<Block, { type: 'confirm' }> }) {
  const settled = block.state !== 'pending' && block.state !== 'running';
  return (
    <div className={cn(card, 'p-4')}>
      <p className="text-[15px] font-semibold leading-snug">{block.title}</p>
      {block.description && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{block.description}</p>}
      {settled ? (
        <p className={cn('mt-3 flex items-center gap-1.5 text-[13px] font-medium', block.state === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
          {block.state === 'done' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {block.state === 'done' ? 'Fait' : block.state === 'cancelled' ? 'Annulé' : 'Échec'}
        </p>
      ) : (
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={block.onCancel}
            disabled={block.state === 'running'}
            className="h-10 flex-1 rounded-xl border border-border bg-background text-[14px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={block.onConfirm}
            disabled={block.state === 'running'}
            className={cn(
              'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-70',
              block.destructive ? 'bg-amber-600' : 'bg-primary',
            )}
          >
            {block.state === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
            {block.confirmLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function PickerView({ block }: { block: Extract<Block, { type: 'picker' }> }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return block.options;
    return (block.searchIn ?? block.options).filter((r) => normalize(r.name).includes(q)).slice(0, 8);
  }, [query, block.options, block.searchIn]);
  const done = block.state === 'done';
  const chosen = done ? (block.searchIn ?? block.options).find((r) => r.id === block.chosen) : undefined;

  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" /> {chosen?.name}
      </p>
    );
  }
  return (
    <div className={cn(card, 'overflow-hidden')}>
      {(block.searchIn?.length ?? 0) > block.options.length && (
        <label className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground md:text-[14px]"
            aria-label={block.prompt}
          />
        </label>
      )}
      <div className="max-h-64 divide-y divide-border/70 overflow-y-auto">
        {results.length === 0 && <p className="px-4 py-3 text-[13px] text-muted-foreground">Aucun résultat.</p>}
        {results.map((r) => {
          const available = r.meta?.available;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => block.onPick(r)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted"
            >
              {available !== undefined && (
                <span className={cn('h-2 w-2 shrink-0 rounded-full', available ? 'bg-emerald-500' : 'bg-rose-500')} aria-label={available ? 'En vente' : 'En rupture'} />
              )}
              <span className="min-w-0 flex-1 truncate text-[14px]">{r.name}</span>
              {typeof r.meta?.category === 'string' && r.meta.category && (
                <span className="max-w-[40%] truncate text-xs text-muted-foreground">{r.meta.category}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Delta({ value }: { value?: number | null }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        up ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toLocaleString('fr-FR')} %
    </span>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  // Titre puis contexte (période, établissement) dessous : jamais tronqués l'un par l'autre.
  return (
    <div className="min-w-0">
      <p className="text-[14px] font-semibold leading-snug">{title}</p>
      {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function CardLink({ link }: { link?: { label: string; path: string } }) {
  const navigate = useNavigate();
  if (!link) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(link.path)}
      className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
    >
      {link.label}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}

function MetricsView({ block }: { block: Extract<Block, { type: 'metrics' }> }) {
  // Premier indicateur en grand, les suivants en tuiles : aucun chiffre tronqué à 400 px.
  const [hero, ...rest] = block.items;
  return (
    <div className={cn(card, 'p-4')}>
      <CardHeader title={block.title} subtitle={block.subtitle} />
      {hero && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{hero.label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-[28px] font-semibold leading-none tabular-nums tracking-tight">{hero.value}</p>
            <Delta value={hero.delta} />
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {rest.map((m) => (
            <div key={m.label} className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <p className="text-[17px] font-semibold tabular-nums tracking-tight">{m.value}</p>
                <Delta value={m.delta} />
              </div>
            </div>
          ))}
        </div>
      )}
      {block.note && <p className="mt-2.5 text-xs text-muted-foreground">{block.note}</p>}
      <CardLink link={block.link} />
    </div>
  );
}

function ListView({ block }: { block: Extract<Block, { type: 'list' }> }) {
  return (
    <div className={cn(card, 'p-4')}>
      <CardHeader title={block.title} subtitle={block.subtitle} />
      {block.items.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{block.empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/70">
          {block.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px]">{it.primary}</p>
                {it.secondary && <p className="truncate text-xs text-muted-foreground">{it.secondary}</p>}
              </div>
              {it.trailing && <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{it.trailing}</span>}
              {it.action && (
                <button
                  type="button"
                  onClick={it.action.run}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {it.action.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <CardLink link={block.link} />
    </div>
  );
}


// ─── Téléchargements ────────────────────────────────────────────────────────

type DownloadState = 'idle' | 'loading' | 'done' | 'error';

function DownloadsView({ block }: { block: Extract<Block, { type: 'downloads' }> }) {
  const [states, setStates] = useState<Record<string, { state: DownloadState; error?: string }>>({});

  const download = async (item: DownloadItem) => {
    if (states[item.id]?.state === 'loading') return;
    // Onglet ouvert pendant le clic (sinon bloqué par Safari après l'attente).
    const win = item.mode === 'link' ? window.open('', '_blank') : null;
    setStates((s) => ({ ...s, [item.id]: { state: 'loading' } }));
    try {
      const url = await item.get();
      if (item.mode === 'link') {
        if (!url) throw new Error('Document indisponible.');
        if (win) win.location.href = url;
        else window.open(url, '_blank');
      }
      setStates((s) => ({ ...s, [item.id]: { state: 'done' } }));
      block.onDownload?.(item, true);
    } catch (err) {
      win?.close();
      const message = err instanceof Error && err.message ? err.message : "Le document n'a pas pu être téléchargé.";
      setStates((s) => ({ ...s, [item.id]: { state: 'error', error: message } }));
      block.onDownload?.(item, false, message);
    }
  };

  return (
    <div className={cn(card, 'p-4')}>
      <CardHeader title={block.title} subtitle={block.subtitle} />
      {block.note && <p className="mt-2 text-xs text-muted-foreground">{block.note}</p>}
      <div className="mt-2 space-y-3">
        {block.groups.map((g) => (
          <div key={g.id}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
            <ul className="divide-y divide-border/70">
              {g.items.map((it) => {
                const st = states[it.id];
                const Icon = it.format === 'ZIP' ? FileArchive : FileText;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => void download(it)}
                      disabled={st?.state === 'loading'}
                      className="group flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] leading-[18px]">{it.label}</span>
                        <span className={cn('block truncate text-xs leading-4', st?.state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                          {st?.state === 'error'
                            ? st.error
                            : st?.state === 'loading' && it.generated
                              ? 'Préparation du document…'
                              : [it.sublabel, it.format].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                          st?.state === 'done'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                            : 'border-border text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary',
                        )}
                        aria-label="Télécharger"
                      >
                        {st?.state === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : st?.state === 'done' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ce que je sais faire ───────────────────────────────────────────────────

const GROUPS: Array<{ kind: 'action' | 'info' | 'navigate' | 'system'; title: string }> = [
  { kind: 'action', title: 'Agir' },
  { kind: 'info', title: 'Répondre' },
  { kind: 'navigate', title: 'Vous emmener' },
  { kind: 'system', title: 'Réglages' },
];

export function CapabilitiesView({ index, onExample }: { index: EngineIndex; onExample: (t: string) => void }) {
  const intents = index.intents.map((pi) => pi.intent);
  const navCount = intents.filter((i) => i.kind === 'navigate').length;
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = intents.filter((i) => i.kind === g.kind && i.key !== 'system.help');
        if (!items.length) return null;
        return (
          <div key={g.kind}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
            {g.kind === 'navigate' ? (
              <div className={cn(card, 'px-4 py-3')}>
                <p className="text-[14px]">Ouvrir n'importe laquelle de vos {navCount} pages</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Ouvre la TVA', 'Plan de salle', 'Mes horaires'].map((ex) => (
                    <ExamplePill key={ex} text={ex} onClick={onExample} />
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn(card, 'divide-y divide-border/70')}>
                {items.map((i) => (
                  <div key={i.key} className="px-4 py-3">
                    <p className="text-[14px] font-medium">{i.label}</p>
                    {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
                    {i.examples.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {i.examples.slice(0, 2).map((ex) => (
                          <ExamplePill key={ex} text={ex} onClick={onExample} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ExamplePill({ text, onClick }: { text: string; onClick: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
    >
      « {text} »
    </button>
  );
}
