/**
 * Corpus de non-régression : des phrases réalistes et leurs pièges (mots
 * partagés entre demandes : « commande », « fiche », « caisse », « TVA »,
 * « client », noms de produits, nombres). Chaque phrase doit être comprise
 * comme attendu, ou donner lieu à la bonne question quand elle est vraiment
 * ambiguë. Tout ajout de vocabulaire doit garder ce corpus vert.
 */
import { describe, expect, it } from 'vitest';
import { withNavigation } from '@/components/assistant/navIntents';
import { normalizeAuthData } from '@/types/auth';
import { CHANNEL_RECORDS } from '../channels';
import { buildSeedModel, SEED_BLACKLIST } from '../defaultModel';
import { buildCatalog, prepareModel, understand } from '../engine';
import type { EntityRecord, UnderstandContext } from '../types';

const NOW = new Date(2026, 10, 9, 19, 0, 0);

const RECORDS: EntityRecord[] = [
  { type: 'product', id: 'p1', name: 'Tiramisu maison' },
  { type: 'product', id: 'p2', name: 'Pavé de saumon' },
  { type: 'product', id: 'p3', name: 'Saumon fumé' },
  { type: 'product', id: 'p4', name: 'Pizza Margherita' },
  { type: 'product', id: 'p5', name: 'Menu enfant' },
  { type: 'product', id: 'p6', name: 'Coca-Cola' },
  { type: 'product', id: 'p7', name: 'Burger maison' },
  { type: 'product', id: 'p8', name: 'Café gourmand' },
  { type: 'employee', id: 'e1', name: 'Camille Durand', meta: { user_id: 'u1' } },
  { type: 'employee', id: 'e2', name: 'Lucas Martin' },
  ...CHANNEL_RECORDS,
];

// Tous les modules souscrits : toutes les pages sont visibles.
const auth = normalizeAuthData({
  access: { admin: true },
  session: { merchant_id: 'm1' },
  capabilities: { modules: { kiosks: true, stock: true, bookings: true, haccp: true } },
} as never);
const index = prepareModel(withNavigation(buildSeedModel(), auth), SEED_BLACKLIST);
const catalog = buildCatalog(index, RECORDS);
const ctx: UnderstandContext = { permissions: '*', now: NOW };

/**
 * Attendu : une intention comprise ; une question dont l'une des intentions
 * listées est proposée en premier ; ou un repli (suggestions éventuelles).
 */
type Expect = string | { ask: string | string[] } | 'fallback';

