#!/usr/bin/env node

/**
 * Customer Order Test - Fix Attribution & Guest Issue
 * 
 * This test creates orders with proper customer accounts instead of guest orders
 * Includes order attribution tracking
 */

const https = require('https');
const { URL } = require('url');

const API_CONFIG = {
  baseURL: 'https://barengmember.applocal',
  consumerKey: 'ck_9a51416f0c1f63b78015ba1ce465bf2373d5e200',
  consumerSecret: 'cs_8d25481eb873084cd7774e3ca24cbb3987ac5109'
};

function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_CONFIG.baseURL}/wp-json/wc/v3${endpoint}`);
    url.searchParams.append('consumer_key', API_CONFIG.consumerKey);
    url.searchParams.append('consumer_secret', API_CONFIG.consumerSecret);
    
    console.log(`🔗 ${method} ${url.pathname}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'WooHeadless-SDK-CustomerTest/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData, parseError: error.message });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createCustomerOrder() {
  console.log('👤 Creating Order with Customer Account & Attribution...\n');

  try {
    // Step 1: Create Customer
    console.log('👤 STEP 1: Create Customer Account');
    console.log('─'.repeat(40));

    const customerData = {
      email: 'john.smith@example.com',
      first_name: 'John',
      last_name: 'Smith',
      username: 'johnsmith_' + Date.now(),
      billing: {
        first_name: 'John',
        last_name: 'Smith',
        company: 'WooHeadless SDK Testing',
        address_1: '456 SDK Street',
        address_2: 'Suite 200',
        city: 'API City',
        state: 'CA',
        postcode: '90210',
        country: 'US',
        email: 'john.smith@example.com',
        phone: '555-987-6543'
      },
      shipping: {
        first_name: 'John',
        last_name: 'Smith',
        company: 'WooHeadless SDK Testing',
        address_1: '456 SDK Street',
        address_2: 'Suite 200',
        city: 'API City',
        state: 'CA',
        postcode: '90210',
        country: 'US'
      }
    };

    const createCustomerResponse = await makeRequest('/customers', 'POST', customerData);
    
    if (createCustomerResponse.status !== 201) {
      console.log(`❌ Failed to create customer: ${createCustomerResponse.status}`);
      if (createCustomerResponse.data.message) {
        console.log(`   Error: ${createCustomerResponse.data.message}`);
      }
      return;
    }

    const customer = createCustomerResponse.data;
    console.log(`✅ Created customer: ${customer.first_name} ${customer.last_name} (ID: ${customer.id})`);
    console.log(`   📧 Email: ${customer.email}`);
    console.log(`   🆔 Username: ${customer.username}`);

    // Step 2: Create Order with Customer Account
    console.log('\n📋 STEP 2: Create Order with Customer Association');
    console.log('─'.repeat(40));

    const orderData = {
      customer_id: customer.id, // 🔑 KEY: This associates the order with the customer
      payment_method: 'bacs',
      payment_method_title: 'Direct bank transfer',
      set_paid: false,
      
      // Use customer's billing/shipping info
      billing: customer.billing,
      shipping: customer.shipping,
      
      // Add some products (using IDs from your store)
      line_items: [
        {
          product_id: 168, // Doll Samsung Sheet
          quantity: 1
        },
        {
          product_id: 160, // Meat ACME Cool
          quantity: 2
        }
      ],
      
      // Add shipping
      shipping_lines: [{
        method_id: 'free_shipping',
        method_title: 'Free shipping',
        total: '0.00'
      }],
      
      // 🎯 ORDER ATTRIBUTION - This is key for tracking!
      meta_data: [
        {
          key: '_order_attribution_source_type',
          value: 'organic'
        },
        {
          key: '_order_attribution_referrer',
          value: API_CONFIG.baseURL
        },
        {
          key: '_order_attribution_utm_source',
          value: 'woo_headless_sdk'
        },
        {
          key: '_order_attribution_utm_medium',
          value: 'api'
        },
        {
          key: '_order_attribution_utm_campaign',
          value: 'customer_integration_test'
        },
        {
          key: '_order_attribution_session_entry',
          value: API_CONFIG.baseURL + '/products'
        },
        {
          key: '_order_attribution_session_start_time',
          value: new Date().toISOString()
        },
        {
          key: '_order_attribution_session_pages',
          value: '3'
        },
        {
          key: '_created_via',
          value: 'woo_headless_sdk'
        },
        {
          key: '_customer_user_agent',
          value: 'WooHeadless-SDK/1.0.0'
        },
        {
          key: '_order_attribution_device_type',
          value: 'desktop'
        }
      ]
    };

    console.log(`📦 Creating order for customer ID: ${customer.id}`);
    console.log(`   👤 Customer: ${customer.first_name} ${customer.last_name}`);
    console.log(`   📧 Email: ${customer.email}`);
    console.log(`   📦 Items: ${orderData.line_items.length}`);
    console.log(`   🎯 Attribution: WooHeadless SDK`);

    const orderResponse = await makeRequest('/orders', 'POST', orderData);
    
    if (orderResponse.status === 201) {
      const order = orderResponse.data;
      
      console.log(`\n🎉 Order created successfully!`);
      console.log(`   📝 Order ID: ${order.id}`);
      console.log(`   📋 Order Number: ${order.number}`);
      console.log(`   👤 Customer: ${order.billing.first_name} ${order.billing.last_name}`);
      console.log(`   🆔 Customer ID: ${order.customer_id} (should not be 0!)`);
      console.log(`   📧 Email: ${order.billing.email}`);
      console.log(`   💰 Total: $${order.total}`);
      console.log(`   📊 Status: ${order.status}`);
      
      // Check attribution
      const createdVia = order.meta_data.find(m => m.key === '_created_via');
      const utmSource = order.meta_data.find(m => m.key === '_order_attribution_utm_source');
      
      console.log(`\n🎯 Order Attribution Check:`);
      console.log(`   📊 Created Via: ${createdVia ? createdVia.value : 'Not set'}`);
      console.log(`   🎯 UTM Source: ${utmSource ? utmSource.value : 'Not set'}`);
      
      if (order.customer_id && order.customer_id !== 0) {
        console.log(`\n✅ SUCCESS: Order is properly associated with customer account!`);
      } else {
        console.log(`\n❌ WARNING: Order still shows as guest order`);
      }

      // Step 3: Verify Customer's Order History
      console.log(`\n📊 STEP 3: Verify Customer Order History`);
      console.log('─'.repeat(40));

      const customerOrdersResponse = await makeRequest(`/orders?customer=${customer.id}`);
      
      if (customerOrdersResponse.status === 200) {
        console.log(`✅ Customer has ${customerOrdersResponse.data.length} total orders`);
        
        customerOrdersResponse.data.forEach((customerOrder, index) => {
          console.log(`   ${index + 1}. Order #${customerOrder.number} - $${customerOrder.total} (${customerOrder.status})`);
          if (customerOrder.id === order.id) {
            console.log(`      🎯 ← This is our new test order!`);
          }
        });
      }

      console.log(`\n🎊 CUSTOMER ORDER CREATION SUCCESSFUL!`);
      console.log(`\nNow check your WooCommerce admin:`);
      console.log(`📋 Order #${order.number} should show:`);
      console.log(`   👤 Customer: ${customer.first_name} ${customer.last_name} (not Guest)`);
      console.log(`   🎯 Order Attribution: WooHeadless SDK`);
      console.log(`   📊 Origin: API/SDK integration`);
      
    } else {
      console.log(`❌ Order creation failed: ${orderResponse.status}`);
      if (orderResponse.data.message) {
        console.log(`   Error: ${orderResponse.data.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
createCustomerOrder().catch(console.error); 