import { describe, expect, it } from 'vitest';
import { buildSeedModel, SEED_BLACKLIST } from '../defaultModel';
import { buildCatalog, buildLearningSignal, prepareModel, understand } from '../engine';
import { findDates, resolveDate } from '../dates';
import { maskPersonalData, normalize, tokenSimilarity } from '../normalize';
import type { EntityRecord, UnderstandContext, UnderstandResult } from '../types';

// Lundi 9 novembre 2026, 19 h.
const NOW = new Date(2026, 10, 9, 19, 0, 0);

const PRODUCTS: EntityRecord[] = [
  { type: 'product', id: 'p1', name: 'Tiramisu maison' },
  { type: 'product', id: 'p2', name: 'Pavé de saumon' },
  { type: 'product', id: 'p3', name: 'Saumon fumé' },
  { type: 'product', id: 'p4', name: 'Pizza Margherita' },
  { type: 'product', id: 'p5', name: 'Menu enfant' },
  { type: 'product', id: 'p6', name: 'Coca-Cola' },
  { type: 'employee', id: 'e1', name: 'Camille Durand' },
];

const index = prepareModel(buildSeedModel(), SEED_BLACKLIST);
const catalog = buildCatalog(index, PRODUCTS);
const ctx: UnderstandContext = { permissions: '*', now: NOW };
const run = (text: string, c: UnderstandContext = ctx) => understand(index, text, c, catalog);

const bestKey = (r: UnderstandResult) => (r.understanding.status === 'matched' ? r.understanding.best.intent.key : null);
const best = (r: UnderstandResult) => {
  if (r.understanding.status !== 'matched') throw new Error(`attendu matched, obtenu ${r.understanding.status}`);
  return r.understanding.best;
};

describe('normalize', () => {
  it('retire accents, ponctuation et apostrophes', () => {
    expect(normalize("Aujourd'hui, c'est l'Été !")).toBe('aujourd hui c est l ete');
    expect(normalize('  Œuf   à la COQUE ')).toBe('oeuf a la coque');
  });

  it('tolère les fautes sur les mots longs, pas sur les courts', () => {
    expect(tokenSimilarity('tiramissu', 'tiramisu')).toBeGreaterThanOrEqual(0.75);
    expect(tokenSimilarity('epuisees', 'epuise')).toBe(0.95);
    expect(tokenSimilarity('ca', 'la')).toBe(0);
    expect(tokenSimilarity('12', '13')).toBe(0);
  });

  it('masque les données personnelles', () => {
    expect(maskPersonalData('écris à jean@exemple.fr ou au 06 12 34 56 78')).toBe('écris à [email] ou au [tel]');
  });
});

describe('dates', () => {
  const resolve = (text: string, prefer: 'past' | 'future' = 'past') => {
    const [m] = findDates(normalize(text).split(' '));
    return m ? resolveDate(m, NOW, prefer) : null;
  };

  it('jours relatifs et créneaux', () => {
    expect(resolve('hier')).toMatchObject({ from: '2026-11-08', to: '2026-11-08', label: 'hier' });
    expect(resolve('demain soir')).toMatchObject({ from: '2026-11-10', daypart: 'evening', label: 'demain soir' });
    expect(resolve('ce midi')).toMatchObject({ from: '2026-11-09', daypart: 'lunch', label: 'ce midi' });
    expect(resolve("aujourd'hui")).toMatchObject({ from: '2026-11-09', label: "aujourd'hui" });
  });

  it('jours de la semaine selon le sens préféré', () => {
    expect(resolve('samedi')?.from).toBe('2026-11-07');
    expect(resolve('samedi', 'future')?.from).toBe('2026-11-14');
    expect(resolve('lundi dernier')?.from).toBe('2026-11-02');
    expect(resolve('mercredi prochain')?.from).toBe('2026-11-11');
  });

  it('périodes et dates absolues', () => {
    expect(resolve('la semaine dernière')).toMatchObject({ from: '2026-11-02', to: '2026-11-08', grain: 'week' });
    expect(resolve('ce mois-ci')).toMatchObject({ from: '2026-11-01', to: '2026-11-09', grain: 'month' });
    expect(resolve('les 7 derniers jours')).toMatchObject({ from: '2026-11-03', to: '2026-11-09' });
    expect(resolve('le 12 novembre', 'future')?.from).toBe('2026-11-12');
    expect(resolve('le 12 novembre')?.from).toBe('2025-11-12');
    expect(resolve('12/10')?.from).toBe('2026-10-12');
  });
});