const CORPUS: Array<[string, Expect]> = [
  // ── Rupture / remise en vente
  ['plus de tiramisu', 'menu.product.out_of_stock'],
  ["y a plus de saumon fumé", 'menu.product.out_of_stock'],
  ['le burger est en rupture', 'menu.product.out_of_stock'],
  ['coca épuisé', 'menu.product.out_of_stock'],
  ['on a plus de café gourmand', 'menu.product.out_of_stock'],
  ['margherita plus dispo', 'menu.product.out_of_stock'],
  ['remets le tiramisu en vente', 'menu.product.back_in_stock'],
  ['le coca est de nouveau dispo', 'menu.product.back_in_stock'],
  ['la margherita est plus en rupture', 'menu.product.back_in_stock'],
  ['saumon', { ask: 'menu.product.out_of_stock' }],
  ['tiramisu', { ask: 'menu.product.out_of_stock' }],
  // ── Fiche produit / création
  ['ouvre le tiramisu', 'product.open'],
  ['fiche produit margherita', 'product.open'],
  ['modifier le burger', 'product.open'],
  ['fiche du café gourmand', 'product.open'],
  ['crée un produit', 'menu.product.create'],
  ['ajoute un plat', 'menu.product.create'],
  ['nouveau produit', 'menu.product.create'],
  // ── CA
  ["CA d'aujourd'hui", 'info.revenue'],
  ['combien on a fait hier', 'info.revenue'],
  ['chiffre d affaires de la semaine dernière', 'info.revenue'],
  ['CA borne en janvier', 'info.revenue'],
  ['CA à emporter cette année', 'info.revenue'],
  ['CA scannorder hier', 'info.revenue'],
  ['panier moyen du mois', 'info.revenue'],
  ['combien de commandes hier', 'info.revenue'],
  // ── Meilleures ventes, ruptures, équipe, réservations
  ['meilleures ventes de la semaine', 'info.top_products'],
  ["qu'est-ce qui se vend le mieux", 'info.top_products'],
  ['meilleures ventes borne', 'info.top_products'],
  ["qu'est-ce qui est en rupture", 'info.out_of_stock_list'],
  ['liste des ruptures', 'info.out_of_stock_list'],
  ['qui travaille ce soir', 'info.staff_on_shift'],
  ['qui bosse demain midi', 'info.staff_on_shift'],
  ['réservations de ce soir', 'info.bookings'],
  ['combien de couverts samedi', 'info.bookings'],
  // ── Documents
  ["factures d'octobre", 'documents.download'],
  ['relevés de virement de septembre', 'documents.download'],
  ['rapport comptable du mois dernier', 'documents.download'],
  ['documents comptables', 'documents.download'],
  ['export tva de mars', 'documents.download'],
  ['virements de janvier', 'documents.download'],
  ['facture de commission', 'documents.download'],
  // ── Commande par numéro
  ['ouvre la commande 42098', 'orders.open'],
  ['commande 42098', 'orders.open'],
  ['retrouve le ticket 1207', 'orders.open'],
  ['commande numéro 87', 'orders.open'],
  ['#42098', { ask: 'orders.open' }],
  // Sans numéro : la fiche d'une commande ou l'historique ?
  ['ouvre la commande', { ask: 'orders.open' }],
  // ── Fiche équipier / client
  ['ouvre la fiche de camille', 'staff.open'],
  ['profil de lucas', 'staff.open'],
  ['fiche équipier camille', 'staff.open'],
  ['fiche client Dupont', 'customers.open'],
  ['retrouve la cliente Martin', 'customers.open'],
  ['cherche le client 0612345678', 'customers.open'],
  ['client Dupont', 'customers.open'],
  ['mes clients', 'nav.customers-list'],
  ['clientèle', 'nav.customers-list'],
  ['registres', 'nav.cash-registers-history'],
  ['ingrédients', { ask: ['nav.ingredients', 'nav.ingredient-categories'] }],
  ['catégories', { ask: ['nav.categories', 'nav.ingredient-categories', 'nav.market-categories'] }],
  // ── Navigation simple
  ['ouvre la TVA', 'nav.vat-declaration'],
  ['plan de salle', 'nav.floor-plan'],
  ['mes horaires', 'nav.my-planning'],
  ['uber eats', 'nav.uber-eats'],
  ['imprimantes', 'nav.printers'],
  ['fichier client', 'nav.customers-list'],
  ['liste des clients', 'nav.customers-list'],
  ['programme de fidélité', 'nav.loyalty-programs'],
  ['planning', 'nav.planning'],
  ['stocks', 'nav.stocks'],
  ['archives fiscales', 'nav.fiscal-archives'],
  ['abonnement', 'nav.subscription'],
  ['ouvre les promotions', 'nav.promotions'],
  ['historique des commandes', 'nav.dashboard-order-history'],
  ['grille de prix', 'nav.price-grid'],
  ['paramètres haccp', 'nav.haccp-settings'],
  ['mes bornes', 'nav.kiosk-devices'],
  ['affichage client', 'nav.cds'],
  // ── Navigation filtrée
  ['caisse de janvier', 'nav.cash-registers-history'],
  ['registres de décembre', 'nav.cash-registers-history'],
  ['commandes annulées hier', 'nav.dashboard-order-history'],
  ['commandes refusées cette semaine', 'nav.dashboard-order-history'],
  ['pointages de la semaine dernière', 'nav.pointages'],
  ['pointages de camille', 'nav.pointages'],
  ['rapports financiers du mois dernier', 'nav.financial-report'],
  ['TVA de septembre', 'nav.vat-declaration'],
  ['liste des réservations de samedi', 'nav.reservations-list'],
  ['analyse de la semaine dernière', 'nav.dashboard-analysis'],
  // ── Pièges : produits nommés comme des pages, nombres, prénoms
  ['ouvre le menu', 'nav.products'],
  ['plus de menu enfant', 'menu.product.out_of_stock'],
  ['fiche menu enfant', 'product.open'],
  ['commande du 12 novembre', 'nav.dashboard-order-history'],
  ['commandes de 2025', 'nav.dashboard-order-history'],
  ['qui travaille avec camille samedi', 'info.staff_on_shift'],
  ['réservations en attente', 'nav.reservations-list'],
  ['réservations de 4 personnes samedi', 'nav.reservations-list'],
  ['CA de la borne', 'info.revenue'],
  ['ouvre la borne', 'nav.kiosk-devices'],
  ['mes bornes', 'nav.kiosk-devices'],
  ['factures', { ask: ['documents.download', 'nav.subscription'] }],
  ['TVA', 'nav.vat-declaration'],
  ['commande uber eats 4521', 'orders.open'],
  ['ouvre la commande 42', 'orders.open'],
  ["la commande 42 d'hier", 'orders.open'],
  ['la commande 64 du 22 juin', 'orders.open'],
  ["ouvre la commande 7 de samedi dernier", 'orders.open'],
  ["commande 42 d'hier", 'orders.open'],
  ["le ticket 15 de ce midi", 'orders.open'],
  ["commandes d'hier", 'nav.dashboard-order-history'],
  ['commandes annulées du 22 juin', 'nav.dashboard-order-history'],
  // ── Ambiguïtés voulues
  ['caisse', { ask: ['nav.cash-registers-history', 'nav.categories'] }],
  ['horaires', { ask: 'nav.planning' }],
  // ── Système
  ['aide', 'system.help'],
  ['que sais-tu faire', 'system.help'],
  ['déconnexion', 'system.logout'],
  // ── Hors périmètre : repli
  ['commande-moi une pizza chez le voisin', 'fallback'],
  ['quel temps fait-il', 'fallback'],
  ['écris un post instagram', 'fallback'],
  ['bonjour', 'fallback'],
];

