/**
 * Cart management module for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err, isErr, unwrap } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  WooCommerceProduct,
  WooCommerceCoupon
} from '../../types/commerce';
import {
  Cart,
  CartItem,
  CartAddItemRequest,
  CartTotals,
  CartValidationResult,
  CartPersistenceConfig,
  AppliedCoupon,
  ShippingMethod,
  CartFee,
  CartAddItemRequestSchema,
  CartSyncResult,
  CartSyncStatus,
  isCart
} from '../../types/cart';
import { CartConfig } from '../../types/config';
import { UserAuthContext } from '../../types/user';
import { generateId } from '../../test/utils';
import { CartSyncManager, CartSyncEventHandler } from './sync';

/**
 * Cart persistence manager for handling cart storage
 */
class CartPersistenceManager {
  private readonly config: CartPersistenceConfig;

  constructor(config: CartPersistenceConfig) {
    this.config = config;
  }

  /**
   * Save cart to persistent storage
   */
  async save(cart: Cart): Promise<Result<void, WooError>> {
    try {
      const serialized = JSON.stringify(cart, (key, value) => {
        // Convert dates to ISO strings for serialization
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });

      switch (this.config.strategy) {
        case 'localStorage':
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.getStorageKey(), serialized);
          }
          break;

        case 'sessionStorage':
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(this.getStorageKey(), serialized);
          }
          break;

        case 'indexedDB':
          return this.saveToIndexedDB(cart);

        case 'server':
          return this.saveToServer(cart);

        case 'none':
          // No persistence
          break;

        default:
          return Err(ErrorFactory.configurationError('Invalid persistence strategy'));
      }

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to save cart',
        error
      ));
    }
  }

  /**
   * Load cart from persistent storage
   */
  async load(): Promise<Result<Cart | null, WooError>> {
    try {
      let serialized: string | null = null;

      switch (this.config.strategy) {
        case 'localStorage':
          if (typeof localStorage !== 'undefined') {
            serialized = localStorage.getItem(this.getStorageKey());
          }
          break;

        case 'sessionStorage':
          if (typeof sessionStorage !== 'undefined') {
            serialized = sessionStorage.getItem(this.getStorageKey());
          }
          break;

        case 'indexedDB':
          return this.loadFromIndexedDB();

        case 'server':
          return this.loadFromServer();

        case 'none':
          return Ok(null);

        default:
          return Err(ErrorFactory.configurationError('Invalid persistence strategy'));
      }

      if (!serialized) {
        return Ok(null);
      }

      const parsed = JSON.parse(serialized, (key, value) => {
        // Convert ISO strings back to dates
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });

      // Validate the parsed cart
      if (isCart(parsed)) {
        return Ok(parsed);
      } else {
        return Err(ErrorFactory.validationError('Invalid cart data in storage'));
      }
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to load cart',
        error
      ));
    }
  }

  /**
   * Clear cart from persistent storage
   */
  async clear(): Promise<Result<void, WooError>> {
    try {
      switch (this.config.strategy) {
        case 'localStorage':
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(this.getStorageKey());
          }
          break;

        case 'sessionStorage':
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(this.getStorageKey());
          }
          break;

        case 'indexedDB':
          return this.clearFromIndexedDB();

        case 'server':
          return this.clearFromServer();

        case 'none':
          // No persistence to clear
          break;

        default:
          return Err(ErrorFactory.configurationError('Invalid persistence strategy'));
      }

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to clear cart',
        error
      ));
    }
  }

  private getStorageKey(): string {
    return this.config.key || 'woo-headless-cart';
  }

  private async saveToIndexedDB(cart: Cart): Promise<Result<void, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return Err(ErrorFactory.persistenceError('IndexedDB not available'));
      }

      const db = await this.openIndexedDB();
      const transaction = db.transaction(['carts'], 'readwrite');
      const store = transaction.objectStore('carts');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id: this.getStorageKey(),
          cart: cart,
          timestamp: Date.now(),
          expiresAt: this.config.expirationDays ? 
            Date.now() + (this.config.expirationDays * 24 * 60 * 60 * 1000) : 
            null
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to save cart to IndexedDB',
        error
      ));
    }
  }

  private async loadFromIndexedDB(): Promise<Result<Cart | null, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return Ok(null);
      }

      const db = await this.openIndexedDB();
      const transaction = db.transaction(['carts'], 'readonly');
      const store = transaction.objectStore('carts');
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get(this.getStorageKey());
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (!result) {
        return Ok(null);
      }

      // Check expiration
      if (result.expiresAt && Date.now() > result.expiresAt) {
        await this.clearFromIndexedDB();
        return Ok(null);
      }

      // Validate the loaded cart
      if (isCart(result.cart)) {
        return Ok(result.cart);
      } else {
        return Err(ErrorFactory.validationError('Invalid cart data in IndexedDB'));
      }
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to load cart from IndexedDB',
        error
      ));
    }
  }

  private async clearFromIndexedDB(): Promise<Result<void, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return Ok(undefined);
      }

      const db = await this.openIndexedDB();
      const transaction = db.transaction(['carts'], 'readwrite');
      const store = transaction.objectStore('carts');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(this.getStorageKey());
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to clear cart from IndexedDB',
        error
      ));
    }
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WooHeadlessCart', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('carts')) {
          const store = db.createObjectStore('carts', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  private async saveToServer(cart: Cart): Promise<Result<void, WooError>> {
    try {
      if (!this.config.syncToServer) {
        return Err(ErrorFactory.configurationError(
          'Server sync is disabled',
          'Enable syncToServer in cart persistence config'
        ));
      }

      // This would integrate with your server-side cart API
      // For now, we'll implement a basic HTTP client integration
      const cartData = {
        sessionId: cart.sessionId,
        customerId: cart.customerId,
        items: cart.items,
        totals: cart.totals,
        appliedCoupons: cart.appliedCoupons,
        updatedAt: cart.updatedAt.toISOString(),
        expiresAt: cart.expiresAt?.toISOString()
      };

      // TODO: This should use the HttpClient instance from the service
      // For now, we'll use a placeholder that developers can implement
      console.warn('Server-side cart persistence requires custom implementation');
      console.log('Cart data to sync:', cartData);
      
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to save cart to server',
        error
      ));
    }
  }

  private async loadFromServer(): Promise<Result<Cart | null, WooError>> {
    try {
      if (!this.config.syncToServer) {
        return Ok(null);
      }

      // This would integrate with your server-side cart API
      // Developers should implement their own server integration
      console.warn('Server-side cart persistence requires custom implementation');
      
      // Return null for now - developers can override this method
      return Ok(null);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to load cart from server',
        error
      ));
    }
  }

  private async clearFromServer(): Promise<Result<void, WooError>> {
    try {
      if (!this.config.syncToServer) {
        return Ok(undefined);
      }

      // This would integrate with your server-side cart API
      console.warn('Server-side cart persistence requires custom implementation');
      
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        'Failed to clear cart from server',
        error
      ));
    }
  }
}

