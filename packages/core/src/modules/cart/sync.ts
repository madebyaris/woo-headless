/**
 * Cart Synchronization Manager for WooCommerce Headless SDK
 * Handles cross-device cart synchronization with intelligent conflict resolution
 * Following the enhanced unified-10x-dev framework
 */

import { 
  Cart, 
  CartItem, 
  CartSyncConfig, 
  CartSyncStatus, 
  CartSyncStrategy,
  CartSyncResult,
  CartSyncConflict,
  CartSyncMetadata,
  ServerCartData 
} from '../../types/cart';
import { UserAuthContext } from '../../types/user';
import { Result, Ok, Err } from '../../types/result';
import { CartError, ErrorFactory } from '../../types/errors';
import { HttpClient } from '../../core/client';

/**
 * Cart synchronization event handler
 */
export interface CartSyncEventHandler {
  onSyncStart: () => void;
  onSyncComplete: (result: CartSyncResult) => void;
  onSyncError: (error: CartError) => void;
  onConflictDetected: (conflicts: readonly CartSyncConflict[]) => void;
}

/**
 * Cart synchronization queue item
 */
export interface CartSyncQueueItem {
  readonly id: string;
  readonly action: 'add' | 'update' | 'remove' | 'clear' | 'apply_coupon' | 'remove_coupon';
  readonly data: unknown;
  readonly timestamp: Date;
  readonly retryCount: number;
}

/**
 * Cart synchronization manager
 */
export class CartSyncManager {
  private readonly config: CartSyncConfig;
  private readonly httpClient: HttpClient;
  private readonly deviceId: string;
  
  private syncStatus: CartSyncStatus = 'idle';
  private lastSyncAt?: Date;
  private syncTimer?: NodeJS.Timeout;
  private isOnline = true;
  private syncQueue: CartSyncQueueItem[] = [];
  private eventHandlers: CartSyncEventHandler[] = [];

  constructor(
    config: CartSyncConfig,
    httpClient: HttpClient,
    deviceId?: string
  ) {
    this.config = config;
    this.httpClient = httpClient;
    this.deviceId = deviceId ?? this.generateDeviceId();
    
    this.setupNetworkMonitoring();
    this.setupBackgroundSync();
  }

