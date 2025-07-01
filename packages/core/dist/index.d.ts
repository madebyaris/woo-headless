import { z } from 'zod';

/**
 * Dynamic field requirements configuration
 */
declare interface AddressFieldRequirements {
    readonly firstName: boolean;
    readonly lastName: boolean;
    readonly company: boolean;
    readonly address1: boolean;
    readonly address2: boolean;
    readonly city: boolean;
    readonly state: boolean;
    readonly postcode: boolean;
    readonly country: boolean;
    readonly email: boolean;
    readonly phone: boolean;
}

/**
 * Address type
 */
export declare type AddressType = 'billing' | 'shipping';

/**
 * Address validation result
 */
export declare interface AddressValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
    readonly suggestedAddress?: UserAddress | undefined;
}

/**
 * Advanced search configuration
 */
export declare interface AdvancedSearchConfig {
    readonly fuzzy: {
        readonly enabled: boolean;
        readonly threshold: number;
        readonly distance: number;
        readonly minMatchCharLength: number;
        readonly includeScore: boolean;
    };
    readonly highlighting: {
        readonly enabled: boolean;
        readonly preTag: string;
        readonly postTag: string;
        readonly fragmentSize: number;
        readonly maxFragments: number;
    };
    readonly suggestions: {
        readonly enabled: boolean;
        readonly maxSuggestions: number;
        readonly minQueryLength: number;
        readonly showPopular: boolean;
        readonly showRecent: boolean;
    };
    readonly facets: {
        readonly enabled: boolean;
        readonly maxFacets: number;
        readonly maxFacetValues: number;
        readonly minDocumentCount: number;
    };
    readonly analytics: {
        readonly enabled: boolean;
        readonly trackQueries: boolean;
        readonly trackFilters: boolean;
        readonly trackClicks: boolean;
        readonly trackConversions: boolean;
        readonly sessionTimeout: number;
    };
    readonly caching: {
        readonly enabled: boolean;
        readonly ttl: number;
        readonly maxCacheSize: number;
        readonly cacheKey: string;
    };
    readonly performance: {
        readonly maxResults: number;
        readonly searchTimeout: number;
        readonly debounceDelay: number;
        readonly prefetchResults: boolean;
    };
}

/**
 * Analytics configuration
 */
export declare interface AnalyticsConfig {
    readonly enabled: boolean;
    readonly trackPageViews: boolean;
    readonly trackSearches: boolean;
    readonly trackConversions: boolean;
    readonly apiKey?: string;
    readonly endpoint?: string;
}

/**
 * Chain operations on successful results
 */
export declare function andThen<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E>;

/**
 * API-related errors from WooCommerce
 */
export declare class ApiError extends Error implements WooError {
    readonly statusCode: number;
    readonly details?: unknown | undefined;
    readonly code: "API_ERROR";
    readonly timestamp: Date;
    readonly retryable: boolean;
    constructor(message: string, statusCode: number, details?: unknown | undefined);
}

/**
 * Applied coupon information
 */
export declare interface AppliedCoupon {
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
 * Authentication and authorization errors
 */
export declare class AuthError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "AUTH_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    readonly statusCode?: number;
    constructor(message: string, details?: unknown | undefined, statusCode?: number);
}

/**
 * Authentication manager
 */
export declare class AuthManager {
    private readonly config;
    private readonly storage;
    private currentToken;
    private refreshTimer;
    constructor(config: ResolvedWooConfig, storage?: TokenStorage);
    /**
     * Initialize token from storage
     */
    private initializeToken;
    /**
     * Set authentication token
     */
    setToken(tokenData: JWTToken): Promise<void>;
    /**
     * Get current token
     */
    getToken(): string | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Validate token
     */
    validateToken(): Promise<Result<boolean, WooError>>;
    /**
     * Clear authentication token
     */
    clearToken(): Promise<void>;
    /**
     * Logout
     */
    logout(): Promise<Result<void, WooError>>;
    /**
     * Create JWT token from auth response
     */
    createTokenFromAuthResponse(authResponse: AuthResponse): Result<JWTToken, WooError>;
    /**
     * Get authorization header
     */
    getAuthorizationHeader(): Record<string, string> | undefined;
    /**
     * Schedule token refresh
     */
    private scheduleRefresh;
    /**
     * Handle token refresh
     */
    private handleTokenRefresh;
    /**
     * Clear refresh timer
     */
    private clearRefreshTimer;
    /**
     * Check if token is valid (not expired)
     */
    private isTokenValid;
    /**
     * Generate basic auth header for consumer key/secret
     */
    static generateBasicAuth(consumerKey: string, consumerSecret: string): string;
    /**
     * Create OAuth signature for WooCommerce REST API
     */
    static createOAuthSignature(consumerKey: string, consumerSecret: string, url: string, method: string, parameters?: Record<string, string>): Record<string, string>;
}

/**
 * Authentication response from WooCommerce
 */
declare interface AuthResponse {
    readonly success: boolean;
    readonly data: {
        readonly token: string;
        readonly user_email: string;
        readonly user_nicename: string;
        readonly user_display_name: string;
        readonly expires: number;
    };
}

/**
 * Auto-complete request
 */
export declare interface AutoCompleteRequest {
    readonly query: string;
    readonly limit?: number;
    readonly categories?: readonly number[];
    readonly includeProducts?: boolean;
    readonly includeCategories?: boolean;
    readonly includeBrands?: boolean;
}

/**
 * Auto-complete response
 */
export declare interface AutoCompleteResponse {
    readonly query: string;
    readonly suggestions: readonly SearchSuggestion[];
    readonly products: readonly WooCommerceProduct[];
    readonly categories: readonly {
        readonly id: number;
        readonly name: string;
        readonly count: number;
    }[];
    readonly processingTime: number;
}

/**
 * Base address interface for billing and shipping
 */
declare interface BaseAddress {
    readonly firstName: string;
    readonly lastName: string;
    readonly company?: string;
    readonly address1: string;
    readonly address2?: string;
    readonly city: string;
    readonly state: string;
    readonly postcode: string;
    readonly country: string;
    readonly email?: string;
    readonly phone?: string;
}

/**
 * Billing address interface
 */
export declare interface BillingAddress {
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
 * Billing address with required email
 */
declare interface BillingAddress_2 extends BaseAddress {
    readonly email: string;
}

/**
 * Cache configuration
 */
export declare interface CacheConfig {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly storage: CacheStorageType;
    readonly maxSize?: number;
    readonly prefix?: string;
}

/**
 * Cache entry interface with metadata
 */
export declare interface CacheEntry<T> {
    readonly data: T;
    readonly timestamp: number;
    readonly ttl: number;
    readonly key: string;
}

/**
 * Cache-related errors
 */
export declare class CacheError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "CACHE_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(message: string, details?: unknown | undefined);
}

/**
 * Multi-layer cache manager
 */
export declare class CacheManager {
    private readonly layers;
    private readonly config;
    constructor(config: CacheConfig);
    private initializeLayers;
    /**
     * Get value from cache (checks all layers)
     */
    get<T>(key: string): Promise<Result<T | null, WooError>>;
    /**
     * Set value in cache (sets in all layers)
     */
    set<T>(key: string, value: T, ttl?: number): Promise<Result<void, WooError>>;
    /**
     * Delete value from all cache layers
     */
    delete(key: string): Promise<Result<void, WooError>>;
    /**
     * Clear all cache layers
     */
    clear(): Promise<Result<void, WooError>>;
    /**
     * Check if key exists in any cache layer
     */
    has(key: string): Promise<Result<boolean, WooError>>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<Result<Record<string, number>, WooError>>;
    /**
     * Promote value to higher cache layers
     */
    private promote;
}

/**
 * Cache storage interface
 */
declare interface CacheStorage_2 {
    get<T>(key: string): Promise<Result<T | null, WooError>>;
    set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>>;
    delete(key: string): Promise<Result<void, WooError>>;
    clear(): Promise<Result<void, WooError>>;
    has(key: string): Promise<Result<boolean, WooError>>;
    size(): Promise<Result<number, WooError>>;
}
export { CacheStorage_2 as CacheStorage }

/**
 * Cache storage types
 */
export declare type CacheStorageType = 'localStorage' | 'sessionStorage' | 'memory';

/**
 * Main cart interface
 */
export declare interface Cart {
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
    readonly crossSells: readonly number[];
    readonly isEmpty: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly expiresAt?: Date;
    readonly customerId?: number;
    readonly sessionId: string;
}

/**
 * Cart add item request
 */
export declare interface CartAddItemRequest {
    readonly productId: number;
    readonly variationId: number | undefined;
    readonly quantity: number;
    readonly attributes?: Record<string, string>;
    readonly meta?: readonly CartItemMeta[];
    readonly replace?: boolean;
}

/**
 * Cart configuration
 */
export declare interface CartConfig {
    readonly persistence: CartPersistenceConfig;
    readonly sync: CartSyncConfig;
    readonly autoCalculateTotals: boolean;
    readonly validateStock: boolean;
    readonly allowBackorders: boolean;
    readonly sessionTimeout: number;
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

/**
 * Cart-related errors
 */
export declare class CartError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "CART_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(message: string, details?: unknown | undefined);
}

/**
 * Cart fees (additional charges)
 */
