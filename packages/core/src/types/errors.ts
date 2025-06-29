/**
 * WooCommerce Headless SDK Error Types
 * Following the enhanced unified-10x-dev framework
 */

/**
 * Base error interface with mandatory fields
 */
export interface WooError {
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
export type WooErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'PRODUCT_NOT_FOUND'
  | 'CART_ERROR'
  | 'CHECKOUT_ERROR'
  | 'PAYMENT_ERROR'
  | 'SUBSCRIPTION_ERROR'
  | 'CACHE_ERROR';

/**
 * Network-related errors
 */
export class NetworkError extends Error implements WooError {
  readonly code = 'NETWORK_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = true;
  readonly statusCode?: number;

  constructor(
    message: string,
    public readonly details?: unknown,
    statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
    this.timestamp = new Date();
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends Error implements WooError {
  readonly code = 'AUTH_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;
  readonly statusCode?: number;

  constructor(
    message: string,
    public readonly details?: unknown,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AuthError';
    this.timestamp = new Date();
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends Error implements WooError {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    this.timestamp = new Date();
  }
}

/**
 * API-related errors from WooCommerce
 */
export class ApiError extends Error implements WooError {
  readonly code = 'API_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable: boolean;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date();
    // Retry on 5xx errors, not on 4xx
    this.retryable = statusCode >= 500;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends Error implements WooError {
  readonly code = 'RATE_LIMIT_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly retryAfter?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.timestamp = new Date();
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends Error implements WooError {
  readonly code = 'TIMEOUT_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly timeout: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TimeoutError';
    this.timestamp = new Date();
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends Error implements WooError {
  readonly code = 'CONFIGURATION_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ConfigurationError';
    this.timestamp = new Date();
  }
}

/**
 * Product-specific errors
 */
export class ProductNotFoundError extends Error implements WooError {
  readonly code = 'PRODUCT_NOT_FOUND' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    public readonly productId: number | string,
    public readonly details?: unknown
  ) {
    super(`Product with ID ${productId} not found`);
    this.name = 'ProductNotFoundError';
    this.timestamp = new Date();
  }
}

/**
 * Cart-related errors
 */
export class CartError extends Error implements WooError {
  readonly code = 'CART_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CartError';
    this.timestamp = new Date();
  }
}

/**
 * Checkout process errors
 */
export class CheckoutError extends Error implements WooError {
  readonly code = 'CHECKOUT_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CheckoutError';
    this.timestamp = new Date();
  }
}

/**
 * Payment processing errors
 */
export class PaymentError extends Error implements WooError {
  readonly code = 'PAYMENT_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;
  readonly statusCode?: number;

  constructor(
    message: string,
    public readonly details?: unknown,
    statusCode?: number
  ) {
    super(message);
    this.name = 'PaymentError';
    this.timestamp = new Date();
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}

/**
 * Error factory for creating typed errors
 */
export class ErrorFactory {
  static networkError(message: string, details?: unknown, statusCode?: number): NetworkError {
    return new NetworkError(message, details, statusCode);
  }

  static authError(message: string, details?: unknown, statusCode?: number): AuthError {
    return new AuthError(message, details, statusCode);
  }

  static validationError(message: string, details?: unknown): ValidationError {
    return new ValidationError(message, details);
  }

  static apiError(message: string, statusCode: number, details?: unknown): ApiError {
    return new ApiError(message, statusCode, details);
  }

  static rateLimitError(message: string, retryAfter?: number, details?: unknown): RateLimitError {
    return new RateLimitError(message, retryAfter, details);
  }

  static timeoutError(message: string, timeout: number, details?: unknown): TimeoutError {
    return new TimeoutError(message, timeout, details);
  }

  static configurationError(message: string, details?: unknown): ConfigurationError {
    return new ConfigurationError(message, details);
  }

  static productNotFoundError(productId: number | string, details?: unknown): ProductNotFoundError {
    return new ProductNotFoundError(productId, details);
  }

  static cartError(message: string, details?: unknown): CartError {
    return new CartError(message, details);
  }

  static checkoutError(message: string, details?: unknown): CheckoutError {
    return new CheckoutError(message, details);
  }

  static paymentError(message: string, details?: unknown, statusCode?: number): PaymentError {
    return new PaymentError(message, details, statusCode);
  }

  static cacheError(message: string, details?: unknown): CacheError {
    return new CacheError(message, details);
  }

  static notImplementedError(message: string, details?: unknown): ConfigurationError {
    return new ConfigurationError(`Not implemented: ${message}`, details);
  }

  static persistenceError(message: string, details?: unknown): CacheError {
    return new CacheError(`Persistence error: ${message}`, details);
  }
}

/**
 * Cache-related errors
 */
export class CacheError extends Error implements WooError {
  readonly code = 'CACHE_ERROR' as const;
  readonly timestamp: Date;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CacheError';
    this.timestamp = new Date();
  }
}

/**
 * Type guard for WooError
 */
export function isWooError(error: unknown): error is WooError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
} 