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

export interface UnitOfMeasure {
  id: number;
  name: string;
  compatible_with: string[];
}

export interface Component {
  id: string;
  name: string;
  unit_id: number;
  price_per_unit: number;
  category_id?: string;
}

export interface AttributeOption {
  id: string;
  title: string;
  price: number;
}

export interface Attribute {
  id: string;
  title: string;
  type: 'CHECK';
  min: number;
  max: number;
  options: AttributeOption[];
}

export interface ProductComposition {
  component_id: string;
  quantity: number;
  unit_id: number;
}

export interface ProductAttribute {
  attribute_id: string;
  options?: {
    option_id: string;
    price_override?: number;
  }[];
}

export interface ProductAvailability {
  on_site?: boolean;
  takeaway?: boolean;
  delivery?: boolean;
  scan_order?: boolean;
}

export interface ProductIntegration {
  enabled?: boolean;
  id?: string;
  price_override?: number;
}

export interface ProductIntegrations {
  uber_eats?: ProductIntegration;
  deliveroo?: ProductIntegration;
}

export interface ProductTvaIds {
  on_site?: number;
  takeaway?: number;
  delivery?: number;
}

export interface Product {
  product_id: string;
  category_id?: string;
  category?: string;
  name: string;
  description?: string;
  price?: number;
  price_take_away?: number;
  price_delivery?: number;
  image_url?: string;
  bg_color?: string;
  is_product_group?: boolean;
  is_group?: boolean;
  is_popular?: boolean;
  is_available_on_sno?: boolean;
  order?: number;
  status?: number;
  available_in?: boolean;
  available_take_away?: boolean;
  available_delivery?: boolean;
  tva_rate_in?: number;
  tva_rate_delivery?: number;
  tva_rate_take_away?: number;
  components?: ProductComposition[];
  composition?: ProductComposition[];
  attributes?: ProductAttribute[];
  configuration?: {
    attributes?: ProductAttribute[];
  };
  sub_products?: SubProduct[];
  quantity?: number;
  paid_quantity?: number;
  distributed_quantity?: number;
  ready_for_distribution_quantity?: number;
  isPaid?: number;
  isDistributed?: number;
  discount_id?: string | null;
  discount_name?: string | null;
  discounted_price?: number;
  production_color?: string | null;
  extra?: Record<string, unknown>;
  without?: Record<string, unknown>;
  customers?: string[];
  comment?: string;
  // Extended properties for forms
  availability?: ProductAvailability;
  integrations?: ProductIntegrations;
  tva_ids?: ProductTvaIds;
}

// Category can come from API in two formats
export interface Category {
  // Primary format (from real API)
  category_id: string;
  category: string;
  category_name?: string;
  // Alternate format (from mock/simplified API)
  id?: string;
  name?: string;
  // Common
  order: number;
  bg_color?: string;
  products: Product[];
}

export interface Menu {
  id?: string;
  data?: MenuData;
  // Direct properties (mock data format)
  products_types?: Category[];
  products?: Product[];
}

export interface MenuData {
  status?: string;
  last_menu_update?: number;
  products_types: Category[];
  products?: Product[];
  components_types?: Component[];
  delays?: Record<string, number>[];
}