  /**
   * Get current sync status
   */
  getStatus(): CartSyncStatus {
    return this.syncStatus;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncAt(): Date | undefined {
    return this.lastSyncAt;
  }

  /**
   * Add event handler
   */
  addEventHandler(handler: CartSyncEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  removeEventHandler(handler: CartSyncEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Sync cart with server
   */
  async syncCart(
    localCart: Cart,
    authContext: UserAuthContext
  ): Promise<Result<CartSyncResult, CartError>> {
    if (!this.config.enabled) {
      return Ok({
        success: true,
        status: 'idle',
        conflicts: [],
        syncedAt: new Date(),
        changes: {
          itemsAdded: 0,
          itemsUpdated: 0,
          itemsRemoved: 0,
          couponsAdded: 0,
          couponsRemoved: 0
        }
      });
    }

    if (!authContext.isAuthenticated || !authContext.userId) {
      return Err(ErrorFactory.cartError(
        'User must be authenticated for cart synchronization',
        { context: 'sync_cart' }
      ));
    }

    this.setSyncStatus('syncing');
    this.notifyEventHandlers('onSyncStart');

    try {
      // Fetch server cart
      const serverCartResult = await this.fetchServerCart(authContext.userId);
      if (!serverCartResult.success) {
        this.setSyncStatus('failed');
        this.notifyEventHandlers('onSyncError', serverCartResult.error);
        return serverCartResult;
      }

      const serverCartData = serverCartResult.data;
      
      // If no server cart exists, upload local cart
      if (!serverCartData) {
        const uploadResult = await this.uploadCart(localCart, authContext);
        if (!uploadResult.success) {
          this.setSyncStatus('failed');
          this.notifyEventHandlers('onSyncError', uploadResult.error);
          return uploadResult;
        }

        const result: CartSyncResult = {
          success: true,
          status: 'synced',
          conflicts: [],
          mergedCart: localCart,
          syncedAt: new Date(),
          changes: {
            itemsAdded: 0,
            itemsUpdated: 0,
            itemsRemoved: 0,
            couponsAdded: 0,
            couponsRemoved: 0
          }
        };

        this.setSyncStatus('synced');
        this.lastSyncAt = new Date();
        this.notifyEventHandlers('onSyncComplete', result);
        return Ok(result);
      }

      // Merge carts with conflict detection
      const mergeResult = await this.mergeCarts(localCart, serverCartData.cart);
      if (!mergeResult.success) {
        this.setSyncStatus('failed');
        this.notifyEventHandlers('onSyncError', mergeResult.error);
        return mergeResult;
      }

      const { mergedCart, conflicts, changes } = mergeResult.data;

      // Handle conflicts if any
      if (conflicts.length > 0) {
        this.setSyncStatus('conflict');
        this.notifyEventHandlers('onConflictDetected', conflicts);
        
        // Auto-resolve conflicts based on strategy
        const resolveResult = await this.resolveConflicts(
          localCart,
          serverCartData.cart,
          conflicts,
          this.config.conflictResolution
        );
        
        if (!resolveResult.success) {
          this.setSyncStatus('failed');
          this.notifyEventHandlers('onSyncError', resolveResult.error);
          return resolveResult;
        }
      }

      // Upload merged cart to server
      const uploadResult = await this.uploadCart(mergedCart, authContext);
      if (!uploadResult.success) {
        this.setSyncStatus('failed');
        this.notifyEventHandlers('onSyncError', uploadResult.error);
        return uploadResult;
      }

      const result: CartSyncResult = {
        success: true,
        status: 'synced',
        conflicts,
        mergedCart,
        syncedAt: new Date(),
        changes
      };

      this.setSyncStatus('synced');
      this.lastSyncAt = new Date();
      this.notifyEventHandlers('onSyncComplete', result);

      return Ok(result);
    } catch (error) {
      const cartError = ErrorFactory.cartError(
        'Cart synchronization failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      this.setSyncStatus('failed');
      this.notifyEventHandlers('onSyncError', cartError);
      return Err(cartError);
    }
  }

  /**
   * Queue cart action for offline sync
   */
  queueAction(
    action: CartSyncQueueItem['action'],
    data: unknown
  ): void {
    if (!this.config.enabled || this.isOnline) {
      return;
    }

    const queueItem: CartSyncQueueItem = {
      id: this.generateId(),
      action,
      data,
      timestamp: new Date(),
      retryCount: 0
    };

    this.syncQueue.push(queueItem);

    // Limit queue size
    if (this.syncQueue.length > this.config.offlineQueueSize) {
      this.syncQueue.shift(); // Remove oldest item
    }
  }

  /**
   * Process offline sync queue
   */
  async processQueue(
    localCart: Cart,
    authContext: UserAuthContext
  ): Promise<Result<void, CartError>> {
    if (!this.config.enabled || !authContext.isAuthenticated || this.syncQueue.length === 0) {
      return Ok(undefined);
    }

    const failedItems: CartSyncQueueItem[] = [];

    for (const item of this.syncQueue) {
      try {
        // Process each queued action
        await this.processQueueItem(item, localCart, authContext);
      } catch (error) {
        item.retryCount++;
        if (item.retryCount < this.config.maxRetries) {
          failedItems.push(item);
        }
      }
    }

    // Update queue with failed items
    this.syncQueue = failedItems;
    
    return Ok(undefined);
  }

  /**
   * Enable cart synchronization
   */
  enable(): void {
    this.config.enabled = true;
    this.setupBackgroundSync();
  }

  /**
   * Disable cart synchronization
   */
  disable(): void {
    this.config.enabled = false;
    this.stopBackgroundSync();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopBackgroundSync();
    this.eventHandlers.length = 0;
    this.syncQueue.length = 0;
  }

  // PRIVATE METHODS

  /**
   * Fetch cart from server
   */
  private async fetchServerCart(userId: string): Promise<Result<ServerCartData | null, CartError>> {
    try {
      const response = await this.httpClient.get(`/cart/sync/${userId}`);
      
      if (response.status === 404) {
        return Ok(null); // No server cart exists
      }

      if (!response.success) {
        return Err(ErrorFactory.cartError(
          'Failed to fetch server cart',
          { status: response.status, error: response.error }
        ));
      }

      return Ok(response.data as ServerCartData);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Network error while fetching server cart',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }
  }

  /**
   * Upload cart to server
   */
  private async uploadCart(
    cart: Cart,
    authContext: UserAuthContext
  ): Promise<Result<void, CartError>> {
    if (!authContext.isAuthenticated || !authContext.userId) {
      return Err(ErrorFactory.cartError(
        'User must be authenticated to upload cart',
        { context: 'upload_cart' }
      ));
    }

    const metadata: CartSyncMetadata = {
      deviceId: this.deviceId,
      lastSyncAt: new Date(),
      syncVersion: 1,
      userId: authContext.userId,
      sessionId: cart.sessionId,
      source: 'local'
    };

    const serverCartData: ServerCartData = {
      cart,
      metadata
    };

    try {
      const response = await this.httpClient.put(`/cart/sync/${authContext.userId}`, serverCartData);
      
      if (!response.success) {
        return Err(ErrorFactory.cartError(
          'Failed to upload cart to server',
          { status: response.status, error: response.error }
        ));
      }

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Network error while uploading cart',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }
  }

  /**
   * Merge local and server carts with conflict detection
   */
  private async mergeCarts(
    localCart: Cart,
    serverCart: Cart
  ): Promise<Result<{
    mergedCart: Cart;
    conflicts: CartSyncConflict[];
    changes: CartSyncResult['changes'];
  }, CartError>> {
    const conflicts: CartSyncConflict[] = [];
    const changes = {
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      couponsAdded: 0,
      couponsRemoved: 0
    };

    try {
      // Merge items using the configured strategy
      const itemMergeResult = await this.mergeCartItems(
        localCart.items,
        serverCart.items,
        this.config.strategy
      );
      
      if (!itemMergeResult.success) {
        return itemMergeResult;
      }

      const { mergedItems, itemConflicts } = itemMergeResult.data;
      conflicts.push(...itemConflicts);

      // Count changes
      changes.itemsAdded = mergedItems.filter(item => 
        !localCart.items.some(local => local.key === item.key)
      ).length;
      
      changes.itemsUpdated = mergedItems.filter(item => {
        const localItem = localCart.items.find(local => local.key === item.key);
        return localItem && localItem.quantity !== item.quantity;
      }).length;

      changes.itemsRemoved = localCart.items.filter(item =>
        !mergedItems.some(merged => merged.key === item.key)
      ).length;

      // Merge coupons
      const couponMergeResult = this.mergeCoupons(
        localCart.appliedCoupons,
        serverCart.appliedCoupons
      );
      
      conflicts.push(...couponMergeResult.conflicts);
      changes.couponsAdded = couponMergeResult.couponsAdded;
      changes.couponsRemoved = couponMergeResult.couponsRemoved;

      // Create merged cart
      const mergedCart: Cart = {
        ...localCart,
        items: mergedItems,
        appliedCoupons: couponMergeResult.mergedCoupons,
        itemCount: mergedItems.reduce((sum, item) => sum + item.quantity, 0),
        updatedAt: new Date()
      };

      return Ok({
        mergedCart,
        conflicts,
        changes
      });
    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to merge carts',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }
  }

  /**
   * Merge cart items with conflict detection
   */
  private async mergeCartItems(
    localItems: readonly CartItem[],
    serverItems: readonly CartItem[],
    strategy: CartSyncStrategy
  ): Promise<Result<{
    mergedItems: CartItem[];
    itemConflicts: CartSyncConflict[];
  }, CartError>> {
    const mergedItems: CartItem[] = [];
    const itemConflicts: CartSyncConflict[] = [];
    const processedKeys = new Set<string>();

    try {
      // Process local items
      for (const localItem of localItems) {
        const serverItem = serverItems.find(item => item.key === localItem.key);
        processedKeys.add(localItem.key);

        if (!serverItem) {
          // Item only exists locally
          mergedItems.push(localItem);
        } else if (localItem.quantity === serverItem.quantity) {
          // No conflict, use local item (more recent updates)
          mergedItems.push(localItem);
        } else {
          // Quantity conflict detected
          const conflict: CartSyncConflict = {
            type: 'item_quantity',
            itemKey: localItem.key,
            localValue: localItem.quantity,
            serverValue: serverItem.quantity,
            message: `Quantity mismatch for ${localItem.name}`,
            suggestion: this.getQuantityMergeSuggestion(strategy, localItem.quantity, serverItem.quantity)
          };
          
          itemConflicts.push(conflict);

          // Auto-resolve based on strategy
          const resolvedQuantity = this.resolveQuantityConflict(
            strategy,
            localItem.quantity,
            serverItem.quantity
          );

          mergedItems.push({
            ...localItem,
            quantity: resolvedQuantity,
            totalPrice: localItem.price * resolvedQuantity,
            updatedAt: new Date()
          });
        }
      }

      // Process server items not in local cart
      for (const serverItem of serverItems) {
        if (!processedKeys.has(serverItem.key)) {
          mergedItems.push(serverItem);
        }
      }

      return Ok({
        mergedItems,
        itemConflicts
      });
    } catch (error) {
      return Err(ErrorFactory.cartError(
        'Failed to merge cart items',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }
  }

  /**
   * Merge applied coupons
   */
  private mergeCoupons(
    localCoupons: readonly Cart['appliedCoupons'][0][],
    serverCoupons: readonly Cart['appliedCoupons'][0][]
  ): {
    mergedCoupons: Cart['appliedCoupons'][0][];
    conflicts: CartSyncConflict[];
    couponsAdded: number;
    couponsRemoved: number;
  } {
    const mergedCoupons: Cart['appliedCoupons'][0][] = [];
    const conflicts: CartSyncConflict[] = [];
    const processedCodes = new Set<string>();

    let couponsAdded = 0;
    let couponsRemoved = 0;

    // Add local coupons
    for (const localCoupon of localCoupons) {
      processedCodes.add(localCoupon.code);
      mergedCoupons.push(localCoupon);
    }

    // Add server coupons that don't exist locally
    for (const serverCoupon of serverCoupons) {
      if (!processedCodes.has(serverCoupon.code)) {
        mergedCoupons.push(serverCoupon);
        couponsAdded++;
      }
    }

    // Count removed coupons
    couponsRemoved = serverCoupons.filter(coupon => 
      !localCoupons.some(local => local.code === coupon.code)
    ).length;

    return {
      mergedCoupons,
      conflicts,
      couponsAdded,
      couponsRemoved
    };
  }

  /**
   * Resolve conflicts based on strategy
   */
  private async resolveConflicts(
    localCart: Cart,
    serverCart: Cart,
    conflicts: readonly CartSyncConflict[],
    strategy: CartSyncStrategy
  ): Promise<Result<Cart, CartError>> {
    // For now, conflicts are auto-resolved during merge
    // In the future, this could prompt the user or apply more sophisticated resolution
    return Ok(localCart);
  }

  /**
   * Resolve quantity conflict based on strategy
   */
  private resolveQuantityConflict(
    strategy: CartSyncStrategy,
    localQuantity: number,
    serverQuantity: number
  ): number {
    switch (strategy) {
      case 'local_wins':
        return localQuantity;
      case 'server_wins':
        return serverQuantity;
      case 'merge_quantities':
        return localQuantity + serverQuantity;
      case 'merge_smart':
      default:
        // Use the higher quantity (assumes user wants more items)
        return Math.max(localQuantity, serverQuantity);
    }
  }

  /**
   * Get quantity merge suggestion for conflict
   */
  private getQuantityMergeSuggestion(
    strategy: CartSyncStrategy,
    localQuantity: number,
    serverQuantity: number
  ): string {
    switch (strategy) {
      case 'local_wins':
        return `Keep local quantity: ${localQuantity}`;
      case 'server_wins':
        return `Use server quantity: ${serverQuantity}`;
      case 'merge_quantities':
        return `Add quantities: ${localQuantity + serverQuantity}`;
      case 'merge_smart':
      default:
        return `Use higher quantity: ${Math.max(localQuantity, serverQuantity)}`;
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(
    item: CartSyncQueueItem,
    localCart: Cart,
    authContext: UserAuthContext
  ): Promise<void> {
    // This is a placeholder for processing offline actions
    // In a real implementation, this would replay the action on the server
    console.warn('Cart sync queue processing not yet implemented for action:', item.action);
  }

  /**
   * Set sync status and notify handlers
   */
  private setSyncStatus(status: CartSyncStatus): void {
    this.syncStatus = status;
  }

  /**
   * Notify event handlers
   */
  private notifyEventHandlers(
    event: keyof CartSyncEventHandler,
    ...args: unknown[]
  ): void {
    for (const handler of this.eventHandlers) {
      try {
        switch (event) {
          case 'onSyncStart':
            handler.onSyncStart();
            break;
          case 'onSyncComplete':
            handler.onSyncComplete(args[0] as CartSyncResult);
            break;
          case 'onSyncError':
            handler.onSyncError(args[0] as CartError);
            break;
          case 'onConflictDetected':
            handler.onConflictDetected(args[0] as readonly CartSyncConflict[]);
            break;
        }
      } catch (error) {
        console.error('Error in cart sync event handler:', error);
      }
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Setup background sync timer
   */  
  private setupBackgroundSync(): void {
    if (!this.config.enabled || !this.config.backgroundSync) {
      return;
    }

    this.stopBackgroundSync();
    
    this.syncTimer = setInterval(() => {
      // Background sync will be triggered by the cart service
      // when it has access to the current cart and auth context
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop background sync timer
   */
  private stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for environments without crypto.randomUUID
    return 'device-' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
} 