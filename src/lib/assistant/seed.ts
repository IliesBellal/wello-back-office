/**
 * Pré-remplissage canonique de l'assistant (« modèle » initial).
 *
 * SOURCE UNIQUE DE VÉRITÉ :
 *  - embarqué dans le front comme modèle par défaut (hors ligne, avant le
 *    premier chargement, ou si l'API ne répond pas) ;
 *  - transformé en migration SQL pour ib-welloresto-api par
 *    `npm run assistant:seed-sql` (scripts/assistant-seed-sql.ts).
 *
 * Les termes sont écrits en français naturel : ils sont normalisés
 * (minuscules, sans accents ni ponctuation) au moment de la construction du
 * modèle, avec la même fonction que celle appliquée aux phrases tapées.
 *
 * Conventions :
 *  - keyword : un seul mot ; phrase : plusieurs mots consécutifs ;
 *  - poids par défaut : 1 pour un mot, 1.5 pour une phrase ; un mot générique
 *    (« produit ») a un poids plus faible pour ne pas voler les requêtes ;
 *  - les intentions `nav.<id>` reprennent les `id` de src/config/navConfig.ts :
 *    le titre de la page fournit déjà ses mots-clés, on n'ajoute ici que des
 *    synonymes.
 */
import type { IntentKind, SlotDef, Surface } from './types';

export type SeedTerm = string | [text: string, weight: number];

export interface SeedIntent {
  key: string;
  label: string;
  description?: string;
  kind: IntentKind;
  action: string;
  params?: Record<string, unknown>;
  slots?: SlotDef[];
  permission?: string | null;
  module?: string | null;
  confirm?: boolean;
  /** Jamais de promotion automatique d'un synonyme appris : validation humaine obligatoire. */
  sensitive?: boolean;
  surfaces?: Surface[];
  priority?: number;
  examples?: string[];
  keywords?: SeedTerm[];
  phrases?: SeedTerm[];
}

export interface SeedLexicon {
  stopwords: string[];
  hints: Record<Exclude<IntentKind, 'system'>, string[]>;
  blacklist: string[];
}

const PRODUCT_SLOT: SlotDef = {
  name: 'product',
  entity: 'product',
  required: true,
  prompt: 'Quel produit ?',
};

/** Canal de vente facultatif (« CA borne », « ventes à emporter »). */
const CHANNEL: SlotDef = { name: 'channel', entity: 'channel', required: false };
const PERIOD_TODAY: SlotDef = { name: 'period', entity: 'date', required: false, default: 'today', prefer: 'past' };
/** « samedi » = samedi qui vient : planning, réservations. */
const PERIOD_UPCOMING: SlotDef = { name: 'period', entity: 'date', required: false, default: 'today', prefer: 'future' };

// ─── Actions, informations, système ─────────────────────────────────────────

