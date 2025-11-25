export interface TvaRate {
  id: number;
  value: number;
  label: string;
}

export interface TvaRateGroup {
  id: number;
  name: string;
  rates: TvaRate[];
}

export interface SubProduct {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price?: number;
  bg_color?: string;
  is_group: boolean;
  order: number;
  tva_ids?: {
    on_site: number;
    takeaway: number;
    delivery: number;
  };
  availability?: {
    on_site: boolean;
    takeaway: boolean;
    delivery: boolean;
    scan_order: boolean;
  };
  integrations?: {
    uber_eats?: {
      enabled: boolean;
      price_override?: number;
      id?: string;
    };
    deliveroo?: {
      enabled: boolean;
      price_override?: number;
      id?: string;
    };
  };
  sub_products?: SubProduct[];
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuData {
  categories: Category[];
  products: Product[];
}
