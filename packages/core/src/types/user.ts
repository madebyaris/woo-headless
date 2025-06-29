/**
 * User Data Integration types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 * Works with external authentication systems (e.g., Better Auth)
 */

import { z } from 'zod';

/**
 * User roles in WordPress/WooCommerce
 */
export type UserRole = 
  | 'customer' 
  | 'shop_manager' 
  | 'administrator' 
  | 'editor' 
  | 'author' 
  | 'contributor' 
  | 'subscriber';

/**
 * User account status
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Gender options
 */
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * Address type
 */
export type AddressType = 'billing' | 'shipping';

/**
 * User address information
 */
export interface UserAddress {
  readonly type: AddressType;
  readonly firstName: string;
  readonly lastName: string;
  readonly company?: string;
  readonly address1: string;
  readonly address2?: string;
  readonly city: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string; // ISO 3166-1 alpha-2 country code
  readonly phone?: string;
  readonly email?: string;
  readonly isDefault: boolean;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  readonly language: string; // ISO 639-1 language code
  readonly currency: string; // ISO 4217 currency code
  readonly timezone: string; // IANA timezone identifier
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
export interface UserProfile {
  readonly id: number;
  readonly wordpressUserId: number; // WordPress user ID
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly avatar?: string; // Avatar URL
  readonly bio?: string;
  readonly website?: string;
  readonly phone?: string;
  readonly dateOfBirth?: string; // ISO 8601 date
  readonly gender?: Gender;
  readonly roles: readonly UserRole[];
  readonly status: UserStatus;
  readonly dateRegistered: string; // ISO 8601 datetime
  readonly lastLogin?: string; // ISO 8601 datetime
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
}

/**
 * WooCommerce customer data
 */
export interface CustomerData {
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
  readonly totalSpent: string; // Monetary amount as string
  readonly avatarUrl: string;
  readonly dateCreated: string; // ISO 8601 datetime
  readonly dateModified: string; // ISO 8601 datetime
  readonly metaData: readonly {
    readonly key: string;
    readonly value: unknown;
  }[];
}

/**
 * User's order summary
 */
export interface UserOrderSummary {
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
 * User wishlist item
 */
export interface WishlistItem {
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
 * User's complete wishlist
 */
export interface UserWishlist {
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
 * User activity log entry
 */
export interface UserActivity {
  readonly id: string;
  readonly userId: number;
  readonly type: 'login' | 'logout' | 'order' | 'review' | 'wishlist' | 'profile_update' | 'address_update';
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: string; // ISO 8601 datetime
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
 * User data sync request
 */
export interface UserSyncRequest {
  readonly userId: number;
  readonly externalUserId?: string; // ID from external auth system
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
export interface UserSyncResponse {
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
 * User authentication context (from external auth system)
 */
export interface UserAuthContext {
  readonly userId: number;
  readonly externalUserId?: string; // ID from external auth (e.g., Better Auth)
  readonly email: string;
  readonly isAuthenticated: boolean;
  readonly accessToken?: string; // If needed for API calls
  readonly refreshToken?: string;
  readonly tokenExpiry?: string;
  readonly permissions?: readonly string[];
  readonly sessionId?: string;
}

/**
 * User update request
 */
export interface UserUpdateRequest {
  readonly profile?: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'displayName' | 'bio' | 'website' | 'phone' | 'dateOfBirth' | 'gender'>>;
  readonly addresses?: readonly UserAddress[];
  readonly preferences?: Partial<UserPreferences>;
}

/**
 * Address validation result
 */
export interface AddressValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestedAddress?: UserAddress | undefined;
}

// Zod schemas for validation
export const UserAddressSchema = z.object({
  type: z.enum(['billing', 'shipping']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isDefault: z.boolean(),
});

export const UserPreferencesSchema = z.object({
  language: z.string().length(2), // ISO 639-1
  currency: z.string().length(3), // ISO 4217
  timezone: z.string(),
  dateFormat: z.string(),
  timeFormat: z.enum(['12h', '24h']),
  emailNotifications: z.object({
    orderUpdates: z.boolean(),
    promotions: z.boolean(),
    newsletter: z.boolean(),
    wishlistReminders: z.boolean(),
    backInStock: z.boolean(),
    priceDrops: z.boolean(),
  }),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']),
    showPurchaseHistory: z.boolean(),
    allowRecommendations: z.boolean(),
    dataSharing: z.boolean(),
  }),
});

export const UserProfileSchema = z.object({
  id: z.number().positive(),
  wordpressUserId: z.number().positive(),
  username: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  roles: z.array(z.enum(['customer', 'shop_manager', 'administrator', 'editor', 'author', 'contributor', 'subscriber'])),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
  dateRegistered: z.string(),
  lastLogin: z.string().optional(),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
});

export const UserSyncRequestSchema = z.object({
  userId: z.number().positive(),
  externalUserId: z.string().optional(),
  syncProfile: z.boolean().optional(),
  syncAddresses: z.boolean().optional(),
  syncPreferences: z.boolean().optional(),
  syncOrderHistory: z.boolean().optional(),
  syncWishlist: z.boolean().optional(),
  forceRefresh: z.boolean().optional(),
});

export const UserAuthContextSchema = z.object({
  userId: z.number().positive(),
  externalUserId: z.string().optional(),
  email: z.string().email(),
  isAuthenticated: z.boolean(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiry: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

// Type guards
export function isUserAddress(obj: unknown): obj is UserAddress {
  try {
    UserAddressSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isUserProfile(obj: unknown): obj is UserProfile {
  try {
    UserProfileSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isUserAuthContext(obj: unknown): obj is UserAuthContext {
  try {
    UserAuthContextSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * User query parameters for fetching user lists
 */
export interface UserListParams {
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
export interface UserListResponse {
  readonly users: readonly UserProfile[];
  readonly total: number;
  readonly pages: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * User statistics
 */
export interface UserStats {
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