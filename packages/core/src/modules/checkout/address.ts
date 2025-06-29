/**
 * Address Management Service for WooCommerce Headless SDK
 * Following the Enhanced Unified 10X Developer Framework
 */

import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  BaseAddress, 
  BillingAddress, 
  ShippingAddress,
  AddressValidation,
  CountryConfig,
  CheckoutErrorCode,
  CheckoutError,
  CheckoutValidationRules,
  validateBaseAddress,
  validateBillingAddress,
  validateShippingAddress
} from '../../types/checkout';

/**
 * Dynamic field requirements configuration
 */
export interface AddressFieldRequirements {
  readonly firstName: boolean;
  readonly lastName: boolean;
  readonly company: boolean;
  readonly address1: boolean;
  readonly address2: boolean;
  readonly city: boolean;
  readonly state: boolean;
  readonly postcode: boolean;
  readonly country: boolean;
  readonly email: boolean;
  readonly phone: boolean;
}

/**
 * Address validation context
 */
export interface AddressValidationContext {
  readonly fieldRequirements?: Partial<AddressFieldRequirements>;
  readonly checkoutRules?: CheckoutValidationRules;
  readonly isGuestCheckout?: boolean;
  readonly addressType: 'billing' | 'shipping';
}

/**
 * Country-specific postal code patterns and validation rules
 */
const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  'US': {
    code: 'US',
    name: 'United States',
    postcodePattern: '^\\d{5}(-\\d{4})?$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$'
  },
  'CA': {
    code: 'CA',
    name: 'Canada',
    postcodePattern: '^[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$'
  },
  'GB': {
    code: 'GB',
    name: 'United Kingdom',
    postcodePattern: '^[A-Za-z]{1,2}\\d[A-Za-z\\d]?\\s?\\d[A-Za-z]{2}$',
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: '^\\+?44[-.\\s]?\\d{4}[-.\\s]?\\d{6}$'
  },
  'DE': {
    code: 'DE',
    name: 'Germany',
    postcodePattern: '^\\d{5}$',
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: '^\\+?49[-.\\s]?\\d{3,4}[-.\\s]?\\d{7,8}$'
  },
  'FR': {
    code: 'FR',
    name: 'France',
    postcodePattern: '^\\d{5}$',
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: '^\\+?33[-.\\s]?\\d{1}[-.\\s]?\\d{2}[-.\\s]?\\d{2}[-.\\s]?\\d{2}[-.\\s]?\\d{2}$'
  },
  'AU': {
    code: 'AU',
    name: 'Australia',
    postcodePattern: '^\\d{4}$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?61[-.\\s]?\\d{1}[-.\\s]?\\d{4}[-.\\s]?\\d{4}$'
  },
  'JP': {
    code: 'JP',
    name: 'Japan',
    postcodePattern: '^\\d{3}-\\d{4}$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?81[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{4}$'
  },
  'BR': {
    code: 'BR',
    name: 'Brazil',
    postcodePattern: '^\\d{5}-?\\d{3}$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?55[-.\\s]?\\d{2}[-.\\s]?\\d{4,5}[-.\\s]?\\d{4}$'
  },
  'IN': {
    code: 'IN',
    name: 'India',
    postcodePattern: '^\\d{6}$',
    stateRequired: true,
    postcodeRequired: true,
    phonePattern: '^\\+?91[-.\\s]?\\d{5}[-.\\s]?\\d{5}$'
  },
  'NL': {
    code: 'NL',
    name: 'Netherlands',
    postcodePattern: '^\\d{4}\\s?[A-Za-z]{2}$',
    stateRequired: false,
    postcodeRequired: true,
    phonePattern: '^\\+?31[-.\\s]?\\d{1,3}[-.\\s]?\\d{7}$'
  }
};

/**
 * Address management service with dynamic field requirements
 */
export class AddressManager {
  private readonly countryConfigs: Record<string, CountryConfig>;

