/**
 * Types de l'import de produits en masse.
 *
 * Miroir du `PreviewResult` renvoyé par `POST /menu/import/preview`
 * (internal/modules/menu/importer/preview.go côté API). Les noms de champs
 * suivent le JSON du backend, pas les conventions TS, pour que la
 * correspondance reste évidente à la lecture.
 */

// ─── Providers ──────────────────────────────────────────────

export type ImportProviderSlug = 'zelty' | 'wello-generic';

export interface ImportProviderOption {
  slug: ImportProviderSlug;
  label: string;
  description: string;
  /** Un modèle vierge est téléchargeable pour ce provider. */
  hasTemplate: boolean;
}

/**
 * Providers proposés à l'import. `wello-generic` y figure parce qu'un modèle
 * Modèle Wello Resto rempli se ré-importe exactement comme un export tiers : c'est le même
 * endpoint, seul le parser diffère.
 */
export const IMPORT_PROVIDERS: ImportProviderOption[] = [
  {
    slug: 'wello-generic',
    label: 'Modèle Wello Resto rempli',
    description: 'Le modèle vierge téléchargé ici, une fois complété',
    hasTemplate: true,
  },
  {
    slug: 'zelty',
    label: 'Zelty',
    description: "Export de menu au format Excel produit par Zelty",
    hasTemplate: false,
  },
];

export const TEMPLATE_PROVIDER: ImportProviderSlug = 'wello-generic';

// ─── Résultat de la prévisualisation ────────────────────────

export type ImportEntityAction = 'create' | 'reuse_existing' | 'already_imported';
export type ImportTagClass = 'category' | 'tag';
export type ImportCollisionResolution = 'skip' | 'import_anyway';

/**
 * Sort d'un produit qu'un import précédent a déjà créé.
 *
 * La correspondance d'import survit à l'entité qu'elle désigne : supprimer un
 * produit dans Wello ne la retire pas. Sans cet arbitrage, un menu supprimé
 * puis réimporté donnait un commit sans effet.
 */
export type ImportReimportResolution = 'skip' | 'recreate';
export type ImportCategorySource = 'explicit' | 'first_tag' | 'none';

export interface ImportPreviewSummary {
  products_to_create: number;
  products_already_imported: number;
  products_removed_from_menu: number;
  products_needing_category: number;
  products_with_name_collision: number;
  /** Déjà importés, mais le produit Wello correspondant n'existe plus. */
  products_mapping_stale: number;
  categories_to_create: number;
  categories_reused: number;
  tags_to_create: number;
  tags_reused: number;
  tags_synthetic: number;
  attributes_to_create: number;
  attributes_already_imported: number;
  options_to_create: number;
  /** Porte « autre établissement » uniquement — 0 pour toute autre source. */
  component_categories_to_create: number;
  component_categories_reused: number;
  components_to_create: number;
  components_reused: number;
  /** Écartés par décision de l'utilisateur, avant tout autre arbitrage. */
  products_excluded: number;
  unresolved_tva_rates: number;
}

/**
 * Canal de vente, tel que stocké dans `tva_categories.delivery_type`.
 *
 * Le commentaire SQL de la colonne annonce des valeurs numériques
 * (« 0 => in, 1 => delivery, 3 => take away ») : il est faux, les données
 * portent ces trois chaînes. C'est aussi ce que compare `ProductCreateSheet`.
 */
export type ImportTvaChannel = 'IN' | 'TAKE_AWAY' | 'DELIVERY';

export interface ImportPreviewTvaRate {
  rate: number;
  channel: ImportTvaChannel;
  channel_label: string;
  tva_id: number;
  resolved: boolean;
  product_count: number;
  needed_for_backfill: boolean;
}

export interface ImportPreviewCategory {
  external_id: string;
  name: string;
  action: ImportEntityAction;
  existing_category_id?: string;
  product_count: number;
  mapping_stale?: boolean;
}

export interface ImportPreviewTag {
  external_id: string;
  name: string;
  class: ImportTagClass;
  synthetic: boolean;
  action: ImportEntityAction;
  product_count: number;
  existing_tag_id?: string;
  existing_category_id?: string;
  mapping_stale?: boolean;
}

export interface ImportPreviewChannel {
  price: number;
  rate: number | null;
  tva_id: number;
  available: boolean;
  resolved: boolean;
  backfilled: boolean;
  price_backfilled: boolean;
}

export interface ImportPreviewChannels {
  in: ImportPreviewChannel;
  take_away: ImportPreviewChannel;
  delivery: ImportPreviewChannel;
}

export interface ImportPreviewNameCollision {
  existing_product_id: number;
  existing_name: string;
  resolution: ImportCollisionResolution;
}

export interface ImportPreviewProduct {
  external_id: string;
  name: string;
  action: 'create' | 'already_imported';
  status: string;
  category_external_id: string;
  category_source: ImportCategorySource;
  needs_category: boolean;
  tag_external_ids: string[];
  dropped_label_external_ids?: string[];
  channels: ImportPreviewChannels;
  name_collision?: ImportPreviewNameCollision;
  /** Déjà importé, mais le produit Wello a disparu depuis. */
  mapping_stale?: boolean;
  reimport?: ImportReimportResolution;
  /** Reflète la décision courante `excluded_products` — porte « autre établissement » uniquement. */
  excluded?: boolean;

