/**
 * Comprehensive Checkout Validation System for WooCommerce Headless SDK
 * Coordinates all checkout component validations into unified validation framework
 * Following the Enhanced Unified 10X Developer Framework
 */

import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  CheckoutFormData,
  CheckoutValidationRules,
  CheckoutSession,
  BillingAddress,
  ShippingAddress,
  SelectedShippingMethod,
  PaymentMethod,
  Order,
  OrderTotals,
  CheckoutErrorCode,
  CheckoutError
} from '../../types/checkout';
import { Cart, CartItem } from '../../types/cart';
import { AddressManager, AddressValidationContext } from './address';
import { ShippingService } from './shipping';
import { PaymentService } from './payment';

/**
 * Validation result for individual checkout components
 */
export interface ValidationResult {
  readonly component: 'address' | 'shipping' | 'payment' | 'cart' | 'totals';
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Comprehensive checkout validation result
 */
export interface CheckoutValidationResult {
  readonly isValid: boolean;
  readonly canProceed: boolean;
  readonly validationResults: readonly ValidationResult[];
  readonly criticalErrors: readonly string[];
  readonly warnings: readonly string[];
  readonly blockers: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Validation context for checkout process
 */
export interface CheckoutValidationContext {
  readonly checkoutSession: CheckoutSession;
  readonly cart: Cart;
  readonly validationRules: CheckoutValidationRules;
  readonly isGuestCheckout: boolean;
  readonly currentStep: number;
  readonly skipOptionalValidations?: boolean;
}

/**
 * Stock validation result
 */
export interface StockValidationResult {
  readonly isValid: boolean;
  readonly outOfStockItems: readonly CartItem[];
  readonly insufficientStockItems: readonly {
    readonly item: CartItem;
    readonly availableQuantity: number;
  }[];
  readonly backorderItems: readonly CartItem[];
}

/**
 * Comprehensive checkout validation service
 */
export class CheckoutValidationService {
  private readonly addressManager: AddressManager;
  private readonly shippingService: ShippingService;
  private readonly paymentService: PaymentService;

  constructor(
    addressManager: AddressManager,
    shippingService: ShippingService,
    paymentService: PaymentService
  ) {
    this.addressManager = addressManager;
    this.shippingService = shippingService;
    this.paymentService = paymentService;
  }

  /**
   * Validate entire checkout process
   */
  async validateCheckout(context: CheckoutValidationContext): Promise<Result<CheckoutValidationResult, WooError>> {
    try {
      const validationResults: ValidationResult[] = [];
      const criticalErrors: string[] = [];
      const warnings: string[] = [];
      const blockers: string[] = [];
      const recommendations: string[] = [];

      // Validate billing address
      const billingResult = await this.validateBillingAddress(context);
      if (isErr(billingResult)) {
        return Err(unwrapErr(billingResult));
      }
      validationResults.push(unwrap(billingResult));

      // Validate shipping address if different from billing
      if (!context.checkoutSession.useShippingAsBilling) {
        const shippingResult = await this.validateShippingAddress(context);
        if (isErr(shippingResult)) {
          return Err(unwrapErr(shippingResult));
        }
        validationResults.push(unwrap(shippingResult));
      }

      // Validate shipping method
      if (context.checkoutSession.selectedShippingMethod) {
        const shippingMethodResult = await this.validateShippingMethod(context);
        if (isErr(shippingMethodResult)) {
          return Err(unwrapErr(shippingMethodResult));
        }
        validationResults.push(unwrap(shippingMethodResult));
      }

      // Validate payment method
      if (context.checkoutSession.selectedPaymentMethod) {
        const paymentResult = await this.validatePaymentMethod(context);
        if (isErr(paymentResult)) {
          return Err(unwrapErr(paymentResult));
        }
        validationResults.push(unwrap(paymentResult));
      }

      // Validate cart and stock
      const cartResult = await this.validateCart(context);
      if (isErr(cartResult)) {
        return Err(unwrapErr(cartResult));
      }
      validationResults.push(unwrap(cartResult));

      // Validate order totals
      const totalsResult = await this.validateOrderTotals(context);
      if (isErr(totalsResult)) {
        return Err(unwrapErr(totalsResult));
      }
      validationResults.push(unwrap(totalsResult));

      // Aggregate results
      const allValid = validationResults.every(result => result.isValid);
      
      // Collect critical errors and warnings
      validationResults.forEach(result => {
        if (!result.isValid) {
          criticalErrors.push(...result.errors);
        }
        warnings.push(...result.warnings);
      });

      // Determine blockers (issues that prevent checkout completion)
      const hasAddressErrors = validationResults.some(r => 
        r.component === 'address' && !r.isValid
      );
      const hasPaymentErrors = validationResults.some(r => 
        r.component === 'payment' && !r.isValid
      );
      const hasStockErrors = validationResults.some(r => 
        r.component === 'cart' && !r.isValid
      );

      if (hasAddressErrors) {
        blockers.push('Address information is incomplete or invalid');
      }
      if (hasPaymentErrors) {
        blockers.push('Payment method is not valid or available');
      }
      if (hasStockErrors) {
        blockers.push('Some items are out of stock or unavailable');
      }

      // Generate recommendations
      this.generateRecommendations(validationResults, recommendations);

      const canProceed = allValid && blockers.length === 0;

      return Ok({
        isValid: allValid,
        canProceed,
        validationResults,
        criticalErrors,
        warnings,
        blockers,
        recommendations
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Checkout validation failed',
        error
      ));
    }
  }

