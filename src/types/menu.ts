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
  composition?: ProductComposition[];
  attributes?: ProductAttribute[];
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