/**
 * Advanced cart totals calculator with comprehensive tax, shipping, and discount handling
 */
class CartTotalsCalculator {
  private readonly config: CartConfig;

  constructor(config: CartConfig) {
    this.config = config;
  }

  /**
   * Calculate comprehensive cart totals
   */
  calculate(
    items: readonly CartItem[], 
    appliedCoupons: readonly AppliedCoupon[] = [],
    shippingMethods: readonly ShippingMethod[] = [],
    fees: readonly CartFee[] = [],
    customerData?: { taxRate?: number; country?: string; state?: string }
  ): CartTotals {
    // Step 1: Calculate item subtotals
    const subtotal = this.calculateSubtotal(items);
    const subtotalTax = this.calculateSubtotalTax(items, customerData);

    // Step 2: Calculate discount amounts
    const { discountTotal, discountTax } = this.calculateDiscounts(items, appliedCoupons, customerData);

    // Step 3: Calculate cart contents after discounts
    const cartContentsTotal = Math.max(0, subtotal - discountTotal);
    const cartContentsTax = Math.max(0, subtotalTax - discountTax);

    // Step 4: Calculate shipping
    const { shippingTotal, shippingTax } = this.calculateShipping(shippingMethods, cartContentsTotal, customerData);

    // Step 5: Calculate fees
    const { feeTotal, feeTax } = this.calculateFees(fees, cartContentsTotal, customerData);

    // Step 6: Calculate final totals
    const totalTax = cartContentsTax + shippingTax + feeTax;
    const total = this.calculateFinalTotal(cartContentsTotal, shippingTotal, feeTotal, totalTax);

    return {
      subtotal: this.roundTotal(subtotal),
      subtotalTax: this.roundTotal(subtotalTax),
      tax: this.roundTotal(totalTax),
      shipping: this.roundTotal(shippingTotal),
      shippingTotal: this.roundTotal(shippingTotal), // alias for shipping
      shippingTax: this.roundTotal(shippingTax),
      discount: this.roundTotal(discountTotal),
      discountTotal: this.roundTotal(discountTotal), // alias for discount
      discountTax: this.roundTotal(discountTax),
      fees: this.roundTotal(feeTotal),
      feeTotal: this.roundTotal(feeTotal), // alias for fees
      feeTax: this.roundTotal(feeTax),
      total: this.roundTotal(total),
      totalTax: this.roundTotal(totalTax),
      cartContentsTotal: this.roundTotal(cartContentsTotal),
      cartContentsTax: this.roundTotal(cartContentsTax)
    };
  }

  private calculateSubtotal(items: readonly CartItem[]): number {
    return items.reduce((sum, item) => {
      if (this.config.taxCalculation.pricesIncludeTax) {
        // If prices include tax, use the item price directly
        return sum + item.totalPrice;
      } else {
        // Use regular price without tax
        return sum + (item.regularPrice * item.quantity);
      }
    }, 0);
  }

  private calculateSubtotalTax(
    items: readonly CartItem[], 
    customerData?: { taxRate?: number; country?: string; state?: string }
  ): number {
    if (!this.config.taxCalculation.enabled) {
      return 0;
    }

    const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
    
    return items.reduce((sum, item) => {
      const itemSubtotal = item.regularPrice * item.quantity;
      
      if (this.config.taxCalculation.pricesIncludeTax) {
        // Extract tax from price that includes tax
        return sum + (itemSubtotal * taxRate / (1 + taxRate));
      } else {
        // Calculate tax on price that excludes tax
        return sum + (itemSubtotal * taxRate);
      }
    }, 0);
  }

  private calculateDiscounts(
    items: readonly CartItem[], 
    coupons: readonly AppliedCoupon[],
    customerData?: { taxRate?: number; country?: string; state?: string }
  ): { discountTotal: number; discountTax: number } {
    let discountTotal = 0;
    let discountTax = 0;

    for (const coupon of coupons) {
      const discount = this.calculateSingleCouponDiscount(items, coupon);
      discountTotal += discount;

      // Calculate tax on discount if applicable
      if (this.config.taxCalculation.enabled && !this.config.taxCalculation.pricesIncludeTax) {
        const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
        discountTax += discount * taxRate;
      }
    }

    return { discountTotal, discountTax };
  }

  private calculateSingleCouponDiscount(items: readonly CartItem[], coupon: AppliedCoupon): number {
    // Filter items that the coupon applies to
    const applicableItems = items.filter(item => this.couponAppliesToItem(item, coupon));
    
    if (applicableItems.length === 0) {
      return 0;
    }

    const applicableSubtotal = applicableItems.reduce((sum, item) => sum + item.totalPrice, 0);

    switch (coupon.discountType) {
      case 'fixed_cart':
        // Fixed cart discount applies to the whole cart
        return Math.min(coupon.amount, applicableSubtotal);
      
      case 'percent':
        // Percentage discount
        const percentDiscount = applicableSubtotal * (coupon.amount / 100);
        return coupon.maximumAmount ? Math.min(percentDiscount, coupon.maximumAmount) : percentDiscount;
      
      case 'fixed_product':
        // Fixed amount per product
        return Math.min(
          applicableItems.reduce((sum, item) => sum + (coupon.amount * item.quantity), 0),
          applicableSubtotal
        );
      
      default:
        return 0;
    }
  }

  private couponAppliesToItem(item: CartItem, coupon: AppliedCoupon): boolean {
    // Check if coupon is restricted to specific products
    if (coupon.productIds && coupon.productIds.length > 0) {
      if (!coupon.productIds.includes(item.productId)) {
        return false;
      }
    }

    // Check if product is excluded
    if (coupon.excludedProductIds && coupon.excludedProductIds.includes(item.productId)) {
      return false;
    }

    // Check category restrictions (would require product category data)
    // This would be implemented based on your product data structure

    return true;
  }

  private calculateShipping(
    shippingMethods: readonly ShippingMethod[], 
    cartTotal: number,
    customerData?: { taxRate?: number; country?: string; state?: string }
  ): { shippingTotal: number; shippingTax: number } {
    if (!this.config.enableShipping || shippingMethods.length === 0) {
      return { shippingTotal: 0, shippingTax: 0 };
    }

    // Use the first shipping method for now (in practice, user would choose)
    const selectedMethod = shippingMethods[0];
    if (!selectedMethod) {
      return { shippingTotal: 0, shippingTax: 0 };
    }
    
    const shippingTotal = selectedMethod.cost;

    let shippingTax = 0;
    if (this.config.taxCalculation.enabled && selectedMethod.taxable) {
      const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
      shippingTax = selectedMethod.taxes?.reduce((sum, tax) => sum + tax.total, 0) || (shippingTotal * taxRate);
    }

    return { shippingTotal, shippingTax };
  }

