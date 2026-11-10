/**
 * Intentions de navigation : une par page visible de navConfig.
 *
 * Le modèle (serveur ou embarqué) apporte les synonymes des pages (`nav.<id>`) ;
 * navConfig apporte le chemin, le titre et la visibilité (droits, modules).
 * Une page ajoutée à navConfig est donc comprise tout de suite par son titre,
 * sans toucher au modèle ; une page invisible pour l'utilisateur n'est jamais
 * proposée.
 */
import { getVisibleNavItems } from '@/config/navConfig';
import { normalize } from '@/lib/assistant/normalize';
import type { AssistantModel, ModelIntent, ModelTerm } from '@/lib/assistant/types';
import type { AuthData } from '@/types/auth';

/**
 * Pages qui savent s'ouvrir filtrées (voir lib/pageFilters.ts et l'action
 * `navigate`) : « caisses de janvier », « commandes annulées hier »,
 * « analyse borne de la semaine dernière ».
 */
const FILTERED_PAGES: Record<string, { channel?: boolean }> = {
  'cash-registers-history': {},
  'dashboard-analysis': { channel: true },
  'dashboard-order-history': { channel: true },
  'reservations-list': {},
  'financial-report': {},
  'vat-declaration': {},
  pointages: {},
};

const GENERIC_TITLES = new Set(['Paramètres', 'Gestion', 'Activité', 'Hub', 'Statistiques', "Vue d'ensemble"]);

interface NavPage {
  id: string;
  title: string;
  label: string;
  path: string;
  parentTitle?: string;
}

function visiblePages(authData: AuthData | null | undefined): NavPage[] {
  const pages: NavPage[] = [];
  getVisibleNavItems(authData).forEach((item) => {
    if (item.href) pages.push({ id: item.id, title: item.title, label: item.title, path: item.href });
    item.children?.forEach((child) =>
      pages.push({
        id: child.id,
        title: child.title,
        label: GENERIC_TITLES.has(child.title) ? `${child.title} · ${item.title}` : child.title,
        path: child.href,
        parentTitle: item.title,
      }),
    );
  });
  return pages;
}

function titleTerms(page: NavPage, stopwords: Set<string>): ModelTerm[] {
  const term = (text: string, weight: number): ModelTerm => ({
    text,
    kind: text.includes(' ') ? 'phrase' : 'keyword',
    weight,
    source: 'seed',
    status: 'validated',
  });
  const out: ModelTerm[] = [];
  const title = normalize(page.title);
  const parent = page.parentTitle ? normalize(page.parentTitle) : '';
  const generic = GENERIC_TITLES.has(page.title);
  title.split(' ').filter((t) => t && !stopwords.has(t)).forEach((t) => out.push(term(t, generic ? 0.5 : 1)));
  if (title.includes(' ')) out.push(term(title, 2));
  if (parent) {
    out.push(term(`${title} ${parent}`, 2.2), term(`${parent} ${title}`, 2.2));
    parent.split(' ').filter((t) => t && !stopwords.has(t)).forEach((t) => out.push(term(t, 0.3)));
  }
  return out;
}

export function withNavigation(model: AssistantModel, authData: AuthData | null | undefined): AssistantModel {
  const stopwords = new Set(model.stopwords);
  const byKey = new Map(model.intents.map((i) => [i.key, i]));
  const navIntents: ModelIntent[] = visiblePages(authData).map((page) => {
    const existing = byKey.get(`nav.${page.id}`);
    return {
      key: `nav.${page.id}`,
      label: page.label,
      kind: 'navigate',
      action: 'navigate',
      params: { ...(existing?.params ?? {}), nav_id: page.id, path: page.path },
      slots: FILTERED_PAGES[page.id]
        ? [
            { name: 'period', entity: 'date', required: false, prefer: page.id === 'reservations-list' ? 'future' : 'past' },
            ...(FILTERED_PAGES[page.id].channel ? [{ name: 'channel', entity: 'channel' as const, required: false }] : []),
          ]
        : [],
      permission: null, // déjà filtré par navConfig
      module: null,
      confirm: false,
      sensitive: false,
      surfaces: [model.surface],
      priority: existing?.priority ?? 0,
      examples: existing?.examples ?? [],
      terms: [...titleTerms(page, stopwords), ...(existing?.terms ?? [])],
    };
  });
  return {
    ...model,
    intents: [...model.intents.filter((i) => i.kind !== 'navigate'), ...navIntents],
  };
}
