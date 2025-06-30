/**
 * Configuration manager for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { 
  WooConfig, 
  ResolvedWooConfig, 
  DEFAULT_CONFIG,
  validateBaseURL,
  validateConsumerCredentials,
  validateCacheConfig
} from '../types/config';
import { Result, Ok, Err } from '../types/result';
import { ConfigurationError, ErrorFactory } from '../types/errors';

/**
 * Configuration manager class
 */
export class ConfigManager {
  /**
   * Resolve configuration with defaults and validation
   */
  static resolveConfig(config: WooConfig): Result<ResolvedWooConfig, ConfigurationError> {
    // Validate required fields
    const validation = this.validateConfig(config);
    if (!validation.success) {
      return validation;
    }

    // Merge with defaults
    const resolvedConfig: ResolvedWooConfig = {
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
  static validateConfig(config: WooConfig): Result<void, ConfigurationError> {
    // Validate base URL
    if (!validateBaseURL(config.baseURL)) {
      return Err(ErrorFactory.configurationError(
        'Invalid baseURL. Must be a valid URL.',
        { baseURL: config.baseURL }
      ));
    }

    // Validate consumer credentials
    if (!validateConsumerCredentials(config.consumerKey, config.consumerSecret)) {
      return Err(ErrorFactory.configurationError(
        'Invalid consumer credentials. Both consumerKey and consumerSecret are required.',
        { 
          hasConsumerKey: Boolean(config.consumerKey?.trim()),
          hasConsumerSecret: Boolean(config.consumerSecret?.trim())
        }
      ));
    }

    // Validate cache config if provided
    if (config.cache && !validateCacheConfig(config.cache)) {
      return Err(ErrorFactory.configurationError(
        'Invalid cache configuration.',
        { cache: config.cache }
      ));
    }

    // Validate search config
    if (config.search?.fuzzyThreshold !== undefined) {
      if (config.search.fuzzyThreshold < 0 || config.search.fuzzyThreshold > 1) {
        return Err(ErrorFactory.configurationError(
          'Search fuzzyThreshold must be between 0 and 1.',
          { fuzzyThreshold: config.search.fuzzyThreshold }
        ));
      }
    }

    if (config.search?.maxResults !== undefined) {
      if (config.search.maxResults <= 0) {
        return Err(ErrorFactory.configurationError(
          'Search maxResults must be greater than 0.',
          { maxResults: config.search.maxResults }
        ));
      }
    }

    // Validate HTTP config
    if (config.http?.timeout !== undefined && config.http.timeout <= 0) {
      return Err(ErrorFactory.configurationError(
        'HTTP timeout must be greater than 0.',
        { timeout: config.http.timeout }
      ));
    }

    if (config.http?.retries !== undefined && config.http.retries < 0) {
      return Err(ErrorFactory.configurationError(
        'HTTP retries must be 0 or greater.',
        { retries: config.http.retries }
      ));
    }

    // Validate auth config
    if (config.auth?.expiresIn !== undefined && config.auth.expiresIn <= 0) {
      return Err(ErrorFactory.configurationError(
        'Auth expiresIn must be greater than 0.',
        { expiresIn: config.auth.expiresIn }
      ));
    }

    return Ok(undefined);
  }

  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(environment: string): Partial<WooConfig> {
    switch (environment) {
      case 'development':
        return {
          debug: {
            enabled: true,
            logLevel: 'debug',
            performanceMonitoring: true,
            errorReporting: true,
            apiLogging: true
          },
          http: {
            timeout: 60000, // Longer timeout for development
            retries: 1 // Fewer retries for faster debugging
          }
        };
        
      case 'staging':
        return {
          debug: {
            enabled: true,
            logLevel: 'info',
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
        
      case 'production':
        return {
          debug: {
            enabled: false,
            logLevel: 'error',
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
            ttl: 300000 // 5 minutes in production
          }
        };
        
      default:
        return {};
    }
  }

  /**
   * Create configuration from environment variables
   */
  static fromEnvironment(): Partial<WooConfig> {
    // Return empty config in browser environment
    try {
      // This will throw in browser environments
      const processExists = typeof process !== 'undefined' && process.env;
      if (!processExists) {
        return {};
      }

      const env = process.env;
      const config: Record<string, unknown> = {};

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
        
        // Apply environment-specific config
        const envConfig = this.getEnvironmentConfig(env.NODE_ENV);
        Object.assign(config, envConfig);
      }

      return config as Partial<WooConfig>;
    } catch {
      // If process is not available, return empty config
      return {};
    }
  }

  /**
   * Merge multiple configurations
   */
  static mergeConfigs(...configs: Partial<WooConfig>[]): Partial<WooConfig> {
    const merged: Record<string, unknown> = {};

    for (const config of configs) {
      Object.assign(merged, config);
      
      // Deep merge nested objects
      if (config.cache && (merged.cache as unknown)) {
        merged.cache = { ...(merged.cache as object), ...config.cache };
      }
      
      if (config.auth && (merged.auth as unknown)) {
        merged.auth = { ...(merged.auth as object), ...config.auth };
      }
      
      if (config.http && (merged.http as unknown)) {
        merged.http = { ...(merged.http as object), ...config.http };
      }
      
      if (config.search && (merged.search as unknown)) {
        merged.search = { ...(merged.search as object), ...config.search };
      }
      
      if (config.analytics && (merged.analytics as unknown)) {
        merged.analytics = { ...(merged.analytics as object), ...config.analytics };
      }
      
      if (config.i18n && (merged.i18n as unknown)) {
        merged.i18n = { ...(merged.i18n as object), ...config.i18n };
      }
      
      if (config.debug && (merged.debug as unknown)) {
        merged.debug = { ...(merged.debug as object), ...config.debug };
      }
    }

    return merged as Partial<WooConfig>;
  }
} 