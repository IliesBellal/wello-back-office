/**
 * Saisie de masse : de la grille à l'écran vers le payload canonique.
 *
 * Miroir de `BuildManualImport` côté API (internal/modules/menu/importer/
 * manual.go) pour ce qu'il refuse — nom vide, nom dupliqué, taux négatif —
 * afin que l'utilisateur le voie sur la ligne fautive plutôt qu'en retour
 * d'appel. Le reste des validations (existence de la catégorie, résolution des
 * taux, collisions) appartient à la prévisualisation, exactement comme pour un
 * fichier.
 *
 * Fonctions pures : elles ne lisent que les lignes saisies.
 */

import { parseDecimalInput, parsePriceInput } from '@/utils/priceInputUtils';
import type { ImportManualProductPayload } from '@/types/import';

/**
 * Une ligne de la grille. Tout y est en chaîne : c'est ce que l'utilisateur
 * tape, et le convertir à chaque frappe ferait sauter le curseur et
 * interdirait les états intermédiaires (« 9, » avant « 9,50 »).
 */
export interface ManualRow {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Prix en euros, tels que saisis. */
  priceIn: string;
  priceTakeAway: string;
  priceDelivery: string;
  /** Taux de TVA en pourcentage, tels que saisis. */
  tvaIn: string;
  tvaTakeAway: string;
  tvaDelivery: string;
  /** Tags séparés par des virgules. */
  tags: string;
}

export type ManualRowField = Exclude<keyof ManualRow, 'id'>;

let rowSequence = 0;

export const createManualRow = (seed: Partial<Omit<ManualRow, 'id'>> = {}): ManualRow => {
  rowSequence += 1;
  return {
    id: `manual-row-${rowSequence}`,
    name: '',
    description: '',
    category: '',
    priceIn: '',
    priceTakeAway: '',
    priceDelivery: '',
    tvaIn: '',
    tvaTakeAway: '',
    tvaDelivery: '',
    tags: '',
    ...seed,
  };
};

/**
 * Duplique une ligne en gardant ce qui se répète d'un produit à l'autre —
 * catégorie, TVA, tags — et en vidant ce qui lui est propre. C'est le geste
 * qu'on fait pour saisir douze pizzas à la suite.
 */
export const duplicateManualRow = (row: ManualRow): ManualRow =>
  createManualRow({
    category: row.category,
    priceIn: row.priceIn,
    priceTakeAway: row.priceTakeAway,
    priceDelivery: row.priceDelivery,
    tvaIn: row.tvaIn,
    tvaTakeAway: row.tvaTakeAway,
    tvaDelivery: row.tvaDelivery,
    tags: row.tags,
  });

/**
 * Une ligne à laquelle personne n'a touché. Elle est ignorée à l'envoi plutôt
 * que signalée : la dernière ligne d'une grille est presque toujours vierge, et
 * la refuser bloquerait chaque envoi.
 */
export const isManualRowBlank = (row: ManualRow): boolean =>
  !row.name.trim() &&
  !row.description.trim() &&
  !row.category.trim() &&
  !row.priceIn.trim() &&
  !row.priceTakeAway.trim() &&
  !row.priceDelivery.trim() &&
  !row.tvaIn.trim() &&
  !row.tvaTakeAway.trim() &&
  !row.tvaDelivery.trim() &&
  !row.tags.trim();

/** Erreurs de saisie, par identifiant de ligne puis par champ. */
export type ManualRowErrors = Map<string, Partial<Record<ManualRowField, string>>>;

export interface ManualValidation {
  errors: ManualRowErrors;
  /** Lignes qui partiront réellement, dans l'ordre de la grille. */
  submittable: ManualRow[];
  canSubmit: boolean;
}

const isNumericInput = (value: string): boolean => {
  if (!value.trim()) return true;
  return parseDecimalInput(value) !== undefined;
};