  /**
   * Validate billing address
   */
  async validateBillingAddress(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const billingAddress = context.checkoutSession.billingAddress;
      if (!billingAddress) {
        return Ok({
          component: 'address',
          isValid: false,
          errors: ['Billing address is required'],
          warnings: []
        });
      }

      const addressContext: AddressValidationContext = {
        addressType: 'billing',
        isGuestCheckout: context.isGuestCheckout,
        checkoutRules: context.validationRules,
        fieldRequirements: {
          email: context.isGuestCheckout || context.validationRules.requireEmail
        }
      };

      const validation = await this.addressManager.validateAddressWithContext(
        billingAddress,
        addressContext
      );

      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }

      const result = unwrap(validation);
      return Ok({
        component: 'address',
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { addressType: 'billing' }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Billing address validation failed',
        error
      ));
    }
  }

  /**
   * Validate shipping address
   */
  async validateShippingAddress(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const shippingAddress = context.checkoutSession.shippingAddress;
      if (!shippingAddress) {
        return Ok({
          component: 'address',
          isValid: false,
          errors: ['Shipping address is required'],
          warnings: []
        });
      }

      const addressContext: AddressValidationContext = {
        addressType: 'shipping',
        isGuestCheckout: context.isGuestCheckout,
        checkoutRules: context.validationRules
      };

      const validation = await this.addressManager.validateAddressWithContext(
        shippingAddress,
        addressContext
      );

      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }

