import { z as z$1 } from "zod";
import Fuse from "fuse.js";
function Ok(data) {
  return { success: true, data };
}
function Err(error) {
  return { success: false, error };
}
function isOk(result) {
  return result.success;
}
function isErr(result) {
  return !result.success;
}
function unwrap(result) {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(`Called unwrap on Err: ${JSON.stringify(result.error)}`);
}
function unwrapErr(result) {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error(`Called unwrapErr on Ok: ${JSON.stringify(result.data)}`);
}
function unwrapOr(result, defaultValue) {
  return isOk(result) ? result.data : defaultValue;
}
function map(result, fn) {
  return isOk(result) ? Ok(fn(result.data)) : result;
}
function mapErr(result, fn) {
  return isErr(result) ? Err(fn(result.error)) : result;
}
function andThen(result, fn) {
  return isOk(result) ? fn(result.data) : result;
}
class NetworkError extends Error {
  constructor(message, details, statusCode) {
    super(message);
    this.details = details;
    this.code = "NETWORK_ERROR";
    this.retryable = true;
    this.name = "NetworkError";
    this.timestamp = /* @__PURE__ */ new Date();
    if (statusCode !== void 0) {
      this.statusCode = statusCode;
    }
  }
}
class AuthError extends Error {
  constructor(message, details, statusCode) {
    super(message);
    this.details = details;
    this.code = "AUTH_ERROR";
    this.retryable = false;
    this.name = "AuthError";
    this.timestamp = /* @__PURE__ */ new Date();
    if (statusCode !== void 0) {
      this.statusCode = statusCode;
    }
  }
}
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.code = "VALIDATION_ERROR";
    this.retryable = false;
    this.name = "ValidationError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class ApiError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = "API_ERROR";
    this.name = "ApiError";
    this.timestamp = /* @__PURE__ */ new Date();
    this.retryable = statusCode >= 500;
  }
}
class RateLimitError extends Error {
  constructor(message, retryAfter, details) {
    super(message);
    this.retryAfter = retryAfter;
    this.details = details;
    this.code = "RATE_LIMIT_ERROR";
    this.retryable = true;
    this.name = "RateLimitError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class TimeoutError extends Error {
  constructor(message, timeout, details) {
    super(message);
    this.timeout = timeout;
    this.details = details;
    this.code = "TIMEOUT_ERROR";
    this.retryable = true;
    this.name = "TimeoutError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class ConfigurationError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.code = "CONFIGURATION_ERROR";
    this.retryable = false;
    this.name = "ConfigurationError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class ProductNotFoundError extends Error {
  constructor(productId, details) {
    super(`Product with ID ${productId} not found`);
    this.productId = productId;
    this.details = details;
    this.code = "PRODUCT_NOT_FOUND";
    this.retryable = false;
    this.name = "ProductNotFoundError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class CartError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.code = "CART_ERROR";
    this.retryable = false;
    this.name = "CartError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class CheckoutError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.code = "CHECKOUT_ERROR";
    this.retryable = false;
    this.name = "CheckoutError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
class PaymentError extends Error {
  constructor(message, details, statusCode) {
    super(message);
    this.details = details;
    this.code = "PAYMENT_ERROR";
    this.retryable = false;
    this.name = "PaymentError";
    this.timestamp = /* @__PURE__ */ new Date();
    if (statusCode !== void 0) {
      this.statusCode = statusCode;
    }
  }
}
class ErrorFactory {
  static networkError(message, details, statusCode) {
    return new NetworkError(message, details, statusCode);
  }
  static authError(message, details, statusCode) {
    return new AuthError(message, details, statusCode);
  }
  static validationError(message, details) {
    return new ValidationError(message, details);
  }
  static apiError(message, statusCode, details) {
    return new ApiError(message, statusCode, details);
  }
  static rateLimitError(message, retryAfter, details) {
    return new RateLimitError(message, retryAfter, details);
  }
  static timeoutError(message, timeout, details) {
    return new TimeoutError(message, timeout, details);
  }
  static configurationError(message, details) {
    return new ConfigurationError(message, details);
  }
  static productNotFoundError(productId, details) {
    return new ProductNotFoundError(productId, details);
  }
  static cartError(message, details) {
    return new CartError(message, details);
  }
  static checkoutError(message, details) {
    return new CheckoutError(message, details);
  }
  static paymentError(message, details, statusCode) {
    return new PaymentError(message, details, statusCode);
  }
  static cacheError(message, details) {
    return new CacheError(message, details);
  }
  static notImplementedError(message, details) {
    return new ConfigurationError(`Not implemented: ${message}`, details);
  }
  static persistenceError(message, details) {
    return new CacheError(`Persistence error: ${message}`, details);
  }
}
class CacheError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.code = "CACHE_ERROR";
    this.retryable = false;
    this.name = "CacheError";
    this.timestamp = /* @__PURE__ */ new Date();
  }
}
function isWooError(error) {
  return error !== null && typeof error === "object" && "code" in error && "message" in error && "timestamp" in error;
}
const ProductSchema = z$1.object({
  id: z$1.number(),
  name: z$1.string(),
  slug: z$1.string(),
  status: z$1.enum(["draft", "pending", "private", "publish"]),
  featured: z$1.boolean(),
  catalog_visibility: z$1.enum(["visible", "catalog", "search", "hidden"]),
  description: z$1.string(),
  short_description: z$1.string(),
  price: z$1.string(),
  regular_price: z$1.string(),
  sale_price: z$1.string(),
  on_sale: z$1.boolean(),
  stock_status: z$1.enum(["instock", "outofstock", "onbackorder"]),
  manage_stock: z$1.boolean(),
  stock_quantity: z$1.number().optional(),
  categories: z$1.array(z$1.object({
    id: z$1.number(),
    name: z$1.string(),
    slug: z$1.string()
  })),
  images: z$1.array(z$1.object({
    id: z$1.number(),
    src: z$1.string(),
    name: z$1.string(),
    alt: z$1.string()
  }))
});
const OrderSchema = z$1.object({
  id: z$1.number(),
  status: z$1.enum(["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed", "trash"]),
  currency: z$1.string(),
  total: z$1.string(),
  customer_id: z$1.number(),
  billing: z$1.object({
    first_name: z$1.string(),
    last_name: z$1.string(),
    email: z$1.string(),
    phone: z$1.string()
  }),
  line_items: z$1.array(z$1.object({
    id: z$1.number(),
    name: z$1.string(),
    product_id: z$1.number(),
    quantity: z$1.number(),
    total: z$1.string()
  }))
});
function isWooCommerceProduct(data) {
  try {
    ProductSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}
function isWooCommerceOrder(data) {
  try {
    OrderSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}
function isWooCommerceCoupon(data) {
  return typeof data === "object" && data !== null && "id" in data && "code" in data && "amount" in data && "discount_type" in data;
}
const DEFAULT_CONFIG = {
  version: "wc/v3",
  environment: "production",
  cache: {
    enabled: true,
    ttl: 3e5,
    // 5 minutes
    storage: "localStorage",
    maxSize: 50,
    // 50MB
    prefix: "woo-headless"
  },
  auth: {
    enabled: false,
    expiresIn: 3600,
    // 1 hour
    autoRefresh: true,
    refreshThreshold: 300
    // 5 minutes
  },
  http: {
    timeout: 3e4,
    // 30 seconds
    retries: 3,
    retryDelay: 1e3,
    // 1 second
    maxRetryDelay: 1e4,
    // 10 seconds
    retryCondition: (error) => {
      return error instanceof Error && (error.message.includes("network") || error.message.includes("timeout") || error.message.includes("5"));
    }
  },
  search: {
    fuzzyThreshold: 0.3,
    maxResults: 50,
    enableHighlight: true,
    enableSuggestions: true,
    cacheResults: true,
    enableAnalytics: false
  },
  advancedSearch: {
    fuzzy: {
      enabled: true,
      threshold: 0.3,
      distance: 100,
      minMatchCharLength: 1,
      includeScore: true
    },
    highlighting: {
      enabled: true,
      preTag: "<mark>",
      postTag: "</mark>",
      fragmentSize: 150,
      maxFragments: 3
    },
    suggestions: {
      enabled: true,
      maxSuggestions: 10,
      minQueryLength: 2,
      showPopular: true,
      showRecent: true
    },
    facets: {
      enabled: true,
      maxFacets: 10,
      maxFacetValues: 20,
      minDocumentCount: 1
    },
    analytics: {
      enabled: false,
      trackQueries: true,
      trackFilters: true,
      trackClicks: true,
      trackConversions: false,
      sessionTimeout: 30
    },
    caching: {
      enabled: true,
      ttl: 3e5,
      // 5 minutes
      maxCacheSize: 100,
      cacheKey: "woo-search"
    },
    performance: {
      maxResults: 1e3,
      searchTimeout: 5e3,
      // 5 seconds
      debounceDelay: 300,
      // 300ms
      prefetchResults: false
    }
  },
  analytics: {
    enabled: false,
    trackPageViews: false,
    trackSearches: false,
    trackConversions: false
  },
  i18n: {
    locale: "en-US",
    currency: "USD",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    numberFormat: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  },
  debug: {
    enabled: false,
    logLevel: "error",
    performanceMonitoring: false,
    errorReporting: false,
    apiLogging: false
  },
  cart: {
    persistence: {
      strategy: "localStorage",
      key: "woo-headless-cart",
      encryption: false,
      expirationDays: 30,
      syncToServer: false
    },
    sync: {
      enabled: false,
      strategy: "merge_smart",
      syncIntervalMs: 3e4,
      // 30 seconds
      conflictResolution: "merge_smart",
      maxRetries: 3,
      retryDelayMs: 1e3,
      // 1 second
      syncOnAuth: true,
      syncOnCartChange: false,
      // Avoid excessive syncing
      backgroundSync: true,
      offlineQueueSize: 50
    },
    autoCalculateTotals: true,
    validateStock: true,
    allowBackorders: false,
    sessionTimeout: 60,
    // 60 minutes
    maxItems: 100,
    maxQuantityPerItem: 999,
    enableCoupons: true,
    enableShipping: true,
    enableFees: true,
    enableCrossSells: true,
    taxCalculation: {
      enabled: true,
      pricesIncludeTax: false,
      displayMode: "excl",
      roundAtSubtotal: false
    }
  },
  userSync: {
    enabled: false,
    syncInterval: 300,
    // 5 minutes
    syncOnLogin: true,
    syncProfile: true,
    syncAddresses: true,
    syncPreferences: true,
    syncOrderHistory: true,
    syncWishlist: true,
    maxOrderHistory: 50,
    cacheUserData: true,
    cacheTtl: 18e5
    // 30 minutes
  },
  checkout: {
    address: {
      firstName: true,
      lastName: true,
      company: false,
      address1: true,
      address2: false,
      city: true,
      state: true,
      postcode: true,
      country: true,
      email: true,
      phone: false
    },
    shipping: {
      enabled: true,
      calculateTax: true,
      defaultCountry: "US",
      restrictedCountries: [],
      cacheTimeout: 15
    },
    payment: {
      enabled: true,
      testMode: true,
      supportedMethods: ["stripe", "paypal", "bank_transfer", "cash_on_delivery"],
      minimumAmount: 1,
      currency: "USD",
      returnUrl: "/checkout/payment/return",
      cancelUrl: "/checkout/payment/cancel",
      cacheTimeout: 10
    },
    flow: {
      steps: ["billing_address", "shipping_method", "payment_method", "order_review"],
      allowSkipOptional: false,
      persistSession: true,
      sessionTimeout: 30,
      autoAdvance: false,
      validationRules: {
        requireShippingAddress: true,
        requireBillingAddress: true,
        requirePhoneNumber: false,
        requireCompanyName: false,
        allowGuestCheckout: true,
        minimumOrderAmount: 0,
        restrictedCountries: [],
        requiredFields: []
      }
    },
    order: {
      autoUpdateInventory: true,
      sendConfirmationEmail: true,
      requirePaymentConfirmation: true,
      orderNumberPrefix: "WOO-",
      defaultStatus: "pending",
      inventoryHoldMinutes: 15,
      cacheTimeout: 30
    },
    validation: {
      requireShippingAddress: true,
      requireBillingAddress: true,
      requirePhoneNumber: false,
      requireCompanyName: false,
      allowGuestCheckout: true,
      minimumOrderAmount: 0,
      restrictedCountries: [],
      requiredFields: []
    }
  }
};
function validateBaseURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function validateConsumerCredentials(key, secret) {
  return key.trim().length > 0 && secret.trim().length > 0;
}
function validateCacheConfig(config) {
  if (config.ttl !== void 0 && config.ttl < 0) {
    return false;
  }
  if (config.maxSize !== void 0 && config.maxSize <= 0) {
    return false;
  }
  return true;
}
class HttpClient {
  constructor(config) {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    this.abortControllers = /* @__PURE__ */ new Map();
    this.config = config.http;
    this.baseURL = `${config.baseURL}/wp-json/${config.version}`;
  }
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor) {
    this.errorInterceptors.push(interceptor);
  }
  /**
   * Main request method with retry logic and error handling
   */
  async request(options) {
    const requestId = this.generateRequestId();
    try {
      let processedOptions = { ...options };
      for (const interceptor of this.requestInterceptors) {
        processedOptions = await interceptor(processedOptions);
      }
      const result = await this.attemptRequest(processedOptions, requestId);
      if (result.success) {
        let response = result.data;
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response);
        }
        return Ok(response);
      } else {
        let error = result.error;
        for (const interceptor of this.errorInterceptors) {
          error = await interceptor(error);
        }
        return Err(error);
      }
    } catch (error) {
      const wooError = this.createErrorFromException(error);
      return Err(wooError);
    } finally {
      this.abortControllers.delete(requestId);
    }
  }
  /**
   * GET request
   */
  async get(url, headers) {
    const options = {
      method: "GET",
      url
    };
    if (headers !== void 0) {
      options.headers = headers;
    }
    return this.request(options);
  }
  /**
   * POST request
   */
  async post(url, body, headers) {
    const options = {
      method: "POST",
      url
    };
    if (body !== void 0) {
      options.body = body;
    }
    if (headers !== void 0) {
      options.headers = headers;
    }
    return this.request(options);
  }
  /**
   * PUT request
   */
  async put(url, body, headers) {
    const options = {
      method: "PUT",
      url
    };
    if (body !== void 0) {
      options.body = body;
    }
    if (headers !== void 0) {
      options.headers = headers;
    }
    return this.request(options);
  }
  /**
   * PATCH request
   */
  async patch(url, body, headers) {
    const options = {
      method: "PATCH",
      url
    };
    if (body !== void 0) {
      options.body = body;
    }
    if (headers !== void 0) {
      options.headers = headers;
    }
    return this.request(options);
  }
  /**
   * DELETE request
   */
  async delete(url, headers) {
    const options = {
      method: "DELETE",
      url
    };
    if (headers !== void 0) {
      options.headers = headers;
    }
    return this.request(options);
  }
  /**
   * Cancel request by ID
   */
  cancelRequest(requestId) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
  /**
   * Attempt request with retry logic
   */
  async attemptRequest(options, requestId) {
    const maxRetries = options.retries ?? this.config.retries;
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeRequest(options, requestId);
        if (result.success) {
          return result;
        }
        lastError = result.error;
        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          break;
        }
        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt));
        }
      } catch (error) {
        lastError = this.createErrorFromException(error);
        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          break;
        }
        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }
    return Err(lastError ?? ErrorFactory.networkError("Unknown error occurred"));
  }
  /**
   * Execute single request
   */
  async executeRequest(options, requestId) {
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);
    const url = this.buildURL(options.url);
    const timeout = options.timeout ?? this.config.timeout;
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);
    try {
      const fetchOptions = {
        method: options.method,
        headers: this.buildHeaders(options.headers),
        signal: abortController.signal
      };
      const body = this.buildBody(options.body);
      if (body !== void 0) {
        fetchOptions.body = body;
      }
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      if (!response.ok) {
        return Err(await this.createErrorFromResponse(response));
      }
      const data = await this.parseResponse(response);
      const responseHeaders = this.extractHeaders(response);
      return Ok({
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        return Err(ErrorFactory.timeoutError("Request timeout", timeout));
      }
      return Err(this.createErrorFromException(error));
    }
  }
  /**
   * Build full URL
   */
  buildURL(path) {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseURL}/${cleanPath}`;
  }
  /**
   * Build request headers
   */
  buildHeaders(headers) {
    const defaultHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "WooHeadless-SDK/1.0.0",
      ...this.config.headers
    };
    return { ...defaultHeaders, ...headers };
  }
  /**
   * Build request body
   */
  buildBody(body) {
    if (!body)
      return void 0;
    if (typeof body === "string") {
      return body;
    }
    return JSON.stringify(body);
  }
  /**
   * Parse response based on content type
   */
  async parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    if (contentType.includes("text/")) {
      return response.text();
    }
    return response.json();
  }
  /**
   * Extract headers from response
   */
  extractHeaders(response) {
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }
  /**
   * Create error from HTTP response
   */
  async createErrorFromResponse(response) {
    const status = response.status;
    const statusText = response.statusText;
    if (status === 429) {
      const retryAfter = response.headers.get("retry-after");
      return ErrorFactory.rateLimitError(
        "Rate limit exceeded",
        retryAfter ? parseInt(retryAfter) : void 0
      );
    }
    if (status === 401 || status === 403) {
      return ErrorFactory.authError(`Authentication failed: ${statusText}`, void 0, status);
    }
    let details;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    return ErrorFactory.apiError(`HTTP ${status}: ${statusText}`, status, details);
  }
  /**
   * Create error from exception
   */
  createErrorFromException(error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return ErrorFactory.timeoutError("Request was aborted", this.config.timeout);
      }
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return ErrorFactory.networkError(error.message);
      }
    }
    return ErrorFactory.networkError(
      error instanceof Error ? error.message : "Unknown network error"
    );
  }
  /**
   * Check if error should trigger retry
   */
  shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) {
      return false;
    }
    if (this.config.retryCondition) {
      return this.config.retryCondition(error);
    }
    return error.retryable === true;
  }
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitteredDelay = exponentialDelay + Math.random() * 1e3;
    return Math.min(jitteredDelay, this.config.maxRetryDelay);
  }
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
class LocalTokenStorage {
  constructor(prefix = "woo-headless") {
    this.prefix = prefix;
  }
  async get(key) {
    try {
      return localStorage.getItem(`${this.prefix}:${key}`);
    } catch {
      return null;
    }
  }
  async set(key, value) {
    try {
      localStorage.setItem(`${this.prefix}:${key}`, value);
    } catch {
    }
  }
  async remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}:${key}`);
    } catch {
    }
  }
  async clear() {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
    }
  }
}
class MemoryTokenStorage {
  constructor(prefix = "woo-headless") {
    this.store = /* @__PURE__ */ new Map();
    this.prefix = prefix;
  }
  async get(key) {
    return this.store.get(`${this.prefix}:${key}`) ?? null;
  }
  async set(key, value) {
    this.store.set(`${this.prefix}:${key}`, value);
  }
  async remove(key) {
    this.store.delete(`${this.prefix}:${key}`);
  }
  async clear() {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.startsWith(`${this.prefix}:`)) {
        this.store.delete(key);
      }
    }
  }
}
class AuthManager {
  constructor(config, storage) {
    this.currentToken = null;
    this.refreshTimer = null;
    this.config = config.auth;
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== "undefined") {
      this.storage = new LocalTokenStorage(config.cache.prefix);
    } else {
      this.storage = new MemoryTokenStorage(config.cache.prefix);
    }
    this.initializeToken();
  }
  /**
   * Initialize token from storage
   */
  async initializeToken() {
    try {
      const tokenData = await this.storage.get("token");
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        if (this.isTokenValid(parsed)) {
          this.currentToken = parsed;
          this.scheduleRefresh();
        } else {
          await this.clearToken();
        }
      }
    } catch {
      await this.clearToken();
    }
  }
  /**
   * Set authentication token
   */
  async setToken(tokenData) {
    this.currentToken = tokenData;
    await this.storage.set("token", JSON.stringify(tokenData));
    this.scheduleRefresh();
  }
  /**
   * Get current token
   */
  getToken() {
    if (this.currentToken && this.isTokenValid(this.currentToken)) {
      return this.currentToken.token;
    }
    return null;
  }
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }
  /**
   * Validate token
   */
  async validateToken() {
    if (!this.currentToken) {
      return Ok(false);
    }
    if (!this.isTokenValid(this.currentToken)) {
      await this.clearToken();
      return Ok(false);
    }
    return Ok(true);
  }
  /**
   * Clear authentication token
   */
  async clearToken() {
    this.currentToken = null;
    await this.storage.remove("token");
    this.clearRefreshTimer();
  }
  /**
   * Logout
   */
  async logout() {
    await this.clearToken();
    return Ok(void 0);
  }
  /**
   * Create JWT token from auth response
   */
  createTokenFromAuthResponse(authResponse) {
    if (!authResponse.success || !authResponse.data.token) {
      return Err(ErrorFactory.authError("Invalid authentication response"));
    }
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(authResponse.data.expires * 1e3);
    const token = {
      token: authResponse.data.token,
      expiresAt,
      issuedAt: now
    };
    return Ok(token);
  }
  /**
   * Get authorization header
   */
  getAuthorizationHeader() {
    const token = this.getToken();
    if (!token) {
      return void 0;
    }
    return {
      "Authorization": `Bearer ${token}`
    };
  }
  /**
   * Schedule token refresh
   */
  scheduleRefresh() {
    this.clearRefreshTimer();
    if (!this.config.autoRefresh || !this.currentToken) {
      return;
    }
    const refreshThreshold = this.config.refreshThreshold ?? 300;
    const refreshTime = this.currentToken.expiresAt.getTime() - Date.now() - refreshThreshold * 1e3;
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.handleTokenRefresh();
      }, refreshTime);
    }
  }
  /**
   * Handle token refresh
   */
  async handleTokenRefresh() {
    await this.clearToken();
  }
  /**
   * Clear refresh timer
   */
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(token) {
    return token.expiresAt.getTime() > Date.now();
  }
  /**
   * Generate basic auth header for consumer key/secret
   */
  static generateBasicAuth(consumerKey, consumerSecret) {
    const credentials = `${consumerKey}:${consumerSecret}`;
    return `Basic ${btoa(credentials)}`;
  }
  /**
   * Create OAuth signature for WooCommerce REST API
   */
  static createOAuthSignature(consumerKey, consumerSecret, url, method, parameters = {}) {
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_version: "1.0",
      ...parameters
    };
    const sortedParams = Object.keys(oauthParams).sort().map((key) => {
      const value = oauthParams[key];
      return `${key}=${encodeURIComponent(value ?? "")}`;
    }).join("&");
    const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&`;
    const signature = btoa(signatureBase + signingKey);
    return {
      ...oauthParams,
      oauth_signature: signature
    };
  }
}
class ConfigManager {
  /**
   * Resolve configuration with defaults and validation
   */
  static resolveConfig(config) {
    const validation = this.validateConfig(config);
    if (!validation.success) {
      return validation;
    }
    const resolvedConfig = {
      baseURL: config.baseURL,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      version: config.version ?? DEFAULT_CONFIG.version,
      environment: config.environment ?? DEFAULT_CONFIG.environment,
      cache: {
        ...DEFAULT_CONFIG.cache,
        ...config.cache
      },
      auth: {
        ...DEFAULT_CONFIG.auth,
        ...config.auth
      },
      http: {
        ...DEFAULT_CONFIG.http,
        ...config.http
      },
      search: {
        ...DEFAULT_CONFIG.search,
        ...config.search
      },
      analytics: {
        ...DEFAULT_CONFIG.analytics,
        ...config.analytics
      },
      i18n: {
        ...DEFAULT_CONFIG.i18n,
        ...config.i18n
      },
      debug: {
        ...DEFAULT_CONFIG.debug,
        ...config.debug
      },
      advancedSearch: {
        ...DEFAULT_CONFIG.advancedSearch,
        ...config.advancedSearch
      },
      cart: {
        ...DEFAULT_CONFIG.cart,
        ...config.cart
      },
      userSync: {
        ...DEFAULT_CONFIG.userSync,
        ...config.userSync
      },
      checkout: {
        ...DEFAULT_CONFIG.checkout,
        ...config.checkout
      }
    };
    return Ok(resolvedConfig);
  }
  /**
   * Validate configuration
   */
  static validateConfig(config) {
    if (!validateBaseURL(config.baseURL)) {
      return Err(ErrorFactory.configurationError(
        "Invalid baseURL. Must be a valid URL.",
        { baseURL: config.baseURL }
      ));
    }
    if (!validateConsumerCredentials(config.consumerKey, config.consumerSecret)) {
      return Err(ErrorFactory.configurationError(
        "Invalid consumer credentials. Both consumerKey and consumerSecret are required.",
        {
          hasConsumerKey: Boolean(config.consumerKey?.trim()),
          hasConsumerSecret: Boolean(config.consumerSecret?.trim())
        }
      ));
    }
    if (config.cache && !validateCacheConfig(config.cache)) {
      return Err(ErrorFactory.configurationError(
        "Invalid cache configuration.",
        { cache: config.cache }
      ));
    }
    if (config.search?.fuzzyThreshold !== void 0) {
      if (config.search.fuzzyThreshold < 0 || config.search.fuzzyThreshold > 1) {
        return Err(ErrorFactory.configurationError(
          "Search fuzzyThreshold must be between 0 and 1.",
          { fuzzyThreshold: config.search.fuzzyThreshold }
        ));
      }
    }
    if (config.search?.maxResults !== void 0) {
      if (config.search.maxResults <= 0) {
        return Err(ErrorFactory.configurationError(
          "Search maxResults must be greater than 0.",
          { maxResults: config.search.maxResults }
        ));
      }
    }
    if (config.http?.timeout !== void 0 && config.http.timeout <= 0) {
      return Err(ErrorFactory.configurationError(
        "HTTP timeout must be greater than 0.",
        { timeout: config.http.timeout }
      ));
    }
    if (config.http?.retries !== void 0 && config.http.retries < 0) {
      return Err(ErrorFactory.configurationError(
        "HTTP retries must be 0 or greater.",
        { retries: config.http.retries }
      ));
    }
    if (config.auth?.expiresIn !== void 0 && config.auth.expiresIn <= 0) {
      return Err(ErrorFactory.configurationError(
        "Auth expiresIn must be greater than 0.",
        { expiresIn: config.auth.expiresIn }
      ));
    }
    return Ok(void 0);
  }
  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(environment) {
    switch (environment) {
      case "development":
        return {
          debug: {
            enabled: true,
            logLevel: "debug",
            performanceMonitoring: true,
            errorReporting: true,
            apiLogging: true
          },
          http: {
            timeout: 6e4,
            // Longer timeout for development
            retries: 1
            // Fewer retries for faster debugging
          }
        };
      case "staging":
        return {
          debug: {
            enabled: true,
            logLevel: "info",
            performanceMonitoring: true,
            errorReporting: true,
            apiLogging: false
          },
          analytics: {
            enabled: true,
            trackPageViews: true,
            trackSearches: true,
            trackConversions: true
          }
        };
      case "production":
        return {
          debug: {
            enabled: false,
            logLevel: "error",
            performanceMonitoring: true,
            errorReporting: true,
            apiLogging: false
          },
          analytics: {
            enabled: true,
            trackPageViews: true,
            trackSearches: true,
            trackConversions: true
          },
          cache: {
            enabled: true,
            ttl: 3e5
            // 5 minutes in production
          }
        };
      default:
        return {};
    }
  }
  /**
   * Create configuration from environment variables
   */
  static fromEnvironment() {
    try {
      const processExists = typeof process !== "undefined" && process.env;
      if (!processExists) {
        return {};
      }
      const env = process.env;
      const config = {};
      if (env.WOO_BASE_URL) {
        config.baseURL = env.WOO_BASE_URL;
      }
      if (env.WOO_CONSUMER_KEY) {
        config.consumerKey = env.WOO_CONSUMER_KEY;
      }
      if (env.WOO_CONSUMER_SECRET) {
        config.consumerSecret = env.WOO_CONSUMER_SECRET;
      }
      if (env.WOO_VERSION) {
        config.version = env.WOO_VERSION;
      }
      if (env.NODE_ENV) {
        config.environment = env.NODE_ENV;
        const envConfig = this.getEnvironmentConfig(env.NODE_ENV);
        Object.assign(config, envConfig);
      }
      return config;
    } catch {
      return {};
    }
  }
  /**
   * Merge multiple configurations
   */
  static mergeConfigs(...configs) {
    const merged = {};
    for (const config of configs) {
      Object.assign(merged, config);
      if (config.cache && merged.cache) {
        merged.cache = { ...merged.cache, ...config.cache };
      }
      if (config.auth && merged.auth) {
        merged.auth = { ...merged.auth, ...config.auth };
      }
      if (config.http && merged.http) {
        merged.http = { ...merged.http, ...config.http };
      }
      if (config.search && merged.search) {
        merged.search = { ...merged.search, ...config.search };
      }
      if (config.analytics && merged.analytics) {
        merged.analytics = { ...merged.analytics, ...config.analytics };
      }
      if (config.i18n && merged.i18n) {
        merged.i18n = { ...merged.i18n, ...config.i18n };
      }
      if (config.debug && merged.debug) {
        merged.debug = { ...merged.debug, ...config.debug };
      }
    }
    return merged;
  }
}
class MemoryCache {
  constructor(maxSizeMB = 50) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSizeMB * 1024 * 1024;
  }
  async get(key) {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return Ok(null);
      }
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        return Ok(null);
      }
      return Ok(entry.data);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get from memory cache", error));
    }
  }
  async set(key, value, ttl) {
    try {
      const size = this.estimateSize(value);
      if (size > this.maxSize) {
        return Err(ErrorFactory.cacheError("Value too large for cache"));
      }
      await this.evictIfNeeded(size);
      const entry = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };
      this.cache.set(key, entry);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to set in memory cache", error));
    }
  }
  async delete(key) {
    try {
      this.cache.delete(key);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to delete from memory cache", error));
    }
  }
  async clear() {
    try {
      this.cache.clear();
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to clear memory cache", error));
    }
  }
  async has(key) {
    try {
      const result = await this.get(key);
      return result.success ? Ok(result.data !== null) : result;
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to check memory cache", error));
    }
  }
  async size() {
    try {
      return Ok(this.cache.size);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get memory cache size", error));
    }
  }
  estimateSize(value) {
    return JSON.stringify(value).length * 2;
  }
  async evictIfNeeded(requiredSize) {
    let currentSize = 0;
    const entries = Array.from(this.cache.entries());
    for (const [, entry] of entries) {
      currentSize += this.estimateSize(entry.data);
    }
    if (currentSize + requiredSize > this.maxSize) {
      const sortedEntries = entries.sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      for (const [key] of sortedEntries) {
        this.cache.delete(key);
        currentSize -= this.estimateSize(this.cache.get(key));
        if (currentSize + requiredSize <= this.maxSize) {
          break;
        }
      }
    }
  }
}
class LocalStorageCache {
  constructor(prefix = "woo-cache", maxSizeMB = 10) {
    this.prefix = prefix;
    this.maxSize = maxSizeMB * 1024 * 1024;
  }
  async get(key) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(null);
      }
      const item = localStorage.getItem(`${this.prefix}:${key}`);
      if (!item) {
        return Ok(null);
      }
      const entry = JSON.parse(item);
      if (Date.now() > entry.timestamp + entry.ttl) {
        localStorage.removeItem(`${this.prefix}:${key}`);
        return Ok(null);
      }
      return Ok(entry.data);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get from localStorage", error));
    }
  }
  async set(key, value, ttl) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(void 0);
      }
      const entry = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };
      const serialized = JSON.stringify(entry);
      if (serialized.length > this.maxSize) {
        return Err(ErrorFactory.cacheError("Value too large for localStorage"));
      }
      try {
        localStorage.setItem(`${this.prefix}:${key}`, serialized);
        return Ok(void 0);
      } catch (e) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          await this.evictOldest();
          localStorage.setItem(`${this.prefix}:${key}`, serialized);
          return Ok(void 0);
        }
        throw e;
      }
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to set in localStorage", error));
    }
  }
  async delete(key) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(void 0);
      }
      localStorage.removeItem(`${this.prefix}:${key}`);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to delete from localStorage", error));
    }
  }
  async clear() {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(void 0);
      }
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to clear localStorage", error));
    }
  }
  async has(key) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(false);
      }
      return Ok(localStorage.getItem(`${this.prefix}:${key}`) !== null);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to check localStorage", error));
    }
  }
  async size() {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return Ok(0);
      }
      let count = 0;
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          count++;
        }
      }
      return Ok(count);
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get localStorage size", error));
    }
  }
  async evictOldest() {
    const entries = [];
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(`${this.prefix}:`)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            entries.push([key, JSON.parse(item)]);
          }
        } catch {
        }
      }
    }
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      const entry = entries[i];
      if (entry && entry[0]) {
        localStorage.removeItem(entry[0]);
      }
    }
  }
}
class IndexedDBCache {
  constructor(dbName = "woo-cache-db") {
    this.storeName = "cache";
    this.version = 1;
    this.db = null;
    this.dbName = dbName;
  }
  async initDB() {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        return Err(ErrorFactory.cacheError("IndexedDB not available"));
      }
      if (this.db) {
        return Ok(this.db);
      }
      return new Promise((resolve) => {
        const request = indexedDB.open(this.dbName, this.version);
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to open IndexedDB")));
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(Ok(request.result));
        };
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "key" });
          }
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to initialize IndexedDB", error));
    }
  }
  async get(key) {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return Ok(null);
      }
      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to get from IndexedDB")));
        };
        request.onsuccess = () => {
          const entry = request.result;
          if (!entry) {
            resolve(Ok(null));
            return;
          }
          if (Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key);
            resolve(Ok(null));
            return;
          }
          resolve(Ok(entry.data));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get from IndexedDB", error));
    }
  }
  async set(key, value, ttl) {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }
      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const entry = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };
      return new Promise((resolve) => {
        const request = store.put(entry);
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to set in IndexedDB")));
        };
        request.onsuccess = () => {
          resolve(Ok(void 0));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to set in IndexedDB", error));
    }
  }
  async delete(key) {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }
      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve) => {
        const request = store.delete(key);
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to delete from IndexedDB")));
        };
        request.onsuccess = () => {
          resolve(Ok(void 0));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to delete from IndexedDB", error));
    }
  }
  async clear() {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }
      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve) => {
        const request = store.clear();
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to clear IndexedDB")));
        };
        request.onsuccess = () => {
          resolve(Ok(void 0));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to clear IndexedDB", error));
    }
  }
  async has(key) {
    const result = await this.get(key);
    return result.success ? Ok(result.data !== null) : result;
  }
  async size() {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return Ok(0);
      }
      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve) => {
        const request = store.count();
        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError("Failed to get IndexedDB size")));
        };
        request.onsuccess = () => {
          resolve(Ok(request.result));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError("Failed to get IndexedDB size", error));
    }
  }
}
class CacheManager {
  constructor(config) {
    this.layers = /* @__PURE__ */ new Map();
    this.config = config;
    this.initializeLayers();
  }
  initializeLayers() {
    this.layers.set("memory", new MemoryCache(this.config.maxSize));
    if (this.config.storage === "localStorage") {
      this.layers.set("localStorage", new LocalStorageCache(this.config.prefix, this.config.maxSize));
    } else if (this.config.storage === "sessionStorage") {
      this.layers.set("localStorage", new LocalStorageCache(this.config.prefix, this.config.maxSize));
    }
    if (typeof window !== "undefined" && window.indexedDB) {
      this.layers.set("indexedDB", new IndexedDBCache(this.config.prefix));
    }
  }
  /**
   * Get value from cache (checks all layers)
   */
  async get(key) {
    if (!this.config.enabled) {
      return Ok(null);
    }
    for (const [layerName, layer] of this.layers) {
      const result = await layer.get(key);
      if (result.success && result.data !== null) {
        await this.promote(key, result.data, layerName);
        return result;
      }
    }
    return Ok(null);
  }
  /**
   * Set value in cache (sets in all layers)
   */
  async set(key, value, ttl) {
    if (!this.config.enabled) {
      return Ok(void 0);
    }
    const finalTtl = ttl ?? this.config.ttl;
    const errors = [];
    for (const layer of this.layers.values()) {
      const result = await layer.set(key, value, finalTtl);
      if (!result.success) {
        errors.push(result.error);
      }
    }
    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError("Failed to set in some cache layers", errors));
    }
    return Ok(void 0);
  }
  /**
   * Delete value from all cache layers
   */
  async delete(key) {
    const errors = [];
    for (const layer of this.layers.values()) {
      const result = await layer.delete(key);
      if (!result.success) {
        errors.push(result.error);
      }
    }
    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError("Failed to delete from some cache layers", errors));
    }
    return Ok(void 0);
  }
  /**
   * Clear all cache layers
   */
  async clear() {
    const errors = [];
    for (const layer of this.layers.values()) {
      const result = await layer.clear();
      if (!result.success) {
        errors.push(result.error);
      }
    }
    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError("Failed to clear some cache layers", errors));
    }
    return Ok(void 0);
  }
  /**
   * Check if key exists in any cache layer
   */
  async has(key) {
    if (!this.config.enabled) {
      return Ok(false);
    }
    for (const layer of this.layers.values()) {
      const result = await layer.has(key);
      if (result.success && result.data) {
        return Ok(true);
      }
    }
    return Ok(false);
  }
  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = {};
    for (const [layerName, layer] of this.layers) {
      const sizeResult = await layer.size();
      if (sizeResult.success) {
        stats[layerName] = sizeResult.data;
      }
    }
    return Ok(stats);
  }
  /**
   * Promote value to higher cache layers
   */
  async promote(key, value, foundLayer) {
    const layerOrder = ["memory", "localStorage", "indexedDB"];
    const foundIndex = layerOrder.indexOf(foundLayer);
    for (let i = 0; i < foundIndex; i++) {
      const layerName = layerOrder[i];
      if (layerName) {
        const layer = this.layers.get(layerName);
        if (layer) {
          await layer.set(key, value, this.config.ttl);
        }
      }
    }
  }
}
class ProductService {
  constructor(client, cache) {
    this.client = client;
    this.cache = cache;
  }
  /**
   * List products with filtering and pagination
   */
  async list(params = {}) {
    try {
      const validationResult = this.validateListParams(params);
      if (!validationResult.success) {
        return validationResult;
      }
      const queryParams = this.buildQueryParams(params);
      const cacheKey = `products:list:${JSON.stringify(queryParams)}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get(
        `/products?${new URLSearchParams(queryParams).toString()}`
      );
      if (!response.success) {
        return response;
      }
      const totalProducts = parseInt(response.data.headers["x-wp-total"] || "0");
      const totalPages = parseInt(response.data.headers["x-wp-totalpages"] || "0");
      const products = [];
      for (const product of response.data.data) {
        try {
          const validated = ProductSchema.parse(product);
          products.push(validated);
        } catch (error) {
        }
      }
      const result = {
        products,
        totalProducts,
        totalPages,
        currentPage: params.page || 1,
        perPage: params.limit || 10
      };
      await this.cache.set(cacheKey, result);
      return Ok(result);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to list products",
        500,
        error
      ));
    }
  }
  /**
   * Get a single product by ID
   */
  async get(productId) {
    try {
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError("Invalid product ID"));
      }
      const cacheKey = `products:single:${productId}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get(`/products/${productId}`);
      if (!response.success) {
        if (response.error.statusCode === 404) {
          return Err(ErrorFactory.productNotFoundError(productId));
        }
        return response;
      }
      try {
        const validated = ProductSchema.parse(response.data.data);
        const product = validated;
        await this.cache.set(cacheKey, product);
        return Ok(product);
      } catch (error) {
        return Err(ErrorFactory.validationError(
          "Invalid product data received from API",
          error
        ));
      }
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get product",
        500,
        error
      ));
    }
  }
  /**
   * Get product by slug
   */
  async getBySlug(slug) {
    try {
      if (!slug || slug.trim().length === 0) {
        return Err(ErrorFactory.validationError("Invalid product slug"));
      }
      const result = await this.list({
        search: slug,
        limit: 1
      });
      if (!result.success) {
        return result;
      }
      const product = result.data.products.find((p) => p.slug === slug);
      if (!product) {
        return Err(ErrorFactory.productNotFoundError(slug));
      }
      return Ok(product);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get product by slug",
        500,
        error
      ));
    }
  }
  /**
   * Get product variations
   */
  async getVariations(productId, params = {}) {
    try {
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError("Invalid product ID"));
      }
      const queryParams = this.buildVariationQueryParams(params);
      const cacheKey = `products:${productId}:variations:${JSON.stringify(queryParams)}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get(
        `/products/${productId}/variations?${new URLSearchParams(queryParams).toString()}`
      );
      if (!response.success) {
        return response;
      }
      await this.cache.set(cacheKey, response.data.data);
      return Ok(response.data.data);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get product variations",
        500,
        error
      ));
    }
  }
  /**
   * Search products by keyword
   */
  async search(query, params = {}) {
    if (!query || query.trim().length === 0) {
      return Err(ErrorFactory.validationError("Search query cannot be empty"));
    }
    return this.list({ ...params, search: query });
  }
  /**
   * Get products by category
   */
  async getByCategory(categoryId, params = {}) {
    return this.list({ ...params, category: categoryId });
  }
  /**
   * Get featured products
   */
  async getFeatured(params = {}) {
    return this.list({ ...params, featured: true });
  }
  /**
   * Get on-sale products
   */
  async getOnSale(params = {}) {
    return this.list({ ...params, onSale: true });
  }
  /**
   * Validate list parameters
   */
  validateListParams(params) {
    if (params.page !== void 0 && params.page < 1) {
      return Err(ErrorFactory.validationError("Page must be greater than 0"));
    }
    if (params.limit !== void 0 && (params.limit < 1 || params.limit > 100)) {
      return Err(ErrorFactory.validationError("Limit must be between 1 and 100"));
    }
    if (params.minPrice !== void 0 && params.minPrice < 0) {
      return Err(ErrorFactory.validationError("Min price cannot be negative"));
    }
    if (params.maxPrice !== void 0 && params.maxPrice < 0) {
      return Err(ErrorFactory.validationError("Max price cannot be negative"));
    }
    if (params.minPrice !== void 0 && params.maxPrice !== void 0 && params.minPrice > params.maxPrice) {
      return Err(ErrorFactory.validationError("Min price cannot be greater than max price"));
    }
    return Ok(void 0);
  }
  /**
   * Build query parameters for product list
   */
  buildQueryParams(params) {
    const queryParams = {};
    if (params.page)
      queryParams.page = params.page.toString();
    if (params.limit)
      queryParams.per_page = params.limit.toString();
    if (params.search)
      queryParams.search = params.search;
    if (params.category)
      queryParams.category = params.category.toString();
    if (params.tag)
      queryParams.tag = params.tag.toString();
    if (params.status)
      queryParams.status = params.status;
    if (params.featured !== void 0)
      queryParams.featured = params.featured.toString();
    if (params.onSale !== void 0)
      queryParams.on_sale = params.onSale.toString();
    if (params.orderby)
      queryParams.orderby = params.orderby;
    if (params.order)
      queryParams.order = params.order;
    if (params.offset)
      queryParams.offset = params.offset.toString();
    if (params.inStock !== void 0) {
      queryParams.stock_status = params.inStock ? "instock" : "outofstock";
    }
    if (params.minPrice !== void 0) {
      queryParams.min_price = params.minPrice.toString();
    }
    if (params.maxPrice !== void 0) {
      queryParams.max_price = params.maxPrice.toString();
    }
    if (params.include?.length) {
      queryParams.include = params.include.join(",");
    }
    if (params.exclude?.length) {
      queryParams.exclude = params.exclude.join(",");
    }
    if (params.parent?.length) {
      queryParams.parent = params.parent.join(",");
    }
    return queryParams;
  }
  /**
   * Build query parameters for variation list
   */
  buildVariationQueryParams(params) {
    const queryParams = {};
    if (params.page)
      queryParams.page = params.page.toString();
    if (params.limit)
      queryParams.per_page = params.limit.toString();
    if (params.search)
      queryParams.search = params.search;
    if (params.status)
      queryParams.status = params.status;
    if (params.onSale !== void 0)
      queryParams.on_sale = params.onSale.toString();
    if (params.inStock !== void 0) {
      queryParams.stock_status = params.inStock ? "instock" : "outofstock";
    }
    if (params.minPrice !== void 0) {
      queryParams.min_price = params.minPrice.toString();
    }
    if (params.maxPrice !== void 0) {
      queryParams.max_price = params.maxPrice.toString();
    }
    return queryParams;
  }
}
const CartItemMetaSchema = z$1.object({
  key: z$1.string(),
  value: z$1.string(),
  displayKey: z$1.string().optional(),
  displayValue: z$1.string().optional()
});
const CartQuantityLimitsSchema = z$1.object({
  min: z$1.number().min(0),
  max: z$1.number().min(1),
  step: z$1.number().min(1)
});
const CartItemSchema = z$1.object({
  key: z$1.string(),
  productId: z$1.number().positive(),
  variationId: z$1.number().positive().optional(),
  quantity: z$1.number().positive(),
  name: z$1.string(),
  price: z$1.number().min(0),
  regularPrice: z$1.number().min(0),
  salePrice: z$1.number().min(0).optional(),
  totalPrice: z$1.number().min(0),
  total: z$1.number().min(0),
  sku: z$1.string().optional(),
  weight: z$1.number().min(0).optional(),
  dimensions: z$1.object({
    length: z$1.string(),
    width: z$1.string(),
    height: z$1.string()
  }).optional(),
  image: z$1.object({
    id: z$1.number().positive(),
    src: z$1.string().url(),
    alt: z$1.string()
  }).optional(),
  stockQuantity: z$1.number().min(0).optional(),
  stockStatus: z$1.enum(["instock", "outofstock", "onbackorder"]),
  backorders: z$1.enum(["no", "notify", "yes"]),
  quantityLimits: CartQuantityLimitsSchema.optional(),
  meta: z$1.array(CartItemMetaSchema).optional(),
  attributes: z$1.record(z$1.string()).optional(),
  addedAt: z$1.date(),
  updatedAt: z$1.date()
});
const CartTotalsSchema = z$1.object({
  subtotal: z$1.number().min(0),
  subtotalTax: z$1.number().min(0),
  shippingTotal: z$1.number().min(0),
  shippingTax: z$1.number().min(0),
  discountTotal: z$1.number().min(0),
  discountTax: z$1.number().min(0),
  cartContentsTotal: z$1.number().min(0),
  cartContentsTax: z$1.number().min(0),
  feeTotal: z$1.number().min(0),
  feeTax: z$1.number().min(0),
  total: z$1.number().min(0),
  totalTax: z$1.number().min(0)
});
const AppliedCouponSchema = z$1.object({
  code: z$1.string(),
  discountType: z$1.enum(["percent", "fixed_cart", "fixed_product"]),
  amount: z$1.number().min(0),
  description: z$1.string().optional(),
  freeShipping: z$1.boolean(),
  expiryDate: z$1.date().optional(),
  usageLimit: z$1.number().positive().optional(),
  usageCount: z$1.number().min(0),
  individualUse: z$1.boolean(),
  productIds: z$1.array(z$1.number().positive()).optional(),
  excludedProductIds: z$1.array(z$1.number().positive()).optional(),
  categoryIds: z$1.array(z$1.number().positive()).optional(),
  excludedCategoryIds: z$1.array(z$1.number().positive()).optional(),
  minimumAmount: z$1.number().min(0).optional(),
  maximumAmount: z$1.number().min(0).optional()
});
const CartSchema = z$1.object({
  items: z$1.array(CartItemSchema),
  itemCount: z$1.number().min(0),
  totals: CartTotalsSchema,
  appliedCoupons: z$1.array(AppliedCouponSchema),
  shippingMethods: z$1.array(z$1.any()),
  // TODO: Define shipping method schema
  chosenShippingMethods: z$1.array(z$1.string()),
  fees: z$1.array(z$1.any()),
  // TODO: Define fee schema
  needsShipping: z$1.boolean(),
  needsPayment: z$1.boolean(),
  hasCalculatedShipping: z$1.boolean(),
  currency: z$1.string(),
  currencySymbol: z$1.string(),
  pricesIncludeTax: z$1.boolean(),
  taxDisplayMode: z$1.enum(["incl", "excl"]),
  crossSells: z$1.array(z$1.number().positive()),
  isEmpty: z$1.boolean(),
  createdAt: z$1.date(),
  updatedAt: z$1.date(),
  expiresAt: z$1.date().optional(),
  customerId: z$1.number().positive().optional(),
  sessionId: z$1.string()
});
const CartAddItemRequestSchema = z$1.object({
  productId: z$1.number().positive(),
  variationId: z$1.number().positive().optional(),
  quantity: z$1.number().positive(),
  attributes: z$1.record(z$1.string()).optional(),
  meta: z$1.array(CartItemMetaSchema).optional(),
  replace: z$1.boolean().optional()
});
z$1.object({
  productId: z$1.number().positive(),
  variationId: z$1.number().positive().optional(),
  quantity: z$1.number().positive(),
  attributes: z$1.record(z$1.string()).optional(),
  meta: z$1.array(CartItemMetaSchema).optional()
});
function isCart(obj) {
  try {
    CartSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
class CartSyncManager {
  constructor(config, httpClient, deviceId) {
    this.syncStatus = "idle";
    this.backgroundSyncTimer = void 0;
    this.isOnline = true;
    this.syncQueue = [];
    this.eventHandlers = [];
    this.config = config;
    this.httpClient = httpClient;
    this.deviceId = deviceId ?? this.generateDeviceId();
    this.setupNetworkMonitoring();
    this.setupBackgroundSync();
  }
  /**
   * Get current sync status
   */
  getStatus() {
    return this.syncStatus;
  }
  /**
   * Get last sync timestamp
   */
  getLastSyncAt() {
    return this.lastSyncAt;
  }
  /**
   * Add event handler
   */
  addEventHandler(handler) {
    this.eventHandlers.push(handler);
  }
  /**
   * Remove event handler
   */
  removeEventHandler(handler) {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }
  /**
   * Sync cart with server
   */
  async syncCart(localCart, authContext) {
    if (!this.config.enabled) {
      return Ok({
        success: true,
        status: "idle",
        conflicts: [],
        syncedAt: /* @__PURE__ */ new Date(),
        changes: {
          itemsAdded: 0,
          itemsUpdated: 0,
          itemsRemoved: 0,
          couponsAdded: 0,
          couponsRemoved: 0
        }
      });
    }
    if (!authContext.isAuthenticated || !authContext.userId) {
      return Err(ErrorFactory.cartError(
        "User must be authenticated for cart synchronization",
        { context: "sync_cart" }
      ));
    }
    this.setSyncStatus("syncing");
    this.notifyEventHandlers("onSyncStart");
    try {
      const serverCartResult = await this.fetchServerCart(authContext.userId.toString());
      if (!serverCartResult.success) {
        this.setSyncStatus("failed");
        this.notifyEventHandlers("onSyncError", serverCartResult.error);
        return serverCartResult;
      }
      const serverCartData = serverCartResult.data;
      if (!serverCartData) {
        const uploadResult2 = await this.uploadCart(localCart, authContext);
        if (!uploadResult2.success) {
          this.setSyncStatus("failed");
          this.notifyEventHandlers("onSyncError", uploadResult2.error);
          return uploadResult2;
        }
        const result2 = {
          success: true,
          status: "synced",
          conflicts: [],
          mergedCart: localCart,
          syncedAt: /* @__PURE__ */ new Date(),
          changes: {
            itemsAdded: 0,
            itemsUpdated: 0,
            itemsRemoved: 0,
            couponsAdded: 0,
            couponsRemoved: 0
          }
        };
        this.setSyncStatus("synced");
        this.lastSyncAt = /* @__PURE__ */ new Date();
        this.notifyEventHandlers("onSyncComplete", result2);
        return Ok(result2);
      }
      const mergeResult = await this.mergeCarts(localCart, serverCartData.cart);
      if (!mergeResult.success) {
        this.setSyncStatus("failed");
        this.notifyEventHandlers("onSyncError", mergeResult.error);
        return mergeResult;
      }
      const { mergedCart, conflicts, changes } = mergeResult.data;
      if (conflicts.length > 0) {
        this.setSyncStatus("conflict");
        this.notifyEventHandlers("onConflictDetected", conflicts);
        const resolveResult = await this.resolveConflicts(
          localCart,
          serverCartData.cart,
          conflicts,
          this.config.conflictResolution
        );
        if (!resolveResult.success) {
          this.setSyncStatus("failed");
          this.notifyEventHandlers("onSyncError", resolveResult.error);
          return resolveResult;
        }
      }
      const uploadResult = await this.uploadCart(mergedCart, authContext);
      if (!uploadResult.success) {
        this.setSyncStatus("failed");
        this.notifyEventHandlers("onSyncError", uploadResult.error);
        return uploadResult;
      }
      const result = {
        success: true,
        status: "synced",
        conflicts,
        mergedCart,
        syncedAt: /* @__PURE__ */ new Date(),
        changes
      };
      this.setSyncStatus("synced");
      this.lastSyncAt = /* @__PURE__ */ new Date();
      this.notifyEventHandlers("onSyncComplete", result);
      return Ok(result);
    } catch (error) {
      const cartError = ErrorFactory.cartError(
        "Cart synchronization failed",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      this.setSyncStatus("failed");
      this.notifyEventHandlers("onSyncError", cartError);
      return Err(cartError);
    }
  }
  /**
   * Queue cart action for offline sync
   */
  queueAction(action, data) {
    if (!this.config.enabled || this.isOnline) {
      return;
    }
    const queueItem = {
      id: this.generateId(),
      action,
      data,
      timestamp: /* @__PURE__ */ new Date(),
      retryCount: 0
    };
    this.syncQueue.push(queueItem);
    if (this.syncQueue.length > this.config.offlineQueueSize) {
      this.syncQueue.shift();
    }
  }
  /**
   * Process offline sync queue
   */
  async processQueue(localCart, authContext) {
    if (!this.config.enabled || !authContext.isAuthenticated || this.syncQueue.length === 0) {
      return Ok(void 0);
    }
    const failedItems = [];
    for (const item of this.syncQueue) {
      try {
        await this.processQueueItem(item, localCart, authContext);
      } catch (error) {
        item.retryCount++;
        if (item.retryCount < this.config.maxRetries) {
          failedItems.push(item);
        }
      }
    }
    this.syncQueue = failedItems;
    return Ok(void 0);
  }
  /**
   * Enable cart synchronization
   */
  enable() {
    this.config = {
      ...this.config,
      enabled: true
    };
    this.setupBackgroundSync();
  }
  /**
   * Disable cart synchronization
   */
  disable() {
    this.config = {
      ...this.config,
      enabled: false
    };
    this.stopBackgroundSync();
  }
  /**
   * Clean up resources
   */
  destroy() {
    this.stopBackgroundSync();
    this.eventHandlers.length = 0;
    this.syncQueue.length = 0;
  }
  // PRIVATE METHODS
  /**
   * Fetch cart from server
   */
  async fetchServerCart(userId) {
    try {
      const response = await this.httpClient.get(`/cart/user/${userId}`);
      if (!response.success) {
        if (response.error.message.includes("404") || response.error.message.includes("not found")) {
          return Ok(null);
        }
        return Err(ErrorFactory.cartError(
          "Failed to fetch server cart",
          { userId, error: response.error }
        ));
      }
      return Ok(response.data.data);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Network error fetching server cart",
        { userId, error: error instanceof Error ? error.message : "Unknown error" }
      ));
    }
  }
  /**
   * Upload cart to server
   */
  async uploadCart(cart, authContext) {
    try {
      const metadata = {
        deviceId: this.deviceId,
        lastSyncAt: /* @__PURE__ */ new Date(),
        syncVersion: 1,
        userId: authContext.userId.toString(),
        // Convert number to string
        sessionId: cart.sessionId,
        source: "local"
      };
      const serverCartData = {
        cart,
        metadata
      };
      const response = await this.httpClient.post(`/cart/user/${authContext.userId}`, serverCartData);
      if (!response.success) {
        return Err(ErrorFactory.cartError(
          "Failed to upload cart to server",
          { userId: authContext.userId, error: response.error }
        ));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Network error uploading cart",
        { userId: authContext.userId, error: error instanceof Error ? error.message : "Unknown error" }
      ));
    }
  }
  /**
   * Merge local and server carts with conflict detection
   */
  async mergeCarts(localCart, serverCart) {
    const conflicts = [];
    const changes = {
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      couponsAdded: 0,
      couponsRemoved: 0
    };
    try {
      const itemMergeResult = await this.mergeCartItems(
        localCart.items,
        serverCart.items,
        this.config.strategy
      );
      if (!itemMergeResult.success) {
        return itemMergeResult;
      }
      const { mergedItems, itemConflicts } = itemMergeResult.data;
      conflicts.push(...itemConflicts);
      changes.itemsAdded = mergedItems.filter(
        (item) => !localCart.items.some((local) => local.key === item.key)
      ).length;
      changes.itemsUpdated = mergedItems.filter((item) => {
        const localItem = localCart.items.find((local) => local.key === item.key);
        return localItem && localItem.quantity !== item.quantity;
      }).length;
      changes.itemsRemoved = localCart.items.filter(
        (item) => !mergedItems.some((merged) => merged.key === item.key)
      ).length;
      const couponMergeResult = this.mergeCoupons(
        localCart.appliedCoupons,
        serverCart.appliedCoupons
      );
      conflicts.push(...couponMergeResult.conflicts);
      changes.couponsAdded = couponMergeResult.couponsAdded;
      changes.couponsRemoved = couponMergeResult.couponsRemoved;
      const mergedCart = {
        ...localCart,
        items: mergedItems,
        appliedCoupons: couponMergeResult.mergedCoupons,
        itemCount: mergedItems.reduce((sum, item) => sum + item.quantity, 0),
        updatedAt: /* @__PURE__ */ new Date()
      };
      return Ok({
        mergedCart,
        conflicts,
        changes
      });
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to merge carts",
        { error: error instanceof Error ? error.message : "Unknown error" }
      ));
    }
  }
  /**
   * Merge cart items with conflict detection
   */
  async mergeCartItems(localItems, serverItems, strategy) {
    const mergedItems = [];
    const itemConflicts = [];
    const processedKeys = /* @__PURE__ */ new Set();
    try {
      for (const localItem of localItems) {
        const serverItem = serverItems.find((item) => item.key === localItem.key);
        processedKeys.add(localItem.key);
        if (!serverItem) {
          mergedItems.push(localItem);
        } else if (localItem.quantity === serverItem.quantity) {
          mergedItems.push(localItem);
        } else {
          const conflict = {
            type: "item_quantity",
            itemKey: localItem.key,
            localValue: localItem.quantity,
            serverValue: serverItem.quantity,
            message: `Quantity mismatch for ${localItem.name}`,
            suggestion: this.getQuantityMergeSuggestion(strategy, localItem.quantity, serverItem.quantity)
          };
          itemConflicts.push(conflict);
          const resolvedQuantity = this.resolveQuantityConflict(
            strategy,
            localItem.quantity,
            serverItem.quantity
          );
          mergedItems.push({
            ...localItem,
            quantity: resolvedQuantity,
            totalPrice: localItem.price * resolvedQuantity,
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      for (const serverItem of serverItems) {
        if (!processedKeys.has(serverItem.key)) {
          mergedItems.push(serverItem);
        }
      }
      return Ok({
        mergedItems,
        itemConflicts
      });
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to merge cart items",
        { error: error instanceof Error ? error.message : "Unknown error" }
      ));
    }
  }
  /**
   * Merge applied coupons
   */
  mergeCoupons(localCoupons, serverCoupons) {
    const mergedCoupons = [];
    const conflicts = [];
    const processedCodes = /* @__PURE__ */ new Set();
    let couponsAdded = 0;
    let couponsRemoved = 0;
    for (const localCoupon of localCoupons) {
      processedCodes.add(localCoupon.code);
      mergedCoupons.push(localCoupon);
    }
    for (const serverCoupon of serverCoupons) {
      if (!processedCodes.has(serverCoupon.code)) {
        mergedCoupons.push(serverCoupon);
        couponsAdded++;
      }
    }
    couponsRemoved = serverCoupons.filter(
      (coupon) => !localCoupons.some((local) => local.code === coupon.code)
    ).length;
    return {
      mergedCoupons,
      conflicts,
      couponsAdded,
      couponsRemoved
    };
  }
  /**
   * Resolve conflicts based on strategy
   */
  async resolveConflicts(localCart, serverCart, conflicts, strategy) {
    return Ok(localCart);
  }
  /**
   * Resolve quantity conflict based on strategy
   */
  resolveQuantityConflict(strategy, localQuantity, serverQuantity) {
    switch (strategy) {
      case "local_wins":
        return localQuantity;
      case "server_wins":
        return serverQuantity;
      case "merge_quantities":
        return localQuantity + serverQuantity;
      case "merge_smart":
      default:
        return Math.max(localQuantity, serverQuantity);
    }
  }
  /**
   * Get quantity merge suggestion for conflict
   */
  getQuantityMergeSuggestion(strategy, localQuantity, serverQuantity) {
    switch (strategy) {
      case "local_wins":
        return `Keep local quantity: ${localQuantity}`;
      case "server_wins":
        return `Use server quantity: ${serverQuantity}`;
      case "merge_quantities":
        return `Add quantities: ${localQuantity + serverQuantity}`;
      case "merge_smart":
      default:
        return `Use higher quantity: ${Math.max(localQuantity, serverQuantity)}`;
    }
  }
  /**
   * Process individual queue item
   */
  async processQueueItem(item, localCart, authContext) {
    console.warn("Cart sync queue processing not yet implemented for action:", item.action);
  }
  /**
   * Set sync status and notify handlers
   */
  setSyncStatus(status) {
    this.syncStatus = status;
  }
  /**
   * Notify event handlers
   */
  notifyEventHandlers(event, ...args) {
    for (const handler of this.eventHandlers) {
      try {
        switch (event) {
          case "onSyncStart":
            handler.onSyncStart();
            break;
          case "onSyncComplete":
            handler.onSyncComplete(args[0]);
            break;
          case "onSyncError":
            handler.onSyncError(args[0]);
            break;
          case "onConflictDetected":
            handler.onConflictDetected(args[0]);
            break;
        }
      } catch (error) {
        console.error("Error in cart sync event handler:", error);
      }
    }
  }
  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      this.isOnline = navigator.onLine;
      window.addEventListener("online", () => {
        this.isOnline = true;
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }
  /**
   * Setup background sync timer
   */
  setupBackgroundSync() {
    if (!this.config.enabled || !this.config.backgroundSync) {
      return;
    }
    this.stopBackgroundSync();
    this.backgroundSyncTimer = setInterval(() => {
    }, this.config.syncIntervalMs);
  }
  /**
   * Stop background sync timer
   */
  stopBackgroundSync() {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = void 0;
    }
  }
  /**
   * Generate unique device ID
   */
  generateDeviceId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "device-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
class CartPersistenceManager {
  constructor(config) {
    this.config = config;
  }
  /**
   * Save cart to persistent storage
   */
  async save(cart) {
    try {
      const serialized = JSON.stringify(cart, (_, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      switch (this.config.strategy) {
        case "localStorage":
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(this.getStorageKey(), serialized);
          }
          break;
        case "sessionStorage":
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(this.getStorageKey(), serialized);
          }
          break;
        case "indexedDB":
          return this.saveToIndexedDB(cart);
        case "server":
          return this.saveToServer(cart);
        case "none":
          break;
        default:
          return Err(ErrorFactory.configurationError("Invalid persistence strategy"));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to save cart",
        error
      ));
    }
  }
  /**
   * Load cart from persistent storage
   */
  async load() {
    try {
      let serialized = null;
      switch (this.config.strategy) {
        case "localStorage":
          if (typeof localStorage !== "undefined") {
            serialized = localStorage.getItem(this.getStorageKey());
          }
          break;
        case "sessionStorage":
          if (typeof sessionStorage !== "undefined") {
            serialized = sessionStorage.getItem(this.getStorageKey());
          }
          break;
        case "indexedDB":
          return this.loadFromIndexedDB();
        case "server":
          return this.loadFromServer();
        case "none":
          return Ok(null);
        default:
          return Err(ErrorFactory.configurationError("Invalid persistence strategy"));
      }
      if (!serialized) {
        return Ok(null);
      }
      const parsed = JSON.parse(serialized, (_, value) => {
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
      if (isCart(parsed)) {
        return Ok(parsed);
      } else {
        return Err(ErrorFactory.validationError("Invalid cart data in storage"));
      }
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to load cart",
        error
      ));
    }
  }
  /**
   * Clear cart from persistent storage
   */
  async clear() {
    try {
      switch (this.config.strategy) {
        case "localStorage":
          if (typeof localStorage !== "undefined") {
            localStorage.removeItem(this.getStorageKey());
          }
          break;
        case "sessionStorage":
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(this.getStorageKey());
          }
          break;
        case "indexedDB":
          return this.clearFromIndexedDB();
        case "server":
          return this.clearFromServer();
        case "none":
          break;
        default:
          return Err(ErrorFactory.configurationError("Invalid persistence strategy"));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to clear cart",
        error
      ));
    }
  }
  getStorageKey() {
    return this.config.key || "woo-headless-cart";
  }
  async saveToIndexedDB(cart) {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        return Err(ErrorFactory.persistenceError("IndexedDB not available"));
      }
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["carts"], "readwrite");
      const store = transaction.objectStore("carts");
      await new Promise((resolve, reject) => {
        const request = store.put({
          id: this.getStorageKey(),
          cart,
          timestamp: Date.now(),
          expiresAt: this.config.expirationDays ? Date.now() + this.config.expirationDays * 24 * 60 * 60 * 1e3 : null
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to save cart to IndexedDB",
        error
      ));
    }
  }
  async loadFromIndexedDB() {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        return Ok(null);
      }
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["carts"], "readonly");
      const store = transaction.objectStore("carts");
      const result = await new Promise((resolve, reject) => {
        const request = store.get(this.getStorageKey());
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      if (!result) {
        return Ok(null);
      }
      if (result.expiresAt && Date.now() > result.expiresAt) {
        await this.clearFromIndexedDB();
        return Ok(null);
      }
      if (isCart(result.cart)) {
        return Ok(result.cart);
      } else {
        return Err(ErrorFactory.validationError("Invalid cart data in IndexedDB"));
      }
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to load cart from IndexedDB",
        error
      ));
    }
  }
  async clearFromIndexedDB() {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        return Ok(void 0);
      }
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["carts"], "readwrite");
      const store = transaction.objectStore("carts");
      await new Promise((resolve, reject) => {
        const request = store.delete(this.getStorageKey());
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to clear cart from IndexedDB",
        error
      ));
    }
  }
  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("WooHeadlessCart", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("carts")) {
          const store = db.createObjectStore("carts", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      };
    });
  }
  async saveToServer(cart) {
    try {
      if (!this.config.syncToServer) {
        return Err(ErrorFactory.configurationError(
          "Server sync is disabled",
          "Enable syncToServer in cart persistence config"
        ));
      }
      const cartData = {
        sessionId: cart.sessionId,
        customerId: cart.customerId,
        items: cart.items,
        totals: cart.totals,
        appliedCoupons: cart.appliedCoupons,
        updatedAt: cart.updatedAt.toISOString(),
        expiresAt: cart.expiresAt?.toISOString()
      };
      console.warn("Server-side cart persistence requires custom implementation");
      console.log("Cart data to sync:", cartData);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to save cart to server",
        error
      ));
    }
  }
  async loadFromServer() {
    try {
      if (!this.config.syncToServer) {
        return Ok(null);
      }
      console.warn("Server-side cart persistence requires custom implementation");
      return Ok(null);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to load cart from server",
        error
      ));
    }
  }
  async clearFromServer() {
    try {
      if (!this.config.syncToServer) {
        return Ok(void 0);
      }
      console.warn("Server-side cart persistence requires custom implementation");
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.persistenceError(
        "Failed to clear cart from server",
        error
      ));
    }
  }
}
class CartTotalsCalculator {
  constructor(config) {
    this.config = config;
  }
  /**
   * Calculate comprehensive cart totals
   */
  calculate(items, appliedCoupons = [], shippingMethods = [], fees = [], customerData) {
    const subtotal = this.calculateSubtotal(items);
    const subtotalTax = this.calculateSubtotalTax(items, customerData);
    const { discountTotal, discountTax } = this.calculateDiscounts(items, appliedCoupons, customerData);
    const cartContentsTotal = Math.max(0, subtotal - discountTotal);
    const cartContentsTax = Math.max(0, subtotalTax - discountTax);
    const { shippingTotal, shippingTax } = this.calculateShipping(shippingMethods, cartContentsTotal, customerData);
    const { feeTotal, feeTax } = this.calculateFees(fees, cartContentsTotal, customerData);
    const totalTax = cartContentsTax + shippingTax + feeTax;
    const total = this.calculateFinalTotal(cartContentsTotal, shippingTotal, feeTotal, totalTax);
    return {
      subtotal: this.roundTotal(subtotal),
      subtotalTax: this.roundTotal(subtotalTax),
      tax: this.roundTotal(totalTax),
      shipping: this.roundTotal(shippingTotal),
      shippingTotal: this.roundTotal(shippingTotal),
      // alias for shipping
      shippingTax: this.roundTotal(shippingTax),
      discount: this.roundTotal(discountTotal),
      discountTotal: this.roundTotal(discountTotal),
      // alias for discount
      discountTax: this.roundTotal(discountTax),
      fees: this.roundTotal(feeTotal),
      feeTotal: this.roundTotal(feeTotal),
      // alias for fees
      feeTax: this.roundTotal(feeTax),
      total: this.roundTotal(total),
      totalTax: this.roundTotal(totalTax),
      cartContentsTotal: this.roundTotal(cartContentsTotal),
      cartContentsTax: this.roundTotal(cartContentsTax)
    };
  }
  calculateSubtotal(items) {
    return items.reduce((sum, item) => {
      if (this.config.taxCalculation.pricesIncludeTax) {
        return sum + item.totalPrice;
      } else {
        return sum + item.regularPrice * item.quantity;
      }
    }, 0);
  }
  calculateSubtotalTax(items, customerData) {
    if (!this.config.taxCalculation.enabled) {
      return 0;
    }
    const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
    return items.reduce((sum, item) => {
      const itemSubtotal = item.regularPrice * item.quantity;
      if (this.config.taxCalculation.pricesIncludeTax) {
        return sum + itemSubtotal * taxRate / (1 + taxRate);
      } else {
        return sum + itemSubtotal * taxRate;
      }
    }, 0);
  }
  calculateDiscounts(items, coupons, customerData) {
    let discountTotal = 0;
    let discountTax = 0;
    for (const coupon of coupons) {
      const discount = this.calculateSingleCouponDiscount(items, coupon);
      discountTotal += discount;
      if (this.config.taxCalculation.enabled && !this.config.taxCalculation.pricesIncludeTax) {
        const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
        discountTax += discount * taxRate;
      }
    }
    return { discountTotal, discountTax };
  }
  calculateSingleCouponDiscount(items, coupon) {
    const applicableItems = items.filter((item) => this.couponAppliesToItem(item, coupon));
    if (applicableItems.length === 0) {
      return 0;
    }
    const applicableSubtotal = applicableItems.reduce((sum, item) => sum + item.totalPrice, 0);
    switch (coupon.discountType) {
      case "fixed_cart":
        return Math.min(coupon.amount, applicableSubtotal);
      case "percent":
        const percentDiscount = applicableSubtotal * (coupon.amount / 100);
        return coupon.maximumAmount ? Math.min(percentDiscount, coupon.maximumAmount) : percentDiscount;
      case "fixed_product":
        return Math.min(
          applicableItems.reduce((sum, item) => sum + coupon.amount * item.quantity, 0),
          applicableSubtotal
        );
      default:
        return 0;
    }
  }
  couponAppliesToItem(item, coupon) {
    if (coupon.productIds && coupon.productIds.length > 0) {
      if (!coupon.productIds.includes(item.productId)) {
        return false;
      }
    }
    if (coupon.excludedProductIds && coupon.excludedProductIds.includes(item.productId)) {
      return false;
    }
    return true;
  }
  calculateShipping(shippingMethods, _cartTotal, customerData) {
    if (!this.config.enableShipping || shippingMethods.length === 0) {
      return { shippingTotal: 0, shippingTax: 0 };
    }
    const selectedMethod = shippingMethods[0];
    if (!selectedMethod) {
      return { shippingTotal: 0, shippingTax: 0 };
    }
    const shippingTotal = selectedMethod.cost;
    let shippingTax = 0;
    if (this.config.taxCalculation.enabled && selectedMethod.taxable) {
      const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
      shippingTax = selectedMethod.taxes?.reduce((sum, tax) => sum + tax.total, 0) || shippingTotal * taxRate;
    }
    return { shippingTotal, shippingTax };
  }
  calculateFees(fees, _cartTotal, customerData) {
    if (!this.config.enableFees || fees.length === 0) {
      return { feeTotal: 0, feeTax: 0 };
    }
    const feeTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);
    let feeTax = 0;
    if (this.config.taxCalculation.enabled) {
      const taxRate = customerData?.taxRate || this.getDefaultTaxRate(customerData?.country, customerData?.state);
      feeTax = fees.reduce((sum, fee) => {
        if (fee.taxable) {
          return sum + (fee.taxes?.reduce((taxSum, tax) => taxSum + tax.total, 0) || fee.amount * taxRate);
        }
        return sum;
      }, 0);
    }
    return { feeTotal, feeTax };
  }
  calculateFinalTotal(cartContentsTotal, shippingTotal, feeTotal, totalTax) {
    if (this.config.taxCalculation.pricesIncludeTax) {
      return cartContentsTotal + shippingTotal + feeTotal;
    } else {
      return cartContentsTotal + shippingTotal + feeTotal + totalTax;
    }
  }
  getDefaultTaxRate(country, state) {
    const defaultRates = {
      "US": 0.0875,
      // Average US sales tax
      "CA": 0.13,
      // Average Canadian tax
      "GB": 0.2,
      // UK VAT
      "DE": 0.19,
      // Germany VAT
      "FR": 0.2,
      // France VAT
      "AU": 0.1
      // Australia GST
    };
    return defaultRates[country || "US"] || 0.1;
  }
  roundTotal(amount) {
    if (this.config.taxCalculation.roundAtSubtotal) {
      return Math.round(amount * 100) / 100;
    }
    return Math.round(amount * 1e4) / 1e4;
  }
}
class CartService {
  constructor(client, cache, config) {
    this.currentCart = null;
    this.authContext = null;
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
  async getCart() {
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
        "Failed to get cart",
        error
      ));
    }
  }
  /**
   * Add item to cart
   */
  async addItem(request) {
    try {
      const validationResult = this.validateAddItemRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
      const productResult = await this.fetchProductData(request);
      if (!productResult.success) {
        return productResult;
      }
      const product = productResult.data;
      if (this.config.validateStock) {
        const stockValidation = this.validateStock(product, request.quantity);
        if (!stockValidation.success) {
          return stockValidation;
        }
      }
      const itemKey = this.generateCartItemKey(request);
      const existingItemIndex = cart.items.findIndex((item) => item.key === itemKey);
      let updatedItems;
      if (existingItemIndex >= 0) {
        if (request.replace) {
          updatedItems = [...cart.items];
          updatedItems[existingItemIndex] = this.createCartItem(product, request, itemKey);
        } else {
          const existingItem = cart.items[existingItemIndex];
          if (!existingItem) {
            return Err(ErrorFactory.cartError("Cart item not found"));
          }
          const newQuantity = existingItem.quantity + request.quantity;
          if (newQuantity > this.config.maxQuantityPerItem) {
            return Err(ErrorFactory.validationError(
              `Maximum quantity per item is ${this.config.maxQuantityPerItem}`
            ));
          }
          const updatedItem = {
            key: existingItem.key,
            productId: existingItem.productId,
            variationId: existingItem.variationId,
            quantity: newQuantity,
            name: existingItem.name,
            price: existingItem.price,
            regularPrice: existingItem.regularPrice,
            salePrice: existingItem.salePrice,
            totalPrice: existingItem.price * newQuantity,
            total: existingItem.price * newQuantity,
            // alias for totalPrice
            sku: existingItem.sku,
            weight: existingItem.weight,
            ...existingItem.dimensions && { dimensions: existingItem.dimensions },
            ...existingItem.image && { image: existingItem.image },
            stockQuantity: existingItem.stockQuantity,
            stockStatus: existingItem.stockStatus,
            backorders: existingItem.backorders,
            ...existingItem.quantityLimits && { quantityLimits: existingItem.quantityLimits },
            ...existingItem.meta && { meta: existingItem.meta },
            ...existingItem.attributes && { attributes: existingItem.attributes },
            addedAt: existingItem.addedAt,
            updatedAt: /* @__PURE__ */ new Date(),
            backordersAllowed: existingItem.backordersAllowed,
            soldIndividually: existingItem.soldIndividually,
            downloadable: existingItem.downloadable,
            virtual: existingItem.virtual
          };
          updatedItems = [...cart.items];
          updatedItems[existingItemIndex] = updatedItem;
        }
      } else {
        if (cart.items.length >= this.config.maxItems) {
          return Err(ErrorFactory.validationError(
            `Maximum ${this.config.maxItems} items allowed in cart`
          ));
        }
        const newItem = this.createCartItem(product, request, itemKey);
        updatedItems = [...cart.items, newItem];
      }
      const updatedCart = this.updateCartWithItems(cart, updatedItems);
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = updatedCart;
      return Ok(updatedCart);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to add item to cart",
        error
      ));
    }
  }
  /**
   * Update item quantity in cart
   */
  async updateItem(itemKey, quantity) {
    try {
      if (quantity <= 0) {
        const removeResult = await this.removeItem(itemKey);
        if (!removeResult.success) {
          return removeResult;
        }
        return this.getCart();
      }
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
      const itemIndex = cart.items.findIndex((item2) => item2.key === itemKey);
      if (itemIndex === -1) {
        return Err(ErrorFactory.cartError(
          "Item not found in cart",
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
        return Err(ErrorFactory.cartError("Cart item not found"));
      }
      if (this.config.validateStock) {
        if (item.stockStatus === "outofstock") {
          return Err(ErrorFactory.validationError("Product is out of stock"));
        }
        if (item.stockQuantity !== void 0 && quantity > item.stockQuantity) {
          return Err(ErrorFactory.validationError(
            `Only ${item.stockQuantity} items available in stock`
          ));
        }
      }
      const updatedItem = {
        key: item.key,
        productId: item.productId,
        variationId: item.variationId,
        quantity,
        name: item.name,
        price: item.price,
        regularPrice: item.regularPrice,
        salePrice: item.salePrice,
        totalPrice: item.price * quantity,
        total: item.price * quantity,
        // alias for totalPrice
        sku: item.sku,
        weight: item.weight,
        ...item.dimensions && { dimensions: item.dimensions },
        ...item.image && { image: item.image },
        stockQuantity: item.stockQuantity,
        stockStatus: item.stockStatus,
        backorders: item.backorders,
        ...item.quantityLimits && { quantityLimits: item.quantityLimits },
        ...item.meta && { meta: item.meta },
        ...item.attributes && { attributes: item.attributes },
        addedAt: item.addedAt,
        updatedAt: /* @__PURE__ */ new Date(),
        backordersAllowed: item.backordersAllowed,
        soldIndividually: item.soldIndividually,
        downloadable: item.downloadable,
        virtual: item.virtual
      };
      const updatedItems = [...cart.items];
      updatedItems[itemIndex] = updatedItem;
      const updatedCart = this.updateCartWithItems(cart, updatedItems);
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = updatedCart;
      return Ok(updatedCart);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to update cart item",
        error
      ));
    }
  }
  /**
   * Remove item from cart
   */
  async removeItem(itemKey) {
    try {
      const cart = await this.getCart();
      if (isErr(cart)) {
        return cart;
      }
      const cartData = unwrap(cart);
      const itemIndex = cartData.items.findIndex((item) => item.key === itemKey);
      if (itemIndex === -1) {
        return Err(ErrorFactory.validationError("Cart item not found"));
      }
      const updatedItems = cartData.items.filter((_, index) => index !== itemIndex);
      const newTotals = this.calculator.calculate(updatedItems, cartData.appliedCoupons, cartData.shippingMethods, cartData.fees);
      const updatedCart = {
        ...cartData,
        items: updatedItems,
        totals: newTotals,
        isEmpty: updatedItems.length === 0,
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = updatedCart;
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.networkError(
        error instanceof Error ? error.message : "Failed to remove cart item"
      ));
    }
  }
  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      const emptyCart = this.createEmptyCart();
      const saveResult = await this.persistence.save(emptyCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = emptyCart;
      return Ok(emptyCart);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to clear cart",
        error
      ));
    }
  }
  /**
   * Comprehensive cart validation with stock, availability, and business rules
   */
  async validateCart() {
    try {
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
      const mutableErrors = [];
      const mutableWarnings = [];
      for (const item of cart.items) {
        await this.validateCartItem(item, mutableErrors, mutableWarnings);
      }
      const constraintErrors = [];
      const constraintWarnings = [];
      await this.validateCartConstraints(cart, constraintErrors, constraintWarnings);
      mutableErrors.push(...constraintErrors);
      constraintWarnings.forEach((w) => mutableWarnings.push({
        itemKey: w.itemKey,
        code: "PRICE_CHANGED",
        // Map constraint warnings to general type
        message: w.message,
        ...w.details && { details: w.details }
      }));
      const couponErrors = [];
      const couponWarnings = [];
      await this.validateAppliedCoupons(cart, couponErrors, couponWarnings);
      couponWarnings.forEach((w) => mutableWarnings.push({
        itemKey: w.itemKey,
        code: "PRICE_CHANGED",
        // Map coupon warnings to general type
        message: w.message,
        details: w.details
      }));
      couponErrors.forEach((e) => mutableErrors.push({
        itemKey: e.itemKey,
        code: "INVALID_QUANTITY",
        // Map coupon errors to general type
        message: e.message
      }));
      const totalsWarnings = [];
      await this.validateCartTotals(cart, totalsWarnings);
      totalsWarnings.forEach((w) => mutableWarnings.push({
        itemKey: w.itemKey,
        code: "PRICE_CHANGED",
        // Map totals warnings to general type
        message: w.message,
        details: w.details
      }));
      return Ok({
        isValid: mutableErrors.length === 0,
        errors: mutableErrors,
        warnings: mutableWarnings
      });
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Cart validation failed",
        error
      ));
    }
  }
  /**
   * Validate individual cart item
   */
  async validateCartItem(item, errors, warnings) {
    try {
      const productResult = await this.fetchProductData({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity
      });
      if (isErr(productResult)) {
        errors.push({
          itemKey: item.key,
          code: "PRODUCT_NOT_FOUND",
          message: `Product with ID ${item.productId} not found`,
          currentStock: 0,
          requestedQuantity: item.quantity
        });
        return;
      }
      const product = unwrap(productResult);
      if (product.status !== "publish") {
        errors.push({
          itemKey: item.key,
          code: "PRODUCT_NOT_FOUND",
          message: `Product ${item.name} is no longer available`
        });
        return;
      }
      const stockErrors = [];
      const stockWarnings = [];
      await this.validateItemStock(item, product, stockErrors, stockWarnings);
      stockErrors.forEach((e) => errors.push({ ...e, code: e.code }));
      stockWarnings.forEach((w) => warnings.push({ ...w, code: w.code }));
      const quantityErrors = [];
      const quantityWarnings = [];
      this.validateItemQuantityLimits(item, product, quantityErrors, quantityWarnings);
      quantityErrors.forEach((e) => errors.push({ ...e, code: e.code }));
      const priceWarnings = [];
      this.validateItemPriceChanges(item, product, priceWarnings);
      priceWarnings.forEach((w) => warnings.push({ ...w, code: w.code }));
      if (item.variationId && product.type === "variable") {
        const variationErrors = [];
        await this.validateProductVariation(item, product, variationErrors);
        variationErrors.forEach((e) => errors.push({ ...e, code: e.code }));
      }
    } catch (error) {
      warnings.push({
        itemKey: item.key,
        code: "LOW_STOCK",
        message: `Could not validate item: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error }
      });
    }
  }
  /**
   * Validate item stock levels
   */
  async validateItemStock(item, currentProduct, errors, warnings) {
    if (currentProduct.stock_status === "outofstock") {
      errors.push({
        itemKey: item.key,
        code: "OUT_OF_STOCK",
        message: `${item.name} is currently out of stock`,
        currentStock: 0,
        requestedQuantity: item.quantity
      });
      return;
    }
    if (currentProduct.manage_stock && currentProduct.stock_quantity !== null) {
      const availableStock = currentProduct.stock_quantity;
      if (availableStock != null && item.quantity > availableStock) {
        if (availableStock === 0) {
          errors.push({
            itemKey: item.key,
            code: "OUT_OF_STOCK",
            message: `${item.name} is out of stock`,
            currentStock: availableStock,
            requestedQuantity: item.quantity
          });
        } else {
          errors.push({
            itemKey: item.key,
            code: "INSUFFICIENT_STOCK",
            message: `Only ${availableStock} units of ${item.name} available, but ${item.quantity} requested`,
            currentStock: availableStock ?? 0,
            requestedQuantity: item.quantity
          });
        }
        return;
      }
      const lowStockThreshold = Math.max(5, Math.ceil((availableStock ?? 0) * 0.1));
      if (availableStock != null && availableStock <= lowStockThreshold && availableStock > item.quantity) {
        warnings.push({
          itemKey: item.key,
          code: "LOW_STOCK",
          message: `Only ${availableStock ?? 0} units of ${item.name} remaining`,
          details: { availableStock: availableStock ?? 0, threshold: lowStockThreshold }
        });
      }
    }
    if (currentProduct.stock_status === "onbackorder") {
      if (currentProduct.backorders === "no") {
        errors.push({
          itemKey: item.key,
          code: "OUT_OF_STOCK",
          message: `${item.name} is temporarily unavailable`,
          currentStock: 0,
          requestedQuantity: item.quantity
        });
      } else {
        warnings.push({
          itemKey: item.key,
          code: "BACKORDER",
          message: `${item.name} is on backorder and may take longer to ship`,
          details: { backorderNotify: currentProduct.backorders === "notify" }
        });
      }
    }
  }
  /**
   * Validate quantity limits for cart item
   */
  validateItemQuantityLimits(item, currentProduct, errors, warnings) {
    if (item.quantityLimits) {
      const { min, max, step } = item.quantityLimits;
      if (item.quantity < min) {
        errors.push({
          itemKey: item.key,
          code: "INVALID_QUANTITY",
          message: `Minimum quantity for ${item.name} is ${min}`,
          requestedQuantity: item.quantity
        });
      }
      if (item.quantity > max) {
        errors.push({
          itemKey: item.key,
          code: "INVALID_QUANTITY",
          message: `Maximum quantity for ${item.name} is ${max}`,
          requestedQuantity: item.quantity
        });
      }
      if ((item.quantity - min) % step !== 0) {
        errors.push({
          itemKey: item.key,
          code: "INVALID_QUANTITY",
          message: `${item.name} must be ordered in multiples of ${step}`,
          requestedQuantity: item.quantity
        });
      }
    }
    if (item.quantity > this.config.maxQuantityPerItem) {
      errors.push({
        itemKey: item.key,
        code: "INVALID_QUANTITY",
        message: `Maximum quantity per item is ${this.config.maxQuantityPerItem}`,
        requestedQuantity: item.quantity
      });
    }
  }
  /**
   * Validate price changes since item was added
   */
  validateItemPriceChanges(item, currentProduct, warnings) {
    const currentRegularPrice = parseFloat(currentProduct.regular_price);
    const currentSalePrice = currentProduct.sale_price ? parseFloat(currentProduct.sale_price) : void 0;
    if (Math.abs(item.regularPrice - currentRegularPrice) > 0.01) {
      warnings.push({
        itemKey: item.key,
        code: "PRICE_CHANGED",
        message: `Price for ${item.name} has changed from $${item.regularPrice.toFixed(2)} to $${currentRegularPrice.toFixed(2)}`,
        details: {
          previousPrice: item.regularPrice,
          currentPrice: currentRegularPrice,
          priceIncrease: currentRegularPrice > item.regularPrice
        }
      });
    }
    const itemSalePrice = item.salePrice || null;
    if (itemSalePrice !== null && currentSalePrice === void 0 || itemSalePrice === null && currentSalePrice !== void 0 || itemSalePrice !== null && currentSalePrice !== void 0 && Math.abs(itemSalePrice - currentSalePrice) > 0.01) {
      warnings.push({
        itemKey: item.key,
        code: "PRICE_CHANGED",
        message: `Sale price for ${item.name} has changed`,
        details: {
          previousSalePrice: itemSalePrice,
          currentSalePrice
        }
      });
    }
  }
  /**
   * Validate product variation
   */
  async validateProductVariation(item, currentProduct, errors) {
    try {
      if (!item.variationId) {
        errors.push({
          itemKey: item.key,
          code: "VARIATION_NOT_FOUND",
          message: `Product variation is required for ${item.name}`
        });
        return;
      }
      if (item.attributes) {
        for (const [attributeName, attributeValue] of Object.entries(item.attributes)) {
          if (!attributeValue || attributeValue.trim() === "") {
            errors.push({
              itemKey: item.key,
              code: "VARIATION_NOT_FOUND",
              message: `Invalid variation attribute ${attributeName} for ${item.name}`
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        itemKey: item.key,
        code: "VARIATION_NOT_FOUND",
        message: `Could not validate product variation for ${item.name}`
      });
    }
  }
  /**
   * Validate cart-level constraints
   */
  async validateCartConstraints(cart, errors, warnings) {
    if (cart.items.length > this.config.maxItems) {
      errors.push({
        itemKey: "",
        code: "INVALID_QUANTITY",
        message: `Cart cannot contain more than ${this.config.maxItems} items`
      });
    }
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const maxTotalQuantity = this.config.maxItems * this.config.maxQuantityPerItem;
    if (totalQuantity > maxTotalQuantity) {
      warnings.push({
        itemKey: "",
        code: "HIGH_QUANTITY",
        message: `Cart contains ${totalQuantity} items, which may affect performance`,
        details: { totalQuantity, maxRecommended: maxTotalQuantity }
      });
    }
    if (cart.items.length === 0) {
      warnings.push({
        itemKey: "",
        code: "EMPTY_CART",
        message: "Cart is empty"
      });
    }
  }
  /**
   * Validate applied coupons
   */
  async validateAppliedCoupons(cart, errors, warnings) {
    for (const coupon of cart.appliedCoupons) {
      try {
        if (coupon.expiryDate && coupon.expiryDate < /* @__PURE__ */ new Date()) {
          errors.push({
            itemKey: "",
            code: "COUPON_EXPIRED",
            message: `Coupon ${coupon.code} has expired`
          });
          continue;
        }
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          errors.push({
            itemKey: "",
            code: "COUPON_USAGE_LIMIT_EXCEEDED",
            message: `Coupon ${coupon.code} has reached its usage limit`
          });
          continue;
        }
        if (coupon.minimumAmount && cart.totals.subtotal < coupon.minimumAmount) {
          errors.push({
            itemKey: "",
            code: "COUPON_MINIMUM_NOT_MET",
            message: `Coupon ${coupon.code} requires a minimum order of $${coupon.minimumAmount.toFixed(2)}`
          });
          continue;
        }
        if (coupon.maximumAmount && cart.totals.subtotal > coupon.maximumAmount) {
          warnings.push({
            itemKey: "",
            code: "COUPON_VALIDATION_ERROR",
            message: `Coupon ${coupon.code} is only valid for orders up to $${coupon.maximumAmount.toFixed(2)}`,
            details: { couponCode: coupon.code, maximumAmount: coupon.maximumAmount }
          });
        }
        if (coupon.individualUse && cart.appliedCoupons.length > 1) {
          errors.push({
            itemKey: "",
            code: "COUPON_INDIVIDUAL_USE",
            message: `Coupon ${coupon.code} cannot be combined with other coupons`
          });
        }
      } catch (error) {
        warnings.push({
          itemKey: "",
          code: "COUPON_VALIDATION_ERROR",
          message: `Could not validate coupon ${coupon.code}`,
          details: { couponCode: coupon.code, error }
        });
      }
    }
  }
  /**
   * Validate cart totals integrity
   */
  async validateCartTotals(cart, warnings) {
    try {
      const recalculatedTotals = this.calculator.calculate(
        cart.items,
        cart.appliedCoupons,
        cart.shippingMethods,
        cart.fees
      );
      const tolerance = 0.01;
      if (Math.abs(cart.totals.total - recalculatedTotals.total) > tolerance) {
        warnings.push({
          itemKey: "",
          code: "TOTALS_MISMATCH",
          message: "Cart totals may be outdated and need recalculation",
          details: {
            storedTotal: cart.totals.total,
            calculatedTotal: recalculatedTotals.total,
            difference: Math.abs(cart.totals.total - recalculatedTotals.total)
          }
        });
      }
    } catch (error) {
      warnings.push({
        itemKey: "",
        code: "TOTALS_VALIDATION_ERROR",
        message: "Could not validate cart totals",
        details: { error }
      });
    }
  }
  /**
   * Apply coupon to cart
   */
  async applyCoupon(couponCode) {
    try {
      const cart = await this.getCart();
      if (isErr(cart)) {
        return cart;
      }
      const cartData = unwrap(cart);
      const alreadyApplied = cartData.appliedCoupons.some((coupon) => coupon.code === couponCode);
      if (alreadyApplied) {
        return Err(ErrorFactory.validationError("Coupon is already applied"));
      }
      const validation = await this.validateCoupon(couponCode);
      if (isErr(validation)) {
        return validation;
      }
      const validationResult = unwrap(validation);
      if (!validationResult.valid) {
        return Err(ErrorFactory.validationError(validationResult.reason || "Invalid coupon"));
      }
      const couponToApply = {
        code: validationResult.coupon.code,
        amount: parseFloat(validationResult.coupon.amount || "0"),
        discountType: validationResult.coupon.discount_type || "fixed_cart",
        freeShipping: validationResult.coupon.free_shipping || false,
        usageCount: validationResult.coupon.usage_count || 0,
        individualUse: validationResult.coupon.individual_use || false,
        ...validationResult.coupon.description && { description: validationResult.coupon.description },
        ...validationResult.coupon.minimum_amount && { minimumAmount: parseFloat(validationResult.coupon.minimum_amount) },
        ...validationResult.coupon.maximum_amount && { maximumAmount: parseFloat(validationResult.coupon.maximum_amount) },
        ...validationResult.coupon.usage_limit && { usageLimit: validationResult.coupon.usage_limit },
        ...validationResult.coupon.date_expires && { expiryDate: new Date(validationResult.coupon.date_expires) }
      };
      const appliedCoupons = [...cartData.appliedCoupons, couponToApply];
      const updatedTotals = this.calculator.calculate(
        cartData.items,
        appliedCoupons,
        cartData.shippingMethods,
        cartData.fees
      );
      const updatedCart = {
        ...cartData,
        appliedCoupons,
        totals: updatedTotals,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = updatedCart;
      return Ok(updatedCart);
    } catch (error) {
      return Err(ErrorFactory.networkError(
        error instanceof Error ? error.message : "Failed to apply coupon"
      ));
    }
  }
  /**
   * Remove coupon from cart
   */
  async removeCoupon(couponCode) {
    try {
      if (!this.config.enableCoupons) {
        return Err(ErrorFactory.configurationError("Coupons are disabled"));
      }
      if (!couponCode || couponCode.trim() === "") {
        return Err(ErrorFactory.validationError("Coupon code is required"));
      }
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
      const normalizedCode = couponCode.trim().toUpperCase();
      const couponExists = cart.appliedCoupons.some((c) => c.code === normalizedCode);
      if (!couponExists) {
        return Err(ErrorFactory.validationError(`Coupon ${normalizedCode} is not applied to this cart`));
      }
      const updatedAppliedCoupons = cart.appliedCoupons.filter((c) => c.code !== normalizedCode);
      const updatedTotals = this.calculator.calculate(
        cart.items,
        updatedAppliedCoupons,
        cart.shippingMethods,
        cart.fees
      );
      const updatedCart = {
        ...cart,
        appliedCoupons: updatedAppliedCoupons,
        totals: updatedTotals,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const saveResult = await this.persistence.save(updatedCart);
      if (!saveResult.success) {
        return saveResult;
      }
      this.currentCart = updatedCart;
      return Ok(updatedCart);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to remove coupon",
        error
      ));
    }
  }
  /**
   * Get available coupons for current cart
   */
  async getAvailableCoupons() {
    try {
      if (!this.config.enableCoupons) {
        return Err(ErrorFactory.configurationError("Coupons are disabled"));
      }
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
      const response = await this.client.get("/coupons", {
        status: "publish",
        per_page: "100",
        // Adjust as needed
        orderby: "date",
        order: "desc"
      });
      if (!response.success) {
        return response;
      }
      const availableCoupons = [];
      for (const coupon of response.data.data) {
        const isEligible = await this.isCouponEligibleForCart(coupon, cart);
        if (isEligible) {
          availableCoupons.push(coupon);
        }
      }
      return Ok(availableCoupons);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to get available coupons",
        error
      ));
    }
  }
  /**
   * Validate coupon code without applying it
   */
  async validateCoupon(couponCode) {
    try {
      if (!this.config.enableCoupons) {
        return Ok({ valid: false, reason: "Coupons are disabled" });
      }
      if (!couponCode || couponCode.trim() === "") {
        return Ok({ valid: false, reason: "Coupon code is required" });
      }
      const normalizedCode = couponCode.trim().toUpperCase();
      const couponResult = await this.fetchCouponData(normalizedCode);
      if (!couponResult.success) {
        return Ok({ valid: false, reason: "Coupon not found" });
      }
      const couponData = couponResult.data;
      const cartResult = await this.getCart();
      if (!cartResult.success) {
        return cartResult;
      }
      const cart = cartResult.data;
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
        "Failed to validate coupon",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Fetch coupon data from WooCommerce API
   */
  async fetchCouponData(couponCode) {
    try {
      const cacheKey = `coupons:${couponCode}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get("/coupons", {
        code: couponCode,
        status: "publish"
      });
      if (!response.success) {
        return Err(ErrorFactory.validationError("Coupon not found"));
      }
      const coupons = response.data.data;
      if (!coupons || coupons.length === 0) {
        return Err(ErrorFactory.validationError("Coupon not found"));
      }
      const coupon = coupons[0];
      if (!coupon) {
        return Err(ErrorFactory.validationError(`Coupon ${couponCode} not found`));
      }
      await this.cache.set(cacheKey, coupon, 300);
      return Ok(coupon);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to fetch coupon data",
        error
      ));
    }
  }
  /**
   * Validate if coupon is eligible for the current cart
   */
  async validateCouponEligibility(coupon, cart) {
    try {
      if (coupon.date_expires) {
        const expiryDate = new Date(coupon.date_expires);
        if (expiryDate < /* @__PURE__ */ new Date()) {
          return Err(ErrorFactory.validationError(`Coupon ${coupon.code} has expired`));
        }
      }
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return Err(ErrorFactory.validationError(`Coupon ${coupon.code} has reached its usage limit`));
      }
      if (coupon.minimum_amount) {
        const minAmount = parseFloat(coupon.minimum_amount);
        if (cart.totals.subtotal < minAmount) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} requires a minimum order of $${minAmount.toFixed(2)}`
          ));
        }
      }
      if (coupon.maximum_amount) {
        const maxAmount = parseFloat(coupon.maximum_amount);
        if (cart.totals.subtotal > maxAmount) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} is only valid for orders up to $${maxAmount.toFixed(2)}`
          ));
        }
      }
      if (coupon.product_ids && coupon.product_ids.length > 0) {
        const hasEligibleProduct = cart.items.some(
          (item) => coupon.product_ids.includes(item.productId)
        );
        if (!hasEligibleProduct) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} is not valid for the products in your cart`
          ));
        }
      }
      if (coupon.excluded_product_ids && coupon.excluded_product_ids.length > 0) {
        const hasExcludedProduct = cart.items.some(
          (item) => coupon.excluded_product_ids.includes(item.productId)
        );
        if (hasExcludedProduct) {
          return Err(ErrorFactory.validationError(
            `Coupon ${coupon.code} cannot be used with some products in your cart`
          ));
        }
      }
      if (coupon.individual_use && cart.appliedCoupons.length > 0) {
        return Err(ErrorFactory.validationError(
          `Coupon ${coupon.code} cannot be combined with other coupons`
        ));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        "Failed to validate coupon eligibility",
        error
      ));
    }
  }
  /**
   * Check if a coupon is eligible for the current cart (simplified version)
   */
  async isCouponEligibleForCart(coupon, cart) {
    try {
      const validationResult = await this.validateCouponEligibility(coupon, cart);
      return validationResult.success;
    } catch {
      return false;
    }
  }
  validateAddItemRequest(request) {
    try {
      CartAddItemRequestSchema.parse(request);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Invalid add item request",
        error
      ));
    }
  }
  async fetchProductData(request) {
    const cacheKey = `products:single:${request.productId}`;
    const cachedResult = await this.cache.get(cacheKey);
    if (cachedResult.success && cachedResult.data) {
      return Ok(cachedResult.data);
    }
    const response = await this.client.get(`/products/${request.productId}`);
    if (!response.success) {
      if (response.error.statusCode === 404) {
        return Err(ErrorFactory.productNotFoundError(request.productId));
      }
      return response;
    }
    await this.cache.set(cacheKey, response.data.data);
    return Ok(response.data.data);
  }
  validateStock(product, requestedQuantity) {
    if (product.stock_status === "outofstock") {
      return Err(ErrorFactory.validationError("Product is out of stock"));
    }
    if (product.stock_quantity !== null && product.stock_quantity !== void 0 && requestedQuantity > product.stock_quantity) {
      return Err(ErrorFactory.validationError(
        `Only ${product.stock_quantity} items available in stock`
      ));
    }
    return Ok(void 0);
  }
  generateCartItemKey(request) {
    let key = `${request.productId}`;
    if (request.variationId) {
      key += `-${request.variationId}`;
    }
    if (request.attributes) {
      const sortedAttrs = Object.keys(request.attributes).sort().map((k) => `${k}:${request.attributes[k]}`).join("|");
      key += `-${sortedAttrs}`;
    }
    return key;
  }
  createCartItem(product, request, itemKey) {
    const price = parseFloat(product.price) || 0;
    const regularPrice = parseFloat(product.regular_price) || 0;
    const salePrice = product.sale_price ? parseFloat(product.sale_price) : void 0;
    const totalPrice = price * request.quantity;
    const cartItem = {
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
      sku: product.sku || void 0,
      weight: product.weight ? parseFloat(product.weight) : void 0,
      stockQuantity: product.stock_quantity || void 0,
      stockStatus: product.stock_status,
      backorders: product.backorders || "no",
      backordersAllowed: product.backorders_allowed || false,
      soldIndividually: product.sold_individually || false,
      downloadable: product.downloadable || false,
      virtual: product.virtual || false,
      meta: [],
      addedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    return cartItem;
  }
  createEmptyCart() {
    const now = /* @__PURE__ */ new Date();
    const sessionId = generateId();
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
      currency: "USD",
      // TODO: Get from config/API
      currencySymbol: "$",
      pricesIncludeTax: this.config.taxCalculation.pricesIncludeTax,
      taxDisplayMode: this.config.taxCalculation.displayMode === "both" ? "excl" : this.config.taxCalculation.displayMode,
      crossSells: [],
      isEmpty: true,
      createdAt: now,
      updatedAt: now,
      sessionId
    };
  }
  updateCartWithItems(cart, items) {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totals = this.calculator.calculate(items, cart.appliedCoupons);
    return {
      ...cart,
      items,
      itemCount,
      totals,
      isEmpty: items.length === 0,
      needsShipping: items.some((item) => item.weight !== void 0 || item.dimensions !== void 0),
      needsPayment: totals.total > 0,
      updatedAt: /* @__PURE__ */ new Date()
    };
  }
  // CART SYNCHRONIZATION METHODS
  /**
   * Set user authentication context for cart synchronization
   */
  setAuthContext(authContext) {
    this.authContext = authContext;
    if (authContext?.isAuthenticated && this.config.sync.enabled && this.config.sync.syncOnAuth) {
      this.syncCartWithServer().catch((error) => {
        console.error("Failed to sync cart on authentication:", error);
      });
    }
  }
  /**
   * Get current authentication context
   */
  getAuthContext() {
    return this.authContext;
  }
  /**
   * Get cart synchronization status
   */
  getSyncStatus() {
    return this.syncManager.getStatus();
  }
  /**
   * Get last sync timestamp
   */
  getLastSyncAt() {
    return this.syncManager.getLastSyncAt();
  }
  /**
   * Add cart sync event handler
   */
  addSyncEventHandler(handler) {
    this.syncManager.addEventHandler(handler);
  }
  /**
   * Remove cart sync event handler
   */
  removeSyncEventHandler(handler) {
    this.syncManager.removeEventHandler(handler);
  }
  /**
   * Manually trigger cart synchronization
   */
  async syncCartWithServer() {
    if (!this.config.sync.enabled) {
      return Ok({
        success: true,
        status: "idle",
        conflicts: [],
        syncedAt: /* @__PURE__ */ new Date(),
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
        "User must be authenticated for cart synchronization",
        { context: "manual_sync" }
      ));
    }
    const cartResult = await this.getCart();
    if (!cartResult.success) {
      return cartResult;
    }
    const syncResult = await this.syncManager.syncCart(cartResult.data, this.authContext);
    if (syncResult.success && syncResult.data.mergedCart) {
      this.currentCart = syncResult.data.mergedCart;
      await this.persistence.save(syncResult.data.mergedCart);
    }
    return syncResult;
  }
  /**
   * Enable cart synchronization
   */
  enableSync() {
    this.syncManager.enable();
  }
  /**
   * Disable cart synchronization
   */
  disableSync() {
    this.syncManager.disable();
  }
  /**
   * Process offline sync queue
   */
  async processOfflineQueue() {
    if (!this.authContext?.isAuthenticated) {
      return Ok(void 0);
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
  destroy() {
    this.syncManager.destroy();
    this.currentCart = null;
    this.authContext = null;
  }
}
const SearchFilterSchema = z$1.object({
  field: z$1.string(),
  operator: z$1.enum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "contains", "startswith", "endswith", "between", "exists", "empty"]),
  value: z$1.unknown(),
  label: z$1.string().optional()
});
const RangeFilterSchema = z$1.object({
  field: z$1.string(),
  min: z$1.union([z$1.number(), z$1.string()]).optional(),
  max: z$1.union([z$1.number(), z$1.string()]).optional(),
  label: z$1.string().optional()
});
const SearchSortSchema = z$1.object({
  field: z$1.string(),
  direction: z$1.enum(["asc", "desc"]),
  label: z$1.string().optional()
});
const SearchPaginationSchema = z$1.object({
  page: z$1.number().min(1),
  limit: z$1.number().min(1).max(100),
  offset: z$1.number().min(0),
  total: z$1.number().min(0),
  totalPages: z$1.number().min(0)
});
const SearchQuerySchema = z$1.object({
  text: z$1.string().optional(),
  filters: z$1.array(SearchFilterSchema),
  rangeFilters: z$1.array(RangeFilterSchema),
  categoryIds: z$1.array(z$1.number().positive()).optional(),
  tagIds: z$1.array(z$1.number().positive()).optional(),
  productIds: z$1.array(z$1.number().positive()).optional(),
  excludeProductIds: z$1.array(z$1.number().positive()).optional(),
  inStock: z$1.boolean().optional(),
  onSale: z$1.boolean().optional(),
  featured: z$1.boolean().optional(),
  minPrice: z$1.number().min(0).optional(),
  maxPrice: z$1.number().min(0).optional(),
  minRating: z$1.number().min(0).max(5).optional(),
  attributes: z$1.record(z$1.union([z$1.string(), z$1.array(z$1.string())])).optional(),
  sort: z$1.array(SearchSortSchema),
  pagination: SearchPaginationSchema,
  operator: z$1.enum(["AND", "OR", "NOT"]),
  fuzzy: z$1.boolean(),
  highlight: z$1.boolean(),
  facets: z$1.boolean(),
  suggestions: z$1.boolean()
});
z$1.object({
  type: z$1.enum(["search", "filter", "sort", "paginate", "suggestion_click", "result_click"]),
  query: z$1.string().optional(),
  filters: z$1.array(SearchFilterSchema).optional(),
  resultPosition: z$1.number().positive().optional(),
  productId: z$1.number().positive().optional(),
  timestamp: z$1.date(),
  sessionId: z$1.string(),
  userId: z$1.string().optional(),
  metadata: z$1.record(z$1.unknown()).optional()
});
class SearchAnalyticsManager {
  constructor(config, cache) {
    this.searchHistory = [];
    this.config = config;
    this.cache = cache;
    this.sessionId = generateId();
  }
  /**
   * Track search event
   */
  async trackEvent(event) {
    try {
      if (!this.config.analytics.enabled) {
        return Ok(void 0);
      }
      const eventKey = `search-analytics:${event.type}:${Date.now()}`;
      await this.cache.set(eventKey, event);
      if (event.type === "search" && event.query) {
        await this.updateSearchHistory(event.query, 0);
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to track search event",
        error
      ));
    }
  }
  /**
   * Get search history
   */
  async getSearchHistory(limit = 10) {
    try {
      const cacheKey = "search-history";
      const cachedHistory = await this.cache.get(cacheKey);
      if (cachedHistory.success && cachedHistory.data) {
        return Ok(cachedHistory.data.slice(0, limit));
      }
      return Ok([]);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to get search history",
        error
      ));
    }
  }
  /**
   * Update search history
   */
  async updateSearchHistory(query, resultCount) {
    const entry = {
      query,
      timestamp: /* @__PURE__ */ new Date(),
      resultCount,
      clickedResults: [],
      conversions: []
    };
    this.searchHistory.unshift(entry);
    this.searchHistory = this.searchHistory.slice(0, 50);
    await this.cache.set("search-history", this.searchHistory);
  }
  /**
   * Get session ID
   */
  getSessionId() {
    return this.sessionId;
  }
}
class SearchQueryBuilderImpl {
  constructor() {
    this.query = {
      filters: [],
      rangeFilters: [],
      sort: [],
      operator: "AND",
      fuzzy: true,
      highlight: true,
      facets: true,
      suggestions: true,
      pagination: {
        page: 1,
        limit: 20,
        offset: 0,
        total: 0,
        totalPages: 0
      }
    };
  }
  text(queryText) {
    this.query.text = queryText;
    return this;
  }
  filter(field, operator, value) {
    this.query.filters.push({ field, operator, value });
    return this;
  }
  range(field, min, max) {
    if (min !== void 0 || max !== void 0) {
      const rangeFilter = {
        field,
        ...min !== void 0 && { min },
        ...max !== void 0 && { max }
      };
      this.query.rangeFilters.push(rangeFilter);
    }
    return this;
  }
  category(categoryId) {
    this.query.categoryIds = Array.isArray(categoryId) ? categoryId : [categoryId];
    return this;
  }
  tag(tagId) {
    this.query.tagIds = Array.isArray(tagId) ? tagId : [tagId];
    return this;
  }
  price(min, max) {
    if (min !== void 0)
      this.query.minPrice = min;
    if (max !== void 0)
      this.query.maxPrice = max;
    return this;
  }
  rating(min) {
    this.query.minRating = min;
    return this;
  }
  inStock(inStock = true) {
    this.query.inStock = inStock;
    return this;
  }
  onSale(onSale = true) {
    this.query.onSale = onSale;
    return this;
  }
  featured(featured = true) {
    this.query.featured = featured;
    return this;
  }
  attribute(name, value) {
    if (!this.query.attributes) {
      this.query.attributes = {};
    }
    this.query.attributes[name] = value;
    return this;
  }
  sort(field, direction = "asc") {
    this.query.sort.push({ field, direction });
    return this;
  }
  page(pageNum) {
    this.query.pagination = {
      ...this.query.pagination,
      page: pageNum,
      offset: (pageNum - 1) * this.query.pagination.limit
    };
    return this;
  }
  limit(limitNum) {
    this.query.pagination = {
      ...this.query.pagination,
      limit: limitNum,
      offset: (this.query.pagination.page - 1) * limitNum
    };
    return this;
  }
  fuzzy(enabled = true) {
    this.query.fuzzy = enabled;
    return this;
  }
  highlight(enabled = true) {
    this.query.highlight = enabled;
    return this;
  }
  facets(enabled = true) {
    this.query.facets = enabled;
    return this;
  }
  suggestions(enabled = true) {
    this.query.suggestions = enabled;
    return this;
  }
  build() {
    const completeQuery = {
      text: this.query.text || "",
      filters: [...this.query.filters],
      rangeFilters: [...this.query.rangeFilters],
      ...this.query.categoryIds && { categoryIds: [...this.query.categoryIds] },
      ...this.query.tagIds && { tagIds: [...this.query.tagIds] },
      ...this.query.productIds && { productIds: [...this.query.productIds] },
      ...this.query.excludeProductIds && { excludeProductIds: [...this.query.excludeProductIds] },
      inStock: this.query.inStock,
      onSale: this.query.onSale,
      featured: this.query.featured,
      minPrice: this.query.minPrice,
      maxPrice: this.query.maxPrice,
      minRating: this.query.minRating,
      attributes: this.query.attributes ? { ...this.query.attributes } : void 0,
      sort: [...this.query.sort],
      pagination: { ...this.query.pagination },
      operator: this.query.operator,
      fuzzy: this.query.fuzzy,
      highlight: this.query.highlight,
      facets: this.query.facets,
      suggestions: this.query.suggestions
    };
    return completeQuery;
  }
  reset() {
    this.query = {
      filters: [],
      rangeFilters: [],
      sort: [],
      operator: "AND",
      fuzzy: true,
      highlight: true,
      facets: true,
      suggestions: true,
      pagination: {
        page: 1,
        limit: 20,
        offset: 0,
        total: 0,
        totalPages: 0
      }
    };
    return this;
  }
}
class SearchService {
  constructor(client, cache, config) {
    this.fuseInstance = null;
    this.productsIndex = [];
    this.client = client;
    this.cache = cache;
    this.config = config;
    this.analytics = new SearchAnalyticsManager(config, cache);
    this.initializeFuseInstance();
  }
  /**
   * Initialize Fuse.js search index
   */
  async initializeFuseInstance() {
    try {
      const cachedIndex = await this.cache.get("search-index");
      if (cachedIndex.success && cachedIndex.data) {
        this.productsIndex = cachedIndex.data;
        this.createFuseInstance();
      } else {
        await this.refreshSearchIndex();
      }
    } catch (error) {
      console.warn("Failed to initialize search index:", error);
    }
  }
  /**
   * Create Fuse.js instance with configuration
   */
  createFuseInstance() {
    const fuseOptions = {
      includeScore: this.config.fuzzy.includeScore,
      includeMatches: this.config.highlighting.enabled,
      threshold: this.config.fuzzy.threshold,
      distance: this.config.fuzzy.distance,
      minMatchCharLength: this.config.fuzzy.minMatchCharLength,
      keys: [
        { name: "name", weight: 0.4 },
        { name: "description", weight: 0.2 },
        { name: "short_description", weight: 0.2 },
        { name: "sku", weight: 0.3 },
        { name: "categories.name", weight: 0.1 },
        { name: "tags.name", weight: 0.1 }
      ]
    };
    this.fuseInstance = new Fuse(this.productsIndex, fuseOptions);
  }
  /**
   * Refresh search index with latest products
   */
  async refreshSearchIndex() {
    try {
      const allProducts = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      while (hasMore) {
        const response = await this.client.get(
          `/products?page=${page}&per_page=${limit}&status=publish`
        );
        if (!response.success) {
          return response;
        }
        const products = response.data.data;
        if (products.length === 0) {
          hasMore = false;
        } else {
          allProducts.push(...products);
          page++;
        }
        if (page > 50) {
          break;
        }
      }
      this.productsIndex = allProducts;
      this.createFuseInstance();
      await this.cache.set("search-index", allProducts);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to refresh search index",
        500,
        error
      ));
    }
  }
  /**
   * Quick search with simple parameters
   */
  async quickSearch(params) {
    try {
      const builder = this.createQueryBuilder();
      if (params.query) {
        builder.text(params.query);
      }
      if (params.category) {
        builder.category(params.category);
      }
      if (params.minPrice !== void 0 || params.maxPrice !== void 0) {
        builder.price(params.minPrice, params.maxPrice);
      }
      if (params.inStock !== void 0) {
        builder.inStock(params.inStock);
      }
      if (params.onSale !== void 0) {
        builder.onSale(params.onSale);
      }
      if (params.featured !== void 0) {
        builder.featured(params.featured);
      }
      if (params.page !== void 0) {
        builder.page(params.page);
      }
      if (params.limit !== void 0) {
        builder.limit(params.limit);
      }
      if (params.sort) {
        const [field, direction] = params.sort.split(":");
        builder.sort(field, direction || "asc");
      }
      return this.search(builder.build());
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to perform quick search",
        500,
        error
      ));
    }
  }
  /**
   * Advanced search with full query object
   */
  async search(query) {
    const startTime = performance.now();
    try {
      const validationResult = this.validateSearchQuery(query);
      if (!validationResult.success) {
        return validationResult;
      }
      const cacheKey = this.generateCacheKey(query);
      if (this.config.caching.enabled) {
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult.success && cachedResult.data) {
          return Ok(cachedResult.data);
        }
      }
      await this.analytics.trackEvent({
        type: "search",
        query: query.text,
        filters: query.filters,
        timestamp: /* @__PURE__ */ new Date(),
        sessionId: this.analytics.getSessionId()
      });
      let searchResults = [];
      if (query.text && this.fuseInstance) {
        const fuseResults = this.fuseInstance.search(query.text);
        searchResults = fuseResults.map((result) => ({
          item: result.item,
          score: result.score || 0,
          highlights: this.extractHighlights(result),
          matchedFields: this.extractMatchedFields(result)
        }));
      } else {
        searchResults = this.productsIndex.map((product) => ({
          item: product,
          score: 1,
          highlights: [],
          matchedFields: []
        }));
      }
      searchResults = this.applyFilters(searchResults, query);
      searchResults = this.applySorting(searchResults, query.sort);
      const totalHits = searchResults.length;
      const maxScore = searchResults.length > 0 ? Math.max(...searchResults.map((r) => r.score)) : 0;
      const { paginatedResults, pagination } = this.applyPagination(searchResults, query.pagination);
      const facets = query.facets ? this.generateFacets(searchResults, query) : [];
      const aggregations = this.generateAggregations(searchResults, query);
      const suggestions = query.suggestions ? await this.generateSuggestions(query.text || "") : [];
      const processingTime = performance.now() - startTime;
      const results = {
        query,
        items: paginatedResults,
        aggregations,
        facets,
        suggestions,
        pagination,
        processingTime,
        totalHits,
        maxScore,
        debug: this.config.analytics.enabled ? {
          parsedQuery: query,
          executionStats: {
            indexSize: this.productsIndex.length,
            processingTime,
            cacheHit: false
          }
        } : void 0
      };
      if (this.config.caching.enabled) {
        await this.cache.set(cacheKey, results);
      }
      return Ok(results);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Search failed",
        500,
        error
      ));
    }
  }
  /**
   * Auto-complete suggestions
   */
  async autoComplete(request) {
    const startTime = performance.now();
    try {
      if (request.query.length < this.config.suggestions.minQueryLength) {
        return Ok({
          query: request.query,
          suggestions: [],
          products: [],
          categories: [],
          processingTime: performance.now() - startTime
        });
      }
      const suggestions = [];
      const products = [];
      if (this.fuseInstance && request.includeProducts) {
        const fuseResults = this.fuseInstance.search(request.query, {
          limit: request.limit || 5
        });
        products.push(...fuseResults.map((result) => result.item));
        fuseResults.forEach((result) => {
          suggestions.push({
            text: result.item.name,
            type: "product",
            score: result.score || 0,
            metadata: { productId: result.item.id }
          });
        });
      }
      const categories = [];
      const response = {
        query: request.query,
        suggestions: suggestions.slice(0, request.limit || 10),
        products,
        categories,
        processingTime: performance.now() - startTime
      };
      return Ok(response);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Auto-complete failed",
        500,
        error
      ));
    }
  }
  /**
   * Create query builder
   */
  createQueryBuilder() {
    return new SearchQueryBuilderImpl();
  }
  /**
   * Get search analytics
   */
  async getSearchHistory(limit) {
    return this.analytics.getSearchHistory(limit);
  }
  /**
   * Track search result click
   */
  async trackResultClick(productId, position, query) {
    return this.analytics.trackEvent({
      type: "result_click",
      query,
      productId,
      resultPosition: position,
      timestamp: /* @__PURE__ */ new Date(),
      sessionId: this.analytics.getSessionId()
    });
  }
  // Private helper methods
  validateSearchQuery(query) {
    try {
      SearchQuerySchema.parse(query);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Invalid search query",
        error
      ));
    }
  }
  generateCacheKey(query) {
    const keyData = {
      text: query.text,
      filters: query.filters,
      rangeFilters: query.rangeFilters,
      sort: query.sort,
      pagination: { page: query.pagination.page, limit: query.pagination.limit }
    };
    return `search:${btoa(JSON.stringify(keyData))}`;
  }
  extractHighlights(fuseResult) {
    if (!this.config.highlighting.enabled || !fuseResult.matches) {
      return [];
    }
    return fuseResult.matches.map((match) => ({
      field: match.key || "",
      matches: [{
        text: match.value || "",
        indices: match.indices || []
      }]
    }));
  }
  extractMatchedFields(fuseResult) {
    if (!fuseResult.matches) {
      return [];
    }
    return fuseResult.matches.map((match) => match.key || "").filter(Boolean);
  }
  applyFilters(results, query) {
    let filteredResults = [...results];
    if (query.categoryIds && query.categoryIds.length > 0) {
      filteredResults = filteredResults.filter(
        (result) => result.item.categories.some((cat) => query.categoryIds.includes(cat.id))
      );
    }
    if (query.inStock !== void 0) {
      filteredResults = filteredResults.filter(
        (result) => query.inStock ? result.item.stock_status === "instock" : result.item.stock_status !== "instock"
      );
    }
    if (query.onSale !== void 0) {
      filteredResults = filteredResults.filter(
        (result) => query.onSale ? result.item.on_sale : !result.item.on_sale
      );
    }
    if (query.featured !== void 0) {
      filteredResults = filteredResults.filter(
        (result) => query.featured ? result.item.featured : !result.item.featured
      );
    }
    if (query.minPrice !== void 0 || query.maxPrice !== void 0) {
      filteredResults = filteredResults.filter((result) => {
        const price = parseFloat(result.item.price) || 0;
        const minOk = query.minPrice === void 0 || price >= query.minPrice;
        const maxOk = query.maxPrice === void 0 || price <= query.maxPrice;
        return minOk && maxOk;
      });
    }
    query.filters.forEach((filter) => {
      filteredResults = this.applyCustomFilter(filteredResults, filter);
    });
    query.rangeFilters.forEach((filter) => {
      filteredResults = this.applyRangeFilter(filteredResults, filter);
    });
    return filteredResults;
  }
  applyCustomFilter(results, filter) {
    return results;
  }
  applyRangeFilter(results, filter) {
    return results;
  }
  applySorting(results, sorts) {
    if (sorts.length === 0) {
      return results.sort((a, b) => b.score - a.score);
    }
    return results.sort((a, b) => {
      for (const sort of sorts) {
        let aValue;
        let bValue;
        switch (sort.field) {
          case "price":
            aValue = parseFloat(a.item.price) || 0;
            bValue = parseFloat(b.item.price) || 0;
            break;
          case "name":
            aValue = a.item.name;
            bValue = b.item.name;
            break;
          case "date":
            aValue = new Date(a.item.date_created);
            bValue = new Date(b.item.date_created);
            break;
          case "rating":
            aValue = parseFloat(a.item.average_rating) || 0;
            bValue = parseFloat(b.item.average_rating) || 0;
            break;
          case "popularity":
            aValue = a.item.total_sales || 0;
            bValue = b.item.total_sales || 0;
            break;
          default:
            aValue = a.score;
            bValue = b.score;
        }
        if (aValue < bValue)
          return sort.direction === "asc" ? -1 : 1;
        if (aValue > bValue)
          return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  applyPagination(results, pagination) {
    const total = results.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedResults = results.slice(offset, offset + pagination.limit);
    return {
      paginatedResults,
      pagination: {
        ...pagination,
        total,
        totalPages,
        offset
      }
    };
  }
  generateFacets(results, query) {
    const facets = [];
    return facets;
  }
  generateAggregations(results, query) {
    const aggregations = [];
    if (results.length > 0) {
      const prices = results.map((r) => parseFloat(r.item.price) || 0).filter((p) => p > 0);
      if (prices.length > 0) {
        aggregations.push({
          field: "price",
          type: "stats",
          stats: {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
            count: prices.length
          }
        });
      }
    }
    return aggregations;
  }
  async generateSuggestions(query) {
    const suggestions = [];
    if (!query || query.length < this.config.suggestions.minQueryLength) {
      return suggestions;
    }
    const historyResult = await this.analytics.getSearchHistory(5);
    if (historyResult.success) {
      historyResult.data.forEach((entry) => {
        if (entry.query.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            text: entry.query,
            type: "query",
            score: entry.resultCount / 100,
            // Simple scoring based on result count
            metadata: { timestamp: entry.timestamp }
          });
        }
      });
    }
    return suggestions.slice(0, this.config.suggestions.maxSuggestions);
  }
}
z$1.object({
  type: z$1.enum(["billing", "shipping"]),
  firstName: z$1.string().min(1),
  lastName: z$1.string().min(1),
  company: z$1.string().optional(),
  address1: z$1.string().min(1),
  address2: z$1.string().optional(),
  city: z$1.string().min(1),
  state: z$1.string().min(1),
  postcode: z$1.string().min(1),
  country: z$1.string().length(2),
  // ISO 3166-1 alpha-2
  phone: z$1.string().optional(),
  email: z$1.string().email().optional(),
  isDefault: z$1.boolean()
});
z$1.object({
  language: z$1.string().length(2),
  // ISO 639-1
  currency: z$1.string().length(3),
  // ISO 4217
  timezone: z$1.string(),
  dateFormat: z$1.string(),
  timeFormat: z$1.enum(["12h", "24h"]),
  emailNotifications: z$1.object({
    orderUpdates: z$1.boolean(),
    promotions: z$1.boolean(),
    newsletter: z$1.boolean(),
    wishlistReminders: z$1.boolean(),
    backInStock: z$1.boolean(),
    priceDrops: z$1.boolean()
  }),
  privacy: z$1.object({
    profileVisibility: z$1.enum(["public", "private", "friends"]),
    showPurchaseHistory: z$1.boolean(),
    allowRecommendations: z$1.boolean(),
    dataSharing: z$1.boolean()
  })
});
z$1.object({
  id: z$1.number().positive(),
  wordpressUserId: z$1.number().positive(),
  username: z$1.string().min(1),
  email: z$1.string().email(),
  firstName: z$1.string().min(1),
  lastName: z$1.string().min(1),
  displayName: z$1.string().min(1),
  avatar: z$1.string().url().optional(),
  bio: z$1.string().optional(),
  website: z$1.string().url().optional(),
  phone: z$1.string().optional(),
  dateOfBirth: z$1.string().optional(),
  gender: z$1.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  roles: z$1.array(z$1.enum(["customer", "shop_manager", "administrator", "editor", "author", "contributor", "subscriber"])),
  status: z$1.enum(["active", "inactive", "pending", "suspended"]),
  dateRegistered: z$1.string(),
  lastLogin: z$1.string().optional(),
  isEmailVerified: z$1.boolean(),
  isPhoneVerified: z$1.boolean()
});
const UserSyncRequestSchema = z$1.object({
  userId: z$1.number().positive(),
  externalUserId: z$1.string().optional(),
  syncProfile: z$1.boolean().optional(),
  syncAddresses: z$1.boolean().optional(),
  syncPreferences: z$1.boolean().optional(),
  syncOrderHistory: z$1.boolean().optional(),
  syncWishlist: z$1.boolean().optional(),
  forceRefresh: z$1.boolean().optional()
});
const UserAuthContextSchema = z$1.object({
  userId: z$1.number().positive(),
  externalUserId: z$1.string().optional(),
  email: z$1.string().email(),
  isAuthenticated: z$1.boolean(),
  accessToken: z$1.string().optional(),
  refreshToken: z$1.string().optional(),
  tokenExpiry: z$1.string().optional(),
  permissions: z$1.array(z$1.string()).optional(),
  sessionId: z$1.string().optional()
});
function isUserAuthContext(obj) {
  try {
    UserAuthContextSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}
class EmailVerificationService {
  constructor(client, cache, config) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }
  /**
   * Send email verification
   */
  async sendVerification(request) {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          "Email verification is disabled",
          "Enable email verification in configuration to use this feature"
        ));
      }
      const rateLimitResult = await this.checkRateLimit(request.userId, request.email);
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.config.tokenExpiryMinutes * 60 * 1e3);
      const tokenData = {
        token,
        userId: request.userId,
        email: request.email,
        createdAt: /* @__PURE__ */ new Date(),
        expiresAt,
        isUsed: false,
        attempts: 0
      };
      await this.storeVerificationToken(tokenData);
      const emailResult = await this.sendVerificationEmail(request, token);
      if (!emailResult.success) {
        await this.removeVerificationToken(token);
        return emailResult;
      }
      await this.updateRateLimit(request.userId, request.email);
      return Ok({
        success: true,
        tokenId: token,
        expiresAt,
        message: "Verification email sent successfully"
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to send verification email",
        500,
        error
      ));
    }
  }
  /**
   * Confirm email verification
   */
  async confirmVerification(request) {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          "Email verification is disabled"
        ));
      }
      const tokenResult = await this.getVerificationToken(request.token);
      if (!tokenResult.success) {
        return Err(ErrorFactory.validationError(
          "Invalid or expired verification token"
        ));
      }
      const tokenData = tokenResult.data;
      if (tokenData.isUsed) {
        return Err(ErrorFactory.validationError(
          "Verification token has already been used"
        ));
      }
      if (/* @__PURE__ */ new Date() > tokenData.expiresAt) {
        await this.removeVerificationToken(request.token);
        return Err(ErrorFactory.validationError(
          "Verification token has expired"
        ));
      }
      if (request.userId && request.userId !== tokenData.userId) {
        return Err(ErrorFactory.validationError(
          "Token does not match user"
        ));
      }
      const verificationResult = await this.markEmailAsVerified(tokenData.userId, tokenData.email);
      if (!verificationResult.success) {
        return verificationResult;
      }
      await this.markTokenAsUsed(request.token);
      await this.clearRateLimit(tokenData.userId, tokenData.email);
      const verifiedAt = /* @__PURE__ */ new Date();
      return Ok({
        success: true,
        userId: tokenData.userId,
        email: tokenData.email,
        verifiedAt,
        message: "Email verified successfully"
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to confirm email verification",
        500,
        error
      ));
    }
  }
  /**
   * Get email verification status
   */
  async getVerificationStatus(userId) {
    try {
      const userResponse = await this.client.get(`/wp/v2/users/${userId}`);
      if (!userResponse.success) {
        return Err(ErrorFactory.apiError(
          "Failed to get user data",
          404,
          "User not found"
        ));
      }
      const userData = userResponse.data.data;
      const email = userData.email;
      const isVerified = await this.isEmailVerified(userId);
      const verificationDate = await this.getVerificationDate(userId);
      const pendingTokens = await this.getPendingTokens(userId, email);
      const pendingVerification = pendingTokens.length > 0;
      const lastTokenSent = pendingTokens.length > 0 ? pendingTokens[0].createdAt : void 0;
      const rateLimitInfo = await this.getRateLimitInfo(userId, email);
      const attemptsRemaining = Math.max(0, this.config.maxResendAttempts - rateLimitInfo.attempts);
      const status = {
        userId,
        email,
        isVerified,
        ...verificationDate && { verificationDate },
        pendingVerification,
        ...lastTokenSent && { lastTokenSent },
        attemptsRemaining
      };
      return Ok(status);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get verification status",
        500,
        error
      ));
    }
  }
  /**
   * Resend verification email
   */
  async resendVerification(userId) {
    try {
      const userResponse = await this.client.get(`/wp/v2/users/${userId}`);
      if (!userResponse.success) {
        return Err(ErrorFactory.apiError(
          "User not found",
          404
        ));
      }
      const email = userResponse.data.data.email;
      const isVerified = await this.isEmailVerified(userId);
      if (isVerified) {
        return Err(ErrorFactory.validationError(
          "Email is already verified"
        ));
      }
      await this.invalidateUserTokens(userId, email);
      return this.sendVerification({
        userId,
        email,
        templateType: "resend"
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to resend verification email",
        500,
        error
      ));
    }
  }
  /**
   * Check if email verification is required for a specific action
   */
  isVerificationRequired(action) {
    switch (action) {
      case "purchase":
        return this.config.requireVerificationForPurchase;
      case "profile_update":
      case "password_change":
        return this.config.enabled;
      default:
        return false;
    }
  }
  // Private helper methods
  /**
   * Generate verification token
   */
  generateVerificationToken() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    const hash = this.simpleHash(`${timestamp}-${random}`);
    return `${timestamp}${random}${hash}`.substr(0, 64);
  }
  /**
   * Simple hash function for token generation
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * Store verification token
   */
  async storeVerificationToken(tokenData) {
    try {
      const cacheKey = `email_verification:${tokenData.token}`;
      await this.cache.set(cacheKey, tokenData, this.config.tokenExpiryMinutes * 60);
      const metaKey = "_email_verification_tokens";
      const existingTokens = await this.getUserTokens(tokenData.userId);
      const updatedTokens = [...existingTokens, tokenData];
      await this.client.post(`/wp/v2/users/${tokenData.userId}`, {
        meta: {
          [metaKey]: JSON.stringify(updatedTokens)
        }
      });
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to store verification token",
        error
      ));
    }
  }
  /**
   * Get verification token
   */
  async getVerificationToken(token) {
    try {
      const cacheKey = `email_verification:${token}`;
      const cached = await this.cache.get(cacheKey);
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }
      return Err(ErrorFactory.validationError(
        "Verification token not found"
      ));
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to retrieve verification token",
        error
      ));
    }
  }
  /**
   * Mark email as verified
   */
  async markEmailAsVerified(userId, email) {
    try {
      const verificationData = {
        isEmailVerified: true,
        emailVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        verifiedEmail: email
      };
      await this.client.post(`/wp/v2/users/${userId}`, {
        meta: {
          "_email_verified": "true",
          "_email_verified_at": verificationData.emailVerifiedAt,
          "_verified_email": email
        }
      });
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to mark email as verified",
        500,
        error
      ));
    }
  }
  /**
   * Check if email is verified
   */
  async isEmailVerified(userId) {
    try {
      const userResponse = await this.client.get(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        return meta._email_verified === "true";
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Get verification date
   */
  async getVerificationDate(userId) {
    try {
      const userResponse = await this.client.get(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        const verifiedAt = meta._email_verified_at;
        return verifiedAt ? new Date(verifiedAt) : void 0;
      }
      return void 0;
    } catch {
      return void 0;
    }
  }
  /**
   * Send verification email
   */
  async sendVerificationEmail(request, token) {
    try {
      const template = this.getEmailTemplate(request.templateType || "welcome");
      const verificationUrl = this.buildVerificationUrl(token, request.returnUrl);
      const emailData = {
        to: request.email,
        subject: template.subject,
        html: this.processTemplate(template.htmlBody, {
          verificationUrl,
          userId: request.userId,
          email: request.email,
          expiryMinutes: this.config.tokenExpiryMinutes
        }),
        text: this.processTemplate(template.textBody, {
          verificationUrl,
          userId: request.userId,
          email: request.email,
          expiryMinutes: this.config.tokenExpiryMinutes
        }),
        from: {
          email: template.fromEmail,
          name: template.fromName
        }
      };
      const emailResult = await this.sendEmail(emailData);
      if (!emailResult.success) {
        return emailResult;
      }
      return Ok({
        success: true,
        tokenId: token,
        expiresAt: new Date(Date.now() + this.config.tokenExpiryMinutes * 60 * 1e3),
        message: "Verification email sent successfully"
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to send verification email",
        500,
        error
      ));
    }
  }
  /**
   * Build verification URL
   */
  buildVerificationUrl(token, returnUrl) {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const path = this.config.verificationPath.replace(/^\//, "");
    let url = `${baseUrl}/${path}?token=${encodeURIComponent(token)}`;
    if (returnUrl) {
      url += `&return_url=${encodeURIComponent(returnUrl)}`;
    }
    return url;
  }
  /**
   * Get email template
   */
  getEmailTemplate(type) {
    return this.config.templates[type];
  }
  /**
   * Process email template
   */
  processTemplate(template, variables) {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, "g"), String(value));
    }
    return processed;
  }
  /**
   * Send email via configured provider
   */
  async sendEmail(emailData) {
    try {
      console.log("📧 Email would be sent:", emailData.subject, "to", emailData.to);
      return Ok({
        success: true,
        tokenId: "sent",
        expiresAt: /* @__PURE__ */ new Date(),
        message: "Email sent successfully"
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Email delivery failed",
        500,
        error
      ));
    }
  }
  /**
   * Check rate limiting
   */
  async checkRateLimit(userId, email) {
    const rateLimitInfo = await this.getRateLimitInfo(userId, email);
    if (rateLimitInfo.attempts >= this.config.maxResendAttempts) {
      const cooldownEnd = new Date(rateLimitInfo.lastAttempt.getTime() + this.config.resendCooldownMinutes * 60 * 1e3);
      if (/* @__PURE__ */ new Date() < cooldownEnd) {
        return Err(ErrorFactory.validationError(
          `Too many verification attempts. Please wait ${this.config.resendCooldownMinutes} minutes before trying again.`
        ));
      }
    }
    return Ok(void 0);
  }
  /**
   * Get rate limit info
   */
  async getRateLimitInfo(userId, email) {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      const cached = await this.cache.get(cacheKey);
      if (cached.success && cached.data) {
        return {
          attempts: cached.data.attempts,
          lastAttempt: new Date(cached.data.lastAttempt)
        };
      }
      return { attempts: 0, lastAttempt: /* @__PURE__ */ new Date(0) };
    } catch {
      return { attempts: 0, lastAttempt: /* @__PURE__ */ new Date(0) };
    }
  }
  /**
   * Update rate limit
   */
  async updateRateLimit(userId, email) {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      const currentInfo = await this.getRateLimitInfo(userId, email);
      const updatedInfo = {
        attempts: currentInfo.attempts + 1,
        lastAttempt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.cache.set(cacheKey, updatedInfo, 24 * 60 * 60);
    } catch (error) {
      console.warn("Failed to update rate limit:", error);
    }
  }
  /**
   * Clear rate limit
   */
  async clearRateLimit(userId, email) {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      await this.cache.delete(cacheKey);
    } catch (error) {
      console.warn("Failed to clear rate limit:", error);
    }
  }
  /**
   * Get user tokens
   */
  async getUserTokens(userId) {
    try {
      const userResponse = await this.client.get(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        const tokensJson = meta._email_verification_tokens;
        return tokensJson ? JSON.parse(tokensJson) : [];
      }
      return [];
    } catch {
      return [];
    }
  }
  /**
   * Get pending tokens
   */
  async getPendingTokens(userId, email) {
    const allTokens = await this.getUserTokens(userId);
    const now = /* @__PURE__ */ new Date();
    return allTokens.filter(
      (token) => token.email === email && !token.isUsed && new Date(token.expiresAt) > now
    );
  }
  /**
   * Mark token as used
   */
  async markTokenAsUsed(token) {
    try {
      const cacheKey = `email_verification:${token}`;
      const tokenData = await this.cache.get(cacheKey);
      if (tokenData.success && tokenData.data) {
        const updatedToken = {
          ...tokenData.data,
          isUsed: true
        };
        await this.cache.set(cacheKey, updatedToken, this.config.tokenExpiryMinutes * 60);
      }
    } catch (error) {
      console.warn("Failed to mark token as used:", error);
    }
  }
  /**
   * Remove verification token
   */
  async removeVerificationToken(token) {
    try {
      const cacheKey = `email_verification:${token}`;
      await this.cache.delete(cacheKey);
    } catch (error) {
      console.warn("Failed to remove verification token:", error);
    }
  }
  /**
   * Invalidate user tokens
   */
  async invalidateUserTokens(userId, email) {
    try {
      const tokens = await this.getPendingTokens(userId, email);
      for (const token of tokens) {
        await this.removeVerificationToken(token.token);
      }
    } catch (error) {
      console.warn("Failed to invalidate user tokens:", error);
    }
  }
}
const DEFAULT_EMAIL_VERIFICATION_CONFIG = {
  enabled: true,
  tokenExpiryMinutes: 60,
  maxAttemptsPerDay: 5,
  maxResendAttempts: 3,
  resendCooldownMinutes: 15,
  baseUrl: "",
  verificationPath: "/verify-email",
  autoVerifyOnRegistration: false,
  requireVerificationForPurchase: false,
  emailService: {
    provider: "smtp",
    fromEmail: "noreply@example.com",
    fromName: "WooCommerce Store"
  },
  templates: {
    welcome: {
      type: "welcome",
      subject: "Welcome! Please verify your email address",
      htmlBody: `
        <h2>Welcome to our store!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
      textBody: `
        Welcome to our store!
        
        Please verify your email address by clicking this link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you didn't create this account, please ignore this email.
      `,
      fromEmail: "noreply@example.com",
      fromName: "WooCommerce Store"
    },
    changeEmail: {
      type: "change_email",
      subject: "Verify your new email address",
      htmlBody: `
        <h2>Email Address Change</h2>
        <p>You requested to change your email address. Please click the link below to verify your new email:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify New Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you didn't request this change, please contact support immediately.</p>
      `,
      textBody: `
        Email Address Change
        
        You requested to change your email address. Please verify your new email by clicking this link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you didn't request this change, please contact support immediately.
      `,
      fromEmail: "noreply@example.com",
      fromName: "WooCommerce Store"
    },
    resend: {
      type: "resend",
      subject: "Email verification - Resent",
      htmlBody: `
        <h2>Email Verification</h2>
        <p>Here's your requested email verification link:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you continue to have issues, please contact support.</p>
      `,
      textBody: `
        Email Verification
        
        Here's your requested email verification link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you continue to have issues, please contact support.
      `,
      fromEmail: "noreply@example.com",
      fromName: "WooCommerce Store"
    }
  }
};
class DownloadManagementService {
  constructor(client, cache, config) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }
  /**
   * Get customer's downloadable products
   */
  async getCustomerDownloads(customerId) {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          "Download management is disabled",
          "Enable download management in configuration to use this feature"
        ));
      }
      const response = await this.client.get(`/customers/${customerId}/downloads`);
      if (!response.success) {
        return Err(ErrorFactory.apiError(
          "Failed to fetch customer downloads",
          response.error?.statusCode || 500,
          response.error
        ));
      }
      const downloads = response.data.data;
      const customerDownloads = [];
      for (const download of downloads) {
        const customerDownload = await this.mapToCustomerDownload(download);
        if (customerDownload) {
          customerDownloads.push(customerDownload);
        }
      }
      customerDownloads.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
      return Ok(customerDownloads);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get customer downloads",
        500,
        error
      ));
    }
  }
  /**
   * Generate secure download link
   */
  async generateDownloadLink(request) {
    try {
      const validationResult = await this.validateDownloadPermission(request);
      if (!validationResult.isValid || !validationResult.permission) {
        return Err(ErrorFactory.validationError(
          "Download permission validation failed",
          validationResult.errors.join(", ")
        ));
      }
      const permission = validationResult.permission;
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = await this.checkRateLimit(request.customerId, request.ipAddress);
        if (!rateLimitResult.success) {
          return rateLimitResult;
        }
      }
      const accessToken = this.generateSecureToken(permission);
      const expiresAt = new Date(Date.now() + this.config.security.tokenExpiryMinutes * 60 * 1e3);
      const fileInfo = await this.getFileInformation(permission.downloadId);
      if (!fileInfo.success) {
        return fileInfo;
      }
      const file = fileInfo.data;
      const secureUrl = this.generateSecureUrl(accessToken, permission.downloadId);
      await this.cacheDownloadToken(accessToken, permission, expiresAt);
      const downloadLink = {
        downloadId: permission.downloadId,
        customerId: permission.customerId,
        orderId: permission.orderId,
        productId: permission.productId,
        downloadUrl: secureUrl,
        accessToken,
        expiresAt,
        downloadsRemaining: permission.downloadsRemaining,
        fileSize: file.fileSize,
        fileName: file.fileName,
        secureUrl
      };
      return Ok(downloadLink);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to generate download link",
        500,
        error
      ));
    }
  }
  /**
   * Validate download permission
   */
  async validateDownloadPermission(request) {
    const errors = [];
    const warnings = [];
    try {
      const permissionResponse = await this.client.get(`/customers/${request.customerId}/downloads/${request.permissionId}`);
      if (!permissionResponse.success) {
        errors.push("Download permission not found");
        return { isValid: false, permission: void 0, errors, warnings };
      }
      const permissionData = permissionResponse.data.data;
      const permission = this.mapToDownloadPermission(permissionData);
      if (request.validateOwnership && permission.customerId !== request.customerId) {
        errors.push("Customer does not own this download");
      }
      if (!permission.isActive) {
        errors.push("Download permission is not active");
      }
      if (permission.downloadsRemaining <= 0) {
        errors.push("Download limit exceeded");
      }
      if (permission.accessExpires && /* @__PURE__ */ new Date() > permission.accessExpires) {
        errors.push("Download access has expired");
      }
      if (this.config.security.ipValidation) {
        const ipValidation = await this.validateCustomerIP(request.customerId, request.ipAddress);
        if (!ipValidation) {
          warnings.push("Download from unusual IP address");
        }
      }
      return {
        isValid: errors.length === 0,
        permission: errors.length === 0 ? permission : void 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push("Failed to validate download permission");
      return { isValid: false, permission: void 0, errors, warnings };
    }
  }
  /**
   * Track download attempt
   */
  async trackDownload(analytics) {
    try {
      if (!this.config.trackAnalytics) {
        return Ok(void 0);
      }
      const cacheKey = `download_analytics:${analytics.downloadId}:${Date.now()}`;
      await this.cache.set(cacheKey, analytics, 24 * 60 * 60);
      const analyticsData = {
        download_id: analytics.downloadId,
        customer_id: analytics.customerId,
        product_id: analytics.productId,
        downloaded_at: analytics.downloadedAt.toISOString(),
        ip_address: analytics.ipAddress,
        user_agent: analytics.userAgent,
        file_size: analytics.fileSize,
        download_duration: analytics.downloadDuration,
        successful: analytics.successful,
        error_message: analytics.errorMessage,
        bandwidth: analytics.bandwidth
      };
      await this.client.post("/download-analytics", analyticsData);
      return Ok(void 0);
    } catch (error) {
      console.warn("Failed to track download analytics:", error);
      return Ok(void 0);
    }
  }
  /**
   * Serve secure file download
   */
  async serveFile(downloadToken) {
    try {
      const tokenValidation = await this.validateDownloadToken(downloadToken);
      if (!tokenValidation.success) {
        return tokenValidation;
      }
      const { permission, fileInfo } = tokenValidation.data;
      await this.updateDownloadCount(permission.permissionId);
      const fileStream = await this.createFileStream(fileInfo.filePath, fileInfo.fileName, fileInfo.fileSize);
      if (!fileStream.success) {
        return fileStream;
      }
      await this.trackDownload({
        downloadId: permission.downloadId,
        customerId: permission.customerId,
        productId: permission.productId,
        downloadedAt: /* @__PURE__ */ new Date(),
        ipAddress: "",
        // Would be provided by the request context
        userAgent: "",
        // Would be provided by the request context
        fileSize: fileInfo.fileSize,
        successful: true,
        bandwidth: 0
        // Would be calculated during transfer
      });
      return Ok(fileStream.data);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to serve file download",
        500,
        error
      ));
    }
  }
  /**
   * Get download statistics
   */
  async getDownloadStatistics(customerId, startDate, endDate) {
    try {
      if (!this.config.trackAnalytics) {
        return Err(ErrorFactory.configurationError(
          "Download analytics is disabled"
        ));
      }
      const params = {};
      if (customerId)
        params.customer_id = customerId;
      if (startDate)
        params.start_date = startDate.toISOString().split("T")[0];
      if (endDate)
        params.end_date = endDate.toISOString().split("T")[0];
      const response = await this.client.get("/download-analytics/stats", params);
      if (!response.success) {
        return Err(ErrorFactory.apiError(
          "Failed to fetch download statistics",
          response.error?.statusCode || 500,
          response.error
        ));
      }
      const data = response.data.data;
      const statistics = {
        totalDownloads: data.total_downloads || 0,
        totalBandwidth: data.total_bandwidth || 0,
        popularProducts: data.popular_products?.map((p) => ({
          productId: p.product_id,
          productName: p.product_name,
          downloadCount: p.download_count
        })) || [],
        downloadsByDate: data.downloads_by_date?.map((d) => ({
          date: d.date,
          count: d.count,
          bandwidth: d.bandwidth
        })) || [],
        averageFileSize: data.average_file_size || 0,
        successRate: data.success_rate || 100
      };
      return Ok(statistics);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get download statistics",
        500,
        error
      ));
    }
  }
  /**
   * Cleanup expired downloads
   */
  async cleanupExpiredDownloads() {
    try {
      let cleanedCount = 0;
      return Ok(cleanedCount);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to cleanup expired downloads",
        500,
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Map WooCommerce download data to CustomerDownload
   */
  async mapToCustomerDownload(downloadData) {
    try {
      const now = /* @__PURE__ */ new Date();
      const accessExpires = downloadData.access_expires ? new Date(downloadData.access_expires) : void 0;
      const isExpired = accessExpires ? now > accessExpires : false;
      const canDownload = downloadData.downloads_remaining > 0 && !isExpired;
      return {
        permissionId: downloadData.permission_id,
        orderId: downloadData.order_id,
        orderDate: new Date(downloadData.order_date),
        productId: downloadData.product_id,
        productName: downloadData.product_name,
        downloadId: downloadData.download_id,
        fileName: downloadData.file_name,
        fileSize: downloadData.file_size || 0,
        downloadsRemaining: downloadData.downloads_remaining,
        accessExpires,
        downloadUrl: "",
        // Will be generated when needed
        isExpired,
        canDownload
      };
    } catch (error) {
      console.warn("Failed to map download data:", error);
      return null;
    }
  }
  /**
   * Map to DownloadPermission
   */
  mapToDownloadPermission(data) {
    return {
      permissionId: data.permission_id,
      customerId: data.customer_id,
      orderId: data.order_id,
      productId: data.product_id,
      downloadId: data.download_id,
      downloadsRemaining: data.downloads_remaining,
      accessGranted: new Date(data.access_granted),
      accessExpires: data.access_expires ? new Date(data.access_expires) : void 0,
      orderKey: data.order_key,
      isActive: data.is_active || true
    };
  }
  /**
   * Generate secure token
   */
  generateSecureToken(permission) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    const hash = this.simpleHash(`${permission.permissionId}-${permission.customerId}-${timestamp}`);
    return `dl_${timestamp}${random}${hash}`.substr(0, 64);
  }
  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * Generate secure download URL
   */
  generateSecureUrl(token, downloadId) {
    const baseUrl = this.config.storage.basePath;
    return `${baseUrl}/download/${token}/${downloadId}`;
  }
  /**
   * Cache download token
   */
  async cacheDownloadToken(token, permission, expiresAt) {
    const cacheKey = `download_token:${token}`;
    const tokenData = {
      permission,
      expiresAt: expiresAt.toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1e3);
    await this.cache.set(cacheKey, tokenData, ttl);
  }
  /**
   * Validate download token
   */
  async validateDownloadToken(token) {
    try {
      const cacheKey = `download_token:${token}`;
      const tokenData = await this.cache.get(cacheKey);
      if (!tokenData.success || !tokenData.data) {
        return Err(ErrorFactory.validationError(
          "Invalid or expired download token"
        ));
      }
      const data = tokenData.data;
      const expiresAt = new Date(data.expiresAt);
      if (/* @__PURE__ */ new Date() > expiresAt) {
        await this.cache.delete(cacheKey);
        return Err(ErrorFactory.validationError(
          "Download token has expired"
        ));
      }
      const fileInfo = await this.getFileInformation(data.permission.downloadId);
      if (!fileInfo.success) {
        return fileInfo;
      }
      return Ok({
        permission: data.permission,
        fileInfo: fileInfo.data
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to validate download token"
      ));
    }
  }
  /**
   * Get file information
   */
  async getFileInformation(downloadId) {
    try {
      const fileInfo = {
        downloadId,
        fileName: `file_${downloadId}.zip`,
        fileSize: 1024 * 1024,
        // 1MB placeholder
        filePath: `/secure/downloads/${downloadId}`,
        mimeType: "application/zip"
      };
      return Ok(fileInfo);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get file information",
        500,
        error
      ));
    }
  }
  /**
   * Create file stream
   */
  async createFileStream(filePath, fileName, fileSize) {
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
          controller.close();
        }
      });
      const fileStream = {
        stream,
        fileName,
        fileSize,
        mimeType: this.getMimeType(fileName),
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileSize.toString(),
          "Content-Type": this.getMimeType(fileName),
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      };
      return Ok(fileStream);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to create file stream",
        500,
        error
      ));
    }
  }
  /**
   * Get MIME type from file name
   */
  getMimeType(fileName) {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes = {
      "pdf": "application/pdf",
      "zip": "application/zip",
      "exe": "application/octet-stream",
      "dmg": "application/octet-stream",
      "mp4": "video/mp4",
      "mp3": "audio/mpeg",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "txt": "text/plain"
    };
    return mimeTypes[extension || ""] || "application/octet-stream";
  }
  /**
   * Check rate limiting
   */
  async checkRateLimit(customerId, ipAddress) {
    if (!this.config.rateLimiting.enabled) {
      return Ok(void 0);
    }
    try {
      const hourlyKey = `rate_limit:downloads:${customerId}:${(/* @__PURE__ */ new Date()).getHours()}`;
      const cached = await this.cache.get(hourlyKey);
      const currentCount = cached.success ? cached.data || 0 : 0;
      if (currentCount >= this.config.rateLimiting.maxDownloadsPerHour) {
        return Err(ErrorFactory.validationError(
          `Download rate limit exceeded. Maximum ${this.config.rateLimiting.maxDownloadsPerHour} downloads per hour.`
        ));
      }
      await this.cache.set(hourlyKey, currentCount + 1, 3600);
      return Ok(void 0);
    } catch (error) {
      console.warn("Rate limiting check failed:", error);
      return Ok(void 0);
    }
  }
  /**
   * Validate customer IP
   */
  async validateCustomerIP(customerId, ipAddress) {
    try {
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Update download count
   */
  async updateDownloadCount(permissionId) {
    try {
      await this.client.post(`/download-permissions/${permissionId}/increment`);
    } catch (error) {
      console.warn("Failed to update download count:", error);
    }
  }
}
const DEFAULT_DOWNLOAD_CONFIG = {
  enabled: true,
  maxDownloadsPerProduct: 5,
  defaultExpiryDays: 30,
  maxFileSize: 500 * 1024 * 1024,
  // 500MB
  allowedFileTypes: ["pdf", "zip", "exe", "dmg", "mp4", "mp3", "jpg", "png"],
  secureDownloads: true,
  trackAnalytics: true,
  rateLimiting: {
    enabled: true,
    maxDownloadsPerHour: 10,
    maxBandwidthPerHour: 1024 * 1024 * 1024
    // 1GB
  },
  security: {
    tokenExpiryMinutes: 60,
    ipValidation: false,
    checksumValidation: true,
    encryptFiles: false
  },
  storage: {
    provider: "local",
    basePath: "/downloads",
    secureBasePath: "/secure/downloads"
  }
};
class UserCacheManager {
  constructor(cache, config) {
    this.cache = cache;
    this.config = config;
  }
  /**
   * Get cached user profile
   */
  async getUserProfile(userId) {
    if (!this.config.cacheUserData) {
      return Ok(null);
    }
    try {
      const cacheKey = `user-profile:${userId}`;
      const cached = await this.cache.get(cacheKey);
      return Ok(cached.success ? cached.data : null);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to get cached user profile",
        error
      ));
    }
  }
  /**
   * Cache user profile
   */
  async cacheUserProfile(profile) {
    if (!this.config.cacheUserData) {
      return Ok(void 0);
    }
    try {
      const cacheKey = `user-profile:${profile.id}`;
      await this.cache.set(cacheKey, profile, this.config.cacheTtl);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to cache user profile",
        error
      ));
    }
  }
  /**
   * Clear user cache
   */
  async clearUserCache(userId) {
    try {
      const keys = [
        `user-profile:${userId}`,
        `user-addresses:${userId}`,
        `user-preferences:${userId}`,
        `user-orders:${userId}`,
        `user-wishlist:${userId}`
      ];
      for (const key of keys) {
        await this.cache.delete(key);
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to clear user cache",
        error
      ));
    }
  }
}
class AddressValidator {
  /**
   * Validate user address
   */
  static validateAddress(address) {
    const errors = [];
    const warnings = [];
    if (!address.firstName.trim()) {
      errors.push("First name is required");
    }
    if (!address.lastName.trim()) {
      errors.push("Last name is required");
    }
    if (!address.address1.trim()) {
      errors.push("Address line 1 is required");
    }
    if (!address.city.trim()) {
      errors.push("City is required");
    }
    if (!address.state.trim()) {
      errors.push("State/Province is required");
    }
    if (!address.postcode.trim()) {
      errors.push("Postal code is required");
    }
    if (!address.country.trim() || address.country.length !== 2) {
      errors.push("Valid country code is required");
    }
    if (address.email && !this.isValidEmail(address.email)) {
      errors.push("Invalid email format");
    }
    if (address.phone && !this.isValidPhone(address.phone)) {
      warnings.push("Phone number format may be invalid");
    }
    if (!this.isValidPostalCode(address.postcode, address.country)) {
      warnings.push("Postal code format may be invalid for the selected country");
    }
    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    return result;
  }
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  static isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }
  static isValidPostalCode(postcode, country) {
    const patterns = {
      "US": /^\d{5}(-\d{4})?$/,
      "CA": /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      "GB": /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/,
      "DE": /^\d{5}$/,
      "FR": /^\d{5}$/,
      "AU": /^\d{4}$/
    };
    const pattern = patterns[country.toUpperCase()];
    return pattern ? pattern.test(postcode) : true;
  }
}
class UserService {
  constructor(client, cache, config, emailVerificationConfig, downloadConfig) {
    this.currentAuthContext = null;
    this.client = client;
    this.cache = cache;
    this.config = config;
    this.userCache = new UserCacheManager(cache, config);
    this.emailVerification = new EmailVerificationService(
      client,
      cache,
      emailVerificationConfig || DEFAULT_EMAIL_VERIFICATION_CONFIG
    );
    this.downloads = new DownloadManagementService(
      client,
      cache,
      downloadConfig || DEFAULT_DOWNLOAD_CONFIG
    );
  }
  /**
   * Set authentication context from external auth system
   */
  setAuthContext(authContext) {
    try {
      if (!isUserAuthContext(authContext)) {
        return Err(ErrorFactory.validationError(
          "Invalid authentication context",
          "AuthContext must contain valid user information"
        ));
      }
      this.currentAuthContext = authContext;
      if (this.config.enabled && this.config.syncOnLogin) {
        const syncRequest = {
          userId: authContext.userId
        };
        if (authContext.externalUserId) {
          syncRequest.externalUserId = authContext.externalUserId;
        }
        this.syncUserData(syncRequest).catch((error) => {
          console.warn("Background user sync failed:", error);
        });
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to set authentication context",
        500,
        error
      ));
    }
  }
  /**
   * Get current authenticated user context
   */
  getCurrentAuthContext() {
    return this.currentAuthContext;
  }
  /**
   * Clear authentication context
   */
  clearAuthContext() {
    try {
      if (this.currentAuthContext) {
        this.userCache.clearUserCache(this.currentAuthContext.userId);
      }
      this.currentAuthContext = null;
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to clear authentication context",
        500,
        error
      ));
    }
  }
  /**
   * Sync user data with WordPress/WooCommerce
   */
  async syncUserData(request) {
    try {
      const validationResult = this.validateSyncRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          "User sync is disabled",
          "Enable user sync in configuration to use this feature"
        ));
      }
      const syncErrors = [];
      let profile;
      let customerData;
      let addresses;
      let preferences;
      let orderHistory;
      let wishlist;
      if (request.syncProfile !== false && this.config.syncProfile) {
        const profileResult = await this.syncUserProfile(request.userId);
        if (profileResult.success) {
          profile = profileResult.data.profile;
          customerData = profileResult.data.customerData;
        } else {
          syncErrors.push(`Profile sync failed: ${profileResult.error.message}`);
        }
      }
      if (request.syncAddresses !== false && this.config.syncAddresses) {
        const addressResult = await this.syncUserAddresses(request.userId);
        if (addressResult.success) {
          addresses = addressResult.data;
        } else {
          syncErrors.push(`Address sync failed: ${addressResult.error.message}`);
        }
      }
      if (request.syncPreferences !== false && this.config.syncPreferences) {
        const prefResult = await this.syncUserPreferences(request.userId);
        if (prefResult.success) {
          preferences = prefResult.data;
        } else {
          syncErrors.push(`Preferences sync failed: ${prefResult.error.message}`);
        }
      }
      if (request.syncOrderHistory !== false && this.config.syncOrderHistory) {
        const orderResult = await this.syncUserOrderHistory(request.userId);
        if (orderResult.success) {
          orderHistory = orderResult.data;
        } else {
          syncErrors.push(`Order history sync failed: ${orderResult.error.message}`);
        }
      }
      if (request.syncWishlist !== false && this.config.syncWishlist) {
        const wishlistResult = await this.syncUserWishlist(request.userId);
        if (wishlistResult.success) {
          wishlist = wishlistResult.data;
        } else {
          syncErrors.push(`Wishlist sync failed: ${wishlistResult.error.message}`);
        }
      }
      const response = {
        userId: request.userId,
        syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
        profile,
        customerData,
        addresses,
        preferences,
        orderHistory,
        wishlist,
        syncErrors: syncErrors.length > 0 ? syncErrors : void 0
      };
      return Ok(response);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "User data sync failed",
        500,
        error
      ));
    }
  }
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId, useCache = true) {
    try {
      if (useCache) {
        const cachedResult = await this.userCache.getUserProfile(userId);
        if (cachedResult.success && cachedResult.data) {
          return Ok(cachedResult.data);
        }
      }
      const response = await this.client.get(`/wp/v2/users/${userId}`);
      if (!response.success) {
        return response;
      }
      const userData = response.data.data;
      const profile = {
        id: userData.id,
        wordpressUserId: userData.id,
        username: userData.username || userData.slug,
        email: userData.email,
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
        displayName: userData.display_name || userData.name,
        avatar: userData.avatar_urls?.["96"] || void 0,
        bio: userData.description || void 0,
        website: userData.url || void 0,
        roles: userData.roles || ["customer"],
        status: "active",
        // Default status
        dateRegistered: userData.date || (/* @__PURE__ */ new Date()).toISOString(),
        lastLogin: void 0,
        // Not available in standard WP API
        isEmailVerified: true,
        // Assume verified if user exists
        isPhoneVerified: false
        // Default to false
      };
      await this.userCache.cacheUserProfile(profile);
      return Ok(profile);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get user profile",
        500,
        error
      ));
    }
  }
  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const updateData = {};
      if (updates.profile) {
        if (updates.profile.firstName)
          updateData.first_name = updates.profile.firstName;
        if (updates.profile.lastName)
          updateData.last_name = updates.profile.lastName;
        if (updates.profile.displayName)
          updateData.display_name = updates.profile.displayName;
        if (updates.profile.bio)
          updateData.description = updates.profile.bio;
        if (updates.profile.website)
          updateData.url = updates.profile.website;
      }
      const response = await this.client.post(`/wp/v2/users/${userId}`, updateData);
      if (!response.success) {
        return response;
      }
      await this.userCache.clearUserCache(userId);
      return this.getUserProfile(userId, false);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to update user profile",
        500,
        error
      ));
    }
  }
  /**
   * Get customer data from WooCommerce
   */
  async getCustomerData(customerId) {
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      if (!response.success) {
        return response;
      }
      const customerData = response.data.data;
      const customer = {
        id: customerData.id,
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        username: customerData.username,
        role: customerData.role || "customer",
        billing: this.transformWooAddressToUserAddress(customerData.billing, "billing"),
        shipping: this.transformWooAddressToUserAddress(customerData.shipping, "shipping"),
        isPayingCustomer: customerData.is_paying_customer || false,
        ordersCount: customerData.orders_count || 0,
        totalSpent: customerData.total_spent || "0",
        avatarUrl: customerData.avatar_url || "",
        dateCreated: customerData.date_created,
        dateModified: customerData.date_modified,
        metaData: customerData.meta_data || []
      };
      return Ok(customer);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get customer data",
        500,
        error
      ));
    }
  }
  /**
   * Validate address
   */
  validateAddress(address) {
    return AddressValidator.validateAddress(address);
  }
  // Email Verification Methods
  /**
   * Send email verification
   */
  async sendEmailVerification(request) {
    return this.emailVerification.sendVerification(request);
  }
  /**
   * Confirm email verification
   */
  async confirmEmailVerification(request) {
    return this.emailVerification.confirmVerification(request);
  }
  /**
   * Get email verification status
   */
  async getEmailVerificationStatus(userId) {
    return this.emailVerification.getVerificationStatus(userId);
  }
  /**
   * Resend email verification
   */
  async resendEmailVerification(userId) {
    return this.emailVerification.resendVerification(userId);
  }
  /**
   * Check if email verification is required for a specific action
   */
  isEmailVerificationRequired(action) {
    return this.emailVerification.isVerificationRequired(action);
  }
  // Download Management Methods
  /**
   * Get customer's downloadable products
   */
  async getCustomerDownloads(customerId) {
    return this.downloads.getCustomerDownloads(customerId);
  }
  /**
   * Generate secure download link
   */
  async generateDownloadLink(request) {
    return this.downloads.generateDownloadLink(request);
  }
  /**
   * Get download statistics
   */
  async getDownloadStatistics(customerId, startDate, endDate) {
    return this.downloads.getDownloadStatistics(customerId, startDate, endDate);
  }
  /**
   * Cleanup expired downloads
   */
  async cleanupExpiredDownloads() {
    return this.downloads.cleanupExpiredDownloads();
  }
  /**
   * Get user order history
   */
  async getUserOrderHistory(userId, page = 1, limit = 10) {
    try {
      const response = await this.client.get(
        `/orders?customer=${userId}&page=${page}&per_page=${Math.min(limit, this.config.maxOrderHistory)}`
      );
      if (!response.success) {
        return response;
      }
      const orders = response.data.data.map((order) => ({
        id: order.id,
        orderNumber: order.number,
        status: order.status,
        currency: order.currency,
        total: order.total,
        totalTax: order.total_tax,
        subtotal: order.subtotal,
        shippingTotal: order.shipping_total,
        dateCreated: order.date_created,
        dateModified: order.date_modified,
        itemCount: order.line_items?.length || 0,
        paymentMethod: order.payment_method,
        paymentMethodTitle: order.payment_method_title
      }));
      return Ok(orders);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get user order history",
        500,
        error
      ));
    }
  }
  /**
   * Log user activity
   */
  async logUserActivity(activity) {
    try {
      const activityEntry = {
        ...activity,
        id: generateId(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      const cacheKey = `user-activity:${activity.userId}:${activityEntry.id}`;
      await this.cache.set(cacheKey, activityEntry, 864e5);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to log user activity",
        error
      ));
    }
  }
  // Private helper methods
  validateSyncRequest(request) {
    try {
      UserSyncRequestSchema.parse(request);
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Invalid sync request",
        error
      ));
    }
  }
  async syncUserProfile(userId) {
    const profileResult = await this.getUserProfile(userId, false);
    if (!profileResult.success) {
      return profileResult;
    }
    const profile = profileResult.data;
    let customerData;
    const customerResult = await this.getCustomerData(userId);
    if (customerResult.success) {
      customerData = customerResult.data;
    }
    return Ok({ profile, customerData });
  }
  async syncUserAddresses(userId) {
    const customerResult = await this.getCustomerData(userId);
    if (!customerResult.success) {
      return customerResult;
    }
    const addresses = [];
    const customer = customerResult.data;
    if (customer.billing) {
      addresses.push(customer.billing);
    }
    if (customer.shipping) {
      addresses.push(customer.shipping);
    }
    return Ok(addresses);
  }
  async syncUserPreferences(userId) {
    const preferences = {
      language: "en",
      currency: "USD",
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24h",
      emailNotifications: {
        orderUpdates: true,
        promotions: false,
        newsletter: false,
        wishlistReminders: true,
        backInStock: true,
        priceDrops: false
      },
      privacy: {
        profileVisibility: "private",
        showPurchaseHistory: false,
        allowRecommendations: true,
        dataSharing: false
      }
    };
    return Ok(preferences);
  }
  async syncUserOrderHistory(userId) {
    return this.getUserOrderHistory(userId, 1, this.config.maxOrderHistory);
  }
  async syncUserWishlist(userId) {
    const wishlist = {
      id: `wishlist-${userId}`,
      userId,
      name: "My Wishlist",
      items: [],
      isPublic: false,
      dateCreated: (/* @__PURE__ */ new Date()).toISOString(),
      dateModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    return Ok(wishlist);
  }
  transformWooAddressToUserAddress(wooAddress, type) {
    return {
      type,
      firstName: wooAddress.first_name || "",
      lastName: wooAddress.last_name || "",
      company: wooAddress.company || void 0,
      address1: wooAddress.address_1 || "",
      address2: wooAddress.address_2 || void 0,
      city: wooAddress.city || "",
      state: wooAddress.state || "",
      postcode: wooAddress.postcode || "",
      country: wooAddress.country || "",
      phone: wooAddress.phone || void 0,
      email: wooAddress.email || void 0,
      isDefault: true
    };
  }
}
const CreateReviewSchema = {
  product_id: { min: 1, type: "number" },
  review: { min: 10, max: 1e4, type: "string" },
  reviewer: { min: 1, max: 100, type: "string" },
  reviewer_email: { type: "email" },
  rating: { min: 1, max: 5, type: "number" },
  parent_id: { type: "number", optional: true },
  images: { type: "array", optional: true }
};
class ReviewService {
  constructor(client, cache) {
    this.rateLimitStore = /* @__PURE__ */ new Map();
    this.client = client;
    this.cache = cache;
  }
  /**
   * List reviews with advanced filtering and pagination
   */
  async list(params = {}) {
    try {
      const validationResult = this.validateListParams(params);
      if (!validationResult.success) {
        return validationResult;
      }
      const queryParams = this.buildQueryParams(params);
      const cacheKey = `reviews:list:${JSON.stringify(queryParams)}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get(
        `/products/reviews?${new URLSearchParams(queryParams).toString()}`
      );
      if (!response.success) {
        return response;
      }
      const totalReviews = parseInt(response.data.headers["x-wp-total"] || "0");
      const totalPages = parseInt(response.data.headers["x-wp-totalpages"] || "0");
      const reviews = response.data.data;
      const ratingDistribution = this.calculateRatingDistribution(reviews);
      const averageRating = ratingDistribution.average;
      const result = {
        reviews,
        totalReviews,
        totalPages,
        currentPage: params.page || 1,
        perPage: params.limit || 10,
        averageRating,
        ratingDistribution
      };
      await this.cache.set(cacheKey, result, 300);
      return Ok(result);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to list reviews",
        500,
        error
      ));
    }
  }
  /**
   * Get a single review by ID
   */
  async get(reviewId) {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError("Invalid review ID"));
      }
      const cacheKey = `reviews:single:${reviewId}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const response = await this.client.get(`/products/reviews/${reviewId}`);
      if (!response.success) {
        if (response.error.statusCode === 404) {
          return Err(ErrorFactory.validationError("Review not found"));
        }
        return response;
      }
      const review = response.data.data;
      await this.cache.set(cacheKey, review, 600);
      return Ok(review);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get review",
        500,
        error
      ));
    }
  }
  /**
   * Create a new review with validation and rate limiting
   */
  async create(reviewData) {
    try {
      const validation = await this.validateReview(reviewData);
      if (!validation.isValid) {
        return Err(ErrorFactory.validationError(
          "Review validation failed",
          validation.errors
        ));
      }
      const rateLimitCheck = await this.checkRateLimit(reviewData.reviewer_email);
      if (!rateLimitCheck.success) {
        return rateLimitCheck;
      }
      let processedImages = [];
      if (reviewData.images && reviewData.images.length > 0) {
        const imageResult = await this.processReviewImages(reviewData.images);
        if (!imageResult.success) {
          return imageResult;
        }
        processedImages = imageResult.data;
      }
      const reviewPayload = {
        product_id: reviewData.product_id,
        review: this.sanitizeContent(reviewData.review),
        reviewer: this.sanitizeContent(reviewData.reviewer),
        reviewer_email: reviewData.reviewer_email,
        rating: reviewData.rating,
        parent: reviewData.parent_id || 0,
        status: validation.requiresModeration ? "hold" : "approved"
      };
      const response = await this.client.post("/products/reviews", reviewPayload);
      if (!response.success) {
        return response;
      }
      const createdReview = response.data.data;
      if (processedImages.length > 0) {
        await this.attachImagesToReview(createdReview.id, processedImages);
      }
      this.updateRateLimit(reviewData.reviewer_email);
      await this.invalidateReviewCaches(reviewData.product_id);
      await this.trackReviewEvent("review_created", {
        reviewId: createdReview.id,
        productId: reviewData.product_id,
        rating: reviewData.rating,
        hasImages: processedImages.length > 0
      });
      return Ok(createdReview);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to create review",
        500,
        error
      ));
    }
  }
  /**
   * Update an existing review
   */
  async update(reviewId, updateData) {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError("Invalid review ID"));
      }
      const existingReview = await this.get(reviewId);
      if (!existingReview.success) {
        return existingReview;
      }
      const updatePayload = {};
      if (updateData.review !== void 0) {
        updatePayload.review = this.sanitizeContent(updateData.review);
      }
      if (updateData.rating !== void 0) {
        if (updateData.rating < 1 || updateData.rating > 5) {
          return Err(ErrorFactory.validationError("Rating must be between 1 and 5"));
        }
        updatePayload.rating = updateData.rating;
      }
      if (updateData.status !== void 0) {
        updatePayload.status = updateData.status;
      }
      const response = await this.client.put(`/products/reviews/${reviewId}`, updatePayload);
      if (!response.success) {
        return response;
      }
      const updatedReview = response.data.data;
      if (updateData.images) {
        await this.updateReviewImages(reviewId, updateData.images);
      }
      await this.cache.delete(`reviews:single:${reviewId}`);
      await this.invalidateReviewCaches(existingReview.data.product_id);
      return Ok(updatedReview);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to update review",
        500,
        error
      ));
    }
  }
  /**
   * Delete a review
   */
  async delete(reviewId, force = false) {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError("Invalid review ID"));
      }
      const existingReview = await this.get(reviewId);
      if (!existingReview.success) {
        return existingReview;
      }
      const response = await this.client.delete(`/products/reviews/${reviewId}?force=${force}`);
      if (!response.success) {
        return response;
      }
      await this.cache.delete(`reviews:single:${reviewId}`);
      await this.invalidateReviewCaches(existingReview.data.product_id);
      return Ok(true);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to delete review",
        500,
        error
      ));
    }
  }
  /**
   * Get reviews for a specific product with analytics
   */
  async getProductReviews(productId, params = {}) {
    return this.list({ ...params, product: productId });
  }
  /**
   * Get review analytics for a product
   */
  async getAnalytics(productId, period = "30d") {
    try {
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError("Invalid product ID"));
      }
      const cacheKey = `reviews:analytics:${productId}:${period}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }
      const reviewsResult = await this.getProductReviews(productId, { limit: 1e3 });
      if (!reviewsResult.success) {
        return reviewsResult;
      }
      const reviews = reviewsResult.data.reviews;
      const ratingDistribution = this.calculateRatingDistribution(reviews);
      const verifiedReviews = reviews.filter((r) => r.verified);
      const reviewsWithReplies = reviews.filter((r) => r.replies && r.replies.length > 0);
      const totalHelpfulVotes = reviews.reduce((sum, r) => sum + r.helpful_votes, 0);
      const previousPeriodData = await this.getPreviousPeriodData(productId, period);
      const analytics = {
        productId,
        totalReviews: reviews.length,
        averageRating: ratingDistribution.average,
        ratingDistribution,
        verifiedPurchaseRatio: reviews.length > 0 ? verifiedReviews.length / reviews.length * 100 : 0,
        responseRate: reviews.length > 0 ? reviewsWithReplies.length / reviews.length * 100 : 0,
        helpfulnessRatio: reviews.length > 0 ? totalHelpfulVotes / reviews.length : 0,
        recentTrend: {
          period,
          averageRating: ratingDistribution.average,
          reviewCount: reviews.length,
          ratingChange: previousPeriodData ? ratingDistribution.average - previousPeriodData.averageRating : 0
        },
        topKeywords: await this.extractTopKeywords(reviews)
      };
      await this.cache.set(cacheKey, analytics, 3600);
      return Ok(analytics);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to get review analytics",
        500,
        error
      ));
    }
  }
  /**
   * Vote on review helpfulness
   */
  async voteHelpful(reviewId, voteType, userEmail) {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError("Invalid review ID"));
      }
      if (userEmail) {
        const existingVote = await this.getUserVote(reviewId, userEmail);
        if (existingVote) {
          return Err(ErrorFactory.validationError("User has already voted on this review"));
        }
      }
      const votePayload = {
        review_id: reviewId,
        vote_type: voteType,
        user_email: userEmail,
        voted_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const response = await this.client.post(`/products/reviews/${reviewId}/vote`, votePayload);
      if (!response.success) {
        return response;
      }
      await this.cache.delete(`reviews:single:${reviewId}`);
      return Ok(response.data.data);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to vote on review",
        500,
        error
      ));
    }
  }
  /**
   * Moderate a review (approve, hold, spam, trash)
   */
  async moderate(reviewId, action, reason) {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError("Invalid review ID"));
      }
      const validActions = ["approved", "hold", "spam", "trash"];
      if (!validActions.includes(action)) {
        return Err(ErrorFactory.validationError("Invalid moderation action"));
      }
      const updateResult = await this.update(reviewId, { status: action });
      if (!updateResult.success) {
        return updateResult;
      }
      const moderation = {
        review_id: reviewId,
        action,
        reason,
        moderated_at: (/* @__PURE__ */ new Date()).toISOString(),
        automated: false
      };
      await this.trackReviewEvent("review_moderated", {
        reviewId,
        action,
        reason
      });
      return Ok(moderation);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to moderate review",
        500,
        error
      ));
    }
  }
  /**
   * Search reviews with advanced filtering
   */
  async search(config) {
    try {
      const params = {
        page: config.pagination.page,
        limit: config.pagination.limit,
        search: config.query
      };
      if (config.filters) {
        for (const filter of config.filters) {
          this.applyFilterToParams(params, filter);
        }
      }
      if (config.sort && config.sort.length > 0) {
        const primarySort = config.sort[0];
        params.orderby = primarySort.field;
        params.order = primarySort.direction;
      }
      return this.list(params);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to search reviews",
        500,
        error
      ));
    }
  }
  // Private helper methods
  validateListParams(params) {
    if (params.page && params.page < 1) {
      return Err(ErrorFactory.validationError("Page must be >= 1"));
    }
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return Err(ErrorFactory.validationError("Limit must be between 1 and 100"));
    }
    if (params.rating) {
      const ratings = Array.isArray(params.rating) ? params.rating : [params.rating];
      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          return Err(ErrorFactory.validationError("Rating must be between 1 and 5"));
        }
      }
    }
    return Ok(void 0);
  }
  buildQueryParams(params) {
    const queryParams = {};
    if (params.page)
      queryParams.page = params.page.toString();
    if (params.limit)
      queryParams.per_page = params.limit.toString();
    if (params.product) {
      queryParams.product = Array.isArray(params.product) ? params.product.join(",") : params.product.toString();
    }
    if (params.status) {
      queryParams.status = Array.isArray(params.status) ? params.status.join(",") : params.status;
    }
    if (params.reviewer)
      queryParams.reviewer = params.reviewer;
    if (params.reviewer_email)
      queryParams.reviewer_email = params.reviewer_email;
    if (params.rating) {
      queryParams.rating = Array.isArray(params.rating) ? params.rating.join(",") : params.rating.toString();
    }
    if (params.verified !== void 0)
      queryParams.verified = params.verified.toString();
    if (params.after)
      queryParams.after = params.after;
    if (params.before)
      queryParams.before = params.before;
    if (params.search)
      queryParams.search = params.search;
    if (params.orderby)
      queryParams.orderby = params.orderby;
    if (params.order)
      queryParams.order = params.order;
    if (params.include)
      queryParams.include = params.include.join(",");
    if (params.exclude)
      queryParams.exclude = params.exclude.join(",");
    if (params.parent)
      queryParams.parent = params.parent.toString();
    if (params.offset)
      queryParams.offset = params.offset.toString();
    return queryParams;
  }
  calculateRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    }
    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const percentage = {
      1: total > 0 ? distribution[1] / total * 100 : 0,
      2: total > 0 ? distribution[2] / total * 100 : 0,
      3: total > 0 ? distribution[3] / total * 100 : 0,
      4: total > 0 ? distribution[4] / total * 100 : 0,
      5: total > 0 ? distribution[5] / total * 100 : 0
    };
    return {
      ...distribution,
      total,
      average: Math.round(average * 100) / 100,
      percentage
    };
  }
  async validateReview(reviewData) {
    const errors = [];
    const warnings = [];
    try {
      CreateReviewSchema.parse(reviewData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map((e) => e.message));
      }
    }
    const spamScore = await this.calculateSpamScore(reviewData.review);
    const requiresModeration = spamScore > 70 || this.containsProfanity(reviewData.review);
    if (spamScore > 90) {
      errors.push("Review appears to be spam");
    } else if (spamScore > 70) {
      warnings.push("Review may require manual moderation");
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      requiresModeration,
      spamScore
    };
  }
  async checkRateLimit(userEmail) {
    const now = Date.now();
    const userKey = userEmail.toLowerCase();
    const userLimit = this.rateLimitStore.get(userKey);
    const maxPerHour = 5;
    const hourInMs = 60 * 60 * 1e3;
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= maxPerHour) {
          return Err(ErrorFactory.rateLimitError(
            "Too many reviews submitted. Please wait before submitting another review.",
            Math.ceil((userLimit.resetTime - now) / 1e3)
          ));
        }
      } else {
        this.rateLimitStore.set(userKey, { count: 0, resetTime: now + hourInMs });
      }
    } else {
      this.rateLimitStore.set(userKey, { count: 0, resetTime: now + hourInMs });
    }
    return Ok(void 0);
  }
  updateRateLimit(userEmail) {
    const userKey = userEmail.toLowerCase();
    const userLimit = this.rateLimitStore.get(userKey);
    if (userLimit) {
      userLimit.count++;
      this.rateLimitStore.set(userKey, userLimit);
    }
  }
  sanitizeContent(content) {
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").trim();
  }
  async calculateSpamScore(content) {
    let score = 0;
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5)
      score += 30;
    const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 2)
      score += 25;
    const suspiciousPatterns = [
      /click here/gi,
      /free offer/gi,
      /limited time/gi,
      /act now/gi
    ];
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content))
        score += 20;
    }
    return Math.min(score, 100);
  }
  containsProfanity(content) {
    const profanityWords = ["spam", "fake", "scam"];
    const lowerContent = content.toLowerCase();
    return profanityWords.some((word) => lowerContent.includes(word));
  }
  async processReviewImages(images) {
    return Ok([]);
  }
  async attachImagesToReview(reviewId, images) {
  }
  async updateReviewImages(reviewId, images) {
  }
  async invalidateReviewCaches(productId) {
    const cacheKeys = [
      `reviews:list:*${productId}*`,
      `reviews:analytics:${productId}*`
    ];
    for (const pattern of cacheKeys) {
      await this.cache.deletePattern(pattern);
    }
  }
  async trackReviewEvent(event, data) {
    console.log(`Review event: ${event}`, data);
  }
  async getUserVote(reviewId, userEmail) {
    return null;
  }
  async getPreviousPeriodData(productId, period) {
    return null;
  }
  async extractTopKeywords(reviews) {
    return [];
  }
  applyFilterToParams(params, filter) {
    switch (filter.field) {
      case "rating":
        if (filter.operator === "eq") {
          params.rating = filter.value;
        }
        break;
      case "verified":
        if (filter.operator === "eq") {
          params.verified = filter.value;
        }
        break;
    }
  }
}
const BaseAddressSchema = z$1.object({
  firstName: z$1.string().min(1, "First name is required").max(100),
  lastName: z$1.string().min(1, "Last name is required").max(100),
  company: z$1.string().max(100).optional(),
  address1: z$1.string().min(1, "Address is required").max(200),
  address2: z$1.string().max(200).optional(),
  city: z$1.string().min(1, "City is required").max(100),
  state: z$1.string().min(1, "State is required").max(100),
  postcode: z$1.string().min(1, "Postcode is required").max(20),
  country: z$1.string().length(2, "Country must be 2-letter code"),
  email: z$1.string().email().optional(),
  phone: z$1.string().max(20).optional()
});
const BillingAddressSchema = BaseAddressSchema.extend({
  email: z$1.string().email("Valid email is required")
});
const ShippingAddressSchema = BaseAddressSchema;
z$1.object({
  number: z$1.string().regex(/^\d{13,19}$/, "Invalid card number"),
  expiryMonth: z$1.number().int().min(1).max(12),
  expiryYear: z$1.number().int().min((/* @__PURE__ */ new Date()).getFullYear()),
  cvv: z$1.string().regex(/^\d{3,4}$/, "Invalid CVV"),
  holderName: z$1.string().min(1, "Cardholder name is required").max(100)
});
z$1.object({
  subtotal: z$1.number().min(0),
  tax: z$1.number().min(0),
  shipping: z$1.number().min(0),
  shippingTax: z$1.number().min(0),
  discount: z$1.number().min(0),
  fees: z$1.number().min(0),
  feesTax: z$1.number().min(0),
  total: z$1.number().min(0),
  currency: z$1.string().length(3)
});
z$1.object({
  step: z$1.enum(["cart_review", "shipping_address", "billing_address", "shipping_method", "payment_method", "order_review", "payment_processing", "order_confirmation"]),
  data: z$1.record(z$1.unknown()),
  validate: z$1.boolean().optional()
});
function validateBaseAddress(address) {
  const parsed = BaseAddressSchema.parse(address);
  const result = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    ...parsed.company !== void 0 && { company: parsed.company },
    ...parsed.address2 !== void 0 && { address2: parsed.address2 },
    ...parsed.email !== void 0 && { email: parsed.email },
    ...parsed.phone !== void 0 && { phone: parsed.phone }
  };
  return result;
}
function validateBillingAddress(address) {
  const parsed = BillingAddressSchema.parse(address);
  const result = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    email: parsed.email,
    ...parsed.company !== void 0 && { company: parsed.company },
    ...parsed.address2 !== void 0 && { address2: parsed.address2 },
    ...parsed.phone !== void 0 && { phone: parsed.phone }
  };
  return result;
}
function validateShippingAddress(address) {
  const parsed = ShippingAddressSchema.parse(address);
  const result = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    ...parsed.company !== void 0 && { company: parsed.company },
    ...parsed.address2 !== void 0 && { address2: parsed.address2 },
    ...parsed.email !== void 0 && { email: parsed.email },
    ...parsed.phone !== void 0 && { phone: parsed.phone }
  };
  return result;
}
const COUNTRY_CONFIGS = {
  "US": {
    code: "US",
    name: "United States",
    postcodePattern: "^\\d{5}(-\\d{4})?$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$"
  },
  "CA": {
    code: "CA",
    name: "Canada",
    postcodePattern: "^[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$"
  },
  "GB": {
    code: "GB",
    name: "United Kingdom",
    postcodePattern: "^[A-Za-z]{1,2}\\d[A-Za-z\\d]?\\s?\\d[A-Za-z]{2}$",
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: "^\\+?44[-.\\s]?\\d{4}[-.\\s]?\\d{6}$"
  },
  "DE": {
    code: "DE",
    name: "Germany",
    postcodePattern: "^\\d{5}$",
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: "^\\+?49[-.\\s]?\\d{3,4}[-.\\s]?\\d{7,8}$"
  },
  "FR": {
    code: "FR",
    name: "France",
    postcodePattern: "^\\d{5}$",
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: "^\\+?33[-.\\s]?\\d{1}[-.\\s]?\\d{2}[-.\\s]?\\d{2}[-.\\s]?\\d{2}[-.\\s]?\\d{2}$"
  },
  "AU": {
    code: "AU",
    name: "Australia",
    postcodePattern: "^\\d{4}$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?61[-.\\s]?\\d{1}[-.\\s]?\\d{4}[-.\\s]?\\d{4}$"
  },
  "JP": {
    code: "JP",
    name: "Japan",
    postcodePattern: "^\\d{3}-\\d{4}$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?81[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{4}$"
  },
  "BR": {
    code: "BR",
    name: "Brazil",
    postcodePattern: "^\\d{5}-?\\d{3}$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?55[-.\\s]?\\d{2}[-.\\s]?\\d{4,5}[-.\\s]?\\d{4}$"
  },
  "IN": {
    code: "IN",
    name: "India",
    postcodePattern: "^\\d{6}$",
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: "^\\+?91[-.\\s]?\\d{5}[-.\\s]?\\d{5}$"
  },
  "NL": {
    code: "NL",
    name: "Netherlands",
    postcodePattern: "^\\d{4}\\s?[A-Za-z]{2}$",
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: "^\\+?31[-.\\s]?\\d{1,3}[-.\\s]?\\d{7}$"
  }
};
class AddressManager {
  constructor(customCountryConfigs) {
    this.countryConfigs = {
      ...COUNTRY_CONFIGS,
      ...customCountryConfigs
    };
  }
  /**
   * Validate address with dynamic field requirements
   */
  async validateAddressWithContext(address, context) {
    try {
      const errors = [];
      const warnings = [];
      const countryConfig = this.countryConfigs[address.country.toUpperCase()];
      if (!countryConfig) {
        errors.push(`Country "${address.country}" is not supported`);
        return Ok({
          isValid: false,
          errors,
          warnings
        });
      }
      const fieldRequirements = this.buildFieldRequirements(context, countryConfig);
      this.validateRequiredFields(address, fieldRequirements, errors);
      this.validateFieldFormats(address, countryConfig, errors, warnings);
      return Ok({
        isValid: errors.length === 0,
        errors,
        warnings
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Address validation failed",
        error
      ));
    }
  }
  /**
   * Get field requirements for address type and context
   */
  getFieldRequirements(context) {
    const countryCode = context.checkoutRules?.requiredFields?.[0] || "US";
    const countryConfig = this.countryConfigs[countryCode] || this.countryConfigs["US"] || {
      code: "US",
      name: "United States",
      stateRequired: true,
      postcodeRequired: true
    };
    return this.buildFieldRequirements(context, countryConfig);
  }
  /**
   * Check if specific field is required
   */
  isFieldRequired(fieldName, context) {
    const requirements = this.getFieldRequirements(context);
    return requirements[fieldName];
  }
  /**
   * Validate a base address with country-specific rules
   */
  async validateAddress(address) {
    const context = {
      addressType: "shipping",
      isGuestCheckout: false
    };
    return this.validateAddressWithContext(address, context);
  }
  /**
   * Validate a billing address (requires email)
   */
  async validateBillingAddress(address) {
    const context = {
      addressType: "billing",
      isGuestCheckout: false,
      fieldRequirements: { email: true }
    };
    return this.validateAddressWithContext(address, context);
  }
  /**
   * Validate a shipping address
   */
  async validateShippingAddress(address) {
    const context = {
      addressType: "shipping",
      isGuestCheckout: false
    };
    return this.validateAddressWithContext(address, context);
  }
  /**
   * Check if addresses are the same (for "same as billing" functionality)
   */
  addressesEqual(address1, address2) {
    return address1.firstName === address2.firstName && address1.lastName === address2.lastName && address1.company === address2.company && address1.address1 === address2.address1 && address1.address2 === address2.address2 && address1.city === address2.city && address1.state === address2.state && address1.postcode === address2.postcode && address1.country === address2.country && address1.phone === address2.phone;
  }
  /**
   * Suggest address corrections (basic implementation)
   */
  async suggestAddressCorrection(address) {
    try {
      const countryConfig = this.countryConfigs[address.country.toUpperCase()];
      if (!countryConfig) {
        return Ok(null);
      }
      const suggestedAddress = {
        ...address,
        // Capitalize names
        firstName: this.capitalizeWords(address.firstName),
        lastName: this.capitalizeWords(address.lastName),
        // Capitalize city
        city: this.capitalizeWords(address.city),
        // Uppercase country code
        country: address.country.toUpperCase(),
        // Format postal code
        postcode: this.formatPostcode(address.postcode, countryConfig)
      };
      if (JSON.stringify(address) !== JSON.stringify(suggestedAddress)) {
        return Ok(suggestedAddress);
      }
      return Ok(null);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Address suggestion failed",
        error
      ));
    }
  }
  /**
   * Get country configuration
   */
  getCountryConfig(countryCode) {
    return this.countryConfigs[countryCode.toUpperCase()] || null;
  }
  /**
   * Get all supported countries
   */
  getSupportedCountries() {
    return Object.values(this.countryConfigs);
  }
  /**
   * Add or update country configuration
   */
  setCountryConfig(countryCode, config) {
    this.countryConfigs[countryCode.toUpperCase()] = config;
  }
  /**
   * Parse and validate address from raw data
   */
  async parseAddress(rawData, type = "base") {
    try {
      switch (type) {
        case "billing":
          const billingAddress = validateBillingAddress(rawData);
          const billingValidation = await this.validateBillingAddress(billingAddress);
          if (isErr(billingValidation)) {
            return Err(unwrapErr(billingValidation));
          }
          if (!unwrap(billingValidation).isValid) {
            return Err(this.createValidationError([...unwrap(billingValidation).errors]));
          }
          return Ok(billingAddress);
        case "shipping":
          const shippingAddress = validateShippingAddress(rawData);
          const shippingValidation = await this.validateShippingAddress(shippingAddress);
          if (isErr(shippingValidation)) {
            return Err(unwrapErr(shippingValidation));
          }
          if (!unwrap(shippingValidation).isValid) {
            return Err(this.createValidationError([...unwrap(shippingValidation).errors]));
          }
          return Ok(shippingAddress);
        default:
          const baseAddress = validateBaseAddress(rawData);
          const baseValidation = await this.validateAddress(baseAddress);
          if (isErr(baseValidation)) {
            return Err(unwrapErr(baseValidation));
          }
          if (!unwrap(baseValidation).isValid) {
            return Err(this.createValidationError([...unwrap(baseValidation).errors]));
          }
          return Ok(baseAddress);
      }
    } catch (error) {
      return Err(ErrorFactory.validationError(
        `Failed to parse ${type} address`,
        error
      ));
    }
  }
  /**
   * Convert shipping address to billing address (adds required email)
   */
  convertToBillingAddress(shippingAddress, email) {
    return {
      ...shippingAddress,
      email
    };
  }
  /**
   * Convert billing address to shipping address (removes email)
   */
  convertToShippingAddress(billingAddress) {
    const { email, ...shippingAddress } = billingAddress;
    return shippingAddress;
  }
  // Private helper methods
  /**
   * Build field requirements based on context
   */
  buildFieldRequirements(context, countryConfig) {
    const baseRequirements = {
      firstName: true,
      lastName: true,
      company: false,
      address1: true,
      address2: false,
      city: true,
      state: countryConfig.stateRequired,
      postcode: countryConfig.postcodeRequired,
      country: true,
      email: context.addressType === "billing",
      phone: false
    };
    const overrides = {};
    if (context.fieldRequirements) {
      Object.assign(overrides, context.fieldRequirements);
    }
    if (context.checkoutRules) {
      if (context.checkoutRules.requireCompanyName) {
        overrides.company = true;
      }
      if (context.checkoutRules.requirePhoneNumber) {
        overrides.phone = true;
      }
    }
    const finalRequirements = {
      ...baseRequirements,
      ...overrides
    };
    return finalRequirements;
  }
  /**
   * Validate required fields
   */
  validateRequiredFields(address, requirements, errors) {
    if (requirements.firstName && (!address.firstName || !address.firstName.trim())) {
      errors.push("First name is required");
    }
    if (requirements.lastName && (!address.lastName || !address.lastName.trim())) {
      errors.push("Last name is required");
    }
    if (requirements.company && (!address.company || !address.company.trim())) {
      errors.push("Company name is required");
    }
    if (requirements.address1 && (!address.address1 || !address.address1.trim())) {
      errors.push("Street address is required");
    }
    if (requirements.address2 && (!address.address2 || !address.address2.trim())) {
      errors.push("Address line 2 is required");
    }
    if (requirements.city && (!address.city || !address.city.trim())) {
      errors.push("City is required");
    }
    if (requirements.state && (!address.state || !address.state.trim())) {
      errors.push("State/Province is required");
    }
    if (requirements.postcode && (!address.postcode || !address.postcode.trim())) {
      errors.push("Postal/ZIP code is required");
    }
    if (requirements.country && (!address.country || !address.country.trim())) {
      errors.push("Country is required");
    }
    if (requirements.email && (!address.email || !address.email.trim())) {
      errors.push("Email address is required");
    }
    if (requirements.phone && (!address.phone || !address.phone.trim())) {
      errors.push("Phone number is required");
    }
  }
  /**
   * Validate field formats
   */
  validateFieldFormats(address, countryConfig, errors, warnings) {
    if (address.postcode && countryConfig.postcodePattern) {
      const postcodeRegex = new RegExp(countryConfig.postcodePattern);
      if (!postcodeRegex.test(address.postcode)) {
        errors.push(`Invalid postal/ZIP code format for ${countryConfig.name}`);
      }
    }
    if (address.phone && countryConfig.phonePattern) {
      const phoneRegex = new RegExp(countryConfig.phonePattern);
      if (!phoneRegex.test(address.phone)) {
        warnings.push(`Phone number format may be invalid for ${countryConfig.name}`);
      }
    }
    if (address.firstName && address.firstName.length < 2) {
      errors.push("First name must be at least 2 characters");
    }
    if (address.lastName && address.lastName.length < 2) {
      errors.push("Last name must be at least 2 characters");
    }
    if (address.address1 && address.address1.length < 5) {
      errors.push("Street address must be at least 5 characters");
    }
    if (address.city && address.city.length < 2) {
      errors.push("City must be at least 2 characters");
    }
    if (address.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(address.email)) {
        errors.push("Invalid email address format");
      }
    }
  }
  /**
   * Capitalize words in a string
   */
  capitalizeWords(str) {
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  /**
   * Format postal code according to country pattern
   */
  formatPostcode(postcode, countryConfig) {
    const cleaned = postcode.replace(/\s+/g, "").toUpperCase();
    switch (countryConfig.code) {
      case "CA":
        if (cleaned.length === 6) {
          return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        }
        return postcode;
      case "GB":
        if (cleaned.length >= 5) {
          return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
        }
        return postcode;
      case "NL":
        if (cleaned.length === 6) {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
        }
        return postcode;
      default:
        return postcode;
    }
  }
  /**
   * Create validation error from error messages
   */
  createValidationError(errors) {
    return {
      code: "VALIDATION_ERROR",
      message: "Address validation failed",
      details: { errors },
      timestamp: /* @__PURE__ */ new Date()
    };
  }
}
new AddressManager();
class ShippingService {
  constructor(client, cache, config) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }
  /**
   * Fetch available shipping rates from backend
   */
  async getShippingRates(request) {
    try {
      if (!this.isShippingAvailable(request.destination.country)) {
        return Err(ErrorFactory.validationError(
          "Shipping not available to this destination",
          { country: request.destination.country }
        ));
      }
      const cacheKey = this.generateCacheKey(request);
      const cachedRates = await this.cache.get(cacheKey);
      if (cachedRates.success && cachedRates.data) {
        return Ok(cachedRates.data);
      }
      const response = await this.client.post("/wp-json/wc/v3/shipping/rates", {
        destination: {
          country: request.destination.country,
          state: request.destination.state,
          postcode: request.destination.postcode,
          city: request.destination.city
        },
        items: request.cartItems,
        cart_total: request.cartTotal,
        currency: request.currency
      });
      if (isErr(response)) {
        return Err(ErrorFactory.apiError(
          "Failed to fetch shipping rates",
          500,
          unwrapErr(response)
        ));
      }
      const responseData = unwrap(response).data;
      const shippingResponse = {
        rates: responseData.rates || [],
        zones: responseData.zones || [],
        defaultRate: responseData.default_rate,
        freeShippingThreshold: responseData.free_shipping_threshold,
        estimatedDelivery: responseData.estimated_delivery
      };
      await this.cache.set(cacheKey, shippingResponse, this.config.cacheTimeout * 60);
      return Ok(shippingResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Shipping rate calculation failed",
        500,
        error
      ));
    }
  }
  /**
   * Get shipping zones for a specific country
   */
  async getShippingZones(country) {
    try {
      const cacheKey = `shipping-zones:${country}`;
      const cachedZones = await this.cache.get(cacheKey);
      if (cachedZones.success && cachedZones.data) {
        return Ok(cachedZones.data);
      }
      const response = await this.client.get(`/wp-json/wc/v3/shipping/zones`, {
        country: country.toUpperCase()
      });
      if (isErr(response)) {
        return Err(unwrap(response));
      }
      const zones = unwrap(response).data || [];
      await this.cache.set(cacheKey, zones, this.config.cacheTimeout * 60);
      return Ok(zones);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to fetch shipping zones",
        500,
        error
      ));
    }
  }
  /**
   * Calculate shipping for selected method (backend handles calculation)
   */
  async calculateShipping(selectedMethod, destination, cartTotal) {
    try {
      const response = await this.client.post("/wp-json/wc/v3/shipping/calculate", {
        method_id: selectedMethod.methodId,
        zone_id: selectedMethod.zoneId,
        destination: {
          country: destination.country,
          state: destination.state,
          postcode: destination.postcode,
          city: destination.city
        },
        cart_total: cartTotal
      });
      if (isErr(response)) {
        return Err(unwrap(response));
      }
      const data = unwrap(response);
      const calculation = {
        selectedMethod,
        shippingCost: data.cost || 0,
        shippingTax: data.tax || 0,
        estimatedDelivery: data.estimated_delivery,
        trackingAvailable: data.tracking_available || false
      };
      return Ok(calculation);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Shipping calculation failed",
        500,
        error
      ));
    }
  }
  /**
   * Check if free shipping is available
   */
  checkFreeShipping(cartTotal, freeShippingThreshold) {
    if (!freeShippingThreshold)
      return false;
    return cartTotal >= freeShippingThreshold;
  }
  /**
   * Get cheapest shipping option
   */
  getCheapestRate(rates) {
    if (rates.length === 0)
      return null;
    return rates.reduce(
      (cheapest, current) => current.cost < cheapest.cost ? current : cheapest
    );
  }
  /**
   * Get fastest shipping option
   */
  getFastestRate(rates) {
    if (rates.length === 0)
      return null;
    const priorityOrder = [
      "overnight",
      "expedited",
      "flat_rate",
      "table_rate",
      "local_pickup",
      "free_shipping"
    ];
    for (const methodType of priorityOrder) {
      const rate = rates.find((r) => r.method === methodType);
      if (rate)
        return rate;
    }
    return rates[0];
  }
  /**
   * Filter rates by shipping method type
   */
  filterRatesByMethod(rates, method) {
    return rates.filter((rate) => rate.method === method);
  }
  /**
   * Group rates by zone
   */
  groupRatesByZone(rates, zones) {
    const grouped = {};
    zones.forEach((zone) => {
      grouped[zone.id] = zone.methods.filter(
        (method) => rates.some((rate) => rate.id === method.id)
      );
    });
    return grouped;
  }
  /**
   * Validate shipping selection
   */
  validateShippingSelection(selectedMethod, availableRates) {
    return availableRates.some(
      (rate) => rate.id === selectedMethod.methodId
    );
  }
  /**
   * Update order totals with shipping calculation
   */
  updateOrderTotalsWithShipping(currentTotals, shippingCalculation) {
    return {
      ...currentTotals,
      shipping: shippingCalculation.shippingCost,
      shippingTax: shippingCalculation.shippingTax,
      total: currentTotals.subtotal + currentTotals.tax + shippingCalculation.shippingCost + shippingCalculation.shippingTax + currentTotals.fees + currentTotals.feesTax - currentTotals.discount
    };
  }
  /**
   * Estimate delivery date
   */
  estimateDeliveryDate(rate, orderDate = /* @__PURE__ */ new Date()) {
    if (!rate.estimatedDelivery)
      return null;
    const deliveryMatch = rate.estimatedDelivery.match(/(\d+)-?(\d+)?\s*(business\s+)?days?/i);
    if (!deliveryMatch)
      return null;
    const minDays = parseInt(deliveryMatch[1]);
    const maxDays = deliveryMatch[2] ? parseInt(deliveryMatch[2]) : minDays;
    const isBusinessDays = !!deliveryMatch[3];
    let deliveryDate = new Date(orderDate);
    let daysToAdd = maxDays;
    if (isBusinessDays) {
      let addedDays = 0;
      while (addedDays < daysToAdd) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
          addedDays++;
        }
      }
    } else {
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
    }
    return deliveryDate;
  }
  /**
   * Clear shipping rate cache
   */
  async clearShippingCache() {
    try {
      await this.cache.invalidatePattern("shipping-");
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to clear shipping cache",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Check if shipping is available to country
   */
  isShippingAvailable(country) {
    if (!this.config.enabled)
      return false;
    if (this.config.restrictedCountries.includes(country.toUpperCase()))
      return false;
    return true;
  }
  /**
   * Generate cache key for shipping request
   */
  generateCacheKey(request) {
    const keyData = {
      country: request.destination.country,
      state: request.destination.state,
      postcode: request.destination.postcode,
      itemCount: request.cartItems.length,
      total: request.cartTotal,
      currency: request.currency
    };
    return `shipping-rates:${Buffer.from(JSON.stringify(keyData)).toString("base64")}`;
  }
}
const DEFAULT_SHIPPING_CONFIG = {
  enabled: true,
  calculateTax: true,
  defaultCountry: "US",
  restrictedCountries: [],
  cacheTimeout: 15
  // 15 minutes
};
class PaymentService {
  constructor(client, cache, config) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }
  /**
   * Get available payment methods from backend
   */
  async getAvailablePaymentMethods(amount, currency = this.config.currency, country) {
    try {
      const cacheKey = `payment-methods:${amount}:${currency}:${country || "default"}`;
      const cached = await this.cache.get(cacheKey);
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }
      const response = await this.client.get("/wp-json/wc/v3/payment_gateways", {
        amount: amount.toString(),
        currency,
        country: country?.toUpperCase()
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const paymentResponse = {
        availableMethods: data.payment_gateways || [],
        defaultMethod: data.default_gateway,
        minimumAmounts: data.minimum_amounts || {},
        currency: data.currency || currency
      };
      await this.cache.set(cacheKey, paymentResponse, this.config.cacheTimeout * 60);
      return Ok(paymentResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to fetch payment methods",
        500,
        error
      ));
    }
  }
  /**
   * Initialize payment with selected method
   */
  async initializePayment(request) {
    try {
      const methodsResult = await this.getAvailablePaymentMethods(request.amount, request.currency);
      if (isErr(methodsResult)) {
        return Err(unwrapErr(methodsResult));
      }
      const methods = unwrap(methodsResult);
      const selectedMethod = methods.availableMethods.find((m) => m.id === request.paymentMethodId);
      if (!selectedMethod || !selectedMethod.enabled) {
        return Err(ErrorFactory.validationError(
          "Selected payment method is not available",
          { methodId: request.paymentMethodId }
        ));
      }
      const response = await this.client.post("/wp-json/wc/v3/payments/initialize", {
        payment_method: request.paymentMethodId,
        order_id: request.orderId,
        amount: request.amount,
        currency: request.currency,
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        metadata: request.metadata
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const initResponse = {
        paymentId: data.payment_id,
        redirectUrl: data.redirect_url,
        requiresRedirect: data.requires_redirect || false,
        clientSecret: data.client_secret,
        paymentIntentId: data.payment_intent_id,
        instructions: data.instructions,
        expiresAt: data.expires_at ? new Date(data.expires_at) : void 0
      };
      return Ok(initResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Payment initialization failed",
        500,
        error
      ));
    }
  }
  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/wp-json/wc/v3/payments/${paymentId}/status`);
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const statusResponse = {
        paymentId: data.payment_id,
        status: data.status,
        transactionId: data.transaction_id,
        failureReason: data.failure_reason,
        redirectUrl: data.redirect_url,
        nextAction: data.next_action ? {
          type: data.next_action.type,
          url: data.next_action.url,
          data: data.next_action.data
        } : void 0
      };
      return Ok(statusResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Payment status check failed",
        500,
        error
      ));
    }
  }
  /**
   * Handle payment callback from gateway
   */
  async handlePaymentCallback(callbackData) {
    try {
      if (callbackData.signature) {
        const isValid = await this.verifyCallbackSignature(callbackData);
        if (!isValid) {
          return Err(ErrorFactory.authError(
            "Invalid payment callback signature"
          ));
        }
      }
      const response = await this.client.post("/wp-json/wc/v3/payments/callback", {
        payment_id: callbackData.paymentId,
        order_id: callbackData.orderId,
        status: callbackData.status,
        transaction_id: callbackData.transactionId,
        signature: callbackData.signature,
        metadata: callbackData.metadata
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const statusResponse = {
        paymentId: data.payment_id,
        status: data.status,
        transactionId: data.transaction_id,
        failureReason: data.failure_reason,
        redirectUrl: data.redirect_url
      };
      return Ok(statusResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Payment callback processing failed",
        500,
        error
      ));
    }
  }
  /**
   * Cancel payment
   */
  async cancelPayment(paymentId, reason) {
    try {
      const response = await this.client.post(`/wp-json/wc/v3/payments/${paymentId}/cancel`, {
        reason
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Payment cancellation failed",
        500,
        error
      ));
    }
  }
  /**
   * Validate payment method selection
   */
  async validatePaymentMethod(methodId, amount, currency = this.config.currency) {
    try {
      const errors = [];
      const warnings = [];
      if (!this.config.supportedMethods.includes(methodId)) {
        errors.push(`Payment method "${methodId}" is not supported`);
      }
      if (amount < this.config.minimumAmount) {
        errors.push(`Amount is below minimum (${this.config.minimumAmount} ${currency})`);
      }
      if (this.config.maximumAmount && amount > this.config.maximumAmount) {
        errors.push(`Amount exceeds maximum (${this.config.maximumAmount} ${currency})`);
      }
      const methodsResult = await this.getAvailablePaymentMethods(amount, currency);
      if (isErr(methodsResult)) {
        return Err(unwrapErr(methodsResult));
      }
      const methods = unwrap(methodsResult);
      const method = methods.availableMethods.find((m) => m.id === methodId);
      if (!method) {
        errors.push(`Payment method "${methodId}" is not available`);
      } else if (!method.enabled) {
        errors.push(`Payment method "${methodId}" is currently disabled`);
      } else {
        const methodMinimum = methods.minimumAmounts[methodId];
        if (methodMinimum && amount < methodMinimum) {
          errors.push(`Amount is below minimum for ${method.title} (${methodMinimum} ${currency})`);
        }
        if (method.description) {
          warnings.push(method.description);
        }
      }
      return Ok({
        isValid: errors.length === 0,
        errors,
        warnings
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Payment method validation failed",
        error
      ));
    }
  }
  /**
   * Generate payment redirect URL
   */
  generateRedirectUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
  /**
   * Parse payment callback URL parameters
   */
  parseCallbackUrl(callbackUrl) {
    const url = new URL(callbackUrl);
    const params = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }
  /**
   * Check if payment method requires redirect
   */
  requiresRedirect(methodId) {
    const redirectMethods = [
      "paypal",
      "stripe_checkout",
      "bank_transfer",
      "cash_on_delivery"
    ];
    return redirectMethods.includes(methodId);
  }
  /**
   * Get payment method display information
   */
  getPaymentMethodDisplay(method) {
    return {
      title: method.title || method.id,
      description: method.description || "",
      icon: method.icon,
      acceptedCards: method.acceptedCards
    };
  }
  /**
   * Filter payment methods by criteria
   */
  filterPaymentMethods(methods, criteria) {
    return methods.filter((method) => {
      if (criteria.enabled !== void 0 && method.enabled !== criteria.enabled) {
        return false;
      }
      if (criteria.minAmount && method.minimumAmount && criteria.minAmount < method.minimumAmount) {
        return false;
      }
      if (criteria.country && method.supportedCountries && !method.supportedCountries.includes(criteria.country.toUpperCase())) {
        return false;
      }
      if (criteria.currency && method.supportedCurrencies && !method.supportedCurrencies.includes(criteria.currency.toUpperCase())) {
        return false;
      }
      return true;
    });
  }
  /**
   * Clear payment methods cache
   */
  async clearPaymentCache() {
    try {
      await this.cache.invalidatePattern("payment-");
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        "Failed to clear payment cache",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Verify payment callback signature
   */
  async verifyCallbackSignature(callbackData) {
    try {
      return true;
    } catch (error) {
      return false;
    }
  }
}
const DEFAULT_PAYMENT_CONFIG = {
  enabled: true,
  testMode: true,
  supportedMethods: ["stripe", "paypal", "bank_transfer", "cash_on_delivery"],
  minimumAmount: 1,
  currency: "USD",
  returnUrl: "/checkout/payment/return",
  cancelUrl: "/checkout/payment/cancel",
  cacheTimeout: 10
  // 10 minutes
};
class CheckoutValidationService {
  constructor(addressManager, shippingService, paymentService) {
    this.addressManager = addressManager;
    this.shippingService = shippingService;
    this.paymentService = paymentService;
  }
  /**
   * Validate entire checkout process
   */
  async validateCheckout(context) {
    try {
      const validationResults = [];
      const criticalErrors = [];
      const warnings = [];
      const blockers = [];
      const recommendations = [];
      const billingResult = await this.validateBillingAddress(context);
      if (isErr(billingResult)) {
        return Err(unwrapErr(billingResult));
      }
      validationResults.push(unwrap(billingResult));
      if (!context.checkoutSession.useShippingAsBilling) {
        const shippingResult = await this.validateShippingAddress(context);
        if (isErr(shippingResult)) {
          return Err(unwrapErr(shippingResult));
        }
        validationResults.push(unwrap(shippingResult));
      }
      if (context.checkoutSession.selectedShippingMethod) {
        const shippingMethodResult = await this.validateShippingMethod(context);
        if (isErr(shippingMethodResult)) {
          return Err(unwrapErr(shippingMethodResult));
        }
        validationResults.push(unwrap(shippingMethodResult));
      }
      if (context.checkoutSession.selectedPaymentMethod) {
        const paymentResult = await this.validatePaymentMethod(context);
        if (isErr(paymentResult)) {
          return Err(unwrapErr(paymentResult));
        }
        validationResults.push(unwrap(paymentResult));
      }
      const cartResult = await this.validateCart(context);
      if (isErr(cartResult)) {
        return Err(unwrapErr(cartResult));
      }
      validationResults.push(unwrap(cartResult));
      const totalsResult = await this.validateOrderTotals(context);
      if (isErr(totalsResult)) {
        return Err(unwrapErr(totalsResult));
      }
      validationResults.push(unwrap(totalsResult));
      const allValid = validationResults.every((result) => result.isValid);
      validationResults.forEach((result) => {
        if (!result.isValid) {
          criticalErrors.push(...result.errors);
        }
        warnings.push(...result.warnings);
      });
      const hasAddressErrors = validationResults.some(
        (r) => r.component === "address" && !r.isValid
      );
      const hasPaymentErrors = validationResults.some(
        (r) => r.component === "payment" && !r.isValid
      );
      const hasStockErrors = validationResults.some(
        (r) => r.component === "cart" && !r.isValid
      );
      if (hasAddressErrors) {
        blockers.push("Address information is incomplete or invalid");
      }
      if (hasPaymentErrors) {
        blockers.push("Payment method is not valid or available");
      }
      if (hasStockErrors) {
        blockers.push("Some items are out of stock or unavailable");
      }
      this.generateRecommendations(validationResults, recommendations);
      const canProceed = allValid && blockers.length === 0;
      return Ok({
        isValid: allValid,
        canProceed,
        validationResults,
        criticalErrors,
        warnings,
        blockers,
        recommendations
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Checkout validation failed",
        error
      ));
    }
  }
  /**
   * Validate billing address
   */
  async validateBillingAddress(context) {
    try {
      const billingAddress = context.checkoutSession.billingAddress;
      if (!billingAddress) {
        return Ok({
          component: "address",
          isValid: false,
          errors: ["Billing address is required"],
          warnings: []
        });
      }
      const addressContext = {
        addressType: "billing",
        isGuestCheckout: context.isGuestCheckout,
        checkoutRules: context.validationRules,
        fieldRequirements: {
          email: context.isGuestCheckout || context.validationRules.requireEmail
        }
      };
      const validation = await this.addressManager.validateAddressWithContext(
        billingAddress,
        addressContext
      );
      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }
      const result = unwrap(validation);
      return Ok({
        component: "address",
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { addressType: "billing" }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Billing address validation failed",
        error
      ));
    }
  }
  /**
   * Validate shipping address
   */
  async validateShippingAddress(context) {
    try {
      const shippingAddress = context.checkoutSession.shippingAddress;
      if (!shippingAddress) {
        return Ok({
          component: "address",
          isValid: false,
          errors: ["Shipping address is required"],
          warnings: []
        });
      }
      const addressContext = {
        addressType: "shipping",
        isGuestCheckout: context.isGuestCheckout,
        checkoutRules: context.validationRules
      };
      const validation = await this.addressManager.validateAddressWithContext(
        shippingAddress,
        addressContext
      );
      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }
      const result = unwrap(validation);
      return Ok({
        component: "address",
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { addressType: "shipping" }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Shipping address validation failed",
        error
      ));
    }
  }
  /**
   * Validate selected shipping method
   */
  async validateShippingMethod(context) {
    try {
      const selectedMethod = context.checkoutSession.selectedShippingMethod;
      const shippingAddress = context.checkoutSession.useShippingAsBilling ? context.checkoutSession.billingAddress : context.checkoutSession.shippingAddress;
      if (!selectedMethod || !shippingAddress) {
        return Ok({
          component: "shipping",
          isValid: false,
          errors: ["Shipping method and address are required"],
          warnings: []
        });
      }
      const ratesResult = await this.shippingService.getShippingRates({
        destination: shippingAddress,
        cartItems: context.cart.items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          weight: item.weight,
          dimensions: item.dimensions
        })),
        cartTotal: context.cart.totals.total,
        currency: context.cart.currency
      });
      if (isErr(ratesResult)) {
        return Err(unwrapErr(ratesResult));
      }
      const rates = unwrap(ratesResult);
      const isValidMethod = this.shippingService.validateShippingSelection(
        selectedMethod,
        rates.rates
      );
      if (!isValidMethod) {
        return Ok({
          component: "shipping",
          isValid: false,
          errors: ["Selected shipping method is no longer available"],
          warnings: []
        });
      }
      return Ok({
        component: "shipping",
        isValid: true,
        errors: [],
        warnings: [],
        metadata: { selectedMethod }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Shipping method validation failed",
        error
      ));
    }
  }
  /**
   * Validate selected payment method
   */
  async validatePaymentMethod(context) {
    try {
      const selectedMethod = context.checkoutSession.selectedPaymentMethod;
      if (!selectedMethod) {
        return Ok({
          component: "payment",
          isValid: false,
          errors: ["Payment method is required"],
          warnings: []
        });
      }
      const validation = await this.paymentService.validatePaymentMethod(
        selectedMethod.id,
        context.cart.totals.total,
        context.cart.currency
      );
      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }
      const result = unwrap(validation);
      return Ok({
        component: "payment",
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { selectedMethod }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Payment method validation failed",
        error
      ));
    }
  }
  /**
   * Validate cart and stock availability
   */
  async validateCart(context) {
    try {
      const cart = context.cart;
      const errors = [];
      const warnings = [];
      if (cart.items.length === 0) {
        errors.push("Cart is empty");
      }
      if (context.validationRules.minimumOrderAmount && cart.totals.total < context.validationRules.minimumOrderAmount) {
        errors.push(`Minimum order amount is ${context.validationRules.minimumOrderAmount}`);
      }
      if (context.validationRules.maximumOrderAmount && cart.totals.total > context.validationRules.maximumOrderAmount) {
        errors.push(`Maximum order amount is ${context.validationRules.maximumOrderAmount}`);
      }
      const isValid = errors.length === 0;
      return Ok({
        component: "cart",
        isValid,
        errors,
        warnings,
        metadata: {
          itemCount: cart.items.length,
          total: cart.totals.total
        }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Cart validation failed",
        error
      ));
    }
  }
  /**
   * Validate order totals consistency
   */
  async validateOrderTotals(context) {
    try {
      const totals = context.cart.totals;
      const errors = [];
      const warnings = [];
      if (totals.total < 0) {
        errors.push("Order total cannot be negative");
      }
      if (totals.subtotal < 0) {
        errors.push("Subtotal cannot be negative");
      }
      if (totals.tax < 0) {
        errors.push("Tax amount cannot be negative");
      }
      const calculatedTotal = totals.subtotal + totals.tax + totals.shipping + totals.shippingTax + totals.fees + totals.feesTax - totals.discount;
      if (Math.abs(calculatedTotal - totals.total) > 0.01) {
        errors.push("Order total calculation is inconsistent");
      }
      if (totals.total > 1e5) {
        warnings.push("Order total is unusually high");
      }
      const isValid = errors.length === 0;
      return Ok({
        component: "totals",
        isValid,
        errors,
        warnings,
        metadata: {
          calculatedTotal,
          actualTotal: totals.total
        }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Order totals validation failed",
        error
      ));
    }
  }
  /**
   * Validate specific checkout step
   */
  async validateStep(step, context) {
    try {
      const validationResults = [];
      switch (step) {
        case 1:
          const billingResult = await this.validateBillingAddress(context);
          if (isErr(billingResult))
            return Err(unwrapErr(billingResult));
          validationResults.push(unwrap(billingResult));
          if (!context.checkoutSession.useShippingAsBilling) {
            const shippingResult = await this.validateShippingAddress(context);
            if (isErr(shippingResult))
              return Err(unwrapErr(shippingResult));
            validationResults.push(unwrap(shippingResult));
          }
          break;
        case 2:
          if (context.checkoutSession.selectedShippingMethod) {
            const shippingResult = await this.validateShippingMethod(context);
            if (isErr(shippingResult))
              return Err(unwrapErr(shippingResult));
            validationResults.push(unwrap(shippingResult));
          }
          break;
        case 3:
          if (context.checkoutSession.selectedPaymentMethod) {
            const paymentResult = await this.validatePaymentMethod(context);
            if (isErr(paymentResult))
              return Err(unwrapErr(paymentResult));
            validationResults.push(unwrap(paymentResult));
          }
          break;
        case 4:
          return this.validateCheckout(context);
        default:
          return Err(ErrorFactory.validationError(
            `Invalid checkout step: ${step}`
          ));
      }
      const allValid = validationResults.every((result) => result.isValid);
      const criticalErrors = validationResults.flatMap((r) => r.errors);
      const warnings = validationResults.flatMap((r) => r.warnings);
      return Ok({
        isValid: allValid,
        canProceed: allValid,
        validationResults,
        criticalErrors,
        warnings,
        blockers: allValid ? [] : ["Step validation failed"],
        recommendations: []
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Step validation failed",
        error
      ));
    }
  }
  /**
   * Quick validation for specific fields
   */
  async validateField(fieldName, value, context) {
    try {
      const errors = [];
      const warnings = [];
      switch (fieldName) {
        case "email":
          if (typeof value === "string") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push("Invalid email format");
            }
          } else {
            errors.push("Email must be a string");
          }
          break;
        case "phone":
          if (typeof value === "string" && value.length > 0) {
            const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
            if (!phoneRegex.test(value)) {
              errors.push("Invalid phone number format");
            }
          }
          break;
        case "postcode":
          if (typeof value === "string" && value.length > 0) {
            const billingCountry = context.checkoutSession.billingAddress?.country;
            if (billingCountry) {
              const countryConfig = this.addressManager.getCountryConfig(billingCountry);
              if (countryConfig?.postcodePattern) {
                const regex = new RegExp(countryConfig.postcodePattern);
                if (!regex.test(value)) {
                  errors.push(`Invalid postal code format for ${countryConfig.name}`);
                }
              }
            }
          }
          break;
        default:
          return Err(ErrorFactory.validationError(
            `Unknown field: ${fieldName}`
          ));
      }
      return Ok({
        component: "address",
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { fieldName, value }
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Field validation failed",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(validationResults, recommendations) {
    const addressResults = validationResults.filter((r) => r.component === "address");
    if (addressResults.some((r) => r.warnings.length > 0)) {
      recommendations.push("Review address information for accuracy");
    }
    const shippingResults = validationResults.filter((r) => r.component === "shipping");
    if (shippingResults.length > 0) {
      recommendations.push("Consider different shipping options for better rates");
    }
    const paymentResults = validationResults.filter((r) => r.component === "payment");
    if (paymentResults.some((r) => r.warnings.length > 0)) {
      recommendations.push("Check payment method details");
    }
    const cartResults = validationResults.filter((r) => r.component === "cart");
    if (cartResults.some((r) => r.warnings.length > 0)) {
      recommendations.push("Review cart items and quantities");
    }
  }
}
class ValidationRuleBuilder {
  constructor() {
    this.rules = {};
  }
  /**
   * Set minimum order amount
   */
  minimumOrderAmount(amount) {
    this.rules = { ...this.rules, minimumOrderAmount: amount };
    return this;
  }
  /**
   * Set maximum order amount
   */
  maximumOrderAmount(amount) {
    this.rules = { ...this.rules, maximumOrderAmount: amount };
    return this;
  }
  /**
   * Require email address
   */
  requireEmail(required = true) {
    this.rules = { ...this.rules, requireEmail: required };
    return this;
  }
  /**
   * Require phone number
   */
  requirePhoneNumber(required = true) {
    this.rules = { ...this.rules, requirePhoneNumber: required };
    return this;
  }
  /**
   * Require company name
   */
  requireCompanyName(required = true) {
    this.rules = { ...this.rules, requireCompanyName: required };
    return this;
  }
  /**
   * Set required fields
   */
  requiredFields(fields) {
    this.rules = { ...this.rules, requiredFields: fields };
    return this;
  }
  /**
   * Set return URL
   */
  returnUrl(url) {
    this.rules = { ...this.rules, returnUrl: url };
    return this;
  }
  /**
   * Set cancel URL
   */
  cancelUrl(url) {
    this.rules = { ...this.rules, cancelUrl: url };
    return this;
  }
  /**
   * Build the validation rules
   */
  build() {
    const rules = {
      requireShippingAddress: this.rules.requireShippingAddress ?? true,
      requireBillingAddress: this.rules.requireBillingAddress ?? true,
      requirePhoneNumber: this.rules.requirePhoneNumber ?? false,
      requireCompanyName: this.rules.requireCompanyName ?? false,
      allowGuestCheckout: this.rules.allowGuestCheckout ?? true,
      restrictedCountries: this.rules.restrictedCountries ?? [],
      requiredFields: this.rules.requiredFields ?? []
    };
    if (this.rules.requireEmail !== void 0) {
      rules.requireEmail = this.rules.requireEmail;
    }
    if (this.rules.minimumOrderAmount !== void 0) {
      rules.minimumOrderAmount = this.rules.minimumOrderAmount;
    }
    if (this.rules.maximumOrderAmount !== void 0) {
      rules.maximumOrderAmount = this.rules.maximumOrderAmount;
    }
    if (this.rules.returnUrl !== void 0) {
      rules.returnUrl = this.rules.returnUrl;
    }
    if (this.rules.cancelUrl !== void 0) {
      rules.cancelUrl = this.rules.cancelUrl;
    }
    return rules;
  }
}
function createValidationRules() {
  return new ValidationRuleBuilder();
}
class CheckoutFlowManager {
  constructor(addressManager, shippingService, paymentService, validationService, config, eventHandlers = {}) {
    this.paymentService = paymentService;
    this.validationService = validationService;
    this.config = config;
    this.eventHandlers = eventHandlers;
    this.sessionId = this.generateSessionId();
    this.flowState = this.initializeFlowState();
  }
  /**
   * Initialize checkout flow with cart
   */
  async initializeCheckout(cart, isGuestCheckout = false) {
    try {
      const orderTotals = {
        subtotal: cart.totals.subtotal,
        tax: cart.totals.totalTax,
        shipping: cart.totals.shippingTotal,
        shippingTax: cart.totals.shippingTax,
        discount: cart.totals.discountTotal,
        fees: cart.totals.feeTotal,
        feesTax: cart.totals.feeTax,
        total: cart.totals.total,
        currency: cart.currency
      };
      const session = {
        id: this.sessionId,
        cartId: cart.sessionId,
        isGuestCheckout,
        orderTotals,
        flow: this.createEmptyCheckoutFlow(),
        expiresAt: new Date(Date.now() + this.config.sessionTimeout * 60 * 1e3),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.flowState = {
        currentStep: 1,
        completedSteps: [],
        availableSteps: this.buildAvailableSteps(cart),
        canProceed: false,
        canGoBack: false,
        session
      };
      if (this.config.persistSession) {
        await this.persistSession();
      }
      return Ok(this.flowState);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to initialize checkout flow",
        error
      ));
    }
  }
  /**
   * Move to next step
   */
  async nextStep(cart) {
    try {
      const currentStep = this.flowState.currentStep;
      const validationResult = await this.validateCurrentStep(cart);
      if (isErr(validationResult)) {
        return Err(unwrapErr(validationResult));
      }
      const validation = unwrap(validationResult);
      if (!validation.canProceed) {
        return Ok({
          success: false,
          newStep: currentStep,
          previousStep: currentStep,
          validationResult: validation,
          errors: validation.criticalErrors,
          blockers: validation.blockers
        });
      }
      const nextStep = currentStep + 1;
      const maxStep = this.flowState.availableSteps.length;
      if (nextStep > maxStep) {
        return this.completeCheckout(cart);
      }
      const previousStep = this.flowState.currentStep;
      this.flowState = {
        ...this.flowState,
        currentStep: nextStep,
        completedSteps: [...this.flowState.completedSteps, currentStep],
        canProceed: false,
        // Will be determined by validation
        canGoBack: true,
        validationResult: validation
      };
      if (this.config.persistSession) {
        await this.persistSession();
      }
      this.eventHandlers.onStepChange?.(nextStep, previousStep);
      this.eventHandlers.onStepComplete?.(currentStep);
      return Ok({
        success: true,
        newStep: nextStep,
        previousStep,
        validationResult: validation,
        errors: [],
        blockers: []
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to advance to next step",
        error
      ));
    }
  }
  /**
   * Move to previous step
   */
  async previousStep() {
    try {
      const currentStep = this.flowState.currentStep;
      if (currentStep <= 1 || !this.flowState.canGoBack) {
        return Err(ErrorFactory.validationError(
          "Cannot go back from current step"
        ));
      }
      const previousStep = currentStep - 1;
      this.flowState = {
        ...this.flowState,
        currentStep: previousStep,
        completedSteps: this.flowState.completedSteps.filter((step) => step !== currentStep),
        canProceed: true,
        // Previous steps were valid
        canGoBack: previousStep > 1
      };
      if (this.config.persistSession) {
        await this.persistSession();
      }
      this.eventHandlers.onStepChange?.(previousStep, currentStep);
      return Ok({
        success: true,
        newStep: previousStep,
        previousStep: currentStep,
        errors: [],
        blockers: []
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to go back to previous step",
        error
      ));
    }
  }
  /**
   * Jump to specific step
   */
  async goToStep(targetStep, cart) {
    try {
      const currentStep = this.flowState.currentStep;
      if (targetStep < 1 || targetStep > this.flowState.availableSteps.length) {
        return Err(ErrorFactory.validationError(
          `Invalid step: ${targetStep}`
        ));
      }
      if (targetStep > currentStep) {
        for (let step = currentStep; step < targetStep; step++) {
          const validationResult = await this.validateStep(step, cart);
          if (isErr(validationResult)) {
            return Err(unwrapErr(validationResult));
          }
          const validation = unwrap(validationResult);
          if (!validation.canProceed) {
            return Ok({
              success: false,
              newStep: step,
              previousStep: currentStep,
              validationResult: validation,
              errors: validation.criticalErrors,
              blockers: validation.blockers
            });
          }
        }
      }
      this.flowState = {
        ...this.flowState,
        currentStep: targetStep,
        completedSteps: targetStep > currentStep ? [...this.flowState.completedSteps, ...Array.from({ length: targetStep - currentStep }, (_, i) => currentStep + i)] : this.flowState.completedSteps.filter((step) => step < targetStep),
        canGoBack: targetStep > 1
      };
      if (this.config.persistSession) {
        await this.persistSession();
      }
      this.eventHandlers.onStepChange?.(targetStep, currentStep);
      return Ok({
        success: true,
        newStep: targetStep,
        previousStep: currentStep,
        errors: [],
        blockers: []
      });
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to jump to step",
        error
      ));
    }
  }
  /**
   * Update checkout session data
   */
  async updateSession(updates, cart) {
    try {
      this.flowState = {
        ...this.flowState,
        session: {
          ...this.flowState.session,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }
      };
      const validationResult = await this.validateCurrentStep(cart);
      if (isOk(validationResult)) {
        const validation = unwrap(validationResult);
        this.flowState = {
          ...this.flowState,
          canProceed: validation.canProceed,
          validationResult: validation
        };
      }
      if (this.config.persistSession) {
        await this.persistSession();
      }
      return Ok(this.flowState);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to update checkout session",
        error
      ));
    }
  }
  /**
   * Validate current step
   */
  async validateCurrentStep(cart) {
    return this.validateStep(this.flowState.currentStep, cart);
  }
  /**
   * Validate specific step
   */
  async validateStep(step, cart) {
    try {
      const context = {
        checkoutSession: this.flowState.session,
        cart,
        validationRules: this.config.validationRules,
        isGuestCheckout: this.flowState.session.isGuestCheckout ?? false,
        currentStep: step,
        skipOptionalValidations: this.config.allowSkipOptional
      };
      return this.validationService.validateStep(step, context);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Step validation failed",
        error
      ));
    }
  }
  /**
   * Complete checkout and create order
   */
  async completeCheckout(cart) {
    try {
      const context = {
        checkoutSession: this.flowState.session,
        cart,
        validationRules: this.config.validationRules,
        isGuestCheckout: this.flowState.session.isGuestCheckout ?? false,
        currentStep: this.flowState.currentStep
      };
      const validationResult = await this.validationService.validateCheckout(context);
      if (isErr(validationResult)) {
        return Err(unwrapErr(validationResult));
      }
      const validation = unwrap(validationResult);
      if (!validation.canProceed) {
        this.eventHandlers.onValidationError?.(validation.criticalErrors);
        return Ok({
          success: false,
          newStep: this.flowState.currentStep,
          previousStep: this.flowState.currentStep,
          validationResult: validation,
          errors: validation.criticalErrors,
          blockers: validation.blockers
        });
      }
      const order = await this.createOrder(cart);
      if (isErr(order)) {
        return Err(unwrapErr(order));
      }
      const createdOrder = unwrap(order);
      if (this.flowState.session.selectedPaymentMethod) {
        const paymentInit = await this.initializePayment(createdOrder);
        if (isOk(paymentInit)) {
          const payment = unwrap(paymentInit);
          return Ok({
            success: true,
            orderId: createdOrder.id.toString(),
            redirectUrl: payment.redirectUrl,
            paymentStatus: "pending",
            requiresRedirect: payment.requiresRedirect,
            clientSecret: payment.clientSecret,
            paymentIntentId: payment.paymentIntentId
          });
        }
      }
      this.flowState = {
        ...this.flowState,
        currentStep: this.flowState.availableSteps.length + 1,
        completedSteps: [...this.flowState.completedSteps, this.flowState.currentStep],
        canProceed: false,
        canGoBack: false
      };
      this.eventHandlers.onCheckoutComplete?.(createdOrder);
      return Ok({
        success: true,
        newStep: this.flowState.currentStep,
        previousStep: this.flowState.currentStep - 1,
        errors: [],
        blockers: []
      });
    } catch (error) {
      const woError = ErrorFactory.validationError(
        "Checkout completion failed",
        error
      );
      this.eventHandlers.onCheckoutError?.(woError);
      return Err(woError);
    }
  }
  /**
   * Get current flow state
   */
  getFlowState() {
    return this.flowState;
  }
  /**
   * Get current step information
   */
  getCurrentStep() {
    const stepIndex = this.flowState.currentStep - 1;
    return this.flowState.availableSteps[stepIndex] || null;
  }
  /**
   * Check if step is completed
   */
  isStepCompleted(step) {
    return this.flowState.completedSteps.includes(step);
  }
  /**
   * Reset checkout flow
   */
  async resetFlow() {
    try {
      this.flowState = this.initializeFlowState();
      this.sessionId = this.generateSessionId();
      if (this.config.persistSession) {
        await this.clearPersistedSession();
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Failed to reset checkout flow",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Initialize empty flow state
   */
  initializeFlowState() {
    return {
      currentStep: 1,
      completedSteps: [],
      availableSteps: [],
      canProceed: false,
      canGoBack: false,
      session: {
        id: this.sessionId,
        cartId: "",
        isGuestCheckout: false,
        useShippingAsBilling: true,
        orderNotes: "",
        termsAccepted: false,
        newsletterOptIn: false,
        orderTotals: {
          subtotal: 0,
          tax: 0,
          shipping: 0,
          shippingTax: 0,
          discount: 0,
          fees: 0,
          feesTax: 0,
          total: 0,
          currency: "USD"
        },
        flow: {
          steps: [],
          currentStep: "cart_review",
          canProceed: false,
          canGoBack: false,
          progress: {
            current: 1,
            total: 4,
            percentage: 25
          }
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1e3),
        // 1 hour
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    };
  }
  /**
   * Build available steps based on cart contents
   */
  buildAvailableSteps(cart) {
    const steps = [];
    steps.push({
      type: "address",
      title: "Billing & Shipping",
      description: "Enter your billing and shipping information",
      completed: false,
      valid: false,
      errors: []
    });
    const hasPhysicalItems = cart.items.length > 0;
    if (hasPhysicalItems) {
      steps.push({
        type: "shipping",
        title: "Shipping Method",
        description: "Choose your shipping method",
        completed: false,
        valid: false,
        errors: []
      });
    }
    steps.push({
      type: "payment",
      title: "Payment",
      description: "Choose your payment method",
      completed: false,
      valid: false,
      errors: []
    });
    steps.push({
      type: "review",
      title: "Review Order",
      description: "Review your order before placing it",
      completed: false,
      valid: false,
      errors: []
    });
    return steps;
  }
  /**
   * Create order (placeholder - would integrate with order service)
   */
  async createOrder(cart) {
    try {
      const order = {
        id: this.generateOrderId(),
        number: `ORDER-${Date.now()}`,
        status: "pending",
        currency: cart.currency,
        total: cart.totals.total,
        subtotal: cart.totals.subtotal,
        totalTax: cart.totals.tax,
        shippingTotal: cart.totals.shipping,
        shippingTax: cart.totals.shippingTax,
        discountTotal: cart.totals.discount,
        feeTotal: cart.totals.fees,
        feeTax: cart.totals.feeTax,
        billingAddress: this.flowState.session.billingAddress,
        shippingAddress: this.flowState.session.useShippingAsBilling ? this.flowState.session.billingAddress : this.flowState.session.shippingAddress,
        paymentMethod: this.flowState.session.selectedPaymentMethod?.id || "",
        shippingMethod: this.flowState.session.selectedShippingMethod?.methodId || "",
        orderNotes: this.flowState.session.orderNotes,
        lineItems: cart.items.map((item, index) => ({
          id: index + 1,
          // Use index as numeric ID
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          subtotal: item.price * item.quantity,
          totalTax: 0,
          // Default to 0 - would be calculated properly in real implementation
          subtotalTax: 0,
          // Default to 0 - would be calculated properly in real implementation
          name: item.name,
          sku: item.sku,
          meta: []
          // Empty meta array for now
        })),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      return Ok(order);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Order creation failed",
        500,
        error
      ));
    }
  }
  /**
   * Initialize payment for order
   */
  async initializePayment(order) {
    try {
      if (!this.flowState.session.selectedPaymentMethod) {
        return Ok({});
      }
      const paymentRequest = {
        paymentMethodId: this.flowState.session.selectedPaymentMethod.id,
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        returnUrl: this.config.validationRules.returnUrl || "/checkout/success",
        cancelUrl: this.config.validationRules.cancelUrl || "/checkout/cancel"
      };
      const result = await this.paymentService.initializePayment(paymentRequest);
      if (isErr(result)) {
        return Err(unwrapErr(result));
      }
      const payment = unwrap(result);
      return Ok({
        redirectUrl: payment.redirectUrl
      });
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Payment initialization failed",
        500,
        error
      ));
    }
  }
  /**
   * Persist session (placeholder implementation)
   */
  async persistSession() {
    if (typeof window !== "undefined") {
      localStorage.setItem(`woo-checkout-session-${this.sessionId}`, JSON.stringify(this.flowState));
    }
  }
  /**
   * Clear persisted session
   */
  async clearPersistedSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`woo-checkout-session-${this.sessionId}`);
    }
  }
  /**
   * Generate session ID
   */
  generateSessionId() {
    return `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Generate order ID
   */
  generateOrderId() {
    return Date.now();
  }
}
const DEFAULT_CHECKOUT_FLOW_CONFIG = {
  steps: ["address", "shipping", "payment", "review"],
  allowSkipOptional: false,
  persistSession: true,
  sessionTimeout: 30,
  // 30 minutes
  autoAdvance: false,
  validationRules: {
    minimumOrderAmount: 0,
    requireEmail: true,
    requirePhoneNumber: false,
    requireCompanyName: false,
    requiredFields: []
  }
};
class OrderProcessingService {
  constructor(client, cache, config) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }
  /**
   * Create new order from checkout session
   */
  async createOrder(request) {
    try {
      const validationResult = await this.validateOrderCreation(request);
      if (isErr(validationResult)) {
        return Err(unwrapErr(validationResult));
      }
      if (this.config.autoUpdateInventory) {
        const inventoryResult = await this.reserveInventory(request.cart);
        if (isErr(inventoryResult)) {
          return Err(unwrapErr(inventoryResult));
        }
      }
      const orderData = this.buildOrderData(request);
      const response = await this.client.post("/wp-json/wc/v3/orders", orderData);
      if (isErr(response)) {
        if (this.config.autoUpdateInventory) {
          await this.releaseInventory(request.cart);
        }
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const order = this.mapOrderResponse(data);
      if (this.config.autoUpdateInventory) {
        await this.updateInventory({
          orderId: order.id.toString(),
          items: request.cart.items.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            operation: "decrease"
          }))
        });
      }
      await this.cache.set(`order:${order.id}`, order, this.config.cacheTimeout * 60);
      const orderResponse = {
        order,
        requiresPayment: order.total > 0 && order.status === "pending",
        paymentUrl: data.payment_url,
        confirmationUrl: `/order-confirmation/${order.id}`
      };
      return Ok(orderResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Order creation failed",
        500,
        error
      ));
    }
  }
  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    try {
      const cached = await this.cache.get(`order:${orderId}`);
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }
      const response = await this.client.get(`/wp-json/wc/v3/orders/${orderId}`);
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const order = this.mapOrderResponse(data);
      await this.cache.set(`order:${orderId}`, order, this.config.cacheTimeout * 60);
      return Ok(order);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to fetch order",
        500,
        error
      ));
    }
  }
  /**
   * Update order status
   */
  async updateOrderStatus(request) {
    try {
      const response = await this.client.put(`/wp-json/wc/v3/orders/${request.orderId}`, {
        status: request.status,
        customer_note: request.note,
        notify_customer: request.notifyCustomer || false
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const order = this.mapOrderResponse(data);
      await this.cache.set(`order:${order.id}`, order, this.config.cacheTimeout * 60);
      return Ok(order);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to update order status",
        500,
        error
      ));
    }
  }
  /**
   * Confirm order completion
   */
  async confirmOrder(request) {
    try {
      const orderResult = await this.getOrder(request.orderId);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }
      unwrap(orderResult);
      const updateData = {
        status: "processing",
        transaction_id: request.transactionId,
        date_paid: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (request.paymentStatus) {
        updateData.payment_status = request.paymentStatus;
      }
      const response = await this.client.put(`/wp-json/wc/v3/orders/${request.orderId}`, updateData);
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const confirmedOrder = this.mapOrderResponse(data);
      await this.cache.set(`order:${confirmedOrder.id}`, confirmedOrder, this.config.cacheTimeout * 60);
      if (this.config.sendConfirmationEmail) {
        await this.sendOrderConfirmationEmail(confirmedOrder);
      }
      return Ok(confirmedOrder);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Order confirmation failed",
        500,
        error
      ));
    }
  }
  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason) {
    try {
      const orderResult = await this.getOrder(orderId);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }
      const order = unwrap(orderResult);
      if (!["pending", "processing", "on-hold"].includes(order.status)) {
        return Err(ErrorFactory.validationError(
          `Cannot cancel order with status: ${order.status}`
        ));
      }
      const response = await this.client.put(`/wp-json/wc/v3/orders/${orderId}`, {
        status: "cancelled",
        customer_note: reason || "Order cancelled by customer"
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const cancelledOrder = this.mapOrderResponse(data);
      if (this.config.autoUpdateInventory) {
        await this.updateInventory({
          orderId: cancelledOrder.id,
          items: cancelledOrder.lineItems.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            operation: "increase"
          }))
        });
      }
      await this.cache.set(`order:${cancelledOrder.id}`, cancelledOrder, this.config.cacheTimeout * 60);
      return Ok(cancelledOrder);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Order cancellation failed",
        500,
        error
      ));
    }
  }
  /**
   * Search orders by criteria
   */
  async searchOrders(criteria) {
    try {
      const params = {};
      if (criteria.status)
        params.status = criteria.status;
      if (criteria.customerId)
        params.customer = criteria.customerId;
      if (criteria.customerEmail)
        params.customer_email = criteria.customerEmail;
      if (criteria.dateFrom)
        params.after = criteria.dateFrom.toISOString();
      if (criteria.dateTo)
        params.before = criteria.dateTo.toISOString();
      if (criteria.paymentMethod)
        params.payment_method = criteria.paymentMethod;
      if (criteria.limit)
        params.per_page = criteria.limit.toString();
      if (criteria.offset)
        params.offset = criteria.offset.toString();
      const response = await this.client.get("/wp-json/wc/v3/orders", params);
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const orders = data.map((orderData) => this.mapOrderResponse(orderData));
      let filteredOrders = orders;
      if (criteria.minAmount || criteria.maxAmount) {
        filteredOrders = orders.filter((order) => {
          if (criteria.minAmount && order.total < criteria.minAmount)
            return false;
          if (criteria.maxAmount && order.total > criteria.maxAmount)
            return false;
          return true;
        });
      }
      return Ok(filteredOrders);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Order search failed",
        500,
        error
      ));
    }
  }
  /**
   * Get order notes
   */
  async getOrderNotes(orderId) {
    try {
      const response = await this.client.get(`/wp-json/wc/v3/orders/${orderId}/notes`);
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      const data = unwrap(response).data;
      const notes = data.map((note) => note.note);
      return Ok(notes);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to fetch order notes",
        500,
        error
      ));
    }
  }
  /**
   * Add note to order
   */
  async addOrderNote(orderId, note, customerNote = false) {
    try {
      const response = await this.client.post(`/wp-json/wc/v3/orders/${orderId}/notes`, {
        note,
        customer_note: customerNote
      });
      if (isErr(response)) {
        return Err(unwrapErr(response));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Failed to add order note",
        500,
        error
      ));
    }
  }
  /**
   * Generate order number
   */
  generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${this.config.orderNumberPrefix}${timestamp}${random}${this.config.orderNumberSuffix || ""}`;
  }
  /**
   * Validate order creation request
   */
  async validateOrderCreation(request) {
    try {
      const { cart, checkoutSession } = request;
      if (cart.items.length === 0) {
        return Err(ErrorFactory.validationError("Cart is empty"));
      }
      if (cart.totals.total < 0) {
        return Err(ErrorFactory.validationError("Order total cannot be negative"));
      }
      if (!checkoutSession.billingAddress) {
        return Err(ErrorFactory.validationError("Billing address is required"));
      }
      if (!checkoutSession.useShippingAsBilling && !checkoutSession.shippingAddress) {
        return Err(ErrorFactory.validationError("Shipping address is required"));
      }
      if (cart.totals.total > 0 && !checkoutSession.selectedPaymentMethod) {
        return Err(ErrorFactory.validationError("Payment method is required"));
      }
      if (!checkoutSession.termsAccepted) {
        return Err(ErrorFactory.validationError("Terms and conditions must be accepted"));
      }
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Order validation failed",
        error
      ));
    }
  }
  // Private helper methods
  /**
   * Build order data for API request
   */
  buildOrderData(request) {
    const { cart, checkoutSession } = request;
    return {
      payment_method: checkoutSession.selectedPaymentMethod?.id || "",
      payment_method_title: checkoutSession.selectedPaymentMethod?.title || "",
      set_paid: false,
      billing: this.mapAddressForAPI(checkoutSession.billingAddress),
      shipping: checkoutSession.useShippingAsBilling ? this.mapAddressForAPI(checkoutSession.billingAddress) : this.mapAddressForAPI(checkoutSession.shippingAddress),
      line_items: cart.items.map((item) => ({
        product_id: item.productId,
        variation_id: item.variationId || 0,
        quantity: item.quantity,
        price: item.price,
        total: item.total.toString()
      })),
      shipping_lines: checkoutSession.selectedShippingMethod ? [{
        method_id: checkoutSession.selectedShippingMethod.methodId,
        method_title: checkoutSession.selectedShippingMethod.title,
        total: checkoutSession.selectedShippingMethod.cost.toString()
      }] : [],
      customer_note: checkoutSession.orderNotes || "",
      status: this.config.defaultStatus,
      currency: cart.currency,
      customer_id: checkoutSession.isGuestCheckout ? 0 : void 0,
      meta_data: [
        {
          key: "_woo_headless_checkout_session",
          value: checkoutSession.id
        },
        {
          key: "_woo_headless_created",
          value: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]
    };
  }
  /**
   * Map address for API
   */
  mapAddressForAPI(address) {
    return {
      first_name: address.firstName,
      last_name: address.lastName,
      company: address.company || "",
      address_1: address.address1,
      address_2: address.address2 || "",
      city: address.city,
      state: address.state,
      postcode: address.postcode,
      country: address.country,
      email: address.email || "",
      phone: address.phone || ""
    };
  }
  /**
   * Map order response from API
   */
  mapOrderResponse(data) {
    return {
      id: data.id.toString(),
      number: data.number,
      status: data.status,
      currency: data.currency,
      total: parseFloat(data.total),
      subtotal: parseFloat(data.line_items_subtotal || "0"),
      totalTax: parseFloat(data.total_tax),
      shippingTotal: parseFloat(data.shipping_total),
      shippingTax: parseFloat(data.shipping_tax),
      discountTotal: parseFloat(data.discount_total),
      feeTotal: parseFloat(data.fee_total || "0"),
      feeTax: parseFloat(data.fee_tax || "0"),
      billingAddress: this.mapAddressFromAPI(data.billing),
      shippingAddress: this.mapAddressFromAPI(data.shipping),
      paymentMethod: data.payment_method,
      shippingMethod: data.shipping_lines[0]?.method_id || "",
      orderNotes: data.customer_note || "",
      lineItems: data.line_items.map((item) => ({
        id: item.id.toString(),
        productId: item.product_id,
        variationId: item.variation_id || void 0,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        name: item.name,
        sku: item.sku || ""
      })),
      createdAt: new Date(data.date_created),
      updatedAt: new Date(data.date_modified)
    };
  }
  /**
   * Map address from API response
   */
  mapAddressFromAPI(data) {
    return {
      firstName: data.first_name,
      lastName: data.last_name,
      company: data.company,
      address1: data.address_1,
      address2: data.address_2,
      city: data.city,
      state: data.state,
      postcode: data.postcode,
      country: data.country,
      email: data.email,
      phone: data.phone
    };
  }
  /**
   * Reserve inventory for cart items
   */
  async reserveInventory(cart) {
    try {
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Inventory reservation failed",
        500,
        error
      ));
    }
  }
  /**
   * Release reserved inventory
   */
  async releaseInventory(cart) {
    try {
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Inventory release failed",
        500,
        error
      ));
    }
  }
  /**
   * Update inventory
   */
  async updateInventory(request) {
    try {
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Inventory update failed",
        500,
        error
      ));
    }
  }
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(order) {
    try {
      return Ok(void 0);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Confirmation email failed",
        500,
        error
      ));
    }
  }
}
const DEFAULT_ORDER_PROCESSING_CONFIG = {
  autoUpdateInventory: true,
  sendConfirmationEmail: true,
  requirePaymentConfirmation: true,
  orderNumberPrefix: "WOO-",
  defaultStatus: "pending",
  inventoryHoldMinutes: 15,
  cacheTimeout: 30
  // 30 minutes
};
class CheckoutService {
  constructor(client, cache, config = {}) {
    this.flowManager = null;
    this.currentCart = null;
    this.config = config;
    this.addressManager = new AddressManager();
    this.shippingService = new ShippingService(
      client,
      cache,
      { ...DEFAULT_SHIPPING_CONFIG, ...config.shipping }
    );
    this.paymentService = new PaymentService(
      client,
      cache,
      { ...DEFAULT_PAYMENT_CONFIG, ...config.payment }
    );
    this.validationService = new CheckoutValidationService(
      this.addressManager,
      this.shippingService,
      this.paymentService
    );
    this.orderProcessingService = new OrderProcessingService(
      client,
      cache,
      { ...DEFAULT_ORDER_PROCESSING_CONFIG, ...config.order }
    );
  }
  /**
   * Initialize checkout with cart
   */
  async initializeCheckout(cart, options = {}, eventHandlers = {}) {
    try {
      this.currentCart = cart;
      const flowConfig = {
        ...DEFAULT_CHECKOUT_FLOW_CONFIG,
        ...this.config.flow,
        validationRules: {
          ...DEFAULT_CHECKOUT_FLOW_CONFIG.validationRules,
          ...this.config.validation
        }
      };
      this.flowManager = new CheckoutFlowManager(
        this.addressManager,
        this.shippingService,
        this.paymentService,
        this.validationService,
        flowConfig,
        eventHandlers
      );
      const result = await this.flowManager.initializeCheckout(
        cart,
        options.isGuestCheckout || false
      );
      if (isOk(result) && options.startStep && options.startStep > 1) {
        return this.flowManager.goToStep(options.startStep, cart);
      }
      return result;
    } catch (error) {
      return Err(ErrorFactory.validationError(
        "Checkout initialization failed",
        error
      ));
    }
  }
  /**
   * Update checkout session
   */
  async updateSession(updates) {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.flowManager.updateSession(updates, this.currentCart);
  }
  /**
   * Move to next step
   */
  async nextStep() {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.flowManager.nextStep(this.currentCart);
  }
  /**
   * Move to previous step
   */
  async previousStep() {
    if (!this.flowManager) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.flowManager.previousStep();
  }
  /**
   * Jump to specific step
   */
  async goToStep(step) {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.flowManager.goToStep(step, this.currentCart);
  }
  /**
   * Get current checkout state
   */
  getCurrentState() {
    return this.flowManager?.getFlowState() || null;
  }
  /**
   * Validate current step
   */
  async validateCurrentStep() {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.flowManager.validateCurrentStep(this.currentCart);
  }
  /**
   * Complete checkout and create order
   */
  async completeCheckout() {
    try {
      if (!this.flowManager || !this.currentCart) {
        return Err(ErrorFactory.validationError("Checkout not initialized"));
      }
      const currentState = this.flowManager.getFlowState();
      const orderRequest = {
        cart: this.currentCart,
        checkoutSession: currentState.session
      };
      const orderResult = await this.orderProcessingService.createOrder(orderRequest);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }
      const orderResponse = unwrap(orderResult);
      if (orderResponse.requiresPayment && currentState.session.selectedPaymentMethod) {
        const paymentRequest = {
          paymentMethodId: currentState.session.selectedPaymentMethod.id,
          orderId: orderResponse.order.id,
          amount: orderResponse.order.total,
          currency: orderResponse.order.currency,
          returnUrl: "/checkout/payment/return",
          cancelUrl: "/checkout/payment/cancel"
        };
        const paymentResult = await this.paymentService.initializePayment(paymentRequest);
        if (isOk(paymentResult)) {
          const payment = unwrap(paymentResult);
          return Ok({
            ...orderResponse,
            paymentUrl: payment.redirectUrl
          });
        }
      }
      return Ok(orderResponse);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        "Checkout completion failed",
        500,
        error
      ));
    }
  }
  // Address Management Methods
  /**
   * Get field requirements for address
   */
  getAddressFieldRequirements(addressType) {
    const context = {
      addressType,
      isGuestCheckout: this.getCurrentState()?.session.isGuestCheckout || false,
      fieldRequirements: this.config.address,
      checkoutRules: this.config.validation
    };
    return this.addressManager.getFieldRequirements(context);
  }
  /**
   * Validate address
   */
  async validateAddress(address, type) {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    const context = {
      checkoutSession: this.getCurrentState()?.session || {},
      cart: this.currentCart,
      validationRules: { ...this.config.validation },
      isGuestCheckout: this.getCurrentState()?.session.isGuestCheckout || false,
      currentStep: this.getCurrentState()?.currentStep || 1
    };
    if (type === "billing") {
      return this.validationService.validateBillingAddress(context);
    } else {
      return this.validationService.validateShippingAddress(context);
    }
  }
  /**
   * Get address suggestions
   */
  async getAddressSuggestions(address) {
    return this.addressManager.suggestAddressCorrection(address);
  }
  // Shipping Methods
  /**
   * Get available shipping rates
   */
  async getShippingRates(destination) {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    const currentState = this.getCurrentState();
    const shippingDestination = destination || (currentState?.session.useShippingAsBilling ? currentState?.session.billingAddress : currentState?.session.shippingAddress);
    if (!shippingDestination) {
      return Err(ErrorFactory.validationError("Shipping address is required"));
    }
    const request = {
      destination: shippingDestination,
      cartItems: this.currentCart.items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        weight: item.weight,
        dimensions: item.dimensions
      })),
      cartTotal: this.currentCart.totals.total,
      currency: this.currentCart.currency
    };
    return this.shippingService.getShippingRates(request);
  }
  /**
   * Calculate shipping for selected method
   */
  async calculateShipping(selectedMethod, destination) {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    const currentState = this.getCurrentState();
    const shippingDestination = destination || (currentState?.session.useShippingAsBilling ? currentState?.session.billingAddress : currentState?.session.shippingAddress);
    if (!shippingDestination) {
      return Err(ErrorFactory.validationError("Shipping address is required"));
    }
    return this.shippingService.calculateShipping(
      selectedMethod,
      shippingDestination,
      this.currentCart.totals.total
    );
  }
  // Payment Methods
  /**
   * Get available payment methods
   */
  async getPaymentMethods() {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    return this.paymentService.getAvailablePaymentMethods(
      this.currentCart.totals.total,
      this.currentCart.currency
    );
  }
  /**
   * Validate payment method
   */
  async validatePaymentMethod(methodId) {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError("Checkout not initialized"));
    }
    const validationResult = await this.paymentService.validatePaymentMethod(
      methodId,
      this.currentCart.totals.total,
      this.currentCart.currency
    );
    if (isErr(validationResult)) {
      return Err(unwrapErr(validationResult));
    }
    return Ok(unwrap(validationResult).isValid);
  }
  // Order Management
  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return this.orderProcessingService.getOrder(orderId);
  }
  /**
   * Confirm order payment
   */
  async confirmOrderPayment(request) {
    return this.orderProcessingService.confirmOrder(request);
  }
  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason) {
    return this.orderProcessingService.cancelOrder(orderId, reason);
  }
  /**
   * Search orders
   */
  async searchOrders(criteria) {
    return this.orderProcessingService.searchOrders(criteria);
  }
  // Utility Methods
  /**
   * Reset checkout session
   */
  async resetCheckout() {
    if (this.flowManager) {
      const resetResult = await this.flowManager.resetFlow();
      this.flowManager = null;
      this.currentCart = null;
      return resetResult;
    }
    return Ok(void 0);
  }
  /**
   * Check if checkout can proceed
   */
  canProceedToNextStep() {
    const state = this.getCurrentState();
    return state?.canProceed || false;
  }
  /**
   * Get current step information
   */
  getCurrentStep() {
    return this.flowManager?.getCurrentStep() || null;
  }
  /**
   * Check if step is completed
   */
  isStepCompleted(step) {
    return this.flowManager?.isStepCompleted(step) || false;
  }
  /**
   * Generate order number
   */
  generateOrderNumber() {
    return this.orderProcessingService.generateOrderNumber();
  }
  /**
   * Get checkout configuration
   */
  getConfiguration() {
    return this.config;
  }
  /**
   * Update checkout configuration
   */
  updateConfiguration(updates) {
    Object.assign(this.config, updates);
  }
}
({
  address: {
    firstName: true,
    lastName: true,
    company: false,
    address1: true,
    address2: false,
    city: true,
    state: true,
    postcode: true,
    country: true,
    email: true,
    phone: false
  },
  shipping: DEFAULT_SHIPPING_CONFIG,
  payment: DEFAULT_PAYMENT_CONFIG,
  flow: DEFAULT_CHECKOUT_FLOW_CONFIG,
  order: DEFAULT_ORDER_PROCESSING_CONFIG,
  validation: createValidationRules().build()
});
class WooHeadless {
  constructor(config) {
    const configResult = ConfigManager.resolveConfig(config);
    if (!configResult.success) {
      throw configResult.error;
    }
    this.config = configResult.data;
    this.httpClient = new HttpClient(this.config);
    this.authManager = new AuthManager(this.config);
    this.cacheManager = new CacheManager(this.config.cache);
    if (this.config.auth.enabled) {
      this.httpClient.addRequestInterceptor((options) => {
        const authHeaders = this.authManager.getAuthorizationHeader();
        if (authHeaders) {
          return {
            ...options,
            headers: {
              ...options.headers,
              ...authHeaders
            }
          };
        }
        return options;
      });
    } else {
      const basicAuth = AuthManager.generateBasicAuth(
        this.config.consumerKey,
        this.config.consumerSecret
      );
      this.httpClient.addRequestInterceptor((options) => ({
        ...options,
        headers: {
          ...options.headers,
          "Authorization": basicAuth
        }
      }));
    }
    this.products = new ProductService(this.httpClient, this.cacheManager);
    this.cart = new CartService(this.httpClient, this.cacheManager, this.config.cart);
    this.search = new SearchService(this.httpClient, this.cacheManager, this.config.advancedSearch);
    this.user = new UserService(this.httpClient, this.cacheManager, this.config.userSync);
    this.checkout = new CheckoutService(this.httpClient, this.cacheManager, this.config.checkout);
    this.reviews = new ReviewService(this.httpClient, this.cacheManager);
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Get authentication manager
   */
  getAuth() {
    return this.authManager;
  }
  /**
   * Get cache manager
   */
  getCache() {
    return this.cacheManager;
  }
  /**
   * Get HTTP client for custom requests
   */
  getHttpClient() {
    return this.httpClient;
  }
  /**
   * Clear all caches
   */
  async clearCache() {
    return this.cacheManager.clear();
  }
  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cacheManager.getStats();
  }
  /**
   * Update configuration at runtime
   */
  updateConfig(updates) {
    const newConfig = { ...this.config, ...updates };
    const validationResult = ConfigManager.resolveConfig(newConfig);
    if (!validationResult.success) {
      return validationResult;
    }
    Object.assign(this.config, validationResult.data);
    if (updates.cache) {
      this.cacheManager = new CacheManager(this.config.cache);
    }
    return { success: true, data: void 0 };
  }
  /**
   * Health check to verify API connectivity
   */
  async healthCheck() {
    const result = await this.httpClient.get("/");
    return result.success ? { success: true, data: true } : result;
  }
}
const VERSION = "1.0.0";
export {
  ApiError,
  AuthError,
  AuthManager,
  CacheError,
  CacheManager,
  CartError,
  CartService,
  CheckoutError,
  ConfigManager,
  ConfigurationError,
  DEFAULT_CONFIG,
  Err,
  ErrorFactory,
  HttpClient,
  IndexedDBCache,
  LocalStorageCache,
  MemoryCache,
  NetworkError,
  Ok,
  OrderSchema,
  PaymentError,
  ProductNotFoundError,
  ProductSchema,
  ProductService,
  RateLimitError,
  ReviewService,
  SearchService,
  TimeoutError,
  UserService,
  VERSION,
  ValidationError,
  WooHeadless,
  andThen,
  isErr,
  isOk,
  isWooCommerceCoupon,
  isWooCommerceOrder,
  isWooCommerceProduct,
  isWooError,
  map,
  mapErr,
  unwrap,
  unwrapErr,
  unwrapOr,
  validateBaseURL,
  validateCacheConfig,
  validateConsumerCredentials
};
//# sourceMappingURL=index.esm.js.map