export const validateManualRows = (rows: ManualRow[]): ManualValidation => {
  const errors: ManualRowErrors = new Map();
  const submittable = rows.filter((row) => !isManualRowBlank(row));

  const setError = (rowId: string, field: ManualRowField, message: string) => {
    const existing = errors.get(rowId) ?? {};
    if (!existing[field]) {
      existing[field] = message;
      errors.set(rowId, existing);
    }
  };

  // Les noms doivent être uniques : deux lignes homonymes produiraient le même
  // identifiant externe côté API, qui les refuserait. On le dit ici, sur les
  // deux lignes concernées.
  const seenNames = new Map<string, number>();

  submittable.forEach((row, index) => {
    const name = row.name.trim();
    if (!name) {
      setError(row.id, 'name', 'Nom requis');
    } else {
      const key = name.toLowerCase();
      const previous = seenNames.get(key);
      if (previous !== undefined) {
        setError(row.id, 'name', `Déjà utilisé ligne ${previous + 1}`);
      } else {
        seenNames.set(key, index);
      }
    }

    if (!row.category.trim()) {
      setError(row.id, 'category', 'Catégorie requise');
    }

    const numericFields: [ManualRowField, string][] = [
      ['priceIn', row.priceIn],
      ['priceTakeAway', row.priceTakeAway],
      ['priceDelivery', row.priceDelivery],
      ['tvaIn', row.tvaIn],
      ['tvaTakeAway', row.tvaTakeAway],
      ['tvaDelivery', row.tvaDelivery],
    ];
    for (const [field, value] of numericFields) {
      if (!isNumericInput(value)) {
        setError(row.id, field, 'Nombre attendu');
      }
    }

    const rates: [ManualRowField, string][] = [
      ['tvaIn', row.tvaIn],
      ['tvaTakeAway', row.tvaTakeAway],
      ['tvaDelivery', row.tvaDelivery],
    ];
    for (const [field, value] of rates) {
      const rate = parseDecimalInput(value);
      if (rate !== undefined && rate < 0) {
        setError(row.id, field, 'Taux négatif');
      }
    }
  });

  return {
    errors,
    submittable,
    canSubmit: submittable.length > 0 && errors.size === 0,
  };
};

const splitTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

/**
 * Construit le payload envoyé à la prévisualisation.
 *
 * **C'est ici, et seulement ici, que les euros deviennent des centimes.** La
 * porte JSON attend des centimes, comme `CreateProductPayload` — contrairement
 * au modèle .xlsx, dont les euros sont convertis par le parser côté serveur.
 * Deux portes, deux endroits de conversion.
 *
 * Un taux laissé vide part à `null` et non à 0 : l'absence de taux réclame une
 * décision, un taux nul désactive le canal. Les confondre fermerait des canaux
 * que personne n'a demandé de fermer.
 */
export const buildManualPayload = (rows: ManualRow[]): ImportManualProductPayload[] =>
  rows.filter((row) => !isManualRowBlank(row)).map((row) => ({
    name: row.name.trim(),
    description: row.description.trim(),
    category: row.category.trim(),
    price: parsePriceInput(row.priceIn),
    price_take_away: parsePriceInput(row.priceTakeAway),
    price_delivery: parsePriceInput(row.priceDelivery),
    tva_in: parseDecimalInput(row.tvaIn) ?? null,
    tva_take_away: parseDecimalInput(row.tvaTakeAway) ?? null,
    tva_delivery: parseDecimalInput(row.tvaDelivery) ?? null,
    tags: splitTags(row.tags),
  }));

/** Catégories déjà saisies dans la grille, pour l'autocomplétion. */
export const manualCategorySuggestions = (
  rows: ManualRow[],
  extra: string[] = [],
): string[] => {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const value of [...extra, ...rows.map((row) => row.category)]) {
    const name = value.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(name);
  }

  return suggestions.sort((a, b) => a.localeCompare(b, 'fr'));
};
