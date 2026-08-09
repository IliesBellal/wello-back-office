import { Product } from '@/types/menu';

/**
 * Nombre de lignes produit réellement rendues par <ProductsTable> : une par
 * produit de la liste, plus une par sous-produit d'un groupe déplié.
 *
 * Sert au compteur « N produits » de la page Produits, pour qu'il reste aligné
 * sur ce que le tableau affiche. À garder synchronisé avec renderTableRows
 * dans ProductsTable.tsx.
 */
export const countProductRows = (
  products: Product[],
  expandedGroups: Record<string, boolean> = {}
): number =>
  products.reduce((total, product) => {
    const subRows =
      product.is_product_group && expandedGroups[product.product_id]
        ? product.sub_products?.length ?? 0
        : 0;
    return total + 1 + subRows;
  }, 0);
