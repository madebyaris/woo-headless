/**
 * WooCommerce API Types
 * Following the WooCommerce REST API v3 specification
 */

import { z } from 'zod';

/**
 * Product status enumeration
 */
export type ProductStatus = 'draft' | 'pending' | 'private' | 'publish';

/**
 * Product catalog visibility
 */
export type ProductCatalogVisibility = 'visible' | 'catalog' | 'search' | 'hidden';

/**
 * Product type enumeration
 */
export type ProductType = 'simple' | 'grouped' | 'external' | 'variable';

/**
 * Order status enumeration
 */
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'trash';

/**
 * Image dimensions
 */
export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Product image interface
 */
export interface ProductImage {
  readonly id: number;
  readonly date_created: string;
  readonly date_created_gmt: string;
  readonly date_modified: string;
  readonly date_modified_gmt: string;
  readonly src: string;
  readonly name: string;
  readonly alt: string;
  readonly position: number;
}

/**
 * Product category interface
 */
export interface ProductCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

/**
 * Product tag interface
 */
export interface ProductTag {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

/**
 * Product attribute interface
 */
export interface ProductAttribute {
  readonly id: number;
  readonly name: string;
  readonly position: number;
  readonly visible: boolean;
  readonly variation: boolean;
  readonly options: readonly string[];
}

/**
 * Price range for variable products
 */
export interface PriceRange {
  readonly min: string;
  readonly max: string;
}

/**
 * Product dimensions
 */
export interface ProductDimensions {
  readonly length: string;
  readonly width: string;
  readonly height: string;
}

/**
 * Meta data interface
 */
export interface MetaData {
  readonly id: number;
  readonly key: string;
  readonly value: string;
}

/**
 * Core product interface matching WooCommerce API
 */
export interface WooCommerceProduct {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly permalink: string;
  readonly date_created: string;
  readonly date_created_gmt: string;
  readonly date_modified: string;
  readonly date_modified_gmt: string;
  readonly type: ProductType;
  readonly status: ProductStatus;
  readonly featured: boolean;
  readonly catalog_visibility: ProductCatalogVisibility;
  readonly description: string;
  readonly short_description: string;
  readonly sku: string;
  readonly price: string;
  readonly regular_price: string;
  readonly sale_price: string;
  readonly date_on_sale_from?: string;
  readonly date_on_sale_from_gmt?: string;
  readonly date_on_sale_to?: string;
  readonly date_on_sale_to_gmt?: string;
  readonly price_html: string;
  readonly on_sale: boolean;
  readonly purchasable: boolean;
  readonly total_sales: number;
  readonly virtual: boolean;
  readonly downloadable: boolean;
  readonly downloads: readonly unknown[];
  readonly download_limit: number;
  readonly download_expiry: number;
  readonly external_url: string;
  readonly button_text: string;
  readonly tax_status: 'taxable' | 'shipping' | 'none';
  readonly tax_class: string;
  readonly manage_stock: boolean;
  readonly stock_quantity?: number;
  readonly stock_status: 'instock' | 'outofstock' | 'onbackorder';
  readonly backorders: 'no' | 'notify' | 'yes';
  readonly backorders_allowed: boolean;
  readonly backordered: boolean;
  readonly sold_individually: boolean;
  readonly weight: string;
  readonly dimensions: ProductDimensions;
  readonly shipping_required: boolean;
  readonly shipping_taxable: boolean;
  readonly shipping_class: string;
  readonly shipping_class_id: number;
  readonly reviews_allowed: boolean;
  readonly average_rating: string;
  readonly rating_count: number;
  readonly related_ids: readonly number[];
  readonly upsell_ids: readonly number[];
  readonly cross_sell_ids: readonly number[];
  readonly parent_id: number;
  readonly purchase_note: string;
  readonly categories: readonly ProductCategory[];
  readonly tags: readonly ProductTag[];
  readonly images: readonly ProductImage[];
  readonly attributes: readonly ProductAttribute[];
  readonly default_attributes: readonly unknown[];
  readonly variations: readonly number[];
  readonly grouped_products: readonly number[];
  readonly menu_order: number;
  readonly meta_data: readonly MetaData[];
}

/**
 * Product variation interface
 */
export interface ProductVariation {
  readonly id: number;
  readonly date_created: string;
  readonly date_created_gmt: string;
  readonly date_modified: string;
  readonly date_modified_gmt: string;
  readonly description: string;
  readonly permalink: string;
  readonly sku: string;
  readonly price: string;
  readonly regular_price: string;
  readonly sale_price: string;
  readonly date_on_sale_from?: string;
  readonly date_on_sale_from_gmt?: string;
  readonly date_on_sale_to?: string;
  readonly date_on_sale_to_gmt?: string;
  readonly on_sale: boolean;
  readonly status: ProductStatus;
  readonly purchasable: boolean;
  readonly virtual: boolean;
  readonly downloadable: boolean;
  readonly downloads: readonly unknown[];
  readonly download_limit: number;
  readonly download_expiry: number;
  readonly tax_status: 'taxable' | 'shipping' | 'none';
  readonly tax_class: string;
  readonly manage_stock: boolean;
  readonly stock_quantity?: number;
  readonly stock_status: 'instock' | 'outofstock' | 'onbackorder';
  readonly backorders: 'no' | 'notify' | 'yes';
  readonly backorders_allowed: boolean;
  readonly backordered: boolean;
  readonly weight: string;
  readonly dimensions: ProductDimensions;
  readonly shipping_class: string;
  readonly shipping_class_id: number;
  readonly image: ProductImage;
  readonly attributes: readonly ProductAttribute[];
  readonly menu_order: number;
  readonly meta_data: readonly MetaData[];
}

/**
 * Billing address interface
 */
export interface BillingAddress {
  readonly first_name: string;
  readonly last_name: string;
  readonly company: string;
  readonly address_1: string;
  readonly address_2: string;
  readonly city: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string;
  readonly email: string;
  readonly phone: string;
}

/**
 * Shipping address interface
 */
export interface ShippingAddress {
  readonly first_name: string;
  readonly last_name: string;
  readonly company: string;
  readonly address_1: string;
  readonly address_2: string;
  readonly city: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string;
}

/**
 * Order line item interface
 */
export interface OrderLineItem {
  readonly id: number;
  readonly name: string;
  readonly product_id: number;
  readonly variation_id: number;
  readonly quantity: number;
  readonly tax_class: string;
  readonly subtotal: string;
  readonly subtotal_tax: string;
  readonly total: string;
  readonly total_tax: string;
  readonly taxes: readonly unknown[];
  readonly meta_data: readonly MetaData[];
  readonly sku: string;
  readonly price: string;
}

/**
 * Order interface
 */
export interface WooCommerceOrder {
  readonly id: number;
  readonly parent_id: number;
  readonly status: OrderStatus;
  readonly currency: string;
  readonly version: string;
  readonly prices_include_tax: boolean;
  readonly date_created: string;
  readonly date_modified: string;
  readonly discount_total: string;
  readonly discount_tax: string;
  readonly shipping_total: string;
  readonly shipping_tax: string;
  readonly cart_tax: string;
  readonly total: string;
  readonly total_tax: string;
  readonly customer_id: number;
  readonly order_key: string;
  readonly billing: BillingAddress;
  readonly shipping: ShippingAddress;
  readonly payment_method: string;
  readonly payment_method_title: string;
  readonly transaction_id: string;
  readonly customer_ip_address: string;
  readonly customer_user_agent: string;
  readonly created_via: string;
  readonly customer_note: string;
  readonly date_completed?: string;
  readonly date_paid?: string;
  readonly cart_hash: string;
  readonly number: string;
  readonly meta_data: readonly MetaData[];
  readonly line_items: readonly OrderLineItem[];
  readonly tax_lines: readonly unknown[];
  readonly shipping_lines: readonly unknown[];
  readonly fee_lines: readonly unknown[];
  readonly coupon_lines: readonly unknown[];
  readonly refunds: readonly unknown[];
  readonly set_paid: boolean;
}

/**
 * Customer interface
 */
export interface WooCommerceCustomer {
  readonly id: number;
  readonly date_created: string;
  readonly date_created_gmt: string;
  readonly date_modified: string;
  readonly date_modified_gmt: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly role: string;
  readonly username: string;
  readonly billing: BillingAddress;
  readonly shipping: ShippingAddress;
  readonly is_paying_customer: boolean;
  readonly avatar_url: string;
  readonly meta_data: readonly MetaData[];
}

/**
 * Zod schemas for validation
 */
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['draft', 'pending', 'private', 'publish']),
  featured: z.boolean(),
  catalog_visibility: z.enum(['visible', 'catalog', 'search', 'hidden']),
  description: z.string(),
  short_description: z.string(),
  price: z.string(),
  regular_price: z.string(),
  sale_price: z.string(),
  on_sale: z.boolean(),
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
  manage_stock: z.boolean(),
  stock_quantity: z.number().optional(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string()
  })),
  images: z.array(z.object({
    id: z.number(),
    src: z.string(),
    name: z.string(),
    alt: z.string()
  }))
});

export const OrderSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash']),
  currency: z.string(),
  total: z.string(),
  customer_id: z.number(),
  billing: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string()
  }),
  line_items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    product_id: z.number(),
    quantity: z.number(),
    total: z.string()
  }))
});

/**
 * Type guards
 */
export function isWooCommerceProduct(data: unknown): data is WooCommerceProduct {
  try {
    ProductSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isWooCommerceOrder(data: unknown): data is WooCommerceOrder {
  try {
    OrderSchema.parse(data);
    return true;
  } catch {
    return false;
  }
} 