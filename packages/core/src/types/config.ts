/**
 * Configuration types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import type { CheckoutConfig } from '../modules/checkout';

/**
 * Cache storage types
 */
export type CacheStorageType = 'localStorage' | 'sessionStorage' | 'memory';

/**
 * Log levels for debugging
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttl: number; // Time to live in milliseconds
  readonly storage: CacheStorageType;
  readonly maxSize?: number; // Maximum cache size in MB
  readonly prefix?: string; // Cache key prefix
}

/**
 * JWT Authentication configuration
 */
export interface JWTConfig {
  readonly enabled: boolean;
  readonly secretKey?: string;
  readonly expiresIn: number; // Token expiration in seconds
  readonly autoRefresh: boolean;
  readonly refreshThreshold?: number; // Refresh when X seconds before expiry
}

/**
 * HTTP client configuration
 */
export interface HttpConfig {
  readonly timeout: number; // Request timeout in milliseconds
  readonly retries: number; // Number of retry attempts
  readonly retryDelay: number; // Base delay between retries in milliseconds
  readonly maxRetryDelay: number; // Maximum retry delay
  readonly retryCondition?: (error: unknown) => boolean;
  readonly headers?: Record<string, string>; // Additional headers
}

/**
 * Search configuration
 */
export interface SearchConfig {
  readonly fuzzyThreshold: number; // Fuse.js threshold (0.0 = exact, 1.0 = anything)
  readonly maxResults: number; // Maximum search results
  readonly enableHighlight: boolean;
  readonly enableSuggestions: boolean;
  readonly cacheResults: boolean;
  readonly enableAnalytics: boolean;
}

/**
 * Advanced search configuration
 */
export interface AdvancedSearchConfig {
  readonly fuzzy: {
    readonly enabled: boolean;
    readonly threshold: number; // 0.0 = exact match, 1.0 = match anything
    readonly distance: number; // maximum Levenshtein distance
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
    readonly sessionTimeout: number; // minutes
  };
  readonly caching: {
    readonly enabled: boolean;
    readonly ttl: number; // milliseconds
    readonly maxCacheSize: number; // number of cached queries
    readonly cacheKey: string;
  };
  readonly performance: {
    readonly maxResults: number;
    readonly searchTimeout: number; // milliseconds
    readonly debounceDelay: number; // milliseconds for auto-complete
    readonly prefetchResults: boolean;
  };
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  readonly enabled: boolean;
  readonly trackPageViews: boolean;
  readonly trackSearches: boolean;
  readonly trackConversions: boolean;
  readonly apiKey?: string;
  readonly endpoint?: string;
}

/**
 * Internationalization configuration
 */
export interface I18nConfig {
  readonly locale: string; // e.g., 'en-US', 'fr-FR'
  readonly currency: string; // e.g., 'USD', 'EUR'
  readonly timezone: string; // e.g., 'America/New_York'
  readonly dateFormat: string;
  readonly numberFormat: Intl.NumberFormatOptions;
}

/**
 * Development/debugging configuration
 */
