/**
 * Test utilities for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { WooCommerceProduct, WooCommerceOrder, WooCommerceCustomer } from '../types/commerce';
import { WooConfig, ResolvedWooConfig, DEFAULT_CONFIG } from '../types/config';
import { Result, Ok, Err } from '../types/result';
import { WooError, ErrorFactory } from '../types/errors';

/**
 * Create a mock product
 */
export function createMockProduct(overrides: Partial<WooCommerceProduct> = {}): WooCommerceProduct {
  return {
    id: 1,
    name: 'Test Product',
    slug: 'test-product',
    permalink: 'https://example.com/product/test-product',
    date_created: '2024-01-01T00:00:00',
    date_created_gmt: '2024-01-01T00:00:00',
    date_modified: '2024-01-01T00:00:00',
    date_modified_gmt: '2024-01-01T00:00:00',
    type: 'simple',
    status: 'publish',
    featured: false,
    catalog_visibility: 'visible',
    description: 'Test product description',
    short_description: 'Test short description',
    sku: 'TEST-001',
    price: '99.99',
    regular_price: '99.99',
    sale_price: '',
    price_html: '<span>$99.99</span>',
    on_sale: false,
    purchasable: true,
    total_sales: 0,
    virtual: false,
    downloadable: false,
    downloads: [],
    download_limit: -1,
    download_expiry: -1,
    external_url: '',
    button_text: '',
    tax_status: 'taxable',
    tax_class: '',
    manage_stock: false,
    stock_status: 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    sold_individually: false,
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    shipping_required: true,
    shipping_taxable: true,
    shipping_class: '',
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: '0.00',
    rating_count: 0,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: '',
    categories: [],
    tags: [],
    images: [],
    attributes: [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    meta_data: [],
    ...overrides
  };
}

/**
 * Create a mock order
 */
export function createMockOrder(overrides: Partial<WooCommerceOrder> = {}): WooCommerceOrder {
  return {
    id: 1,
    parent_id: 0,
    status: 'processing',
    currency: 'USD',
    version: '8.0.0',
    prices_include_tax: false,
    date_created: '2024-01-01T00:00:00',
    date_modified: '2024-01-01T00:00:00',
    discount_total: '0.00',
    discount_tax: '0.00',
    shipping_total: '10.00',
    shipping_tax: '0.00',
    cart_tax: '0.00',
    total: '109.99',
    total_tax: '0.00',
    customer_id: 1,
    order_key: 'wc_order_abc123',
    billing: {
      first_name: 'John',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'New York',
      state: 'NY',
      postcode: '10001',
      country: 'US',
      email: 'john@example.com',
      phone: '555-1234'
    },
    shipping: {
      first_name: 'John',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'New York',
      state: 'NY',
      postcode: '10001',
      country: 'US'
    },
    payment_method: 'stripe',
    payment_method_title: 'Credit Card',
    transaction_id: '',
    customer_ip_address: '127.0.0.1',
    customer_user_agent: 'Mozilla/5.0',
    created_via: 'rest-api',
    customer_note: '',
    cart_hash: 'abc123',
    number: '1',
    meta_data: [],
    line_items: [
      {
        id: 1,
        name: 'Test Product',
        product_id: 1,
        variation_id: 0,
        quantity: 1,
        tax_class: '',
        subtotal: '99.99',
        subtotal_tax: '0.00',
        total: '99.99',
        total_tax: '0.00',
        taxes: [],
        meta_data: [],
        sku: 'TEST-001',
        price: '99.99'
      }
    ],
    tax_lines: [],
    shipping_lines: [],
    fee_lines: [],
    coupon_lines: [],
    refunds: [],
    set_paid: false,
    ...overrides
  };
}

/**
 * Create a mock customer
 */
export function createMockCustomer(overrides: Partial<WooCommerceCustomer> = {}): WooCommerceCustomer {
  return {
    id: 1,
    date_created: '2024-01-01T00:00:00',
    date_created_gmt: '2024-01-01T00:00:00',
    date_modified: '2024-01-01T00:00:00',
    date_modified_gmt: '2024-01-01T00:00:00',
    email: 'customer@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'customer',
    username: 'johndoe',
    billing: {
      first_name: 'John',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'New York',
      state: 'NY',
      postcode: '10001',
      country: 'US',
      email: 'customer@example.com',
      phone: '555-1234'
    },
    shipping: {
      first_name: 'John',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'New York',
      state: 'NY',
      postcode: '10001',
      country: 'US'
    },
    is_paying_customer: true,
    avatar_url: 'https://secure.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0',
    meta_data: [],
    ...overrides
  };
}

/**
 * Create a mock configuration
 */
export function createMockConfig(overrides: Partial<WooConfig> = {}): WooConfig {
  return {
    baseURL: 'https://example.com',
    consumerKey: 'ck_test123',
    consumerSecret: 'cs_test456',
    ...overrides
  };
}

/**
 * Create a resolved mock configuration
 */
export function createResolvedMockConfig(overrides: Partial<ResolvedWooConfig> = {}): ResolvedWooConfig {
  const baseConfig = createMockConfig();
  return {
    ...baseConfig,
    version: DEFAULT_CONFIG.version,
    environment: DEFAULT_CONFIG.environment,
    cache: DEFAULT_CONFIG.cache,
    auth: DEFAULT_CONFIG.auth,
    http: DEFAULT_CONFIG.http,
    search: DEFAULT_CONFIG.search,
    analytics: DEFAULT_CONFIG.analytics,
    i18n: DEFAULT_CONFIG.i18n,
    debug: DEFAULT_CONFIG.debug,
    ...overrides
  };
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;
  
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' }),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: () => createMockFetchResponse(data, options),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: 'https://example.com/api'
  } as Response;
}

/**
 * Create a mock successful result
 */
export function createSuccessResult<T>(data: T): Result<T, WooError> {
  return Ok(data);
}

/**
 * Create a mock error result
 */
export function createErrorResult(code: string, message: string): Result<any, WooError> {
  switch (code) {
    case 'NETWORK_ERROR':
      return Err(ErrorFactory.networkError(message));
    case 'AUTH_ERROR':
      return Err(ErrorFactory.authError(message));
    case 'VALIDATION_ERROR':
      return Err(ErrorFactory.validationError(message));
    case 'API_ERROR':
      return Err(ErrorFactory.apiError(message, 400));
    case 'TIMEOUT_ERROR':
      return Err(ErrorFactory.timeoutError(message, 30000));
    default:
      return Err(ErrorFactory.networkError(message));
  }
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock abort controller
 */
export function createMockAbortController(): AbortController {
  const controller = new AbortController();
  return controller;
}

/**
 * Assert that a result is successful
 */
export function assertSuccess<T, E>(result: Result<T, E>): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw new Error(`Expected success but got error: ${JSON.stringify(result.error)}`);
  }
}

/**
 * Assert that a result is an error
 */
export function assertError<T, E>(result: Result<T, E>): asserts result is { success: false; error: E } {
  if (result.success) {
    throw new Error(`Expected error but got success: ${JSON.stringify(result.data)}`);
  }
}

/**
 * Generate a unique ID for testing purposes
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} 