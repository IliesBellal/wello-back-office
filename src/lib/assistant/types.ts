/**
 * Contrat du « modèle » de l'assistant et des résultats du moteur.
 *
 * Ce fichier ne dépend ni de React ni du DOM : le moteur (engine.ts) est
 * portable tel quel (POS, borne, Node) et le format du modèle est le contrat
 * partagé avec l'API (GET /assistant/model) et les futurs clients (Flutter).
 * Voir docs/assistant/README.md.
 */

/** Surfaces clientes. Chaque intention déclare celles où elle a un sens. */
export type Surface = 'backoffice' | 'pos' | 'kiosk';

/** Type de réponse produite par une intention. */
export type IntentKind = 'action' | 'navigate' | 'info' | 'system';

export type TermKind = 'keyword' | 'phrase';
export type TermSource = 'seed' | 'manual' | 'learned';
/** Seuls les termes `active` et `validated` sont servis aux clients. */
export type TermStatus = 'candidate' | 'active' | 'validated' | 'rejected';

/** Types d'entités reconnues dans une phrase. */
export type EntityType = 'product' | 'employee' | 'customer' | 'date' | 'quantity' | 'text';

export interface SlotDef {
  name: string;
  entity: EntityType;
  required: boolean;
  /** Question posée quand le slot est requis et absent. */
  prompt?: string;
  /** Valeur par défaut, pour `date` : 'today' | 'yesterday' | 'week' | 'month'. */
  default?: string;
  /**
   * Pour `date` : sens d'un jour ambigu (« samedi »). 'past' pour un bilan
   * (CA de samedi dernier), 'future' pour une prévision (qui travaille samedi).
   */
  prefer?: 'past' | 'future';
}

export interface ModelTerm {
  /** Identifiant serveur (absent pour les termes embarqués). */
  id?: number;
  /** Texte normalisé (voir normalize.ts). */
  text: string;
  kind: TermKind;
  weight: number;
  source: TermSource;
  status: TermStatus;
}

export interface ModelIntent {
  key: string;
  label: string;
  description?: string;
  kind: IntentKind;
  /** Identifiant du gestionnaire côté client (ex. 'product.set_availability'). */
  action: string;
  params: Record<string, unknown>;
  slots: SlotDef[];
  permission?: string | null;
  module?: string | null;
  confirm: boolean;
  sensitive: boolean;
  surfaces: Surface[];
  priority: number;
  examples: string[];
  terms: ModelTerm[];
}

/** Surnom appris propre à un établissement (« le dessert du jour » → produit X). */
export interface ModelAlias {
  id?: number;
  entity_type: EntityType;
  entity_id: string;
  alias: string;
}

export interface ModelThresholds {
  /** Score minimal (0-100) pour exécuter / proposer directement. */
  accept: number;
  /** Écart minimal avec le second candidat, sinon on demande de choisir. */
  ambiguity_gap: number;
  /** Score minimal pour qu'un candidat figure dans les suggestions de repli. */
  suggest: number;
}

export interface AssistantModel {
  schema: 1;
  version: string;
  surface: Surface;
  generated_at: string;
  thresholds: ModelThresholds;
  stopwords: string[];
  hints: Partial<Record<IntentKind, string[]>>;
  intents: ModelIntent[];
  aliases: ModelAlias[];
}

// ─── Entités ────────────────────────────────────────────────────────────────

/** Élément d'un catalogue d'entités (produits, équipiers…) fourni au moteur. */
export interface EntityRecord {
  type: EntityType;
  id: string;
  name: string;
  /** Données libres renvoyées telles quelles dans le match (prix, dispo…). */
  meta?: Record<string, unknown>;
}

export interface DateRange {
  /** AAAA-MM-JJ, inclus. */
  from: string;
  to: string;
  /** Libellé lisible : « aujourd'hui », « samedi dernier »… */
  label: string;
  /** Créneau de la journée si précisé. */
  daypart?: 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
  /** Granularité, utile pour les comparaisons. */
  grain: 'day' | 'week' | 'month' | 'year';
}

export interface EntityMatch {
  type: EntityType;
  /** Index des tokens consommés [start, end[. */
  start: number;
  end: number;
  /** Texte d'origine (normalisé) ayant servi au match. */
  text: string;
  /** 0..1 */
  score: number;
  record?: EntityRecord;
  /** Candidats proches quand le match n'est pas certain (homonymes, fautes). */
  alternatives?: EntityRecord[];
  date?: DateRange;
  quantity?: number;
  /** Vrai si le match vient d'un alias appris. */
  viaAlias?: boolean;
  /** Identifiant serveur de l'alias (signal d'usage pour l'apprentissage). */
  aliasId?: number;
}

// ─── Résultat du moteur ─────────────────────────────────────────────────────

export interface ScoredIntent {
  intent: ModelIntent;
  /** 0..100 */
  score: number;
  /** Termes qui ont contribué (pour l'apprentissage et le diagnostic). */
  matchedTerms: ModelTerm[];
  /** Slots résolus par nom. */
  slots: Record<string, EntityMatch>;
  /** Slots requis manquants. */
  missingSlots: SlotDef[];
  /** Positions des tokens consommés par les termes de l'intention. */
  consumed: number[];
  /** Vrai si le score vient seulement d'une entité (« tiramisu » seul). */
  entityOnly?: boolean;
}

export type Understanding =
  | { status: 'matched'; best: ScoredIntent; candidates: ScoredIntent[] }
  | { status: 'ambiguous'; candidates: ScoredIntent[] }
  | { status: 'fallback'; candidates: ScoredIntent[] };

export interface UnderstandResult {
  /** Texte d'origine. */
  raw: string;
  /** Texte normalisé complet. */
  normalized: string;
  tokens: string[];
  entities: EntityMatch[];
  /**
   * Tokens restants une fois les entités et mots vides retirés : c'est ce qui
   * est appris comme synonyme si l'utilisateur choisit une suggestion.
   */
  residual: string[];
  understanding: Understanding;
  /** Demande enchaînée détectée (« … et … ») : segments supplémentaires non traités. */
  extraSegments: string[];
  /**
   * Entités du même type que le slot principal, en plus de celle retenue
   * (« plus de saumon et de tiramisu ») : traitées une par une.
   */
  extraEntities: EntityMatch[];
  durationMs: number;
}

/** Ce que l'API doit apprendre après une action réussie issue d'une suggestion. */
export interface LearningSignal {
  /** Événement de repli / d'ambiguïté à l'origine. */
  source_event_id?: string;
  query_norm: string;
  intent_key: string;
  /** Synonyme candidat de l'intention. */
  term?: { text: string; kind: TermKind };
  /** Surnom candidat d'une entité (propre à l'établissement). */
  alias?: { entity_type: EntityType; entity_id: string; text: string };
}

export interface UnderstandContext {
  /** Clés de permission détenues ; `'*'` = tout (administrateur). */
  permissions: Set<string> | '*';
  /** Modules souscrits ; absent = pas de filtrage. */
  modules?: Set<string>;
  /** Page courante, pour un léger bonus de contexte. */
  path?: string;
  /** Dernière entité mentionnée (« mets-le en rupture »). */
  lastEntity?: EntityMatch;
  /** Date de référence (tests). */
  now?: Date;
}
