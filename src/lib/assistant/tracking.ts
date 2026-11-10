/**
 * Mesure d'usage de l'assistant : qui, quand, quoi, combien de temps.
 *
 * Une session = une ouverture de l'assistant. Chaque interaction produit un
 * événement horodaté (ms) envoyé par lots : toutes les 4 s, dès 20 événements
 * en attente, et à la fermeture (fetch `keepalive`). Hors ligne, les lots
 * sont gardés dans le stockage local (500 événements au plus) et renvoyés au
 * retour du réseau. Rien ne bloque jamais l'interface.
 *
 * Les e-mails et numéros de téléphone sont masqués avant tout envoi. Le
 * marchand, l'utilisateur et son rôle ne sont jamais envoyés par le client :
 * l'API les déduit du jeton.
 */
import { ENABLE_LOGS, USE_MOCK_DATA } from '@/services/apiClient';
import { postEvents } from './api';
import { maskPersonalData } from './normalize';
import type { Surface } from './types';

/** Doit rester aligné sur internal/modules/assistant/models.go (allowedEventTypes). */
export const ASSISTANT_EVENT_TYPES = [
  'opened',
  'closed',
  'onboarding_seen',
  'model_loaded',
  'chip_clicked',
  'example_clicked',
  'query_submitted',
  'voice_started',
  'voice_result',
  'voice_error',
  'intent_matched',
  'intent_ambiguous',
  'fallback',
  'suggestion_clicked',
  'slot_requested',
  'slot_filled',
  'confirmation_shown',
  'confirmed',
  'cancelled',
  'action_succeeded',
  'action_failed',
  'navigated',
  'info_shown',
  'rephrased',
  'multi_request',
  'feedback',
  'learning_info_opened',
  'download_clicked',
] as const;

export type AssistantEventType = (typeof ASSISTANT_EVENT_TYPES)[number];

export interface SessionInfo {
  id: string;
  surface: Surface;
  /** ms depuis l'epoch */
  started_at: number;
  origin_path: string;
  device: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  app_version?: string;
  model_version: string;
  online: boolean;
}

export interface TrackedEvent {
  event_id: string;
  type: AssistantEventType;
  seq: number;
  /** ms depuis l'epoch, horloge du client */
  ts: number;
  turn_id?: string;
  intent_key?: string;
  score?: number;
  data?: Record<string, unknown>;
}

export interface EventBatch {
  session: SessionInfo;
  events: TrackedEvent[];
}

const OUTBOX_KEY = 'wello.assistant.outbox.v1';
const OUTBOX_MAX_EVENTS = 500;
const FLUSH_EVERY_MS = 4000;
const FLUSH_AT = 20;
const MAX_BATCH = 50;
/** Champs texte libres masqués avant envoi. */
const TEXT_FIELDS = ['text', 'query_norm', 'transcript', 'previous_text', 'comment'];

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readOutbox(): EventBatch[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as EventBatch[];
  } catch {
    return [];
  }
}

function writeOutbox(batches: EventBatch[]) {
  try {
    // On garde les plus récents si la limite est dépassée.
    let total = 0;
    const kept: EventBatch[] = [];
    for (let i = batches.length - 1; i >= 0; i--) {
      total += batches[i].events.length;
      if (total > OUTBOX_MAX_EVENTS) break;
      kept.unshift(batches[i]);
    }
    if (kept.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(kept));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    // stockage indisponible : tant pis pour ces événements
  }
}

function sanitize(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const out: Record<string, unknown> = { ...data };
  TEXT_FIELDS.forEach((k) => {
    if (typeof out[k] === 'string') out[k] = maskPersonalData(out[k] as string).slice(0, 500);
  });
  return out;
}

export function detectDevice(): SessionInfo['device'] {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

export function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac OS X/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

let drainingOutbox = false;

/** Renvoie les lots restés en attente (hors ligne, fermeture brutale). */
export async function drainOutbox(): Promise<void> {
  if (USE_MOCK_DATA || drainingOutbox) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const pending = readOutbox();
  if (!pending.length) return;
  drainingOutbox = true;
  const failed: EventBatch[] = [];
  for (const batch of pending) {
    if (!(await postEvents(batch))) failed.push(batch);
  }
  // Un lot ajouté pendant l'envoi ne doit pas être perdu.
  const added = readOutbox().slice(pending.length);
  writeOutbox([...failed, ...added]);
  drainingOutbox = false;
}

export class AssistantTracker {
  readonly sessionId = uuid();
  private readonly session: SessionInfo;
  private queue: TrackedEvent[] = [];
  private seq = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ended = false;
  private readonly onHide = () => {
    if (document.visibilityState === 'hidden') void this.flush(true);
  };
  private readonly onOnline = () => void drainOutbox();

  constructor(info: Omit<SessionInfo, 'id' | 'started_at'>) {
    this.session = { ...info, id: this.sessionId, started_at: Date.now() };
    this.timer = setInterval(() => void this.flush(), FLUSH_EVERY_MS);
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.onHide);
      window.addEventListener('online', this.onOnline);
    }
    void drainOutbox();
  }

  get startedAt(): number {
    return this.session.started_at;
  }

  setModelVersion(version: string) {
    this.session.model_version = version;
  }

  track(
    type: AssistantEventType,
    payload: { turn_id?: string; intent_key?: string; score?: number; data?: Record<string, unknown> } = {},
  ): string {
    const event: TrackedEvent = {
      event_id: uuid(),
      type,
      seq: ++this.seq,
      ts: Date.now(),
      turn_id: payload.turn_id,
      intent_key: payload.intent_key,
      score: payload.score === undefined ? undefined : Math.round(payload.score * 10) / 10,
      data: sanitize(payload.data),
    };
    if (ENABLE_LOGS) console.debug('[assistant]', type, event);
    if (this.ended) return event.event_id;
    this.queue.push(event);
    if (this.queue.length >= FLUSH_AT) void this.flush();
    return event.event_id;
  }

  async flush(keepalive = false): Promise<void> {
    if (!this.queue.length) return;
    const events = this.queue.splice(0, MAX_BATCH);
    const batch: EventBatch = {
      session: { ...this.session, online: typeof navigator === 'undefined' ? true : navigator.onLine },
      events,
    };
    if (USE_MOCK_DATA) return;
    const ok = typeof navigator !== 'undefined' && navigator.onLine === false ? false : await postEvents(batch, keepalive);
    if (!ok) writeOutbox([...readOutbox(), batch]);
    if (this.queue.length) await this.flush(keepalive);
  }

  /** Fin de session : dernier envoi et nettoyage des écouteurs. */
  end() {
    if (this.ended) return;
    this.ended = true;
    if (this.timer) clearInterval(this.timer);
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onHide);
      window.removeEventListener('online', this.onOnline);
    }
    void this.flush(true);
  }
}