export interface DebugConfig {
  readonly enabled: boolean;
  readonly logLevel: LogLevel;
  readonly performanceMonitoring: boolean;
  readonly errorReporting: boolean;
  readonly apiLogging: boolean;
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
 * Cart synchronization configuration
 */
export interface CartSyncConfig {
  readonly enabled: boolean;
  readonly strategy: 'merge_smart' | 'local_wins' | 'server_wins' | 'merge_quantities' | 'prompt_user';
  readonly syncIntervalMs: number;        // Auto-sync interval in milliseconds
  readonly conflictResolution: 'merge_smart' | 'local_wins' | 'server_wins' | 'merge_quantities' | 'prompt_user';
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly syncOnAuth: boolean;           // Sync immediately when user authenticates
  readonly syncOnCartChange: boolean;     // Sync on every cart modification
  readonly backgroundSync: boolean;       // Enable background sync
  readonly offlineQueueSize: number;      // Max offline actions to queue
}

/**
 * Cart configuration
 */
export interface CartConfig {
  readonly persistence: CartPersistenceConfig;
  readonly sync: CartSyncConfig;
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

/**
 * User sync configuration
 */
export interface UserSyncConfig {
  readonly enabled: boolean;
  readonly syncInterval: number; // Sync interval in seconds
  readonly syncOnLogin: boolean;
  readonly syncProfile: boolean;
  readonly syncAddresses: boolean;
  readonly syncPreferences: boolean;
  readonly syncOrderHistory: boolean;
  readonly syncWishlist: boolean;
  readonly maxOrderHistory: number; // Maximum orders to sync
  readonly cacheUserData: boolean;
  readonly cacheTtl: number; // Cache TTL in milliseconds
}

/**
 * Main WooCommerce configuration
 */
export interface WooConfig {
  readonly baseURL: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly version?: string; // API version, defaults to 'wc/v3'
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
 * Resolved configuration with defaults applied
 */
export interface ResolvedWooConfig {
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
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<ResolvedWooConfig, 'baseURL' | 'consumerKey' | 'consumerSecret'> = {
  version: 'wc/v3',
  environment: 'production',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    storage: 'localStorage',
    maxSize: 50, // 50MB
    prefix: 'woo-headless'
  },
  auth: {
    enabled: false,
    expiresIn: 3600, // 1 hour
    autoRefresh: true,
    refreshThreshold: 300 // 5 minutes
  },
  http: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    maxRetryDelay: 10000, // 10 seconds
    retryCondition: (error: unknown) => {
      // Retry on network errors and 5xx status codes
      return error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('5')
      );
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
      preTag: '<mark>',
      postTag: '</mark>',
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
      ttl: 300000, // 5 minutes
      maxCacheSize: 100,
      cacheKey: 'woo-search'
    },
    performance: {
      maxResults: 1000,
      searchTimeout: 5000, // 5 seconds
      debounceDelay: 300, // 300ms
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
    locale: 'en-US',
    currency: 'USD',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  },
  debug: {
    enabled: false,
    logLevel: 'error',
    performanceMonitoring: false,
    errorReporting: false,
    apiLogging: false
  },
  cart: {
    persistence: {
      strategy: 'localStorage',
      key: 'woo-headless-cart',
      encryption: false,
      expirationDays: 30,
      syncToServer: false
    },
    sync: {
      enabled: false,
      strategy: 'merge_smart',
      syncIntervalMs: 30000, // 30 seconds
      conflictResolution: 'merge_smart',
      maxRetries: 3,
      retryDelayMs: 1000, // 1 second
      syncOnAuth: true,
      syncOnCartChange: false, // Avoid excessive syncing
      backgroundSync: true,
      offlineQueueSize: 50
    },
    autoCalculateTotals: true,
    validateStock: true,
    allowBackorders: false,
    sessionTimeout: 60, // 60 minutes
    maxItems: 100,
    maxQuantityPerItem: 999,
    enableCoupons: true,
    enableShipping: true,
    enableFees: true,
    enableCrossSells: true,
    taxCalculation: {
      enabled: true,
      pricesIncludeTax: false,
      displayMode: 'excl',
      roundAtSubtotal: false
    }
  },
  userSync: {
    enabled: false,
    syncInterval: 300, // 5 minutes
    syncOnLogin: true,
    syncProfile: true,
    syncAddresses: true,
    syncPreferences: true,
    syncOrderHistory: true,
    syncWishlist: true,
    maxOrderHistory: 50,
    cacheUserData: true,
    cacheTtl: 1800000 // 30 minutes
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
      defaultCountry: 'US',
      restrictedCountries: [],
      cacheTimeout: 15
    },
    payment: {
      enabled: true,
      testMode: true,
      supportedMethods: ['stripe', 'paypal', 'bank_transfer', 'cash_on_delivery'],
      minimumAmount: 1,
      currency: 'USD',
      returnUrl: '/checkout/payment/return',
      cancelUrl: '/checkout/payment/cancel',
      cacheTimeout: 10
    },
    flow: {
      steps: ['billing_address', 'shipping_method', 'payment_method', 'order_review'],
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
      orderNumberPrefix: 'WOO-',
      defaultStatus: 'pending',
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
} as const;

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  readonly page: number;
  readonly limit: number;
  readonly offset?: number;
}

/**
 * Sorting configuration
 */
export interface SortConfig {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Filter operators for advanced search
 */
export type FilterOperator = 
  | 'eq' // equals
  | 'ne' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'in' // in array
  | 'nin' // not in array
  | 'contains' // string contains
  | 'startswith' // string starts with
  | 'endswith'; // string ends with

/**
 * Generic filter interface
 */
export interface Filter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

/**
 * Search operators configuration
 */
export interface SearchOperators {
  readonly logic: 'AND' | 'OR' | 'NOT';
  readonly fuzzy: boolean;
  readonly stemming: boolean;
  readonly synonyms: boolean;
}

/**
 * Configuration validation functions
 */
export function validateBaseURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateConsumerCredentials(key: string, secret: string): boolean {
  return key.trim().length > 0 && secret.trim().length > 0;
}

export function validateCacheConfig(config: Partial<CacheConfig>): boolean {
  if (config.ttl !== undefined && config.ttl < 0) {
    return false;
  }
  if (config.maxSize !== undefined && config.maxSize <= 0) {
    return false;
  }
  return true;
} 