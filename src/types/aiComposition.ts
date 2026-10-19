/**
 * Composition par IA d'un produit existant, à partir de sa description
 * (API : internal/modules/menu/composition_ai_service.go).
 */

/** Crédits d'import IA (partagés avec l'import de carte par photo). */
export interface AICredits {
  total: number;
  used: number;
  remaining: number;
}

/**
 * - `proposed` : ingrédients lus ;
 * - `no_ingredient` : la description ne cite aucun ingrédient ;
 * - `no_description` : produit sans description, non envoyé ;
 * - `group` : produit groupe, sans composition ;
 * - `failed` : lecture impossible pour ce produit (relancer).
 */
export type AICompositionStatus = 'proposed' | 'no_ingredient' | 'no_description' | 'group' | 'failed';

export interface AICompositionCurrentLine {
  component_id: string;
  name: string;
  quantity: number;
}

export interface AICompositionProposedLine {
  name: string;
  category: string;
  unit: string;
  /** Ingrédient existant de même nom ; absent s'il sera créé. */
  component_id?: string;
  /** Déjà dans la composition du produit. */
  in_composition: boolean;
}

export interface AICompositionPreviewProduct {
  product_id: string;
  name: string;
  description: string;
  status: AICompositionStatus;
  current: AICompositionCurrentLine[];
  proposed: AICompositionProposedLine[];
}

export interface AICompositionPreview {
  products: AICompositionPreviewProduct[];
  credits: AICredits;
}

/** `add` complète la composition ; `replace` la ramène aux ingrédients choisis. */
export type AICompositionMode = 'add' | 'replace';

export interface AICompositionApplyProduct {
  product_id: string;
  mode: AICompositionMode;
  ingredients: { name: string; category: string; unit: string }[];
}

export interface AICompositionApplyResult {
  products_updated: number;
  products_unchanged: number;
  products_skipped: number;
  components_created: number;
  component_categories_created: number;
  ingredients_skipped: number;
}
