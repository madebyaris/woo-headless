/**
 * WooCommerce Headless SDK - Main Export
 * Following the enhanced unified-10x-dev framework
 */

// Core types
export * from './types/result';
export * from './types/errors';
export * from './types/commerce';
export * from './types/config';

// Additional cart types (avoiding conflicts with config)
export type { 
  CartItem, 
  Cart, 
  CartTotals, 
  CartValidationResult,
  CartUpdateRequest,
  CartAddItemRequest,
  CartQuantityLimits,
  CartItemMeta,
  AppliedCoupon,
  ShippingMethod,
  CartFee
} from './types/cart';

// Additional search types (avoiding conflicts with config)
export type {
  SearchQuery,
  SearchResults,
  SearchResultItem,
  SearchFilter,
  SearchFacet,
  SearchSuggestion,
  SearchAggregation,
  SearchPagination,
  SearchAnalyticsEvent,
  SearchHistoryEntry,
  SearchQueryBuilder,
  QuickSearchParams,
  AutoCompleteRequest,
  AutoCompleteResponse,
  SearchOperator,
  SortDirection
} from './types/search';

// Additional user types
export type {
  UserProfile,
  CustomerData,
  UserAddress,
  UserPreferences,
  UserOrderSummary,
  UserWishlist,
  WishlistItem,
  UserActivity,
  UserAuthContext,
  UserSyncRequest,
  UserSyncResponse,
  UserUpdateRequest,
  AddressValidationResult,
  UserListParams,
  UserListResponse,
  UserStats,
  UserRole,
  UserStatus,
  Gender,
  AddressType
} from './types/user';

// Core classes
export { HttpClient } from './core/client';
export { AuthManager } from './core/auth';
export { ConfigManager } from './core/config';
export { CacheManager, MemoryCache, LocalStorageCache, IndexedDBCache } from './core/cache';
export type { CacheEntry, CacheStorage } from './core/cache';

// Modules
export { ProductService } from './modules/products';
export type { ProductListParams, ProductListResponse, VariationListParams } from './modules/products';
export { CartService } from './modules/cart';
export { SearchService } from './modules/search';
export { UserService } from './modules/user';

// Main SDK class
export { WooHeadless } from './woo-headless';

// Version
export const VERSION = '1.0.0'; 