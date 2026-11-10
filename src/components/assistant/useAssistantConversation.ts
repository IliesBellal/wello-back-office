/**
 * Déroulé d'une conversation avec l'assistant.
 *
 *   saisie → compréhension (moteur local)
 *     ├─ compris      → slot manquant ? sélecteur → confirmation ? → exécution
 *     ├─ ambigu       → « Vous voulez dire… » → choix → idem
 *     └─ incompris    → suggestions proches → choix → idem + apprentissage
 *
 * Chaque étape est tracée (tracking.ts) ; après une action réussie issue
 * d'une suggestion ou d'un choix manuel, le signal d'apprentissage part avec
 * l'événement `action_succeeded`.
 */
import { useCallback, useRef, useState } from 'react';
import { buildLearningSignal, defaultSlots, understand, type EngineIndex } from '@/lib/assistant/engine';
import type { EntityCatalog } from '@/lib/assistant/entities';
import { normalize } from '@/lib/assistant/normalize';
import { uuid, type AssistantTracker } from '@/lib/assistant/tracking';
import type { EntityMatch, EntityRecord, LearningSignal, ScoredIntent, UnderstandContext, UnderstandResult } from '@/lib/assistant/types';
import { isApiHttpError } from '@/services/apiClient';
import { ACTIONS, confirmationFor, suggestionLabel, type ActionContext } from './actions';
import type { Block, Message, Suggestion } from './types';

type Origin = 'matched' | 'suggestion' | 'chip' | 'followup';
type Outcome = 'action' | 'info' | 'navigate' | 'fallback' | 'abandon';

interface Turn {
  id: string;
  text: string;
  at: number;
  result?: UnderstandResult;
  status?: 'matched' | 'ambiguous' | 'fallback';
  /** Événement de repli / d'ambiguïté : rattache l'apprentissage à sa cause. */
  sourceEventId?: string;
  succeeded: boolean;
  learnedTermIds: number[];
  aliasIds: number[];
}

export interface ConversationDeps {
  index: EngineIndex;
  catalog?: EntityCatalog;
  products: EntityRecord[];
  baseContext: Omit<UnderstandContext, 'lastEntity'>;
  tracker: AssistantTracker;
  actions: Omit<ActionContext, 'runIntent'>;
  /** Refermer après une navigation ('mobile' : seulement en plein écran). */
  closeAfter: (when: 'mobile' | 'always') => void;
}

const REPHRASE_WINDOW_MS = 30_000;
const OUTCOME_RANK: Record<Outcome, number> = { action: 4, info: 3, navigate: 2, fallback: 1, abandon: 0 };

const block = <T extends Omit<Block, 'id'>>(b: T) => ({ id: uuid(), ...b }) as Block;

function learnedIds(scored?: ScoredIntent) {
  if (!scored) return { term_ids: [] as number[], alias_ids: [] as number[] };
  return {
    term_ids: scored.matchedTerms.filter((t) => t.source === 'learned' && t.id).map((t) => t.id!) as number[],
    alias_ids: Object.values(scored.slots).filter((s) => s.viaAlias && s.aliasId).map((s) => s.aliasId!) as number[],
  };
}

