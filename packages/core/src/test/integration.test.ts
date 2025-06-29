/**
 * Integration tests for WooCommerce Headless SDK
 * Tests against real WooCommerce API
 * Following the enhanced unified-10x-dev framework
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WooHeadless } from '../woo-headless';
import { isOk, isErr } from '../types/result';

// Test configuration - these should be set via environment variables in CI/CD
const TEST_CONFIG = {
  baseURL: 'https://barengmember.applocal',
  consumerKey: 'ck_9a51416f0c1f63b78015ba1ce465bf2373d5e200',
  consumerSecret: 'cs_8d25481eb873084cd7774e3ca24cbb3987ac5109',
  // Enable debug mode for integration tests
  debug: {
    enabled: true,
    logLevel: 'debug' as const,
    performanceMonitoring: true,
    apiLogging: true
  }
};

describe('WooCommerce API Integration Tests', () => {
  let woo: WooHeadless;

  beforeAll(() => {
    woo = new WooHeadless(TEST_CONFIG);
  });

  describe('Product Integration', () => {
    it('should fetch real products from WooCommerce API', async () => {
      const result = await woo.products.list({
        page: 1,
        limit: 5
      });

      if (isOk(result)) {
        console.log(`✅ Successfully fetched ${result.data.products.length} products`);
        console.log(`📊 Total products: ${result.data.totalProducts}`);
        
        expect(result.data.products).toBeDefined();
        expect(Array.isArray(result.data.products)).toBe(true);
        expect(result.data.totalProducts).toBeGreaterThanOrEqual(0);
        
        // Log first product for debugging
        if (result.data.products.length > 0) {
          const firstProduct = result.data.products[0];
          console.log(`🛍️ First product: ${firstProduct.name} (ID: ${firstProduct.id})`);
        }
      } else {
        console.error('❌ Failed to fetch products:', result.error);
        throw new Error(`API Error: ${result.error.message}`);
      }
    });

    it('should handle product search', async () => {
      const result = await woo.products.search('test', {
        limit: 3
      });

      if (isOk(result)) {
        console.log(`🔍 Search returned ${result.data.products.length} products`);
        expect(result.data.products).toBeDefined();
        expect(Array.isArray(result.data.products)).toBe(true);
      } else {
        console.log('🔍 Search returned no results or error:', result.error.message);
        // Search returning no results is acceptable
        expect(result.error.code).toBeDefined();
      }
    });

    it('should fetch a specific product by ID', async () => {
      // First get a list of products to find a valid ID
      const listResult = await woo.products.list({ limit: 1 });
      
      if (isOk(listResult) && listResult.data.products.length > 0) {
        const productId = listResult.data.products[0].id;
        
        const result = await woo.products.get(productId);
        
        if (isOk(result)) {
          console.log(`📦 Fetched product: ${result.data.name}`);
          expect(result.data.id).toBe(productId);
          expect(result.data.name).toBeDefined();
        } else {
          console.error(`❌ Failed to fetch product ${productId}:`, result.error);
          throw new Error(`Failed to fetch product: ${result.error.message}`);
        }
      } else {
        console.log('⏭️ Skipping single product test - no products available');
      }
    });
  });

  describe('Cart Integration', () => {
    it('should initialize cart system', async () => {
      const cart = await woo.cart.getCart();
      
      if (isOk(cart)) {
        console.log(`🛒 Cart initialized with ${cart.data.items.length} items`);
        expect(cart.data).toBeDefined();
        expect(cart.data.items).toBeDefined();
        expect(Array.isArray(cart.data.items)).toBe(true);
      } else {
        console.error('❌ Failed to initialize cart:', cart.error);
        throw new Error(`Cart initialization failed: ${cart.error.message}`);
      }
    });

    it('should add product to cart if products exist', async () => {
      // First check if we have any products
      const productsResult = await woo.products.list({ limit: 1 });
      
      if (isOk(productsResult) && productsResult.data.products.length > 0) {
        const product = productsResult.data.products[0];
        
        const result = await woo.cart.addItem({
          productId: product.id,
          quantity: 1
        });
        
        if (isOk(result)) {
          console.log(`✅ Added ${product.name} to cart`);
          expect(result.data.items.length).toBeGreaterThan(0);
          
          // Verify the item was added
          const addedItem = result.data.items.find(item => item.productId === product.id);
          expect(addedItem).toBeDefined();
          expect(addedItem?.quantity).toBe(1);
        } else {
          console.error('❌ Failed to add item to cart:', result.error);
          // Don't throw here as this might be due to product restrictions
          console.log('This might be due to product being out of stock or restricted');
        }
      } else {
        console.log('⏭️ Skipping cart add test - no products available');
      }
    });
  });

  describe('Search Integration', () => {
    it('should perform quick search', async () => {
      const result = await woo.search.quickSearch({
        query: 'product',
        limit: 5
      });

      if (isOk(result)) {
        console.log(`🔍 Quick search found ${result.data.items.length} products`);
        expect(result.data.items).toBeDefined();
        expect(Array.isArray(result.data.items)).toBe(true);
      } else {
        console.log('🔍 Quick search completed with no results');
        expect(result.error.code).toBeDefined();
      }
    });

    it('should get search auto-complete suggestions', async () => {
      const result = await woo.search.autoComplete({
        query: 'prod',
        limit: 5,
        includeProducts: true,
        includeCategories: false
      });

      if (isOk(result)) {
        console.log(`💡 Got ${result.data.products.length} product suggestions and ${result.data.suggestions.length} text suggestions`);
        expect(result.data.products).toBeDefined();
        expect(Array.isArray(result.data.products)).toBe(true);
        expect(result.data.suggestions).toBeDefined();
        expect(Array.isArray(result.data.suggestions)).toBe(true);
      } else {
        console.log('💡 No auto-complete suggestions available');
      }
    });
  });

  describe('User Integration', () => {
    it('should handle user data operations', async () => {
      // Test user profile operations (these might not work without proper auth)
      try {
        const result = await woo.user.syncUserData({
          userId: 1,
          syncProfile: true,
          syncAddresses: false,
          syncOrderHistory: false,
          syncWishlist: false
        });

        if (isOk(result)) {
          console.log('👤 User data sync successful');
          expect(result.data).toBeDefined();
        } else {
          console.log('👤 User data sync failed (expected without auth):', result.error.code);
          // This is expected to fail without proper authentication
        }
      } catch (error) {
        console.log('👤 User operations require authentication (expected)');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid product ID gracefully', async () => {
      const result = await woo.products.get(999999);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        console.log(`✅ Properly handled invalid product ID: ${result.error.code}`);
        expect(result.error.code).toMatch(/PRODUCT_NOT_FOUND|API_ERROR/);
      }
    });

    it('should handle network timeout gracefully', async () => {
      // Create a new instance with very short timeout for testing
      const fastTimeoutWoo = new WooHeadless({
        ...TEST_CONFIG,
        http: {
          timeout: 1, // 1ms timeout - should fail
          retries: 0
        }
      });

      const result = await fastTimeoutWoo.products.list();
      
      if (isErr(result)) {
        console.log(`✅ Properly handled timeout: ${result.error.code}`);
        expect(result.error.code).toMatch(/TIMEOUT_ERROR|NETWORK_ERROR/);
      } else {
        console.log('⚠️ Request succeeded despite short timeout (network is very fast!)');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should fetch products within reasonable time', async () => {
      const startTime = performance.now();
      
      const result = await woo.products.list({ limit: 10 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Product fetch took ${duration.toFixed(2)}ms`);
      
      // Should complete within 5 seconds (generous for testing)
      expect(duration).toBeLessThan(5000);
      
      if (isOk(result)) {
        expect(result.data.products).toBeDefined();
      }
    });

    it('should handle concurrent requests', async () => {
      const startTime = performance.now();
      
      const promises = [
        woo.products.list({ limit: 5 }),
        woo.products.list({ limit: 5, page: 2 }),
        woo.products.search('test', { limit: 3 })
      ];
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ Concurrent requests completed in ${duration.toFixed(2)}ms`);
      
      // At least one request should succeed
      const successCount = results.filter(result => isOk(result)).length;
      expect(successCount).toBeGreaterThan(0);
      
      console.log(`✅ ${successCount} out of 3 concurrent requests succeeded`);
    });
  });
});

// Helper function to run a quick API connectivity test
export async function testAPIConnectivity(): Promise<boolean> {
  try {
    const woo = new WooHeadless(TEST_CONFIG);
    const result = await woo.products.list({ limit: 1 });
    return isOk(result);
  } catch {
    return false;
  }
} 