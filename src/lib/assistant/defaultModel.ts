/**
 * Modèle embarqué, construit à partir du pré-remplissage (seed.ts).
 *
 * Utilisé tant que le modèle serveur n'est pas chargé (premier lancement,
 * hors ligne, API indisponible ou mode mock). Le modèle serveur contient les
 * mêmes intentions, plus les synonymes appris et validés.
 */
import { normalize } from './normalize';
import { SEED_INTENTS, SEED_LEXICON, type SeedIntent, type SeedTerm } from './seed';
import type { AssistantModel, ModelIntent, ModelTerm, ModelThresholds, Surface } from './types';

export const DEFAULT_THRESHOLDS: ModelThresholds = { accept: 60, ambiguity_gap: 8, suggest: 30 };

export const SEED_BLACKLIST = SEED_LEXICON.blacklist;

function toTerm(t: SeedTerm, defaultWeight: number): ModelTerm {
  const [text, weight] = typeof t === 'string' ? [t, defaultWeight] : t;
  const norm = normalize(text);
  return { text: norm, kind: norm.includes(' ') ? 'phrase' : 'keyword', weight, source: 'seed', status: 'validated' };
}

export function seedIntentToModel(seed: SeedIntent): ModelIntent {
  return {
    key: seed.key,
    label: seed.label,
    description: seed.description,
    kind: seed.kind,
    action: seed.action,
    params: seed.params ?? {},
    slots: seed.slots ?? [],
    permission: seed.permission ?? null,
    module: seed.module ?? null,
    confirm: seed.confirm ?? false,
    sensitive: seed.sensitive ?? false,
    surfaces: seed.surfaces ?? ['backoffice'],
    priority: seed.priority ?? 0,
    examples: seed.examples ?? [],
    terms: [...(seed.keywords ?? []).map((k) => toTerm(k, 1)), ...(seed.phrases ?? []).map((p) => toTerm(p, 1.5))],
  };
}

/** Empreinte stable (djb2) pour versionner le modèle embarqué. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function buildSeedModel(surface: Surface = 'backoffice'): AssistantModel {
  const intents = SEED_INTENTS.map(seedIntentToModel).filter((i) => i.surfaces.includes(surface));
  const body = {
    stopwords: [...new Set(SEED_LEXICON.stopwords.map(normalize))],
    hints: Object.fromEntries(Object.entries(SEED_LEXICON.hints).map(([k, v]) => [k, v.map(normalize)])),
    intents,
  };
  return {
    schema: 1,
    version: `seed-${hash(JSON.stringify(body))}`,
    surface,
    generated_at: new Date(0).toISOString(),
    thresholds: DEFAULT_THRESHOLDS,
    stopwords: body.stopwords,
    hints: body.hints,
    intents,
    aliases: [],
  };
}
