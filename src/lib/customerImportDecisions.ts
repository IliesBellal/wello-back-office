/**
 * Logique de décision de l'import de clients.
 *
 * Miroir de `BuildPreview` et `BuildCommitPlan` côté API
 * (internal/modules/customers/importer/{preview,commit_plan}.go) : mêmes
 * résolutions par défaut, mêmes choix valables par statut. Le backend reste
 * juge — il refuse en 422 ce qui ne va pas — mais l'écran de vérification
 * doit proposer les bonnes options sans deviner, et pouvoir résumer le lot
 * avant l'envoi.
 *
 * Toutes les fonctions sont pures.
 */

import type {
  CustomerCommitRowDecision,
  CustomerImportCommitBlocker,
  CustomerImportMatchedBy,
  CustomerImportResolution,
  CustomerImportRow,
  CustomerImportRowStatus,
} from '@/types/customerImport';

/**
 * Résolution proposée par défaut pour une ligne, selon son statut — miroir
 * exact du `switch` de statut dans `BuildPreview` (preview.go). Calculée
 * depuis `row.status` plutôt que renvoyée telle quelle depuis `row.resolution`
 * du serveur : ça garde le front capable de dire ce qui est attendu même hors
 * d'une réponse réseau (tests, reset d'une ligne).
 */
export const defaultResolution = (row: Pick<CustomerImportRow, 'status'>): CustomerImportResolution => {
  switch (row.status) {
    case 'create':
      return 'create';
    case 'mapping_stale':
      return 'recreate';
    case 'already_imported':
    case 'duplicate':
    case 'conflict':
    default:
      return 'skip';
  }
};

/**
 * Choix valables pour une ligne, dans l'ordre d'affichage attendu par les
 * sélecteurs. Une ligne `create` n'a pas de choix à proposer — elle n'a pas
 * de section dédiée dans l'écran de vérification, elle n'est comptée que dans
 * le résumé.
 */
export const allowedResolutions = (
  row: Pick<CustomerImportRow, 'status'>,
): CustomerImportResolution[] => {
  switch (row.status) {
    case 'duplicate':
      return ['skip', 'update', 'import_anyway'];
    case 'conflict':
      return ['skip', 'update_to_email', 'update_to_phone', 'import_anyway'];
    case 'already_imported':
    case 'mapping_stale':
      return ['skip', 'recreate'];
    case 'create':
    default:
      return ['create'];
  }
};

/** Libellé lisible du champ de rapprochement, pour « rapproché par email/téléphone/les deux ». */
export const matchedByLabel = (matchedBy: CustomerImportMatchedBy | undefined): string => {
  switch (matchedBy) {
    case 'email':
      return 'email';
    case 'phone':
      return 'téléphone';
    case 'both':
      return 'email et téléphone';
    default:
      return 'email ou téléphone';
  }
};

/** Lignes d'un statut donné, dans l'ordre du fichier. */
export const rowsByStatus = (
  rows: CustomerImportRow[],
  status: CustomerImportRowStatus,
): CustomerImportRow[] => rows.filter((row) => row.status === status);

/**
 * Résolution effective d'une ligne : celle choisie dans le wizard si elle
 * existe, sinon le défaut du statut. `resolutions` est initialisé aux
 * défauts par `useCustomerImport`, donc en pratique l'entrée existe toujours
 * — le repli reste là pour une ligne apparue après coup (défensif).
 */
export const effectiveResolution = (
  row: CustomerImportRow,
  resolutions: Record<string, CustomerImportResolution>,
): CustomerImportResolution => resolutions[row.external_id] ?? defaultResolution(row);

export interface CustomerImportPlanSummary {
  toCreate: number;
  toUpdate: number;
  toRecreate: number;
  skipped: number;
  /** Total qui sera réellement écrit : à créer + à mettre à jour + à recréer. */
  totalToImport: number;
}

/**
 * Compte les lignes par action réelle (et non par statut) : c'est ce
 * qu'affiche le bouton d'envoi et l'écran final. `create` et
 * `import_anyway` créent tous les deux une nouvelle fiche, `update`/
 * `update_to_email`/`update_to_phone` mettent tous à jour une fiche
 * existante — même regroupement que `materializeImportTx` côté API
 * (customer_import_commit_service.go), qui traite Creates et Recreates comme
 * deux INSERT identiques et les trois formes d'Update comme un seul UPDATE.
 */
export const summarize = (
  rows: CustomerImportRow[],
  resolutions: Record<string, CustomerImportResolution>,
): CustomerImportPlanSummary => {
  let toCreate = 0;
  let toUpdate = 0;
  let toRecreate = 0;
  let skipped = 0;

  for (const row of rows) {
    switch (effectiveResolution(row, resolutions)) {
      case 'create':
      case 'import_anyway':
        toCreate += 1;
        break;
      case 'update':
      case 'update_to_email':
      case 'update_to_phone':
        toUpdate += 1;
        break;
      case 'recreate':
        toRecreate += 1;
        break;
      case 'skip':
      default:
        skipped += 1;
        break;
    }
  }

  return { toCreate, toUpdate, toRecreate, skipped, totalToImport: toCreate + toUpdate + toRecreate };
};

/** Indexe les blocages d'un 422 par ligne, pour les rendre au bon endroit. */
export const indexBlockersByRef = (
  blockers: CustomerImportCommitBlocker[],
): Map<string, CustomerImportCommitBlocker> => {
  const byRef = new Map<string, CustomerImportCommitBlocker>();
  for (const blocker of blockers) {
    if (blocker.ref) byRef.set(blocker.ref, blocker);
  }
  return byRef;
};

/**
 * Construit le tableau `decisions` envoyé au commit.
 *
 * Ne porte que les lignes dont la résolution diverge du défaut du snapshot :
 * `BuildCommitPlan` (commit_plan.go) garde le défaut pour tout ExternalID
 * absent de la liste, l'envoyer quand même n'apporterait rien — et à
 * l'échelle réelle (jusqu'à ~18 500 clients), la plupart des lignes restent
 * sur leur défaut, un payload complet serait inutilement lourd.
 */
export const buildCommitDecisions = (
  rows: CustomerImportRow[],
  resolutions: Record<string, CustomerImportResolution>,
): CustomerCommitRowDecision[] => {
  const decisions: CustomerCommitRowDecision[] = [];

  for (const row of rows) {
    const resolution = effectiveResolution(row, resolutions);
    if (resolution !== defaultResolution(row)) {
      decisions.push({ external_id: row.external_id, resolution });
    }
  }

  return decisions;
};

/** Résolutions par défaut de toutes les lignes — pour initialiser l'état du wizard. */
export const defaultResolutions = (
  rows: CustomerImportRow[],
): Record<string, CustomerImportResolution> => {
  const resolutions: Record<string, CustomerImportResolution> = {};
  for (const row of rows) {
    resolutions[row.external_id] = defaultResolution(row);
  }
  return resolutions;
};
