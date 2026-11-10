/**
 * Moteur de compréhension de l'assistant : phrase → intention + paramètres.
 *
 * Aucune dépendance à React, au DOM ou au réseau : la même logique peut
 * tourner sur le POS (prise de commande orale), la borne ou un serveur.
 * Algorithme détaillé et vulgarisé : docs/assistant/README.md.
 *
 *   1. normalisation et découpage en mots ;
 *   2. repérage des dates, quantités et entités (produits, équipiers…) ;
 *   3. pour chaque intention autorisée : phrases puis mots-clés (tolérance
 *      aux fautes), couverture de la demande, slots remplis ou manquants ;
 *   4. décision : compris / à préciser (ambiguïté) / repli avec suggestions.
 */
import { currentDaypart, defaultDate, findDates, resolveDate, type DateMention } from './dates';
import { EntityCatalog, findQuantities } from './entities';
import { MIN_TOKEN_SIMILARITY, normalize, tokenize, tokenSimilarity } from './normalize';
import type {
  AssistantModel,
  EntityMatch,
  EntityType,
  IntentKind,
  LearningSignal,
  ModelIntent,
  ModelTerm,
  ScoredIntent,
  SlotDef,
  UnderstandContext,
  UnderstandResult,
  Understanding,
} from './types';

interface PreparedTerm {
  term: ModelTerm;
  tokens: string[];
}

export interface PreparedIntent {
  intent: ModelIntent;
  phrases: PreparedTerm[];
  keywords: PreparedTerm[];
  slotTypes: Set<EntityType>;
}

export interface EngineIndex {
  model: AssistantModel;
  intents: PreparedIntent[];
  stopwords: Set<string>;
  hintKinds: Map<string, IntentKind>;
  blacklist: Set<string>;
}

/** Pondération du score final. */
const W_EVIDENCE = 0.55;
const W_COVERAGE = 0.45;
const BONUS_SLOT = 8;
const PENALTY_MISSING_SLOT = 4;
const BONUS_HINT = 6;
/** L'intention accepte une période et la phrase en contient une (« caisse de janvier »). */
const BONUS_DATE_FIT = 10;
const PRIORITY_FACTOR = 0.3;
const MAX_CANDIDATES = 4;

const PRONOUNS = new Set(['le', 'la', 'l', 'les', 'lui', 'celui', 'celle', 'ca']);
const CONNECTORS = /\s+(?:et|puis|ensuite|apres|aussi)\s+/i;

// ─── Préparation du modèle ──────────────────────────────────────────────────

export function prepareModel(model: AssistantModel, extraBlacklist: string[] = []): EngineIndex {
  const stopwords = new Set(model.stopwords.map(normalize));
  const hintKinds = new Map<string, IntentKind>();
  (Object.entries(model.hints) as Array<[IntentKind, string[]]>).forEach(([kind, words]) =>
    words.forEach((w) => hintKinds.set(normalize(w), kind)),
  );

  const intents = model.intents.map((intent): PreparedIntent => {
    // Dédoublonnage : un même texte servi deux fois (global + établissement) garde le plus fort.
    const byText = new Map<string, ModelTerm>();
    intent.terms.forEach((term) => {
      if (term.status !== 'active' && term.status !== 'validated') return;
      const text = normalize(term.text);
      if (!text) return;
      const prev = byText.get(text);
      if (!prev || prev.weight < term.weight) byText.set(text, { ...term, text });
    });
    const phrases: PreparedTerm[] = [];
    const keywords: PreparedTerm[] = [];
    byText.forEach((term) => {
      const tokens = tokenize(term.text);
      (tokens.length > 1 ? phrases : keywords).push({ term, tokens });
    });
    phrases.sort((a, b) => b.tokens.length - a.tokens.length || b.term.weight - a.term.weight);
    return { intent, phrases, keywords, slotTypes: new Set(intent.slots.map((s) => s.entity)) };
  });

  return { model, intents, stopwords, hintKinds, blacklist: new Set(extraBlacklist.map(normalize)) };
}

export function buildCatalog(index: EngineIndex, records: ConstructorParameters<typeof EntityCatalog>[0]): EntityCatalog {
  return new EntityCatalog(records, index.stopwords, index.model.aliases);
}

// ─── Compréhension ──────────────────────────────────────────────────────────

interface Analysis {
  tokens: string[];
  dates: DateMention[];
  entities: EntityMatch[];
  /** Type d'entité couvrant chaque position (dates et quantités comprises). */
  entityAt: Array<EntityType | undefined>;
}

