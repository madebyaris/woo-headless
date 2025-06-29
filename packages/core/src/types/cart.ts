/**
 * Cart-related TypeScript types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { z } from 'zod';

/**
 * Cart item quantity limits
 */
export interface CartQuantityLimits {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * Cart item metadata
 */
export interface CartItemMeta {
  readonly key: string;
  readonly value: string;
  readonly displayKey?: string;
  readonly displayValue?: string;
}

/**
 * Cart item interface
 */
export interface CartItem {
  readonly key: string; // Unique identifier for cart item
  readonly productId: number;
  readonly variationId?: number;
  readonly quantity: number;
  readonly name: string;
  readonly price: number; // Unit price
  readonly regularPrice: number;
  readonly salePrice?: number;
  readonly totalPrice: number; // price * quantity
  readonly sku?: string;
  readonly weight?: number;
  readonly dimensions?: {
    readonly length: string;
    readonly width: string;
    readonly height: string;
  };
  readonly image?: {
    readonly id: number;
    readonly src: string;
    readonly alt: string;
  };
  readonly stockQuantity?: number;
  readonly stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  readonly backorders: 'no' | 'notify' | 'yes';
  readonly quantityLimits?: CartQuantityLimits;
  readonly meta?: readonly CartItemMeta[];
  readonly attributes?: Record<string, string>;
  readonly addedAt: Date;
  readonly updatedAt: Date;
}

/**
 * Cart totals breakdown
 */
export interface CartTotals {
  readonly subtotal: number;
  readonly subtotalTax: number;
  readonly shippingTotal: number;
  readonly shippingTax: number;
  readonly discountTotal: number;
  readonly discountTax: number;
  readonly cartContentsTotal: number;
  readonly cartContentsTax: number;
  readonly feeTotal: number;
  readonly feeTax: number;
  readonly total: number;
  readonly totalTax: number;
}

/**
 * Applied coupon information
 */
export interface AppliedCoupon {
  readonly code: string;
  readonly discountType: 'percent' | 'fixed_cart' | 'fixed_product';
  readonly amount: number;
  readonly description?: string;
  readonly freeShipping: boolean;
  readonly expiryDate?: Date;
  readonly usageLimit?: number;
  readonly usageCount: number;
  readonly individualUse: boolean;
  readonly productIds?: readonly number[];
  readonly excludedProductIds?: readonly number[];
  readonly categoryIds?: readonly number[];
  readonly excludedCategoryIds?: readonly number[];
  readonly minimumAmount?: number;
  readonly maximumAmount?: number;
}

/**
 * Shipping method option
 */
export interface ShippingMethod {
  readonly id: string;
  readonly title: string;
  readonly cost: number;
  readonly taxable: boolean;
  readonly taxes?: readonly {
    readonly id: number;
    readonly total: number;
  }[];
  readonly methodId: string;
  readonly instanceId?: number;
  readonly metaData?: readonly CartItemMeta[];
}

/**
 * Cart fees (additional charges)
 */
export interface CartFee {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly taxable: boolean;
  readonly taxClass?: string;
  readonly taxes?: readonly {
    readonly id: number;
    readonly total: number;
  }[];
}

/**
 * Main cart interface
 */
export interface Cart {
  readonly items: readonly CartItem[];
  readonly itemCount: number;
  readonly totals: CartTotals;
  readonly appliedCoupons: readonly AppliedCoupon[];
  readonly shippingMethods: readonly ShippingMethod[];
  readonly chosenShippingMethods: readonly string[];
  readonly fees: readonly CartFee[];
  readonly needsShipping: boolean;
  readonly needsPayment: boolean;
  readonly hasCalculatedShipping: boolean;
  readonly currency: string;
  readonly currencySymbol: string;
  readonly pricesIncludeTax: boolean;
  readonly taxDisplayMode: 'incl' | 'excl';
  readonly crossSells: readonly number[]; // Product IDs for cross-sell suggestions
  readonly isEmpty: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt?: Date; // Cart expiration for abandoned cart recovery
  readonly customerId?: number;
  readonly sessionId: string;
}

/**
 * Cart update request
 */
export interface CartUpdateRequest {
  readonly productId: number;
  readonly variationId?: number;
  readonly quantity: number;
  readonly attributes?: Record<string, string>;
  readonly meta?: readonly CartItemMeta[];
}

/**
 * Cart add item request
 */
export interface CartAddItemRequest extends CartUpdateRequest {
  readonly replace?: boolean; // Replace existing item instead of adding to quantity
}

/**
 * Cart validation result
 */
export interface CartValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly {
    readonly itemKey: string;
    readonly code: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'PRODUCT_NOT_FOUND' | 'VARIATION_NOT_FOUND';
    readonly message: string;
    readonly currentStock?: number;
    readonly requestedQuantity?: number;
  }[];
  readonly warnings: readonly {
    readonly itemKey: string;
    readonly code: 'LOW_STOCK' | 'BACKORDER' | 'PRICE_CHANGED';
    readonly message: string;
    readonly details?: Record<string, unknown>;
  }[];
}

