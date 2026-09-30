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
  AI_PHOTO_PROVIDER,
  IMPORT_CHANNELS,
  tvaMappingKey,
  type ImportChannel,
  type ImportChannelPrices,
  type ImportChannelTvaIds,
  type ImportDecisions,
  type ImportProductKind,
  type ImportPreviewProduct,
  type ImportPreviewResult,
  type ImportPreviewTvaRate,
  type ImportReimportResolution,
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
 * Un produit déjà importé n'est pas recréé — sauf demande explicite — et un
 * homonyme tranché en « ignorer » non plus : ni l'un ni l'autre n'a besoin
 * d'être complété.
 */
export const isMaterializable = (
  product: ImportPreviewProduct,
  decisions: ImportDecisions,
): boolean => {
  // Exclusion utilisateur (porte « autre établissement ») : avant tout autre
  // arbitrage, y compris le sort d'un produit déjà importé — miroir exact de
  // l'ordre de court-circuit du backend (commitPlanner.buildProducts).
  if (decisions.excluded_products[product.external_id]) return false;

  if (product.action === 'already_imported') {
    return decisions.already_imported[product.external_id] === 'recreate';
  }

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
  // Présence de la clé, et non valeur vraie : tva_categories contient des
  // identifiants 0 et -1, qu'un test booléen ferait passer pour non résolus.
  preview.tva_rates.filter(
    (rate) => !(tvaMappingKey(rate.rate, rate.channel) in decisions.tva_mapping),
  );

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

/** Produits déjà importés, les périmés d'abord — ce sont ceux qu'on répare. */
export const alreadyImportedProducts = (
  preview: ImportPreviewResult,
): ImportPreviewProduct[] =>
  preview.products
    .filter((product) => product.action === 'already_imported')
    .sort((a, b) => Number(Boolean(b.mapping_stale)) - Number(Boolean(a.mapping_stale)));

// ─── Porte photo ────────────────────────────────────────────

/** La prévisualisation vient de photos lues par l'IA. */
export const isPhotoPreview = (preview: ImportPreviewResult): boolean =>
  preview.provider === AI_PHOTO_PROVIDER;

/** Nature retenue : décision, sinon proposition de la lecture. */
export const effectiveKind = (
  product: ImportPreviewProduct,
  decisions: ImportDecisions,
): ImportProductKind | undefined => decisions.kind_per_product?.[product.external_id] ?? product.kind;

/** Groupe retenu (`""` = racine) : décision, sinon proposition de la lecture. */
export const effectiveParent = (product: ImportPreviewProduct, decisions: ImportDecisions): string => {
  const decided = decisions.group_per_product?.[product.external_id];
  return decided !== undefined ? decided : product.parent_external_id ?? '';
};

/**
 * Déclinaisons qui seront réellement rattachées à chaque groupe — miroir de
 * `resolveGroups` côté API : un groupe n'est créé que s'il garde au moins deux
 * déclinaisons créées ; sinon sa déclinaison éventuelle passe à la racine.
 */
export const groupVariants = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): Map<string, ImportPreviewProduct[]> => {
  const groups = new Map<string, ImportPreviewProduct[]>();
  for (const product of preview.products) {
    if (product.is_group && isMaterializable(product, decisions)) groups.set(product.external_id, []);
  }
  for (const product of preview.products) {
    if (product.is_group || !isMaterializable(product, decisions)) continue;
    groups.get(effectiveParent(product, decisions))?.push(product);
  }
  return groups;
};

/** Groupes qui seront créés (au moins deux déclinaisons). */
export const createdGroupIds = (preview: ImportPreviewResult, decisions: ImportDecisions): Set<string> =>
  new Set(
    [...groupVariants(preview, decisions).entries()]
      .filter(([, variants]) => variants.length >= 2)
      .map(([groupId]) => groupId),
  );

/** Prix retenu sur un canal, en centimes : saisie, sinon lecture. */
export const effectivePrice = (
  product: ImportPreviewProduct,
  channel: ImportChannel,
  decisions: ImportDecisions,
): number => decisions.price_per_product?.[product.external_id]?.[channel] ?? product.channels[channel].price;

/**
 * `tva_id` retenu sur un canal : choix de la relecture, sinon le taux proposé
 * d'après la nature quand la prévisualisation a su le résoudre. `undefined` =
 * à choisir. Test de présence, pas de vérité : 0 et -1 sont des identifiants.
 */
export const effectiveTvaId = (
  product: ImportPreviewProduct,
  channel: ImportChannel,
  decisions: ImportDecisions,
): number | undefined => {
  const chosen = decisions.tva_per_product?.[product.external_id]?.[channel];
  if (chosen !== undefined) return chosen;
  const proposed = product.channels[channel];
  return proposed.resolved ? proposed.tva_id : undefined;
};

