/**
 * Tests for ProductService
 * Following the enhanced unified-10x-dev framework
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductService } from './index';
import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { 
  createResolvedMockConfig, 
  createMockProduct,
  createMockFetchResponse,
  assertSuccess,
  assertError
} from '../../test/utils';

describe('ProductService', () => {
  let productService: ProductService;
  let mockHttpClient: HttpClient;
  let mockCacheManager: CacheManager;
  let config = createResolvedMockConfig();

  beforeEach(() => {
    mockHttpClient = new HttpClient(config);
    mockCacheManager = new CacheManager(config.cache);
    productService = new ProductService(mockHttpClient, mockCacheManager);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Product Listing', () => {
    it('should list products successfully', async () => {
      const mockProducts = [
        createMockProduct({ id: 1, name: 'Product 1' }),
        createMockProduct({ id: 2, name: 'Product 2' }),
      ];
      
      const mockResponse = createMockFetchResponse({
        products: mockProducts,
        totalPages: 1,
        totalProducts: 2,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.list({
        page: 1,
        limit: 10
      });
      
      assertSuccess(result);
      expect(result.data.products).toEqual(mockProducts);
      expect(result.data.totalProducts).toBe(2);
      expect(result.data.currentPage).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const mockProducts = [createMockProduct({ id: 3, name: 'Product 3' })];
      
      const mockResponse = createMockFetchResponse({
        products: mockProducts,
        totalPages: 5,
        totalProducts: 50,
        currentPage: 3
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.list({
        page: 3,
        limit: 10
      });
      
      assertSuccess(result);
      expect(result.data.currentPage).toBe(3);
      expect(result.data.totalPages).toBe(5);
    });

    it('should handle filtering options', async () => {
      const mockResponse = createMockFetchResponse({
        products: [],
        totalPages: 0,
        totalProducts: 0,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.list({
        page: 1,
        limit: 10,
        category: 'electronics',
        inStock: true,
        featured: true,
        minPrice: 100,
        maxPrice: 500
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('products'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'woocommerce_api_error', message: 'API Error' },
        { status: 500, statusText: 'Internal Server Error' }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.list({ page: 1, limit: 10 });
      
      assertError(result);
      expect(result.error.code).toBe('API_ERROR');
    });
  });

  describe('Single Product Retrieval', () => {
    it('should get product by ID successfully', async () => {
      const mockProduct = createMockProduct({ 
        id: 123, 
        name: 'Test Product',
        price: '99.99'
      });
      
      const mockResponse = createMockFetchResponse(mockProduct);
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.get(123);
      
      assertSuccess(result);
      expect(result.data.id).toBe(123);
      expect(result.data.name).toBe('Test Product');
      expect(result.data.price).toBe('99.99');
    });

    it('should handle product not found', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'woocommerce_rest_product_invalid_id', message: 'Invalid ID.' },
        { status: 404, statusText: 'Not Found' }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.get(999999);
      
      assertError(result);
      expect(result.error.code).toBe('API_ERROR');
      expect(result.error.statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await productService.get(123);
      
      assertError(result);
      expect(result.error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('Product Search', () => {
    it('should search products successfully', async () => {
      const mockProducts = [
        createMockProduct({ id: 1, name: 'Laptop Computer' }),
        createMockProduct({ id: 2, name: 'Gaming Laptop' }),
      ];
      
      const mockResponse = createMockFetchResponse({
        products: mockProducts,
        totalPages: 1,
        totalProducts: 2,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.search('laptop', {
        limit: 20,
        category: 'electronics'
      });
      
      assertSuccess(result);
      expect(result.data.products).toEqual(mockProducts);
      expect(result.data.totalProducts).toBe(2);
    });

    it('should handle empty search results', async () => {
      const mockResponse = createMockFetchResponse({
        products: [],
        totalPages: 0,
        totalProducts: 0,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.search('nonexistentproduct');
      
      assertSuccess(result);
      expect(result.data.products).toEqual([]);
      expect(result.data.totalProducts).toBe(0);
    });

    it('should validate search query', async () => {
      const result = await productService.search('');
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle search with filters', async () => {
      const mockResponse = createMockFetchResponse({
        products: [createMockProduct()],
        totalPages: 1,
        totalProducts: 1,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.search('laptop', {
        minPrice: 500,
        maxPrice: 2000,
        inStock: true,
        orderby: 'price',
        order: 'asc'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/products.*search=laptop/),
        expect.any(Object)
      );
    });
  });

  describe('Product Variations', () => {
    it('should get product variations successfully', async () => {
      const mockVariations = [
        {
          id: 501,
          product_id: 123,
          sku: 'PROD-RED-M',
          price: '99.99',
          attributes: [
            { name: 'Color', option: 'Red' },
            { name: 'Size', option: 'M' }
          ]
        },
        {
          id: 502,
          product_id: 123,
          sku: 'PROD-BLUE-L',
          price: '109.99',
          attributes: [
            { name: 'Color', option: 'Blue' },
            { name: 'Size', option: 'L' }
          ]
        }
      ];
      
      const mockResponse = createMockFetchResponse(mockVariations);
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.getVariations(123);
      
      assertSuccess(result);
      expect(result.data).toEqual(mockVariations);
      expect(result.data).toHaveLength(2);
    });

    it('should handle product with no variations', async () => {
      const mockResponse = createMockFetchResponse([]);
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.getVariations(123);
      
      assertSuccess(result);
      expect(result.data).toEqual([]);
    });

    it('should handle invalid product ID for variations', async () => {
      const mockResponse = createMockFetchResponse(
        { code: 'woocommerce_rest_product_invalid_id', message: 'Invalid product ID.' },
        { status: 404, statusText: 'Not Found' }
      );
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const result = await productService.getVariations(999999);
      
      assertError(result);
      expect(result.error.code).toBe('API_ERROR');
    });
  });

  describe('Cache Integration', () => {
    it('should cache product results', async () => {
      const mockProduct = createMockProduct({ id: 123 });
      const mockResponse = createMockFetchResponse(mockProduct);
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      // First call
      const result1 = await productService.get(123);
      assertSuccess(result1);

      // Second call should use cache (no additional fetch)
      const result2 = await productService.get(123);
      assertSuccess(result2);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual(result2.data);
    });
  });

  describe('Input Validation', () => {
    it('should validate product ID', async () => {
      const result = await productService.get(0);
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate negative product ID', async () => {
      const result = await productService.get(-1);
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate pagination parameters', async () => {
      const result = await productService.list({
        page: 0,
        limit: 10
      });
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate limit boundaries', async () => {
      const result = await productService.list({
        page: 1,
        limit: 101 // Assuming max limit is 100
      });
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate price range', async () => {
      const result = await productService.list({
        page: 1,
        limit: 10,
        minPrice: 100,
        maxPrice: 50 // Min > Max is invalid
      });
      
      assertError(result);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Product Categories', () => {
    it('should filter by single category', async () => {
      const mockResponse = createMockFetchResponse({
        products: [createMockProduct()],
        totalPages: 1,
        totalProducts: 1,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.list({
        page: 1,
        limit: 10,
        category: 'electronics'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/category=electronics/),
        expect.any(Object)
      );
    });

    it('should filter by category ID', async () => {
      const mockResponse = createMockFetchResponse({
        products: [createMockProduct()],
        totalPages: 1,
        totalProducts: 1,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.list({
        page: 1,
        limit: 10,
        category: 123 // Category ID
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/category/),
        expect.any(Object)
      );
    });
  });

  describe('Product Ordering', () => {
    it('should order by price ascending', async () => {
      const mockResponse = createMockFetchResponse({
        products: [createMockProduct()],
        totalPages: 1,
        totalProducts: 1,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.list({
        page: 1,
        limit: 10,
        orderby: 'price',
        order: 'asc'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/orderby=price.*order=asc/),
        expect.any(Object)
      );
    });

    it('should order by date descending', async () => {
      const mockResponse = createMockFetchResponse({
        products: [createMockProduct()],
        totalPages: 1,
        totalProducts: 1,
        currentPage: 1
      });
      
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      await productService.list({
        page: 1,
        limit: 10,
        orderby: 'date',
        order: 'desc'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/orderby=date.*order=desc/),
        expect.any(Object)
      );
    });
  });
}); 