  private calculateFees(
    fees: readonly CartFee[], 
    cartTotal: number,
    customerData?: { taxRate?: number; country?: string; state?: string }
  ): { feeTotal: number; feeTax: number } {
    if (!this.config.enableFees || fees.length === 0) {
      return { feeTotal: 0, feeTax: 0 };
    }

    const feeTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);

    let feeTax = 0;
    if (this.config.taxCalculation.enabled) {
      const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
      
      feeTax = fees.reduce((sum, fee) => {
        if (fee.taxable) {
          return sum + (fee.taxes?.reduce((taxSum, tax) => taxSum + tax.total, 0) || (fee.amount * taxRate));
        }
        return sum;
      }, 0);
    }

    return { feeTotal, feeTax };
  }

  private calculateFinalTotal(
    cartContentsTotal: number, 
    shippingTotal: number, 
    feeTotal: number, 
    totalTax: number
  ): number {
    if (this.config.taxCalculation.pricesIncludeTax) {
      // Prices include tax, so just add shipping and fees
      return cartContentsTotal + shippingTotal + feeTotal;
    } else {
      // Add tax to the total
      return cartContentsTotal + shippingTotal + feeTotal + totalTax;
    }
  }

  private getDefaultTaxRate(country?: string, state?: string): number {
    // Default tax rates by country/state
    // In a real implementation, this would come from a tax service or database
    const defaultRates: Record<string, number> = {
      'US': 0.0875, // Average US sales tax
      'CA': 0.13,   // Average Canadian tax
      'GB': 0.20,   // UK VAT
      'DE': 0.19,   // Germany VAT
      'FR': 0.20,   // France VAT
      'AU': 0.10,   // Australia GST
    };

    return defaultRates[country || 'US'] || 0.10; // Default 10%
  }

  private roundTotal(amount: number): number {
    if (this.config.taxCalculation.roundAtSubtotal) {
      return Math.round(amount * 100) / 100;
    }
    return Math.round(amount * 10000) / 10000; // Round to 4 decimal places for intermediate calculations
  }
}

/**
 * Main cart service class
 */
