/**
 * Types de l'import de clients en masse.
 *
 * Miroir du `PreviewResult` renvoyé par `POST /customers/import/preview` et du
 * `CommitSummary` renvoyé par `POST /customers/import/commit`
 * (internal/modules/customers/importer/{preview,commit_plan}.go côté API).
 * Les noms de champs suivent le JSON du backend, pas les conventions TS,
 * comme le fait déjà `types/import.ts` pour les produits.
 */

// ─── Providers ──────────────────────────────────────────────

export type CustomerImportProviderSlug = 'zelty' | 'wello-generic' | 'manual';

export interface CustomerImportProviderOption {
  slug: CustomerImportProviderSlug;
  label: string;
  description: string;
  /** Extension de fichier attendue, pour la validation côté client. */
  extension: '.xlsx' | '.csv';
}

/**
 * Providers proposés à l'import par fichier. `manual` n'y figure pas : ce
 * n'est pas un fichier, c'est la troisième porte de `ImportDoorPicker`.
 */
export const CUSTOMER_IMPORT_PROVIDERS: CustomerImportProviderOption[] = [
  {
    slug: 'wello-generic',
    label: 'Modèle Wello rempli (.xlsx)',
    description: 'Le modèle vierge téléchargé depuis cet écran, une fois complété',
    extension: '.xlsx',
  },
  {
    slug: 'zelty',
    label: 'Export Zelty (.csv)',
    description: 'Export de la fiche clients au format CSV produit par Zelty',
    extension: '.csv',
  },
];

export const TEMPLATE_PROVIDER: CustomerImportProviderSlug = 'wello-generic';

// ─── Résultat de la prévisualisation ────────────────────────

export type CustomerImportRowStatus =
  | 'create'
  | 'already_imported'
  | 'mapping_stale'
  | 'duplicate'
  | 'conflict';

export type CustomerImportMatchedBy = 'email' | 'phone' | 'both';

/**
 * Résolution d'une ligne, proposée par la preview ou choisie dans le wizard.
 * Toutes les valeurs ne sont pas valables pour tous les statuts — voir
 * `allowedResolutions` dans `lib/customerImportDecisions.ts`.
 */
export type CustomerImportResolution =
  | 'create'
  | 'skip'
  | 'recreate'
  | 'update'
  | 'import_anyway'
  | 'update_to_email'
  | 'update_to_phone';

export interface CustomerImportSummary {
  total: number;
  to_create: number;
  duplicates: number;
  conflicts: number;
  already_imported: number;
  mapping_stale: number;
}

export interface CustomerImportWarning {
  code: string;
  ref?: string;
  message: string;
}

export interface CustomerImportRow {
  external_id: string;
  source_line: number;
  display_name: string;
  status: CustomerImportRowStatus;

  /** Renseigné seulement pour `duplicate`. */
  matched_by?: CustomerImportMatchedBy;
  matched_customer_id?: number;

  /** Renseignés seulement pour `conflict`. */
  email_customer_id?: number;
  phone_customer_id?: number;

  resolution: CustomerImportResolution;
}

export interface CustomerImportPreviewResult {
  token: string;
  summary: CustomerImportSummary;
  rows: CustomerImportRow[];
  warnings: CustomerImportWarning[];
}

// ─── Commit ─────────────────────────────────────────────────

/** Une ligne du tableau `decisions` envoyé au commit. */
export interface CustomerCommitRowDecision {
  external_id: string;
  resolution: CustomerImportResolution;
}

/** Codes de blocage renvoyés en 422 par `POST /customers/import/commit`. */
export const CUSTOMER_IMPORT_BLOCKER_CODES = {
  unknownDecision: 'unknown_decision',
  newDuplicateDetected: 'new_duplicate_detected',
  invalidUpdateTarget: 'invalid_update_target',
  invalidDecision: 'invalid_decision',
} as const;

export interface CustomerImportCommitBlocker {
  code: string;
  /** Identifiant externe de la ligne fautive, absent pour un blocage global. */
  ref?: string;
  message: string;
}

export interface CustomerImportCommitSummary {
  created: number;
  updated: number;
  recreated: number;
  skipped: number;
}

// ─── Saisie manuelle ────────────────────────────────────────

/**
 * Une ligne de la porte JSON de `POST /customers/import/preview`
 * (internal/modules/customers/customer_import_models.go côté API).
 *
 * Tout est en chaîne, y compris la date de naissance (`JJ/MM/AAAA`, parsée
 * côté serveur) : c'est le back-office qui construit ce payload depuis la
 * grille de saisie, pas la grille elle-même.
 */
export interface CustomerManualImportInput {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  floor_number: string;
  door_number: string;
  additional_address: string;
  business_name: string;
  birthdate: string;
  additional_info: string;
  delivery_notes: string;
  /** `null` non distingué de `undefined` par le serveur : nil ⇒ false explicite au commit. */
  advertising_consent: boolean | null;
}
