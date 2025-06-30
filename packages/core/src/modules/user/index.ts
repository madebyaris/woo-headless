/**
 * User Data Integration Service for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 * Works with external authentication systems (e.g., Better Auth)
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { UserSyncConfig } from '../../types/config';
import {
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
  UserProfileSchema,
  UserAddressSchema,
  UserPreferencesSchema,
  UserSyncRequestSchema,
  UserAuthContextSchema,
  isUserProfile,
  isUserAddress,
  isUserAuthContext
} from '../../types/user';
import { generateId } from '../../test/utils';
import { 
  EmailVerificationService, 
  EmailVerificationConfig, 
  EmailVerificationRequest,
  EmailVerificationConfirmRequest,
  EmailVerificationResponse,
  EmailVerificationConfirmResponse,
  EmailVerificationStatus,
  DEFAULT_EMAIL_VERIFICATION_CONFIG
} from './email-verification';
import { 
  DownloadManagementService, 
  DownloadConfig, 
  CustomerDownload, 
  DownloadRequest, 
  DownloadLink, 
  DownloadStatistics,
  DEFAULT_DOWNLOAD_CONFIG 
} from './download-management';

/**
 * User cache manager for optimized data access
 */
class UserCacheManager {
  private readonly cache: CacheManager;
  private readonly config: UserSyncConfig;

  constructor(cache: CacheManager, config: UserSyncConfig) {
    this.cache = cache;
    this.config = config;
  }

  /**
   * Get cached user profile
   */
  async getUserProfile(userId: number): Promise<Result<UserProfile | null, WooError>> {
    if (!this.config.cacheUserData) {
      return Ok(null);
    }

    try {
      const cacheKey = `user-profile:${userId}`;
      const cached = await this.cache.get<UserProfile>(cacheKey);
      return Ok(cached.success ? cached.data : null);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to get cached user profile',
        error
      ));
    }
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(profile: UserProfile): Promise<Result<void, WooError>> {
    if (!this.config.cacheUserData) {
      return Ok(undefined);
    }

    try {
      const cacheKey = `user-profile:${profile.id}`;
      await this.cache.set(cacheKey, profile, this.config.cacheTtl);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to cache user profile',
        error
      ));
    }
  }

  /**
   * Clear user cache
   */
  async clearUserCache(userId: number): Promise<Result<void, WooError>> {
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

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to clear user cache',
        error
      ));
    }
  }
}

/**
 * Address validation service
 */