      const result = unwrap(validation);
      return Ok({
        component: 'address',
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { addressType: 'shipping' }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Shipping address validation failed',
        error
      ));
    }
  }

  /**
   * Validate selected shipping method
   */
  async validateShippingMethod(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const selectedMethod = context.checkoutSession.selectedShippingMethod;
      const shippingAddress = context.checkoutSession.useShippingAsBilling 
        ? context.checkoutSession.billingAddress 
        : context.checkoutSession.shippingAddress;

      if (!selectedMethod || !shippingAddress) {
        return Ok({
          component: 'shipping',
          isValid: false,
          errors: ['Shipping method and address are required'],
          warnings: []
        });
      }

      // Get available shipping rates
      const ratesResult = await this.shippingService.getShippingRates({
        destination: shippingAddress,
        cartItems: context.cart.items.map(item => ({
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          weight: item.weight,
          dimensions: item.dimensions
        })),
        cartTotal: context.cart.totals.total,
        currency: context.cart.currency
      });

      if (isErr(ratesResult)) {
        return Err(unwrapErr(ratesResult));
      }

      const rates = unwrap(ratesResult);
      
      // Check if selected method is available
      const isValidMethod = this.shippingService.validateShippingSelection(
        selectedMethod,
        rates.rates
      );

      if (!isValidMethod) {
        return Ok({
          component: 'shipping',
          isValid: false,
          errors: ['Selected shipping method is no longer available'],
          warnings: []
        });
      }

      return Ok({
        component: 'shipping',
        isValid: true,
        errors: [],
        warnings: [],
        metadata: { selectedMethod }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Shipping method validation failed',
        error
      ));
    }
  }

  /**
   * Validate selected payment method
   */
  async validatePaymentMethod(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const selectedMethod = context.checkoutSession.selectedPaymentMethod;
      if (!selectedMethod) {
        return Ok({
          component: 'payment',
          isValid: false,
          errors: ['Payment method is required'],
          warnings: []
        });
      }

      // Validate payment method availability and constraints
      const validation = await this.paymentService.validatePaymentMethod(
        selectedMethod.id,
        context.cart.totals.total,
        context.cart.currency
      );

      if (isErr(validation)) {
        return Err(unwrapErr(validation));
      }

      const result = unwrap(validation);
      return Ok({
        component: 'payment',
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: { selectedMethod }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Payment method validation failed',
        error
      ));
    }
  }

  /**
   * Validate cart and stock availability
   */
  async validateCart(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const cart = context.cart;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic cart validation
      if (cart.items.length === 0) {
        errors.push('Cart is empty');
      }

      // Validate minimum order amount
      if (context.validationRules.minimumOrderAmount && 
          cart.totals.total < context.validationRules.minimumOrderAmount) {
        errors.push(`Minimum order amount is ${context.validationRules.minimumOrderAmount}`);
      }

      // Validate maximum order amount
      if (context.validationRules.maximumOrderAmount && 
          cart.totals.total > context.validationRules.maximumOrderAmount) {
        errors.push(`Maximum order amount is ${context.validationRules.maximumOrderAmount}`);
      }

      // Stock validation would be handled by existing cart validation
      // This is a placeholder for additional cart-specific validation
      
      const isValid = errors.length === 0;

      return Ok({
        component: 'cart',
        isValid,
        errors,
        warnings,
        metadata: { 
          itemCount: cart.items.length,
          total: cart.totals.total
        }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Cart validation failed',
        error
      ));
    }
  }

  /**
   * Validate order totals consistency
   */
  async validateOrderTotals(context: CheckoutValidationContext): Promise<Result<ValidationResult, WooError>> {
    try {
      const totals = context.cart.totals;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic totals validation
      if (totals.total < 0) {
        errors.push('Order total cannot be negative');
      }

      if (totals.subtotal < 0) {
        errors.push('Subtotal cannot be negative');
      }

      if (totals.tax < 0) {
        errors.push('Tax amount cannot be negative');
      }

      // Validate total calculation
      const calculatedTotal = totals.subtotal + totals.tax + totals.shipping + 
                             totals.shippingTax + totals.fees + totals.feesTax - 
                             totals.discount;

      if (Math.abs(calculatedTotal - totals.total) > 0.01) {
        errors.push('Order total calculation is inconsistent');
      }

      // Check for reasonable total amounts
      if (totals.total > 100000) {
        warnings.push('Order total is unusually high');
      }

      const isValid = errors.length === 0;

      return Ok({
        component: 'totals',
        isValid,
        errors,
        warnings,
        metadata: { 
          calculatedTotal,
          actualTotal: totals.total
        }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Order totals validation failed',
        error
      ));
    }
  }

  /**
   * Validate specific checkout step
   */
  async validateStep(
    step: number,
    context: CheckoutValidationContext
  ): Promise<Result<CheckoutValidationResult, WooError>> {
    try {
      const validationResults: ValidationResult[] = [];

      switch (step) {
        case 1: // Address information
          const billingResult = await this.validateBillingAddress(context);
          if (isErr(billingResult)) return Err(unwrapErr(billingResult));
          validationResults.push(unwrap(billingResult));

          if (!context.checkoutSession.useShippingAsBilling) {
            const shippingResult = await this.validateShippingAddress(context);
            if (isErr(shippingResult)) return Err(unwrapErr(shippingResult));
            validationResults.push(unwrap(shippingResult));
          }
          break;

        case 2: // Shipping method
          if (context.checkoutSession.selectedShippingMethod) {
            const shippingResult = await this.validateShippingMethod(context);
            if (isErr(shippingResult)) return Err(unwrapErr(shippingResult));
            validationResults.push(unwrap(shippingResult));
          }
          break;

        case 3: // Payment method
          if (context.checkoutSession.selectedPaymentMethod) {
            const paymentResult = await this.validatePaymentMethod(context);
            if (isErr(paymentResult)) return Err(unwrapErr(paymentResult));
            validationResults.push(unwrap(paymentResult));
          }
          break;

        case 4: // Final review
          return this.validateCheckout(context);

        default:
          return Err(ErrorFactory.validationError(
            `Invalid checkout step: ${step}`
          ));
      }

      const allValid = validationResults.every(result => result.isValid);
      const criticalErrors = validationResults.flatMap(r => r.errors);
      const warnings = validationResults.flatMap(r => r.warnings);

      return Ok({
        isValid: allValid,
        canProceed: allValid,
        validationResults,
        criticalErrors,
        warnings,
        blockers: allValid ? [] : ['Step validation failed'],
        recommendations: []
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Step validation failed',
        error
      ));
    }
  }

  /**
   * Quick validation for specific fields
   */
  async validateField(
    fieldName: string,
    value: unknown,
    context: CheckoutValidationContext
  ): Promise<Result<ValidationResult, WooError>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      switch (fieldName) {
        case 'email':
          if (typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push('Invalid email format');
            }
          } else {
            errors.push('Email must be a string');
          }
          break;

        case 'phone':
          if (typeof value === 'string' && value.length > 0) {
            const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
            if (!phoneRegex.test(value)) {
              errors.push('Invalid phone number format');
            }
          }
          break;

        case 'postcode':
          if (typeof value === 'string' && value.length > 0) {
            const billingCountry = context.checkoutSession.billingAddress?.country;
            if (billingCountry) {
              const countryConfig = this.addressManager.getCountryConfig(billingCountry);
              if (countryConfig?.postcodePattern) {
                const regex = new RegExp(countryConfig.postcodePattern);
                if (!regex.test(value)) {
                  errors.push(`Invalid postal code format for ${countryConfig.name}`);
                }
              }
            }
          }
          break;

        default:
          return Err(ErrorFactory.validationError(
            `Unknown field: ${fieldName}`
          ));
      }

      return Ok({
        component: 'address',
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { fieldName, value }
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Field validation failed',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    validationResults: readonly ValidationResult[],
    recommendations: string[]
  ): void {
    // Address recommendations
    const addressResults = validationResults.filter(r => r.component === 'address');
    if (addressResults.some(r => r.warnings.length > 0)) {
      recommendations.push('Review address information for accuracy');
    }

    // Shipping recommendations
    const shippingResults = validationResults.filter(r => r.component === 'shipping');
    if (shippingResults.length > 0) {
      recommendations.push('Consider different shipping options for better rates');
    }

    // Payment recommendations
    const paymentResults = validationResults.filter(r => r.component === 'payment');
    if (paymentResults.some(r => r.warnings.length > 0)) {
      recommendations.push('Check payment method details');
    }

    // Cart recommendations
    const cartResults = validationResults.filter(r => r.component === 'cart');
    if (cartResults.some(r => r.warnings.length > 0)) {
      recommendations.push('Review cart items and quantities');
    }
  }
}