function analyse(index: EngineIndex, normalized: string, catalog: EntityCatalog | undefined, now: Date): Analysis {
  const tokens = tokenize(normalized);
  const blocked = tokens.map(() => false);
  const entityAt: Array<EntityType | undefined> = tokens.map(() => undefined);
  const mark = (m: { start: number; end: number }, type: EntityType) => {
    for (let k = m.start; k < m.end; k++) {
      blocked[k] = true;
      entityAt[k] = type;
    }
  };

  const dates = findDates(tokens);
  dates.forEach((d) => mark(d, 'date'));
  const dateEntities: EntityMatch[] = dates.map((d) => ({
    type: 'date',
    start: d.start,
    end: d.end,
    text: tokens.slice(d.start, d.end).join(' '),
    score: 1,
    date: resolveDate(d, now),
  }));

  const named = catalog ? catalog.find(tokens, blocked) : [];
  named.forEach((e) => mark(e, e.type));
  const quantities = findQuantities(tokens, blocked);
  quantities.forEach((q) => mark(q, 'quantity'));

  const entities = [...dateEntities, ...named, ...quantities].sort((a, b) => a.start - b.start);
  return { tokens, dates, entities, entityAt };
}

function isApplicable(intent: ModelIntent, model: AssistantModel, ctx: UnderstandContext): boolean {
  if (!intent.surfaces.includes(model.surface)) return false;
  if (intent.permission && ctx.permissions !== '*' && !ctx.permissions.has(intent.permission)) return false;
  if (intent.module && ctx.modules && !ctx.modules.has(intent.module)) return false;
  return true;
}

function termSimilarity(input: string, termToken: string, stopwords: Set<string>): number {
  // Les petits mots et mots vides d'une phrase doivent être exacts.
  if (termToken.length < 4 || stopwords.has(termToken)) return input === termToken ? 1 : 0;
  return tokenSimilarity(input, termToken);
}

/** Valeur par défaut d'un slot date (« Qui travaille ? » à 19 h : le service du soir). */
function defaultDateSlot(intent: ModelIntent, slot: SlotDef, now: Date): EntityMatch {
  const date = defaultDate(slot.default, now, slot.prefer ?? 'past');
  if (intent.action.startsWith('info.staff') && date.grain === 'day') {
    const dp = currentDaypart(now);
    if (dp) date.daypart = dp;
  }
  return { type: 'date', start: -1, end: -1, text: '', score: 1, date };
}

/** Slots date par défaut d'une intention lancée sans phrase (action rapide). */
export function defaultSlots(intent: ModelIntent, now: Date = new Date()): Record<string, EntityMatch> {
  const out: Record<string, EntityMatch> = {};
  intent.slots.filter((s) => s.entity === 'date').forEach((s) => (out[s.name] = defaultDateSlot(intent, s, now)));
  return out;
}

function resolveSlots(
  intent: ModelIntent,
  analysis: Analysis,
  ctx: UnderstandContext,
  now: Date,
): { slots: Record<string, EntityMatch>; missing: SlotDef[] } {
  const slots: Record<string, EntityMatch> = {};
  const missing: SlotDef[] = [];
  const used = new Set<EntityMatch>();
  for (const slot of intent.slots) {
    if (slot.entity === 'date') {
      const entity = analysis.entities.find((e) => e.type === 'date' && !used.has(e));
      const mention = entity ? analysis.dates.find((d) => d.start === entity.start) : undefined;
      const prefer = slot.prefer ?? 'past';
      if (entity && mention) {
        used.add(entity);
        slots[slot.name] = { ...entity, date: resolveDate(mention, now, prefer) };
      } else {
        slots[slot.name] = defaultDateSlot(intent, slot, now);
      }
      continue;
    }
    const entity = analysis.entities.find((e) => e.type === slot.entity && !used.has(e));
    if (entity) {
      used.add(entity);
      slots[slot.name] = entity;
      continue;
    }
    // « Remets-le en vente » : on reprend la dernière entité citée.
    if (ctx.lastEntity?.type === slot.entity && analysis.tokens.some((t) => PRONOUNS.has(t))) {
      slots[slot.name] = { ...ctx.lastEntity, start: -1, end: -1 };
      continue;
    }
    if (slot.required) missing.push(slot);
  }
  return { slots, missing };
}