const CORE_INTENTS: SeedIntent[] = [
  {
    key: 'menu.product.out_of_stock',
    label: 'Marquer une rupture',
    description: 'Rendre un produit indisponible à la vente',
    kind: 'action',
    action: 'product.set_availability',
    params: { available: false },
    slots: [PRODUCT_SLOT],
    permission: 'catalog.manage',
    confirm: true,
    priority: 10,
    examples: ['Plus de tiramisu', 'Le saumon est en rupture', 'Mets la margherita en pause'],
    keywords: [['rupture', 1.3], 'epuise', 'epuisee', 'fini', 'finie', 'indisponible', 'termine', 'manque', ['pause', 0.8]],
    phrases: [
      ['plus de', 1.4],
      ['y a plus', 1.6],
      ['n y a plus', 1.8],
      ['il y a plus', 1.6],
      ['en rupture', 1.6],
      ['mettre en rupture', 1.8],
      ['plus dispo', 1.6],
      ['plus disponible', 1.6],
      ['pas dispo', 1.4],
      ['hors stock', 1.6],
      ['sold out', 1.6],
      ['on a plus', 1.6],
      ['en pause', 1.2],
      ['retire de la carte', 1.4],
    ],
  },
  {
    key: 'menu.product.back_in_stock',
    label: 'Remettre en vente',
    description: 'Rendre un produit de nouveau disponible',
    kind: 'action',
    action: 'product.set_availability',
    params: { available: true },
    slots: [PRODUCT_SLOT],
    permission: 'catalog.manage',
    confirm: true,
    priority: 10,
    examples: ['Remets le tiramisu en vente', 'Le saumon est de nouveau dispo'],
    keywords: ['remets', 'remettre', 'reactive', 'reactiver', 'redispo', 'revenu', 'recu', ['dispo', 0.7], ['disponible', 0.7]],
    phrases: [
      ['remettre en vente', 1.8],
      ['remets en vente', 1.8],
      ['de nouveau dispo', 1.8],
      ['de nouveau disponible', 1.8],
      ['a nouveau dispo', 1.8],
      ['re dispo', 1.6],
      ['plus en rupture', 2],
      ['fin de rupture', 1.8],
      ['remettre en stock', 1.6],
      ['on a recu', 1.4],
      ['y en a de nouveau', 1.8],
      ['est revenu', 1.4],
    ],
  },
  {
    key: 'menu.product.create',
    label: 'Créer un produit',
    description: 'Ouvrir le formulaire de création de produit',
    kind: 'action',
    action: 'product.create',
    permission: 'catalog.manage',
    confirm: false,
    priority: 5,
    examples: ['Crée un nouveau produit', 'Ajoute un plat à la carte'],
    keywords: ['creer', 'cree', 'creation', 'ajouter', 'ajoute', 'nouveau', 'nouvelle', 'nouvel', ['produit', 0.5], ['plat', 0.5], ['article', 0.5]],
    phrases: [
      ['nouveau produit', 2],
      ['creer un produit', 2],
      ['cree un produit', 2],
      ['ajouter un produit', 2],
      ['ajoute un produit', 2],
      ['ajoute un plat', 2],
      ['nouvel article', 1.8],
      ['nouveau plat', 1.8],
    ],
  },
  {
    key: 'info.revenue',
    label: "Chiffre d'affaires",
    description: "CA, nombre de commandes et panier moyen sur une période",
    kind: 'info',
    action: 'info.revenue',
    slots: [PERIOD_TODAY, CHANNEL],
    permission: 'reports.sales.read',
    priority: 8,
    examples: ["CA d'aujourd'hui", "Combien on a fait hier ?", 'CA à emporter cette année', 'CA borne en janvier'],
    keywords: [['ca', 1.4], 'chiffre', 'recette', 'recettes', 'encaisse', ['ventes', 0.7], ['vente', 0.6], ['total', 0.5], ['commandes', 0.6]],
    phrases: [
      ["chiffre d affaires", 2],
      ['combien on a fait', 1.8],
      ['combien j ai fait', 1.8],
      ['on a fait combien', 1.8],
      ['fait combien', 1.4],
      ['panier moyen', 1.6],
      ['combien de commandes', 1.6],
      ['nombre de commandes', 1.6],
    ],
  },
  {
    key: 'info.top_products',
    label: 'Meilleures ventes',
    description: 'Les produits les plus vendus sur une période',
    kind: 'info',
    action: 'info.top_products',
    slots: [{ name: 'period', entity: 'date', required: false, default: 'week', prefer: 'past' }, CHANNEL],
    permission: 'reports.sales.read',
    priority: 7,
    examples: ['Meilleures ventes de la semaine', "Qu'est-ce qui se vend le mieux ?"],
    keywords: ['top', 'populaire', 'populaires', 'bestseller'],
    phrases: [
      ['meilleures ventes', 2],
      ['meilleure vente', 2],
      ['plus vendu', 2],
      ['plus vendus', 2],
      ['se vend le mieux', 2],
      ['qui marche', 1.4],
      ['best seller', 1.8],
      ['top ventes', 2],
    ],
  },
  {
    key: 'info.out_of_stock_list',
    label: 'Produits en rupture',
    description: 'La liste des produits actuellement indisponibles',
    kind: 'info',
    action: 'info.out_of_stock_list',
    priority: 6,
    examples: ["Qu'est-ce qui est en rupture ?", 'Liste des ruptures'],
    keywords: ['ruptures', ['liste', 0.6]],
    phrases: [
      ['quels produits', 1.2],
      ['liste des ruptures', 2],
      ['qu est ce qui est en rupture', 2.4],
      ['quoi en rupture', 2],
      ['qui est en rupture', 2],
      ['produits en rupture', 2],
      ['produits indisponibles', 2],
      ['ruptures en cours', 2],
    ],
  },
  {
    key: 'info.staff_on_shift',
    label: 'Qui travaille',
    description: "L'équipe planifiée sur un jour ou un service",
    kind: 'info',
    action: 'info.staff_on_shift',
    slots: [PERIOD_UPCOMING],
    permission: 'staff.schedule.manage',
    priority: 7,
    examples: ['Qui travaille ce soir ?', 'Qui bosse demain midi ?'],
    keywords: [['equipe', 0.7], ['staff', 0.8], ['planning', 0.6], 'service'],
    phrases: [
      ['qui travaille', 2.2],
      ['qui bosse', 2.2],
      ['qui est la', 1.6],
      ['qui est de service', 2.2],
      ['qui est present', 2],
      ['qui est en service', 2.2],
      ['qui vient', 1.4],
      ['planning du jour', 1.8],
      ['en service', 1.2],
    ],
  },
  {
    key: 'info.bookings',
    label: 'Réservations',
    description: 'Les réservations et couverts sur une période',
    kind: 'info',
    action: 'info.bookings',
    slots: [PERIOD_UPCOMING],
    permission: 'bookings.manage',
    priority: 7,
    examples: ['Réservations de ce soir', 'Combien de couverts samedi ?'],
    keywords: [['reservation', 1.3], ['reservations', 1.3], ['resa', 1.2], ['resas', 1.2], ['couverts', 1.2], 'booking'],
    phrases: [
      ['combien de couverts', 2],
      ['combien de reservations', 2],
      ['tables reservees', 1.8],
      ['qui a reserve', 2],
    ],
  },
  {
    key: 'system.help',
    label: 'Ce que je sais faire',
    kind: 'system',
    action: 'system.help',
    priority: 3,
    examples: ['Aide', 'Que sais-tu faire ?'],
    keywords: ['aide', 'help', 'exemples', 'exemple'],
    phrases: [
      ['que sais tu faire', 2.4],
      ['tu sais faire quoi', 2.4],
      ['tu fais quoi', 2],
      ['comment ca marche', 2],
      ['qu est ce que tu sais faire', 2.4],
    ],
  },
  {
    key: 'system.logout',
    label: 'Se déconnecter',
    kind: 'system',
    action: 'system.logout',
    confirm: true,
    sensitive: true,
    priority: 1,
    examples: ['Déconnexion'],
    keywords: ['deconnexion', 'deconnecter', 'deconnecte', 'logout'],
    phrases: [
      ['me deconnecter', 2],
      ['se deconnecter', 2],
      ['fermer la session', 1.8],
    ],
  },
];