/**
 * Validation rule builder for dynamic validation configuration
 */
export class ValidationRuleBuilder {
  private rules: Partial<CheckoutValidationRules> = {};

  /**
   * Set minimum order amount
   */
  minimumOrderAmount(amount: number): ValidationRuleBuilder {
    this.rules = { ...this.rules, minimumOrderAmount: amount };
    return this;
  }

  /**
   * Set maximum order amount
   */
  maximumOrderAmount(amount: number): ValidationRuleBuilder {
    this.rules = { ...this.rules, maximumOrderAmount: amount };
    return this;
  }

  /**
   * Require email address
   */
  requireEmail(required: boolean = true): ValidationRuleBuilder {
    this.rules = { ...this.rules, requireEmail: required };
    return this;
  }

  /**
   * Require phone number
   */
  requirePhoneNumber(required: boolean = true): ValidationRuleBuilder {
    this.rules = { ...this.rules, requirePhoneNumber: required };
    return this;
  }

  /**
   * Require company name
   */
  requireCompanyName(required: boolean = true): ValidationRuleBuilder {
    this.rules = { ...this.rules, requireCompanyName: required };
    return this;
  }

  /**
   * Set required fields
   */
  requiredFields(fields: string[]): ValidationRuleBuilder {
    this.rules = { ...this.rules, requiredFields: fields };
    return this;
  }

  /**
   * Set return URL
   */
  returnUrl(url: string): ValidationRuleBuilder {
    this.rules = { ...this.rules, returnUrl: url };
    return this;
  }

  /**
   * Set cancel URL
   */
  cancelUrl(url: string): ValidationRuleBuilder {
    this.rules = { ...this.rules, cancelUrl: url };
    return this;
  }

  /**
   * Build the validation rules
   */
  build(): CheckoutValidationRules {
    const rules: CheckoutValidationRules = {
      requireShippingAddress: this.rules.requireShippingAddress ?? true,
      requireBillingAddress: this.rules.requireBillingAddress ?? true,
      requirePhoneNumber: this.rules.requirePhoneNumber ?? false,
      requireCompanyName: this.rules.requireCompanyName ?? false,
      allowGuestCheckout: this.rules.allowGuestCheckout ?? true,
      restrictedCountries: this.rules.restrictedCountries ?? [],
      requiredFields: this.rules.requiredFields ?? []
    };

    // Handle optional properties for exactOptionalPropertyTypes
    if (this.rules.requireEmail !== undefined) {
      (rules as any).requireEmail = this.rules.requireEmail;
    }
    if (this.rules.minimumOrderAmount !== undefined) {
      (rules as any).minimumOrderAmount = this.rules.minimumOrderAmount;
    }
    if (this.rules.maximumOrderAmount !== undefined) {
      (rules as any).maximumOrderAmount = this.rules.maximumOrderAmount;
    }
    if (this.rules.returnUrl !== undefined) {
      (rules as any).returnUrl = this.rules.returnUrl;
    }
    if (this.rules.cancelUrl !== undefined) {
      (rules as any).cancelUrl = this.rules.cancelUrl;
    }

    return rules;
  }
}

/**
 * Create validation rule builder
 */
export function createValidationRules(): ValidationRuleBuilder {
  return new ValidationRuleBuilder();
} 