/**
 * Correspondance d'une phrase du modèle à partir de la position `start`.
 * Tolère un mot vide intercalé dans la saisie (« remets-le en vente » pour
 * « remets en vente »). Renvoie la fin (exclue) et la similarité moyenne.
 */
function matchPhrase(
  index: EngineIndex,
  phrase: string[],
  tokens: string[],
  start: number,
  consumed: boolean[],
  unavailable: boolean[],
): { end: number; sim: number } | null {
  let j = start;
  let simSum = 0;
  let skipped = 0;
  for (let k = 0; k < phrase.length; k++) {
    if (j >= tokens.length || consumed[j] || unavailable[j]) return null;
    let sim = termSimilarity(tokens[j], phrase[k], index.stopwords);
    if (sim < MIN_TOKEN_SIMILARITY && k > 0 && skipped === 0 && index.stopwords.has(tokens[j]) && j + 1 < tokens.length) {
      skipped++;
      j++;
      if (consumed[j] || unavailable[j]) return null;
      sim = termSimilarity(tokens[j], phrase[k], index.stopwords);
    }
    if (sim < MIN_TOKEN_SIMILARITY) return null;
    simSum += sim;
    j++;
  }
  return { end: j, sim: simSum / phrase.length };
}

function scoreIntent(index: EngineIndex, pi: PreparedIntent, analysis: Analysis, ctx: UnderstandContext, now: Date): ScoredIntent {
  const { tokens, entityAt } = analysis;
  const n = tokens.length;
  const consumed = new Array<boolean>(n).fill(false);
  // Positions neutres pour cette intention : dates, quantités, et entités qu'elle accepte en slot.
  const unavailable = entityAt.map((t) => t === 'date' || t === 'quantity' || (t !== undefined && pi.slotTypes.has(t)));
  const matchedTerms: ModelTerm[] = [];
  let evidence = 0;

  for (const p of pi.phrases) {
    for (let i = 0; i < n; i++) {
      const span = matchPhrase(index, p.tokens, tokens, i, consumed, unavailable);
      if (!span) continue;
      evidence += p.term.weight * span.sim;
      for (let k = i; k < span.end; k++) consumed[k] = true;
      matchedTerms.push(p.term);
      break; // une occurrence par phrase suffit
    }
  }

  for (let i = 0; i < n; i++) {
    if (consumed[i] || unavailable[i] || index.stopwords.has(tokens[i])) continue;
    let best = 0;
    let bestTerm: ModelTerm | undefined;
    for (const kw of pi.keywords) {
      const sim = termSimilarity(tokens[i], kw.tokens[0], index.stopwords);
      if (sim >= MIN_TOKEN_SIMILARITY && sim * kw.term.weight > best) {
        best = sim * kw.term.weight;
        bestTerm = kw.term;
      }
    }
    if (bestTerm) {
      evidence += best;
      consumed[i] = true;
      if (!matchedTerms.includes(bestTerm)) matchedTerms.push(bestTerm);
    }
  }

  // Couverture : part des mots significatifs expliqués par l'intention.
  let denominator = 0;
  let covered = 0;
  let hintBonus = 0;
  for (let i = 0; i < n; i++) {
    if (index.stopwords.has(tokens[i]) || unavailable[i]) continue;
    if (consumed[i]) {
      denominator++;
      covered++;
      continue;
    }
    const hint = index.hintKinds.get(tokens[i]);
    if (hint && (hint === pi.intent.kind || (hint === 'action' && pi.intent.kind === 'system'))) {
      hintBonus = BONUS_HINT;
      continue; // un mot d'orientation du bon type ne pénalise pas, il conforte
    }
    denominator++;
  }

  const { slots, missing } = resolveSlots(pi.intent, analysis, ctx, now);
  const consumedIdx = consumed.flatMap((c, i) => (c ? [i] : []));
  if (evidence === 0) {
    return { intent: pi.intent, score: 0, matchedTerms, slots, missingSlots: missing, consumed: consumedIdx };
  }

  const coverage = denominator === 0 ? 1 : covered / denominator;
  let score = 100 * (W_EVIDENCE * (1 - Math.exp(-evidence)) + W_COVERAGE * coverage) + hintBonus;
  for (const slot of pi.intent.slots) {
    if (slot.entity === 'date') continue;
    if (slots[slot.name] && slots[slot.name].start >= 0) score += BONUS_SLOT;
    else if (slots[slot.name]) score += BONUS_SLOT / 2; // repris du contexte
  }
  if (pi.slotTypes.has('date') && analysis.dates.length > 0) score += BONUS_DATE_FIT;
  score -= missing.length * PENALTY_MISSING_SLOT;
  score += pi.intent.priority * PRIORITY_FACTOR;
  score = Math.max(0, Math.min(100, score));

  return { intent: pi.intent, score: Math.round(score * 10) / 10, matchedTerms, slots, missingSlots: missing, consumed: consumedIdx };
}