/**
 * Produits créés dont au moins un canal n'a pas de TVA (nature « autre », ou
 * taux absent de la caisse). Les groupes ne sont jamais vendus : l'API leur
 * donne la TVA de leur première déclinaison.
 */
export const productsNeedingTva = (
  preview: ImportPreviewResult,
  decisions: ImportDecisions,
): ImportPreviewProduct[] =>
  isPhotoPreview(preview)
    ? preview.products.filter(
        (product) =>
          !product.is_group &&
          isMaterializable(product, decisions) &&
          IMPORT_CHANNELS.some(({ key }) => effectiveTvaId(product, key, decisions) === undefined),
      )
    : [];

export interface ImportPrecheck {
  canCommit: boolean;
  needsCategory: ImportPreviewProduct[];
  unresolvedTva: ImportPreviewTvaRate[];
  unresolvedCollisions: ImportPreviewProduct[];
  /** Porte photo : produits dont un canal au moins n'a pas de TVA. */
  needsTva: ImportPreviewProduct[];
  /** Porte photo : les taux proposés n'ont pas encore été confirmés. */
  tvaNotConfirmed: boolean;
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
  const photo = isPhotoPreview(preview);
  const needsCategory = productsNeedingCategory(preview, decisions);
  // Porte photo : la TVA se choisit produit par produit (tva_per_product,
  // toujours envoyé) ; les couples taux + canal ne servent plus.
  const unresolvedTva = photo ? [] : unresolvedTvaRates(preview, decisions);
  const collisions = unresolvedCollisions(preview, decisions);
  const needsTva = productsNeedingTva(preview, decisions);
  const tvaNotConfirmed = photo && !decisions.tva_confirmed;

  // Un groupe réduit à moins de deux déclinaisons ne sera pas créé.
  const createdGroups = photo ? createdGroupIds(preview, decisions) : null;
  const materializableCount = preview.products.filter(
    (product) =>
      isMaterializable(product, decisions) &&
      (!product.is_group || !createdGroups || createdGroups.has(product.external_id)),
  ).length;

  return {
    canCommit:
      needsCategory.length === 0 &&
      unresolvedTva.length === 0 &&
      collisions.length === 0 &&
      needsTva.length === 0 &&
      !tvaNotConfirmed,
    needsCategory,
    unresolvedTva,
    unresolvedCollisions: collisions,
    needsTva,
    tvaNotConfirmed,
    materializableCount,
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
  const alreadyImported: Record<string, ImportReimportResolution> = {};
  for (const product of preview.products) {
    if (product.name_collision) {
      nameCollisions[product.external_id] =
        decisions.name_collisions[product.external_id] ?? product.name_collision.resolution;
    }
    if (product.action === 'already_imported') {
      alreadyImported[product.external_id] =
        decisions.already_imported[product.external_id] ?? 'skip';
    }
  }

  const built: ImportDecisions = {
    tag_classification: tagClassification,
    category_per_product: categoryPerProduct,
    tva_mapping: { ...decisions.tva_mapping },
    name_collisions: nameCollisions,
    already_imported: alreadyImported,
    // Pas de dérivation nécessaire ici, contrairement aux autres champs :
    // l'exclusion ne se recalcule à partir de rien côté aperçu, c'est
    // uniquement un choix de l'utilisateur qui transite tel quel.
    excluded_products: { ...decisions.excluded_products },
  };

  if (isPhotoPreview(preview)) {
    // Nature, groupe, prix et TVA explicites pour chaque produit, comme la
    // classification : ce qui est affiché est exactement ce qui est appliqué.
    const kindPerProduct: Record<string, ImportProductKind> = {};
    const groupPerProduct: Record<string, string> = {};
    const pricePerProduct: Record<string, ImportChannelPrices> = {};
    const tvaPerProduct: Record<string, ImportChannelTvaIds> = {};
    for (const product of preview.products) {
      const kind = effectiveKind(product, decisions);
      if (kind) kindPerProduct[product.external_id] = kind;
      // Un groupe n'a ni prix ni TVA propres (refusés par l'API).
      if (product.is_group) continue;
      groupPerProduct[product.external_id] = effectiveParent(product, decisions);
      const prices = {} as ImportChannelPrices;
      const tvaIds: ImportChannelTvaIds = {};
      for (const { key } of IMPORT_CHANNELS) {
        prices[key] = effectivePrice(product, key, decisions);
        const tvaId = effectiveTvaId(product, key, decisions);
        if (tvaId !== undefined) tvaIds[key] = tvaId;
      }
      pricePerProduct[product.external_id] = prices;
      tvaPerProduct[product.external_id] = tvaIds;
    }
    built.kind_per_product = kindPerProduct;
    built.group_per_product = groupPerProduct;
    built.price_per_product = pricePerProduct;
    built.tva_per_product = tvaPerProduct;
    built.tva_confirmed = Boolean(decisions.tva_confirmed);
  }

  return built;
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
