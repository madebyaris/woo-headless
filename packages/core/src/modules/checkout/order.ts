/**
 * Order Processing System for WooCommerce Headless SDK
 * Handles order creation, confirmation, status tracking, and inventory management
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err, isErr, isOk, unwrap, unwrapErr } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  Order,
  OrderStatus,
  OrderLineItem,
  OrderTotals,
  CheckoutSession,
  BillingAddress,
  ShippingAddress
} from '../../types/checkout';
import { Cart, CartItem } from '../../types/cart';

/**
 * Order creation request
 */
export interface OrderCreateRequest {
  readonly cart: Cart;
  readonly checkoutSession: CheckoutSession;
  readonly customerNotes?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Order creation response
 */
export interface OrderCreateResponse {
  readonly order: Order;
  readonly requiresPayment: boolean;
  readonly paymentUrl?: string;
  readonly confirmationUrl: string;
}

/**
 * Order confirmation request
 */
export interface OrderConfirmationRequest {
  readonly orderId: string;
  readonly paymentId?: string;
  readonly transactionId?: string;
  readonly paymentStatus?: 'completed' | 'failed' | 'pending';
}

/**
 * Order status update request
 */
export interface OrderStatusUpdateRequest {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly note?: string;
  readonly notifyCustomer?: boolean;
}

/**
 * Inventory update request
 */
export interface InventoryUpdateRequest {
  readonly orderId: string;
  readonly items: readonly {
    readonly productId: number;
    readonly variationId?: number;
    readonly quantity: number;
    readonly operation: 'decrease' | 'increase' | 'reserve';
  }[];
}

/**
 * Order search criteria
 */
export interface OrderSearchCriteria {
  readonly status?: OrderStatus;
  readonly customerId?: string;
  readonly customerEmail?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly paymentMethod?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Order processing configuration
 */
export interface OrderProcessingConfig {
  readonly autoUpdateInventory: boolean;
  readonly sendConfirmationEmail: boolean;
  readonly requirePaymentConfirmation: boolean;
  readonly orderNumberPrefix: string;
  readonly orderNumberSuffix?: string;
  readonly defaultStatus: OrderStatus;
  readonly inventoryHoldMinutes: number;
  readonly cacheTimeout: number;
}

/**
 * Order processing service for backend integration
 */
export class OrderProcessingService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: OrderProcessingConfig;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: OrderProcessingConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Create new order from checkout session
   */
  async createOrder(request: OrderCreateRequest): Promise<Result<OrderCreateResponse, WooError>> {
    try {
      // Validate cart and checkout session
      const validationResult = await this.validateOrderCreation(request);
      if (isErr(validationResult)) {
        return Err(unwrapErr(validationResult));
      }

      // Reserve inventory if configured
      if (this.config.autoUpdateInventory) {
        const inventoryResult = await this.reserveInventory(request.cart);
        if (isErr(inventoryResult)) {
          return Err(unwrapErr(inventoryResult));
        }
      }

      // Create order with backend
      const orderData = this.buildOrderData(request);
      const response = await this.client.post('/wp-json/wc/v3/orders', orderData);

      if (isErr(response)) {
        // Release reserved inventory on failure
        if (this.config.autoUpdateInventory) {
          await this.releaseInventory(request.cart);
        }
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const order = this.mapOrderResponse(data);

      // Update inventory
      if (this.config.autoUpdateInventory) {
        await this.updateInventory({
          orderId: order.id,
          items: request.cart.items.map(item => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            operation: 'decrease'
          }))
        });
      }

      // Cache the order
      await this.cache.set(`order:${order.id}`, order, this.config.cacheTimeout * 60);

      const orderResponse: OrderCreateResponse = {
        order,
        requiresPayment: order.total > 0 && order.status === 'pending',
        paymentUrl: data.payment_url,
        confirmationUrl: `/order-confirmation/${order.id}`
      };

      return Ok(orderResponse);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Order creation failed',
        500,
        error
      ));
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Result<Order, WooError>> {
    try {
      // Check cache first
      const cached = await this.cache.get<Order>(`order:${orderId}`);
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }

      // Fetch from backend
      const response = await this.client.get(`/wp-json/wc/v3/orders/${orderId}`);

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const order = this.mapOrderResponse(data);

      // Cache the order
      await this.cache.set(`order:${orderId}`, order, this.config.cacheTimeout * 60);

      return Ok(order);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to fetch order',
        500,
        error
      ));
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(request: OrderStatusUpdateRequest): Promise<Result<Order, WooError>> {
    try {
      const response = await this.client.put(`/wp-json/wc/v3/orders/${request.orderId}`, {
        status: request.status,
        customer_note: request.note,
        notify_customer: request.notifyCustomer || false
      });

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const order = this.mapOrderResponse(data);

      // Update cache
      await this.cache.set(`order:${order.id}`, order, this.config.cacheTimeout * 60);

      return Ok(order);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to update order status',
        500,
        error
      ));
    }
  }

  /**
   * Confirm order completion
   */
  async confirmOrder(request: OrderConfirmationRequest): Promise<Result<Order, WooError>> {
    try {
      // Get current order
      const orderResult = await this.getOrder(request.orderId);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }

      const order = unwrap(orderResult);

      // Update order with confirmation details
      const updateData: any = {
        status: 'processing',
        transaction_id: request.transactionId,
        date_paid: new Date().toISOString()
      };

      if (request.paymentStatus) {
        updateData.payment_status = request.paymentStatus;
      }

      const response = await this.client.put(`/wp-json/wc/v3/orders/${request.orderId}`, updateData);

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const confirmedOrder = this.mapOrderResponse(data);

      // Update cache
      await this.cache.set(`order:${confirmedOrder.id}`, confirmedOrder, this.config.cacheTimeout * 60);

      // Send confirmation email if configured
      if (this.config.sendConfirmationEmail) {
        await this.sendOrderConfirmationEmail(confirmedOrder);
      }

      return Ok(confirmedOrder);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Order confirmation failed',
        500,
        error
      ));
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Result<Order, WooError>> {
    try {
      // Get current order
      const orderResult = await this.getOrder(orderId);
      if (isErr(orderResult)) {
        return Err(unwrapErr(orderResult));
      }

      const order = unwrap(orderResult);

      // Only allow cancellation of pending/processing orders
      if (!['pending', 'processing', 'on-hold'].includes(order.status)) {
        return Err(ErrorFactory.validationError(
          `Cannot cancel order with status: ${order.status}`
        ));
      }

      // Update order status to cancelled
      const response = await this.client.put(`/wp-json/wc/v3/orders/${orderId}`, {
        status: 'cancelled',
        customer_note: reason || 'Order cancelled by customer'
      });

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any;
      const cancelledOrder = this.mapOrderResponse(data);

      // Restore inventory if configured
      if (this.config.autoUpdateInventory) {
        await this.updateInventory({
          orderId: cancelledOrder.id,
          items: cancelledOrder.lineItems.map(item => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            operation: 'increase'
          }))
        });
      }

      // Update cache
      await this.cache.set(`order:${cancelledOrder.id}`, cancelledOrder, this.config.cacheTimeout * 60);

      return Ok(cancelledOrder);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Order cancellation failed',
        500,
        error
      ));
    }
  }

  /**
   * Search orders by criteria
   */
  async searchOrders(criteria: OrderSearchCriteria): Promise<Result<Order[], WooError>> {
    try {
      const params: Record<string, string> = {};

      if (criteria.status) params.status = criteria.status;
      if (criteria.customerId) params.customer = criteria.customerId;
      if (criteria.customerEmail) params.customer_email = criteria.customerEmail;
      if (criteria.dateFrom) params.after = criteria.dateFrom.toISOString();
      if (criteria.dateTo) params.before = criteria.dateTo.toISOString();
      if (criteria.paymentMethod) params.payment_method = criteria.paymentMethod;
      if (criteria.limit) params.per_page = criteria.limit.toString();
      if (criteria.offset) params.offset = criteria.offset.toString();

      const response = await this.client.get('/wp-json/wc/v3/orders', params);

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any[];
      const orders = data.map(orderData => this.mapOrderResponse(orderData));

      // Filter by amount if specified
      let filteredOrders = orders;
      if (criteria.minAmount || criteria.maxAmount) {
        filteredOrders = orders.filter(order => {
          if (criteria.minAmount && order.total < criteria.minAmount) return false;
          if (criteria.maxAmount && order.total > criteria.maxAmount) return false;
          return true;
        });
      }

      return Ok(filteredOrders);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Order search failed',
        500,
        error
      ));
    }
  }

  /**
   * Get order notes
   */
  async getOrderNotes(orderId: string): Promise<Result<string[], WooError>> {
    try {
      const response = await this.client.get(`/wp-json/wc/v3/orders/${orderId}/notes`);

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      const data = unwrap(response).data as any[];
      const notes = data.map(note => note.note);

      return Ok(notes);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to fetch order notes',
        500,
        error
      ));
    }
  }

  /**
   * Add note to order
   */
  async addOrderNote(orderId: string, note: string, customerNote: boolean = false): Promise<Result<void, WooError>> {
    try {
      const response = await this.client.post(`/wp-json/wc/v3/orders/${orderId}/notes`, {
        note,
        customer_note: customerNote
      });

      if (isErr(response)) {
        return Err(unwrapErr(response));
      }

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to add order note',
        500,
        error
      ));
    }
  }

  /**
   * Generate order number
   */
  generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${this.config.orderNumberPrefix}${timestamp}${random}${this.config.orderNumberSuffix || ''}`;
  }

  /**
   * Validate order creation request
   */
  async validateOrderCreation(request: OrderCreateRequest): Promise<Result<void, WooError>> {
    try {
      const { cart, checkoutSession } = request;

      // Validate cart
      if (cart.items.length === 0) {
        return Err(ErrorFactory.validationError('Cart is empty'));
      }

      if (cart.totals.total < 0) {
        return Err(ErrorFactory.validationError('Order total cannot be negative'));
      }

      // Validate addresses
      if (!checkoutSession.billingAddress) {
        return Err(ErrorFactory.validationError('Billing address is required'));
      }

      if (!checkoutSession.useShippingAsBilling && !checkoutSession.shippingAddress) {
        return Err(ErrorFactory.validationError('Shipping address is required'));
      }

      // Validate payment method for non-zero totals
      if (cart.totals.total > 0 && !checkoutSession.selectedPaymentMethod) {
        return Err(ErrorFactory.validationError('Payment method is required'));
      }

      // Validate terms acceptance
      if (!checkoutSession.termsAccepted) {
        return Err(ErrorFactory.validationError('Terms and conditions must be accepted'));
      }

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Order validation failed',
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Build order data for API request
   */
  private buildOrderData(request: OrderCreateRequest): any {
    const { cart, checkoutSession } = request;

    return {
      payment_method: checkoutSession.selectedPaymentMethod?.id || '',
      payment_method_title: checkoutSession.selectedPaymentMethod?.title || '',
      set_paid: false,
      billing: this.mapAddressForAPI(checkoutSession.billingAddress!),
      shipping: checkoutSession.useShippingAsBilling 
        ? this.mapAddressForAPI(checkoutSession.billingAddress!)
        : this.mapAddressForAPI(checkoutSession.shippingAddress!),
      line_items: cart.items.map(item => ({
        product_id: item.productId,
        variation_id: item.variationId || 0,
        quantity: item.quantity,
        price: item.price,
        total: item.total.toString()
      })),
      shipping_lines: checkoutSession.selectedShippingMethod ? [{
        method_id: checkoutSession.selectedShippingMethod.methodId,
        method_title: checkoutSession.selectedShippingMethod.title,
        total: checkoutSession.selectedShippingMethod.cost.toString()
      }] : [],
      customer_note: checkoutSession.orderNotes || '',
      status: this.config.defaultStatus,
      currency: cart.currency,
      customer_id: checkoutSession.isGuestCheckout ? 0 : undefined,
      meta_data: [
        {
          key: '_woo_headless_checkout_session',
          value: checkoutSession.id
        },
        {
          key: '_woo_headless_created',
          value: new Date().toISOString()
        }
      ]
    };
  }

  /**
   * Map address for API
   */
  private mapAddressForAPI(address: BillingAddress | ShippingAddress): any {
    return {
      first_name: address.firstName,
      last_name: address.lastName,
      company: address.company || '',
      address_1: address.address1,
      address_2: address.address2 || '',
      city: address.city,
      state: address.state,
      postcode: address.postcode,
      country: address.country,
      email: address.email || '',
      phone: address.phone || ''
    };
  }

  /**
   * Map order response from API
   */
  private mapOrderResponse(data: any): Order {
    return {
      id: data.id.toString(),
      number: data.number,
      status: data.status,
      currency: data.currency,
      total: parseFloat(data.total),
      subtotal: parseFloat(data.line_items_subtotal || '0'),
      totalTax: parseFloat(data.total_tax),
      shippingTotal: parseFloat(data.shipping_total),
      shippingTax: parseFloat(data.shipping_tax),
      discountTotal: parseFloat(data.discount_total),
      feeTotal: parseFloat(data.fee_total || '0'),
      feeTax: parseFloat(data.fee_tax || '0'),
      billingAddress: this.mapAddressFromAPI(data.billing),
      shippingAddress: this.mapAddressFromAPI(data.shipping),
      paymentMethod: data.payment_method,
      shippingMethod: data.shipping_lines[0]?.method_id || '',
      orderNotes: data.customer_note || '',
      lineItems: data.line_items.map((item: any) => ({
        id: item.id.toString(),
        productId: item.product_id,
        variationId: item.variation_id || undefined,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        name: item.name,
        sku: item.sku || ''
      })),
      createdAt: new Date(data.date_created),
      updatedAt: new Date(data.date_modified)
    };
  }

  /**
   * Map address from API response
   */
  private mapAddressFromAPI(data: any): BillingAddress {
    return {
      firstName: data.first_name,
      lastName: data.last_name,
      company: data.company,
      address1: data.address_1,
      address2: data.address_2,
      city: data.city,
      state: data.state,
      postcode: data.postcode,
      country: data.country,
      email: data.email,
      phone: data.phone
    };
  }

  /**
   * Reserve inventory for cart items
   */
  private async reserveInventory(cart: Cart): Promise<Result<void, WooError>> {
    try {
      // This would implement inventory reservation logic
      // For now, return success as placeholder
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Inventory reservation failed',
        500,
        error
      ));
    }
  }

  /**
   * Release reserved inventory
   */
  private async releaseInventory(cart: Cart): Promise<Result<void, WooError>> {
    try {
      // This would implement inventory release logic
      // For now, return success as placeholder
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Inventory release failed',
        500,
        error
      ));
    }
  }

  /**
   * Update inventory
   */
  private async updateInventory(request: InventoryUpdateRequest): Promise<Result<void, WooError>> {
    try {
      // This would implement inventory update logic
      // For now, return success as placeholder
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Inventory update failed',
        500,
        error
      ));
    }
  }

  /**
   * Send order confirmation email
   */
  private async sendOrderConfirmationEmail(order: Order): Promise<Result<void, WooError>> {
    try {
      // This would integrate with email service
      // For now, return success as placeholder
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Confirmation email failed',
        500,
        error
      ));
    }
  }
}

/**
 * Default order processing configuration
 */
export const DEFAULT_ORDER_PROCESSING_CONFIG: OrderProcessingConfig = {
  autoUpdateInventory: true,
  sendConfirmationEmail: true,
  requirePaymentConfirmation: true,
  orderNumberPrefix: 'WOO-',
  defaultStatus: 'pending',
  inventoryHoldMinutes: 15,
  cacheTimeout: 30 // 30 minutes
}; 