import type {
  AICompositionApplyProduct,
  AICompositionCurrentLine,
  AICompositionMode,
  AICompositionPreview,
  AICompositionPreviewProduct,
  AICompositionProposedLine,
} from '@/types/aiComposition';

/** Clé de sélection d'un ingrédient proposé (nom, unique par produit côté API). */
export const proposedKey = (line: AICompositionProposedLine): string => `p:${line.name.toLowerCase()}`;

/** Clé de sélection d'une ligne de la composition actuelle. */
export const currentKey = (line: AICompositionCurrentLine): string => `c:${line.component_id}`;

/** Ingrédients actuels que la description ne cite pas. */
export const currentNotProposed = (product: AICompositionPreviewProduct): AICompositionCurrentLine[] => {
  const proposedIds = new Set(product.proposed.map((line) => line.component_id).filter(Boolean));
  return product.current.filter((line) => !proposedIds.has(line.component_id));
};

/** Ingrédients proposés absents de la composition (seuls utiles en « compléter »). */
export const proposedToAdd = (product: AICompositionPreviewProduct): AICompositionProposedLine[] =>
  product.proposed.filter((line) => !line.in_composition);

/**
 * Sélection de départ : tous les ingrédients proposés sont cochés ; les
 * ingrédients actuels non cités sont décochés (retirés en « remplacer »).
 */
export const initialSelection = (preview: AICompositionPreview): Record<string, string[]> =>
  Object.fromEntries(
    preview.products
      .filter((product) => product.status === 'proposed')
      .map((product) => [product.product_id, product.proposed.map(proposedKey)]),
  );

/**
 * Corps de l'application. « Compléter » n'envoie que les ingrédients cochés
 * absents de la composition, et saute un produit sans ajout. « Remplacer »
 * envoie la composition voulue complète : ingrédients proposés cochés et
 * ingrédients actuels gardés (retrouvés par nom côté API, catégorie et unité
 * ne servent donc pas).
 */
export const buildApplyPayload = (
  preview: AICompositionPreview,
  selection: Record<string, string[]>,
  mode: AICompositionMode,
): AICompositionApplyProduct[] => {
  const out: AICompositionApplyProduct[] = [];
  for (const product of preview.products) {
    if (product.status !== 'proposed') continue;
    const kept = new Set(selection[product.product_id] ?? []);
    const toLine = (line: AICompositionProposedLine) => ({ name: line.name, category: line.category, unit: line.unit });

    if (mode === 'add') {
      const ingredients = proposedToAdd(product).filter((line) => kept.has(proposedKey(line))).map(toLine);
      if (ingredients.length > 0) out.push({ product_id: product.product_id, mode, ingredients });
      continue;
    }

    const ingredients = [
      ...product.proposed.filter((line) => kept.has(proposedKey(line))).map(toLine),
      ...currentNotProposed(product)
        .filter((line) => kept.has(currentKey(line)))
        .map((line) => ({ name: line.name, category: 'other', unit: 'PCE' })),
    ];
    out.push({ product_id: product.product_id, mode, ingredients });
  }
  return out;
};