// ─── Navigation : synonymes des pages de navConfig ──────────────────────────

const nav = (id: string, keywords: SeedTerm[], phrases: SeedTerm[] = []): SeedIntent => ({
  key: `nav.${id}`,
  label: id,
  kind: 'navigate',
  action: 'navigate',
  params: { nav_id: id },
  keywords,
  phrases,
});

const NAV_INTENTS: SeedIntent[] = [
  nav('home', ['accueil', 'dashboard', 'maison'], [['page d accueil', 2], ['tableau de bord', 1.6]]),
  nav('dashboard-analysis', ['analyse', 'analyses', 'statistiques', 'stats', 'kpi', 'graphiques'], [['analyse des ventes', 2]]),
  nav('dashboard-order-history', ['historique', 'commandes', 'tickets'], [['historique des commandes', 2], ['anciennes commandes', 1.8], ['liste des commandes', 1.8]]),
  nav('products', ['produits', 'carte', 'menu', 'plats', 'articles'], [['la carte', 1.4], ['mes produits', 1.8]]),
  nav('categories', ['categories', 'familles'], [['categories caisse', 2]]),
  nav('tags', ['tags', 'etiquettes', 'labels']),
  nav('ingredients', ['ingredients', 'composants', 'matieres'], [['matieres premieres', 2]]),
  nav('price-grid', ['prix', 'tarifs', 'tarif', 'grille'], [['grille de prix', 2], ['grille tarifaire', 2]]),
  nav('modifiers', ['options', 'supplements', 'garnitures', 'sauces', 'modificateurs']),
  nav('promotions', ['promotions', 'promo', 'promos', 'reductions', 'happy', 'disponibilites'], [['happy hour', 2]]),
  nav('floor-plan', ['salle', 'tables', 'plan'], [['plan de salle', 2], ['plan des tables', 2]]),
  nav('reservations-list', ['reservations', 'resas', 'bookings'], [['liste des reservations', 2]]),
  nav('reservations-settings', [], [['parametres des reservations', 2], ['reglages reservations', 2]]),
  nav('customers-list', ['clients', 'clientele', 'fichier'], [['fichier client', 2], ['liste clients', 2]]),
  nav('loyalty-programs', ['fidelite', 'fidelisation', 'points', 'cagnotte'], [['programme de fidelite', 2], ['carte de fidelite', 2]]),
  nav('equipiers', ['equipiers', 'salaries', 'employes', 'personnel', 'staff', 'collaborateurs']),
  nav('planning', ['planning', 'horaires', 'shifts', 'emploi'], [['emploi du temps', 2], ['planning equipe', 2]]),
  nav('my-planning', [], [['mon planning', 2.2], ['mes horaires', 2], ['mes shifts', 2]]),
  nav('pointages', ['pointages', 'pointage', 'badgeuse', 'heures'], [['feuille de temps', 2]]),
  nav('conges-echanges', ['conges', 'vacances', 'absences', 'echanges'], [['demandes de conges', 2], ['echanges de shifts', 2]]),
  nav('equipe-parametres', [], [['parametres equipe', 2], ['reglages equipe', 2]]),
  nav('roles', ['roles', 'droits', 'permissions', 'acces']),
  nav('stocks', ['stocks', 'stock', 'inventaire', 'reappro']),
  nav('cash-registers-history', ['registres', 'registre', 'caisses', 'fonds', 'cloture'], [['registres de caisse', 2], ['caisses du jour', 2], ['cloture de caisse', 2]]),
  nav('vat-declaration', ['tva', 'taxes'], [['declaration de tva', 2.2]]),
  nav('financial-report', ['rapport', 'rapports', 'comptable', 'bilan'], [['rapports financiers', 2], ['rapport financier', 2]]),
  nav('fiscal-archives', ['archives', 'archive'], [['archives fiscales', 2.2]]),
  nav('attestation', ['attestation', 'conformite', 'certificat', 'nf525'], [['attestation de conformite', 2.2]]),
  nav('integrations-overview', ['integrations', 'plateformes', 'canaux', 'connexions']),
  nav('market-categories', ['vitrine'], [['categories vitrine', 2.2]]),
  nav('scannorder', ['scannorder', 'qr', 'qrcode'], [['scan and order', 2], ['commande a table', 1.8], ['click and collect', 1.8]]),
  nav('uber-eats', ['uber', 'ubereats'], [['uber eats', 2.2]]),
  nav('deliveroo', ['deliveroo']),
  nav('accounting-sync', ['pennylane', 'synchronisation'], [['logiciel comptable', 2], ['synchro comptable', 2]]),
  nav('franchise-manage', ['franchise', 'franchises', 'reseau']),
  nav('franchise-hub', ['hub']),
  nav('franchise-stats', [], [['statistiques franchise', 2.2], ['stats franchise', 2.2]]),
  nav('haccp-activity', ['haccp', 'hygiene', 'temperatures', 'tracabilite', 'nettoyage']),
  nav('haccp-settings', [], [['parametres haccp', 2.2]]),
  nav('kiosk-devices', ['borne', 'bornes', 'kiosk', 'kiosque']),
  nav('kiosk-settings', [], [['parametres borne', 2.2], ['parametres kiosk', 2.2]]),
  nav('cds', ['ecran', 'ecrans', 'cds', 'affichage'], [['affichage client', 2.2], ['ecran client', 2]]),
  nav('establishment', ['etablissement', 'restaurant', 'adresse', 'horaires'], [['infos du restaurant', 2], ['horaires d ouverture', 2]]),
  nav('printers', ['imprimante', 'imprimantes', 'tickets']),
  nav('production-profiles', ['production', 'cuisine', 'bons'], [['profils de production', 2.2], ['bons de cuisine', 2]]),
  nav('profile', ['profil', 'compte'], [['mon profil', 2.2], ['mon compte', 2.2], ['mot de passe', 1.8]]),
  nav('my-permissions', [], [['mes droits', 2.2], ['mes permissions', 2.2]]),
  nav('subscription', ['abonnement', 'facturation', 'factures', 'forfait', 'offre']),
];