/**
 * Cart persistence options
 */
export interface CartPersistenceConfig {
  readonly strategy: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'server' | 'none';
  readonly key?: string;
  readonly encryption?: boolean;
  readonly expirationDays?: number;
  readonly syncToServer?: boolean;
}

/**
 * Cart synchronization status
 */
export type CartSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed' | 'conflict';

/**
 * Cart sync conflict resolution strategy
 */
export type CartSyncStrategy = 
  | 'merge_smart'        // Intelligent merging (recommended)
  | 'local_wins'         // Local cart takes precedence
  | 'server_wins'        // Server cart takes precedence
  | 'merge_quantities'   // Merge quantities for same items
  | 'prompt_user';       // Ask user to resolve conflicts

/**
 * Cart sync configuration
 */
export interface CartSyncConfig {
  readonly enabled: boolean;
  readonly strategy: CartSyncStrategy;
  readonly syncIntervalMs: number;        // Auto-sync interval in milliseconds
  readonly conflictResolution: CartSyncStrategy;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly syncOnAuth: boolean;           // Sync immediately when user authenticates
  readonly syncOnCartChange: boolean;     // Sync on every cart modification
  readonly backgroundSync: boolean;       // Enable background sync
  readonly offlineQueueSize: number;      // Max offline actions to queue
}

/**
 * Cart sync conflict information
 */
export interface CartSyncConflict {
  readonly type: 'item_quantity' | 'item_missing' | 'coupon_conflict' | 'total_mismatch';
  readonly itemKey?: string;
  readonly localValue: unknown;
  readonly serverValue: unknown;
  readonly message: string;
  readonly suggestion: string;
}

/**
 * Cart sync result
 */
export interface CartSyncResult {
  readonly success: boolean;
  readonly status: CartSyncStatus;
  readonly conflicts: readonly CartSyncConflict[];
  readonly mergedCart?: Cart;
  readonly syncedAt: Date;
  readonly changes: {
    readonly itemsAdded: number;
    readonly itemsUpdated: number;
    readonly itemsRemoved: number;
    readonly couponsAdded: number;
    readonly couponsRemoved: number;
  };
}

/**
 * Cart sync metadata
 */
export interface CartSyncMetadata {
  readonly deviceId: string;
  readonly lastSyncAt: Date;
  readonly syncVersion: number;
  readonly userId: string;
  readonly sessionId: string;
  readonly source: 'local' | 'server' | 'merged';
}

/**
 * Server cart data structure
 */
export interface ServerCartData {
  readonly cart: Cart;
  readonly metadata: CartSyncMetadata;
  readonly conflicts?: readonly CartSyncConflict[];
}

/**
 * Cart configuration
 */
export interface CartConfig {
  readonly persistence: CartPersistenceConfig;
  readonly autoCalculateTotals: boolean;
  readonly validateStock: boolean;
  readonly allowBackorders: boolean;
  readonly sessionTimeout: number; // minutes
  readonly maxItems: number;
  readonly maxQuantityPerItem: number;
  readonly enableCoupons: boolean;
  readonly enableShipping: boolean;
  readonly enableFees: boolean;
  readonly enableCrossSells: boolean;
  readonly taxCalculation: {
    readonly enabled: boolean;
    readonly pricesIncludeTax: boolean;
    readonly displayMode: 'incl' | 'excl' | 'both';
    readonly roundAtSubtotal: boolean;
  };
}

