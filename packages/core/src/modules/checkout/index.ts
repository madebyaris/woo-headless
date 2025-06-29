/**
 * Main Checkout Service for WooCommerce Headless SDK
 * Unified API integrating all checkout components
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  CheckoutSession,
  CheckoutValidationRules,
  CheckoutStep,
  CheckoutStepType,
  BillingAddress,
  ShippingAddress,
  SelectedShippingMethod,
  PaymentMethod,
  Order,
  OrderStatus
} from '../../types/checkout';
import { Cart } from '../../types/cart';

// Import all checkout services
import { 
  AddressManager, 
  AddressFieldRequirements, 
  AddressValidationContext,
  DEFAULT_ADDRESS_MANAGER 
} from './address';
import { 
  ShippingService, 
  ShippingRateRequest, 
  ShippingRateResponse,
  ShippingCalculation,
  ShippingConfig,
  DEFAULT_SHIPPING_CONFIG 
} from './shipping';
import { 
  PaymentService, 
  PaymentInitRequest, 
  PaymentInitResponse,
  PaymentStatusResponse,
  PaymentConfig,
  DEFAULT_PAYMENT_CONFIG 
} from './payment';
import { 
  CheckoutValidationService,
  CheckoutValidationContext,
  CheckoutValidationResult,
  ValidationResult,
  createValidationRules 
} from './validation';
import { 
  CheckoutFlowManager,
  CheckoutFlowState,
  CheckoutFlowConfig,
  CheckoutFlowEventHandlers,
  StepTransitionResult,
  DEFAULT_CHECKOUT_FLOW_CONFIG 
} from './flow';
import { 
  OrderProcessingService,
  OrderCreateRequest,
  OrderCreateResponse,
  OrderConfirmationRequest,
  OrderSearchCriteria,
  OrderProcessingConfig,
  DEFAULT_ORDER_PROCESSING_CONFIG 
} from './order';

/**
 * Comprehensive checkout configuration
 */
export interface CheckoutConfig {
  readonly address?: Partial<AddressFieldRequirements>;
  readonly shipping?: Partial<ShippingConfig>;
  readonly payment?: Partial<PaymentConfig>;
  readonly flow?: Partial<CheckoutFlowConfig>;
  readonly order?: Partial<OrderProcessingConfig>;
  readonly validation?: Partial<CheckoutValidationRules>;
}

/**
 * Checkout session update options
 */
export interface CheckoutSessionUpdateOptions {
  readonly billingAddress?: BillingAddress;
  readonly shippingAddress?: ShippingAddress;
  readonly useShippingAsBilling?: boolean;
  readonly selectedShippingMethod?: SelectedShippingMethod;
  readonly selectedPaymentMethod?: PaymentMethod;
  readonly orderNotes?: string;
  readonly termsAccepted?: boolean;
  readonly newsletterOptIn?: boolean;
}

/**
 * Checkout initialization options
 */
export interface CheckoutInitOptions {
  readonly isGuestCheckout?: boolean;
  readonly skipValidation?: boolean;
  readonly startStep?: number;
}

/**
 * Main checkout service integrating all components
 */