export class CartService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: CartConfig;
  private readonly persistence: CartPersistenceManager;
  private readonly calculator: CartTotalsCalculator;
  private readonly syncManager: CartSyncManager;
  private currentCart: Cart | null = null;
  private authContext: UserAuthContext | null = null;

  constructor(
    client: HttpClient, 
    cache: CacheManager, 
    config: CartConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
    this.persistence = new CartPersistenceManager(config.persistence);
    this.calculator = new CartTotalsCalculator(config);
    this.syncManager = new CartSyncManager(config.sync, client);
  }

  /**
   * Get current cart
   */
  async getCart(): Promise<Result<Cart, WooError>> {
    try {
      if (!this.currentCart) {
        const loadResult = await this.persistence.load();
        if (!loadResult.success) {
          return loadResult;
        }

        this.currentCart = loadResult.data || this.createEmptyCart();
      }

      return Ok(this.currentCart);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to get cart',
        error
      ));
    }
  }

  /**
   * Add item to cart
   */
  async addItem(request: CartAddItemRequest): Promise<Result<Cart, WooError>> {
    try {
      // Validate request
      const validationResult = this.validateAddItemRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // Get current cart
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;

      // Fetch product data for validation and cart item creation
      const productResult = await this.fetchProductData(request);
      if (!productResult.success) {
        return productResult;
      }

      const product = productResult.data;

      // Validate stock if enabled
      if (this.config.validateStock) {
        const stockValidation = this.validateStock(product, request.quantity);
        if (!stockValidation.success) {
          return stockValidation;
        }
      }

      // Generate cart item key
      const itemKey = this.generateCartItemKey(request);

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(item => item.key === itemKey);

      let updatedItems: CartItem[];

      if (existingItemIndex >= 0) {
        if (request.replace) {
          // Replace existing item
          updatedItems = [...cart.items];
          updatedItems[existingItemIndex] = this.createCartItem(product, request, itemKey);
        } else {
          // Update quantity
          const existingItem = cart.items[existingItemIndex];
          if (!existingItem) {
            return Err(ErrorFactory.cartError('Cart item not found'));
          }
          
          const newQuantity = existingItem.quantity + request.quantity;

          // Validate new quantity
          if (newQuantity > this.config.maxQuantityPerItem) {
            return Err(ErrorFactory.validationError(
              `Maximum quantity per item is ${this.config.maxQuantityPerItem}`
            ));
          }

          const updatedItem: CartItem = {
            key: existingItem.key,
            productId: existingItem.productId,
            variationId: existingItem.variationId,
            quantity: newQuantity,
            name: existingItem.name,
            price: existingItem.price,
            regularPrice: existingItem.regularPrice,
            salePrice: existingItem.salePrice,
            totalPrice: existingItem.price * newQuantity,
            total: existingItem.price * newQuantity, // alias for totalPrice
            sku: existingItem.sku,
            weight: existingItem.weight,
            dimensions: existingItem.dimensions,
            image: existingItem.image,
            stockQuantity: existingItem.stockQuantity,
            stockStatus: existingItem.stockStatus,
            backorders: existingItem.backorders,
            quantityLimits: existingItem.quantityLimits,
            meta: existingItem.meta,
            attributes: existingItem.attributes,
            addedAt: existingItem.addedAt,
            updatedAt: new Date(),
            backordersAllowed: existingItem.backordersAllowed,
            soldIndividually: existingItem.soldIndividually,
            downloadable: existingItem.downloadable,
            virtual: existingItem.virtual
          };

          updatedItems = [...cart.items];
          updatedItems[existingItemIndex] = updatedItem;
        }
      } else {
        // Add new item
        if (cart.items.length >= this.config.maxItems) {
          return Err(ErrorFactory.validationError(
            `Maximum ${this.config.maxItems} items allowed in cart`
          ));
        }

        const newItem = this.createCartItem(product, request, itemKey);
        updatedItems = [...cart.items, newItem];
      }

      // Create updated cart
      const updatedCart = this.updateCartWithItems(cart, updatedItems);

      // Save cart
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }

      this.currentCart = updatedCart;
      return Ok(updatedCart);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to add item to cart',
        error
      ));
    }
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(itemKey: string, quantity: number): Promise<Result<Cart, WooError>> {
    try {
      if (quantity <= 0) {
        return this.removeItem(itemKey);
      }

      // Get current cart
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;
      const itemIndex = cart.items.findIndex(item => item.key === itemKey);

      if (itemIndex === -1) {
        return Err(ErrorFactory.cartError(
          'Item not found in cart',
          { itemKey }
        ));
      }

      if (quantity > this.config.maxQuantityPerItem) {
        return Err(ErrorFactory.validationError(
          `Maximum quantity per item is ${this.config.maxQuantityPerItem}`
        ));
      }

      const item = cart.items[itemIndex];
      if (!item) {
        return Err(ErrorFactory.cartError('Cart item not found'));
      }

      // Validate stock if enabled
      if (this.config.validateStock) {
        if (item.stockStatus === 'outofstock') {
          return Err(ErrorFactory.validationError('Product is out of stock'));
        }

        if (item.stockQuantity !== undefined && quantity > item.stockQuantity) {
          return Err(ErrorFactory.validationError(
            `Only ${item.stockQuantity} items available in stock`
          ));
        }
      }

      // Update item with explicit type
      const updatedItem: CartItem = {
        key: item.key,
        productId: item.productId,
        variationId: item.variationId,
        quantity,
        name: item.name,
        price: item.price,
        regularPrice: item.regularPrice,
        salePrice: item.salePrice,
        totalPrice: item.price * quantity,
        total: item.price * quantity, // alias for totalPrice
        sku: item.sku,
        weight: item.weight,
        dimensions: item.dimensions,
        image: item.image,
        stockQuantity: item.stockQuantity,
        stockStatus: item.stockStatus,
        backorders: item.backorders,
        quantityLimits: item.quantityLimits,
        meta: item.meta,
        attributes: item.attributes,
        addedAt: item.addedAt,
        updatedAt: new Date(),
        backordersAllowed: item.backordersAllowed,
        soldIndividually: item.soldIndividually,
        downloadable: item.downloadable,
        virtual: item.virtual
      };

      const updatedItems = [...cart.items];
      updatedItems[itemIndex] = updatedItem;

      // Create updated cart
      const updatedCart = this.updateCartWithItems(cart, updatedItems);

      // Save cart
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }

      this.currentCart = updatedCart;
      return Ok(updatedCart);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to update cart item',
        error
      ));
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemKey: string): Promise<Result<void, WooError>> {
    try {
      const cart = await this.getCart();
      if (isErr(cart)) {
        return cart;
      }

      const cartData = unwrap(cart);
      const itemIndex = cartData.items.findIndex(item => item.key === itemKey);
      
      if (itemIndex === -1) {
        return Err(ErrorFactory.validationError('Cart item not found'));
      }

      // Remove item from items array
      const updatedItems = cartData.items.filter((_, index) => index !== itemIndex);
      
      // Calculate new totals
      const newTotals = await this.calculateTotals(updatedItems);
      
      const updatedCart: Cart = {
        ...cartData,
        items: updatedItems,
        totals: newTotals.isOk() ? newTotals.data : cartData.totals,
        updatedAt: new Date()
      };

      await this.saveCart(updatedCart);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.networkError(
        error instanceof Error ? error.message : 'Failed to remove cart item'
      ));
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<Result<Cart, WooError>> {
    try {
      const emptyCart = this.createEmptyCart();

      // Save empty cart
      const saveResult = await this.persistence.save(emptyCart);
      if (!saveResult.success) {
        return saveResult;
      }

      this.currentCart = emptyCart;
      return Ok(emptyCart);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to clear cart',
        error
      ));
    }
  }

  /**
   * Comprehensive cart validation with stock, availability, and business rules
   */
  async validateCart(): Promise<Result<CartValidationResult, WooError>> {
    try {
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;
      // Create mutable arrays for building validation results
      const mutableErrors: Array<{
        readonly itemKey: string;
        readonly code: 'PRODUCT_NOT_FOUND' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'VARIATION_NOT_FOUND';
        readonly message: string;
        readonly currentStock?: number;
        readonly requestedQuantity?: number;
      }> = [];
      
      const mutableWarnings: Array<{
        readonly itemKey: string;
        readonly code: 'LOW_STOCK' | 'BACKORDER' | 'PRICE_CHANGED';
        readonly message: string;
        readonly details?: Record<string, unknown>;
      }> = [];

      // Validate each cart item
      for (const item of cart.items) {
        await this.validateCartItem(item, mutableErrors, mutableWarnings);
      }

      // Validate cart-level constraints
      await this.validateCartConstraints(cart, mutableErrors, mutableWarnings);

      // Validate applied coupons
      await this.validateAppliedCoupons(cart, mutableErrors, mutableWarnings);

      // Validate cart totals integrity
      await this.validateCartTotals(cart, mutableWarnings);

      // Return readonly arrays
      return Ok({
        isValid: mutableErrors.length === 0,
        errors: mutableErrors as readonly typeof mutableErrors[0][],
        warnings: mutableWarnings as readonly typeof mutableWarnings[0][]
      });

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Cart validation failed',
        error
      ));
    }
  }

  /**
   * Validate individual cart item
   */
  private async validateCartItem(
    item: CartItem, 
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'PRODUCT_NOT_FOUND' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'VARIATION_NOT_FOUND';
      readonly message: string;
      readonly currentStock?: number;
      readonly requestedQuantity?: number;
    }>, 
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'LOW_STOCK' | 'BACKORDER' | 'PRICE_CHANGED';
      readonly message: string;
      readonly details?: Record<string, unknown>;
    }>
  ): Promise<void> {
    try {
      // 1. Fetch current product data
      const productResult = await this.fetchProductData({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity
      });

      if (isErr(productResult)) {
        errors.push({
          itemKey: item.key,
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID ${item.productId} not found`,
          currentStock: 0,
          requestedQuantity: item.quantity
        });
        return;
      }

      const product = unwrap(productResult);

      // 2. Validate product availability
      if (product.status !== 'publish') {
        errors.push({
          itemKey: item.key,
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${item.name} is no longer available`
        });
        return;
      }

      // 3. Validate stock levels
      await this.validateItemStock(item, product, errors, warnings);

      // 4. Validate quantity limits
      this.validateItemQuantityLimits(item, product, errors, warnings);

      // 5. Validate price changes
      this.validateItemPriceChanges(item, product, warnings);

      // 6. Validate product variations (if applicable)
      if (item.variationId && product.type === 'variable') {
        await this.validateProductVariation(item, product, errors);
      }

    } catch (error) {
      warnings.push({
        itemKey: item.key,
        code: 'VALIDATION_ERROR',
        message: `Could not validate item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
  }

  /**
   * Validate item stock levels
   */
  private async validateItemStock(
    item: CartItem,
    currentProduct: WooCommerceProduct,
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';
      readonly message: string;
      readonly currentStock?: number;
      readonly requestedQuantity?: number;
    }>,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'LOW_STOCK' | 'BACKORDER';
      readonly message: string;
      readonly details?: Record<string, unknown>;
    }>
  ): void {
    // Check stock status
    if (currentProduct.stock_status === 'outofstock') {
      errors.push({
        itemKey: item.key,
        code: 'OUT_OF_STOCK',
        message: `${item.name} is currently out of stock`,
        currentStock: 0,
        requestedQuantity: item.quantity
      });
      return;
    }

    // Check specific stock quantity
    if (currentProduct.manage_stock && currentProduct.stock_quantity !== null) {
      const availableStock = currentProduct.stock_quantity;
      
      if (item.quantity > availableStock) {
        if (availableStock === 0) {
          errors.push({
            itemKey: item.key,
            code: 'OUT_OF_STOCK',
            message: `${item.name} is out of stock`,
            currentStock: availableStock,
            requestedQuantity: item.quantity
          });
        } else {
          errors.push({
            itemKey: item.key,
            code: 'INSUFFICIENT_STOCK',
            message: `Only ${availableStock} units of ${item.name} available, but ${item.quantity} requested`,
            currentStock: availableStock ?? 0,
            requestedQuantity: item.quantity
          });
        }
        return;
      }

      // Warn about low stock
      const lowStockThreshold = Math.max(5, Math.ceil(availableStock * 0.1)); // 10% or 5, whichever is higher
      if (availableStock <= lowStockThreshold && availableStock > item.quantity) {
        warnings.push({
          itemKey: item.key,
          code: 'LOW_STOCK',
          message: `Only ${availableStock} units of ${item.name} remaining`,
          details: { availableStock, threshold: lowStockThreshold }
        });
      }
    }

    // Check backorder status
    if (currentProduct.stock_status === 'onbackorder') {
      if (currentProduct.backorders === 'no') {
        errors.push({
          itemKey: item.key,
          code: 'OUT_OF_STOCK',
          message: `${item.name} is temporarily unavailable`,
          currentStock: 0,
          requestedQuantity: item.quantity
        });
      } else {
        warnings.push({
          itemKey: item.key,
          code: 'BACKORDER',
          message: `${item.name} is on backorder and may take longer to ship`,
          details: { backorderNotify: currentProduct.backorders === 'notify' }
        });
      }
    }
  }

  /**
   * Validate quantity limits for cart item
   */
  private validateItemQuantityLimits(
    item: CartItem,
    currentProduct: WooCommerceProduct,
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'INVALID_QUANTITY';
      readonly message: string;
      readonly requestedQuantity: number;
    }>,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'INVALID_QUANTITY';
      readonly message: string;
      readonly requestedQuantity: number;
    }>
  ): void {
    // Check configured quantity limits
    if (item.quantityLimits) {
      const { min, max, step } = item.quantityLimits;
      
      if (item.quantity < min) {
        errors.push({
          itemKey: item.key,
          code: 'INVALID_QUANTITY',
          message: `Minimum quantity for ${item.name} is ${min}`,
          requestedQuantity: item.quantity
        });
      }
      
      if (item.quantity > max) {
        errors.push({
          itemKey: item.key,
          code: 'INVALID_QUANTITY',
          message: `Maximum quantity for ${item.name} is ${max}`,
          requestedQuantity: item.quantity
        });
      }
      
      if ((item.quantity - min) % step !== 0) {
        errors.push({
          itemKey: item.key,
          code: 'INVALID_QUANTITY',
          message: `${item.name} must be ordered in multiples of ${step}`,
          requestedQuantity: item.quantity
        });
      }
    }

    // Validate against global config limits
    if (item.quantity > this.config.maxQuantityPerItem) {
      errors.push({
        itemKey: item.key,
        code: 'INVALID_QUANTITY',
        message: `Maximum quantity per item is ${this.config.maxQuantityPerItem}`,
        requestedQuantity: item.quantity
      });
    }
  }

  /**
   * Validate price changes since item was added
   */
  private validateItemPriceChanges(
    item: CartItem,
    currentProduct: WooCommerceProduct,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'PRICE_CHANGED';
      readonly message: string;
      readonly details: Record<string, unknown>;
    }>
  ): void {
    const currentRegularPrice = parseFloat(currentProduct.regular_price);
    const currentSalePrice = currentProduct.sale_price ? parseFloat(currentProduct.sale_price) : undefined;

    // Check if regular price has changed
    if (Math.abs(item.regularPrice - currentRegularPrice) > 0.01) {
      warnings.push({
        itemKey: item.key,
        code: 'PRICE_CHANGED',
        message: `Price for ${item.name} has changed from $${item.regularPrice.toFixed(2)} to $${currentRegularPrice.toFixed(2)}`,
        details: { 
          previousPrice: item.regularPrice, 
          currentPrice: currentRegularPrice,
          priceIncrease: currentRegularPrice > item.regularPrice
        }
      });
    }

    // Check if sale price has changed
    const itemSalePrice = item.salePrice || null;
    if ((itemSalePrice !== null && currentSalePrice === undefined) ||
        (itemSalePrice === null && currentSalePrice !== undefined) ||
        (itemSalePrice !== null && currentSalePrice !== undefined && Math.abs(itemSalePrice - currentSalePrice) > 0.01)) {
      warnings.push({
        itemKey: item.key,
        code: 'PRICE_CHANGED',
        message: `Sale price for ${item.name} has changed`,
        details: { 
          previousSalePrice: itemSalePrice, 
          currentSalePrice: currentSalePrice 
        }
      });
    }
  }

  /**
   * Validate product variation
   */
  private async validateProductVariation(
    item: CartItem,
    currentProduct: WooCommerceProduct,
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'VARIATION_NOT_FOUND';
      readonly message: string;
    }>
  ): Promise<void> {
    try {
      // In a real implementation, you would fetch variation data from the API
      // For now, we'll do basic validation
      if (!item.variationId) {
        errors.push({
          itemKey: item.key,
          code: 'VARIATION_NOT_FOUND',
          message: `Product variation is required for ${item.name}`
        });
        return;
      }

      // Validate variation attributes match what was selected
      if (item.attributes) {
        for (const [attributeName, attributeValue] of Object.entries(item.attributes)) {
          // In a real implementation, validate against available variations
          // This is a placeholder for variation validation logic
          if (!attributeValue || attributeValue.trim() === '') {
            errors.push({
              itemKey: item.key,
              code: 'VARIATION_NOT_FOUND',
              message: `Invalid variation attribute ${attributeName} for ${item.name}`
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        itemKey: item.key,
        code: 'VARIATION_NOT_FOUND',
        message: `Could not validate product variation for ${item.name}`
      });
    }
  }

  /**
   * Validate cart-level constraints
   */
  private async validateCartConstraints(
    cart: Cart,
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'INVALID_QUANTITY';
      readonly message: string;
    }>,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'HIGH_QUANTITY' | 'EMPTY_CART' | 'MINIMUM_ORDER_NOT_MET';
      readonly message: string;
      readonly details?: Record<string, unknown>;
    }>
  ): void {
    // Validate maximum number of items
    if (cart.items.length > this.config.maxItems) {
      errors.push({
        itemKey: '',
        code: 'INVALID_QUANTITY',
        message: `Cart cannot contain more than ${this.config.maxItems} items`
      });
    }

    // Validate total item count
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const maxTotalQuantity = this.config.maxItems * this.config.maxQuantityPerItem;
    
    if (totalQuantity > maxTotalQuantity) {
      warnings.push({
        itemKey: '',
        code: 'HIGH_QUANTITY',
        message: `Cart contains ${totalQuantity} items, which may affect performance`,
        details: { totalQuantity, maxRecommended: maxTotalQuantity }
      });
    }

    // Validate cart is not empty
    if (cart.items.length === 0) {
      warnings.push({
        itemKey: '',
        code: 'EMPTY_CART',
        message: 'Cart is empty'
      });
    }

    // Validate cart total constraints (if any)
    const minOrderAmount = 0; // This could be configurable
    if (minOrderAmount > 0 && cart.totals.total < minOrderAmount) {
      errors.push({
        itemKey: '',
        code: 'MINIMUM_ORDER_NOT_MET',
        message: `Minimum order amount is $${minOrderAmount.toFixed(2)}`
      });
    }
  }

  /**
   * Validate applied coupons
   */
  private async validateAppliedCoupons(
    cart: Cart,
    errors: Array<{
      readonly itemKey: string;
      readonly code: 'COUPON_EXPIRED' | 'COUPON_USAGE_LIMIT_EXCEEDED' | 'COUPON_MINIMUM_NOT_MET' | 'COUPON_MAXIMUM_EXCEEDED' | 'COUPON_INDIVIDUAL_USE';
      readonly message: string;
    }>,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'COUPON_VALIDATION_ERROR';
      readonly message: string;
      readonly details: Record<string, unknown>;
    }>
  ): void {
    for (const coupon of cart.appliedCoupons) {
      try {
        // Validate coupon expiry
        if (coupon.expiryDate && coupon.expiryDate < new Date()) {
          errors.push({
            itemKey: '',
            code: 'COUPON_EXPIRED',
            message: `Coupon ${coupon.code} has expired`
          });
          continue;
        }

        // Validate usage limits
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          errors.push({
            itemKey: '',
            code: 'COUPON_USAGE_LIMIT_EXCEEDED',
            message: `Coupon ${coupon.code} has reached its usage limit`
          });
          continue;
        }

        // Validate minimum amount
        if (coupon.minimumAmount && cart.totals.subtotal < coupon.minimumAmount) {
          errors.push({
            itemKey: '',
            code: 'COUPON_MINIMUM_NOT_MET',
            message: `Coupon ${coupon.code} requires a minimum order of $${coupon.minimumAmount.toFixed(2)}`
          });
          continue;
        }

        // Validate maximum amount
        if (coupon.maximumAmount && cart.totals.subtotal > coupon.maximumAmount) {
          warnings.push({
            itemKey: '',
            code: 'COUPON_MAXIMUM_EXCEEDED',
            message: `Coupon ${coupon.code} is only valid for orders up to $${coupon.maximumAmount.toFixed(2)}`,
            details: { couponCode: coupon.code, maximumAmount: coupon.maximumAmount }
          });
        }

        // Validate individual use coupons
        if (coupon.individualUse && cart.appliedCoupons.length > 1) {
          errors.push({
            itemKey: '',
            code: 'COUPON_INDIVIDUAL_USE',
            message: `Coupon ${coupon.code} cannot be combined with other coupons`
          });
        }

      } catch (error) {
        warnings.push({
          itemKey: '',
          code: 'COUPON_VALIDATION_ERROR',
          message: `Could not validate coupon ${coupon.code}`,
          details: { couponCode: coupon.code, error }
        });
      }
    }
  }

  /**
   * Validate cart totals integrity
   */
  private async validateCartTotals(
    cart: Cart,
    warnings: Array<{
      readonly itemKey: string;
      readonly code: 'TOTALS_MISMATCH' | 'TOTALS_VALIDATION_ERROR';
      readonly message: string;
      readonly details: Record<string, unknown>;
    }>
  ): Promise<void> {
    try {
      // Recalculate totals and compare with stored totals
      const recalculatedTotals = this.calculator.calculate(
        cart.items,
        cart.appliedCoupons,
        cart.shippingMethods,
        cart.fees
      );

      const tolerance = 0.01; // 1 cent tolerance for rounding differences

      if (Math.abs(cart.totals.total - recalculatedTotals.total) > tolerance) {
        warnings.push({
          itemKey: '',
          code: 'TOTALS_MISMATCH',
          message: 'Cart totals may be outdated and need recalculation',
          details: { 
            storedTotal: cart.totals.total, 
            calculatedTotal: recalculatedTotals.total,
            difference: Math.abs(cart.totals.total - recalculatedTotals.total)
          }
        });
      }

    } catch (error) {
      warnings.push({
        itemKey: '',
        code: 'TOTALS_VALIDATION_ERROR',
        message: 'Could not validate cart totals',
        details: { error }
      });
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(couponCode: string): Promise<Result<Cart, WooError>> {
    try {
      const cart = await this.getCart();
      if (isErr(cart)) {
        return cart;
      }

      const cartData = unwrap(cart);
      
      // Check if coupon is already applied
      const alreadyApplied = cartData.appliedCoupons.some(coupon => coupon.code === couponCode);
      if (alreadyApplied) {
        return Err(ErrorFactory.validationError('Coupon is already applied'));
      }

      // Validate coupon
      const validation = await this.validateCoupon(couponCode);
      if (isErr(validation)) {
        return validation;
      }

      const validationResult = unwrap(validation);
      if (!validationResult.valid) {
        return Err(ErrorFactory.validationError(validationResult.reason || 'Invalid coupon'));
      }

      // Apply coupon and recalculate totals
      const updatedCart = await this.recalculateWithCoupon(cartData, validationResult.coupon!);
      return Ok(updatedCart);
    } catch (error) {
      return Err(ErrorFactory.networkError(
        error instanceof Error ? error.message : 'Failed to apply coupon'
      ));
    }
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(couponCode: string): Promise<Result<Cart, WooError>> {
    try {
      if (!this.config.enableCoupons) {
        return Err(ErrorFactory.configurationError('Coupons are disabled'));
      }

      if (!couponCode || couponCode.trim() === '') {
        return Err(ErrorFactory.validationError('Coupon code is required'));
      }

      // Get current cart
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;
      const normalizedCode = couponCode.trim().toUpperCase();

      // Check if coupon is applied
      const couponExists = cart.appliedCoupons.some(c => c.code === normalizedCode);
      if (!couponExists) {
        return Err(ErrorFactory.validationError(`Coupon ${normalizedCode} is not applied to this cart`));
      }

      // Remove the coupon
      const updatedAppliedCoupons = cart.appliedCoupons.filter(c => c.code !== normalizedCode);

      // Recalculate totals without the coupon
      const updatedTotals = this.calculator.calculate(
        cart.items,
        updatedAppliedCoupons,
        cart.shippingMethods,
        cart.fees
      );

      // Create updated cart
      const updatedCart: Cart = {
        ...cart,
        appliedCoupons: updatedAppliedCoupons,
        totals: updatedTotals,
        updatedAt: new Date()
      };

      // Save cart
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }

      this.currentCart = updatedCart;
      return Ok(updatedCart);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to remove coupon',
        error
      ));
    }
  }

  /**
   * Get available coupons for current cart
   */
  async getAvailableCoupons(): Promise<Result<WooCommerceCoupon[], WooError>> {
    try {
      if (!this.config.enableCoupons) {
        return Err(ErrorFactory.configurationError('Coupons are disabled'));
      }

      // Get current cart for context
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;

      // Fetch available coupons from API
      const response = await this.client.get<WooCommerceCoupon[]>('/coupons', {
        status: 'publish',
        per_page: 100, // Adjust as needed
        orderby: 'date',
        order: 'desc'
      });

      if (!response.success) {
        return response;
      }

      // Filter coupons based on cart eligibility
      const availableCoupons: WooCommerceCoupon[] = [];
      
      for (const coupon of response.data.data) {
        const isEligible = await this.isCouponEligibleForCart(coupon, cart);
        if (isEligible) {
          availableCoupons.push(coupon);
        }
      }

      return Ok(availableCoupons);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to get available coupons',
        error
      ));
    }
  }

  /**
   * Validate coupon code without applying it
   */
  async validateCoupon(couponCode: string): Promise<Result<{ valid: boolean; coupon?: WooCommerceCoupon; reason?: string }, WooError>> {
    try {
      if (!this.config.enableCoupons) {
        return Ok({ valid: false, reason: 'Coupons are disabled' });
      }

      if (!couponCode || couponCode.trim() === '') {
        return Ok({ valid: false, reason: 'Coupon code is required' });
      }

      const normalizedCode = couponCode.trim().toUpperCase();

      // Fetch coupon data
      const couponResult = await this.fetchCouponData(normalizedCode);
      if (!couponResult.success) {
        return Ok({ valid: false, reason: 'Coupon not found' });
      }

      const couponData = couponResult.data;

      // Get current cart for validation
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }

      const cart = cartResult.data;

      // Validate coupon eligibility
      const validationResult = await this.validateCouponEligibility(couponData, cart);
      if (!validationResult.success) {
        return Ok({ 
          valid: false, 
          coupon: couponData,
          reason: validationResult.error.message 
        });
      }

      return Ok({ 
        valid: true, 
        coupon: couponData 
      });

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to validate coupon',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Fetch coupon data from WooCommerce API
   */
  private async fetchCouponData(couponCode: string): Promise<Result<WooCommerceCoupon, WooError>> {
    try {
      // Use cache first
      const cacheKey = `coupons:${couponCode}`;
      const cachedResult = await this.cache.get<WooCommerceCoupon>(cacheKey);
      
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Fetch from API - try by code first
      const response = await this.client.get<WooCommerceCoupon[]>('/coupons', {
        code: couponCode,
        status: 'publish'
      });

      if (!response.success) {
        return Err(ErrorFactory.validationError('Coupon not found'));
      }

      const coupons = response.data.data;
      if (!coupons || coupons.length === 0) {
        return Err(ErrorFactory.validationError('Coupon not found'));
      }

      const coupon = coupons[0];
      
      if (!coupon) {
        return Err(ErrorFactory.validationError(`Coupon ${couponCode} not found`));
      }

      // Cache the result
      await this.cache.set(cacheKey, coupon, 300); // 5 minutes cache

      return Ok(coupon);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to fetch coupon data',
        error
      ));
    }
  }

  /**
   * Validate if coupon is eligible for the current cart
   */
  private async validateCouponEligibility(coupon: WooCommerceCoupon, cart: Cart): Promise<Result<void, WooError>> {
    try {
      // Check expiry date
      if (coupon.date_expires) {
        const expiryDate = new Date(coupon.date_expires);
        if (expiryDate < new Date()) {
          return Err(ErrorFactory.validationError(`Coupon ${coupon.code} has expired`));
        }
      }

      // Check usage limits
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return Err(ErrorFactory.validationError(`Coupon ${coupon.code} has reached its usage limit`));
      }

      // Check minimum amount
      if (coupon.minimum_amount) {
        const minAmount = parseFloat(coupon.minimum_amount);
        if (cart.totals.subtotal < minAmount) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} requires a minimum order of $${minAmount.toFixed(2)}`
          ));
        }
      }

      // Check maximum amount
      if (coupon.maximum_amount) {
        const maxAmount = parseFloat(coupon.maximum_amount);
        if (cart.totals.subtotal > maxAmount) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} is only valid for orders up to $${maxAmount.toFixed(2)}`
          ));
        }
      }

      // Check product restrictions
      if (coupon.product_ids && coupon.product_ids.length > 0) {
        const hasEligibleProduct = cart.items.some(item => 
          coupon.product_ids!.includes(item.productId)
        );
        if (!hasEligibleProduct) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} is not valid for the products in your cart`
          ));
        }
      }

      // Check excluded products
      if (coupon.excluded_product_ids && coupon.excluded_product_ids.length > 0) {
        const hasExcludedProduct = cart.items.some(item => 
          coupon.excluded_product_ids!.includes(item.productId)
        );
        if (hasExcludedProduct) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} cannot be used with some products in your cart`
          ));
        }
      }

      // Check individual use restriction
      if (coupon.individual_use && cart.appliedCoupons.length > 0) {
        return Err(ErrorFactory.validationError(
          `Coupon ${coupon.code} cannot be combined with other coupons`
        ));
      }

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to validate coupon eligibility',
        error
      ));
    }
  }

  /**
   * Check if a coupon is eligible for the current cart (simplified version)
   */
  private async isCouponEligibleForCart(coupon: WooCommerceCoupon, cart: Cart): Promise<boolean> {
    try {
      const validationResult = await this.validateCouponEligibility(coupon, cart);
      return validationResult.success;
    } catch {
      return false;
    }
  }

  private validateAddItemRequest(request: CartAddItemRequest): Result<void, WooError> {
    try {
      CartAddItemRequestSchema.parse(request);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Invalid add item request',
        error
      ));
    }
  }

  private async fetchProductData(request: CartAddItemRequest): Promise<Result<WooCommerceProduct, WooError>> {
    // Use cache first
    const cacheKey = `products:single:${request.productId}`;
    const cachedResult = await this.cache.get<WooCommerceProduct>(cacheKey);
    
    if (cachedResult.success && cachedResult.data) {
      return Ok(cachedResult.data);
    }

    // Fetch from API
    const response = await this.client.get<WooCommerceProduct>(`/products/${request.productId}`);
    
    if (!response.success) {
      if (response.error.statusCode === 404) {
        return Err(ErrorFactory.productNotFoundError(request.productId));
      }
      return response;
    }

    // Cache the result
    await this.cache.set(cacheKey, response.data.data);
    
    return Ok(response.data.data);
  }

  private validateStock(product: WooCommerceProduct, requestedQuantity: number): Result<void, WooError> {
    if (product.stock_status === 'outofstock') {
      return Err(ErrorFactory.validationError('Product is out of stock'));
    }

    if (product.stock_quantity !== null && product.stock_quantity !== undefined && requestedQuantity > product.stock_quantity) {
      return Err(ErrorFactory.validationError(
        `Only ${product.stock_quantity} items available in stock`
      ));
    }

    return Ok(undefined);
  }

  private generateCartItemKey(request: CartAddItemRequest): string {
    let key = `${request.productId}`;
    
    if (request.variationId) {
      key += `-${request.variationId}`;
    }
    
    if (request.attributes) {
      const sortedAttrs = Object.keys(request.attributes)
        .sort()
        .map(k => `${k}:${request.attributes![k]}`)
        .join('|');
      key += `-${sortedAttrs}`;
    }
    
    return key;
  }

  private createCartItem(
    product: WooCommerceProduct, 
    request: CartAddItemRequest, 
    itemKey: string
  ): CartItem {
    const now = new Date();
    const price = parseFloat(product.price) || 0;
    const regularPrice = parseFloat(product.regular_price) || 0;
    const salePrice = product.sale_price ? parseFloat(product.sale_price) : undefined;
    const totalPrice = price * request.quantity;

    const cartItem: CartItem = {
      key: itemKey,
      productId: product.id,
      variationId: request.variationId,
      quantity: request.quantity,
      name: product.name,
      price,
      regularPrice,
      salePrice,
      totalPrice,
      total: totalPrice,
      sku: product.sku || undefined,
      weight: product.weight ? parseFloat(product.weight) : undefined,
      stockQuantity: product.stock_quantity || undefined,
      stockStatus: product.stock_status,
      backordersAllowed: product.backorders_allowed || false,
      soldIndividually: product.sold_individually || false,
      downloadable: product.downloadable || false,
      virtual: product.virtual || false,
      meta: {},
      addedAt: new Date(),
      updatedAt: new Date()
    };

    return cartItem;
  }

  private createEmptyCart(): Cart {
    const now = new Date();
    const sessionId = generateId(); // Using test utility for now

    return {
      items: [],
      itemCount: 0,
      totals: this.calculator.calculate([]),
      appliedCoupons: [],
      shippingMethods: [],
      chosenShippingMethods: [],
      fees: [],
      needsShipping: false,
      needsPayment: false,
      hasCalculatedShipping: false,
      currency: 'USD', // TODO: Get from config/API
      currencySymbol: '$',
      pricesIncludeTax: this.config.taxCalculation.pricesIncludeTax,
      taxDisplayMode: this.config.taxCalculation.displayMode === 'both' ? 'excl' : this.config.taxCalculation.displayMode,
      crossSells: [],
      isEmpty: true,
      createdAt: now,
      updatedAt: now,
      sessionId
    };
  }

  private updateCartWithItems(cart: Cart, items: readonly CartItem[]): Cart {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totals = this.calculator.calculate(items, cart.appliedCoupons);
    
    return {
      ...cart,
      items,
      itemCount,
      totals,
      isEmpty: items.length === 0,
      needsShipping: items.some(item => item.weight !== undefined || item.dimensions !== undefined),
      needsPayment: totals.total > 0,
      updatedAt: new Date()
    };
  }

  // CART SYNCHRONIZATION METHODS

  /**
   * Set user authentication context for cart synchronization
   */
  setAuthContext(authContext: UserAuthContext | null): void {
    this.authContext = authContext;
    
    // Trigger sync if user just authenticated and sync on auth is enabled
    if (authContext?.isAuthenticated && this.config.sync.enabled && this.config.sync.syncOnAuth) {
      this.syncCartWithServer().catch(error => {
        console.error('Failed to sync cart on authentication:', error);
      });
    }
  }

  /**
   * Get current authentication context
   */
  getAuthContext(): UserAuthContext | null {
    return this.authContext;
  }

  /**
   * Get cart synchronization status
   */
  getSyncStatus(): CartSyncStatus {
    return this.syncManager.getStatus();
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncAt(): Date | undefined {
    return this.syncManager.getLastSyncAt();
  }

  /**
   * Add cart sync event handler
   */
  addSyncEventHandler(handler: CartSyncEventHandler): void {
    this.syncManager.addEventHandler(handler);
  }

  /**
   * Remove cart sync event handler
   */
  removeSyncEventHandler(handler: CartSyncEventHandler): void {
    this.syncManager.removeEventHandler(handler);
  }

  /**
   * Manually trigger cart synchronization
   */
  async syncCartWithServer(): Promise<Result<CartSyncResult, WooError>> {
    if (!this.config.sync.enabled) {
      return Ok({
        success: true,
        status: 'idle',
        conflicts: [],
        syncedAt: new Date(),
        changes: {
          itemsAdded: 0,
          itemsUpdated: 0,
          itemsRemoved: 0,
          couponsAdded: 0,
          couponsRemoved: 0
        }
      });
    }

    if (!this.authContext?.isAuthenticated) {
      return Err(ErrorFactory.cartError(
        'User must be authenticated for cart synchronization',
        { context: 'manual_sync' }
      ));
    }

    const cartResult = await this.getCart();
    if (!cartResult.success) {
      return cartResult;
    }

    const syncResult = await this.syncManager.syncCart(cartResult.data, this.authContext);
    
    if (syncResult.success && syncResult.data.mergedCart) {
      // Update local cart with merged cart
      this.currentCart = syncResult.data.mergedCart;
      
      // Save merged cart to local persistence
      await this.persistence.save(syncResult.data.mergedCart);
    }

    return syncResult;
  }

  /**
   * Enable cart synchronization
   */
  enableSync(): void {
    this.syncManager.enable();
  }

  /**
   * Disable cart synchronization
   */
  disableSync(): void {
    this.syncManager.disable();
  }

  /**
   * Process offline sync queue
   */
  async processOfflineQueue(): Promise<Result<void, WooError>> {
    if (!this.authContext?.isAuthenticated) {
      return Ok(undefined);
    }

    const cartResult = await this.getCart();
    if (!cartResult.success) {
      return cartResult;
    }

    return this.syncManager.processQueue(cartResult.data, this.authContext);
  }

  /**
   * Clean up cart service resources
   */
  destroy(): void {
    this.syncManager.destroy();
    this.currentCart = null;
    this.authContext = null;
  }
} 