describe('compréhension', () => {
  it('rupture avec produit, malgré une faute', () => {
    for (const text of ['Y a plus de tiramisu !', 'plus de tiramissu', 'le tiramisu est en rupture', 'Tiramisu épuisé']) {
      const r = run(text);
      expect(bestKey(r), text).toBe('menu.product.out_of_stock');
      expect(best(r).slots.product.record?.id, text).toBe('p1');
    }
  });

  it('remise en vente', () => {
    const r = run('remets la margherita en vente');
    expect(bestKey(r)).toBe('menu.product.back_in_stock');
    expect(best(r).slots.product.record?.id).toBe('p4');
  });

  it("chiffre d'affaires sur une période", () => {
    expect(best(run("CA d'hier")).slots.period.date).toMatchObject({ from: '2026-11-08' });
    const r = run('combien on a fait samedi ?');
    expect(bestKey(r)).toBe('info.revenue');
    expect(best(r).slots.period.date?.from).toBe('2026-11-07');
    expect(best(run("chiffre d'affaires de la semaine dernière")).slots.period.date?.grain).toBe('week');
  });

  it('planning : jour à venir et créneau courant par défaut', () => {
    const r = run('qui bosse demain soir');
    expect(bestKey(r)).toBe('info.staff_on_shift');
    expect(best(r).slots.period.date).toMatchObject({ from: '2026-11-10', daypart: 'evening' });
    expect(best(run('qui travaille ?')).slots.period.date?.daypart).toBe('evening');
  });

  it('navigation', () => {
    expect(bestKey(run('ouvre la TVA'))).toBe('nav.vat-declaration');
    expect(bestKey(run('emmène-moi au plan de salle'))).toBe('nav.floor-plan');
    expect(bestKey(run('uber eats'))).toBe('nav.uber-eats');
  });

  it('une entité seule propose les actions possibles', () => {
    const r = run('saumon');
    expect(r.understanding.status).toBe('ambiguous');
    const product = r.entities.find((e) => e.type === 'product');
    expect(product?.alternatives?.map((a) => a.id).sort()).toEqual(['p2', 'p3']);
  });

  it('demande incomprise : repli avec suggestion', () => {
    const r = run('mets le dessert du jour en pause');
    expect(r.understanding.status).not.toBe('matched');
    expect(r.understanding.candidates.map((c) => c.intent.key)).toContain('menu.product.out_of_stock');
  });

  it('demandes enchaînées et entités multiples', () => {
    const multi = run('plus de saumon fumé et dis-moi le CA');
    expect(bestKey(multi)).toBe('menu.product.out_of_stock');
    expect(multi.extraSegments).toEqual(['dis-moi le CA']);

    const twoProducts = run('plus de tiramisu ni de margherita');
    expect(bestKey(twoProducts)).toBe('menu.product.out_of_stock');
    expect(twoProducts.extraEntities.map((e) => e.record?.id)).toEqual(['p4']);
  });

  it('respecte les permissions', () => {
    const r = run('plus de tiramisu', { permissions: new Set(['reports.sales.read']), now: NOW });
    expect(bestKey(r)).not.toBe('menu.product.out_of_stock');
  });

  it('reprend la dernière entité citée', () => {
    const last = run('plus de tiramisu').entities.find((e) => e.type === 'product');
    const r = run('remets-le en vente', { ...ctx, lastEntity: last });
    expect(bestKey(r)).toBe('menu.product.back_in_stock');
    expect(best(r).slots.product.record?.id).toBe('p1');
  });

  it('quantités (prise de commande)', () => {
    const r = run('deux margherita');
    expect(r.entities.map((e) => e.type)).toEqual(['quantity', 'product']);
    expect(r.entities[0].quantity).toBe(2);
  });

  it('reste rapide sur un gros catalogue', () => {
    const big = buildCatalog(
      index,
      Array.from({ length: 3000 }, (_, i) => ({ type: 'product' as const, id: `x${i}`, name: `Produit spécial numéro ${i} recette maison` })),
    );
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) understand(index, 'plus de produit spécial numéro 42', ctx, big);
    expect((performance.now() - t0) / 20).toBeLessThan(50);
  });
});

describe('apprentissage', () => {
  it('surnom appris quand l’entité est choisie à la main', () => {
    const r = run('mets le dessert du jour en pause');
    const chosen = r.understanding.candidates.find((c) => c.intent.key === 'menu.product.out_of_stock')!;
    const signal = buildLearningSignal(index, r, chosen, { slot: 'product', type: 'product', id: 'p1' }, 'evt-1');
    expect(signal).toMatchObject({ intent_key: 'menu.product.out_of_stock', alias: { entity_id: 'p1', text: 'dessert du jour' } });
    expect(signal?.term).toBeUndefined();
  });

  it('synonyme appris quand le produit est dans la phrase', () => {
    const r = run('la margherita est en sommeil');
    expect(r.understanding.status).not.toBe('matched');
    const chosen = r.understanding.candidates.find((c) => c.intent.key === 'menu.product.out_of_stock')!;
    const signal = buildLearningSignal(index, r, chosen, { slot: 'product', type: 'product', id: 'p4' });
    expect(signal?.term).toEqual({ text: 'sommeil', kind: 'keyword' });
  });

  it('homonymie tranchée : « saumon » désigne ce produit-là', () => {
    const r = run('plus de saumon');
    const chosen = r.understanding.status === 'matched' ? r.understanding.best : r.understanding.candidates[0];
    const signal = buildLearningSignal(index, r, chosen, { slot: 'product', type: 'product', id: 'p2' });
    expect(signal?.alias).toEqual({ entity_type: 'product', entity_id: 'p2', text: 'saumon' });
  });

  it("n'apprend pas de mots génériques", () => {
    const r = run('truc machin');
    const fake = { intent: index.intents[0].intent, score: 0, matchedTerms: [], slots: {}, missingSlots: [], consumed: [] };
    expect(buildLearningSignal(index, r, fake)).toBeNull();
  });

  it('les surnoms appris sont reconnus', () => {
    const model = buildSeedModel();
    model.aliases = [{ entity_type: 'product', entity_id: 'p1', alias: 'dessert du jour' }];
    const idx = prepareModel(model, SEED_BLACKLIST);
    const r = understand(idx, 'plus de dessert du jour', ctx, buildCatalog(idx, PRODUCTS));
    expect(bestKey(r)).toBe('menu.product.out_of_stock');
    expect(best(r).slots.product).toMatchObject({ viaAlias: true, record: { id: 'p1' } });
  });
});

