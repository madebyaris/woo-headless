/**
 * Checkout System Types for WooCommerce Headless SDK
 * Following the Enhanced Unified 10X Developer Framework
 */

import { z } from 'zod';

/**
 * Base address interface for billing and shipping
 */
export interface BaseAddress {
  readonly firstName: string;
  readonly lastName: string;
  readonly company?: string;
  readonly address1: string;
  readonly address2?: string;
  readonly city: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string;
  readonly email?: string;
  readonly phone?: string;
}

/**
 * Billing address with required email
 */
export interface BillingAddress extends BaseAddress {
  readonly email: string;
}

/**
 * Shipping address (email optional)
 */
export interface ShippingAddress extends BaseAddress {}

/**
 * Address validation result
 */
export interface AddressValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestedAddress?: BaseAddress;
}

/**
 * Country configuration for address validation
 */
export interface CountryConfig {
  readonly code: string;
  readonly name: string;
  readonly postcodePattern?: string;
  readonly stateRequired: boolean;
  readonly postcodeRequired: boolean;
  readonly phonePattern?: string;
}

/**
 * Payment method types
 */
export type PaymentMethodType = 
  | 'credit_card'
  | 'stripe'
  | 'stripe_checkout'
  | 'paypal' 
  | 'apple_pay'
  | 'google_pay'
  | 'bank_transfer'
  | 'cash_on_delivery'
  | 'check';

/**
 * Credit card information
 */
export interface CreditCard {
  readonly number: string;
  readonly expiryMonth: number;
  readonly expiryYear: number;
  readonly cvv: string;
  readonly holderName: string;
}

/**
 * Payment method configuration
 */
export interface PaymentMethod {
  readonly id: string;
  readonly type: PaymentMethodType;
  readonly title: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly testMode: boolean;
  readonly settings: Record<string, unknown>;
  readonly supportedCountries?: readonly string[];
  readonly supportedCurrencies?: readonly string[];
  readonly minimumAmount?: number;
  readonly maximumAmount?: number;
  readonly icon?: string;
  readonly acceptedCards?: readonly string[];
}

/**
 * Shipping method types
 */
export type ShippingMethodType =
  | 'flat_rate'
  | 'free_shipping'
  | 'local_pickup'
  | 'table_rate'
  | 'expedited'
  | 'overnight';

/**
 * Shipping rate calculation
 */
export interface ShippingRate {
  readonly id: string;
  readonly method: ShippingMethodType;
  readonly title: string;
  readonly description: string;
  readonly cost: number;
  readonly taxable: boolean;
  readonly estimatedDelivery?: string;
  readonly trackingAvailable: boolean;
}

/**
 * Shipping zone configuration
 */
export interface ShippingZone {
  readonly id: string;
  readonly name: string;
  readonly countries: readonly string[];
  readonly states: readonly string[];
  readonly postcodes: readonly string[];
  readonly methods: readonly ShippingRate[];
}

/**
 * Shipping method selection
 */
export interface SelectedShippingMethod {
  readonly zoneId: string;
  readonly methodId: string;
  readonly rate: ShippingRate;
}

/**
 * Order status types
 */
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'on_hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'draft';

/**
 * Order totals breakdown
 */
export interface OrderTotals {
  readonly subtotal: number;
  readonly tax: number;
  readonly shipping: number;
  readonly shippingTax: number;
  readonly discount: number;
  readonly fees: number;
  readonly feesTax: number;
  readonly total: number;
  readonly currency: string;
}

/**
 * Order line item
 */
export interface OrderLineItem {
  readonly id: number;
  readonly productId: number;
  readonly variationId?: number;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
  readonly total: number;
  readonly subtotal: number;
  readonly totalTax: number;
  readonly subtotalTax: number;
  readonly sku?: string;
  readonly meta: readonly {
    readonly key: string;
    readonly value: string;
  }[];
}

/**
 * Complete order information
 */
