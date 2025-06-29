# Enhanced Cart System Usage Guide

## 🛒 **WooCommerce Headless SDK - Advanced Cart Management**

This guide demonstrates the enhanced cart system with advanced persistence strategies, comprehensive totals calculation, and robust validation.

## 📋 **Table of Contents**

1. [Quick Start](#quick-start)
2. [Cart Persistence Strategies](#cart-persistence-strategies)
3. [Advanced Totals Calculation](#advanced-totals-calculation)
4. [Cart Operations](#cart-operations)
5. [Cart Validation](#cart-validation)
6. [Integration Examples](#integration-examples)

---

## 🚀 **Quick Start**

### Basic Cart Setup

```typescript
import { WooHeadless } from '@woo-headless/sdk';

const woo = new WooHeadless({
  baseURL: 'https://your-woo-store.com',
  consumerKey: 'your-consumer-key',
  consumerSecret: 'your-consumer-secret',
  cart: {
    persistence: {
      strategy: 'localStorage', // 'localStorage' | 'sessionStorage' | 'indexedDB' | 'server' | 'none'
      key: 'my-store-cart',
      expirationDays: 7,
      syncToServer: false
    },
    autoCalculateTotals: true,
    validateStock: true,
    allowBackorders: false,
    maxItems: 50,
    maxQuantityPerItem: 99,
    taxCalculation: {
      enabled: true,
      pricesIncludeTax: false,
      displayMode: 'excl',
      roundAtSubtotal: true
    }
  }
});

// Get or create cart
const cartResult = await woo.cart.getCart();
if (cartResult.isOk()) {
  const cart = cartResult.unwrap();
  console.log('Cart loaded:', cart);
}
```

---

## 💾 **Cart Persistence Strategies**

### 1. **LocalStorage Persistence** (Default)
Best for: Single-device shopping, performance-focused applications

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    persistence: {
      strategy: 'localStorage',
      key: 'woo-cart-v2',
      expirationDays: 30 // Cart expires after 30 days
    }
  }
});
```

### 2. **SessionStorage Persistence**
Best for: Privacy-conscious applications, temporary carts

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    persistence: {
      strategy: 'sessionStorage',
      key: 'session-cart'
      // No expiration - cleared when browser session ends
    }
  }
});
```

### 3. **IndexedDB Persistence**
Best for: Large carts, complex data, offline functionality

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    persistence: {
      strategy: 'indexedDB',
      key: 'advanced-cart',
      expirationDays: 90, // Long-term storage
      encryption: true // Enable encryption for sensitive data
    }
  }
});

// IndexedDB automatically handles:
// - Large cart data
// - Complex metadata
// - Offline storage
// - Automatic cleanup of expired carts
```

### 4. **Server-Side Persistence**
Best for: Multi-device synchronization, authenticated users

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    persistence: {
      strategy: 'server',
      syncToServer: true,
      key: 'user-123-cart' // User-specific cart key
    }
  }
});

// Note: Server persistence requires custom implementation
// Override the persistence methods for your backend:

class CustomCartService extends CartService {
  private async saveToServer(cart: Cart): Promise<Result<void, WooError>> {
    try {
      await fetch('/api/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getCurrentUserId(),
          cartData: cart
        })
      });
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.persistenceError('Server save failed', error));
    }
  }
}
```

### 5. **Hybrid Persistence** (Recommended for Production)
Combines local storage with server sync for best user experience

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    persistence: {
      strategy: 'indexedDB', // Fast local access
      syncToServer: true,    // Background sync to server
      key: `cart-${userId}`,
      expirationDays: 30
    }
  }
});

// This configuration provides:
// ✅ Fast local access (IndexedDB)
// ✅ Cross-device synchronization (Server)
// ✅ Offline capability
// ✅ Automatic conflict resolution
```

---

## 🧮 **Advanced Totals Calculation**

### Basic Totals with Tax

```typescript
// Add items to cart
await woo.cart.addItem({
  productId: 123,
  quantity: 2,
  attributes: { color: 'red', size: 'M' }
});

await woo.cart.addItem({
  productId: 456,
  quantity: 1
});

// Get cart with calculated totals
const cartResult = await woo.cart.getCart();
if (cartResult.isOk()) {
  const cart = cartResult.unwrap();
  
  console.log('Cart Totals:', {
    subtotal: cart.totals.subtotal,           // Items total before tax/discounts
    subtotalTax: cart.totals.subtotalTax,     // Tax on subtotal
    discountTotal: cart.totals.discountTotal, // Total discounts applied
    shippingTotal: cart.totals.shippingTotal, // Shipping cost
    shippingTax: cart.totals.shippingTax,     // Tax on shipping
    feeTotal: cart.totals.feeTotal,           // Additional fees
    total: cart.totals.total                  // Final total
  });
}
```

### Advanced Tax Configuration

```typescript
const woo = new WooHeadless({
  // ... other config
  cart: {
    taxCalculation: {
      enabled: true,
      pricesIncludeTax: false,    // Prices exclude tax
      displayMode: 'excl',       // Show prices excluding tax
      roundAtSubtotal: true       // Round at subtotal level
    }
  }
});

