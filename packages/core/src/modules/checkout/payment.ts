/**
 * Payment Gateway Framework for WooCommerce Headless SDK
 * Backend WordPress/WooCommerce payment processing with frontend flow management
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  PaymentMethod,
  PaymentMethodType,
  PaymentTransaction,
  CreditCard,
  Order,
  OrderTotals
} from '../../types/checkout';

/**
 * Available payment methods response from backend
 */
export interface PaymentMethodsResponse {
  readonly availableMethods: readonly PaymentMethod[];
  readonly defaultMethod?: PaymentMethod;
  readonly minimumAmounts: Record<string, number>;
  readonly currency: string;
}

/**
 * Payment initialization request
 */
export interface PaymentInitRequest {
  readonly paymentMethodId: string;
  readonly orderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly returnUrl: string;
  readonly cancelUrl: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Payment initialization response
 */
export interface PaymentInitResponse {
  readonly paymentId: string;
  readonly redirectUrl?: string;
  readonly requiresRedirect: boolean;
  readonly clientSecret?: string;
  readonly paymentIntentId?: string;
  readonly instructions?: string;
  readonly expiresAt?: Date;
}

/**
 * Payment status check response
 */
export interface PaymentStatusResponse {
  readonly paymentId: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  readonly transactionId?: string;
  readonly failureReason?: string;
  readonly redirectUrl?: string;
  readonly nextAction?: {
    readonly type: 'redirect' | 'authenticate' | 'confirm';
    readonly url?: string;
    readonly data?: Record<string, unknown>;
  };
}

/**
 * Payment callback data
 */
export interface PaymentCallbackData {
  readonly paymentId: string;
  readonly orderId: string;
  readonly status: string;
  readonly transactionId?: string;
  readonly signature?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Payment method validation result
 */
export interface PaymentValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Payment service configuration
 */
export interface PaymentConfig {
  readonly enabled: boolean;
  readonly testMode: boolean;
  readonly supportedMethods: readonly PaymentMethodType[];
  readonly minimumAmount: number;
  readonly maximumAmount?: number;
  readonly currency: string;
  readonly returnUrl: string;
  readonly cancelUrl: string;
  readonly webhookUrl?: string;
  readonly cacheTimeout: number; // in minutes
}

/**
 * Payment gateway service for backend integration
 */
export class PaymentService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: PaymentConfig;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: PaymentConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Get available payment methods from backend
   */
  async getAvailablePaymentMethods(
    amount: number, 
    currency: string = this.config.currency,
    country?: string
  ): Promise<Result<PaymentMethodsResponse, WooError>> {
    try {
      const cacheKey = `payment-methods:${amount}:${currency}:${country || 'default'}`;
      
      // Check cache first
      const cached = await this.cache.get<PaymentMethodsResponse>(cacheKey);
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }

      // Fetch from backend
      const response = await this.client.get('/wp-json/wc/v3/payment_gateways', {
        amount: amount.toString(),
        currency,
        country: country?.toUpperCase()
      });

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const paymentResponse: PaymentMethodsResponse = {
        availableMethods: data.payment_gateways || [],
        defaultMethod: data.default_gateway,
        minimumAmounts: data.minimum_amounts || {},
        currency: data.currency || currency
      };

      // Cache the response
      await this.cache.set(cacheKey, paymentResponse, this.config.cacheTimeout * 60);

      return Ok(paymentResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to fetch payment methods',
        500,
        error
      ));
    }
  }

  /**
   * Initialize payment with selected method
   */
  async initializePayment(request: PaymentInitRequest): Promise<Result<PaymentInitResponse, WooError>> {
    try {
      // Validate payment method is available
      const methodsResult = await this.getAvailablePaymentMethods(request.amount, request.currency);
      if (isErr(methodsResult)) {
        return Err(unwrapErr(methodsResult));
      }

      const methods = unwrap(methodsResult);
      const selectedMethod = methods.availableMethods.find(m => m.id === request.paymentMethodId);
      if (!selectedMethod || !selectedMethod.enabled) {
        return Err(ErrorFactory.validationError(
          'Selected payment method is not available',
          { methodId: request.paymentMethodId }
        ));
      }

      // Initialize payment with backend
      const response = await this.client.post('/wp-json/wc/v3/payments/initialize', {
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

      const data = unwrap(response).data as any;
      const initResponse: PaymentInitResponse = {
        paymentId: data.payment_id,
        redirectUrl: data.redirect_url,
        requiresRedirect: data.requires_redirect || false,
        clientSecret: data.client_secret,
        paymentIntentId: data.payment_intent_id,
        instructions: data.instructions,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
      };

      return Ok(initResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Payment initialization failed',
        500,
        error
      ));
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<Result<PaymentStatusResponse, WooError>> {
    try {
      const response = await this.client.get(`/wp-json/wc/v3/payments/${paymentId}/status`);

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const statusResponse: PaymentStatusResponse = {
        paymentId: data.payment_id,
        status: data.status,
        transactionId: data.transaction_id,
        failureReason: data.failure_reason,
        redirectUrl: data.redirect_url,
        nextAction: data.next_action ? {
          type: data.next_action.type,
          url: data.next_action.url,
          data: data.next_action.data
        } : undefined
      };

      return Ok(statusResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Payment status check failed',
        500,
        error
      ));
    }
  }

  /**
   * Handle payment callback from gateway
   */
  async handlePaymentCallback(callbackData: PaymentCallbackData): Promise<Result<PaymentStatusResponse, WooError>> {
    try {
      // Verify callback signature if provided
      if (callbackData.signature) {
        const isValid = await this.verifyCallbackSignature(callbackData);
        if (!isValid) {
          return Err(ErrorFactory.authError(
            'Invalid payment callback signature'
          ));
        }
      }

      // Process callback with backend
      const response = await this.client.post('/wp-json/wc/v3/payments/callback', {
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

      const data = unwrap(response).data as any;
      const statusResponse: PaymentStatusResponse = {
        paymentId: data.payment_id,
        status: data.status,
        transactionId: data.transaction_id,
        failureReason: data.failure_reason,
        redirectUrl: data.redirect_url
      };

      return Ok(statusResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Payment callback processing failed',
        500,
        error
      ));
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<Result<void, WooError>> {
    try {
      const response = await this.client.post(`/wp-json/wc/v3/payments/${paymentId}/cancel`, {
        reason
      });

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Payment cancellation failed',
        500,
        error
      ));
    }
  }

  /**
   * Validate payment method selection
   */
  async validatePaymentMethod(
    methodId: string,
    amount: number,
    currency: string = this.config.currency
  ): Promise<Result<PaymentValidationResult, WooError>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if method is supported
      if (!this.config.supportedMethods.includes(methodId as PaymentMethodType)) {
        errors.push(`Payment method "${methodId}" is not supported`);
      }

      // Check amount limits
      if (amount < this.config.minimumAmount) {
        errors.push(`Amount is below minimum (${this.config.minimumAmount} ${currency})`);
      }

      if (this.config.maximumAmount && amount > this.config.maximumAmount) {
        errors.push(`Amount exceeds maximum (${this.config.maximumAmount} ${currency})`);
      }

      // Get available methods to validate
      const methodsResult = await this.getAvailablePaymentMethods(amount, currency);
      if (isErr(methodsResult)) {
        return Err(unwrapErr(methodsResult));
      }

      const methods = unwrap(methodsResult);
      const method = methods.availableMethods.find(m => m.id === methodId);
      
      if (!method) {
        errors.push(`Payment method "${methodId}" is not available`);
      } else if (!method.enabled) {
        errors.push(`Payment method "${methodId}" is currently disabled`);
      } else {
        // Check method-specific minimum amount
        const methodMinimum = methods.minimumAmounts[methodId];
        if (methodMinimum && amount < methodMinimum) {
          errors.push(`Amount is below minimum for ${method.title} (${methodMinimum} ${currency})`);
        }

        // Add method-specific warnings
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
        'Payment method validation failed',
        error
      ));
    }
  }

  /**
   * Generate payment redirect URL
   */
  generateRedirectUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }

  /**
   * Parse payment callback URL parameters
   */
  parseCallbackUrl(callbackUrl: string): Record<string, string> {
    const url = new URL(callbackUrl);
    const params: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  }

  /**
   * Check if payment method requires redirect
   */
  requiresRedirect(methodId: string): boolean {
    const redirectMethods: PaymentMethodType[] = [
      'paypal',
      'stripe_checkout',
      'bank_transfer',
      'cash_on_delivery'
    ];
    
    return redirectMethods.includes(methodId as PaymentMethodType);
  }

  /**
   * Get payment method display information
   */
  getPaymentMethodDisplay(method: PaymentMethod): {
    title: string;
    description: string;
    icon?: string;
    acceptedCards?: string[];
  } {
    return {
      title: method.title || method.id,
      description: method.description || '',
      icon: method.icon,
      acceptedCards: method.acceptedCards
    };
  }

  /**
   * Filter payment methods by criteria
   */
  filterPaymentMethods(
    methods: readonly PaymentMethod[],
    criteria: {
      enabled?: boolean;
      minAmount?: number;
      country?: string;
      currency?: string;
    }
  ): PaymentMethod[] {
    return methods.filter(method => {
      if (criteria.enabled !== undefined && method.enabled !== criteria.enabled) {
        return false;
      }

      if (criteria.minAmount && method.minimumAmount && criteria.minAmount < method.minimumAmount) {
        return false;
      }

      if (criteria.country && method.supportedCountries && 
          !method.supportedCountries.includes(criteria.country.toUpperCase())) {
        return false;
      }

      if (criteria.currency && method.supportedCurrencies && 
          !method.supportedCurrencies.includes(criteria.currency.toUpperCase())) {
        return false;
      }

      return true;
    });
  }

  /**
   * Clear payment methods cache
   */
  async clearPaymentCache(): Promise<Result<void, WooError>> {
    try {
      await this.cache.invalidatePattern('payment-');
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to clear payment cache',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Verify payment callback signature
   */
  private async verifyCallbackSignature(callbackData: PaymentCallbackData): Promise<boolean> {
    try {
      // This would implement gateway-specific signature verification
      // For now, return true as placeholder
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Payment flow manager for handling multi-step payments
 */
export class PaymentFlowManager {
  private readonly paymentService: PaymentService;
  private currentPayment: PaymentInitResponse | null = null;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * Start payment flow
   */
  async startPayment(request: PaymentInitRequest): Promise<Result<PaymentInitResponse, WooError>> {
    const result = await this.paymentService.initializePayment(request);
    
    if (isOk(result)) {
      this.currentPayment = unwrap(result);
    }

    return result;
  }

  /**
   * Handle redirect return
   */
  async handleRedirectReturn(returnUrl: string): Promise<Result<PaymentStatusResponse, WooError>> {
    if (!this.currentPayment) {
      return Err(ErrorFactory.validationError('No active payment flow'));
    }

    const params = this.paymentService.parseCallbackUrl(returnUrl);
    const paymentId = params.payment_id || this.currentPayment.paymentId;

    return this.paymentService.checkPaymentStatus(paymentId);
  }

  /**
   * Poll payment status
   */
  async pollPaymentStatus(
    paymentId: string,
    intervalMs: number = 2000,
    timeoutMs: number = 30000
  ): Promise<Result<PaymentStatusResponse, WooError>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const statusResult = await this.paymentService.checkPaymentStatus(paymentId);
      
      if (isErr(statusResult)) {
        return statusResult;
      }

      const status = unwrap(statusResult);
      if (status.status === 'completed' || status.status === 'failed') {
        return Ok(status);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return Err(ErrorFactory.timeoutError('Payment status polling timeout'));
  }

  /**
   * Reset current payment flow
   */
  resetFlow(): void {
    this.currentPayment = null;
  }

  /**
   * Get current payment info
   */
  getCurrentPayment(): PaymentInitResponse | null {
    return this.currentPayment;
  }
}

/**
 * Default payment configuration
 */
export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  enabled: true,
  testMode: true,
  supportedMethods: ['stripe', 'paypal', 'bank_transfer', 'cash_on_delivery'],
  minimumAmount: 1,
  currency: 'USD',
  returnUrl: '/checkout/payment/return',
  cancelUrl: '/checkout/payment/cancel',
  cacheTimeout: 10 // 10 minutes
}; 