export interface Order {
  readonly id: number;
  readonly number: string;
  readonly status: OrderStatus;
  readonly currency: string;
  readonly dateCreated: Date;
  readonly dateModified: Date;
  readonly total: number;
  readonly subtotal: number;
  readonly totalTax: number;
  readonly shippingTotal: number;
  readonly shippingTax: number;
  readonly discountTotal: number;
  readonly discountTax: number;
  readonly feeTotal: number;
  readonly customerId: number;
  readonly customerNote?: string;
  readonly billingAddress: BillingAddress;
  readonly shippingAddress: ShippingAddress;
  readonly paymentMethod: string;
  readonly paymentMethodTitle: string;
  readonly shippingMethod: string;
  readonly shippingMethodTitle: string;
  readonly lineItems: readonly OrderLineItem[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;
}

/**
 * Checkout step types
 */
export type CheckoutStepType = 
  | 'cart_review'
  | 'shipping_address'
  | 'billing_address'
  | 'shipping_method'
  | 'payment_method'
  | 'order_review'
  | 'payment_processing'
  | 'order_confirmation';

/**
 * Individual checkout step
 */
export interface CheckoutStep {
  readonly type: CheckoutStepType;
  readonly title: string;
  readonly description: string;
  readonly completed: boolean;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly data?: Record<string, unknown>;
}

/**
 * Checkout flow state
 */
export interface CheckoutFlow {
  readonly steps: readonly CheckoutStep[];
  readonly currentStep: CheckoutStepType;
  readonly canProceed: boolean;
  readonly canGoBack: boolean;
  readonly progress: {
    readonly current: number;
    readonly total: number;
    readonly percentage: number;
  };
}

/**
 * Checkout session state
 */
export interface CheckoutSession {
  readonly id: string;
  readonly cartId: string;
  readonly customerId?: number;
  readonly billingAddress?: BillingAddress;
  readonly shippingAddress?: ShippingAddress;
  readonly useShippingAsBilling?: boolean;
  readonly selectedShippingMethod?: SelectedShippingMethod;
  readonly selectedPaymentMethod?: PaymentMethod;
  readonly orderNotes?: string;
  readonly termsAccepted?: boolean;
  readonly newsletterOptIn?: boolean;
  readonly isGuestCheckout?: boolean;
  readonly orderTotals: OrderTotals;
  readonly flow: CheckoutFlow;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Checkout validation rules
 */
export interface CheckoutValidationRules {
  readonly requireShippingAddress: boolean;
  readonly requireBillingAddress: boolean;
  readonly requireEmail?: boolean;
  readonly requirePhoneNumber: boolean;
  readonly requireCompanyName: boolean;
  readonly allowGuestCheckout: boolean;
  readonly minimumOrderAmount?: number;
  readonly maximumOrderAmount?: number;
  readonly restrictedCountries: readonly string[];
  readonly requiredFields: readonly string[];
}

/**
 * Checkout configuration
 */
export interface CheckoutConfig {
  readonly enabled: boolean;
  readonly guestCheckoutEnabled: boolean;
  readonly termsPageId?: number;
  readonly privacyPageId?: number;
  readonly validationRules: CheckoutValidationRules;
  readonly paymentMethods: readonly PaymentMethod[];
  readonly shippingZones: readonly ShippingZone[];
  readonly countries: readonly CountryConfig[];
  readonly defaultCountry: string;
  readonly sessionTtl: number; // in minutes
  readonly autoCalculateTotals: boolean;
}

/**
 * Checkout form data for step updates
 */
export interface CheckoutFormData {
  readonly step: CheckoutStepType;
  readonly data: Record<string, unknown>;
  readonly validate?: boolean;
}

/**
 * Checkout error types
 */
export type CheckoutErrorCode =
  | 'INVALID_ADDRESS'
  | 'UNSUPPORTED_COUNTRY'
  | 'INVALID_POSTCODE'
  | 'SHIPPING_NOT_AVAILABLE'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'MINIMUM_ORDER_NOT_MET'
  | 'MAXIMUM_ORDER_EXCEEDED'
  | 'CHECKOUT_SESSION_EXPIRED'
  | 'PAYMENT_PROCESSING_FAILED'
  | 'ORDER_CREATION_FAILED'
  | 'INVALID_CHECKOUT_DATA'
  | 'TERMS_NOT_ACCEPTED';

/**
 * Checkout specific error
 */
export interface CheckoutError {
  readonly code: CheckoutErrorCode;
  readonly message: string;
  readonly field?: string;
  readonly step?: CheckoutStepType;
  readonly details?: Record<string, unknown>;
}

/**
 * Zod validation schemas
 */
export const BaseAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(100).optional(),
  address1: z.string().min(1, 'Address is required').max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postcode: z.string().min(1, 'Postcode is required').max(20),
  country: z.string().length(2, 'Country must be 2-letter code'),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional()
});

export const BillingAddressSchema = BaseAddressSchema.extend({
  email: z.string().email('Valid email is required')
});

export const ShippingAddressSchema = BaseAddressSchema;

export const CreditCardSchema = z.object({
  number: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(new Date().getFullYear()),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  holderName: z.string().min(1, 'Cardholder name is required').max(100)
});

export const OrderTotalsSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  shipping: z.number().min(0),
  shippingTax: z.number().min(0),
  discount: z.number().min(0),
  fees: z.number().min(0),
  feesTax: z.number().min(0),
  total: z.number().min(0),
  currency: z.string().length(3)
});

export const CheckoutFormDataSchema = z.object({
  step: z.enum(['cart_review', 'shipping_address', 'billing_address', 'shipping_method', 'payment_method', 'order_review', 'payment_processing', 'order_confirmation']),
  data: z.record(z.unknown()),
  validate: z.boolean().optional()
});

/**
 * Type guards
 */
export function isBillingAddress(address: BaseAddress): address is BillingAddress {
  return 'email' in address && typeof address.email === 'string' && address.email.length > 0;
}