export class CheckoutService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: CheckoutConfig;

  // Service instances
  private readonly addressManager: AddressManager;
  private readonly shippingService: ShippingService;
  private readonly paymentService: PaymentService;
  private readonly validationService: CheckoutValidationService;
  private readonly orderProcessingService: OrderProcessingService;
  
  // Flow manager (created per checkout session)
  private flowManager: CheckoutFlowManager | null = null;
  private currentCart: Cart | null = null;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: CheckoutConfig = {}
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;

    // Initialize service instances
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
  async initializeCheckout(
    cart: Cart, 
    options: CheckoutInitOptions = {},
    eventHandlers: CheckoutFlowEventHandlers = {}
  ): Promise<Result<CheckoutFlowState, WooError>> {
    try {
      this.currentCart = cart;

      // Create flow manager
      const flowConfig: CheckoutFlowConfig = {
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

      // Initialize the flow
      const result = await this.flowManager.initializeCheckout(
        cart, 
        options.isGuestCheckout || false
      );

      if (isOk(result) && options.startStep && options.startStep > 1) {
        // Jump to specific step if requested
        return this.flowManager.goToStep(options.startStep, cart);
      }

      return result;

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Checkout initialization failed',
        error
      ));
    }
  }

  /**
   * Update checkout session
   */
  async updateSession(updates: CheckoutSessionUpdateOptions): Promise<Result<CheckoutFlowState, WooError>> {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.flowManager.updateSession(updates, this.currentCart);
  }

  /**
   * Move to next step
   */
  async nextStep(): Promise<Result<StepTransitionResult, WooError>> {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.flowManager.nextStep(this.currentCart);
  }

  /**
   * Move to previous step
   */
  async previousStep(): Promise<Result<StepTransitionResult, WooError>> {
    if (!this.flowManager) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.flowManager.previousStep();
  }

  /**
   * Jump to specific step
   */
  async goToStep(step: number): Promise<Result<StepTransitionResult, WooError>> {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.flowManager.goToStep(step, this.currentCart);
  }

  /**
   * Get current checkout state
   */
  getCurrentState(): CheckoutFlowState | null {
    return this.flowManager?.getFlowState() || null;
  }

  /**
   * Validate current step
   */
  async validateCurrentStep(): Promise<Result<CheckoutValidationResult, WooError>> {
    if (!this.flowManager || !this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.flowManager.validateCurrentStep(this.currentCart);
  }

  /**
   * Complete checkout and create order
   */
  async completeCheckout(): Promise<Result<OrderCreateResponse, WooError>> {
    try {
      if (!this.flowManager || !this.currentCart) {
        return Err(ErrorFactory.validationError('Checkout not initialized'));
      }

      const currentState = this.flowManager.getFlowState();
      
      // Create order request
      const orderRequest: OrderCreateRequest = {
        cart: this.currentCart,
        checkoutSession: currentState.session
      };

      // Create the order
      const orderResult = await this.orderProcessingService.createOrder(orderRequest);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }

      const orderResponse = unwrap(orderResult);

      // If payment is required and we have a payment method, initialize payment
      if (orderResponse.requiresPayment && currentState.session.selectedPaymentMethod) {
        const paymentRequest: PaymentInitRequest = {
          paymentMethodId: currentState.session.selectedPaymentMethod.id,
          orderId: orderResponse.order.id,
          amount: orderResponse.order.total,
          currency: orderResponse.order.currency,
          returnUrl: '/checkout/payment/return',
          cancelUrl: '/checkout/payment/cancel'
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
        'Checkout completion failed',
        500,
        error
      ));
    }
  }

  // Address Management Methods

  /**
   * Get field requirements for address
   */
  getAddressFieldRequirements(addressType: 'billing' | 'shipping'): AddressFieldRequirements {
    const context: AddressValidationContext = {
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
  async validateAddress(
    address: BillingAddress | ShippingAddress, 
    type: 'billing' | 'shipping'
  ): Promise<Result<ValidationResult, WooError>> {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    const context: CheckoutValidationContext = {
      checkoutSession: this.getCurrentState()?.session || {} as CheckoutSession,
      cart: this.currentCart,
      validationRules: { ...this.config.validation } as CheckoutValidationRules,
      isGuestCheckout: this.getCurrentState()?.session.isGuestCheckout || false,
      currentStep: this.getCurrentState()?.currentStep || 1
    };

    if (type === 'billing') {
      return this.validationService.validateBillingAddress(context);
    } else {
      return this.validationService.validateShippingAddress(context);
    }
  }

  /**
   * Get address suggestions
   */
  async getAddressSuggestions(address: BillingAddress | ShippingAddress): Promise<Result<BillingAddress | ShippingAddress | null, WooError>> {
    return this.addressManager.suggestAddressCorrection(address);
  }

  // Shipping Methods

  /**
   * Get available shipping rates
   */
  async getShippingRates(destination?: BillingAddress | ShippingAddress): Promise<Result<ShippingRateResponse, WooError>> {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    const currentState = this.getCurrentState();
    const shippingDestination = destination || 
      (currentState?.session.useShippingAsBilling 
        ? currentState?.session.billingAddress 
        : currentState?.session.shippingAddress);

    if (!shippingDestination) {
      return Err(ErrorFactory.validationError('Shipping address is required'));
    }

    const request: ShippingRateRequest = {
      destination: shippingDestination,
      cartItems: this.currentCart.items.map(item => ({
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
  async calculateShipping(
    selectedMethod: SelectedShippingMethod,
    destination?: BillingAddress | ShippingAddress
  ): Promise<Result<ShippingCalculation, WooError>> {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    const currentState = this.getCurrentState();
    const shippingDestination = destination || 
      (currentState?.session.useShippingAsBilling 
        ? currentState?.session.billingAddress 
        : currentState?.session.shippingAddress);

    if (!shippingDestination) {
      return Err(ErrorFactory.validationError('Shipping address is required'));
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
  async getPaymentMethods(): Promise<Result<PaymentMethod[], WooError>> {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
    }

    return this.paymentService.getAvailablePaymentMethods(
      this.currentCart.totals.total,
      this.currentCart.currency
    );
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(methodId: string): Promise<Result<boolean, WooError>> {
    if (!this.currentCart) {
      return Err(ErrorFactory.validationError('Checkout not initialized'));
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
  async getOrder(orderId: string): Promise<Result<Order, WooError>> {
    return this.orderProcessingService.getOrder(orderId);
  }

  /**
   * Confirm order payment
   */
  async confirmOrderPayment(request: OrderConfirmationRequest): Promise<Result<Order, WooError>> {
    return this.orderProcessingService.confirmOrder(request);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Result<Order, WooError>> {
    return this.orderProcessingService.cancelOrder(orderId, reason);
  }

  /**
   * Search orders
   */
  async searchOrders(criteria: OrderSearchCriteria): Promise<Result<Order[], WooError>> {
    return this.orderProcessingService.searchOrders(criteria);
  }

  // Utility Methods

  /**
   * Reset checkout session
   */
  async resetCheckout(): Promise<Result<void, WooError>> {
    if (this.flowManager) {
      const resetResult = await this.flowManager.resetFlow();
      this.flowManager = null;
      this.currentCart = null;
      return resetResult;
    }
    return Ok(undefined);
  }

  /**
   * Check if checkout can proceed
   */
  canProceedToNextStep(): boolean {
    const state = this.getCurrentState();
    return state?.canProceed || false;
  }

  /**
   * Get current step information
   */
  getCurrentStep(): CheckoutStep | null {
    return this.flowManager?.getCurrentStep() || null;
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(step: number): boolean {
    return this.flowManager?.isStepCompleted(step) || false;
  }

  /**
   * Generate order number
   */
  generateOrderNumber(): string {
    return this.orderProcessingService.generateOrderNumber();
  }

  /**
   * Get checkout configuration
   */
  getConfiguration(): CheckoutConfig {
    return this.config;
  }

  /**
   * Update checkout configuration
   */
  updateConfiguration(updates: Partial<CheckoutConfig>): void {
    Object.assign(this.config, updates);
  }
}

/**
 * Default checkout configuration
 */
export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
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
};

// Export all types and services for advanced usage
export * from './address';
export * from './shipping';
export * from './payment';
export * from './validation';
export * from './flow';
export * from './order';

export {
  CheckoutService as default,
  CheckoutService
}; 