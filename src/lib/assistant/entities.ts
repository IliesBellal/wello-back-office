/**
 * Reconnaissance des entités nommées (produits, équipiers, clients…) dans une
 * phrase, avec tolérance aux fautes et aux noms partiels (« saumon » trouve
 * « Pavé de saumon »), et prise en compte des surnoms appris par
 * établissement (« le dessert du jour » → Tiramisu maison).
 *
 * Optimisé pour des catalogues de quelques milliers d'éléments : un index
 * inversé mot → éléments évite de comparer la phrase à chaque nom, et la
 * comparaison approximative ne porte que sur le vocabulaire distinct.
 */
import { MIN_TOKEN_SIMILARITY, normalize, stem, tokenize, tokenSimilarity } from './normalize';
import type { EntityMatch, EntityRecord, EntityType, ModelAlias } from './types';

interface IndexedRecord {
  record: EntityRecord;
  /** Tokens significatifs du nom (sans mots vides). */
  tokens: string[];
}

/** Score minimal pour retenir une entité. */
export const ENTITY_ACCEPT = 0.68;
/** Écart sous lequel deux éléments sont présentés comme alternatives. */
const ENTITY_TIE = 0.06;
const MAX_ALTERNATIVES = 6;

export class EntityCatalog {
  private readonly records: IndexedRecord[] = [];
  private readonly byToken = new Map<string, Set<number>>();
  private readonly byStem = new Map<string, Set<number>>();
  private readonly vocabulary: string[] = [];
  private readonly aliases: Array<{ tokens: string[]; alias: ModelAlias }> = [];

  constructor(records: EntityRecord[], private readonly stopwords: Set<string>, aliases: ModelAlias[] = []) {
    const vocab = new Set<string>();
    records.forEach((record) => {
      const tokens = tokenize(normalize(record.name)).filter((t) => !stopwords.has(t));
      if (tokens.length === 0) return;
      const idx = this.records.push({ record, tokens }) - 1;
      tokens.forEach((t) => {
        vocab.add(t);
        addTo(this.byToken, t, idx);
        addTo(this.byStem, stem(t), idx);
      });
    });
    this.vocabulary = [...vocab];
    const known = new Set(records.map((r) => `${r.type}:${r.id}`));
    aliases.forEach((alias) => {
      if (!known.has(`${alias.entity_type}:${alias.entity_id}`)) return; // élément supprimé depuis
      const tokens = tokenize(normalize(alias.alias));
      if (tokens.length) this.aliases.push({ tokens, alias });
    });
    // Les alias les plus longs d'abord : « dessert du jour » avant « dessert ».
    this.aliases.sort((a, b) => b.tokens.length - a.tokens.length);
  }

  get size(): number {
    return this.records.length;
  }

  private recordFor(type: EntityType, id: string): EntityRecord | undefined {
    return this.records.find((r) => r.record.type === type && r.record.id === id)?.record;
  }