export function isValidCheckoutStep(step: string): step is CheckoutStepType {
  return ['cart_review', 'shipping_address', 'billing_address', 'shipping_method', 'payment_method', 'order_review', 'payment_processing', 'order_confirmation'].includes(step);
}

export function isValidPaymentMethod(method: string): method is PaymentMethodType {
  return ['credit_card', 'stripe', 'stripe_checkout', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer', 'cash_on_delivery', 'check'].includes(method);
}

/**
 * Validation functions
 */
export function validateBaseAddress(address: unknown): BaseAddress {
  const parsed = BaseAddressSchema.parse(address);
  // Handle exactOptionalPropertyTypes by removing undefined values
  const result: BaseAddress = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    ...(parsed.company !== undefined && { company: parsed.company }),
    ...(parsed.address2 !== undefined && { address2: parsed.address2 }),
    ...(parsed.email !== undefined && { email: parsed.email }),
    ...(parsed.phone !== undefined && { phone: parsed.phone })
  };
  return result;
}

export function validateBillingAddress(address: unknown): BillingAddress {
  const parsed = BillingAddressSchema.parse(address);
  // Handle exactOptionalPropertyTypes by removing undefined values
  const result: BillingAddress = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    email: parsed.email,
    ...(parsed.company !== undefined && { company: parsed.company }),
    ...(parsed.address2 !== undefined && { address2: parsed.address2 }),
    ...(parsed.phone !== undefined && { phone: parsed.phone })
  };
  return result;
}

export function validateShippingAddress(address: unknown): ShippingAddress {
  const parsed = ShippingAddressSchema.parse(address);
  // Handle exactOptionalPropertyTypes by removing undefined values
  const result: ShippingAddress = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    address1: parsed.address1,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: parsed.country,
    ...(parsed.company !== undefined && { company: parsed.company }),
    ...(parsed.address2 !== undefined && { address2: parsed.address2 }),
    ...(parsed.email !== undefined && { email: parsed.email }),
    ...(parsed.phone !== undefined && { phone: parsed.phone })
  };
  return result;
}

export function validateCreditCard(card: unknown): CreditCard {
  return CreditCardSchema.parse(card);
}

export function validateOrderTotals(totals: unknown): OrderTotals {
  return OrderTotalsSchema.parse(totals);
}

export function validateCheckoutFormData(data: unknown): CheckoutFormData {
  const parsed = CheckoutFormDataSchema.parse(data);
  // Handle exactOptionalPropertyTypes by removing undefined values
  const result: CheckoutFormData = {
    step: parsed.step,
    data: parsed.data,
    ...(parsed.validate !== undefined && { validate: parsed.validate })
  };
  return result;
}

/**
 * Helper functions
 */
export function createEmptyCheckoutFlow(): CheckoutFlow {
  const steps: CheckoutStep[] = [
    {
      type: 'cart_review',
      title: 'Review Cart',
      description: 'Review items in your cart',
      completed: false,
      valid: false,
      errors: []
    },
    {
      type: 'shipping_address',
      title: 'Shipping Address',
      description: 'Enter your shipping address',
      completed: false,
      valid: false,
      errors: []
    },
    {
      type: 'billing_address',
      title: 'Billing Address',
      description: 'Enter your billing address',
      completed: false,
      valid: false,
      errors: []
    },
    {
      type: 'shipping_method',
      title: 'Shipping Method',
      description: 'Choose your shipping method',
      completed: false,
      valid: false,
      errors: []
    },
    {
      type: 'payment_method',
      title: 'Payment Method',
      description: 'Choose your payment method',
      completed: false,
      valid: false,
      errors: []
    },
    {
      type: 'order_review',
      title: 'Review Order',
      description: 'Review your order before payment',
      completed: false,
      valid: false,
      errors: []
    }
  ];

  return {
    steps,
    currentStep: 'cart_review',
    canProceed: false,
    canGoBack: false,
    progress: {
      current: 1,
      total: steps.length,
      percentage: Math.round((1 / steps.length) * 100)
    }
  };
}

/**
 * Default configurations
 */
export const DEFAULT_CHECKOUT_CONFIG: Partial<CheckoutConfig> = {
  enabled: true,
  guestCheckoutEnabled: true,
  sessionTtl: 60, // 1 hour
  autoCalculateTotals: true,
  defaultCountry: 'US',
  validationRules: {
    requireShippingAddress: true,
    requireBillingAddress: true,
    requirePhoneNumber: false,
    requireCompanyName: false,
    allowGuestCheckout: true,
    restrictedCountries: [],
    requiredFields: ['firstName', 'lastName', 'address1', 'city', 'state', 'postcode', 'country', 'email']
  }
};

/**
 * Payment transaction details
 */
export interface PaymentTransaction {
  readonly id: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'pending' | 'completed' | 'failed' | 'cancelled';
  readonly method: PaymentMethodType;
  readonly transactionId?: string;
  readonly gatewayResponse?: Record<string, unknown>;
  readonly processedAt?: Date;
  readonly failureReason?: string;
}
