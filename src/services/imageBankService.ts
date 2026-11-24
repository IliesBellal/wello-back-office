import { apiClient, withMock, type WelloApiResponse } from "@/services/apiClient";

/** Format d'image de la banque : vignette (produit, option, catégorie) ou bannière. */
export type ImageBankFormat = "square" | "banner";

export interface ImageBankImage {
  id: number;
  slug: string;
  category: string;
  name: string;
  tags: string[];
  format: ImageBankFormat;
  image_url: string;
  width: number;
  height: number;
}

export interface ImageBankCategory {
  code: string;
  label: string;
  count: number;
  formats: Record<ImageBankFormat, number>;
}

/** Image déjà utilisée par l'établissement (onglet « Mes images »). */
export interface MyImage {
  image_url: string;
  usage: string;
  label: string;
}

export interface ImageBankFilter {
  format?: ImageBankFormat;
  category?: string;
  q?: string;
}

const MOCK_BASE = "https://storage.welloresto.fr/wello_resto_images_storage/image_bank";

const mockImages: ImageBankImage[] = [
  { id: 1, slug: "canette-de-cola-33-cl", category: "boissons-soft", name: "Canette de cola 33 cl", tags: ["soda", "cola"], format: "square", image_url: `${MOCK_BASE}/boissons-soft/canette-de-cola-33-cl.png`, width: 1200, height: 1200 },
  { id: 2, slug: "pizza-margherita", category: "pizzas", name: "Pizza margherita", tags: ["pizza"], format: "square", image_url: `${MOCK_BASE}/pizzas/pizza-margherita.jpg`, width: 1600, height: 1600 },
  { id: 3, slug: "banniere-burgers-et-frites", category: "burgers", name: "Bannière burgers et frites", tags: ["banniere"], format: "banner", image_url: `${MOCK_BASE}/burgers/banniere-burgers-et-frites.jpg`, width: 2000, height: 600 },
];

const query = (f: ImageBankFilter): string => {
  const params = new URLSearchParams();
  if (f.format) params.set("format", f.format);
  if (f.category) params.set("category", f.category);
  if (f.q?.trim()) params.set("q", f.q.trim());
  const s = params.toString();
  return s ? `?${s}` : "";
};

export const imageBankService = {
  async list(filter: ImageBankFilter = {}): Promise<ImageBankImage[]> {
    const endpoint = `/image-bank${query(filter)}`;
    return withMock(
      () =>
        mockImages.filter(
          (img) =>
            (!filter.format || img.format === filter.format) &&
            (!filter.category || img.category === filter.category) &&
            (!filter.q || img.name.toLowerCase().includes(filter.q.toLowerCase())),
        ),
      async () => {
        const res = await apiClient.get<WelloApiResponse<{ images: ImageBankImage[] }>>(endpoint);
        return res.data?.images ?? [];
      },
      { method: "GET", endpoint },
    );
  },

  async categories(): Promise<ImageBankCategory[]> {
    const endpoint = "/image-bank/categories";
    return withMock(
      () => [
        { code: "boissons-soft", label: "Sodas & canettes", count: 1, formats: { square: 1, banner: 0 } },
        { code: "burgers", label: "Burgers", count: 1, formats: { square: 0, banner: 1 } },
        { code: "pizzas", label: "Pizzas", count: 1, formats: { square: 1, banner: 0 } },
      ],
      async () => {
        const res = await apiClient.get<WelloApiResponse<{ categories: ImageBankCategory[] }>>(endpoint);
        return res.data?.categories ?? [];
      },
      { method: "GET", endpoint },
    );
  },

  async mine(): Promise<MyImage[]> {
    const endpoint = "/image-bank/mine";
    return withMock(
      () => [],
      async () => {
        const res = await apiClient.get<WelloApiResponse<{ images: MyImage[] }>>(endpoint);
        return res.data?.images ?? [];
      },
      { method: "GET", endpoint },
    );
  },
};
