import type { EntityRecord } from '@/lib/assistant/types';

export type Tone = 'default' | 'muted' | 'success' | 'error' | 'notice';

export interface Suggestion {
  id: string;
  label: string;
  sublabel?: string;
  onSelect: () => void;
}

export interface MetricItem {
  label: string;
  value: string;
  /** Variation en % vs période précédente. */
  delta?: number | null;
}

export interface ListItem {
  id: string;
  primary: string;
  secondary?: string;
  trailing?: string;
  action?: { label: string; run: () => void };
}

export type Block = { id: string } & (
  | { type: 'text'; text: string; tone?: Tone }
  | { type: 'suggestions'; items: Suggestion[]; hint?: string; used?: boolean }
  | {
      type: 'confirm';
      title: string;
      description?: string;
      confirmLabel: string;
      destructive?: boolean;
      state: 'pending' | 'running' | 'done' | 'cancelled' | 'failed';
      onConfirm: () => void;
      onCancel: () => void;
    }
  | {
      type: 'picker';
      prompt: string;
      options: EntityRecord[];
      /** Liste complète pour la recherche (sinon on ne propose que `options`). */
      searchIn?: EntityRecord[];
      state: 'pending' | 'done';
      chosen?: string;
      onPick: (record: EntityRecord) => void;
    }
  | { type: 'metrics'; title: string; subtitle?: string; items: MetricItem[]; note?: string; link?: { label: string; path: string } }
  | { type: 'list'; title: string; subtitle?: string; items: ListItem[]; empty: string; link?: { label: string; path: string } }
  | { type: 'capabilities' }
  | { type: 'learning'; text: string }
  | { type: 'feedback'; value?: 'up' | 'down'; onRate: (v: 'up' | 'down') => void }
);

export type Message =
  | { id: string; role: 'user'; text: string; input: 'text' | 'voice' | 'chip' }
  | { id: string; role: 'assistant'; blocks: Block[] };
