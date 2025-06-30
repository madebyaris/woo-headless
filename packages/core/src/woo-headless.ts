/**
 * Main WooHeadless SDK class
 * Following the enhanced unified-10x-dev framework
 */

import { HttpClient } from './core/client';
import { AuthManager } from './core/auth';
import { ConfigManager } from './core/config';
import { CacheManager } from './core/cache';
import { ProductService } from './modules/products';
import { CartService } from './modules/cart';
import { SearchService } from './modules/search';
import { UserService } from './modules/user';
import { CheckoutService } from './modules/checkout';
import { ReviewService } from './modules/reviews';
import { WooConfig, ResolvedWooConfig } from './types/config';
import { Result } from './types/result';
import { ConfigurationError, WooError } from './types/errors';

/**
 * Main SDK class that provides access to all WooCommerce functionality
 */
export class WooHeadless {
  private config: ResolvedWooConfig;
  private readonly httpClient: HttpClient;
  private readonly authManager: AuthManager;
  private cacheManager: CacheManager;
  
  // Public services
  public readonly products: ProductService;
  public readonly cart: CartService;
  public readonly search: SearchService;
  public readonly user: UserService;
  public readonly checkout: CheckoutService;
  public readonly reviews: ReviewService;

  constructor(config: WooConfig) {
    // Validate and resolve configuration
    const configResult = ConfigManager.resolveConfig(config);
    if (!configResult.success) {
      throw configResult.error;
    }
    this.config = configResult.data;

    // Initialize core components
    this.httpClient = new HttpClient(this.config);
    this.authManager = new AuthManager(this.config);
    this.cacheManager = new CacheManager(this.config.cache);

    // Set up authentication interceptor if enabled
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
      // Use basic auth with consumer key/secret
      const basicAuth = AuthManager.generateBasicAuth(
        this.config.consumerKey,
        this.config.consumerSecret
      );
      this.httpClient.addRequestInterceptor((options) => ({
        ...options,
        headers: {
          ...options.headers,
          'Authorization': basicAuth
        }
      }));
    }

    // Initialize services
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
  getConfig(): ResolvedWooConfig {
    return this.config;
  }

  /**
   * Get authentication manager
   */
  getAuth(): AuthManager {
    return this.authManager;
  }

  /**
   * Get cache manager
   */
  getCache(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Get HTTP client for custom requests
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<Result<void, WooError>> {
    return this.cacheManager.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Result<Record<string, number>, WooError>> {
    return this.cacheManager.getStats();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<WooConfig>): Result<void, ConfigurationError> {
    const newConfig = { ...this.config, ...updates };
    const validationResult = ConfigManager.resolveConfig(newConfig);
    
    if (!validationResult.success) {
      return validationResult;
    }

    // Apply updates
    Object.assign(this.config, validationResult.data);
    
    // Reinitialize components if needed
    if (updates.cache) {
      this.cacheManager = new CacheManager(this.config.cache);
    }
    
    return { success: true, data: undefined };
  }

  /**
   * Health check to verify API connectivity
   */
  async healthCheck(): Promise<Result<boolean, WooError>> {
    const result = await this.httpClient.get('/');
    return result.success ? { success: true, data: true } : result;
  }
} 