export const SEED_INTENTS: SeedIntent[] = [...CORE_INTENTS, ...NAV_INTENTS];

// ─── Lexique ────────────────────────────────────────────────────────────────

export const SEED_LEXICON: SeedLexicon = {
  // Mots ignorés pour les mots-clés et la couverture. Ils restent visibles des
  // phrases (« n y a plus » contient des mots vides).
  stopwords: [
    'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'a',
    // « ca » n'est PAS un mot vide : c'est l'abréviation de chiffre d'affaires.
    'est', 'ce', 'cet', 'cette', 'ces', 'c',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
    'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'm', 'te', 't', 'se', 's', 'moi', 'toi',
    'en', 'y', 'que', 'qu', 'pour', 'par', 'sur', 'dans', 'avec', 'chez', 'vers',
    'svp', 'stp', 'plait', 'merci', 'please', 'bonjour', 'salut', 'hello', 'coucou', 'hey',
    'peux', 'peut', 'pourrais', 'pourrait', 'veux', 'voudrais', 'voudrait', 'aimerais', 'faut', 'faudrait',
    'donc', 'alors', 'bon', 'ben', 'bah', 'euh', 'hum', 'ok', 'okay', 'oui', 'si',
    'fais', 'faire', 'mets', 'mettre', 'met', 'passe', 'passer', 'donne', 'donner', 'dis', 'dire',
    'moment', 'maintenant', 'actuellement',
  ],
  // Mots qui orientent vers un type d'intention sans désigner laquelle.
  hints: {
    navigate: ['ouvre', 'ouvrir', 'ouvrez', 'va', 'vas', 'aller', 'allez', 'affiche', 'afficher', 'montre', 'montrer', 'voir', 'page', 'ecran', 'onglet', 'section', 'acceder', 'emmene', 'direction'],
    info: ['combien', 'quel', 'quelle', 'quels', 'quelles', 'qui', 'quoi', 'liste', 'resume', 'bilan', 'comment'],
    action: ['marque', 'marquer', 'change', 'changer', 'ajoute', 'ajouter', 'cree', 'creer', 'active', 'desactive', 'retire', 'enleve', 'remets'],
  },
  // Jamais appris seuls comme synonymes (trop génériques ou bruit).
  blacklist: [
    'fais', 'faire', 'mets', 'mettre', 'truc', 'machin', 'chose', 'trucs', 'ok', 'oui', 'non', 'test', 'tests', 'merci',
    'bonjour', 'salut', 'stp', 'svp', 'le', 'la', 'les', 'un', 'une', 'ca', 'cela', 'ceci', 'ici', 'plus', 'moins',
    'encore', 'aussi', 'tout', 'tous', 'rien', 'quoi', 'hein', 'euh', 'bref', 'voila', 'lol', 'mdr',
  ],
};