  // Porte photo (provider `ai_photo`) uniquement — absents ailleurs.
  /** Nature proposée par la lecture, qui détermine la TVA proposée. */
  kind?: ImportProductKind;
  /** Produit groupe (sans prix) dont les déclinaisons le citent en `parent_external_id`. */
  is_group?: boolean;
  parent_external_id?: string;
  confidence?: 'high' | 'medium' | 'low';
  issues?: string[];
  /** Numéro de la photo (à partir de 1) où la ligne a été lue. */
  source_photo?: number;
}

/** Porte « autre établissement » uniquement. */
export interface ImportPreviewComponentCategory {
  external_id: string;
  name: string;
  action: ImportEntityAction;
  existing_category_id?: string;
  mapping_stale?: boolean;
}

/** Porte « autre établissement » uniquement. */
export interface ImportPreviewComponent {
  external_id: string;
  name: string;
  action: ImportEntityAction;
  existing_component_id?: string;
  mapping_stale?: boolean;
}

export interface ImportPreviewAttribute {
  external_id: string;
  name: string;
  action: ImportEntityAction;
  option_count: number;
  min_options: number;
  max_options: number;
  mapping_stale?: boolean;
}

export interface ImportPreviewWarning {
  code: string;
  message: string;
  ref?: string;
}

/**
 * Décisions proposées par la prévisualisation, renvoyées telles quelles —
 * amendées — au commit. Les clés de `tva_mapping` sont au format
 * `"<taux>:<canal>"`, encodage du `TvaRateKey` côté API.
 */
export interface ImportDecisions {
  tag_classification: Record<string, ImportTagClass>;
  category_per_product: Record<string, string>;
  tva_mapping: Record<string, number>;
  name_collisions: Record<string, ImportCollisionResolution>;
  /**
   * Produits déjà importés : les ignorer (défaut) ou les recréer. Ne concerne
   * que les produits — catégories, tags et groupes d'options dont la
   * correspondance est périmée sont recréés d'office.
   */
  already_imported: Record<string, ImportReimportResolution>;
  /**
   * Produits explicitement écartés du catalogue source, avant tout autre
   * arbitrage — porte « autre établissement » uniquement (`{}` ailleurs).
   */
  excluded_products: Record<string, boolean>;
  /** Porte photo : nature par produit — ses trois taux de TVA en découlent. */
  kind_per_product?: Record<string, ImportProductKind>;
  /** Porte photo : groupe de rattachement par produit, `""` = à la racine. */
  group_per_product?: Record<string, string>;
  /** Porte photo : le restaurateur a vérifié les taux proposés. Exigé au commit. */
  tva_confirmed?: boolean;
}

export interface ImportPreviewResult {
  token: string;
  provider: string;
  expires_at: string;
  summary: ImportPreviewSummary;
  tva_rates: ImportPreviewTvaRate[];
  categories: ImportPreviewCategory[];
  tags: ImportPreviewTag[];
  products: ImportPreviewProduct[];
  attributes: ImportPreviewAttribute[];
  /** Porte « autre établissement » uniquement — absents/vides ailleurs. */
  component_categories: ImportPreviewComponentCategory[];
  components: ImportPreviewComponent[];
  warnings: ImportPreviewWarning[];
  decisions: ImportDecisions;
}

// ─── Commit ─────────────────────────────────────────────────

/** Codes de blocage renvoyés en 422 par `POST /menu/import/commit`. */
export const IMPORT_BLOCKER_CODES = {
  needsCategory: 'product_needs_category',
  tvaUnresolved: 'tva_rate_unresolved',
  collisionUnresolved: 'product_name_collision_unresolved',
  invalidTvaMapping: 'invalid_tva_mapping',
  invalidCategoryDecision: 'invalid_category_decision',
  tvaNotConfirmed: 'tva_not_confirmed',
  invalidKindDecision: 'invalid_kind_decision',
  invalidGroupDecision: 'invalid_group_decision',
} as const;

export interface ImportCommitBlocker {
  code: string;
  /** Identifiant externe de l'entité fautive, ou `"<taux>:<canal>"` pour la TVA. */
  ref?: string;
  message: string;
}

export interface ImportCommitCounts {
  created: number;
  reused: number;
  skipped: number;
}

export interface ImportCommitSummary {
  categories: ImportCommitCounts;
  tags: ImportCommitCounts;
  attributes: ImportCommitCounts;
  products: ImportCommitCounts;
  options_created: number;
}

export interface ImportCommitEntity {
  external_id: string;
  wello_id?: string;
  action: 'created' | 'reused' | 'skipped';
}

export interface ImportCommitResponse {
  provider: string;
  summary: ImportCommitSummary;
  categories: ImportCommitEntity[];
  tags: ImportCommitEntity[];
  attributes: ImportCommitEntity[];
  products: ImportCommitEntity[];
}

