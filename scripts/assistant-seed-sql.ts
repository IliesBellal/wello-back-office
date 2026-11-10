/**
 * Génère la migration SQL de pré-remplissage de l'assistant pour
 * ib-welloresto-api à partir de src/lib/assistant/seed.ts (source unique).
 *
 *   npm run assistant:seed-sql -- ../ib-welloresto-api/migrations/todo 207_assistant_seed
 *
 * Écrit <dossier>/<nom>.up.sql et <nom>.down.sql. Rejouable : les intentions
 * sont mises à jour, les termes déjà présents ne sont pas touchés (une
 * décision d'administration — terme rejeté, poids modifié — est conservée).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV_ITEMS } from '@/config/navConfig';
import { seedIntentToModel } from '@/lib/assistant/defaultModel';
import { normalize } from '@/lib/assistant/normalize';
import { SEED_INTENTS, SEED_LEXICON } from '@/lib/assistant/seed';

const [outDir = '.', name = '207_assistant_seed'] = process.argv.slice(2).filter((a) => a !== '--');

const q = (v: string | null | undefined) => (v === null || v === undefined ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]) => `ARRAY[${v.map(q).join(', ')}]::text[]`;

// Libellé des pages : titre de navConfig, préfixé du parent quand il est générique.
const navLabels = new Map<string, string>();
NAV_ITEMS.forEach((item) => {
  if (item.href) navLabels.set(item.id, item.title);
  item.children?.forEach((child) => {
    const generic = ['Paramètres', 'Gestion', 'Activité', 'Hub', 'Statistiques', "Vue d'ensemble"].includes(child.title);
    navLabels.set(child.id, generic ? `${child.title} · ${item.title}` : child.title);
  });
});

const intents = SEED_INTENTS.map((seed) => {
  const model = seedIntentToModel(seed);
  if (model.kind === 'navigate') {
    const navId = String(model.params.nav_id);
    const label = navLabels.get(navId);
    if (!label) throw new Error(`nav.${navId} : id absent de src/config/navConfig.ts`);
    model.label = label;
  }
  return model;
});

const intentRows = intents.map(
  (i) =>
    `  (${[
      q(i.key),
      q(i.label),
      q(i.description ?? null),
      q(i.kind),
      q(i.action),
      json(i.params),
      json(i.slots),
      q(i.permission ?? null),
      q(i.module ?? null),
      String(i.confirm),
      String(i.sensitive),
      arr(i.surfaces),
      json(i.examples),
      String(i.priority),
    ].join(', ')})`,
);

const termRows = intents.flatMap((i) =>
  i.terms.map((t) => `  (${[q(i.key), q(t.text), q(t.kind), String(t.weight), "'seed'", "'validated'", "''"].join(', ')})`),
);

const lexiconRows = [
  ...[...new Set(SEED_LEXICON.stopwords.map(normalize))].map((w) => `  ('stopword', '', ${q(w)}, 'seed')`),
  ...Object.entries(SEED_LEXICON.hints).flatMap(([kind, words]) =>
    [...new Set(words.map(normalize))].map((w) => `  ('hint', ${q(kind)}, ${q(w)}, 'seed')`),
  ),
  ...[...new Set(SEED_LEXICON.blacklist.map(normalize))].map((w) => `  ('blacklist', '', ${q(w)}, 'seed')`),
];

const header = `-- GÉNÉRÉ par wello-back-office : npm run assistant:seed-sql
-- Source : src/lib/assistant/seed.ts (même vocabulaire que le modèle embarqué
-- du back-office). Ne pas modifier à la main : modifier le seed et régénérer.
--`;

const up = `${header}
-- Pré-remplissage de l'assistant : ${intents.length} intentions, ${termRows.length} termes,
-- ${lexiconRows.length} entrées de lexique. À appliquer après 206_assistant.
--
-- Rejouable : les intentions sont mises à jour ; un terme déjà présent n'est
-- pas modifié (une décision d'administration est conservée) ; les nouveaux
-- termes sont ajoutés.

BEGIN;

INSERT INTO assistant_intents
    (intent_key, label, description, kind, action, params, slots, permission, module, confirm, sensitive, surfaces, examples, priority)
VALUES
${intentRows.join(',\n')}
ON CONFLICT (intent_key) DO UPDATE SET
    label       = EXCLUDED.label,
    description = EXCLUDED.description,
    kind        = EXCLUDED.kind,
    action      = EXCLUDED.action,
    params      = EXCLUDED.params,
    slots       = EXCLUDED.slots,
    permission  = EXCLUDED.permission,
    module      = EXCLUDED.module,
    confirm     = EXCLUDED.confirm,
    sensitive   = EXCLUDED.sensitive,
    surfaces    = EXCLUDED.surfaces,
    examples    = EXCLUDED.examples,
    priority    = EXCLUDED.priority,
    updated_at  = now();

INSERT INTO assistant_terms (intent_key, text, kind, weight, source, status, merchant_id)
VALUES
${termRows.join(',\n')}
ON CONFLICT (intent_key, text, merchant_id) DO NOTHING;

INSERT INTO assistant_lexicon (kind, group_key, text, source)
VALUES
${lexiconRows.join(',\n')}
ON CONFLICT (kind, group_key, text) DO NOTHING;

COMMIT;
`;

const down = `${header}
-- Retire le pré-remplissage. Les intentions pré-remplies sont supprimées, AVEC
-- les synonymes appris qui leur sont rattachés (ON DELETE CASCADE).

BEGIN;

DELETE FROM assistant_lexicon WHERE source = 'seed';
DELETE FROM assistant_intents WHERE intent_key IN (
${intents.map((i) => `    ${q(i.key)}`).join(',\n')}
);

COMMIT;
`;

writeFileSync(join(outDir, `${name}.up.sql`), up);
writeFileSync(join(outDir, `${name}.down.sql`), down);
console.log(`${name} : ${intents.length} intentions, ${termRows.length} termes, ${lexiconRows.length} entrées de lexique → ${outDir}`);
