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
  product_id?: string;  // From new API format
  id?: string;           // Legacy format
  name: string;
  price?: number;
  price_take_away?: number;
  price_delivery?: number;
  price_uber_eats?: number;
  price_deliveroo?: number;
  image_url?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  cost_price?: number;
  foodcost_percent?: number;
  margin_percent?: number;
  is_product_group?: boolean;
  is_available_on_sno?: boolean;
  status?: string;
  by_product_of?: string;  // Parent product ID
  configuration?: Record<string, unknown>;
  display_order?: number;
  tags?: (string | Tag)[] | null;      // Support both ID array and Tag objects
  allergens?: (string | Allergen)[] | null;  // Support both ID array and Allergen objects
}

export interface UnitOfMeasure {
  id: string | number;  // String format from real API, number from legacy
  name: string;
  compatible_with: string[];
}

export interface Component {
  component_id: string;
  name: string;
  category?: string;
  category_id?: string;
  price?: number;
  unit_id?: number;
  unit_of_measure?: string;  // e.g. "Grammes", "Millilitres"
  unit_of_measure_id?: string;  // e.g. "2" (numeric ID from API)
  quantity?: number;  // Quantity in the product composition
  cost?: number;  // Cost of the component in the product
  purchase_cost?: number;  // Purchase price (prix d'achat) in cents
  purchase_unit_id?: string | number;  // Purchase unit of measure ID
  purchase_unit_of_measure?: string;  // Purchase unit label
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
  price?: number;  // Legacy format
  extra_price?: number;  // New format from API
  max_quantity?: number;
  component_id?: string;  // Optional ingredient ID
  quantity?: number;  // Quantity of ingredient
  unit_of_measure_id?: string | number;  // Unit of ingredient
  order?: number;  // Display order
}

export interface AttributeOptionDetail {
  id: string;
  title: string;
  extra_price: number;
  max_quantity: number;
  configurable_attribute_id?: string;
  order_item_id?: string;
  quantity: number;
  selected: boolean;
}

export interface Attribute {
  id: string;
  name: string;  // Visible only to restaurant staff
  title: string;  // Visible to customers
  type: 'CHECK' | 'QUANTITY';
  min?: number;
  max?: number;
  min_options?: number;
  max_options?: number;
  attribute_type?: string;
  options: AttributeOption[] | AttributeOptionDetail[];
  product_id?: string;
  order_item_id?: string;
}

export interface ProductComposition {
  component_id: string;
  quantity: number;
  unit_id?: number;  // Deprecated: use unit_of_measure_id
  unit_of_measure?: string;  // e.g. "Grammes", "Millilitres"
  unit_of_measure_id?: string;  // New format: e.g. "2"
  cost?: number;  // Cost of this composition item
  name?: string;  // Component name
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
  order?: number;
  color?: string;  // From new API format
}

export interface Product {
  product_id: string;
  category_id?: string;
  category?: string;
  category_name?: string;  // From new API format
  name: string;
  description?: string;
  price?: number;
  price_take_away?: number;
  price_delivery?: number;
  price_uber_eats?: number;     // From new API format
  price_deliveroo?: number;     // From new API format
  image_url?: string;
  bg_color?: string;
  is_product_group?: boolean;
  is_group?: boolean;
  is_popular?: boolean;
  is_available_on_sno?: boolean;
  order?: number;
  display_order?: number;  // Sort order for products
  status?: string | number;  // Can be string (e.g., "available", "unavailable") or number
  available?: boolean;
  available_in?: boolean;
  available_take_away?: boolean;
  available_delivery?: boolean;
  tva_rate_in?: number;
  tva_rate_delivery?: number;
  tva_rate_take_away?: number;
  cost_price?: number;  // Food cost
  foodcost_percent?: number;  // Food cost percentage
  margin_percent?: number;  // Margin percentage
  components?: ProductComposition[];
  attributes?: ProductAttribute[];
  configuration?: (string[] | { attributes?: Attribute[] } | null);  // Pre-configured attributes from API or IDs array for payload
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
  tags?: (string | Tag)[] | null;        // Support both ID array and Tag objects + null
  allergens?: (string | Allergen)[] | null;  // Support both ID array and Allergen objects + null
  by_product_of?: string;  // Parent product ID (from new API format)
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
  categ_order?: number;  // Sort order for categories
  bg_color?: string;
  availability?: boolean;  // Availability status for the category
  available?: boolean;     // From new API format
  products: Product[];
}

export interface ComponentCreatePayload {
  name: string;
  category_id: string;
  unit_id: number;
  price: number; // in cents
  purchase_cost?: number; // in cents
  purchase_unit_id?: string | number;
}

export interface ComponentUpdatePayload {
  name?: string;
  category_id?: string;
  unit_id?: number;
  price?: number; // in cents
  purchase_cost?: number; // in cents
  purchase_unit_id?: string | number;
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
  data?: MenuData | Category[];  // Can be MenuData or array of categories (new API format)
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

// Response type for new consolidated GET /menu/products endpoint
export interface MenuProductsResponse {
  id: string;  // e.g., "menu.get_all_products"
  data: Category[];  // Array of categories with nested products
}