function outcome(text: string) {
  const r = understand(index, text, ctx, catalog);
  const u = r.understanding;
  if (u.status === 'matched') return { status: 'matched' as const, key: u.best.intent.key, r };
  return { status: u.status, key: u.candidates[0]?.intent.key ?? null, r };
}

describe('corpus de non-régression', () => {
  it('chaque phrase est comprise comme attendu', () => {
    const failures: string[] = [];
    for (const [text, expected] of CORPUS) {
      const o = outcome(text);
      const ok =
        expected === 'fallback'
          ? o.status === 'fallback'
          : typeof expected === 'string'
            ? o.status === 'matched' && o.key === expected
            : o.status !== 'matched' && ([] as string[]).concat(expected.ask).includes(o.key ?? '');
      if (!ok) {
        const top = o.r.understanding.candidates.slice(0, 3).map((c) => `${c.intent.key}:${Math.round(c.score)}`).join(', ');
        failures.push(`« ${text} » → ${o.status} ${o.key ?? '∅'} (attendu ${JSON.stringify(expected)}) [${top}]`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('aucune phrase d’exemple ne part ailleurs que son intention', () => {
    const failures: string[] = [];
    index.intents.forEach((pi) =>
      pi.intent.examples.forEach((ex) => {
        const o = outcome(ex);
        if (o.key !== pi.intent.key) failures.push(`exemple « ${ex} » de ${pi.intent.key} → ${o.status} ${o.key}`);
      }),
    );
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('les fiches et liens filtrés reçoivent le bon paramètre', async () => {
    const { filteredPath } = await import('@/components/assistant/actions');
    const { freeTextOf } = await import('@/components/assistant/useAssistantConversation');
    const best = (t: string) => {
      const r = understand(index, t, ctx, catalog);
      if (r.understanding.status !== 'matched') throw new Error(t);
      return { s: r.understanding.best, r };
    };
    expect(best('ouvre la commande 42098').s.slots.number.quantity).toBe(42098);
    // Le numéro et la date ne se mélangent pas : « 22 juin » est la date, 64 le numéro.
    const juin = best('la commande 64 du 22 juin').s;
    expect(juin.slots.number.quantity).toBe(64);
    expect(juin.slots.period.date).toMatchObject({ from: '2026-06-22', to: '2026-06-22' });
    const hier = best("la commande 42 d'hier").s;
    expect(hier.slots.number.quantity).toBe(42);
    expect(hier.slots.period.start).toBeGreaterThanOrEqual(0);
    expect(best('ouvre la fiche de camille').s.slots.employee.record?.id).toBe('e1');
    const { s, r } = best('fiche client Hélène Dupont');
    expect(freeTextOf(index, r, s)).toBe('Hélène Dupont');
    const p = best('pointages de camille').s;
    expect(filteredPath('pointages', '/equipe/pointages', p.slots, '')).toBe('/equipe/pointages?employee=e1');
    const v = understand(index, 'TVA borne de septembre', ctx, catalog);
    const vat = [...(v.understanding.status === 'matched' ? [v.understanding.best] : []), ...v.understanding.candidates].find((c) => c.intent.key === 'nav.vat-declaration')!;
    expect(filteredPath('vat-declaration', '/accounting/vat', vat.slots, '')).toBe('/accounting/vat?from=2026-09-01&to=2026-09-30&sources=KIOSK');
    const resa = understand(index, 'réservations en attente de 4 personnes samedi', ctx, catalog);
    const page = [...(resa.understanding.status === 'matched' ? [resa.understanding.best] : []), ...resa.understanding.candidates].find((c) => c.intent.key === 'nav.reservations-list');
    expect(filteredPath('reservations-list', '/reservations/list', page?.slots ?? {}, 'réservations en attente de 4 personnes samedi')).toContain('status=pending&party=4');
  });
});