// Zod schemas for validation
export const CartItemMetaSchema = z.object({
  key: z.string(),
  value: z.string(),
  displayKey: z.string().optional(),
  displayValue: z.string().optional(),
});

export const CartQuantityLimitsSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(1),
  step: z.number().min(1),
});

export const CartItemSchema = z.object({
  key: z.string(),
  productId: z.number().positive(),
  variationId: z.number().positive().optional(),
  quantity: z.number().positive(),
  name: z.string(),
  price: z.number().min(0),
  regularPrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0),
  sku: z.string().optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.string(),
    width: z.string(),
    height: z.string(),
  }).optional(),
  image: z.object({
    id: z.number().positive(),
    src: z.string().url(),
    alt: z.string(),
  }).optional(),
  stockQuantity: z.number().min(0).optional(),
  stockStatus: z.enum(['instock', 'outofstock', 'onbackorder']),
  backorders: z.enum(['no', 'notify', 'yes']),
  quantityLimits: CartQuantityLimitsSchema.optional(),
  meta: z.array(CartItemMetaSchema).optional(),
  attributes: z.record(z.string()).optional(),
  addedAt: z.date(),
  updatedAt: z.date(),
});

export const CartTotalsSchema = z.object({
  subtotal: z.number().min(0),
  subtotalTax: z.number().min(0),
  shippingTotal: z.number().min(0),
  shippingTax: z.number().min(0),
  discountTotal: z.number().min(0),
  discountTax: z.number().min(0),
  cartContentsTotal: z.number().min(0),
  cartContentsTax: z.number().min(0),
  feeTotal: z.number().min(0),
  feeTax: z.number().min(0),
  total: z.number().min(0),
  totalTax: z.number().min(0),
});

export const AppliedCouponSchema = z.object({
  code: z.string(),
  discountType: z.enum(['percent', 'fixed_cart', 'fixed_product']),
  amount: z.number().min(0),
  description: z.string().optional(),
  freeShipping: z.boolean(),
  expiryDate: z.date().optional(),
  usageLimit: z.number().positive().optional(),
  usageCount: z.number().min(0),
  individualUse: z.boolean(),
  productIds: z.array(z.number().positive()).optional(),
  excludedProductIds: z.array(z.number().positive()).optional(),
  categoryIds: z.array(z.number().positive()).optional(),
  excludedCategoryIds: z.array(z.number().positive()).optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumAmount: z.number().min(0).optional(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  itemCount: z.number().min(0),
  totals: CartTotalsSchema,
  appliedCoupons: z.array(AppliedCouponSchema),
  shippingMethods: z.array(z.any()), // TODO: Define shipping method schema
  chosenShippingMethods: z.array(z.string()),
  fees: z.array(z.any()), // TODO: Define fee schema
  needsShipping: z.boolean(),
  needsPayment: z.boolean(),
  hasCalculatedShipping: z.boolean(),
  currency: z.string(),
  currencySymbol: z.string(),
  pricesIncludeTax: z.boolean(),
  taxDisplayMode: z.enum(['incl', 'excl']),
  crossSells: z.array(z.number().positive()),
  isEmpty: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional(),
  customerId: z.number().positive().optional(),
  sessionId: z.string(),
});

export const CartAddItemRequestSchema = z.object({
  productId: z.number().positive(),
  variationId: z.number().positive().optional(),
  quantity: z.number().positive(),
  attributes: z.record(z.string()).optional(),
  meta: z.array(CartItemMetaSchema).optional(),
  replace: z.boolean().optional(),
});

export const CartUpdateRequestSchema = z.object({
  productId: z.number().positive(),
  variationId: z.number().positive().optional(), 
  quantity: z.number().positive(),
  attributes: z.record(z.string()).optional(),
  meta: z.array(CartItemMetaSchema).optional(),
});

// Type guards
export function isCartItem(obj: unknown): obj is CartItem {
  try {
    CartItemSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isCart(obj: unknown): obj is Cart {
  try {
    CartSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isCartAddItemRequest(obj: unknown): obj is CartAddItemRequest {
  try {
    CartAddItemRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
} 