function decide(index: EngineIndex, scored: ScoredIntent[], analysis: Analysis, applicable: PreparedIntent[], ctx: UnderstandContext, now: Date): Understanding {
  const { accept, ambiguity_gap: gap, suggest } = index.model.thresholds;
  const ranked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (best && best.score >= accept) {
    const close = ranked.filter((s) => best.score - s.score < gap);
    if (close.length > 1) return { status: 'ambiguous', candidates: close.slice(0, MAX_CANDIDATES) };
    return { status: 'matched', best, candidates: ranked.slice(0, MAX_CANDIDATES) };
  }

  let candidates = ranked.filter((s) => s.score >= suggest).slice(0, MAX_CANDIDATES);
  // Une entité seule (« tiramisu ») : on propose ce qu'on peut faire avec elle.
  if (candidates.length === 0) {
    const types = new Set(analysis.entities.filter((e) => e.type !== 'date' && e.type !== 'quantity').map((e) => e.type));
    if (types.size) {
      candidates = applicable
        .filter((pi) => pi.intent.slots.some((s) => types.has(s.entity) && s.required))
        .sort((a, b) => b.intent.priority - a.intent.priority)
        .slice(0, MAX_CANDIDATES)
        .map((pi) => {
          const { slots, missing } = resolveSlots(pi.intent, analysis, ctx, now);
          return { intent: pi.intent, score: suggest, matchedTerms: [], slots, missingSlots: missing, consumed: [], entityOnly: true };
        });
      if (candidates.length) return { status: 'ambiguous', candidates };
    }
  }
  return { status: 'fallback', candidates };
}

function understandOne(index: EngineIndex, raw: string, ctx: UnderstandContext, catalog?: EntityCatalog) {
  const now = ctx.now ?? new Date();
  const normalized = normalize(raw);
  const analysis = analyse(index, normalized, catalog, now);
  const applicable = index.intents.filter((pi) => isApplicable(pi.intent, index.model, ctx));
  const scored = applicable.map((pi) => scoreIntent(index, pi, analysis, ctx, now));
  const understanding = decide(index, scored, analysis, applicable, ctx, now);
  const residual = residualTokens(index, analysis.tokens, analysis.entityAt);
  return { normalized, analysis, understanding, residual };
}

/**
 * Comprend une phrase. `catalog` porte les produits, équipiers… de
 * l'établissement (voir buildCatalog) ; sans lui, seules les dates et
 * quantités sont reconnues.
 */
export function understand(index: EngineIndex, raw: string, ctx: UnderstandContext, catalog?: EntityCatalog): UnderstandResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let main = understandOne(index, raw, ctx, catalog);
  const extraSegments: string[] = [];

  // Demandes enchaînées : « mets le saumon en rupture et dis-moi le CA ».
  const segments = raw.split(CONNECTORS).map((s) => s.trim()).filter(Boolean);
  if (segments.length > 1) {
    const parts = segments.map((s) => understandOne(index, s, ctx, catalog));
    const matchedParts = parts.filter((p) => p.understanding.status === 'matched');
    const keys = new Set(matchedParts.map((p) => (p.understanding.status === 'matched' ? p.understanding.best.intent.key : '')));
    if (matchedParts.length > 1 && keys.size > 1) {
      main = parts.find((p) => p.understanding.status === 'matched')!;
      segments.forEach((s, i) => {
        if (parts[i] !== main && parts[i].understanding.status === 'matched') extraSegments.push(s);
      });
    }
  }

  // Plusieurs entités pour un seul slot : on traite la première, les autres ensuite.
  const extraEntities: EntityMatch[] = [];
  if (main.understanding.status === 'matched') {
    const { best } = main.understanding;
    const slot = best.intent.slots.find((s) => s.entity !== 'date' && best.slots[s.name]);
    if (slot) {
      const chosen = best.slots[slot.name];
      main.analysis.entities
        .filter((e) => e.type === slot.entity && e.start !== chosen.start)
        .forEach((e) => extraEntities.push(e));
    }
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    raw,
    normalized: main.normalized,
    tokens: main.analysis.tokens,
    entities: main.analysis.entities,
    residual: main.residual,
    understanding: main.understanding,
    extraSegments,
    extraEntities,
    durationMs: Math.round((t1 - t0) * 100) / 100,
  };
}

