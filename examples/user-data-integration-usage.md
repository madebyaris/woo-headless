# User Data Integration Usage Guide

This guide demonstrates how to use the WooCommerce Headless SDK's User Data Integration system, which works seamlessly with external authentication providers like Better Auth to sync user data with WordPress/WooCommerce.

## Table of Contents
- [Quick Start](#quick-start)
- [Authentication Context](#authentication-context)
- [User Data Syncing](#user-data-syncing)
- [Profile Management](#profile-management)
- [Address Management](#address-management)
- [Order History](#order-history)
- [Wishlist Management](#wishlist-management)
- [Configuration Options](#configuration-options)
- [Integration Patterns](#integration-patterns)
- [Error Handling](#error-handling)

---

## Quick Start

### Basic Setup with External Authentication

```typescript
import { WooHeadless, UserAuthContext } from '@woo-headless/sdk';
import { auth } from './auth'; // Your external auth system (e.g., Better Auth)

// Initialize SDK with user sync enabled
const woo = new WooHeadless({
  baseURL: 'https://your-store.com',
  consumerKey: 'your-consumer-key',
  consumerSecret: 'your-consumer-secret',
  userSync: {
    enabled: true,
    syncOnLogin: true,
    syncProfile: true,
    syncAddresses: true,
    syncOrderHistory: true,
    cacheTtl: 1800000, // 30 minutes
  }
});

// Set authentication context when user logs in
auth.onAuthStateChange(async (user) => {
  if (user) {
    // Create auth context for WooCommerce integration
    const authContext: UserAuthContext = {
      userId: user.wordpressUserId, // WordPress user ID
      externalUserId: user.id, // Better Auth user ID
      email: user.email,
      isAuthenticated: true,
      accessToken: user.accessToken,
      sessionId: user.sessionId
    };

    // Set context - this triggers automatic sync if enabled
    const result = woo.user.setAuthContext(authContext);
    if (!result.success) {
      console.error('Failed to set auth context:', result.error);
    }
  } else {
    // Clear context on logout
    woo.user.clearAuthContext();
  }
});
```

---

## Authentication Context

### Setting Authentication Context

```typescript
// From external auth system (Better Auth, Auth0, etc.)
const authContext: UserAuthContext = {
  userId: 123, // WordPress/WooCommerce user ID
  externalUserId: 'better-auth-user-id',
  email: 'user@example.com',
  isAuthenticated: true,
  accessToken: 'jwt-token-if-needed',
  permissions: ['read:profile', 'write:orders']
};

const result = woo.user.setAuthContext(authContext);
if (result.success) {
  console.log('Auth context set successfully');
} else {
  console.error('Auth error:', result.error.message);
}
```

### Getting Current Context

```typescript
const currentContext = woo.user.getCurrentAuthContext();
if (currentContext) {
  console.log('Current user:', currentContext.email);
  console.log('WordPress ID:', currentContext.userId);
}
```

---

## User Data Syncing

### Manual Sync

```typescript
// Sync all user data
const syncResult = await woo.user.syncUserData({
  userId: 123,
  forceRefresh: true
});

if (syncResult.success) {
  const syncData = syncResult.data;
  console.log('Profile synced:', syncData.profile);
  console.log('Addresses synced:', syncData.addresses);
  console.log('Orders synced:', syncData.orderHistory?.length);
  
  if (syncData.syncErrors && syncData.syncErrors.length > 0) {
    console.warn('Sync warnings:', syncData.syncErrors);
  }
} else {
  console.error('Sync failed:', syncResult.error);
}
```

### Selective Sync

```typescript
// Sync only profile and addresses
const selectiveSync = await woo.user.syncUserData({
  userId: 123,
  syncProfile: true,
  syncAddresses: true,
  syncOrderHistory: false,
  syncWishlist: false
});
```

### Background Sync

```typescript
// Automatic sync is triggered when:
// 1. User logs in (if syncOnLogin: true)
// 2. Configuration interval expires
// 3. Manual refresh is requested

// Check sync status
const context = woo.user.getCurrentAuthContext();
if (context) {
  console.log('User authenticated, background sync active');
}
```

---

## Profile Management

### Get User Profile

```typescript
const profileResult = await woo.user.getUserProfile(123);
if (profileResult.success) {
  const profile = profileResult.data;
  console.log('User:', profile.displayName);
  console.log('Email:', profile.email);
  console.log('Roles:', profile.roles);
  console.log('Registration:', profile.dateRegistered);
}
```

### Update Profile

```typescript
const updateResult = await woo.user.updateUserProfile(123, {
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    website: 'https://johndoe.dev'
  }
});

if (updateResult.success) {
  console.log('Profile updated:', updateResult.data.displayName);
}
```

### Get Customer Data

```typescript
// Get WooCommerce-specific customer data
const customerResult = await woo.user.getCustomerData(123);
if (customerResult.success) {
  const customer = customerResult.data;
  console.log('Total spent:', customer.totalSpent);
  console.log('Orders count:', customer.ordersCount);
  console.log('Is paying customer:', customer.isPayingCustomer);
}
```

---

## Address Management

### Get Addresses

```typescript
const syncResult = await woo.user.syncUserData({
  userId: 123,
  syncAddresses: true
});

if (syncResult.success && syncResult.data.addresses) {
  const addresses = syncResult.data.addresses;
  const billing = addresses.find(addr => addr.type === 'billing');
  const shipping = addresses.find(addr => addr.type === 'shipping');
  
  console.log('Billing address:', billing);
  console.log('Shipping address:', shipping);
}
```

### Validate Address

```typescript
import { UserAddress } from '@woo-headless/sdk';

const address: UserAddress = {
  type: 'shipping',
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postcode: '10001',
  country: 'US',
  isDefault: true
};

const validation = woo.user.validateAddress(address);
if (validation.isValid) {
  console.log('Address is valid');
} else {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

---

## Order History

### Get Order History

```typescript
const ordersResult = await woo.user.getUserOrderHistory(123, 1, 10);
if (ordersResult.success) {
  const orders = ordersResult.data;
  orders.forEach(order => {
    console.log(`Order #${order.orderNumber}: ${order.total} ${order.currency}`);
    console.log(`Status: ${order.status}, Items: ${order.itemCount}`);
    console.log(`Date: ${order.dateCreated}`);
  });
}
```

### Paginated Order History

```typescript
// Get recent orders
const recentOrders = await woo.user.getUserOrderHistory(123, 1, 5);

// Get older orders
const olderOrders = await woo.user.getUserOrderHistory(123, 2, 5);
```

---

## Wishlist Management

### Get Wishlist

```typescript
const syncResult = await woo.user.syncUserData({
  userId: 123,
  syncWishlist: true
});

if (syncResult.success && syncResult.data.wishlist) {
  const wishlist = syncResult.data.wishlist;
  console.log('Wishlist items:', wishlist.items.length);
  
  wishlist.items.forEach(item => {
    console.log(`Product ${item.productId}, Qty: ${item.quantity}`);
    console.log(`Priority: ${item.priority}, Added: ${item.dateAdded}`);
  });
}
```

---

## Configuration Options

### Complete Configuration

```typescript
const woo = new WooHeadless({
  baseURL: 'https://your-store.com',
  consumerKey: 'your-key',
  consumerSecret: 'your-secret',
  userSync: {
    enabled: true,
    syncInterval: 300, // 5 minutes
    syncOnLogin: true,
    syncProfile: true,
    syncAddresses: true,
    syncPreferences: true,
    syncOrderHistory: true,
    syncWishlist: true,
    maxOrderHistory: 50,
    cacheUserData: true,
    cacheTtl: 1800000 // 30 minutes
  }
});
```

### Runtime Configuration Updates

```typescript
// Update user sync settings
const updateResult = woo.updateConfig({
  userSync: {
    syncInterval: 600, // 10 minutes
    maxOrderHistory: 100
  }
});

if (updateResult.success) {
  console.log('Configuration updated');
}
```

---

## Integration Patterns

### React Integration

```typescript
// Custom hook for user data
import { useEffect, useState } from 'react';
import { UserProfile, UserSyncResponse } from '@woo-headless/sdk';

export function useUserProfile(userId?: number) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const result = await woo.user.getUserProfile(userId);
      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading, error };
}

// Usage in component
function UserDashboard() {
  const { profile, loading, error } = useUserProfile(currentUserId);

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div>
      <h1>Welcome, {profile.displayName}</h1>
      <p>Email: {profile.email}</p>
      <p>Member since: {new Date(profile.dateRegistered).toLocaleDateString()}</p>
    </div>
  );
}
```

### Vue Integration

```typescript
// Vue composition API
import { ref, computed, onMounted } from 'vue';
import { UserProfile } from '@woo-headless/sdk';

export function useUserData(userId: number) {
  const profile = ref<UserProfile | null>(null);
  const addresses = ref<UserAddress[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const syncUserData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const result = await woo.user.syncUserData({
        userId,
        syncProfile: true,
        syncAddresses: true
      });

      if (result.success) {
        profile.value = result.data.profile || null;
        addresses.value = result.data.addresses || [];
      } else {
        error.value = result.error.message;
      }
    } catch (err) {
      error.value = 'Failed to sync user data';
    } finally {
      loading.value = false;
    }
  };

  onMounted(syncUserData);

  return {
    profile: computed(() => profile.value),
    addresses: computed(() => addresses.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    syncUserData
  };
}
```

### Next.js API Route

```typescript
// pages/api/user/sync.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { WooHeadless } from '@woo-headless/sdk';

const woo = new WooHeadless({
  baseURL: process.env.WOO_BASE_URL!,
  consumerKey: process.env.WOO_CONSUMER_KEY!,
  consumerSecret: process.env.WOO_CONSUMER_SECRET!,
  userSync: { enabled: true }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    const syncResult = await woo.user.syncUserData({ userId });
    
    if (syncResult.success) {
      res.status(200).json({
        success: true,
        data: syncResult.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: syncResult.error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
async function handleUserOperations(userId: number) {
  try {
    // Get user profile
    const profileResult = await woo.user.getUserProfile(userId);
    if (!profileResult.success) {
      switch (profileResult.error.code) {
        case 'NETWORK_ERROR':
          console.error('Network connection failed');
          break;
        case 'AUTH_ERROR':
          console.error('Authentication failed - user may need to re-login');
          break;
        case 'API_ERROR':
          console.error('WooCommerce API error:', profileResult.error.message);
          break;
        case 'VALIDATION_ERROR':
          console.error('Invalid user ID or parameters');
          break;
        default:
          console.error('Unknown error:', profileResult.error);
      }
      return;
    }

    // Sync user data
    const syncResult = await woo.user.syncUserData({
      userId,
      forceRefresh: true
    });

    if (syncResult.success) {
      console.log('User data synced successfully');
      
      // Check for partial sync errors
      if (syncResult.data.syncErrors && syncResult.data.syncErrors.length > 0) {
        console.warn('Some data could not be synced:', syncResult.data.syncErrors);
      }
    } else {
      console.error('Sync failed:', syncResult.error.message);
    }

    // Update profile
    const updateResult = await woo.user.updateUserProfile(userId, {
      profile: { bio: 'Updated bio' }
    });

    if (!updateResult.success) {
      console.error('Profile update failed:', updateResult.error.message);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

### Retry Logic

```typescript
async function syncWithRetry(userId: number, maxRetries = 3) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await woo.user.syncUserData({ userId });
      
      if (result.success) {
        console.log(`Sync successful on attempt ${attempt}`);
        return result.data;
      } else if (result.error.code === 'NETWORK_ERROR' && attempt < maxRetries) {
        console.warn(`Network error on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

---

## User Activity Logging

```typescript
// Log user activities for analytics
await woo.user.logUserActivity({
  userId: 123,
  type: 'profile_update',
  description: 'User updated their profile information',
  metadata: {
    fields: ['firstName', 'lastName', 'bio'],
    timestamp: new Date().toISOString()
  }
});

// Log order activity
await woo.user.logUserActivity({
  userId: 123,
  type: 'order',
  description: 'User placed a new order',
  metadata: {
    orderId: 456,
    total: '99.99',
    currency: 'USD'
  }
});
```

---

## Best Practices

### 1. Authentication Flow
```typescript
// ✅ Set auth context immediately after external login
auth.onLogin(async (user) => {
  const authContext = createAuthContext(user);
  await woo.user.setAuthContext(authContext);
});

// ✅ Clear context on logout
auth.onLogout(() => {
  woo.user.clearAuthContext();
});
```

### 2. Caching Strategy
```typescript
// ✅ Enable caching for better performance
const woo = new WooHeadless({
  // ... other config
  userSync: {
    cacheUserData: true,
    cacheTtl: 1800000, // 30 minutes
    syncInterval: 300 // 5 minutes
  }
});
```

### 3. Error Recovery
```typescript
// ✅ Handle partial sync failures gracefully
const syncResult = await woo.user.syncUserData({ userId });
if (syncResult.success && syncResult.data.syncErrors?.length) {
  // Some data failed to sync, but core profile is available
  console.warn('Partial sync completed with warnings');
}
```

### 4. Performance Optimization
```typescript
// ✅ Sync only what you need
const lightSync = await woo.user.syncUserData({
  userId,
  syncProfile: true,
  syncAddresses: false, // Skip if not needed
  syncOrderHistory: false // Skip for better performance
});
```

---

## Known Limitations

- **TypeScript Strict Mode**: Some exactOptionalPropertyTypes compatibility issues are being resolved in upcoming releases
- **Wishlist Support**: Requires a WooCommerce wishlist plugin for full functionality
- **Real-time Sync**: Currently polling-based; webhooks support planned for future releases
- **Address Validation**: Basic validation included; external services integration available for enhanced validation

---

## Support

For issues or questions about user data integration:
1. Check the [GitHub Issues](https://github.com/your-repo/woo-headless/issues)
2. Review the [API Documentation](https://docs.woo-headless.dev/user-api)
3. Join our [Discord Community](https://discord.gg/woo-headless)

---

**Next Steps**: Explore [Cart Management](./cart-usage.md) and [Checkout Integration](./checkout-usage.md) to build complete e-commerce workflows. 