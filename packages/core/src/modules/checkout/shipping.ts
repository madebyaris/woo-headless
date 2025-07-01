/**
 * Shipping Service for WooCommerce Headless SDK
 * Backend-calculated shipping rates with frontend display and selection
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err, isErr, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  ShippingRate,
  ShippingZone,
  ShippingMethodType,
  SelectedShippingMethod,
  BaseAddress,
  OrderTotals
} from '../../types/checkout';

/**
 * Shipping rate request parameters
 */
export interface ShippingRateRequest {
  readonly destination: BaseAddress;
  readonly cartItems: readonly {
    readonly productId: number;
    readonly variationId?: number;
    readonly quantity: number;
    readonly weight?: number;
    readonly dimensions?: {
      readonly length: number;
      readonly width: number;
      readonly height: number;
    };
  }[];
  readonly cartTotal: number;
  readonly currency: string;
}

/**
 * Shipping rate response from backend
 */
export interface ShippingRateResponse {
  readonly rates: readonly ShippingRate[];
  readonly zones: readonly ShippingZone[];
  readonly defaultRate?: ShippingRate;
  readonly freeShippingThreshold?: number;
  readonly estimatedDelivery?: {
    readonly minDays: number;
    readonly maxDays: number;
  };
}

/**
 * Shipping calculation for order totals
 */
export interface ShippingCalculation {
  readonly selectedMethod: SelectedShippingMethod;
  readonly shippingCost: number;
  readonly shippingTax: number;
  readonly estimatedDelivery?: string;
  readonly trackingAvailable: boolean;
}

/**
 * Shipping service configuration
 */
export interface ShippingConfig {
  readonly enabled: boolean;
  readonly calculateTax: boolean;
  readonly freeShippingThreshold?: number;
  readonly defaultCountry: string;
  readonly restrictedCountries: readonly string[];
  readonly cacheTimeout: number; // in minutes
}

/**
 * Shipping service for fetching rates and managing selections
 */
