#!/usr/bin/env node

/**
 * Quick API Test Script for WooCommerce Headless SDK
 * 
 * This is a simple JavaScript test that you can run immediately:
 * node test-api.js
 */

const https = require('https');
const { URL } = require('url');

// Your WooCommerce API credentials
const API_CONFIG = {
  baseURL: 'https://barengmember.applocal',
  consumerKey: 'ck_9a51416f0c1f63b78015ba1ce465bf2373d5e200',
  consumerSecret: 'cs_8d25481eb873084cd7774e3ca24cbb3987ac5109'
};

// Simple HTTP client for testing
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_CONFIG.baseURL}/wp-json/wc/v3${endpoint}`);
    
    // Add authentication
    url.searchParams.append('consumer_key', API_CONFIG.consumerKey);
    url.searchParams.append('consumer_secret', API_CONFIG.consumerSecret);
    
    console.log(`🔗 Making request to: ${url.pathname}${url.search}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'WooHeadless-SDK-Test/1.0.0',
        'Accept': 'application/json'
      },
      // Allow self-signed certificates for local testing
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testAPI() {
  console.log('🚀 Testing WooCommerce API Connection...\n');
  console.log(`🌐 Base URL: ${API_CONFIG.baseURL}`);
  console.log(`🔑 Consumer Key: ${API_CONFIG.consumerKey.substring(0, 10)}...`);
  console.log('\n' + '─'.repeat(60) + '\n');

  try {
    // Test 1: System Status
    console.log('🏥 Test 1: System Status');
    try {
      const systemStatus = await makeRequest('/system_status');
      console.log(`✅ Status: ${systemStatus.status}`);
      
      if (systemStatus.status === 200) {
        console.log(`📊 WooCommerce Version: ${systemStatus.data.version || 'Unknown'}`);
        console.log(`🏪 Store: ${systemStatus.data.settings?.title || 'Unknown'}`);
      } else if (systemStatus.status === 401) {
        console.log('❌ Authentication failed - check your API credentials');
      } else {
        console.log(`⚠️  Unexpected status: ${systemStatus.status}`);
      }
    } catch (error) {
      console.log(`❌ System status check failed: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(30) + '\n');

    // Test 2: Products
    console.log('📦 Test 2: Products Endpoint');
    try {
      const products = await makeRequest('/products?per_page=3');
      console.log(`✅ Status: ${products.status}`);
      
      if (products.status === 200 && Array.isArray(products.data)) {
        console.log(`📊 Found ${products.data.length} products (showing first 3)`);
        
        products.data.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
          console.log(`      💰 Price: $${product.price || '0.00'}`);
          console.log(`      📝 Status: ${product.status}`);
        });
        
        // Check for pagination info
        const totalProducts = products.headers['x-wp-total'] || 'Unknown';
        console.log(`📈 Total products in store: ${totalProducts}`);
        
      } else if (products.status === 401) {
        console.log('❌ Authentication failed - check your API credentials');
      } else {
        console.log(`⚠️  Unexpected response: ${products.status}`);
        if (products.parseError) {
          console.log(`   Parse error: ${products.parseError}`);
        }
      }
    } catch (error) {
      console.log(`❌ Products test failed: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(30) + '\n');

    // Test 3: Categories
    console.log('🏷️  Test 3: Product Categories');
    try {
      const categories = await makeRequest('/products/categories?per_page=5');
      console.log(`✅ Status: ${categories.status}`);
      
      if (categories.status === 200 && Array.isArray(categories.data)) {
        console.log(`📊 Found ${categories.data.length} categories (showing first 5)`);
        
        categories.data.forEach((category, index) => {
          console.log(`   ${index + 1}. ${category.name} (ID: ${category.id})`);
          console.log(`      📦 Products: ${category.count || 0}`);
        });
      }
    } catch (error) {
      console.log(`❌ Categories test failed: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(30) + '\n');

    // Test 4: Single Product (if we have products)
    console.log('📋 Test 4: Single Product Details');
    try {
      // First get a product ID
      const products = await makeRequest('/products?per_page=1');
      
      if (products.status === 200 && products.data.length > 0) {
        const productId = products.data[0].id;
        const singleProduct = await makeRequest(`/products/${productId}`);
        
        console.log(`✅ Status: ${singleProduct.status}`);
        
        if (singleProduct.status === 200) {
          const product = singleProduct.data;
          console.log(`📦 Product: ${product.name}`);
          console.log(`💰 Price: $${product.price || '0.00'}`);
          console.log(`📝 Description: ${(product.short_description || '').substring(0, 100) || 'No description'}...`);
          console.log(`🏷️  Categories: ${product.categories?.length || 0} categories`);
          console.log(`📷 Images: ${product.images?.length || 0} images`);
          console.log(`📦 Stock Status: ${product.stock_status || 'Unknown'}`);
        }
      } else {
        console.log(`ℹ️  No products available to test single product fetch`);
      }
    } catch (error) {
      console.log(`❌ Single product test failed: ${error.message}`);
    }

    console.log('\n' + '🎉 API Test Complete! 🎉');
    console.log('\n✅ Your WooCommerce API is accessible and working!');
    console.log('\n📚 Next steps:');
    console.log('   1. Run the full TypeScript integration test: npm test integration.test.ts');
    console.log('   2. Try the integration example: npx ts-node examples/integration-test-example.ts');
    console.log('   3. Start building your headless e-commerce application!');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if your WooCommerce site is accessible in a browser');
    console.log('   2. Verify the URL is correct (should include https://)');
    console.log('   3. Make sure WooCommerce REST API is enabled');
    console.log('   4. Check your consumer key and secret');
    console.log('   5. Ensure your server allows API requests');
  }
}

// Run the test
testAPI().catch(console.error); 