export function useAssistantConversation(deps: ConversationDeps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const lastTurn = useRef<Turn | null>(null);
  const lastEntity = useRef<EntityMatch | undefined>(undefined);
  const bestOutcome = useRef<Outcome>('abandon');
  const turns = useRef(0);

  const bumpOutcome = (o: Outcome) => {
    if (OUTCOME_RANK[o] > OUTCOME_RANK[bestOutcome.current]) bestOutcome.current = o;
  };

  const pushUser = (text: string, input: 'text' | 'voice' | 'chip') =>
    setMessages((m) => [...m, { id: uuid(), role: 'user', text, input }]);

  const pushAssistant = (blocks: Block[]): string => {
    const id = uuid();
    setMessages((m) => [...m, { id, role: 'assistant', blocks }]);
    return id;
  };

  const patchBlock = (blockId: string, patch: Partial<Block>) =>
    setMessages((m) =>
      m.map((msg) =>
        msg.role === 'assistant' && msg.blocks.some((b) => b.id === blockId)
          ? { ...msg, blocks: msg.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b)) }
          : msg,
      ),
    );

  const disableSuggestions = (blockId: string) => patchBlock(blockId, { used: true } as Partial<Block>);

  // ─── Exécution ───────────────────────────────────────────────────────────

  const execute = useCallback(
    async (turn: Turn, scored: ScoredIntent, origin: Origin, picked?: { slot: string; type: EntityRecord['type']; id: string }) => {
      const d = depsRef.current;
      const handler = ACTIONS[scored.intent.action];
      const meta = { turn_id: turn.id, intent_key: scored.intent.key, score: scored.score };
      if (!handler) {
        d.tracker.track('action_failed', { ...meta, data: { error: 'unknown_action', action: scored.intent.action } });
        pushAssistant([block({ type: 'text', tone: 'error', text: "Je ne sais pas encore faire ça depuis cet écran." })]);
        return;
      }
      setBusy(true);
      const t0 = Date.now();
      try {
        const result = await handler(scored.intent, scored.slots, { ...d.actions, runIntent: (key, slots) => runIntent(key, slots, 'followup') });
        turn.succeeded = true;
        bumpOutcome(result.outcome);

        // Apprentissage : seulement si la compréhension a demandé l'aide de l'utilisateur.
        let learning: LearningSignal | null = null;
        if (turn.result && (origin === 'suggestion' || picked)) {
          learning = buildLearningSignal(d.index, turn.result, scored, picked, turn.sourceEventId);
        }
        d.tracker.track('action_succeeded', {
          ...meta,
          data: { outcome: result.outcome, origin, duration_ms: Date.now() - t0, ...(learning ? { learning } : {}) },
        });
        if (result.outcome === 'navigate') d.tracker.track('navigated', { ...meta, data: { path: scored.intent.params.path ?? null } });

        const blocks = [...result.blocks];
        if (learning) {
          const text = learning.alias
            ? `J'apprends que « ${learning.alias.text} » désigne ${picked ? (d.products.find((p) => p.id === picked.id)?.name ?? 'ce produit') : 'ce produit'}.`
            : `J'apprends que « ${learning.term!.text} » veut dire « ${scored.intent.label} ».`;
          blocks.push(block({ type: 'learning', text }));
        }
        if (result.outcome === 'info') {
          const feedbackId = uuid();
          blocks.push({
            id: feedbackId,
            type: 'feedback',
            onRate: (v) => {
              d.tracker.track('feedback', { ...meta, data: { value: v } });
              patchBlock(feedbackId, { value: v } as Partial<Block>);
            },
          });
        }
        pushAssistant(blocks);

        const productSlot = Object.values(scored.slots).find((s) => s.type === 'product' && s.record);
        if (productSlot) lastEntity.current = productSlot;
        if (result.close) d.closeAfter(result.close);
      } catch (err) {
        const status = isApiHttpError(err) ? err.status : undefined;
        d.tracker.track('action_failed', { ...meta, data: { error: err instanceof Error ? err.message.slice(0, 200) : 'error', status } });
        pushAssistant([
          block({
            type: 'text',
            tone: 'error',
            text: status === 403 ? "Vous n'avez pas les droits pour faire ça." : "Ça n'a pas fonctionné. Réessayez dans un instant.",
          }),
        ]);
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Demandes enchaînées et produits supplémentaires : proposés à la suite. */
  const followUps = (turn: Turn, scored: ScoredIntent) => {
    const r = turn.result;
    if (!r) return;
    const items: Suggestion[] = [];
    r.extraSegments.forEach((seg) =>
      items.push({ id: uuid(), label: seg, onSelect: () => submit(seg, 'chip') }),
    );
    r.extraEntities.forEach((e) => {
      if (!e.record) return;
      items.push({
        id: uuid(),
        label: scored.intent.label,
        sublabel: e.record.name,
        onSelect: () => runIntent(scored.intent.key, { [scored.intent.slots.find((s) => s.entity === e.type)?.name ?? 'product']: e.record! }, 'followup'),
      });
    });
    if (!items.length) return;
    const id = uuid();
    pushAssistant([
      block({
        type: 'text',
        tone: 'notice',
        text: r.extraSegments.length
          ? 'Je traite une demande à la fois : je commence par la première. Ensuite :'
          : 'Je traite un produit à la fois : je commence par le premier. Ensuite :',
      }),
      { id, type: 'suggestions', items: items.map((it) => ({ ...it, onSelect: () => { disableSuggestions(id); it.onSelect(); } })) },
    ]);
  };

  /** Slots manquants ou ambigus, puis confirmation, puis exécution. */
  const proceed = useCallback(
    (turn: Turn, scored: ScoredIntent, origin: Origin, picked?: { slot: string; type: EntityRecord['type']; id: string }) => {
      const d = depsRef.current;
      const meta = { turn_id: turn.id, intent_key: scored.intent.key, score: scored.score };

      // 1. Entité ambiguë (« saumon » → pavé ou fumé ?) ou produit manquant.
      const ambiguousSlot = picked ? undefined : scored.intent.slots.find((s) => scored.slots[s.name]?.alternatives?.length);
      const missing = scored.missingSlots[0];
      const slot = ambiguousSlot ?? (missing?.entity === 'product' ? missing : undefined);
      if (!slot && missing) {
        d.tracker.track('slot_requested', { ...meta, data: { slot: missing.name, entity: missing.entity, reason: 'unsupported' } });
        pushAssistant([block({ type: 'text', text: missing.prompt ?? 'Il me manque une précision pour faire ça.' })]);
        return;
      }
      if (slot) {
        const pool = slot.entity === 'product' ? d.products : [];
        const wantAvailable = scored.intent.action === 'product.set_availability' ? !scored.intent.params.available : undefined;
        const sorted = wantAvailable === undefined ? pool : [...pool].sort((a, b) => Number(b.meta?.available === wantAvailable) - Number(a.meta?.available === wantAvailable));
        const options = ambiguousSlot ? scored.slots[slot.name].alternatives! : sorted.slice(0, 6);
        d.tracker.track('slot_requested', { ...meta, data: { slot: slot.name, entity: slot.entity, reason: ambiguousSlot ? 'ambiguous' : 'missing', options: options.length } });
        const pickerId = uuid();
        pushAssistant([
          block({ type: 'text', text: ambiguousSlot ? `Lequel ?` : (slot.prompt ?? 'Lequel ?') }),
          {
            id: pickerId,
            type: 'picker',
            prompt: slot.prompt ?? 'Lequel ?',
            options,
            searchIn: sorted,
            state: 'pending',
            onPick: (record) => {
              patchBlock(pickerId, { state: 'done', chosen: record.id } as Partial<Block>);
              d.tracker.track('slot_filled', { ...meta, data: { slot: slot.name, entity_id: record.id, from: options.some((o) => o.id === record.id) ? 'options' : 'search' } });
              const match: EntityMatch = { type: record.type, start: -1, end: -1, text: record.name, score: 1, record };
              proceed(
                turn,
                { ...scored, slots: { ...scored.slots, [slot.name]: match }, missingSlots: scored.missingSlots.filter((m) => m !== slot) },
                origin,
                { slot: slot.name, type: record.type, id: record.id },
              );
            },
          },
        ]);
        return;
      }

      // 2. Confirmation des actions qui modifient quelque chose.
      if (scored.intent.confirm) {
        const c = confirmationFor(scored.intent, scored.slots);
        d.tracker.track('confirmation_shown', meta);
        const confirmId = uuid();
        pushAssistant([
          {
            id: confirmId,
            type: 'confirm',
            ...c,
            state: 'pending',
            onConfirm: () => {
              d.tracker.track('confirmed', meta);
              patchBlock(confirmId, { state: 'running' } as Partial<Block>);
              void execute(turn, scored, origin, picked).then(() => patchBlock(confirmId, { state: turn.succeeded ? 'done' : 'failed' } as Partial<Block>));
            },
            onCancel: () => {
              d.tracker.track('cancelled', { ...meta, data: learnedIds(scored) });
              patchBlock(confirmId, { state: 'cancelled' } as Partial<Block>);
              pushAssistant([block({ type: 'text', tone: 'muted', text: "D'accord, je n'ai rien changé." })]);
            },
          },
        ]);
        return;
      }

      void execute(turn, scored, origin, picked);
    },
    [execute],
  );

  // ─── Saisie ──────────────────────────────────────────────────────────────

  const submit = useCallback(
    (raw: string, input: 'text' | 'voice' | 'chip' = 'text', extra: Record<string, unknown> = {}) => {
      const text = raw.trim();
      if (!text) return;
      const d = depsRef.current;
      const now = Date.now();
      const turn: Turn = { id: uuid(), text, at: now, succeeded: false, learnedTermIds: [], aliasIds: [] };
      turns.current++;
      pushUser(text, input);

      // Reformulation : la demande précédente n'a pas abouti.
      const prev = lastTurn.current;
      if (prev && !prev.succeeded && now - prev.at < REPHRASE_WINDOW_MS) {
        d.tracker.track('rephrased', {
          turn_id: prev.id,
          data: { previous_text: prev.text, previous_status: prev.status, term_ids: prev.learnedTermIds, alias_ids: prev.aliasIds },
        });
      }
      lastTurn.current = turn;

      const result = understand(d.index, text, { ...d.baseContext, lastEntity: lastEntity.current }, d.catalog);
      turn.result = result;
      turn.status = result.understanding.status;
      const queryNorm = normalize(text);
      d.tracker.track('query_submitted', {
        turn_id: turn.id,
        data: { text, query_norm: queryNorm, input, length: text.length, tokens: result.tokens.length, engine_ms: result.durationMs, ...extra },
      });
      if (result.extraSegments.length) d.tracker.track('multi_request', { turn_id: turn.id, data: { segments: result.extraSegments.length + 1 } });

      const u = result.understanding;
      const candidatesData = u.candidates.map((c) => ({ key: c.intent.key, score: c.score }));
      const entitiesData = result.entities.map((e) => ({ type: e.type, score: Math.round(e.score * 100) / 100, alias: e.viaAlias || undefined, alternatives: e.alternatives?.length }));

      if (u.status === 'matched') {
        const ids = learnedIds(u.best);
        turn.learnedTermIds = ids.term_ids;
        turn.aliasIds = ids.alias_ids;
        d.tracker.track('intent_matched', {
          turn_id: turn.id,
          intent_key: u.best.intent.key,
          score: u.best.score,
          data: { ...ids, candidates: candidatesData, entities: entitiesData, missing: u.best.missingSlots.map((s) => s.name) },
        });
        // Suite annoncée tout de suite, avant une éventuelle confirmation.
        followUps(turn, u.best);
        proceed(turn, u.best, 'matched');
        return;
      }

      const eventType = u.status === 'ambiguous' ? 'intent_ambiguous' : 'fallback';
      turn.sourceEventId = d.tracker.track(eventType, {
        turn_id: turn.id,
        score: u.candidates[0]?.score,
        data: { text, query_norm: queryNorm, candidates: candidatesData, entities: entitiesData, residual: result.residual.join(' ') },
      });
      if (u.status === 'fallback') bumpOutcome('fallback');

      const suggestionsId = uuid();
      const items: Suggestion[] = u.candidates.map((c, rank) => ({
        id: uuid(),
        ...suggestionLabel(c.intent, c.slots),
        onSelect: () => {
          disableSuggestions(suggestionsId);
          d.tracker.track('suggestion_clicked', { turn_id: turn.id, intent_key: c.intent.key, score: c.score, data: { rank, source: u.status } });
          proceed(turn, c, 'suggestion');
        },
      }));

      const entity = result.entities.find((e) => e.record);
      if (items.length) {
        pushAssistant([
          block({
            type: 'text',
            text:
              u.status === 'ambiguous'
                ? u.candidates.every((c) => c.entityOnly) && entity?.record
                  ? `Que voulez-vous faire avec ${entity.record.name} ?`
                  : 'Vous voulez dire :'
                : "Je n'ai pas bien compris. Vous vouliez peut-être :",
          }),
          { id: suggestionsId, type: 'suggestions', items, hint: u.status === 'fallback' ? "Votre choix m'aide à apprendre." : undefined },
        ]);
      } else {
        const examples = pickExamples(d.index, 4).map((ex) => ({
          id: uuid(),
          label: ex,
          onSelect: () => {
            disableSuggestions(suggestionsId);
            d.tracker.track('example_clicked', { turn_id: turn.id, data: { text: ex, from: 'fallback' } });
            submit(ex, 'chip');
          },
        }));
        pushAssistant([
          block({ type: 'text', text: "Je n'ai pas compris cette demande. Je l'ai notée pour progresser." }),
          { id: suggestionsId, type: 'suggestions', items: examples, hint: 'Essayez par exemple :' },
        ]);
      }
    },
    // Les aides d'affichage (pushAssistant, disableSuggestions…) ne lisent que setMessages, stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proceed],
  );

  /** Intention lancée sans phrase (actions rapides, boutons de liste, suite). */
  const runIntent = useCallback(
    (key: string, slots: Record<string, EntityRecord> = {}, origin: Origin = 'chip') => {
      const d = depsRef.current;
      const prepared = d.index.intents.find((pi) => pi.intent.key === key);
      if (!prepared) return;
      const intent = prepared.intent;
      const turn: Turn = { id: uuid(), text: intent.label, at: Date.now(), succeeded: false, learnedTermIds: [], aliasIds: [] };
      lastTurn.current = turn;
      turns.current++;
      const resolved: Record<string, EntityMatch> = defaultSlots(intent, d.baseContext.now);
      intent.slots.forEach((s) => {
        const r = slots[s.name];
        if (r) resolved[s.name] = { type: r.type, start: -1, end: -1, text: r.name, score: 1, record: r };
      });
      const missing = intent.slots.filter((s) => s.required && !resolved[s.name]);
      if (origin === 'chip') pushUser(intent.label, 'chip');
      proceed(turn, { intent, score: 100, matchedTerms: [], slots: resolved, missingSlots: missing, consumed: [] }, origin);
    },
    [proceed],
  );

  const reset = useCallback(() => {
    setMessages([]);
    lastTurn.current = null;
    lastEntity.current = undefined;
  }, []);

  /** Nouvelle session de mesure (ouverture) : l'issue repart de zéro. */
  const newSession = useCallback(() => {
    bestOutcome.current = 'abandon';
    turns.current = 0;
  }, []);

  return {
    messages,
    busy,
    submit,
    runIntent,
    reset,
    newSession,
    /** Issue de la session, pour l'événement `closed`. */
    outcome: () => bestOutcome.current,
    turns: () => turns.current,
  };
}

/** Exemples variés, tirés des intentions autorisées. */
export function pickExamples(index: EngineIndex, n: number): string[] {
  const pool = index.intents
    .filter((pi) => pi.intent.kind !== 'navigate' && pi.intent.examples.length)
    .sort((a, b) => b.intent.priority - a.intent.priority)
    .map((pi) => pi.intent.examples[0]);
  return pool.slice(0, n);
}
