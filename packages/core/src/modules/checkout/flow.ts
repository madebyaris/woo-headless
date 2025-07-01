/**
 * Checkout Flow Management System for WooCommerce Headless SDK
 * Multi-step checkout process coordination with state management
 * Following the Enhanced Unified 10X Developer Framework
 */

import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  CheckoutStep,
  CheckoutStepType,
  CheckoutSession,
  CheckoutValidationRules,
  OrderTotals,
  Order
} from '../../types/checkout';
import { Cart } from '../../types/cart';
import { AddressManager } from './address';
import { ShippingService } from './shipping';
import { PaymentService } from './payment';
import { CheckoutValidationService, CheckoutValidationContext, CheckoutValidationResult as FlowValidationResult } from './validation';

/**
 * Checkout flow state
 */
export interface CheckoutFlowState {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly availableSteps: readonly CheckoutStep[];
  readonly canProceed: boolean;
  readonly canGoBack: boolean;
  readonly session: CheckoutSession;
  readonly validationResult?: FlowValidationResult;
}

/**
 * Step transition result
 */
export interface StepTransitionResult {
  readonly success: boolean;
  readonly newStep: number;
  readonly previousStep: number;
  readonly validationResult?: FlowValidationResult;
  readonly errors: readonly string[];
  readonly blockers: readonly string[];
}

/**
 * Checkout completion result
 */
export interface CheckoutCompletionResult {
  readonly success: boolean;
  readonly order?: Order;
  readonly paymentRedirectUrl?: string;
  readonly requiresPaymentAction: boolean;
  readonly errors: readonly string[];
}

/**
 * Checkout flow configuration
 */
export interface CheckoutFlowConfig {
  readonly steps: readonly CheckoutStepType[];
  readonly allowSkipOptional: boolean;
  readonly persistSession: boolean;
  readonly sessionTimeout: number; // in minutes
  readonly autoAdvance: boolean;
  readonly validationRules: CheckoutValidationRules;
}

/**
 * Checkout flow event handlers
 */
export interface CheckoutFlowEventHandlers {
  onStepChange?: (currentStep: number, previousStep: number) => void;
  onStepComplete?: (step: number) => void;
  onValidationError?: (errors: readonly string[]) => void;
  onCheckoutComplete?: (order: Order) => void;
  onCheckoutError?: (error: WooError) => void;
}

/**
 * Comprehensive checkout flow manager
 */
export class CheckoutFlowManager {
  private readonly paymentService: PaymentService;
  private readonly validationService: CheckoutValidationService;
  private readonly config: CheckoutFlowConfig;
  private readonly eventHandlers: CheckoutFlowEventHandlers;
  
  private flowState: CheckoutFlowState;
  private sessionId: string;

  constructor(
    _addressManager: AddressManager,
    _shippingService: ShippingService,
    paymentService: PaymentService,
    validationService: CheckoutValidationService,
    config: CheckoutFlowConfig,
    eventHandlers: CheckoutFlowEventHandlers = {}
  ) {
    // Store only the services we actually use
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
  async initializeCheckout(cart: Cart, isGuestCheckout: boolean = false): Promise<Result<CheckoutFlowState, WooError>> {
    try {
      // Create initial checkout session
      const orderTotals: OrderTotals = {
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

      const session: CheckoutSession = {
        id: this.sessionId,
        cartId: cart.sessionId,
        isGuestCheckout,
        orderTotals,
        flow: this.createEmptyFlow(),
        expiresAt: new Date(Date.now() + this.config.sessionTimeout * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Initialize flow state
      this.flowState = {
        currentStep: 1,
        completedSteps: [],
        availableSteps: this.buildAvailableSteps(cart),
        canProceed: false,
        canGoBack: false,
        session
      };

      // Persist session if configured
      if (this.config.persistSession) {
        await this.persistSession();
      }

      return Ok(this.flowState);

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Failed to initialize checkout flow',
        error
      ));
    }
  }

  /**
   * Move to next step
   */
  async nextStep(cart: Cart): Promise<Result<StepTransitionResult, WooError>> {
    try {
      const currentStep = this.flowState.currentStep;
      
      // Validate current step before proceeding
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

      // Move to next step
      const nextStep = currentStep + 1;
      const maxStep = this.flowState.availableSteps.length;

      if (nextStep > maxStep) {
        // Attempt to complete checkout
        return this.completeCheckout(cart);
      }

      // Update flow state
      const previousStep = this.flowState.currentStep;
      this.flowState = {
        ...this.flowState,
        currentStep: nextStep,
        completedSteps: [...this.flowState.completedSteps, currentStep],
        canProceed: false, // Will be determined by validation
        canGoBack: true,
        validationResult: validation
      };

      // Persist state
      if (this.config.persistSession) {
        await this.persistSession();
      }

      // Trigger events
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
        'Failed to advance to next step',
        error
      ));
    }
  }

