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
 * Wello rempli se ré-importe exactement comme un export tiers : c'est le même
 * endpoint, seul le parser diffère.
 */
export const IMPORT_PROVIDERS: ImportProviderOption[] = [
  {
    slug: 'zelty',
    label: 'Zelty',
    description: "Export de menu au format Excel produit par Zelty",
    hasTemplate: false,
  },
  {
    slug: 'wello-generic',
    label: 'Modèle Wello rempli',
    description: 'Le modèle vierge téléchargé ici, une fois complété',
    hasTemplate: true,
  },
];

export const TEMPLATE_PROVIDER: ImportProviderSlug = 'wello-generic';

// ─── Résultat de la prévisualisation ────────────────────────

export type ImportEntityAction = 'create' | 'reuse_existing' | 'already_imported';
export type ImportTagClass = 'category' | 'tag';
export type ImportCollisionResolution = 'skip' | 'import_anyway';
export type ImportCategorySource = 'explicit' | 'first_tag' | 'none';

export interface ImportPreviewSummary {
  products_to_create: number;
  products_already_imported: number;
  products_removed_from_menu: number;
  products_needing_category: number;
  products_with_name_collision: number;
  categories_to_create: number;
  categories_reused: number;
  tags_to_create: number;
  tags_reused: number;
  tags_synthetic: number;
  attributes_to_create: number;
  attributes_already_imported: number;
  options_to_create: number;
  unresolved_tva_rates: number;
}

export interface ImportPreviewTvaRate {
  rate: number;
  /** delivery_type tel que stocké : 0 sur place, 1 livraison, 3 emporté. */
  channel: number;
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
}

export interface ImportPreviewAttribute {
  external_id: string;
  name: string;
  action: ImportEntityAction;
  option_count: number;
  min_options: number;
  max_options: number;
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
  warnings: ImportPreviewWarning[];
  decisions: ImportDecisions;
}
