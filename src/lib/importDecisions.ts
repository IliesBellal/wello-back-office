/**
 * Logique de décision de l'import de produits.
 *
 * Miroir de `BuildCommitPlan` côté API (internal/modules/menu/importer/
 * commit_plan.go) : mêmes règles de dérivation, mêmes conditions de blocage.
 * Le backend reste juge — il refuse en 422 ce qui ne va pas — mais l'écran de
 * vérification doit savoir dire à l'avance ce qui manque, sinon l'utilisateur
 * découvrirait les problèmes un par un à chaque tentative.
 *
 * Toutes les fonctions sont pures : elles ne lisent que la prévisualisation et
 * l'état des décisions.
 */

import {
  tvaMappingKey,
  type ImportDecisions,
  type ImportPreviewProduct,
  type ImportPreviewResult,
  type ImportPreviewTvaRate,
} from '@/types/import';

export interface ImportCategoryOption {
  externalId: string;
  name: string;
  /** Provient d'un libellé reclassé, et non d'une colonne « Catégorie ». */
  fromLabel: boolean;
}

/**
 * Identifiants utilisables comme catégorie : celles que la source désigne
 * explicitement, plus les libellés classés « catégorie ».
 */
export const categoryLabelIds = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): Set<string> => {
  const ids = new Set<string>(preview.categories.map((category) => category.external_id));

  for (const tag of preview.tags) {
    const classification = decisions.tag_classification[tag.external_id] ?? tag.class;
    if (classification === 'category') {
      ids.add(tag.external_id);
    }
  }

  return ids;
};

/** Catégories proposées dans les sélecteurs, triées par nom. */
export const categoryOptions = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportCategoryOption[] => {
  const usable = categoryLabelIds(preview, decisions);
  const options: ImportCategoryOption[] = [];

  for (const category of preview.categories) {
    if (usable.has(category.external_id)) {
      options.push({ externalId: category.external_id, name: category.name, fromLabel: false });
    }
  }
  for (const tag of preview.tags) {
    if (usable.has(tag.external_id)) {
      options.push({ externalId: tag.external_id, name: tag.name, fromLabel: true });
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

/**
 * Un produit déjà importé n'est pas recréé, et un homonyme tranché en
 * « ignorer » non plus : ni l'un ni l'autre n'a besoin d'être complété.
 */
export const isMaterializable = (
  product: ImportPreviewProduct,
  decisions: ImportDecisions,
): boolean => {
  if (product.action === 'already_imported') return false;

  if (product.name_collision) {
    const resolution =
      decisions.name_collisions[product.external_id] ?? product.name_collision.resolution;
    if (resolution === 'skip') return false;
  }

  return true;
};

/**
 * Catégorie retenue : décision forcée, sinon celle de la source, sinon le
 * premier libellé du produit classé « catégorie ». `null` = à trancher.
 */
export const resolveProductCategory = (
  product: ImportPreviewProduct,
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): string | null => {
  const usable = categoryLabelIds(preview, decisions);

  const forced = decisions.category_per_product[product.external_id];
  if (forced && usable.has(forced)) return forced;

  if (product.category_external_id && usable.has(product.category_external_id)) {
    return product.category_external_id;
  }

  for (const labelId of product.tag_external_ids) {
    if (usable.has(labelId)) return labelId;
  }

  return null;
};

/** Produits qui seront créés et à qui il manque encore une catégorie. */
export const productsNeedingCategory = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportPreviewProduct[] =>
  preview.products.filter(
    (product) =>
      isMaterializable(product, decisions) &&
      resolveProductCategory(product, preview, decisions) === null,
  );

/**
 * Couples (taux, canal) sans `tva_id`. Le mapping fait foi : la
 * prévisualisation y a déjà placé tout ce qu'elle a su résoudre, l'utilisateur
 * complète le reste.
 */
export const unresolvedTvaRates = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportPreviewTvaRate[] =>
  preview.tva_rates.filter((rate) => !decisions.tva_mapping[tvaMappingKey(rate.rate, rate.channel)]);

/** Collisions de nom sans arbitrage explicite. */
export const unresolvedCollisions = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportPreviewProduct[] =>
  preview.products.filter(
    (product) =>
      product.action !== 'already_imported' &&
      product.name_collision &&
      !decisions.name_collisions[product.external_id],
  );

export interface ImportPrecheck {
  canCommit: boolean;
  needsCategory: ImportPreviewProduct[];
  unresolvedTva: ImportPreviewTvaRate[];
  unresolvedCollisions: ImportPreviewProduct[];
  /** Produits qui seront réellement créés, une fois les arbitrages appliqués. */
  materializableCount: number;
}

/**
 * Reproduit les conditions de rejet du commit. Le bouton reste gris tant
 * qu'elles ne sont pas levées — mais c'est bien le backend qui tranche, ce
 * pré-contrôle n'est qu'une politesse.
 */
export const importPrecheck = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportPrecheck => {
  const needsCategory = productsNeedingCategory(preview, decisions);
  const unresolvedTva = unresolvedTvaRates(preview, decisions);
  const collisions = unresolvedCollisions(preview, decisions);

  return {
    canCommit:
      needsCategory.length === 0 && unresolvedTva.length === 0 && collisions.length === 0,
    needsCategory,
    unresolvedTva,
    unresolvedCollisions: collisions,
    materializableCount: preview.products.filter((product) => isMaterializable(product, decisions))
      .length,
  };
};

/**
 * Construit le corps envoyé au commit.
 *
 * Les catégories forcées qui ne désignent plus un libellé classé « catégorie »
 * sont retirées : reclasser un libellé en tag après l'avoir affecté à un
 * produit laisserait sinon une décision que le backend refuserait en
 * `invalid_category_decision`, avec un message que l'utilisateur ne pourrait
 * pas relier à son geste.
 */
export const buildImportDecisions = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportDecisions => {
  const usable = categoryLabelIds(preview, decisions);

  const categoryPerProduct: Record<string, string> = {};
  for (const [productId, categoryId] of Object.entries(decisions.category_per_product)) {
    if (usable.has(categoryId)) {
      categoryPerProduct[productId] = categoryId;
    }
  }

  // La classification est renvoyée pour tous les libellés, y compris ceux
  // laissés au défaut : le backend complète les manquants, mais être explicite
  // évite que la valeur affichée et la valeur appliquée puissent diverger.
  const tagClassification: Record<string, 'category' | 'tag'> = {};
  for (const tag of preview.tags) {
    tagClassification[tag.external_id] = decisions.tag_classification[tag.external_id] ?? tag.class;
  }

  const nameCollisions: Record<string, 'skip' | 'import_anyway'> = {};
  for (const product of preview.products) {
    if (!product.name_collision) continue;
    nameCollisions[product.external_id] =
      decisions.name_collisions[product.external_id] ?? product.name_collision.resolution;
  }

  return {
    tag_classification: tagClassification,
    category_per_product: categoryPerProduct,
    tva_mapping: { ...decisions.tva_mapping },
    name_collisions: nameCollisions,
  };
};

/** Indexe les blocages d'un 422 par entité, pour les rendre au bon endroit. */
export const indexBlockersByRef = (
  blockers: { code: string; ref?: string; message: string }[],
): Map<string, string[]> => {
  const byRef = new Map<string, string[]>();

  for (const blocker of blockers) {
    if (!blocker.ref) continue;
    const existing = byRef.get(blocker.ref);
    if (existing) {
      existing.push(blocker.message);
    } else {
      byRef.set(blocker.ref, [blocker.message]);
    }
  }

  return byRef;
};
