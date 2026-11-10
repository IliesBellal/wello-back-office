/**
 * Catalogue d'entités de l'établissement (produits, équipiers) pour le moteur.
 * Chargé à l'ouverture de l'assistant, gardé 5 minutes, jamais bloquant :
 * sans catalogue, l'assistant comprend quand même les intentions et demande
 * le produit dans un sélecteur.
 */
import { menuService } from '@/services/menuService';
import { planningEmployeesApi } from '@/services/welloApi';
import type { EntityRecord } from '@/lib/assistant/types';
import type { Product, ProductStatus } from '@/types/menu';

/**
 * Statut de vente réel (products.status). Les anciens produits sans statut
 * retombent sur le booléen historique `available`.
 */
export function productStatus(p: Pick<Product, 'status' | 'available'>): ProductStatus {
  const s = String(p.status ?? '').toLowerCase();
  if (s === 'available' || s === 'not_available' || s === 'out_of_stock' || s === 'removed_from_menu') return s;
  return p.available === false ? 'out_of_stock' : 'available';
}

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  at: number;
  records: EntityRecord[];
}

let products: CacheEntry | null = null;
let employees: CacheEntry | null = null;
let inflight: Promise<EntityRecord[]> | null = null;

async function loadProducts(): Promise<EntityRecord[]> {
  if (products && Date.now() - products.at < TTL_MS) return products.records;
  const list = await menuService.getProducts();
  const seen = new Set<string>();
  const records = list
    .filter((p) => p.product_id && p.name && !seen.has(p.product_id) && seen.add(p.product_id))
    .map<EntityRecord>((p) => ({
      type: 'product',
      id: String(p.product_id),
      name: p.name,
      meta: { status: productStatus(p), available: productStatus(p) === 'available', category: p.category_name ?? p.category ?? '' },
    }));
  products = { at: Date.now(), records };
  return records;
}

async function loadEmployees(): Promise<EntityRecord[]> {
  if (employees && Date.now() - employees.at < TTL_MS) return employees.records;
  const res = await planningEmployeesApi.list();
  const records = (res.items ?? []).map<EntityRecord>((e) => ({
    type: 'employee',
    id: String(e.id),
    name: `${e.first_name} ${e.last_name}`.trim(),
    meta: { position: e.position ?? '' },
  }));
  employees = { at: Date.now(), records };
  return records;
}

/** Produits et (si autorisé) équipiers. Les échecs sont ignorés. */
export function loadCatalog(opts: { employees: boolean }): Promise<EntityRecord[]> {
  if (inflight) return inflight;
  inflight = Promise.allSettled([loadProducts(), opts.employees ? loadEmployees() : Promise.resolve([])])
    .then((results) => results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function cachedEmployees(): EntityRecord[] {
  return employees?.records ?? [];
}

/** Après une rupture / remise en vente : le catalogue reflète la nouvelle dispo. */
export function patchProductStatus(id: string, status: ProductStatus) {
  const rec = products?.records.find((r) => r.id === id);
  if (rec) rec.meta = { ...rec.meta, status, available: status === 'available' };
}

export function cachedProducts(): EntityRecord[] {
  return products?.records ?? [];
}