export class ShippingService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: ShippingConfig;

  constructor(
    client: HttpClient, 
    cache: CacheManager,
    config: ShippingConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Fetch available shipping rates from backend
   */
  async getShippingRates(request: ShippingRateRequest): Promise<Result<ShippingRateResponse, WooError>> {
    try {
      // Check if shipping is available for destination
      if (!this.isShippingAvailable(request.destination.country)) {
        return Err(ErrorFactory.validationError(
          'Shipping not available to this destination',
          { country: request.destination.country }
        ));
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache first
      const cachedRates = await this.cache.get<ShippingRateResponse>(cacheKey);
      if (cachedRates.success && cachedRates.data) {
        return Ok(cachedRates.data);
      }

      // Fetch from backend
      const response = await this.client.post('/wp-json/wc/v3/shipping/rates', {
        destination: {
          country: request.destination.country,
          state: request.destination.state,
          postcode: request.destination.postcode,
          city: request.destination.city
        },
        items: request.cartItems,
        cart_total: request.cartTotal,
        currency: request.currency
      });

      if (isErr(response)) {
        return Err(ErrorFactory.apiError(
          'Failed to fetch shipping rates',
          500,
          unwrapErr(response)
        ));
      }

      const responseData = unwrap(response).data as any;
      const shippingResponse: ShippingRateResponse = {
        rates: responseData.rates || [],
        zones: responseData.zones || [],
        defaultRate: responseData.default_rate,
        freeShippingThreshold: responseData.free_shipping_threshold,
        estimatedDelivery: responseData.estimated_delivery
      };

      // Cache the response
      await this.cache.set(cacheKey, shippingResponse, this.config.cacheTimeout * 60);

      return Ok(shippingResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Shipping rate calculation failed',
        500,
        error
      ));
    }
  }

  /**
   * Get shipping zones for a specific country
   */
  async getShippingZones(country: string): Promise<Result<ShippingZone[], WooError>> {
    try {
      const cacheKey = `shipping-zones:${country}`;
      
      // Check cache first
      const cachedZones = await this.cache.get<ShippingZone[]>(cacheKey);
      if (cachedZones.success && cachedZones.data) {
        return Ok(cachedZones.data);
      }

      // Fetch from backend
      const response = await this.client.get(`/wp-json/wc/v3/shipping/zones`, {
        country: country.toUpperCase()
      });

      if (isErr(response)) {
        return Err(unwrap(response));
      }

      const zones = unwrap(response).data || [];
      
      // Cache the response
      await this.cache.set(cacheKey, zones, this.config.cacheTimeout * 60);

      return Ok(zones);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to fetch shipping zones',
        500,
        error
      ));
    }
  }

  /**
   * Calculate shipping for selected method (backend handles calculation)
   */
  async calculateShipping(
    selectedMethod: SelectedShippingMethod,
    destination: BaseAddress,
    cartTotal: number
  ): Promise<Result<ShippingCalculation, WooError>> {
    try {
      // Backend calculates the actual cost and tax
      const response = await this.client.post('/wp-json/wc/v3/shipping/calculate', {
        method_id: selectedMethod.methodId,
        zone_id: selectedMethod.zoneId,
        destination: {
          country: destination.country,
          state: destination.state,
          postcode: destination.postcode,
          city: destination.city
        },
        cart_total: cartTotal
      });

      if (isErr(response)) {
        return Err(unwrap(response));
      }

      const data = unwrap(response);
      
      const calculation: ShippingCalculation = {
        selectedMethod,
        shippingCost: data.cost || 0,
        shippingTax: data.tax || 0,
        estimatedDelivery: data.estimated_delivery,
        trackingAvailable: data.tracking_available || false
      };

      return Ok(calculation);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Shipping calculation failed',
        500,
        error
      ));
    }
  }

  /**
   * Check if free shipping is available
   */
  checkFreeShipping(cartTotal: number, freeShippingThreshold?: number): boolean {
    if (!freeShippingThreshold) return false;
    return cartTotal >= freeShippingThreshold;
  }

  /**
   * Get cheapest shipping option
   */
  getCheapestRate(rates: readonly ShippingRate[]): ShippingRate | null {
    if (rates.length === 0) return null;
    
    return rates.reduce((cheapest, current) => 
      current.cost < cheapest.cost ? current : cheapest
    );
  }

  /**
   * Get fastest shipping option
   */
  getFastestRate(rates: readonly ShippingRate[]): ShippingRate | null {
    if (rates.length === 0) return null;
    
    // Prioritize by shipping method type (expedited, overnight first)
    const priorityOrder: ShippingMethodType[] = [
      'overnight',
      'expedited', 
      'flat_rate',
      'table_rate',
      'local_pickup',
      'free_shipping'
    ];

    for (const methodType of priorityOrder) {
      const rate = rates.find(r => r.method === methodType);
      if (rate) return rate;
    }

    return rates[0];
  }

  /**
   * Filter rates by shipping method type
   */
  filterRatesByMethod(rates: readonly ShippingRate[], method: ShippingMethodType): ShippingRate[] {
    return rates.filter(rate => rate.method === method);
  }

  /**
   * Group rates by zone
   */
  groupRatesByZone(rates: readonly ShippingRate[], zones: readonly ShippingZone[]): Record<string, ShippingRate[]> {
    const grouped: Record<string, ShippingRate[]> = {};
    
    zones.forEach(zone => {
      grouped[zone.id] = zone.methods.filter(method => 
        rates.some(rate => rate.id === method.id)
      );
    });

    return grouped;
  }

  /**
   * Validate shipping selection
   */
  validateShippingSelection(
    selectedMethod: SelectedShippingMethod,
    availableRates: readonly ShippingRate[]
  ): boolean {
    return availableRates.some(rate => 
      rate.id === selectedMethod.methodId
    );
  }

  /**
   * Update order totals with shipping calculation
   */
  updateOrderTotalsWithShipping(
    currentTotals: OrderTotals,
    shippingCalculation: ShippingCalculation
  ): OrderTotals {
    return {
      ...currentTotals,
      shipping: shippingCalculation.shippingCost,
      shippingTax: shippingCalculation.shippingTax,
      total: currentTotals.subtotal + 
             currentTotals.tax + 
             shippingCalculation.shippingCost + 
             shippingCalculation.shippingTax + 
             currentTotals.fees + 
             currentTotals.feesTax - 
             currentTotals.discount
    };
  }

  /**
   * Estimate delivery date
   */
  estimateDeliveryDate(rate: ShippingRate, orderDate: Date = new Date()): Date | null {
    if (!rate.estimatedDelivery) return null;

    // Parse estimated delivery string (e.g., "3-5 business days")
    const deliveryMatch = rate.estimatedDelivery.match(/(\d+)-?(\d+)?\s*(business\s+)?days?/i);
    if (!deliveryMatch) return null;

    const minDays = parseInt(deliveryMatch[1]);
    const maxDays = deliveryMatch[2] ? parseInt(deliveryMatch[2]) : minDays;
    const isBusinessDays = !!deliveryMatch[3];

    let deliveryDate = new Date(orderDate);
    let daysToAdd = maxDays; // Use maximum estimated days

    if (isBusinessDays) {
      // Add business days (skip weekends)
      let addedDays = 0;
      while (addedDays < daysToAdd) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
          addedDays++;
        }
      }
    } else {
      // Add calendar days
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
    }

    return deliveryDate;
  }

  /**
   * Clear shipping rate cache
   */
  async clearShippingCache(): Promise<Result<void, WooError>> {
    try {
      await this.cache.invalidatePattern('shipping-');
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to clear shipping cache',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Check if shipping is available to country
   */
  private isShippingAvailable(country: string): boolean {
    if (!this.config.enabled) return false;
    if (this.config.restrictedCountries.includes(country.toUpperCase())) return false;
    return true;
  }

  /**
   * Generate cache key for shipping request
   */
  private generateCacheKey(request: ShippingRateRequest): string {
    const keyData = {
      country: request.destination.country,
      state: request.destination.state,
      postcode: request.destination.postcode,
      itemCount: request.cartItems.length,
      total: request.cartTotal,
      currency: request.currency
    };
    
    return `shipping-rates:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }
}

/**
 * Default shipping configuration
 */
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  enabled: true,
  calculateTax: true,
  defaultCountry: 'US',
  restrictedCountries: [],
  cacheTimeout: 15 // 15 minutes
}; 