  /**
   * Move to previous step
   */
  async previousStep(): Promise<Result<StepTransitionResult, WooError>> {
    try {
      const currentStep = this.flowState.currentStep;
      
      if (currentStep <= 1 || !this.flowState.canGoBack) {
        return Err(ErrorFactory.validationError(
          'Cannot go back from current step'
        ));
      }

      const previousStep = currentStep - 1;
      
      // Update flow state
      this.flowState = {
        ...this.flowState,
        currentStep: previousStep,
        completedSteps: this.flowState.completedSteps.filter(step => step !== currentStep),
        canProceed: true, // Previous steps were valid
        canGoBack: previousStep > 1
      };

      // Persist state
      if (this.config.persistSession) {
        await this.persistSession();
      }

      // Trigger event
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
        'Failed to go back to previous step',
        error
      ));
    }
  }

  /**
   * Jump to specific step
   */
  async goToStep(targetStep: number, cart: Cart): Promise<Result<StepTransitionResult, WooError>> {
    try {
      const currentStep = this.flowState.currentStep;
      
      if (targetStep < 1 || targetStep > this.flowState.availableSteps.length) {
        return Err(ErrorFactory.validationError(
          `Invalid step: ${targetStep}`
        ));
      }

      // If going forward, validate all steps in between
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

      // Update flow state
      this.flowState = {
        ...this.flowState,
        currentStep: targetStep,
        completedSteps: targetStep > currentStep 
          ? [...this.flowState.completedSteps, ...Array.from({ length: targetStep - currentStep }, (_, i) => currentStep + i)]
          : this.flowState.completedSteps.filter(step => step < targetStep),
        canGoBack: targetStep > 1
      };

      // Persist state
      if (this.config.persistSession) {
        await this.persistSession();
      }

      // Trigger event
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
        'Failed to jump to step',
        error
      ));
    }
  }

  /**
   * Update checkout session data
   */
  async updateSession(updates: Partial<CheckoutSession>, cart: Cart): Promise<Result<CheckoutFlowState, WooError>> {
    try {
      // Update session
      this.flowState = {
        ...this.flowState,
        session: {
          ...this.flowState.session,
          ...updates,
          updatedAt: new Date()
        }
      };

      // Re-validate current step with new data
      const validationResult = await this.validateCurrentStep(cart);
      if (isOk(validationResult)) {
        const validation = unwrap(validationResult);
        this.flowState = {
          ...this.flowState,
          canProceed: validation.canProceed,
          validationResult: validation
        };
      }

      // Persist state
      if (this.config.persistSession) {
        await this.persistSession();
      }

      return Ok(this.flowState);

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Failed to update checkout session',
        error
      ));
    }
  }

  /**
   * Validate current step
   */
  async validateCurrentStep(cart: Cart): Promise<Result<CheckoutValidationResult, WooError>> {
    return this.validateStep(this.flowState.currentStep, cart);
  }

  /**
   * Validate specific step
   */
  async validateStep(step: number, cart: Cart): Promise<Result<CheckoutValidationResult, WooError>> {
    try {
      const context: CheckoutValidationContext = {
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
        'Step validation failed',
        error
      ));
    }
  }

  /**
   * Complete checkout and create order
   */
  async completeCheckout(cart: Cart): Promise<Result<StepTransitionResult, WooError>> {
    try {
      // Final validation of entire checkout
      const context: CheckoutValidationContext = {
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

      // Create order (this would integrate with order processing service)
      const order = await this.createOrder(cart);
      if (isErr(order)) {
        return Err(unwrapErr(order));
      }

      const createdOrder = unwrap(order);

      // Initialize payment if required
      if (this.flowState.session.selectedPaymentMethod) {
        const paymentInit = await this.initializePayment(createdOrder);
        if (isOk(paymentInit)) {
          const payment = unwrap(paymentInit);
          return Ok({
            success: true,
            orderId: createdOrder.id.toString(),
            redirectUrl: payment.redirectUrl,
            paymentStatus: 'pending',
            requiresRedirect: payment.requiresRedirect,
            clientSecret: payment.clientSecret,
            paymentIntentId: payment.paymentIntentId
          });
        }
      }

      // Mark checkout as complete
      this.flowState = {
        ...this.flowState,
        currentStep: this.flowState.availableSteps.length + 1,
        completedSteps: [...this.flowState.completedSteps, this.flowState.currentStep],
        canProceed: false,
        canGoBack: false
      };

      // Trigger completion event
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
        'Checkout completion failed',
        error
      );
      this.eventHandlers.onCheckoutError?.(woError);
      return Err(woError);
    }
  }

  /**
   * Get current flow state
   */
  getFlowState(): CheckoutFlowState {
    return this.flowState;
  }

  /**
   * Get current step information
   */
  getCurrentStep(): CheckoutStep | null {
    const stepIndex = this.flowState.currentStep - 1;
    return this.flowState.availableSteps[stepIndex] || null;
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(step: number): boolean {
    return this.flowState.completedSteps.includes(step);
  }

  /**
   * Reset checkout flow
   */
  async resetFlow(): Promise<Result<void, WooError>> {
    try {
      this.flowState = this.initializeFlowState();
      this.sessionId = this.generateSessionId();
      
      if (this.config.persistSession) {
        await this.clearPersistedSession();
      }

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Failed to reset checkout flow',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Initialize empty flow state
   */
  private initializeFlowState(): CheckoutFlowState {
    return {
      currentStep: 1,
      completedSteps: [],
      availableSteps: [],
      canProceed: false,
      canGoBack: false,
      session: {
        id: this.sessionId,
        cartId: '',
        isGuestCheckout: false,
        useShippingAsBilling: true,
        orderNotes: '',
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
          currency: 'USD'
        },
        flow: {
          steps: [],
          currentStep: 'cart_review',
          canProceed: false,
          canGoBack: false,
          progress: {
            current: 1,
            total: 4,
            percentage: 25
          }
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  /**
   * Build available steps based on cart contents
   */
  private buildAvailableSteps(cart: Cart): CheckoutStep[] {
    const steps: CheckoutStep[] = [];

    // Always include address step
    steps.push({
      type: 'address',
      title: 'Billing & Shipping',
      description: 'Enter your billing and shipping information',
      completed: false,
      valid: false,
      errors: []
    });

    // Add shipping step if cart has physical items (simplified check without item.type)
    const hasPhysicalItems = cart.items.length > 0; // Simplified - assume physical items need shipping
    
    if (hasPhysicalItems) {
      steps.push({
        type: 'shipping',
        title: 'Shipping Method',
        description: 'Choose your shipping method',
        completed: false,
        valid: false,
        errors: []
      });
    }

    // Always include payment step
    steps.push({
      type: 'payment',
      title: 'Payment',
      description: 'Choose your payment method',
      completed: false,
      valid: false,
      errors: []
    });

    // Add review step
    steps.push({
      type: 'review',
      title: 'Review Order',
      description: 'Review your order before placing it',
      completed: false,
      valid: false,
      errors: []
    });

    return steps;
  }

  /**
   * Create order (placeholder - would integrate with order service)
   */
  private async createOrder(cart: Cart): Promise<Result<Order, WooError>> {
    try {
      // This would integrate with the order processing service
      // For now, return a mock order
      const order: Order = {
        id: this.generateOrderId(),
        number: `ORDER-${Date.now()}`,
        status: 'pending',
        currency: cart.currency,
        total: cart.totals.total,
        subtotal: cart.totals.subtotal,
        totalTax: cart.totals.tax,
        shippingTotal: cart.totals.shipping,
        shippingTax: cart.totals.shippingTax,
        discountTotal: cart.totals.discount,
        feeTotal: cart.totals.fees,
        feeTax: cart.totals.feeTax,
        billingAddress: this.flowState.session.billingAddress!,
        shippingAddress: this.flowState.session.useShippingAsBilling 
          ? this.flowState.session.billingAddress!
          : this.flowState.session.shippingAddress!,
        paymentMethod: this.flowState.session.selectedPaymentMethod?.id || '',
        shippingMethod: this.flowState.session.selectedShippingMethod?.methodId || '',
        orderNotes: this.flowState.session.orderNotes,
        lineItems: cart.items.map((item, index) => ({
          id: index + 1, // Use index as numeric ID
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          subtotal: item.price * item.quantity,
          totalTax: 0, // Default to 0 - would be calculated properly in real implementation
          subtotalTax: 0, // Default to 0 - would be calculated properly in real implementation
          name: item.name,
          sku: item.sku,
          meta: [] // Empty meta array for now
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return Ok(order);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Order creation failed',
        500,
        error
      ));
    }
  }

  /**
   * Initialize payment for order
   */
  private async initializePayment(order: Order): Promise<Result<{ redirectUrl?: string }, WooError>> {
    try {
      if (!this.flowState.session.selectedPaymentMethod) {
        return Ok({});
      }

      const paymentRequest = {
        paymentMethodId: this.flowState.session.selectedPaymentMethod.id,
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        returnUrl: this.config.validationRules.returnUrl || '/checkout/success',
        cancelUrl: this.config.validationRules.cancelUrl || '/checkout/cancel'
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
        'Payment initialization failed',
        500,
        error
      ));
    }
  }

  /**
   * Persist session (placeholder implementation)
   */
  private async persistSession(): Promise<void> {
    // This would integrate with session storage (localStorage, database, etc.)
    // For now, just store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`woo-checkout-session-${this.sessionId}`, JSON.stringify(this.flowState));
    }
  }

  /**
   * Clear persisted session
   */
  private async clearPersistedSession(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`woo-checkout-session-${this.sessionId}`);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate order ID
   */
  private generateOrderId(): number {
    return Date.now(); // Simple numeric ID based on timestamp
  }

  /**
   * Create empty checkout flow
   */
  private createEmptyFlow(): CheckoutFlow {
    return {
      steps: this.config.steps.map((type, index) => ({
        id: index + 1,
        type,
        status: 'pending',
        isRequired: !this.isStepOptional(type),
        isCompleted: false,
        canSkip: this.isStepOptional(type) && this.config.allowSkipOptional,
        validationErrors: [],
        data: {}
      })),
      currentStepIndex: 0,
      totalSteps: this.config.steps.length,
      isCompleted: false,
      completedAt: undefined
    };
  }

  /**
   * Check if step is optional
   */
  private isStepOptional(stepType: CheckoutStepType): boolean {
    const optionalSteps: CheckoutStepType[] = ['shipping', 'billing_different'];
    return optionalSteps.includes(stepType);
  }
}

/**
 * Default checkout flow configuration
 */
export const DEFAULT_CHECKOUT_FLOW_CONFIG: CheckoutFlowConfig = {
  steps: ['address', 'shipping', 'payment', 'review'],
  allowSkipOptional: false,
  persistSession: true,
  sessionTimeout: 30, // 30 minutes
  autoAdvance: false,
  validationRules: {
    minimumOrderAmount: 0,
    requireEmail: true,
    requirePhoneNumber: false,
    requireCompanyName: false,
    requiredFields: []
  }
}; 