# Cart Synchronization Usage Guide

## Overview

The WooCommerce Headless SDK's cart synchronization system enables seamless cross-device cart persistence for authenticated users.

## Quick Start

```typescript
import { WooHeadless } from '@woo-headless/sdk';

// Initialize with sync enabled
const woo = new WooHeadless({
  baseURL: 'https://your-store.com',
  consumerKey: 'your-key',
  consumerSecret: 'your-secret',
  cart: {
    sync: {
      enabled: true,
      strategy: 'merge_smart',
      syncOnAuth: true,
      backgroundSync: true
    }
  }
});

// Set user authentication context
const authContext = {
  isAuthenticated: true,
  userId: 'user123',
  email: 'user@example.com',
  token: 'jwt-token'
};

woo.cart.setAuthContext(authContext);

// Manual sync
const syncResult = await woo.cart.syncCartWithServer();
if (syncResult.success) {
  console.log('Cart synced successfully');
  console.log('Changes:', syncResult.data.changes);
  console.log('Conflicts:', syncResult.data.conflicts);
}
```

## Sync Event Handling

```typescript
const syncHandler = {
  onSyncStart: () => console.log('Sync started'),
  onSyncComplete: (result) => console.log('Sync completed:', result),
  onSyncError: (error) => console.error('Sync failed:', error),
  onConflictDetected: (conflicts) => console.log('Conflicts:', conflicts)
};

woo.cart.addSyncEventHandler(syncHandler);
```

## Configuration Options

### Production Configuration
```typescript
const productionConfig = {
  cart: {
    sync: {
      enabled: true,
      strategy: 'merge_smart',
      syncIntervalMs: 30000,
      conflictResolution: 'merge_smart',
      maxRetries: 3,
      syncOnAuth: true,
      syncOnCartChange: false,
      backgroundSync: true,
      offlineQueueSize: 100
    }
  }
};
```

## Conflict Resolution Strategies

- **merge_smart**: Intelligent merging (recommended)
- **local_wins**: Local cart takes precedence  
- **server_wins**: Server cart takes precedence
- **merge_quantities**: Add quantities for same items
- **prompt_user**: Ask user to resolve conflicts

## React Integration

```typescript
// useCartSync hook
function useCartSync() {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncAt, setLastSyncAt] = useState();

  useEffect(() => {
    const handler = {
      onSyncStart: () => setSyncStatus('syncing'),
      onSyncComplete: (result) => {
        setSyncStatus('synced');
        setLastSyncAt(result.syncedAt);
      },
      onSyncError: () => setSyncStatus('failed'),
      onConflictDetected: () => setSyncStatus('conflict')
    };

    woo.cart.addSyncEventHandler(handler);
    return () => woo.cart.removeSyncEventHandler(handler);
  }, []);

  return { syncStatus, lastSyncAt };
}
```

## Error Handling

```typescript
try {
  const result = await woo.cart.syncCartWithServer();
  
  if (!result.success) {
    switch (result.error.code) {
      case 'AUTHENTICATION_ERROR':
        redirectToLogin();
        break;
      case 'NETWORK_ERROR':
        showRetryOption();
        break;
      default:
        showError(result.error.message);
    }
  }
} catch (error) {
  console.error('Sync error:', error);
}
```

## Best Practices

1. **Enable sync only for authenticated users**
2. **Use merge_smart strategy for most cases**
3. **Avoid syncOnCartChange in high-traffic scenarios**
4. **Implement proper error handling**
5. **Monitor sync performance and conflicts**
6. **Handle offline scenarios gracefully**

## Offline Support

```typescript
// Process offline queue when coming online
window.addEventListener('online', () => {
  woo.cart.processOfflineQueue();
});

// Actions are automatically queued when offline
await woo.cart.addItem({
  productId: 123,
  quantity: 1
}); // Queued if offline, synced when online
```

This cart synchronization system provides enterprise-grade cross-device cart management for modern e-commerce applications. 