class AddressValidator {
  /**
   * Validate user address
   */
  static validateAddress(address: UserAddress): AddressValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!address.firstName.trim()) {
      errors.push('First name is required');
    }
    if (!address.lastName.trim()) {
      errors.push('Last name is required');
    }
    if (!address.address1.trim()) {
      errors.push('Address line 1 is required');
    }
    if (!address.city.trim()) {
      errors.push('City is required');
    }
    if (!address.state.trim()) {
      errors.push('State/Province is required');
    }
    if (!address.postcode.trim()) {
      errors.push('Postal code is required');
    }
    if (!address.country.trim() || address.country.length !== 2) {
      errors.push('Valid country code is required');
    }

    // Email validation if provided
    if (address.email && !this.isValidEmail(address.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation if provided
    if (address.phone && !this.isValidPhone(address.phone)) {
      warnings.push('Phone number format may be invalid');
    }

    // Postal code format warnings
    if (!this.isValidPostalCode(address.postcode, address.country)) {
      warnings.push('Postal code format may be invalid for the selected country');
    }

    const result: AddressValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
    // Only add suggestedAddress if we have one
    // TODO: Implement address suggestion service
    
    return result;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced with more specific patterns
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private static isValidPostalCode(postcode: string, country: string): boolean {
    // Basic postal code validation - can be enhanced with country-specific patterns
    const patterns: Record<string, RegExp> = {
      'US': /^\d{5}(-\d{4})?$/,
      'CA': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      'GB': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/,
      'DE': /^\d{5}$/,
      'FR': /^\d{5}$/,
      'AU': /^\d{4}$/
    };

    const pattern = patterns[country.toUpperCase()];
    return pattern ? pattern.test(postcode) : true; // Default to valid for unknown countries
  }
}

/**
 * Main User Service class
 */
export class UserService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: UserSyncConfig;
  private readonly userCache: UserCacheManager;
  private readonly emailVerification: EmailVerificationService;
  private readonly downloads: DownloadManagementService;
  private currentAuthContext: UserAuthContext | null = null;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: UserSyncConfig,
    emailVerificationConfig?: EmailVerificationConfig,
    downloadConfig?: DownloadConfig
  ) {
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
  setAuthContext(authContext: UserAuthContext): Result<void, WooError> {
    try {
      // Validate the auth context
      if (!isUserAuthContext(authContext)) {
        return Err(ErrorFactory.validationError(
          'Invalid authentication context',
          'AuthContext must contain valid user information'
        ));
      }

      this.currentAuthContext = authContext;

      // Trigger sync if enabled and configured
      if (this.config.enabled && this.config.syncOnLogin) {
        // Don't await - let sync happen in background
        const syncRequest: UserSyncRequest = {
          userId: authContext.userId
        };
        if (authContext.externalUserId) {
          (syncRequest as any).externalUserId = authContext.externalUserId;
        }
        this.syncUserData(syncRequest).catch(error => {
          console.warn('Background user sync failed:', error);
        });
      }

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to set authentication context',
        500,
        error
      ));
    }
  }

  /**
   * Get current authenticated user context
   */
  getCurrentAuthContext(): UserAuthContext | null {
    return this.currentAuthContext;
  }

  /**
   * Clear authentication context
   */
  clearAuthContext(): Result<void, WooError> {
    try {
      if (this.currentAuthContext) {
        // Clear user cache when logging out
        this.userCache.clearUserCache(this.currentAuthContext.userId);
      }
      this.currentAuthContext = null;
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to clear authentication context',
        500,
        error
      ));
    }
  }

  /**
   * Sync user data with WordPress/WooCommerce
   */
  async syncUserData(request: UserSyncRequest): Promise<Result<UserSyncResponse, WooError>> {
    try {
      // Validate request
      const validationResult = this.validateSyncRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }

      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'User sync is disabled',
          'Enable user sync in configuration to use this feature'
        ));
      }

      // Build response object with collected data
      const syncErrors: string[] = [];
      let profile: UserProfile | undefined;
      let customerData: CustomerData | undefined;
      let addresses: readonly UserAddress[] | undefined;
      let preferences: UserPreferences | undefined;
      let orderHistory: readonly UserOrderSummary[] | undefined;
      let wishlist: UserWishlist | undefined;

      // Sync profile data
      if (request.syncProfile !== false && this.config.syncProfile) {
        const profileResult = await this.syncUserProfile(request.userId);
        if (profileResult.success) {
          profile = profileResult.data.profile;
          customerData = profileResult.data.customerData;
        } else {
          syncErrors.push(`Profile sync failed: ${profileResult.error.message}`);
        }
      }

      // Sync addresses
      if (request.syncAddresses !== false && this.config.syncAddresses) {
        const addressResult = await this.syncUserAddresses(request.userId);
        if (addressResult.success) {
          addresses = addressResult.data;
        } else {
          syncErrors.push(`Address sync failed: ${addressResult.error.message}`);
        }
      }

      // Sync preferences
      if (request.syncPreferences !== false && this.config.syncPreferences) {
        const prefResult = await this.syncUserPreferences(request.userId);
        if (prefResult.success) {
          preferences = prefResult.data;
        } else {
          syncErrors.push(`Preferences sync failed: ${prefResult.error.message}`);
        }
      }

      // Sync order history
      if (request.syncOrderHistory !== false && this.config.syncOrderHistory) {
        const orderResult = await this.syncUserOrderHistory(request.userId);
        if (orderResult.success) {
          orderHistory = orderResult.data;
        } else {
          syncErrors.push(`Order history sync failed: ${orderResult.error.message}`);
        }
      }

      // Sync wishlist
      if (request.syncWishlist !== false && this.config.syncWishlist) {
        const wishlistResult = await this.syncUserWishlist(request.userId);
        if (wishlistResult.success) {
          wishlist = wishlistResult.data;
        } else {
          syncErrors.push(`Wishlist sync failed: ${wishlistResult.error.message}`);
        }
      }

      // Construct final response
      const response: UserSyncResponse = {
        userId: request.userId,
        syncedAt: new Date().toISOString(),
        profile,
        customerData,
        addresses,
        preferences,
        orderHistory,
        wishlist,
        syncErrors: syncErrors.length > 0 ? syncErrors : undefined
      };

      return Ok(response);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'User data sync failed',
        500,
        error
      ));
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number, useCache: boolean = true): Promise<Result<UserProfile, WooError>> {
    try {
      // Check cache first
      if (useCache) {
        const cachedResult = await this.userCache.getUserProfile(userId);
        if (cachedResult.success && cachedResult.data) {
          return Ok(cachedResult.data);
        }
      }

      // Fetch from WordPress API
      const response = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (!response.success) {
        return response;
      }

      const userData = response.data.data;
      
      // Transform WordPress user data to our UserProfile format
      const profile: UserProfile = {
        id: userData.id,
        wordpressUserId: userData.id,
        username: userData.username || userData.slug,
        email: userData.email,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        displayName: userData.display_name || userData.name,
        avatar: userData.avatar_urls?.['96'] || undefined,
        bio: userData.description || undefined,
        website: userData.url || undefined,
        roles: userData.roles || ['customer'],
        status: 'active', // Default status
        dateRegistered: userData.date || new Date().toISOString(),
        lastLogin: undefined, // Not available in standard WP API
        isEmailVerified: true, // Assume verified if user exists
        isPhoneVerified: false // Default to false
      };

      // Cache the profile
      await this.userCache.cacheUserProfile(profile);

      return Ok(profile);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get user profile',
        500,
        error
      ));
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: number, updates: UserUpdateRequest): Promise<Result<UserProfile, WooError>> {
    try {
      const updateData: any = {};

      if (updates.profile) {
        if (updates.profile.firstName) updateData.first_name = updates.profile.firstName;
        if (updates.profile.lastName) updateData.last_name = updates.profile.lastName;
        if (updates.profile.displayName) updateData.display_name = updates.profile.displayName;
        if (updates.profile.bio) updateData.description = updates.profile.bio;
        if (updates.profile.website) updateData.url = updates.profile.website;
      }

      const response = await this.client.post<any>(`/wp/v2/users/${userId}`, updateData);
      if (!response.success) {
        return response;
      }

      // Clear cache and fetch updated profile
      await this.userCache.clearUserCache(userId);
      return this.getUserProfile(userId, false);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to update user profile',
        500,
        error
      ));
    }
  }

  /**
   * Get customer data from WooCommerce
   */
  async getCustomerData(customerId: number): Promise<Result<CustomerData, WooError>> {
    try {
      const response = await this.client.get<any>(`/customers/${customerId}`);
      if (!response.success) {
        return response;
      }

      const customerData = response.data.data;
      
      // Transform WooCommerce customer data
      const customer: CustomerData = {
        id: customerData.id,
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        username: customerData.username,
        role: customerData.role || 'customer',
        billing: this.transformWooAddressToUserAddress(customerData.billing, 'billing'),
        shipping: this.transformWooAddressToUserAddress(customerData.shipping, 'shipping'),
        isPayingCustomer: customerData.is_paying_customer || false,
        ordersCount: customerData.orders_count || 0,
        totalSpent: customerData.total_spent || '0',
        avatarUrl: customerData.avatar_url || '',
        dateCreated: customerData.date_created,
        dateModified: customerData.date_modified,
        metaData: customerData.meta_data || []
      };

      return Ok(customer);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get customer data',
        500,
        error
      ));
    }
  }

  /**
   * Validate address
   */
  validateAddress(address: UserAddress): AddressValidationResult {
    return AddressValidator.validateAddress(address);
  }

  // Email Verification Methods

  /**
   * Send email verification
   */
  async sendEmailVerification(request: EmailVerificationRequest): Promise<Result<EmailVerificationResponse, WooError>> {
    return this.emailVerification.sendVerification(request);
  }

  /**
   * Confirm email verification
   */
  async confirmEmailVerification(request: EmailVerificationConfirmRequest): Promise<Result<EmailVerificationConfirmResponse, WooError>> {
    return this.emailVerification.confirmVerification(request);
  }

  /**
   * Get email verification status
   */
  async getEmailVerificationStatus(userId: number): Promise<Result<EmailVerificationStatus, WooError>> {
    return this.emailVerification.getVerificationStatus(userId);
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(userId: number): Promise<Result<EmailVerificationResponse, WooError>> {
    return this.emailVerification.resendVerification(userId);
  }

  /**
   * Check if email verification is required for a specific action
   */
  isEmailVerificationRequired(action: 'purchase' | 'profile_update' | 'password_change'): boolean {
    return this.emailVerification.isVerificationRequired(action);
  }

  // Download Management Methods

  /**
   * Get customer's downloadable products
   */
  async getCustomerDownloads(customerId: number): Promise<Result<CustomerDownload[], WooError>> {
    return this.downloads.getCustomerDownloads(customerId);
  }

  /**
   * Generate secure download link
   */
  async generateDownloadLink(request: DownloadRequest): Promise<Result<DownloadLink, WooError>> {
    return this.downloads.generateDownloadLink(request);
  }

  /**
   * Get download statistics
   */
  async getDownloadStatistics(
    customerId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<DownloadStatistics, WooError>> {
    return this.downloads.getDownloadStatistics(customerId, startDate, endDate);
  }

  /**
   * Cleanup expired downloads
   */
  async cleanupExpiredDownloads(): Promise<Result<number, WooError>> {
    return this.downloads.cleanupExpiredDownloads();
  }

  /**
   * Get user order history
   */
  async getUserOrderHistory(
    userId: number, 
    page: number = 1, 
    limit: number = 10
  ): Promise<Result<UserOrderSummary[], WooError>> {
    try {
      const response = await this.client.get<any>(
        `/orders?customer=${userId}&page=${page}&per_page=${Math.min(limit, this.config.maxOrderHistory)}`
      );
      
      if (!response.success) {
        return response;
      }

      const orders = response.data.data.map((order: any): UserOrderSummary => ({
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
        'Failed to get user order history',
        500,
        error
      ));
    }
  }

  /**
   * Log user activity
   */
  async logUserActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): Promise<Result<void, WooError>> {
    try {
      const activityEntry: UserActivity = {
        ...activity,
        id: generateId(),
        timestamp: new Date().toISOString()
      };

      // Store activity in cache for now (could be enhanced to store in database)
      const cacheKey = `user-activity:${activity.userId}:${activityEntry.id}`;
      await this.cache.set(cacheKey, activityEntry, 86400000); // 24 hours

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to log user activity',
        error
      ));
    }
  }

  // Private helper methods

  private validateSyncRequest(request: UserSyncRequest): Result<void, WooError> {
    try {
      UserSyncRequestSchema.parse(request);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Invalid sync request',
        error
      ));
    }
  }

  private async syncUserProfile(userId: number): Promise<Result<{ profile: UserProfile; customerData?: CustomerData }, WooError>> {
    const profileResult = await this.getUserProfile(userId, false);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;
    
    // Try to get WooCommerce customer data
    let customerData: CustomerData | undefined;
    const customerResult = await this.getCustomerData(userId);
    if (customerResult.success) {
      customerData = customerResult.data;
    }

    return Ok({ profile, customerData });
  }

  private async syncUserAddresses(userId: number): Promise<Result<UserAddress[], WooError>> {
    // This would typically fetch addresses from WooCommerce customer data
    const customerResult = await this.getCustomerData(userId);
    if (!customerResult.success) {
      return customerResult;
    }

    const addresses: UserAddress[] = [];
    const customer = customerResult.data;

    if (customer.billing) {
      addresses.push(customer.billing);
    }
    if (customer.shipping) {
      addresses.push(customer.shipping);
    }

    return Ok(addresses);
  }

  private async syncUserPreferences(userId: number): Promise<Result<UserPreferences, WooError>> {
    // Default preferences - could be enhanced to fetch from user meta
    const preferences: UserPreferences = {
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      emailNotifications: {
        orderUpdates: true,
        promotions: false,
        newsletter: false,
        wishlistReminders: true,
        backInStock: true,
        priceDrops: false
      },
      privacy: {
        profileVisibility: 'private',
        showPurchaseHistory: false,
        allowRecommendations: true,
        dataSharing: false
      }
    };

    return Ok(preferences);
  }

  private async syncUserOrderHistory(userId: number): Promise<Result<UserOrderSummary[], WooError>> {
    return this.getUserOrderHistory(userId, 1, this.config.maxOrderHistory);
  }

  private async syncUserWishlist(userId: number): Promise<Result<UserWishlist, WooError>> {
    // Placeholder implementation - would need a wishlist plugin or custom implementation
    const wishlist: UserWishlist = {
      id: `wishlist-${userId}`,
      userId,
      name: 'My Wishlist',
      items: [],
      isPublic: false,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };

    return Ok(wishlist);
  }

  private transformWooAddressToUserAddress(wooAddress: any, type: 'billing' | 'shipping'): UserAddress {
    return {
      type,
      firstName: wooAddress.first_name || '',
      lastName: wooAddress.last_name || '',
      company: wooAddress.company || undefined,
      address1: wooAddress.address_1 || '',
      address2: wooAddress.address_2 || undefined,
      city: wooAddress.city || '',
      state: wooAddress.state || '',
      postcode: wooAddress.postcode || '',
      country: wooAddress.country || '',
      phone: wooAddress.phone || undefined,
      email: wooAddress.email || undefined,
      isDefault: true
    };
  }
}

// Export download management types and service
export type { 
  DigitalProduct, 
  DownloadableFile, 
  DownloadLink, 
  DownloadPermission, 
  CustomerDownload, 
  DownloadAnalytics, 
  DownloadRequest, 
  DownloadValidationResult, 
  DownloadStatistics, 
  DownloadConfig, 
  FileStream 
} from './download-management';

export { DownloadManagementService, DEFAULT_DOWNLOAD_CONFIG } from './download-management'; 