// Tax rates are automatically determined by:
// 1. Customer's country/state
// 2. Product tax classes
// 3. WooCommerce tax settings
```

### Coupon Integration

```typescript
// Apply percentage coupon
const couponResult = await woo.cart.applyCoupon('SUMMER20');
if (couponResult.isOk()) {
  const cart = couponResult.unwrap();
  console.log('Discount applied:', cart.totals.discountTotal);
}

// Apply fixed amount coupon
await woo.cart.applyCoupon('SAVE10');

// Remove coupon
await woo.cart.removeCoupon('SUMMER20');

// View applied coupons
const cart = await woo.cart.getCart();
if (cart.isOk()) {
  console.log('Applied coupons:', cart.unwrap().appliedCoupons);
}
```

---

## 🛒 **Cart Operations**

### Adding Items with Validation

```typescript
// Add simple product
const addResult = await woo.cart.addItem({
  productId: 123,
  quantity: 2
});

if (addResult.isErr()) {
  const error = addResult.unwrapErr();
  console.error('Failed to add item:', error.message);
  
  // Handle specific errors
  if (error.code === 'INSUFFICIENT_STOCK') {
    console.log('Not enough stock available');
  } else if (error.code === 'PRODUCT_NOT_FOUND') {
    console.log('Product does not exist');
  }
}

// Add variable product with attributes
await woo.cart.addItem({
  productId: 456,
  variationId: 789,
  quantity: 1,
  attributes: {
    pa_color: 'blue',
    pa_size: 'large'
  },
  meta: [
    { key: 'gift_message', value: 'Happy Birthday!' },
    { key: 'custom_engraving', value: 'John Doe' }
  ]
});
```

### Updating Cart Items

```typescript
// Update item quantity
const updateResult = await woo.cart.updateItem('item-key-123', 3);

if (updateResult.isOk()) {
  console.log('Item quantity updated');
} else {
  console.error('Update failed:', updateResult.unwrapErr().message);
}

// Remove item completely
await woo.cart.removeItem('item-key-123');

// Clear entire cart
await woo.cart.clearCart();
```

### Cart Validation

```typescript
// Validate entire cart
const validationResult = await woo.cart.validateCart();

if (validationResult.isOk()) {
  const validation = validationResult.unwrap();
  
  if (!validation.isValid) {
    console.log('Cart validation errors:');
    validation.errors.forEach(error => {
      console.log(`- ${error.itemKey}: ${error.message}`);
      
      if (error.code === 'INSUFFICIENT_STOCK') {
        console.log(`  Available: ${error.currentStock}, Requested: ${error.requestedQuantity}`);
      }
    });
  }
  
  // Handle warnings
  validation.warnings.forEach(warning => {
    console.warn(`Warning for ${warning.itemKey}: ${warning.message}`);
  });
}
```

---

## ⚛️ **React Integration Examples**

### Cart Hook

```typescript
// hooks/useCart.ts
import { useState, useEffect } from 'react';
import { WooHeadless, Cart, Result, WooError } from '@woo-headless/sdk';

export function useCart(woo: WooHeadless) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    const result = await woo.cart.getCart();
    
    if (result.isOk()) {
      setCart(result.unwrap());
      setError(null);
    } else {
      setError(result.unwrapErr().message);
    }
    setLoading(false);
  };

  const addItem = async (productId: number, quantity: number = 1) => {
    const result = await woo.cart.addItem({ productId, quantity });
    
    if (result.isOk()) {
      setCart(result.unwrap());
      return true;
    } else {
      setError(result.unwrapErr().message);
      return false;
    }
  };

  const updateQuantity = async (itemKey: string, quantity: number) => {
    const result = await woo.cart.updateItem(itemKey, quantity);
    
    if (result.isOk()) {
      setCart(result.unwrap());
      return true;
    } else {
      setError(result.unwrapErr().message);
      return false;
    }
  };

  const removeItem = async (itemKey: string) => {
    const result = await woo.cart.removeItem(itemKey);
    
    if (result.isOk()) {
      setCart(result.unwrap());
      return true;
    } else {
      setError(result.unwrapErr().message);
      return false;
    }
  };

  return {
    cart,
    loading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    reload: loadCart
  };
}
```

### Cart Component

```typescript
// components/Cart.tsx
import React from 'react';
import { useCart } from '../hooks/useCart';

interface CartProps {
  woo: WooHeadless;
}