  /**
   * Entités trouvées dans `tokens`, sans chevauchement. `blocked` marque les
   * positions déjà prises (dates, quantités).
   */
  find(tokens: string[], blocked: boolean[] = []): EntityMatch[] {
    const taken = tokens.map((_, i) => Boolean(blocked[i]));
    const out: EntityMatch[] = [];

    // 1. Alias appris : correspondance exacte d'une suite de mots.
    for (const { tokens: at, alias } of this.aliases) {
      for (let i = 0; i + at.length <= tokens.length; i++) {
        if (at.every((t, k) => tokens[i + k] === t && !taken[i + k])) {
          const record = this.recordFor(alias.entity_type, alias.entity_id);
          if (!record) continue;
          out.push({ type: record.type, start: i, end: i + at.length, text: at.join(' '), score: 1, record, viaAlias: true, aliasId: alias.id });
          for (let k = i; k < i + at.length; k++) taken[k] = true;
        }
      }
    }

    // 2. Mots de la phrase rapprochés du vocabulaire des noms.
    const tokenHits: Array<Map<number, number>> = tokens.map((tok, i) => {
      const hits = new Map<number, number>(); // index d'élément → similarité max
      if (taken[i] || this.stopwords.has(tok)) return hits;
      const add = (ids: Set<number> | undefined, sim: number) =>
        ids?.forEach((id) => hits.set(id, Math.max(hits.get(id) ?? 0, sim)));
      add(this.byToken.get(tok), 1);
      add(this.byStem.get(stem(tok)), 0.95);
      if (tok.length >= 4) {
        for (const v of this.vocabulary) {
          const sim = tokenSimilarity(tok, v);
          if (sim >= MIN_TOKEN_SIMILARITY && sim < 0.95) add(this.byToken.get(v), sim);
        }
      }
      return hits;
    });

    // 3. Pour chaque élément touché, meilleure suite contiguë de mots.
    interface Candidate { idx: number; start: number; end: number; score: number }
    const candidates: Candidate[] = [];
    const touched = new Set<number>();
    tokenHits.forEach((h) => h.forEach((_, idx) => touched.add(idx)));
    touched.forEach((idx) => {
      const { tokens: nameTokens } = this.records[idx];
      let i = 0;
      while (i < tokens.length) {
        if (!tokenHits[i].has(idx)) {
          i++;
          continue;
        }
        let j = i;
        let simSum = 0;
        let matched = 0;
        // On avance tant que les mots appartiennent au nom (les mots vides au milieu sont tolérés).
        while (j < tokens.length && (tokenHits[j].has(idx) || (this.stopwords.has(tokens[j]) && j + 1 < tokens.length && tokenHits[j + 1].has(idx)))) {
          if (tokenHits[j].has(idx)) {
            simSum += tokenHits[j].get(idx)!;
            matched++;
          }
          j++;
        }
        const avgSim = simSum / matched;
        const coverage = Math.min(1, matched / nameTokens.length);
        // Nom complet : avgSim ; nom partiel : pénalisé selon la part du nom citée.
        const score = avgSim * (0.65 + 0.35 * coverage);
        candidates.push({ idx, start: i, end: j, score });
        i = j;
      }
    });

    candidates.sort((a, b) => b.score - a.score || (b.end - b.start) - (a.end - a.start));
    for (const c of candidates) {
      if (c.score < ENTITY_ACCEPT) break;
      let free = true;
      for (let k = c.start; k < c.end; k++) if (taken[k]) free = false;
      if (!free) continue;
      // Ex aequo sur la même portion : alternatives (« saumon » → pavé ou fumé ?).
      const ties = candidates.filter(
        (o) => o !== c && o.start === c.start && o.end === c.end && c.score - o.score <= ENTITY_TIE,
      );
      const record = this.records[c.idx].record;
      out.push({
        type: record.type,
        start: c.start,
        end: c.end,
        text: tokens.slice(c.start, c.end).join(' '),
        score: c.score,
        record,
        alternatives: ties.length
          ? [record, ...ties.slice(0, MAX_ALTERNATIVES - 1).map((t) => this.records[t.idx].record)]
          : undefined,
      });
      for (let k = c.start; k < c.end; k++) taken[k] = true;
    }
    return out.sort((a, b) => a.start - b.start);
  }
}

function addTo(map: Map<string, Set<number>>, key: string, idx: number) {
  let s = map.get(key);
  if (!s) map.set(key, (s = new Set()));
  s.add(idx);
}

// ─── Quantités (prise de commande orale, POS) ──────────────────────────────

const QUANTITY_WORDS: Record<string, number> = {
  deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20,
};

/** Quantités explicites (« 2 », « trois »). « un » / « une » restent des articles. */
export function findQuantities(tokens: string[], blocked: boolean[] = []): EntityMatch[] {
  const out: EntityMatch[] = [];
  tokens.forEach((t, i) => {
    if (blocked[i]) return;
    const q = /^\d{1,3}$/.test(t) ? Number(t) : QUANTITY_WORDS[t];
    if (q && q > 0) out.push({ type: 'quantity', start: i, end: i + 1, text: t, score: 1, quantity: q });
  });
  return out;
}
