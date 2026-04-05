export interface TvaRate {
  id: number;
  value: number;
  label: string;
}

export interface TvaRateGroup {
  id: number;
  name: string;
  delivery_type: string;
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
  component_id: string;
  name: string;
  category?: string;
  category_id?: string;
  price?: number;
  price_per_unit?: number;
  unit_id?: number;
  status?: string;
  available?: boolean;
}

export interface ComponentCategory {
  category_id: string;
  category_name: string;
  category?: string;
  order: number;
  components: Component[];
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

export interface Allergen {
  allergen_id: string;
  name: string;
  code: string;
  icon?: string;
}

export interface Tag {
  id: string;
  merchant_id?: string;
  name: string;
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
  available?: boolean;
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
  tags?: string[]; // Array of tag IDs
  allergens?: string[]; // Array of allergen IDs
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

export interface ComponentCreatePayload {
  name: string;
  category_id: string;
  unit_id: number;
  price: number; // in cents
}

export interface ProductCreatePayload {
  name: string;
  description: string;
  price: number; // in cents
  price_take_away: number; // in cents
  price_delivery: number; // in cents
  category_id: string;
  tva_rate_in: number;
  tva_rate_take_away: number;
  tva_rate_delivery: number;
  available_in: boolean;
  available_take_away: boolean;
  available_delivery: boolean;
  is_product_group: boolean;
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
  components_types?: ComponentCategory[];
  delays?: Record<string, number>[];
}