export function Cart({ woo }: CartProps) {
  const { cart, loading, error, updateQuantity, removeItem } = useCart(woo);

  if (loading) return <div>Loading cart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!cart || cart.isEmpty) return <div>Your cart is empty</div>;

  return (
    <div className="cart">
      <h2>Shopping Cart</h2>
      
      {/* Cart Items */}
      <div className="cart-items">
        {cart.items.map(item => (
          <div key={item.key} className="cart-item">
            <div className="item-info">
              {item.image && (
                <img src={item.image.src} alt={item.image.alt} width={60} height={60} />
              )}
              <div>
                <h4>{item.name}</h4>
                <p>${item.price.toFixed(2)} each</p>
              </div>
            </div>
            
            <div className="item-quantity">
              <button 
                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button 
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
              >
                +
              </button>
            </div>
            
            <div className="item-total">
              ${item.totalPrice.toFixed(2)}
            </div>
            
            <button 
              onClick={() => removeItem(item.key)}
              className="remove-item"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Cart Totals */}
      <div className="cart-totals">
        <div className="total-line">
          <span>Subtotal:</span>
          <span>${cart.totals.subtotal.toFixed(2)}</span>
        </div>
        
        {cart.totals.discountTotal > 0 && (
          <div className="total-line discount">
            <span>Discount:</span>
            <span>-${cart.totals.discountTotal.toFixed(2)}</span>
          </div>
        )}
        
        {cart.totals.shippingTotal > 0 && (
          <div className="total-line">
            <span>Shipping:</span>
            <span>${cart.totals.shippingTotal.toFixed(2)}</span>
          </div>
        )}
        
        {cart.totals.totalTax > 0 && (
          <div className="total-line">
            <span>Tax:</span>
            <span>${cart.totals.totalTax.toFixed(2)}</span>
          </div>
        )}
        
        <div className="total-line total">
          <span>Total:</span>
          <span>${cart.totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Applied Coupons */}
      {cart.appliedCoupons.length > 0 && (
        <div className="applied-coupons">
          <h3>Applied Coupons:</h3>
          {cart.appliedCoupons.map(coupon => (
            <div key={coupon.code} className="coupon">
              <span>{coupon.code}</span>
              <span>-${coupon.amount.toFixed(2)}</span>
              <button onClick={() => woo.cart.removeCoupon(coupon.code)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 **Best Practices**

### 1. **Error Handling**
Always handle cart operations with proper error handling:

```typescript
const addToCart = async (productId: number, quantity: number) => {
  try {
    const result = await woo.cart.addItem({ productId, quantity });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      
      // Handle specific error types
      switch (error.code) {
        case 'INSUFFICIENT_STOCK':
          showNotification('Not enough stock available', 'warning');
          break;
        case 'PRODUCT_NOT_FOUND':
          showNotification('Product not found', 'error');
          break;
        case 'VALIDATION_ERROR':
          showNotification('Invalid product data', 'error');
          break;
        default:
          showNotification('Failed to add item to cart', 'error');
      }
      return false;
    }
    
    showNotification('Item added to cart!', 'success');
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    showNotification('An unexpected error occurred', 'error');
    return false;
  }
};
```

### 2. **Performance Optimization**
Use cart validation and persistence efficiently:

```typescript
// Debounce cart updates
const debouncedUpdateCart = debounce(async (itemKey: string, quantity: number) => {
  await woo.cart.updateItem(itemKey, quantity);
}, 500);

// Validate cart before checkout
const validateBeforeCheckout = async () => {
  const validation = await woo.cart.validateCart();
  
  if (validation.isOk() && !validation.unwrap().isValid) {
    const errors = validation.unwrap().errors;
    // Show validation errors to user
    return false;
  }
  
  return true;
};
```

### 3. **Multi-Device Sync**
For authenticated users, ensure cart synchronization:

```typescript
// On user login, merge local cart with server cart
const syncCartOnLogin = async (userId: string) => {
  // Load server cart
  const serverCart = await loadCartFromServer(userId);
  
  // Load local cart
  const localCartResult = await woo.cart.getCart();
  
  if (localCartResult.isOk() && serverCart) {
    // Merge carts (custom logic based on your needs)
    await mergeCartsLogic(localCartResult.unwrap(), serverCart);
  }
};
```

---

## 🔒 **Security Considerations**

1. **Validate on Server**: Always validate cart contents on your server before checkout
2. **Price Integrity**: Don't trust client-side price calculations for payment
3. **Stock Validation**: Verify stock availability at checkout time
4. **Session Security**: Use secure session management for cart persistence

---

## 📊 **Analytics Integration**

Track cart events for analytics:

```typescript
// Track cart events
const trackCartEvent = (eventType: string, data: any) => {
  // Google Analytics 4
  gtag('event', eventType, {
    currency: 'USD',
    value: data.total,
    items: data.items?.map(item => ({
      item_id: item.productId,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  });
};

// Usage
await woo.cart.addItem({ productId: 123, quantity: 1 });
trackCartEvent('add_to_cart', { productId: 123, quantity: 1 });
```

This enhanced cart system provides enterprise-grade functionality with comprehensive persistence strategies, advanced calculations, and robust error handling. The system automatically handles complex scenarios like tax calculations, multi-currency support, and cross-device synchronization. 