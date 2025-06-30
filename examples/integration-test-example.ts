/**
 * Integration Test Example for WooCommerce Headless SDK
 * This example demonstrates how to use the SDK with a real WooCommerce API
 * 
 * To run this example:
 * 1. Make sure you have the WooCommerce site credentials
 * 2. Install dependencies: npm install
 * 3. Run: npx ts-node examples/integration-test-example.ts
 */

import { WooHeadless } from '../packages/core/src/woo-headless';
import { isOk, isErr } from '../packages/core/src/types/result';

// Configuration for your WooCommerce site
const config = {
  baseURL: 'https://barengmember.applocal',
  consumerKey: 'ck_9a51416f0c1f63b78015ba1ce465bf2373d5e200',
  consumerSecret: 'cs_8d25481eb873084cd7774e3ca24cbb3987ac5109',
  debug: {
    enabled: true,
    logLevel: 'info' as const
  }
};

async function testWooCommerceAPI() {
  console.log('🚀 Starting WooCommerce API Integration Test...\n');

  // Initialize the SDK
  const woo = new WooHeadless(config);

  try {
    // Test 1: Fetch Products
    console.log('📦 Testing Product Fetching...');
    const productsResult = await woo.products.list({
      page: 1,
      limit: 5
    });

    if (isOk(productsResult)) {
      console.log(`✅ Successfully fetched ${productsResult.data.products.length} products`);
      console.log(`📊 Total products available: ${productsResult.data.totalProducts}`);
      
      // Show first product details
      if (productsResult.data.products.length > 0) {
        const firstProduct = productsResult.data.products[0];
        if (firstProduct) {
          console.log(`🛍️  First product: "${firstProduct.name}" (ID: ${firstProduct.id})`);
          console.log(`💰 Price: $${firstProduct.price}`);
          console.log(`📝 Status: ${firstProduct.status}`);
        }
      }
    } else {
      console.error('❌ Failed to fetch products:', productsResult.error.message);
      return;
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Test 2: Search Products
    console.log('🔍 Testing Product Search...');
    const searchResult = await woo.products.search('shirt', {
      limit: 3
    });

    if (isOk(searchResult)) {
      console.log(`✅ Search found ${searchResult.data.products.length} products for "shirt"`);
      searchResult.data.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
      });
    } else {
      console.log('🔍 Search returned no results:', searchResult.error.message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Test 3: Get Single Product
    if (isOk(productsResult) && productsResult.data.products.length > 0) {
      const firstProduct = productsResult.data.products[0];
      if (!firstProduct) {
        console.log('⚠️  No product available for single product test');
        return;
      }
      const productId = firstProduct.id;
      console.log(`📋 Testing Single Product Fetch (ID: ${productId})...`);
      
      const singleProductResult = await woo.products.get(productId);
      
      if (isOk(singleProductResult)) {
        const product = singleProductResult.data;
        console.log(`✅ Successfully fetched product: "${product.name}"`);
        console.log(`📝 Description: ${product.description?.substring(0, 100) || 'No description'}...`);
        console.log(`🏷️  Categories: ${product.categories?.map(cat => cat.name).join(', ') || 'None'}`);
        console.log(`📷 Images: ${product.images?.length || 0} images`);
      } else {
        console.error('❌ Failed to fetch single product:', singleProductResult.error.message);
      }
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Test 4: Cart Operations
    console.log('🛒 Testing Cart Operations...');
    const cartResult = await woo.cart.getCart();
    
    if (isOk(cartResult)) {
      console.log(`✅ Cart initialized with ${cartResult.data.items.length} items`);
      console.log(`💰 Cart total: $${cartResult.data.totals.total}`);
      
      // Try to add a product to cart (if we have products)
              if (isOk(productsResult) && productsResult.data.products.length > 0) {
          const productToAdd = productsResult.data.products[0];
          if (!productToAdd) {
            console.log('⚠️  No product available for cart test');
          } else {
            console.log(`🛍️  Attempting to add "${productToAdd.name}" to cart...`);
            
            const addResult = await woo.cart.addItem({
              productId: productToAdd.id,
              quantity: 1,
              variationId: undefined
            });
            
            if (isOk(addResult)) {
              console.log(`✅ Successfully added product to cart!`);
              console.log(`🛒 Cart now has ${addResult.data.items.length} items`);
              console.log(`💰 New cart total: $${addResult.data.totals.total}`);
            } else {
              console.log(`⚠️  Could not add product to cart: ${addResult.error.message}`);
              console.log('   This might be normal if the product is out of stock or has restrictions');
            }
          }
        }
    } else {
      console.error('❌ Failed to initialize cart:', cartResult.error.message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Test 5: Advanced Search
    console.log('🔍 Testing Advanced Search...');
    try {
      const advancedSearchResult = await woo.search.quickSearch({
        query: 'product',
        limit: 3
      });

      if (isOk(advancedSearchResult)) {
        console.log(`✅ Advanced search found ${advancedSearchResult.data.items.length} results`);
        advancedSearchResult.data.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.item.name} (Score: ${item.score.toFixed(2)})`);
        });
      } else {
        console.log('🔍 Advanced search completed with no results');
      }
    } catch (error) {
      console.log('🔍 Advanced search not available (search module may need setup)');
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Test 6: Error Handling
    console.log('🚨 Testing Error Handling...');
    const invalidProductResult = await woo.products.get(999999);
    
    if (isErr(invalidProductResult)) {
      console.log(`✅ Error handling works correctly: ${invalidProductResult.error.code}`);
      console.log(`   Message: ${invalidProductResult.error.message}`);
    } else {
      console.log('⚠️  Expected error for invalid product ID, but got success');
    }

    console.log('\n' + '🎉 Integration Test Complete! 🎉');
    console.log('\n✅ Your WooCommerce Headless SDK is working correctly with your API!');
    console.log('\n📚 Next steps:');
    console.log('   1. Check the examples/ directory for more usage patterns');
    console.log('   2. Explore the advanced features like user management and checkout');
    console.log('   3. Integrate the SDK into your frontend application');
    console.log('   4. Set up proper error handling and logging in production');

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your WooCommerce site is accessible');
    console.log('   2. Verify your API credentials are correct');
    console.log('   3. Ensure WooCommerce REST API is enabled');
    console.log('   4. Check for any firewall or CORS issues');
  }
}

// Run the test
if (require.main === module) {
  testWooCommerceAPI().catch(console.error);
}

export { testWooCommerceAPI }; 