export declare interface CartFee {
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
 * Cart item interface
 */
export declare interface CartItem {
    readonly key: string;
    readonly productId: number;
    readonly variationId: number | undefined;
    readonly quantity: number;
    readonly name: string;
    readonly price: number;
    readonly regularPrice: number;
    readonly salePrice: number | undefined;
    readonly totalPrice: number;
    readonly total: number;
    readonly sku: string | undefined;
    readonly weight: number | undefined;
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
    readonly stockQuantity: number | undefined;
    readonly stockStatus: 'instock' | 'outofstock' | 'onbackorder';
    readonly backorders: 'no' | 'notify' | 'yes';
    readonly quantityLimits?: CartQuantityLimits;
    readonly meta?: readonly CartItemMeta[];
    readonly attributes?: Record<string, string>;
    readonly addedAt: Date;
    readonly updatedAt: Date;
    readonly backordersAllowed: boolean;
    readonly soldIndividually: boolean;
    readonly downloadable: boolean;
    readonly virtual: boolean;
}

/**
 * Cart item metadata
 */
export declare interface CartItemMeta {
    readonly key: string;
    readonly value: string;
    readonly displayKey?: string;
    readonly displayValue?: string;
}

/**
 * Cart persistence options
 */
export declare interface CartPersistenceConfig {
    readonly strategy: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'server' | 'none';
    readonly key?: string;
    readonly encryption?: boolean;
    readonly expirationDays?: number;
    readonly syncToServer?: boolean;
}

/**
 * Cart item quantity limits
 */
export declare interface CartQuantityLimits {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

/**
 * Main cart service class
 */
export declare class CartService {
    private readonly client;
    private readonly cache;
    private readonly config;
    private readonly persistence;
    private readonly calculator;
    private readonly syncManager;
    private currentCart;
    private authContext;
    constructor(client: HttpClient, cache: CacheManager, config: CartConfig);
    /**
     * Get current cart
     */
    getCart(): Promise<Result<Cart, WooError>>;
    /**
     * Add item to cart
     */
    addItem(request: CartAddItemRequest): Promise<Result<Cart, WooError>>;
    /**
     * Update item quantity in cart
     */
    updateItem(itemKey: string, quantity: number): Promise<Result<Cart, WooError>>;
    /**
     * Remove item from cart
     */
    removeItem(itemKey: string): Promise<Result<void, WooError>>;
    /**
     * Clear entire cart
     */
    clearCart(): Promise<Result<Cart, WooError>>;
    /**
     * Comprehensive cart validation with stock, availability, and business rules
     */
    validateCart(): Promise<Result<CartValidationResult, WooError>>;
    /**
     * Validate individual cart item
     */
    private validateCartItem;
    /**
     * Validate item stock levels
     */
    private validateItemStock;
    /**
     * Validate quantity limits for cart item
     */
    private validateItemQuantityLimits;
    /**
     * Validate price changes since item was added
     */
    private validateItemPriceChanges;
    /**
     * Validate product variation
     */
    private validateProductVariation;
    /**
     * Validate cart-level constraints
     */
    private validateCartConstraints;
    /**
     * Validate applied coupons
     */
    private validateAppliedCoupons;
    /**
     * Validate cart totals integrity
     */
    private validateCartTotals;
    /**
     * Apply coupon to cart
     */
    applyCoupon(couponCode: string): Promise<Result<Cart, WooError>>;
    /**
     * Remove coupon from cart
     */
    removeCoupon(couponCode: string): Promise<Result<Cart, WooError>>;
    /**
     * Get available coupons for current cart
     */
    getAvailableCoupons(): Promise<Result<WooCommerceCoupon[], WooError>>;
    /**
     * Validate coupon code without applying it
     */
    validateCoupon(couponCode: string): Promise<Result<{
        valid: boolean;
        coupon?: WooCommerceCoupon;
        reason?: string;
    }, WooError>>;
    /**
     * Fetch coupon data from WooCommerce API
     */
    private fetchCouponData;
    /**
     * Validate if coupon is eligible for the current cart
     */
    private validateCouponEligibility;
    /**
     * Check if a coupon is eligible for the current cart (simplified version)
     */
    private isCouponEligibleForCart;
    private validateAddItemRequest;
    private fetchProductData;
    private validateStock;
    private generateCartItemKey;
    private createCartItem;
    private createEmptyCart;
    private updateCartWithItems;
    /**
     * Set user authentication context for cart synchronization
     */
    setAuthContext(authContext: UserAuthContext | null): void;
    /**
     * Get current authentication context
     */
    getAuthContext(): UserAuthContext | null;
    /**
     * Get cart synchronization status
     */
    getSyncStatus(): CartSyncStatus;
    /**
     * Get last sync timestamp
     */
    getLastSyncAt(): Date | undefined;
    /**
     * Add cart sync event handler
     */
    addSyncEventHandler(handler: CartSyncEventHandler): void;
    /**
     * Remove cart sync event handler
     */
    removeSyncEventHandler(handler: CartSyncEventHandler): void;
    /**
     * Manually trigger cart synchronization
     */
    syncCartWithServer(): Promise<Result<CartSyncResult, WooError>>;
    /**
     * Enable cart synchronization
     */
    enableSync(): void;
    /**
     * Disable cart synchronization
     */
    disableSync(): void;
    /**
     * Process offline sync queue
     */
    processOfflineQueue(): Promise<Result<void, WooError>>;
    /**
     * Clean up cart service resources
     */
    destroy(): void;
}

/**
 * Cart synchronization configuration
 */
export declare interface CartSyncConfig {
    readonly enabled: boolean;
    readonly strategy: 'merge_smart' | 'local_wins' | 'server_wins' | 'merge_quantities' | 'prompt_user';
    readonly syncIntervalMs: number;
    readonly conflictResolution: 'merge_smart' | 'local_wins' | 'server_wins' | 'merge_quantities' | 'prompt_user';
    readonly maxRetries: number;
    readonly retryDelayMs: number;
    readonly syncOnAuth: boolean;
    readonly syncOnCartChange: boolean;
    readonly backgroundSync: boolean;
    readonly offlineQueueSize: number;
}

/**
 * Cart sync conflict information
 */
declare interface CartSyncConflict {
    readonly type: 'item_quantity' | 'item_missing' | 'coupon_conflict' | 'total_mismatch';
    readonly itemKey?: string;
    readonly localValue: unknown;
    readonly serverValue: unknown;
    readonly message: string;
    readonly suggestion: string;
}

/**
 * Cart synchronization event handler
 */
declare interface CartSyncEventHandler {
    onSyncStart: () => void;
    onSyncComplete: (result: CartSyncResult) => void;
    onSyncError: (error: CartError) => void;
    onConflictDetected: (conflicts: readonly CartSyncConflict[]) => void;
}

/**
 * Cart sync result
 */
declare interface CartSyncResult {
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
 * Cart synchronization status
 */
declare type CartSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed' | 'conflict';

/**
 * Cart totals breakdown
 */
export declare interface CartTotals {
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
    readonly tax: number;
    readonly shipping: number;
    readonly fees: number;
    readonly discount: number;
}

/**
 * Cart update request
 */
export declare interface CartUpdateRequest {
    readonly productId: number;
    readonly variationId?: number;
    readonly quantity: number;
    readonly attributes?: Record<string, string>;
    readonly meta?: readonly CartItemMeta[];
}

/**
 * Cart validation result
 */
export declare interface CartValidationResult {
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
 * Comprehensive checkout configuration
 */
declare interface CheckoutConfig {
    readonly address?: Partial<AddressFieldRequirements>;
    readonly shipping?: Partial<ShippingConfig>;
    readonly payment?: Partial<PaymentConfig>;
    readonly flow?: Partial<CheckoutFlowConfig>;
    readonly order?: Partial<OrderProcessingConfig>;
    readonly validation?: Partial<CheckoutValidationRules>;
}

/**
 * Checkout process errors
 */
export declare class CheckoutError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "CHECKOUT_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(message: string, details?: unknown | undefined);
}

/**
 * Checkout flow state
 */
declare interface CheckoutFlow {
    readonly steps: readonly CheckoutStep[];
    readonly currentStep: CheckoutStepType;
    readonly canProceed: boolean;
    readonly canGoBack: boolean;
    readonly progress: {
        readonly current: number;
        readonly total: number;
        readonly percentage: number;
    };
}

/**
 * Checkout flow configuration
 */
declare interface CheckoutFlowConfig {
    readonly steps: readonly CheckoutStepType[];
    readonly allowSkipOptional: boolean;
    readonly persistSession: boolean;
    readonly sessionTimeout: number;
    readonly autoAdvance: boolean;
    readonly validationRules: CheckoutValidationRules;
}

/**
 * Checkout flow event handlers
 */
declare interface CheckoutFlowEventHandlers {
    onStepChange?: (currentStep: number, previousStep: number) => void;
    onStepComplete?: (step: number) => void;
    onValidationError?: (errors: readonly string[]) => void;
    onCheckoutComplete?: (order: Order) => void;
    onCheckoutError?: (error: WooError) => void;
}

/**
 * Checkout flow state
 */
declare interface CheckoutFlowState {
    readonly currentStep: number;
    readonly completedSteps: readonly number[];
    readonly availableSteps: readonly CheckoutStep[];
    readonly canProceed: boolean;
    readonly canGoBack: boolean;
    readonly session: CheckoutSession;
    readonly validationResult?: CheckoutValidationResult;
}

/**
 * Checkout initialization options
 */
declare interface CheckoutInitOptions {
    readonly isGuestCheckout?: boolean;
    readonly skipValidation?: boolean;
    readonly startStep?: number;
}

/**
 * Main checkout service integrating all components
 */
declare class CheckoutService {
    private readonly config;
    private readonly addressManager;
    private readonly shippingService;
    private readonly paymentService;
    private readonly validationService;
    private readonly orderProcessingService;
    private flowManager;
    private currentCart;
    constructor(client: HttpClient, cache: CacheManager, config?: CheckoutConfig);
    /**
     * Initialize checkout with cart
     */
    initializeCheckout(cart: Cart, options?: CheckoutInitOptions, eventHandlers?: CheckoutFlowEventHandlers): Promise<Result<CheckoutFlowState, WooError>>;
    /**
     * Update checkout session
     */
    updateSession(updates: CheckoutSessionUpdateOptions): Promise<Result<CheckoutFlowState, WooError>>;
    /**
     * Move to next step
     */
    nextStep(): Promise<Result<StepTransitionResult, WooError>>;
    /**
     * Move to previous step
     */
    previousStep(): Promise<Result<StepTransitionResult, WooError>>;
    /**
     * Jump to specific step
     */
    goToStep(step: number): Promise<Result<StepTransitionResult, WooError>>;
    /**
     * Get current checkout state
     */
    getCurrentState(): CheckoutFlowState | null;
    /**
     * Validate current step
     */
    validateCurrentStep(): Promise<Result<CheckoutValidationResult, WooError>>;
    /**
     * Complete checkout and create order
     */
    completeCheckout(): Promise<Result<OrderCreateResponse, WooError>>;
    /**
     * Get field requirements for address
     */
    getAddressFieldRequirements(addressType: 'billing' | 'shipping'): AddressFieldRequirements;
    /**
     * Validate address
     */
    validateAddress(address: BillingAddress_2 | ShippingAddress_2, type: 'billing' | 'shipping'): Promise<Result<ValidationResult, WooError>>;
    /**
     * Get address suggestions
     */
    getAddressSuggestions(address: BillingAddress_2 | ShippingAddress_2): Promise<Result<BillingAddress_2 | ShippingAddress_2 | null, WooError>>;
    /**
     * Get available shipping rates
     */
    getShippingRates(destination?: BillingAddress_2 | ShippingAddress_2): Promise<Result<ShippingRateResponse, WooError>>;
    /**
     * Calculate shipping for selected method
     */
    calculateShipping(selectedMethod: SelectedShippingMethod, destination?: BillingAddress_2 | ShippingAddress_2): Promise<Result<ShippingCalculation, WooError>>;
    /**
     * Get available payment methods
     */
    getPaymentMethods(): Promise<Result<PaymentMethod[], WooError>>;
    /**
     * Validate payment method
     */
    validatePaymentMethod(methodId: string): Promise<Result<boolean, WooError>>;
    /**
     * Get order by ID
     */
    getOrder(orderId: string): Promise<Result<Order, WooError>>;
    /**
     * Confirm order payment
     */
    confirmOrderPayment(request: OrderConfirmationRequest): Promise<Result<Order, WooError>>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string, reason?: string): Promise<Result<Order, WooError>>;
    /**
     * Search orders
     */
    searchOrders(criteria: OrderSearchCriteria): Promise<Result<Order[], WooError>>;
    /**
     * Reset checkout session
     */
    resetCheckout(): Promise<Result<void, WooError>>;
    /**
     * Check if checkout can proceed
     */
    canProceedToNextStep(): boolean;
    /**
     * Get current step information
     */
    getCurrentStep(): CheckoutStep | null;
    /**
     * Check if step is completed
     */
    isStepCompleted(step: number): boolean;
    /**
     * Generate order number
     */
    generateOrderNumber(): string;
    /**
     * Get checkout configuration
     */
    getConfiguration(): CheckoutConfig;
    /**
     * Update checkout configuration
     */
    updateConfiguration(updates: Partial<CheckoutConfig>): void;
}

/**
 * Checkout session state
 */
declare interface CheckoutSession {
    readonly id: string;
    readonly cartId: string;
    readonly customerId?: number;
    readonly billingAddress?: BillingAddress_2;
    readonly shippingAddress?: ShippingAddress_2;
    readonly useShippingAsBilling?: boolean;
    readonly selectedShippingMethod?: SelectedShippingMethod;
    readonly selectedPaymentMethod?: PaymentMethod;
    readonly orderNotes?: string;
    readonly termsAccepted?: boolean;
    readonly newsletterOptIn?: boolean;
    readonly isGuestCheckout?: boolean;
    readonly orderTotals: OrderTotals;
    readonly flow: CheckoutFlow;
    readonly expiresAt: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * Checkout session update options
 */
declare interface CheckoutSessionUpdateOptions {
    readonly billingAddress?: BillingAddress_2;
    readonly shippingAddress?: ShippingAddress_2;
    readonly useShippingAsBilling?: boolean;
    readonly selectedShippingMethod?: SelectedShippingMethod;
    readonly selectedPaymentMethod?: PaymentMethod;
    readonly orderNotes?: string;
    readonly termsAccepted?: boolean;
    readonly newsletterOptIn?: boolean;
}

/**
 * Individual checkout step
 */
declare interface CheckoutStep {
    readonly type: CheckoutStepType;
    readonly title: string;
    readonly description: string;
    readonly completed: boolean;
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly data?: Record<string, unknown>;
}

/**
 * Checkout step types
 */
declare type CheckoutStepType = 'address' | 'shipping' | 'payment' | 'review' | 'cart_review' | 'shipping_address' | 'billing_address' | 'shipping_method' | 'payment_method' | 'order_review' | 'payment_processing' | 'order_confirmation';

/**
 * Comprehensive checkout validation result
 */
declare interface CheckoutValidationResult {
    readonly isValid: boolean;
    readonly canProceed: boolean;
    readonly validationResults: readonly ValidationResult[];
    readonly criticalErrors: readonly string[];
    readonly warnings: readonly string[];
    readonly blockers: readonly string[];
    readonly recommendations: readonly string[];
}

/**
 * Checkout validation rules
 */
declare interface CheckoutValidationRules {
    readonly requireShippingAddress: boolean;
    readonly requireBillingAddress: boolean;
    readonly requireEmail?: boolean;
    readonly requirePhoneNumber: boolean;
    readonly requireCompanyName: boolean;
    readonly allowGuestCheckout: boolean;
    readonly minimumOrderAmount?: number;
    readonly maximumOrderAmount?: number;
    readonly restrictedCountries: readonly string[];
    readonly requiredFields: readonly string[];
    readonly returnUrl?: string;
    readonly cancelUrl?: string;
}

/**
 * Configuration manager class
 */
export declare class ConfigManager {
    /**
     * Resolve configuration with defaults and validation
     */
    static resolveConfig(config: WooConfig): Result<ResolvedWooConfig, ConfigurationError>;
    /**
     * Validate configuration
     */
    static validateConfig(config: WooConfig): Result<void, ConfigurationError>;
    /**
     * Get environment-specific configuration
     */
    static getEnvironmentConfig(environment: string): Partial<WooConfig>;
    /**
     * Create configuration from environment variables
     */
    static fromEnvironment(): Partial<WooConfig>;
    /**
     * Merge multiple configurations
     */
    static mergeConfigs(...configs: Partial<WooConfig>[]): Partial<WooConfig>;
}

/**
 * Configuration errors
 */
export declare class ConfigurationError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "CONFIGURATION_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(message: string, details?: unknown | undefined);
}

/**
 * New review submission interface
 */
export declare interface CreateReviewRequest {
    readonly product_id: number;
    readonly review: string;
    readonly reviewer: string;
    readonly reviewer_email: string;
    readonly rating: number;
    readonly parent_id?: number;
    readonly images?: readonly File[] | readonly string[];
}

/**
 * WooCommerce customer data
 */
export declare interface CustomerData {
    readonly id: number;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly username: string;
    readonly role: UserRole;
    readonly billing: UserAddress;
    readonly shipping: UserAddress;
    readonly isPayingCustomer: boolean;
    readonly ordersCount: number;
    readonly totalSpent: string;
    readonly avatarUrl: string;
    readonly dateCreated: string;
    readonly dateModified: string;
    readonly metaData: readonly {
        readonly key: string;
        readonly value: unknown;
    }[];
}

/**
 * Customer download interface
 */
declare interface CustomerDownload {
    readonly permissionId: string;
    readonly orderId: number;
    readonly orderDate: Date;
    readonly productId: number;
    readonly productName: string;
    readonly downloadId: string;
    readonly fileName: string;
    readonly fileSize: number;
    readonly downloadsRemaining: number;
    readonly accessExpires: Date | undefined;
    readonly downloadUrl: string;
    readonly isExpired: boolean;
    readonly canDownload: boolean;
}

/**
 * Development/debugging configuration
 */
export declare interface DebugConfig {
    readonly enabled: boolean;
    readonly logLevel: LogLevel;
    readonly performanceMonitoring: boolean;
    readonly errorReporting: boolean;
    readonly apiLogging: boolean;
}

/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: Omit<ResolvedWooConfig, 'baseURL' | 'consumerKey' | 'consumerSecret'>;

/**
 * Download configuration
 */
declare interface DownloadConfig {
    readonly enabled: boolean;
    readonly maxDownloadsPerProduct: number;
    readonly defaultExpiryDays: number;
    readonly maxFileSize: number;
    readonly allowedFileTypes: readonly string[];
    readonly secureDownloads: boolean;
    readonly trackAnalytics: boolean;
    readonly rateLimiting: {
        readonly enabled: boolean;
        readonly maxDownloadsPerHour: number;
        readonly maxBandwidthPerHour: number;
    };
    readonly security: {
        readonly tokenExpiryMinutes: number;
        readonly ipValidation: boolean;
        readonly checksumValidation: boolean;
        readonly encryptFiles: boolean;
    };
    readonly storage: {
        readonly provider: 'local' | 'aws-s3' | 'google-cloud' | 'azure';
        readonly basePath: string;
        readonly secureBasePath: string;
        readonly cdnUrl?: string;
    };
}

/**
 * Download link interface
 */
declare interface DownloadLink {
    readonly downloadId: string;
    readonly customerId: number;
    readonly orderId: number;
    readonly productId: number;
    readonly downloadUrl: string;
    readonly accessToken: string;
    readonly expiresAt: Date;
    readonly downloadsRemaining: number;
    readonly fileSize: number;
    readonly fileName: string;
    readonly secureUrl: string;
}

/**
 * Download request interface
 */
declare interface DownloadRequest {
    readonly permissionId: string;
    readonly customerId: number;
    readonly ipAddress: string;
    readonly userAgent: string;
    readonly validateOwnership?: boolean;
}

/**
 * Download statistics
 */
declare interface DownloadStatistics {
    readonly totalDownloads: number;
    readonly totalBandwidth: number;
    readonly popularProducts: readonly {
        readonly productId: number;
        readonly productName: string;
        readonly downloadCount: number;
    }[];
    readonly downloadsByDate: readonly {
        readonly date: string;
        readonly count: number;
        readonly bandwidth: number;
    }[];
    readonly averageFileSize: number;
    readonly successRate: number;
}

/**
 * Email template configuration
 */
declare interface EmailTemplate {
    readonly type: 'welcome' | 'change_email' | 'resend';
    readonly subject: string;
    readonly htmlBody: string;
    readonly textBody: string;
    readonly fromEmail: string;
    readonly fromName: string;
}

/**
 * Email verification configuration
 */
declare interface EmailVerificationConfig {
    readonly enabled: boolean;
    readonly tokenExpiryMinutes: number;
    readonly maxAttemptsPerDay: number;
    readonly maxResendAttempts: number;
    readonly resendCooldownMinutes: number;
    readonly baseUrl: string;
    readonly verificationPath: string;
    readonly autoVerifyOnRegistration: boolean;
    readonly requireVerificationForPurchase: boolean;
    readonly emailService: {
        readonly provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'custom';
        readonly apiKey?: string;
        readonly apiUrl?: string;
        readonly fromEmail: string;
        readonly fromName: string;
    };
    readonly templates: {
        readonly welcome: EmailTemplate;
        readonly changeEmail: EmailTemplate;
        readonly resend: EmailTemplate;
    };
}

/**
 * Email verification confirmation request
 */
declare interface EmailVerificationConfirmRequest {
    readonly token: string;
    readonly userId?: number;
}

/**
 * Email verification confirmation response
 */
declare interface EmailVerificationConfirmResponse {
    readonly success: boolean;
    readonly userId: number;
    readonly email: string;
    readonly verifiedAt: Date;
    readonly message: string;
}

/**
 * Email verification request
 */
declare interface EmailVerificationRequest {
    readonly userId: number;
    readonly email: string;
    readonly templateType?: 'welcome' | 'change_email' | 'resend';
    readonly returnUrl?: string;
    readonly locale?: string;
}

/**
 * Email verification response
 */
declare interface EmailVerificationResponse {
    readonly success: boolean;
    readonly tokenId: string;
    readonly expiresAt: Date;
    readonly message: string;
}

/**
 * Email verification status
 */
declare interface EmailVerificationStatus {
    readonly userId: number;
    readonly email: string;
    readonly isVerified: boolean;
    readonly verificationDate?: Date;
    readonly pendingVerification: boolean;
    readonly lastTokenSent?: Date;
    readonly attemptsRemaining: number;
}

/**
 * Environment types
 */
export declare type Environment = 'development' | 'staging' | 'production';

/**
 * Create a failed result
 */
export declare function Err<E>(error: E): Failure<E>;

/**
 * Error factory for creating typed errors
 */
export declare class ErrorFactory {
    static networkError(message: string, details?: unknown, statusCode?: number): NetworkError;
    static authError(message: string, details?: unknown, statusCode?: number): AuthError;
    static validationError(message: string, details?: unknown): ValidationError;
    static apiError(message: string, statusCode: number, details?: unknown): ApiError;
    static rateLimitError(message: string, retryAfter?: number, details?: unknown): RateLimitError;
    static timeoutError(message: string, timeout: number, details?: unknown): TimeoutError;
    static configurationError(message: string, details?: unknown): ConfigurationError;
    static productNotFoundError(productId: number | string, details?: unknown): ProductNotFoundError;
    static cartError(message: string, details?: unknown): CartError;
    static checkoutError(message: string, details?: unknown): CheckoutError;
    static paymentError(message: string, details?: unknown, statusCode?: number): PaymentError;
    static cacheError(message: string, details?: unknown): CacheError;
    static notImplementedError(message: string, details?: unknown): ConfigurationError;
    static persistenceError(message: string, details?: unknown): CacheError;
}

/**
 * Error interceptor function type
 */
declare type ErrorInterceptor = (error: WooError) => WooError | Promise<WooError>;

export declare interface Failure<E> {
    readonly success: false;
    readonly error: E;
}

/**
 * Generic filter interface
 */
export declare interface Filter {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
}

/**
 * Filter operators for advanced search
 */
export declare type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith';

/**
 * Filter operators for advanced filtering
 */
declare type FilterOperator_2 = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith' | 'between' | 'exists' | 'empty';

/**
 * Multi-select filter option
 */
declare interface FilterOption {
    readonly value: string | number;
    readonly label: string;
    readonly count: number;
    readonly selected: boolean;
}

/**
 * Gender options
 */
export declare type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * HTTP Client class with comprehensive error handling
 */
export declare class HttpClient {
    private readonly config;
    private readonly baseURL;
    private readonly requestInterceptors;
    private readonly responseInterceptors;
    private readonly errorInterceptors;
    private readonly abortControllers;
    constructor(config: ResolvedWooConfig);
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    /**
     * Add error interceptor
     */
    addErrorInterceptor(interceptor: ErrorInterceptor): void;
    /**
     * Main request method with retry logic and error handling
     */
    request<T>(options: RequestOptions): Promise<Result<Response_2<T>, WooError>>;
    /**
     * GET request
     */
    get<T>(url: string, headers?: Record<string, string>): Promise<Result<Response_2<T>, WooError>>;
    /**
     * POST request
     */
    post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response_2<T>, WooError>>;
    /**
     * PUT request
     */
    put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response_2<T>, WooError>>;
    /**
     * PATCH request
     */
    patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response_2<T>, WooError>>;
    /**
     * DELETE request
     */
    delete<T>(url: string, headers?: Record<string, string>): Promise<Result<Response_2<T>, WooError>>;
    /**
     * Cancel request by ID
     */
    cancelRequest(requestId: string): void;
    /**
     * Cancel all pending requests
     */
    cancelAllRequests(): void;
    /**
     * Attempt request with retry logic
     */
    private attemptRequest;
    /**
     * Execute single request
     */
    private executeRequest;
    /**
     * Build full URL
     */
    private buildURL;
    /**
     * Build request headers
     */
    private buildHeaders;
    /**
     * Build request body
     */
    private buildBody;
    /**
     * Parse response based on content type
     */
    private parseResponse;
    /**
     * Extract headers from response
     */
    private extractHeaders;
    /**
     * Create error from HTTP response
     */
    private createErrorFromResponse;
    /**
     * Create error from exception
     */
    private createErrorFromException;
    /**
     * Check if error should trigger retry
     */
    private shouldRetry;
    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
}

/**
 * HTTP client configuration
 */
export declare interface HttpConfig {
    readonly timeout: number;
    readonly retries: number;
    readonly retryDelay: number;
    readonly maxRetryDelay: number;
    readonly retryCondition?: (error: unknown) => boolean;
    readonly headers?: Record<string, string>;
}

/**
 * HTTP methods enum
 */
declare type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Internationalization configuration
 */
export declare interface I18nConfig {
    readonly locale: string;
    readonly currency: string;
    readonly timezone: string;
    readonly dateFormat: string;
    readonly numberFormat: Intl.NumberFormatOptions;
}

/**
 * Image dimensions
 */
export declare interface ImageDimensions {
    readonly width: number;
    readonly height: number;
}

/**
 * IndexedDB cache implementation (L3)
 */
export declare class IndexedDBCache implements CacheStorage_2 {
    private readonly dbName;
    private readonly storeName;
    private readonly version;
    private db;
    constructor(dbName?: string);
    private initDB;
    get<T>(key: string): Promise<Result<T | null, WooError>>;
    set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>>;
    delete(key: string): Promise<Result<void, WooError>>;
    clear(): Promise<Result<void, WooError>>;
    has(key: string): Promise<Result<boolean, WooError>>;
    size(): Promise<Result<number, WooError>>;
}

/**
 * Check if result is failed
 */
export declare function isErr<T, E>(result: Result<T, E>): result is Failure<E>;

/**
 * Check if result is successful
 */
export declare function isOk<T, E>(result: Result<T, E>): result is Success<T>;

/**
 * Type guard for WooCommerceCoupon
 */
export declare function isWooCommerceCoupon(data: unknown): data is WooCommerceCoupon;

export declare function isWooCommerceOrder(data: unknown): data is WooCommerceOrder;

/**
 * Type guards
 */
export declare function isWooCommerceProduct(data: unknown): data is WooCommerceProduct;

/**
 * Type guard for WooError
 */
export declare function isWooError(error: unknown): error is WooError;

/**
 * JWT Authentication configuration
 */
export declare interface JWTConfig {
    readonly enabled: boolean;
    readonly secretKey?: string;
    readonly expiresIn: number;
    readonly autoRefresh: boolean;
    readonly refreshThreshold?: number;
}

/**
 * JWT Token interface
 */
declare interface JWTToken {
    readonly token: string;
    readonly refreshToken?: string;
    readonly expiresAt: Date;
    readonly issuedAt: Date;
}

/**
 * LocalStorage cache implementation (L2)
 */
export declare class LocalStorageCache implements CacheStorage_2 {
    private readonly prefix;
    private readonly maxSize;
    constructor(prefix?: string, maxSizeMB?: number);
    get<T>(key: string): Promise<Result<T | null, WooError>>;
    set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>>;
    delete(key: string): Promise<Result<void, WooError>>;
    clear(): Promise<Result<void, WooError>>;
    has(key: string): Promise<Result<boolean, WooError>>;
    size(): Promise<Result<number, WooError>>;
    private evictOldest;
}

/**
 * Log levels for debugging
 */
export declare type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

/**
 * Map successful result to new type
 */
export declare function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E>;

/**
 * Map error to new type
 */
export declare function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;

/**
 * Memory cache implementation (L1)
 */
export declare class MemoryCache implements CacheStorage_2 {
    private readonly cache;
    private readonly maxSize;
    constructor(maxSizeMB?: number);
    get<T>(key: string): Promise<Result<T | null, WooError>>;
    set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>>;
    delete(key: string): Promise<Result<void, WooError>>;
    clear(): Promise<Result<void, WooError>>;
    has(key: string): Promise<Result<boolean, WooError>>;
    size(): Promise<Result<number, WooError>>;
    private estimateSize;
    private evictIfNeeded;
}

/**
 * Meta data interface
 */
export declare interface MetaData {
    readonly id: number;
    readonly key: string;
    readonly value: string;
}

/**
 * Network-related errors
 */
export declare class NetworkError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "NETWORK_ERROR";
    readonly timestamp: Date;
    readonly retryable = true;
    readonly statusCode?: number;
    constructor(message: string, details?: unknown | undefined, statusCode?: number);
}

/**
 * Create a successful result
 */
export declare function Ok<T>(data: T): Success<T>;

/**
 * Complete order information
 */
declare interface Order {
    readonly id: number;
    readonly number: string;
    readonly status: OrderStatus_2;
    readonly currency: string;
    readonly dateCreated: Date;
    readonly dateModified: Date;
    readonly total: number;
    readonly subtotal: number;
    readonly totalTax: number;
    readonly shippingTotal: number;
    readonly shippingTax: number;
    readonly discountTotal: number;
    readonly discountTax: number;
    readonly feeTotal: number;
    readonly feeTax: number;
    readonly customerId: number;
    readonly customerNote?: string;
    readonly billingAddress: BillingAddress_2;
    readonly shippingAddress: ShippingAddress_2;
    readonly paymentMethod: string;
    readonly paymentMethodTitle: string;
    readonly shippingMethod: string;
    readonly shippingMethodTitle: string;
    readonly lineItems: readonly OrderLineItem_2[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly completedAt?: Date;
}

/**
 * Order confirmation request
 */
declare interface OrderConfirmationRequest {
    readonly orderId: string;
    readonly paymentId?: string;
    readonly transactionId?: string;
    readonly paymentStatus?: 'completed' | 'failed' | 'pending';
}

/**
 * Order creation response
 */
declare interface OrderCreateResponse {
    readonly order: Order;
    readonly requiresPayment: boolean;
    readonly paymentUrl?: string;
    readonly confirmationUrl: string;
}

/**
 * Order line item interface
 */
export declare interface OrderLineItem {
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
 * Order line item
 */
declare interface OrderLineItem_2 {
    readonly id: number;
    readonly productId: number;
    readonly variationId?: number;
    readonly name: string;
    readonly quantity: number;
    readonly price: number;
    readonly total: number;
    readonly subtotal: number;
    readonly totalTax: number;
    readonly subtotalTax: number;
    readonly sku?: string;
    readonly meta: readonly {
        readonly key: string;
        readonly value: string;
    }[];
}

/**
 * Order processing configuration
 */
declare interface OrderProcessingConfig {
    readonly autoUpdateInventory: boolean;
    readonly sendConfirmationEmail: boolean;
    readonly requirePaymentConfirmation: boolean;
    readonly orderNumberPrefix: string;
    readonly orderNumberSuffix?: string;
    readonly defaultStatus: OrderStatus_2;
    readonly inventoryHoldMinutes: number;
    readonly cacheTimeout: number;
}

export declare const OrderSchema: z.ZodObject<{
    id: z.ZodNumber;
    status: z.ZodEnum<["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed", "trash"]>;
    currency: z.ZodString;
    total: z.ZodString;
    customer_id: z.ZodNumber;
    billing: z.ZodObject<{
        first_name: z.ZodString;
        last_name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    }, {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    }>;
    line_items: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        product_id: z.ZodNumber;
        quantity: z.ZodNumber;
        total: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        total: string;
        product_id: number;
        quantity: number;
    }, {
        id: number;
        name: string;
        total: string;
        product_id: number;
        quantity: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: number;
    status: "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "trash";
    currency: string;
    total: string;
    customer_id: number;
    billing: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    line_items: {
        id: number;
        name: string;
        total: string;
        product_id: number;
        quantity: number;
    }[];
}, {
    id: number;
    status: "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "trash";
    currency: string;
    total: string;
    customer_id: number;
    billing: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    line_items: {
        id: number;
        name: string;
        total: string;
        product_id: number;
        quantity: number;
    }[];
}>;

/**
 * Order search criteria
 */
declare interface OrderSearchCriteria {
    readonly status?: OrderStatus_2;
    readonly customerId?: string;
    readonly customerEmail?: string;
    readonly dateFrom?: Date;
    readonly dateTo?: Date;
    readonly minAmount?: number;
    readonly maxAmount?: number;
    readonly paymentMethod?: string;
    readonly limit?: number;
    readonly offset?: number;
}

/**
 * Order status enumeration
 */
export declare type OrderStatus = 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash';

/**
 * Order status types
 */
declare type OrderStatus_2 = 'pending' | 'processing' | 'on_hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'draft';

/**
 * Order totals breakdown
 */
declare interface OrderTotals {
    readonly subtotal: number;
    readonly tax: number;
    readonly shipping: number;
    readonly shippingTax: number;
    readonly discount: number;
    readonly fees: number;
    readonly feesTax: number;
    readonly total: number;
    readonly currency: string;
}

/**
 * Pagination configuration
 */
export declare interface PaginationConfig {
    readonly page: number;
    readonly limit: number;
    readonly offset?: number;
}

/**
 * Payment service configuration
 */
declare interface PaymentConfig {
    readonly enabled: boolean;
    readonly testMode: boolean;
    readonly supportedMethods: readonly PaymentMethodType[];
    readonly minimumAmount: number;
    readonly maximumAmount?: number;
    readonly currency: string;
    readonly returnUrl: string;
    readonly cancelUrl: string;
    readonly webhookUrl?: string;
    readonly cacheTimeout: number;
}

/**
 * Payment processing errors
 */
export declare class PaymentError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "PAYMENT_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    readonly statusCode?: number;
    constructor(message: string, details?: unknown | undefined, statusCode?: number);
}

/**
 * Payment method configuration
 */
declare interface PaymentMethod {
    readonly id: string;
    readonly type: PaymentMethodType;
    readonly title: string;
    readonly description: string;
    readonly enabled: boolean;
    readonly testMode: boolean;
    readonly settings: Record<string, unknown>;
    readonly supportedCountries?: readonly string[];
    readonly supportedCurrencies?: readonly string[];
    readonly minimumAmount?: number;
    readonly maximumAmount?: number;
    readonly icon?: string;
    readonly acceptedCards?: readonly string[];
}

/**
 * Payment method types
 */
declare type PaymentMethodType = 'credit_card' | 'stripe' | 'stripe_checkout' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer' | 'cash_on_delivery' | 'check';

/**
 * Price range for variable products
 */
export declare interface PriceRange {
    readonly min: string;
    readonly max: string;
}

/**
 * Product attribute interface
 */
export declare interface ProductAttribute {
    readonly id: number;
    readonly name: string;
    readonly position: number;
    readonly visible: boolean;
    readonly variation: boolean;
    readonly options: readonly string[];
}

/**
 * Product catalog visibility
 */
export declare type ProductCatalogVisibility = 'visible' | 'catalog' | 'search' | 'hidden';

/**
 * Product category interface
 */
export declare interface ProductCategory {
    readonly id: number;
    readonly name: string;
    readonly slug: string;
}

/**
 * Product dimensions
 */
export declare interface ProductDimensions {
    readonly length: string;
    readonly width: string;
    readonly height: string;
}

/**
 * Product image interface
 */
export declare interface ProductImage {
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
 * Product list parameters
 */
export declare interface ProductListParams {
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly category?: number | string;
    readonly tag?: number | string;
    readonly status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
    readonly featured?: boolean;
    readonly inStock?: boolean;
    readonly onSale?: boolean;
    readonly minPrice?: number;
    readonly maxPrice?: number;
    readonly orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
    readonly order?: 'asc' | 'desc';
    readonly include?: number[];
    readonly exclude?: number[];
    readonly parent?: number[];
    readonly offset?: number;
}

/**
 * Product list response with pagination metadata
 */
export declare interface ProductListResponse {
    readonly products: readonly WooCommerceProduct[];
    readonly totalProducts: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly perPage: number;
}

/**
 * Product-specific errors
 */
export declare class ProductNotFoundError extends Error implements WooError {
    readonly productId: number | string;
    readonly details?: unknown | undefined;
    readonly code: "PRODUCT_NOT_FOUND";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(productId: number | string, details?: unknown | undefined);
}

/**
 * Review and Rating system types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */
/**
 * Product review interface
 */
export declare interface ProductReview {
    readonly id: number;
    readonly date_created: string;
    readonly date_created_gmt: string;
    readonly product_id: number;
    readonly status: ReviewStatus;
    readonly reviewer: string;
    readonly reviewer_email: string;
    readonly review: string;
    readonly rating: number;
    readonly verified: boolean;
    readonly reviewer_avatar_urls: {
        readonly '24': string;
        readonly '48': string;
        readonly '96': string;
    };
    readonly helpful_votes: number;
    readonly total_votes: number;
    readonly images?: readonly ReviewImage[];
    readonly parent_id?: number;
    readonly replies?: readonly ProductReview[];
    readonly flagged?: boolean;
}

/**
 * Zod schemas for validation
 */
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    slug: z.ZodString;
    status: z.ZodEnum<["draft", "pending", "private", "publish"]>;
    featured: z.ZodBoolean;
    catalog_visibility: z.ZodEnum<["visible", "catalog", "search", "hidden"]>;
    description: z.ZodString;
    short_description: z.ZodString;
    price: z.ZodString;
    regular_price: z.ZodString;
    sale_price: z.ZodString;
    on_sale: z.ZodBoolean;
    stock_status: z.ZodEnum<["instock", "outofstock", "onbackorder"]>;
    manage_stock: z.ZodBoolean;
    stock_quantity: z.ZodOptional<z.ZodNumber>;
    categories: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        slug: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        slug: string;
    }, {
        id: number;
        name: string;
        slug: string;
    }>, "many">;
    images: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        src: z.ZodString;
        name: z.ZodString;
        alt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        src: string;
        alt: string;
    }, {
        id: number;
        name: string;
        src: string;
        alt: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: number;
    name: string;
    slug: string;
    status: "draft" | "pending" | "private" | "publish";
    featured: boolean;
    catalog_visibility: "visible" | "catalog" | "search" | "hidden";
    description: string;
    short_description: string;
    price: string;
    regular_price: string;
    sale_price: string;
    on_sale: boolean;
    stock_status: "instock" | "outofstock" | "onbackorder";
    manage_stock: boolean;
    categories: {
        id: number;
        name: string;
        slug: string;
    }[];
    images: {
        id: number;
        name: string;
        src: string;
        alt: string;
    }[];
    stock_quantity?: number | undefined;
}, {
    id: number;
    name: string;
    slug: string;
    status: "draft" | "pending" | "private" | "publish";
    featured: boolean;
    catalog_visibility: "visible" | "catalog" | "search" | "hidden";
    description: string;
    short_description: string;
    price: string;
    regular_price: string;
    sale_price: string;
    on_sale: boolean;
    stock_status: "instock" | "outofstock" | "onbackorder";
    manage_stock: boolean;
    categories: {
        id: number;
        name: string;
        slug: string;
    }[];
    images: {
        id: number;
        name: string;
        src: string;
        alt: string;
    }[];
    stock_quantity?: number | undefined;
}>;

/**
 * Product service class
 */
export declare class ProductService {
    private readonly client;
    private readonly cache;
    constructor(client: HttpClient, cache: CacheManager);
    /**
     * List products with filtering and pagination
     */
    list(params?: ProductListParams): Promise<Result<ProductListResponse, WooError>>;
    /**
     * Get a single product by ID
     */
    get(productId: number): Promise<Result<WooCommerceProduct, WooError>>;
    /**
     * Get product by slug
     */
    getBySlug(slug: string): Promise<Result<WooCommerceProduct, WooError>>;
    /**
     * Get product variations
     */
    getVariations(productId: number, params?: VariationListParams): Promise<Result<ProductVariation[], WooError>>;
    /**
     * Search products by keyword
     */
    search(query: string, params?: Omit<ProductListParams, 'search'>): Promise<Result<ProductListResponse, WooError>>;
    /**
     * Get products by category
     */
    getByCategory(categoryId: number | string, params?: Omit<ProductListParams, 'category'>): Promise<Result<ProductListResponse, WooError>>;
    /**
     * Get featured products
     */
    getFeatured(params?: Omit<ProductListParams, 'featured'>): Promise<Result<ProductListResponse, WooError>>;
    /**
     * Get on-sale products
     */
    getOnSale(params?: Omit<ProductListParams, 'onSale'>): Promise<Result<ProductListResponse, WooError>>;
    /**
     * Validate list parameters
     */
    private validateListParams;
    /**
     * Build query parameters for product list
     */
    private buildQueryParams;
    /**
     * Build query parameters for variation list
     */
    private buildVariationQueryParams;
}

/**
 * Product status enumeration
 */
export declare type ProductStatus = 'draft' | 'pending' | 'private' | 'publish';

/**
 * Product tag interface
 */
export declare interface ProductTag {
    readonly id: number;
    readonly name: string;
    readonly slug: string;
}

/**
 * Product type enumeration
 */
export declare type ProductType = 'simple' | 'grouped' | 'external' | 'variable';

/**
 * Product variation interface
 */
export declare interface ProductVariation {
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
 * Quick search parameters for simple searches
 */
export declare interface QuickSearchParams {
    readonly query?: string;
    readonly category?: number;
    readonly minPrice?: number;
    readonly maxPrice?: number;
    readonly inStock?: boolean;
    readonly onSale?: boolean;
    readonly featured?: boolean;
    readonly page?: number;
    readonly limit?: number;
    readonly sort?: string;
}

/**
 * Range filter for numeric/date values
 */
declare interface RangeFilter {
    readonly field: string;
    readonly min?: number | string;
    readonly max?: number | string;
    readonly label?: string;
}

/**
 * Rate limiting errors
 */
export declare class RateLimitError extends Error implements WooError {
    readonly retryAfter?: number | undefined;
    readonly details?: unknown | undefined;
    readonly code: "RATE_LIMIT_ERROR";
    readonly timestamp: Date;
    readonly retryable = true;
    constructor(message: string, retryAfter?: number | undefined, details?: unknown | undefined);
}

/**
 * Rating distribution analytics
 */
export declare interface RatingDistribution {
    readonly 1: number;
    readonly 2: number;
    readonly 3: number;
    readonly 4: number;
    readonly 5: number;
    readonly total: number;
    readonly average: number;
    readonly percentage: {
        readonly 1: number;
        readonly 2: number;
        readonly 3: number;
        readonly 4: number;
        readonly 5: number;
    };
}

/**
 * Request interceptor function type
 */
declare type RequestInterceptor = (options: RequestOptions) => RequestOptions | Promise<RequestOptions>;

/**
 * Request options interface
 */
declare interface RequestOptions {
    readonly method: HttpMethod;
    readonly url: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
    readonly timeout?: number;
    readonly retries?: number;
}

/**
 * Resolved configuration with defaults applied
 */
export declare interface ResolvedWooConfig {
    readonly baseURL: string;
    readonly consumerKey: string;
    readonly consumerSecret: string;
    readonly version: string;
    readonly environment: Environment;
    readonly cache: CacheConfig;
    readonly auth: JWTConfig;
    readonly http: HttpConfig;
    readonly search: SearchConfig;
    readonly advancedSearch: AdvancedSearchConfig;
    readonly analytics: AnalyticsConfig;
    readonly i18n: I18nConfig;
    readonly debug: DebugConfig;
    readonly cart: CartConfig;
    readonly userSync: UserSyncConfig;
    readonly checkout: CheckoutConfig;
}

/**
 * Response interface
 */
declare interface Response_2<T> {
    readonly data: T;
    readonly status: number;
    readonly statusText: string;
    readonly headers: Record<string, string>;
}

/**
 * Response interceptor function type
 */
declare type ResponseInterceptor = <T>(response: Response_2<T>) => Response_2<T> | Promise<Response_2<T>>;

export declare type Result<T, E> = Success<T> | Failure<E>;

/**
 * Review statistics for analytics
 */
export declare interface ReviewAnalytics {
    readonly productId: number;
    readonly totalReviews: number;
    readonly averageRating: number;
    readonly ratingDistribution: RatingDistribution;
    readonly verifiedPurchaseRatio: number;
    readonly responseRate: number;
    readonly helpfulnessRatio: number;
    readonly recentTrend: {
        readonly period: string;
        readonly averageRating: number;
        readonly reviewCount: number;
        readonly ratingChange: number;
    };
    readonly topKeywords: readonly {
        readonly keyword: string;
        readonly count: number;
        readonly sentiment: 'positive' | 'negative' | 'neutral';
    }[];
}

/**
 * Review export options
 */
export declare interface ReviewExportOptions {
    readonly format: 'json' | 'csv' | 'xlsx';
    readonly filters?: ReviewListParams;
    readonly fields?: readonly string[];
    readonly includeImages: boolean;
    readonly includeReplies: boolean;
    readonly dateRange?: {
        readonly from: string;
        readonly to: string;
    };
}

/**
 * Review filter options for advanced filtering
 */
export declare interface ReviewFilter {
    readonly field: 'rating' | 'verified' | 'helpful_votes' | 'date' | 'reviewer';
    readonly operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
    readonly value: string | number | boolean | readonly (string | number)[];
}

/**
 * Review image attachment
 */
export declare interface ReviewImage {
    readonly id: string;
    readonly url: string;
    readonly alt: string;
    readonly filename: string;
    readonly mime_type: string;
    readonly file_size: number;
    readonly uploaded_at: string;
}

/**
 * Review import options
 */
export declare interface ReviewImportOptions {
    readonly format: 'json' | 'csv';
    readonly validateBeforeImport: boolean;
    readonly skipDuplicates: boolean;
    readonly defaultStatus: ReviewStatus;
    readonly batchSize: number;
}

/**
 * Review list parameters
 */
export declare interface ReviewListParams {
    readonly page?: number;
    readonly limit?: number;
    readonly product?: number | number[];
    readonly status?: ReviewStatus | ReviewStatus[];
    readonly reviewer?: string;
    readonly reviewer_email?: string;
    readonly reviewer_exclude?: string[];
    readonly rating?: number | number[];
    readonly verified?: boolean;
    readonly after?: string;
    readonly before?: string;
    readonly search?: string;
    readonly orderby?: 'date' | 'date_gmt' | 'id' | 'rating' | 'helpful_votes';
    readonly order?: 'asc' | 'desc';
    readonly include?: number[];
    readonly exclude?: number[];
    readonly parent?: number;
    readonly offset?: number;
}

/**
 * Review list response with pagination
 */
export declare interface ReviewListResponse {
    readonly reviews: readonly ProductReview[];
    readonly totalReviews: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly perPage: number;
    readonly averageRating: number;
    readonly ratingDistribution: RatingDistribution;
}

/**
 * Review moderation interface
 */
export declare interface ReviewModeration {
    readonly review_id: number;
    readonly action: 'approve' | 'hold' | 'spam' | 'trash';
    readonly reason?: string;
    readonly moderator_id?: number;
    readonly moderated_at: string;
    readonly automated: boolean;
}

/**
 * Review notification settings
 */
export declare interface ReviewNotificationSettings {
    readonly newReviewNotification: boolean;
    readonly replyNotification: boolean;
    readonly helpfulVoteNotification: boolean;
    readonly moderationNotification: boolean;
    readonly emailTemplate?: string;
    readonly webhookUrl?: string;
}

/**
 * Review submission rate limiting
 */
export declare interface ReviewRateLimit {
    readonly maxReviewsPerHour: number;
    readonly maxReviewsPerDay: number;
    readonly cooldownPeriod: number;
    readonly skipLimitForVerified: boolean;
}

/**
 * Review search configuration
 */
export declare interface ReviewSearchConfig {
    readonly query?: string;
    readonly filters?: readonly ReviewFilter[];
    readonly sort?: readonly ReviewSort[];
    readonly pagination: {
        readonly page: number;
        readonly limit: number;
    };
    readonly includeReplies?: boolean;
    readonly includeImages?: boolean;
    readonly includeAnalytics?: boolean;
}

/**
 * Review service class with comprehensive functionality
 */
export declare class ReviewService {
    private readonly client;
    private readonly cache;
    private readonly rateLimitStore;
    constructor(client: HttpClient, cache: CacheManager);
    /**
     * List reviews with advanced filtering and pagination
     */
    list(params?: ReviewListParams): Promise<Result<ReviewListResponse, WooError>>;
    /**
     * Get a single review by ID
     */
    get(reviewId: number): Promise<Result<ProductReview, WooError>>;
    /**
     * Create a new review with validation and rate limiting
     */
    create(reviewData: CreateReviewRequest): Promise<Result<ProductReview, WooError>>;
    /**
     * Update an existing review
     */
    update(reviewId: number, updateData: UpdateReviewRequest): Promise<Result<ProductReview, WooError>>;
    /**
     * Delete a review
     */
    delete(reviewId: number, force?: boolean): Promise<Result<boolean, WooError>>;
    /**
     * Get reviews for a specific product with analytics
     */
    getProductReviews(productId: number, params?: Omit<ReviewListParams, 'product'>): Promise<Result<ReviewListResponse, WooError>>;
    /**
     * Get review analytics for a product
     */
    getAnalytics(productId: number, period?: string): Promise<Result<ReviewAnalytics, WooError>>;
    /**
     * Vote on review helpfulness
     */
    voteHelpful(reviewId: number, voteType: 'helpful' | 'not_helpful', userEmail?: string): Promise<Result<ReviewVote, WooError>>;
    /**
     * Moderate a review (approve, hold, spam, trash)
     */
    moderate(reviewId: number, action: ReviewStatus, reason?: string): Promise<Result<ReviewModeration, WooError>>;
    /**
     * Search reviews with advanced filtering
     */
    search(config: ReviewSearchConfig): Promise<Result<ReviewListResponse, WooError>>;
    private validateListParams;
    private buildQueryParams;
    private calculateRatingDistribution;
    private validateReview;
    private checkRateLimit;
    private updateRateLimit;
    private sanitizeContent;
    private calculateSpamScore;
    private containsProfanity;
    private processReviewImages;
    private attachImagesToReview;
    private updateReviewImages;
    private invalidateReviewCaches;
    private trackReviewEvent;
    private getUserVote;
    private getPreviousPeriodData;
    private extractTopKeywords;
    private applyFilterToParams;
}

/**
 * Review sorting options
 */
export declare interface ReviewSort {
    readonly field: 'date' | 'rating' | 'helpful_votes' | 'verified';
    readonly direction: 'asc' | 'desc';
}

/**
 * Review status enumeration
 */
export declare type ReviewStatus = 'approved' | 'hold' | 'spam' | 'unspam' | 'trash' | 'untrash';

/**
 * Review validation result
 */
export declare interface ReviewValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
    readonly canSubmit: boolean;
    readonly requiresModeration: boolean;
    readonly spamScore?: number;
}

/**
 * Review helpful vote interface
 */
export declare interface ReviewVote {
    readonly review_id: number;
    readonly user_id?: number;
    readonly user_email?: string;
    readonly vote_type: 'helpful' | 'not_helpful';
    readonly voted_at: string;
    readonly ip_address?: string;
}

/**
 * Search aggregation result
 */
export declare interface SearchAggregation {
    readonly field: string;
    readonly type: 'terms' | 'stats' | 'histogram';
    readonly buckets?: readonly {
        readonly key: string | number;
        readonly count: number;
        readonly selected: boolean;
    }[];
    readonly stats?: {
        readonly min: number;
        readonly max: number;
        readonly avg: number;
        readonly count: number;
    };
}

/**
 * Search analytics event
 */
export declare interface SearchAnalyticsEvent {
    readonly type: 'search' | 'filter' | 'sort' | 'paginate' | 'suggestion_click' | 'result_click';
    readonly query: string | undefined;
    readonly filters?: readonly SearchFilter[];
    readonly resultPosition?: number;
    readonly productId?: number;
    readonly timestamp: Date;
    readonly sessionId: string;
    readonly userId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Search configuration
 */
export declare interface SearchConfig {
    readonly fuzzyThreshold: number;
    readonly maxResults: number;
    readonly enableHighlight: boolean;
    readonly enableSuggestions: boolean;
    readonly cacheResults: boolean;
    readonly enableAnalytics: boolean;
}

/**
 * Facet definition for filtering
 */
export declare interface SearchFacet {
    readonly field: string;
    readonly label: string;
    readonly type: 'terms' | 'range' | 'date_range' | 'boolean';
    readonly options: readonly FilterOption[];
    readonly multiSelect: boolean;
    readonly collapsed: boolean;
}

/**
 * Single search filter
 */
export declare interface SearchFilter {
    readonly field: string;
    readonly operator: FilterOperator_2;
    readonly value: unknown;
    readonly label?: string;
}

/**
 * Search result highlight
 */
declare interface SearchHighlight {
    readonly field: string;
    readonly matches: readonly {
        readonly text: string;
        readonly indices: readonly [number, number][];
    }[];
}

/**
 * Search history entry
 */
export declare interface SearchHistoryEntry {
    readonly query: string;
    readonly timestamp: Date;
    readonly resultCount: number;
    readonly clickedResults: readonly number[];
    readonly conversions: readonly number[];
}

/**
 * Search operators for query building
 */
export declare type SearchOperator = 'AND' | 'OR' | 'NOT';

/**
 * Search operators configuration
 */
export declare interface SearchOperators {
    readonly logic: 'AND' | 'OR' | 'NOT';
    readonly fuzzy: boolean;
    readonly stemming: boolean;
    readonly synonyms: boolean;
}

/**
 * Search pagination
 */
export declare interface SearchPagination {
    readonly page: number;
    readonly limit: number;
    readonly offset: number;
    readonly total: number;
    readonly totalPages: number;
}

/**
 * Search query configuration
 */
export declare interface SearchQuery {
    readonly text: string | undefined;
    readonly filters: readonly SearchFilter[];
    readonly rangeFilters: readonly RangeFilter[];
    readonly categoryIds?: readonly number[];
    readonly tagIds?: readonly number[];
    readonly productIds?: readonly number[];
    readonly excludeProductIds?: readonly number[];
    readonly inStock: boolean | undefined;
    readonly onSale: boolean | undefined;
    readonly featured: boolean | undefined;
    readonly minPrice: number | undefined;
    readonly maxPrice: number | undefined;
    readonly minRating: number | undefined;
    readonly attributes?: Record<string, string | string[]>;
    readonly sort: readonly SearchSort[];
    readonly pagination: SearchPagination;
    readonly operator: SearchOperator;
    readonly fuzzy: boolean;
    readonly highlight: boolean;
    readonly facets: boolean;
    readonly suggestions: boolean;
}

/**
 * Search builder for constructing complex queries
 */
export declare interface SearchQueryBuilder {
    text(query: string): SearchQueryBuilder;
    filter(field: string, operator: FilterOperator_2, value: unknown): SearchQueryBuilder;
    range(field: string, min?: number, max?: number): SearchQueryBuilder;
    category(categoryId: number | number[]): SearchQueryBuilder;
    tag(tagId: number | number[]): SearchQueryBuilder;
    price(min?: number, max?: number): SearchQueryBuilder;
    rating(min: number): SearchQueryBuilder;
    inStock(inStock?: boolean): SearchQueryBuilder;
    onSale(onSale?: boolean): SearchQueryBuilder;
    featured(featured?: boolean): SearchQueryBuilder;
    attribute(name: string, value: string | string[]): SearchQueryBuilder;
    sort(field: string, direction?: SortDirection): SearchQueryBuilder;
    page(page: number): SearchQueryBuilder;
    limit(limit: number): SearchQueryBuilder;
    fuzzy(enabled?: boolean): SearchQueryBuilder;
    highlight(enabled?: boolean): SearchQueryBuilder;
    facets(enabled?: boolean): SearchQueryBuilder;
    suggestions(enabled?: boolean): SearchQueryBuilder;
    build(): SearchQuery;
    reset(): SearchQueryBuilder;
}

/**
 * Search result item
 */
export declare interface SearchResultItem {
    readonly item: WooCommerceProduct;
    readonly score: number;
    readonly highlights?: readonly SearchHighlight[];
    readonly matchedFields: readonly string[];
}

/**
 * Search results
 */
export declare interface SearchResults {
    readonly query: SearchQuery;
    readonly items: readonly SearchResultItem[];
    readonly aggregations: readonly SearchAggregation[];
    readonly facets: readonly SearchFacet[];
    readonly suggestions: readonly SearchSuggestion[];
    readonly pagination: SearchPagination;
    readonly processingTime: number;
    readonly totalHits: number;
    readonly maxScore: number;
    readonly debug?: {
        readonly parsedQuery: Record<string, unknown>;
        readonly executionStats: Record<string, unknown>;
    };
}

/**
 * Main advanced search service
 */
export declare class SearchService {
    private readonly client;
    private readonly cache;
    private readonly config;
    private readonly analytics;
    private fuseInstance;
    private productsIndex;
    constructor(client: HttpClient, cache: CacheManager, config: AdvancedSearchConfig);
    /**
     * Initialize Fuse.js search index
     */
    private initializeFuseInstance;
    /**
     * Create Fuse.js instance with configuration
     */
    private createFuseInstance;
    /**
     * Refresh search index with latest products
     */
    refreshSearchIndex(): Promise<Result<void, WooError>>;
    /**
     * Quick search with simple parameters
     */
    quickSearch(params: QuickSearchParams): Promise<Result<SearchResults, WooError>>;
    /**
     * Advanced search with full query object
     */
    search(query: SearchQuery): Promise<Result<SearchResults, WooError>>;
    /**
     * Auto-complete suggestions
     */
    autoComplete(request: AutoCompleteRequest): Promise<Result<AutoCompleteResponse, WooError>>;
    /**
     * Create query builder
     */
    createQueryBuilder(): SearchQueryBuilder;
    /**
     * Get search analytics
     */
    getSearchHistory(limit?: number): Promise<Result<SearchHistoryEntry[], WooError>>;
    /**
     * Track search result click
     */
    trackResultClick(productId: number, position: number, query?: string): Promise<Result<void, WooError>>;
    private validateSearchQuery;
    private generateCacheKey;
    private extractHighlights;
    private extractMatchedFields;
    private applyFilters;
    private applyCustomFilter;
    private applyRangeFilter;
    private applySorting;
    private applyPagination;
    private generateFacets;
    private generateAggregations;
    private generateSuggestions;
}

/**
 * Search sorting configuration
 */
declare interface SearchSort {
    readonly field: string;
    readonly direction: SortDirection;
    readonly label?: string;
}

/**
 * Search suggestion
 */
export declare interface SearchSuggestion {
    readonly text: string;
    readonly type: 'query' | 'product' | 'category' | 'brand';
    readonly score: number;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Shipping method selection
 */
declare interface SelectedShippingMethod {
    readonly zoneId: string;
    readonly methodId: string;
    readonly rate: ShippingRate;
    readonly title: string;
    readonly cost: number;
}

/**
 * Shipping address interface
 */
export declare interface ShippingAddress {
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
 * Shipping address (email optional)
 */
declare interface ShippingAddress_2 extends BaseAddress {
}

/**
 * Shipping calculation for order totals
 */
declare interface ShippingCalculation {
    readonly selectedMethod: SelectedShippingMethod;
    readonly shippingCost: number;
    readonly shippingTax: number;
    readonly estimatedDelivery?: string;
    readonly trackingAvailable: boolean;
}

/**
 * Shipping service configuration
 */
declare interface ShippingConfig {
    readonly enabled: boolean;
    readonly calculateTax: boolean;
    readonly freeShippingThreshold?: number;
    readonly defaultCountry: string;
    readonly restrictedCountries: readonly string[];
    readonly cacheTimeout: number;
}

/**
 * Shipping method option
 */
export declare interface ShippingMethod {
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
 * Shipping method types
 */
declare type ShippingMethodType = 'flat_rate' | 'free_shipping' | 'local_pickup' | 'table_rate' | 'expedited' | 'overnight';

/**
 * Shipping rate calculation
 */
declare interface ShippingRate {
    readonly id: string;
    readonly method: ShippingMethodType;
    readonly title: string;
    readonly description: string;
    readonly cost: number;
    readonly taxable: boolean;
    readonly estimatedDelivery?: string;
    readonly trackingAvailable: boolean;
}

/**
 * Shipping rate response from backend
 */
declare interface ShippingRateResponse {
    readonly rates: readonly ShippingRate[];
    readonly zones: readonly ShippingZone[];
    readonly defaultRate?: ShippingRate;
    readonly freeShippingThreshold?: number;
    readonly estimatedDelivery?: {
        readonly minDays: number;
        readonly maxDays: number;
    };
}

/**
 * Shipping zone configuration
 */
declare interface ShippingZone {
    readonly id: string;
    readonly name: string;
    readonly countries: readonly string[];
    readonly states: readonly string[];
    readonly postcodes: readonly string[];
    readonly methods: readonly ShippingRate[];
}

/**
 * Sorting configuration
 */
export declare interface SortConfig {
    readonly field: string;
    readonly direction: 'asc' | 'desc';
}

/**
 * Sort direction
 */
export declare type SortDirection = 'asc' | 'desc';

/**
 * Step transition result
 */
declare interface StepTransitionResult {
    readonly success: boolean;
    readonly newStep: number;
    readonly previousStep: number;
    readonly validationResult?: CheckoutValidationResult;
    readonly errors: readonly string[];
    readonly blockers: readonly string[];
}

/**
 * Result type for comprehensive error handling
 * Following the enhanced unified-10x-dev framework
 */
export declare interface Success<T> {
    readonly success: true;
    readonly data: T;
}

/**
 * Timeout errors
 */
export declare class TimeoutError extends Error implements WooError {
    readonly timeout: number;
    readonly details?: unknown | undefined;
    readonly code: "TIMEOUT_ERROR";
    readonly timestamp: Date;
    readonly retryable = true;
    constructor(message: string, timeout: number, details?: unknown | undefined);
}

/**
 * Storage interface for tokens
 */
declare interface TokenStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}

/**
 * Get data from successful result or throw
 */
export declare function unwrap<T, E>(result: Result<T, E>): T;

/**
 * Get error from failed result or throw
 */
export declare function unwrapErr<T, E>(result: Result<T, E>): E;

/**
 * Get data from successful result or return default
 */
export declare function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;

/**
 * Review update interface
 */
export declare interface UpdateReviewRequest {
    readonly review?: string;
    readonly rating?: number;
    readonly status?: ReviewStatus;
    readonly images?: readonly ReviewImage[];
}

/**
 * User activity log entry
 */
export declare interface UserActivity {
    readonly id: string;
    readonly userId: number;
    readonly type: 'login' | 'logout' | 'order' | 'review' | 'wishlist' | 'profile_update' | 'address_update';
    readonly description: string;
    readonly metadata?: Record<string, unknown>;
    readonly ipAddress?: string;
    readonly userAgent?: string;
    readonly timestamp: string;
}

/**
 * User address information
 */
export declare interface UserAddress {
    readonly type: AddressType;
    readonly firstName: string;
    readonly lastName: string;
    readonly company?: string;
    readonly address1: string;
    readonly address2?: string;
    readonly city: string;
    readonly state: string;
    readonly postcode: string;
    readonly country: string;
    readonly phone?: string;
    readonly email?: string;
    readonly isDefault: boolean;
}

/**
 * User authentication context (from external auth system)
 */
export declare interface UserAuthContext {
    readonly userId: number;
    readonly externalUserId?: string;
    readonly email: string;
    readonly isAuthenticated: boolean;
    readonly accessToken?: string;
    readonly refreshToken?: string;
    readonly tokenExpiry?: string;
    readonly permissions?: readonly string[];
    readonly sessionId?: string;
}

/**
 * User query parameters for fetching user lists
 */
export declare interface UserListParams {
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly role?: UserRole;
    readonly status?: UserStatus;
    readonly orderBy?: 'id' | 'username' | 'email' | 'registered' | 'display_name';
    readonly order?: 'asc' | 'desc';
    readonly include?: readonly number[];
    readonly exclude?: readonly number[];
}

/**
 * User list response
 */
export declare interface UserListResponse {
    readonly users: readonly UserProfile[];
    readonly total: number;
    readonly pages: number;
    readonly page: number;
    readonly limit: number;
}

/**
 * User's order summary
 */
export declare interface UserOrderSummary {
    readonly id: number;
    readonly orderNumber: string;
    readonly status: string;
    readonly currency: string;
    readonly total: string;
    readonly totalTax: string;
    readonly subtotal: string;
    readonly shippingTotal: string;
    readonly dateCreated: string;
    readonly dateModified: string;
    readonly itemCount: number;
    readonly paymentMethod: string;
    readonly paymentMethodTitle: string;
}

/**
 * User preferences and settings
 */
export declare interface UserPreferences {
    readonly language: string;
    readonly currency: string;
    readonly timezone: string;
    readonly dateFormat: string;
    readonly timeFormat: '12h' | '24h';
    readonly emailNotifications: {
        readonly orderUpdates: boolean;
        readonly promotions: boolean;
        readonly newsletter: boolean;
        readonly wishlistReminders: boolean;
        readonly backInStock: boolean;
        readonly priceDrops: boolean;
    };
    readonly privacy: {
        readonly profileVisibility: 'public' | 'private' | 'friends';
        readonly showPurchaseHistory: boolean;
        readonly allowRecommendations: boolean;
        readonly dataSharing: boolean;
    };
}

/**
 * User profile information
 */
export declare interface UserProfile {
    readonly id: number;
    readonly wordpressUserId: number;
    readonly username: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly displayName: string;
    readonly avatar?: string;
    readonly bio?: string;
    readonly website?: string;
    readonly phone?: string;
    readonly dateOfBirth?: string;
    readonly gender?: Gender;
    readonly roles: readonly UserRole[];
    readonly status: UserStatus;
    readonly dateRegistered: string;
    readonly lastLogin?: string;
    readonly isEmailVerified: boolean;
    readonly isPhoneVerified: boolean;
}

/**
 * User roles in WordPress/WooCommerce
 */
export declare type UserRole = 'customer' | 'shop_manager' | 'administrator' | 'editor' | 'author' | 'contributor' | 'subscriber';

/**
 * Main User Service class
 */
export declare class UserService {
    private readonly client;
    private readonly cache;
    private readonly config;
    private readonly userCache;
    private readonly emailVerification;
    private readonly downloads;
    private currentAuthContext;
    constructor(client: HttpClient, cache: CacheManager, config: UserSyncConfig, emailVerificationConfig?: EmailVerificationConfig, downloadConfig?: DownloadConfig);
    /**
     * Set authentication context from external auth system
     */
    setAuthContext(authContext: UserAuthContext): Result<void, WooError>;
    /**
     * Get current authenticated user context
     */
    getCurrentAuthContext(): UserAuthContext | null;
    /**
     * Clear authentication context
     */
    clearAuthContext(): Result<void, WooError>;
    /**
     * Sync user data with WordPress/WooCommerce
     */
    syncUserData(request: UserSyncRequest): Promise<Result<UserSyncResponse, WooError>>;
    /**
     * Get user profile by ID
     */
    getUserProfile(userId: number, useCache?: boolean): Promise<Result<UserProfile, WooError>>;
    /**
     * Update user profile
     */
    updateUserProfile(userId: number, updates: UserUpdateRequest): Promise<Result<UserProfile, WooError>>;
    /**
     * Get customer data from WooCommerce
     */
    getCustomerData(customerId: number): Promise<Result<CustomerData, WooError>>;
    /**
     * Validate address
     */
    validateAddress(address: UserAddress): AddressValidationResult;
    /**
     * Send email verification
     */
    sendEmailVerification(request: EmailVerificationRequest): Promise<Result<EmailVerificationResponse, WooError>>;
    /**
     * Confirm email verification
     */
    confirmEmailVerification(request: EmailVerificationConfirmRequest): Promise<Result<EmailVerificationConfirmResponse, WooError>>;
    /**
     * Get email verification status
     */
    getEmailVerificationStatus(userId: number): Promise<Result<EmailVerificationStatus, WooError>>;
    /**
     * Resend email verification
     */
    resendEmailVerification(userId: number): Promise<Result<EmailVerificationResponse, WooError>>;
    /**
     * Check if email verification is required for a specific action
     */
    isEmailVerificationRequired(action: 'purchase' | 'profile_update' | 'password_change'): boolean;
    /**
     * Get customer's downloadable products
     */
    getCustomerDownloads(customerId: number): Promise<Result<CustomerDownload[], WooError>>;
    /**
     * Generate secure download link
     */
    generateDownloadLink(request: DownloadRequest): Promise<Result<DownloadLink, WooError>>;
    /**
     * Get download statistics
     */
    getDownloadStatistics(customerId?: number, startDate?: Date, endDate?: Date): Promise<Result<DownloadStatistics, WooError>>;
    /**
     * Cleanup expired downloads
     */
    cleanupExpiredDownloads(): Promise<Result<number, WooError>>;
    /**
     * Get user order history
     */
    getUserOrderHistory(userId: number, page?: number, limit?: number): Promise<Result<UserOrderSummary[], WooError>>;
    /**
     * Log user activity
     */
    logUserActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): Promise<Result<void, WooError>>;
    private validateSyncRequest;
    private syncUserProfile;
    private syncUserAddresses;
    private syncUserPreferences;
    private syncUserOrderHistory;
    private syncUserWishlist;
    private transformWooAddressToUserAddress;
}

/**
 * User statistics
 */
export declare interface UserStats {
    readonly totalUsers: number;
    readonly activeUsers: number;
    readonly newUsersThisMonth: number;
    readonly totalCustomers: number;
    readonly payingCustomers: number;
    readonly averageOrderValue: string;
    readonly totalOrdersCount: number;
    readonly topSpendingCustomers: readonly {
        readonly userId: number;
        readonly email: string;
        readonly totalSpent: string;
        readonly ordersCount: number;
    }[];
}

/**
 * User account status
 */
export declare type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * User sync configuration
 */
export declare interface UserSyncConfig {
    readonly enabled: boolean;
    readonly syncInterval: number;
    readonly syncOnLogin: boolean;
    readonly syncProfile: boolean;
    readonly syncAddresses: boolean;
    readonly syncPreferences: boolean;
    readonly syncOrderHistory: boolean;
    readonly syncWishlist: boolean;
    readonly maxOrderHistory: number;
    readonly cacheUserData: boolean;
    readonly cacheTtl: number;
}

/**
 * User data sync request
 */
export declare interface UserSyncRequest {
    readonly userId: number;
    readonly externalUserId?: string;
    readonly syncProfile?: boolean;
    readonly syncAddresses?: boolean;
    readonly syncPreferences?: boolean;
    readonly syncOrderHistory?: boolean;
    readonly syncWishlist?: boolean;
    readonly forceRefresh?: boolean;
}

/**
 * User data sync response
 */
export declare interface UserSyncResponse {
    readonly userId: number;
    readonly syncedAt: string;
    readonly profile?: UserProfile;
    readonly customerData?: CustomerData;
    readonly addresses?: readonly UserAddress[];
    readonly preferences?: UserPreferences;
    readonly orderHistory?: readonly UserOrderSummary[];
    readonly wishlist?: UserWishlist;
    readonly syncErrors?: readonly string[];
}

/**
 * User update request
 */
export declare interface UserUpdateRequest {
    readonly profile?: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'displayName' | 'bio' | 'website' | 'phone' | 'dateOfBirth' | 'gender'>>;
    readonly addresses?: readonly UserAddress[];
    readonly preferences?: Partial<UserPreferences>;
}

/**
 * User's complete wishlist
 */
export declare interface UserWishlist {
    readonly id: string;
    readonly userId: number;
    readonly name: string;
    readonly description?: string;
    readonly items: readonly WishlistItem[];
    readonly isPublic: boolean;
    readonly shareToken?: string;
    readonly dateCreated: string;
    readonly dateModified: string;
}

/**
 * Configuration validation functions
 */
export declare function validateBaseURL(url: string): boolean;

export declare function validateCacheConfig(config: Partial<CacheConfig>): boolean;

export declare function validateConsumerCredentials(key: string, secret: string): boolean;

/**
 * Input validation errors
 */
export declare class ValidationError extends Error implements WooError {
    readonly details?: unknown | undefined;
    readonly code: "VALIDATION_ERROR";
    readonly timestamp: Date;
    readonly retryable = false;
    constructor(message: string, details?: unknown | undefined);
}

/**
 * Validation result for individual checkout components
 */
declare interface ValidationResult {
    readonly component: 'address' | 'shipping' | 'payment' | 'cart' | 'totals';
    readonly isValid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
    readonly metadata?: Record<string, unknown>;
}

/**
 * Variation list parameters
 */
export declare interface VariationListParams {
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
    readonly minPrice?: number;
    readonly maxPrice?: number;
    readonly inStock?: boolean;
    readonly onSale?: boolean;
}

export declare const VERSION = "1.0.0";

/**
 * User wishlist item
 */
export declare interface WishlistItem {
    readonly id: string;
    readonly productId: number;
    readonly variationId?: number;
    readonly quantity: number;
    readonly dateAdded: string;
    readonly notes?: string;
    readonly priority: 'low' | 'medium' | 'high';
    readonly isPublic: boolean;
}

/**
 * WooCommerce coupon interface following REST API v3
 */
export declare interface WooCommerceCoupon {
    readonly id: number;
    readonly code: string;
    readonly amount: string;
    readonly date_created: string;
    readonly date_created_gmt: string;
    readonly date_modified: string;
    readonly date_modified_gmt: string;
    readonly discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
    readonly description: string;
    readonly date_expires?: string;
    readonly date_expires_gmt?: string;
    readonly usage_count: number;
    readonly individual_use: boolean;
    readonly product_ids: readonly number[];
    readonly excluded_product_ids: readonly number[];
    readonly usage_limit?: number;
    readonly usage_limit_per_user?: number;
    readonly limit_usage_to_x_items?: number;
    readonly free_shipping: boolean;
    readonly product_categories: readonly number[];
    readonly excluded_product_categories: readonly number[];
    readonly exclude_sale_items: boolean;
    readonly minimum_amount: string;
    readonly maximum_amount: string;
    readonly email_restrictions: readonly string[];
    readonly used_by: readonly string[];
    readonly meta_data: readonly MetaData[];
}

/**
 * Customer interface
 */
export declare interface WooCommerceCustomer {
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
 * Order interface
 */
export declare interface WooCommerceOrder {
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
 * Core product interface matching WooCommerce API
 */
export declare interface WooCommerceProduct {
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
 * Main WooCommerce configuration
 */
export declare interface WooConfig {
    readonly baseURL: string;
    readonly consumerKey: string;
    readonly consumerSecret: string;
    readonly version?: string;
    readonly environment?: Environment;
    readonly cache?: Partial<CacheConfig>;
    readonly auth?: Partial<JWTConfig>;
    readonly http?: Partial<HttpConfig>;
    readonly search?: Partial<SearchConfig>;
    readonly advancedSearch?: Partial<AdvancedSearchConfig>;
    readonly analytics?: Partial<AnalyticsConfig>;
    readonly i18n?: Partial<I18nConfig>;
    readonly debug?: Partial<DebugConfig>;
    readonly cart?: Partial<CartConfig>;
    readonly userSync?: Partial<UserSyncConfig>;
    readonly checkout?: Partial<CheckoutConfig>;
}

/**
 * WooCommerce Headless SDK Error Types
 * Following the enhanced unified-10x-dev framework
 */
/**
 * Base error interface with mandatory fields
 */
export declare interface WooError {
    readonly code: WooErrorCode;
    readonly message: string;
    readonly details?: unknown;
    readonly timestamp: Date;
    readonly statusCode?: number;
    readonly retryable?: boolean;
}

/**
 * Specific error codes for different failure scenarios
 */
export declare type WooErrorCode = 'NETWORK_ERROR' | 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'API_ERROR' | 'RATE_LIMIT_ERROR' | 'TIMEOUT_ERROR' | 'CONFIGURATION_ERROR' | 'PRODUCT_NOT_FOUND' | 'CART_ERROR' | 'CHECKOUT_ERROR' | 'PAYMENT_ERROR' | 'SUBSCRIPTION_ERROR' | 'CACHE_ERROR';

/**
 * Main SDK class that provides access to all WooCommerce functionality
 */
export declare class WooHeadless {
    private config;
    private readonly httpClient;
    private readonly authManager;
    private cacheManager;
    readonly products: ProductService;
    readonly cart: CartService;
    readonly search: SearchService;
    readonly user: UserService;
    readonly checkout: CheckoutService;
    readonly reviews: ReviewService;
    constructor(config: WooConfig);
    /**
     * Get current configuration
     */
    getConfig(): ResolvedWooConfig;
    /**
     * Get authentication manager
     */
    getAuth(): AuthManager;
    /**
     * Get cache manager
     */
    getCache(): CacheManager;
    /**
     * Get HTTP client for custom requests
     */
    getHttpClient(): HttpClient;
    /**
     * Clear all caches
     */
    clearCache(): Promise<Result<void, WooError>>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Promise<Result<Record<string, number>, WooError>>;
    /**
     * Update configuration at runtime
     */
    updateConfig(updates: Partial<WooConfig>): Result<void, ConfigurationError>;
    /**
     * Health check to verify API connectivity
     */
    healthCheck(): Promise<Result<boolean, WooError>>;
}

export { }
