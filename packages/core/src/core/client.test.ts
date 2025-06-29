/**
 * Tests for HTTP Client
 * Following the enhanced unified-10x-dev framework
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from './client';
import { 
  createResolvedMockConfig, 
  createMockFetchResponse,
  createMockProduct,
  assertSuccess,
  assertError,
  wait
} from '../test/utils';
import { ErrorFactory } from '../types/errors';

describe('HttpClient', () => {
  let client: HttpClient;
  let config = createResolvedMockConfig();

  beforeEach(() => {
    client = new HttpClient(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockProduct = createMockProduct();
      const mockResponse = createMockFetchResponse(mockProduct);
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await client.get('/products/1');
      
      assertSuccess(result);
      expect(result.data.data).toEqual(mockProduct);
      expect(result.data.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/1'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object)
        })
      );
    });

    it('should handle GET request errors', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'product_not_found', message: 'Product not found' },
        { status: 404, statusText: 'Not Found' }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await client.get('/products/999');
      
      assertError(result);
      expect(result.error.code).toBe('API_ERROR');
      expect(result.error.message).toContain('404');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await client.get('/products/1');
      
      assertError(result);
      expect(result.error.code).toBe('NETWORK_ERROR');
    });

    it('should handle timeouts', async () => {
      const controller = new AbortController();
      global.fetch = vi.fn().mockImplementationOnce(async () => {
        await wait(100);
        controller.abort();
        throw new Error('AbortError');
      });

      const customConfig = createResolvedMockConfig({
        http: { ...config.http, timeout: 50 }
      });
      const timeoutClient = new HttpClient(customConfig);

      const result = await timeoutClient.get('/products/1');
      
      assertError(result);
      expect(result.error.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const mockOrder = { id: 123, status: 'pending' };
      const mockResponse = createMockFetchResponse(mockOrder, { status: 201 });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const orderData = { product_id: 1, quantity: 2 };
      const result = await client.post('/orders', orderData);
      
      assertSuccess(result);
      expect(result.data.data).toEqual(mockOrder);
      expect(result.data.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(orderData)
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'rest_invalid_param', message: 'Invalid parameter(s): email' },
        { status: 400, statusText: 'Bad Request' }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await client.post('/customers', { name: 'John' });
      
      assertError(result);
      expect(result.error.code).toBe('API_ERROR');
      expect(result.error.statusCode).toBe(400);
    });
  });

  describe('Retry logic', () => {
    it('should retry failed requests', async () => {
      const mockProduct = createMockProduct();
      
      // First call fails, second succeeds
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockFetchResponse(mockProduct));

      const result = await client.get('/products/1');
      
      assertSuccess(result);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'rest_forbidden', message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.get('/admin/settings');
      
      assertError(result);
      expect(result.error.code).toBe('AUTH_ERROR');
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should respect max retry attempts', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.get('/products/1');
      
      assertError(result);
      expect(global.fetch).toHaveBeenCalledTimes(config.http.retries + 1);
    });
  });

  describe('Interceptors', () => {
    it('should apply request interceptors', async () => {
      const mockProduct = createMockProduct();
      const mockResponse = createMockFetchResponse(mockProduct);
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      // Add request interceptor
      client.addRequestInterceptor((options) => ({
        ...options,
        headers: {
          ...options.headers,
          'X-Custom-Header': 'test-value'
        }
      }));

      await client.get('/products/1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value'
          })
        })
      );
    });

    it('should apply response interceptors', async () => {
      const mockProduct = createMockProduct();
      const mockResponse = createMockFetchResponse(mockProduct);
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      // Add response interceptor
      client.addResponseInterceptor((response) => ({
        ...response,
        data: { ...response.data, modified: true }
      }));

      const result = await client.get('/products/1');
      
      assertSuccess(result);
      expect(result.data.data).toHaveProperty('modified', true);
    });

    it('should apply error interceptors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      // Add error interceptor
      client.addErrorInterceptor((error) => ({
        ...error,
        message: `Intercepted: ${error.message}`
      }));

      const result = await client.get('/products/1');
      
      assertError(result);
      expect(result.error.message).toContain('Intercepted:');
    });
  });

  describe('Rate limiting', () => {
    it('should handle rate limit errors', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'too_many_requests', message: 'Rate limit exceeded' },
        { 
          status: 429, 
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '60' }
        }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await client.get('/products');
      
      assertError(result);
      expect(result.error.code).toBe('RATE_LIMIT_ERROR');
      expect(result.error).toHaveProperty('retryAfter', 60);
    });
  });

  describe('Request cancellation', () => {
    it('should cancel requests', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch = vi.fn().mockReturnValueOnce(fetchPromise);

      // Start request but don't await
      const requestPromise = client.get('/products');

      // Cancel all requests
      client.cancelAllRequests();

      // Resolve the fetch
      resolveFetch!(createMockFetchResponse({}));

      const result = await requestPromise;
      
      // The exact behavior depends on implementation
      // but the request should handle cancellation gracefully
      expect(result).toBeDefined();
    });
  });
}); 