function residualTokens(index: EngineIndex, tokens: string[], entityAt: Array<EntityType | undefined>): string[] {
  return tokens.filter((t, i) => !index.stopwords.has(t) && entityAt[i] === undefined);
}

// ─── Apprentissage ──────────────────────────────────────────────────────────

const MAX_TERM_TOKENS = 4;
const MAX_ALIAS_TOKENS = 5;

/**
 * Ce qu'il faut apprendre quand l'utilisateur a choisi `chosen` après un repli
 * ou une ambiguïté, puis que l'action a réussi.
 *
 *  - Les mots non expliqués par l'intention et hors entités deviennent un
 *    synonyme candidat de l'intention (« mettre en pause » → rupture).
 *  - Si l'entité a été choisie à la main (aucune trouvée dans la phrase), les
 *    mots non expliqués désignaient sans doute l'entité : ils deviennent un
 *    surnom candidat (« dessert du jour » → Tiramisu maison).
 *
 * Renvoie null s'il n'y a rien d'utile à apprendre (que des mots vides ou
 * génériques, phrase trop longue…).
 */
export function buildLearningSignal(
  index: EngineIndex,
  result: UnderstandResult,
  chosen: ScoredIntent,
  pickedEntity?: { slot: string; type: EntityType; id: string },
  sourceEventId?: string,
): LearningSignal | null {
  const { tokens } = result;
  const consumed = new Set(chosen.consumed);
  const entityPos = new Set<number>();
  result.entities.forEach((e) => {
    for (let k = e.start; k < e.end; k++) entityPos.add(k);
  });
  const signal: LearningSignal = { source_event_id: sourceEventId, query_norm: result.normalized, intent_key: chosen.intent.key };

  // L'entité choisie figurait-elle dans la phrase (en tête ou parmi des homonymes) ?
  const entityInText = pickedEntity
    ? result.entities.find(
        (e) => e.type === pickedEntity.type && (e.record?.id === pickedEntity.id || e.alternatives?.some((a) => a.id === pickedEntity.id)),
      )
    : undefined;
  // Homonymie tranchée par l'utilisateur : « saumon » désigne ici ce produit-là.
  if (pickedEntity && entityInText?.alternatives?.length && !entityInText.viaAlias) {
    signal.alias = { entity_type: pickedEntity.type, entity_id: pickedEntity.id, text: entityInText.text };
  }

  const isUnexplained = (i: number) =>
    !consumed.has(i) && !entityPos.has(i) && !index.stopwords.has(tokens[i]) && !index.hintKinds.has(tokens[i]);

  // Plus longue suite contiguë de mots inexpliqués (mots vides intermédiaires inclus).
  let bestRun: number[] = [];
  let run: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const glue = run.length > 0 && index.stopwords.has(tokens[i]) && !consumed.has(i) && !entityPos.has(i);
    if (isUnexplained(i) || glue) run.push(i);
    else {
      if (run.length > bestRun.length) bestRun = run;
      run = [];
    }
  }
  if (run.length > bestRun.length) bestRun = run;
  while (bestRun.length && index.stopwords.has(tokens[bestRun[bestRun.length - 1]])) bestRun.pop();

  const words = bestRun.map((i) => tokens[i]);
  const significant = words.filter((w) => !index.stopwords.has(w));
  const usable = significant.length > 0 && !significant.every((w) => index.blacklist.has(w));

  if (usable) {
    if (pickedEntity && !entityInText) {
      // Aucune entité trouvée : les mots inexpliqués la désignaient.
      if (words.length <= MAX_ALIAS_TOKENS && !signal.alias) {
        signal.alias = { entity_type: pickedEntity.type, entity_id: pickedEntity.id, text: words.join(' ') };
      }
    } else if (significant.length <= MAX_TERM_TOKENS && chosen.consumed.length === 0) {
      // Synonyme seulement si l'intention n'expliquait AUCUN mot de la phrase :
      // sinon les mots restants sont des précisions (période, filtre…), pas un
      // autre nom de l'intention (« caisse de janvier » n'apprend pas « janvier »).
      signal.term = significant.length === 1
        ? { text: significant[0], kind: 'keyword' }
        : { text: words.join(' '), kind: 'phrase' };
    }
  }
  return signal.term || signal.alias ? signal : null;
}