  constructor(customCountryConfigs?: Record<string, CountryConfig>) {
    this.countryConfigs = {
      ...COUNTRY_CONFIGS,
      ...customCountryConfigs
    };
  }

  /**
   * Validate address with dynamic field requirements
   */
  async validateAddressWithContext(
    address: BaseAddress, 
    context: AddressValidationContext
  ): Promise<Result<AddressValidation, WooError>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get country configuration
      const countryConfig = this.countryConfigs[address.country.toUpperCase()];
      if (!countryConfig) {
        errors.push(`Country "${address.country}" is not supported`);
        return Ok({
          isValid: false,
          errors,
          warnings
        });
      }

      // Build dynamic field requirements
      const fieldRequirements = this.buildFieldRequirements(context, countryConfig);

      // Validate fields based on dynamic requirements
      this.validateRequiredFields(address, fieldRequirements, errors);

      // Validate field formats
      this.validateFieldFormats(address, countryConfig, errors, warnings);

      return Ok({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Address validation failed',
        error
      ));
    }
  }

  /**
   * Get field requirements for address type and context
   */
  getFieldRequirements(context: AddressValidationContext): AddressFieldRequirements {
    const countryCode = context.checkoutRules?.requiredFields?.[0] || 'US';
    const countryConfig = this.countryConfigs[countryCode] || this.countryConfigs['US'];
    return this.buildFieldRequirements(context, countryConfig);
  }

  /**
   * Check if specific field is required
   */
  isFieldRequired(
    fieldName: keyof AddressFieldRequirements, 
    context: AddressValidationContext
  ): boolean {
    const requirements = this.getFieldRequirements(context);
    return requirements[fieldName];
  }

  /**
   * Validate a base address with country-specific rules
   */
  async validateAddress(address: BaseAddress): Promise<Result<AddressValidation, WooError>> {
    // Use default context for backward compatibility
    const context: AddressValidationContext = {
      addressType: 'shipping',
      isGuestCheckout: false
    };
    return this.validateAddressWithContext(address, context);
  }

  /**
   * Validate a billing address (requires email)
   */
  async validateBillingAddress(address: BillingAddress): Promise<Result<AddressValidation, WooError>> {
    const context: AddressValidationContext = {
      addressType: 'billing',
      isGuestCheckout: false,
      fieldRequirements: { email: true }
    };
    return this.validateAddressWithContext(address, context);
  }

  /**
   * Validate a shipping address
   */
  async validateShippingAddress(address: ShippingAddress): Promise<Result<AddressValidation, WooError>> {
    const context: AddressValidationContext = {
      addressType: 'shipping',
      isGuestCheckout: false
    };
    return this.validateAddressWithContext(address, context);
  }

  /**
   * Check if addresses are the same (for "same as billing" functionality)
   */
  addressesEqual(address1: BaseAddress, address2: BaseAddress): boolean {
    return (
      address1.firstName === address2.firstName &&
      address1.lastName === address2.lastName &&
      address1.company === address2.company &&
      address1.address1 === address2.address1 &&
      address1.address2 === address2.address2 &&
      address1.city === address2.city &&
      address1.state === address2.state &&
      address1.postcode === address2.postcode &&
      address1.country === address2.country &&
      address1.phone === address2.phone
    );
  }

  /**
   * Suggest address corrections (basic implementation)
   */
  async suggestAddressCorrection(address: BaseAddress): Promise<Result<BaseAddress | null, WooError>> {
    try {
      const countryConfig = this.countryConfigs[address.country.toUpperCase()];
      if (!countryConfig) {
        return Ok(null);
      }

      // Create a suggested address with basic corrections
      const suggestedAddress: BaseAddress = {
        ...address,
        // Capitalize names
        firstName: this.capitalizeWords(address.firstName),
        lastName: this.capitalizeWords(address.lastName),
        // Capitalize city
        city: this.capitalizeWords(address.city),
        // Uppercase country code
        country: address.country.toUpperCase(),
        // Format postal code
        postcode: this.formatPostcode(address.postcode, countryConfig)
      };

      // Only return suggestion if something changed
      if (JSON.stringify(address) !== JSON.stringify(suggestedAddress)) {
        return Ok(suggestedAddress);
      }

      return Ok(null);

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Address suggestion failed',
        error
      ));
    }
  }

  /**
   * Get country configuration
   */
  getCountryConfig(countryCode: string): CountryConfig | null {
    return this.countryConfigs[countryCode.toUpperCase()] || null;
  }

  /**
   * Get all supported countries
   */
  getSupportedCountries(): CountryConfig[] {
    return Object.values(this.countryConfigs);
  }

  /**
   * Add or update country configuration
   */
  setCountryConfig(countryCode: string, config: CountryConfig): void {
    this.countryConfigs[countryCode.toUpperCase()] = config;
  }

  /**
   * Parse and validate address from raw data
   */
  async parseAddress(rawData: unknown, type: 'base' | 'billing' | 'shipping' = 'base'): Promise<Result<BaseAddress | BillingAddress | ShippingAddress, WooError>> {
    try {
      switch (type) {
        case 'billing':
          const billingAddress = validateBillingAddress(rawData);
          const billingValidation = await this.validateBillingAddress(billingAddress);
          if (isErr(billingValidation)) {
            return Err(unwrapErr(billingValidation));
          }
          if (!unwrap(billingValidation).isValid) {
            return Err(this.createValidationError([...unwrap(billingValidation).errors]));
          }
          return Ok(billingAddress);

        case 'shipping':
          const shippingAddress = validateShippingAddress(rawData);
          const shippingValidation = await this.validateShippingAddress(shippingAddress);
          if (isErr(shippingValidation)) {
            return Err(unwrapErr(shippingValidation));
          }
          if (!unwrap(shippingValidation).isValid) {
            return Err(this.createValidationError([...unwrap(shippingValidation).errors]));
          }
          return Ok(shippingAddress);

        default:
          const baseAddress = validateBaseAddress(rawData);
          const baseValidation = await this.validateAddress(baseAddress);
          if (isErr(baseValidation)) {
            return Err(unwrapErr(baseValidation));
          }
          if (!unwrap(baseValidation).isValid) {
            return Err(this.createValidationError([...unwrap(baseValidation).errors]));
          }
          return Ok(baseAddress);
      }

    } catch (error) {
      return Err(ErrorFactory.validationError(
        `Failed to parse ${type} address`,
        error
      ));
    }
  }

  /**
   * Convert shipping address to billing address (adds required email)
   */
  convertToBillingAddress(shippingAddress: ShippingAddress, email: string): BillingAddress {
    return {
      ...shippingAddress,
      email
    };
  }

  /**
   * Convert billing address to shipping address (removes email)
   */
  convertToShippingAddress(billingAddress: BillingAddress): ShippingAddress {
    const { email, ...shippingAddress } = billingAddress;
    return shippingAddress;
  }

  // Private helper methods

  /**
   * Build field requirements based on context
   */
  private buildFieldRequirements(
    context: AddressValidationContext, 
    countryConfig: CountryConfig
  ): AddressFieldRequirements {
    // Start with base requirements
    const baseRequirements: AddressFieldRequirements = {
      firstName: true,
      lastName: true,
      company: false,
      address1: true,
      address2: false,
      city: true,
      state: countryConfig.stateRequired,
      postcode: countryConfig.postcodeRequired,
      country: true,
      email: context.addressType === 'billing',
      phone: false
    };

    // Apply context-specific overrides and checkout rules
    const overrides: Partial<AddressFieldRequirements> = {};
    
    if (context.fieldRequirements) {
      Object.assign(overrides, context.fieldRequirements);
    }

    if (context.checkoutRules) {
      if (context.checkoutRules.requireCompanyName) {
        overrides.company = true;
      }
      if (context.checkoutRules.requirePhoneNumber) {
        overrides.phone = true;
      }
    }

    // Create final requirements with overrides
    const finalRequirements: AddressFieldRequirements = {
      ...baseRequirements,
      ...overrides
    };

    return finalRequirements;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    address: BaseAddress, 
    requirements: AddressFieldRequirements, 
    errors: string[]
  ): void {
    if (requirements.firstName && (!address.firstName || !address.firstName.trim())) {
      errors.push('First name is required');
    }

    if (requirements.lastName && (!address.lastName || !address.lastName.trim())) {
      errors.push('Last name is required');
    }

    if (requirements.company && (!address.company || !address.company.trim())) {
      errors.push('Company name is required');
    }

    if (requirements.address1 && (!address.address1 || !address.address1.trim())) {
      errors.push('Street address is required');
    }

    if (requirements.address2 && (!address.address2 || !address.address2.trim())) {
      errors.push('Address line 2 is required');
    }

    if (requirements.city && (!address.city || !address.city.trim())) {
      errors.push('City is required');
    }

    if (requirements.state && (!address.state || !address.state.trim())) {
      errors.push('State/Province is required');
    }

    if (requirements.postcode && (!address.postcode || !address.postcode.trim())) {
      errors.push('Postal/ZIP code is required');
    }

    if (requirements.country && (!address.country || !address.country.trim())) {
      errors.push('Country is required');
    }

    if (requirements.email && (!address.email || !address.email.trim())) {
      errors.push('Email address is required');
    }

    if (requirements.phone && (!address.phone || !address.phone.trim())) {
      errors.push('Phone number is required');
    }
  }

  /**
   * Validate field formats
   */
  private validateFieldFormats(
    address: BaseAddress, 
    countryConfig: CountryConfig, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Validate postal code format
    if (address.postcode && countryConfig.postcodePattern) {
      const postcodeRegex = new RegExp(countryConfig.postcodePattern);
      if (!postcodeRegex.test(address.postcode)) {
        errors.push(`Invalid postal/ZIP code format for ${countryConfig.name}`);
      }
    }

    // Validate phone number format if provided
    if (address.phone && countryConfig.phonePattern) {
      const phoneRegex = new RegExp(countryConfig.phonePattern);
      if (!phoneRegex.test(address.phone)) {
        warnings.push(`Phone number format may be invalid for ${countryConfig.name}`);
      }
    }

    // Basic field length validation
    if (address.firstName && address.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (address.lastName && address.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    if (address.address1 && address.address1.length < 5) {
      errors.push('Street address must be at least 5 characters');
    }

    if (address.city && address.city.length < 2) {
      errors.push('City must be at least 2 characters');
    }

    // Email validation
    if (address.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(address.email)) {
        errors.push('Invalid email address format');
      }
    }
  }

  /**
   * Capitalize words in a string
   */
  private capitalizeWords(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Format postal code according to country pattern
   */
  private formatPostcode(postcode: string, countryConfig: CountryConfig): string {
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    
    switch (countryConfig.code) {
      case 'CA':
        // Format Canadian postal codes: A1A 1A1
        if (cleaned.length === 6) {
          return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        }
        return postcode;
      
      case 'GB':
        // Format UK postal codes with space
        if (cleaned.length >= 5) {
          return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
        }
        return postcode;
      
      case 'NL':
        // Format Dutch postal codes: 1234 AB
        if (cleaned.length === 6) {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
        }
        return postcode;
      
      default:
        return postcode;
    }
  }

  /**
   * Create validation error from error messages
   */
  private createValidationError(errors: string[]): WooError {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Address validation failed',
      details: { errors },
      timestamp: new Date()
    };
  }
}

/**
 * Default address manager instance
 */
export const defaultAddressManager = new AddressManager(); 