import { useState, useEffect, useCallback } from 'react';
import { menuService } from '@/services/menuService';
import { Menu, Category, Product } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';
import {
  SalesChannel,
  SALES_CHANNEL_LABEL,
  channelAvailabilityFields,
  channelAvailabilityPatch,
  isChannelEnabled,
} from '@/utils/salesChannelAvailability';

/** Prix modifiables depuis la grille (centimes). 0 sur une plateforme = pas de prix spécifique. */
export interface PriceGridPriceUpdate {
  product_id: string;
  price?: number;
  price_take_away?: number;
  price_delivery?: number;
  price_uber_eats?: number;
  price_deliveroo?: number;
}

type ProductPatch = Partial<Product>;

/**
 * Applique `patchFor` aux produits (racines et sous-produits) dont l'id est
 * dans `ids`, sans recharger le menu.
 */
const patchMenuProducts = (
  menu: Menu,
  ids: Set<string>,
  patchFor: (product: Product) => ProductPatch,
): Menu => {
  const patchOne = <T extends { product_id?: string }>(p: T): T =>
    p.product_id && ids.has(p.product_id) ? { ...p, ...patchFor(p as unknown as Product) } : p;

  const productsTypes = (menu.products_types ?? []).map((cat) => ({
    ...cat,
    products: (cat.products ?? []).map((product) => {
      const patched = patchOne(product);
      return product.sub_products?.length
        ? { ...patched, sub_products: product.sub_products.map(patchOne) }
        : patched;
    }),
  }));

  return {
    ...menu,
    products_types: productsTypes,
    products: (menu.products ?? []).map(patchOne),
  };
};

/**
 * Hook spécialisé pour la page PriceGrid
 * Charge uniquement: getMenuData()
 * N'appelle PAS getUnitsOfMeasure(), getComponents(), getAttributes()
 */
export const usePriceGridData = () => {
  const [menuData, setMenuData] = useState<Menu>({ products_types: [], products: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load only menu data (categories with nested products)
      const categoriesData = await menuService.getMenuData();

      const productsTypes = categoriesData.map((cat: Category) => ({
        category_id: cat.category_id || cat.id || '',
        category: cat.category || cat.name || '',
        category_name: cat.category_name || cat.category || cat.name || '',
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category || '',
        order: cat.order || 0,
        bg_color: cat.bg_color,
        available: cat.available ?? cat.availability,
        products: cat.products || []
      }));

      // Flatten all products from categories (including sub-products)
      const allProducts = [];
      productsTypes.forEach((cat: Category) => {
        (cat.products || []).forEach((product) => {
          allProducts.push(product);
          if (product.sub_products && Array.isArray(product.sub_products)) {
            allProducts.push(...(product.sub_products));
          }
        });
      });

      setMenuData({
        products_types: productsTypes,
        products: allProducts
      });
    } catch (error) {
      console.error('Error loading price grid data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de la grille de prix",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enregistre les prix modifiés en une seule requête (PATCH /menu/products/bulk)
   * puis les reporte dans la grille. L'appelant gère les toasts.
   */
  const bulkUpdatePrices = useCallback(async (updates: PriceGridPriceUpdate[]) => {
    if (updates.length === 0) return;
    await menuService.bulkUpdatePrices(updates);

    const byId = new Map(updates.map((u) => [u.product_id, u]));
    setMenuData((prev) =>
      patchMenuProducts(prev, new Set(byId.keys()), (product) => {
        const u = byId.get(product.product_id);
        if (!u) return {};
        const patch: ProductPatch = {};
        if (u.price !== undefined) patch.price = u.price;
        if (u.price_take_away !== undefined) patch.price_take_away = u.price_take_away;
        if (u.price_delivery !== undefined) patch.price_delivery = u.price_delivery;
        if (u.price_uber_eats !== undefined || u.price_deliveroo !== undefined) {
          const integrations = { ...product.integrations };
          if (u.price_uber_eats !== undefined) {
            patch.price_uber_eats = u.price_uber_eats;
            integrations.uber_eats = { ...integrations.uber_eats, price_override: u.price_uber_eats || undefined };
          }
          if (u.price_deliveroo !== undefined) {
            patch.price_deliveroo = u.price_deliveroo;
            integrations.deliveroo = { ...integrations.deliveroo, price_override: u.price_deliveroo || undefined };
          }
          patch.integrations = integrations;
        }
        return patch;
      }),
    );
  }, []);

  /**
   * Active / désactive un ou plusieurs produits sur un canal de vente — sur
   * place, à emporter, livraison (available_*) ou plateforme (sync_*) — via
   * PATCH /menu/products/bulk/availability. Mise à jour optimiste, annulée si
   * l'API refuse.
   */
  const setChannelAvailability = useCallback(
    async (productIds: string[], channel: SalesChannel, enabled: boolean) => {
      if (productIds.length === 0) return;
      const ids = new Set(productIds);
      // État de chaque produit avant le changement, pour une annulation qui ne
      // touche que ces produits (un autre switch peut être en cours).
      const previous = new Map<string, boolean>();
      setMenuData((prev) =>
        patchMenuProducts(prev, ids, (product) => {
          if (!previous.has(product.product_id)) {
            previous.set(product.product_id, isChannelEnabled(product, channel));
          }
          return channelAvailabilityPatch(product, channel, enabled);
        }),
      );

      try {
        await menuService.bulkSetProductsAvailability(productIds, channelAvailabilityFields(channel, enabled));
      } catch (error) {
        setMenuData((prev) =>
          patchMenuProducts(prev, ids, (product) =>
            channelAvailabilityPatch(product, channel, previous.get(product.product_id) ?? !enabled),
          ),
        );
        toast({
          title: 'Erreur',
          description: `Impossible de modifier le canal « ${SALES_CHANNEL_LABEL[channel]} »`,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [toast],
  );

  return {
    menuData,
    loading,
    bulkUpdatePrices,
    setChannelAvailability,
  };
};