/** Canaux de vente, dans l'ordre d'affichage. */
export const TVA_CHANNELS: { value: ImportTvaChannel; label: string }[] = [
  { value: 'IN', label: 'Sur place' },
  { value: 'TAKE_AWAY', label: 'À emporter' },
  { value: 'DELIVERY', label: 'En livraison' },
];

export const tvaChannelLabel = (channel: string): string =>
  TVA_CHANNELS.find((entry) => entry.value === channel)?.label ?? channel;

/**
 * Clé du mapping de TVA, au format produit par `TvaRateKey.MarshalText` côté
 * API : `"<taux>:<canal>"`, par exemple `"5.5:DELIVERY"`.
 */
export const tvaMappingKey = (rate: number, channel: string): string => `${rate}:${channel}`;

// ─── Saisie de masse ────────────────────────────────────────

/**
 * Une ligne de la porte JSON de `POST /menu/import/preview`
 * (internal/modules/menu/import_models.go).
 *
 * Prix en **centimes**, comme `CreateProductPayload` : c'est le back-office qui
 * convertit. Taux de TVA en **pourcentage**, `null` quand rien n'est saisi —
 * une absence de taux réclame une décision, un taux nul désactive le canal.
 * `category` est un **nom**, pas un identifiant : la prévisualisation
 * réutilisera la catégorie existante du même nom, ou la créera.
 */
export interface ImportManualProductPayload {
  name: string;
  description: string;
  category: string;
  price: number;
  price_take_away: number;
  price_delivery: number;
  tva_in: number | null;
  tva_take_away: number | null;
  tva_delivery: number | null;
  tags: string[];
}

// ─── Porte photo (lecture de carte par l'IA) ────────────────

/** Provider des prévisualisations issues de photos. */
export const AI_PHOTO_PROVIDER = 'ai_photo';

/**
 * Nature d'un produit lu sur une photo. Elle ne sert qu'à proposer la TVA :
 * une carte n'affiche jamais les taux (internal/modules/menu/importer/kind.go).
 */
export type ImportProductKind =
  | 'food'
  | 'hot_drink'
  | 'soft_drink_served'
  | 'soft_drink_sealed'
  | 'packaged_food'
  | 'alcohol'
  | 'other';

export interface ImportProductKindOption {
  value: ImportProductKind;
  label: string;
  /** Taux proposés sur place / à emporter / en livraison ; `null` = à saisir. */
  rates: { in: number; take_away: number; delivery: number } | null;
}

/**
 * Natures et taux proposés — miroir de `KindTvaRates` côté API (table validée
 * le 2026-09-29). Affiché pour que le restaurateur voie ce que son choix
 * implique ; c'est l'API qui applique.
 */
export const PRODUCT_KINDS: ImportProductKindOption[] = [
  { value: 'food', label: 'Plat, dessert, snack', rates: { in: 10, take_away: 10, delivery: 10 } },
  { value: 'hot_drink', label: 'Boisson chaude', rates: { in: 10, take_away: 10, delivery: 10 } },
  {
    value: 'soft_drink_served',
    label: 'Boisson sans alcool servie (verre, carafe, jus pressé)',
    rates: { in: 10, take_away: 10, delivery: 10 },
  },
  {
    value: 'soft_drink_sealed',
    label: 'Boisson sans alcool fermée (canette, bouteille)',
    rates: { in: 10, take_away: 5.5, delivery: 5.5 },
  },
  {
    value: 'packaged_food',
    label: 'Produit emballé à consommer plus tard',
    rates: { in: 10, take_away: 5.5, delivery: 5.5 },
  },
  { value: 'alcohol', label: 'Boisson alcoolisée', rates: { in: 20, take_away: 20, delivery: 20 } },
  { value: 'other', label: 'À préciser', rates: null },
];

export const productKindOption = (kind: string | undefined): ImportProductKindOption | undefined =>
  PRODUCT_KINDS.find((option) => option.value === kind);

export type ImportPhotoDraftStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'committed'
  | 'expired';

export interface ImportPhotoDraftPhoto {
  photo: number;
  status: 'pending' | 'done' | 'failed';
  error?: string;
  /** Lien signé, valable une heure. */
  url?: string;
}

/** `GET /menu/import/ai/{id}` — `preview` présent une fois les photos lues. */
export interface ImportPhotoDraft {
  id: string;
  status: ImportPhotoDraftStatus;
  error?: string;
  created_at: string;
  expires_at: string;
  photos_total: number;
  photos_done: number;
  photos: ImportPhotoDraftPhoto[];
  preview?: ImportPreviewResult;
}

export interface ImportPhotoDraftSummary {
  id: string;
  status: ImportPhotoDraftStatus;
  created_at: string;
  expires_at: string;
  photos_total: number;
  photos_done: number;
}

export interface ImportPhotoCredits {
  total: number;
  used: number;
  remaining: number;
}

/** `GET /menu/import/drafts`. */
export interface ImportPhotoDrafts {
  drafts: ImportPhotoDraftSummary[];
  credits: ImportPhotoCredits;
}