describe('retours de recette (10/11)', () => {
  it('un mois seul est une période, pas un mot à apprendre', () => {
    const [m] = findDates(normalize('caisse de janvier').split(' '));
    expect(resolveDate(m, NOW)).toMatchObject({ from: '2026-01-01', to: '2026-01-31', grain: 'month', label: 'janvier' });
    const [dec] = findDates(normalize('ventes de décembre').split(' '));
    expect(resolveDate(dec, NOW).from).toBe('2025-12-01');
    expect(findDates(normalize('sept margherita').split(' '))).toEqual([]);
  });

  it('« caisse de janvier » ouvre les registres sur janvier, sans rien apprendre', async () => {
    const { withNavigation } = await import('@/components/assistant/navIntents');
    const { normalizeAuthData } = await import('@/types/auth');
    const auth = normalizeAuthData({ access: { admin: true }, session: { merchant_id: 'm1' } } as never);
    const idx = prepareModel(withNavigation(buildSeedModel(), auth), SEED_BLACKLIST);
    const r = understand(idx, 'caisse de janvier', ctx, catalog);
    expect(r.understanding.status).toBe('matched');
    const chosen = r.understanding.status === 'matched' ? r.understanding.best : r.understanding.candidates[0];
    expect(chosen.intent.key).toBe('nav.cash-registers-history');
    // Sans période, « caisse » reste ambigu entre registres et catégories.
    expect(understand(idx, 'caisse', ctx, catalog).understanding.status).toBe('ambiguous');
    expect(chosen.slots.period).toMatchObject({ start: 2, date: { from: '2026-01-01', to: '2026-01-31' } });
    expect(buildLearningSignal(idx, r, chosen)).toBeNull();
  });

  it('CA filtré par canal', async () => {
    const { CHANNEL_RECORDS } = await import('../channels');
    const cat = buildCatalog(index, [...PRODUCTS, ...CHANNEL_RECORDS]);
    const cases: Array<[string, string, string]> = [
      ["CA borne aujourd'hui", 'sources:KIOSK', '2026-11-09'],
      ['CA à emporter cette année', 'orderTypes:TAKE_AWAY', '2026-01-01'],
      ['CA scannorder hier', 'sources:SCANNORDER', '2026-11-08'],
      ['chiffre des commandes en ligne de la semaine dernière', 'sources:SCANNORDER', '2026-11-02'],
      ['CA uber eats ce mois-ci', 'sources:UBER_EATS', '2026-11-01'],
      ['CA sur place samedi', 'orderTypes:IN', '2026-11-07'],
    ];
    for (const [text, channel, from] of cases) {
      const r = understand(index, text, ctx, cat);
      expect(bestKey(r), text).toBe('info.revenue');
      expect(best(r).slots.channel?.record?.id, text).toBe(channel);
      expect(best(r).slots.period.date?.from, text).toBe(from);
    }
    // Sans canal, pas de filtre ; « scannorder » seul reste la page ScanNOrder.
    expect(best(understand(index, "CA d'hier", ctx, cat)).slots.channel).toBeUndefined();
    expect(bestKey(understand(index, 'meilleures ventes borne', ctx, cat))).toBe('info.top_products');
  });

  it("n'apprend pas un synonyme quand l'intention expliquait déjà la phrase", () => {
    const r = run('plus de margherita ce soir svp merci beaucoup');
    const chosen = r.understanding.status === 'matched' ? r.understanding.best : r.understanding.candidates[0];
    expect(buildLearningSignal(index, r, chosen)?.term).toBeUndefined();
  });
});

it('les mots génériques ne déclenchent pas de canal', async () => {
  const { CHANNEL_RECORDS } = await import('../channels');
  const cat = buildCatalog(index, [...PRODUCTS, ...CHANNEL_RECORDS]);
  for (const text of ['combien de commandes hier', 'ventes de la semaine', 'CA de la semaine']) {
    expect(understand(index, text, ctx, cat).entities.filter((e) => e.type === 'channel'), text).toEqual([]);
  }
});
