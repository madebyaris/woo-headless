/**
 * Product management module for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  WooCommerceProduct, 
  ProductVariation,
  ProductSchema
} from '../../types/commerce';
import { PaginationConfig, SortConfig, Filter } from '../../types/config';

/**
 * Product list parameters
 */
export interface ProductListParams {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly category?: number | string;
  readonly tag?: number | string;
  readonly status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
  readonly featured?: boolean;
  readonly inStock?: boolean;
  readonly onSale?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
  readonly order?: 'asc' | 'desc';
  readonly include?: number[];
  readonly exclude?: number[];
  readonly parent?: number[];
  readonly offset?: number;
}

/**
 * Product list response with pagination metadata
 */
export interface ProductListResponse {
  readonly products: readonly WooCommerceProduct[];
  readonly totalProducts: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly perPage: number;
}

/**
 * Variation list parameters
 */
export interface VariationListParams {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly inStock?: boolean;
  readonly onSale?: boolean;
}

/**
 * Product service class
 */
export class ProductService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;

  constructor(client: HttpClient, cache: CacheManager) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * List products with filtering and pagination
   */
  async list(params: ProductListParams = {}): Promise<Result<ProductListResponse, WooError>> {
    try {
      // Validate parameters
      const validationResult = this.validateListParams(params);
      if (!validationResult.success) {
        return validationResult;
      }

      // Build query parameters
      const queryParams = this.buildQueryParams(params);
      const cacheKey = `products:list:${JSON.stringify(queryParams)}`;

      // Check cache
      const cachedResult = await this.cache.get<ProductListResponse>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Make API request
      const response = await this.client.get<WooCommerceProduct[]>(
        `/products?${new URLSearchParams(queryParams as any).toString()}`
      );

      if (!response.success) {
        return response;
      }

      // Extract pagination from headers
      const totalProducts = parseInt(response.data.headers['x-wp-total'] || '0');
      const totalPages = parseInt(response.data.headers['x-wp-totalpages'] || '0');

      // Validate response data
      const products: WooCommerceProduct[] = [];
      for (const product of response.data.data) {
        try {
          const validated = ProductSchema.parse(product);
          products.push(validated as WooCommerceProduct);
        } catch (error) {
          // Skip invalid product but continue
          // In production, this would be logged via the debug config
        }
      }

      const result: ProductListResponse = {
        products,
        totalProducts,
        totalPages,
        currentPage: params.page || 1,
        perPage: params.limit || 10
      };

      // Cache the result
      await this.cache.set(cacheKey, result);

      return Ok(result);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to list products',
        500,
        error
      ));
    }
  }

  /**
   * Get a single product by ID
   */
  async get(productId: number): Promise<Result<WooCommerceProduct, WooError>> {
    try {
      // Validate product ID
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError('Invalid product ID'));
      }

      const cacheKey = `products:single:${productId}`;

      // Check cache
      const cachedResult = await this.cache.get<WooCommerceProduct>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Make API request
      const response = await this.client.get<WooCommerceProduct>(`/products/${productId}`);

      if (!response.success) {
        // Transform 404 to specific product not found error
        if (response.error.statusCode === 404) {
          return Err(ErrorFactory.productNotFoundError(productId));
        }
        return response;
      }

      // Validate response
      try {
        const validated = ProductSchema.parse(response.data.data);
        const product = validated as WooCommerceProduct;

        // Cache the result
        await this.cache.set(cacheKey, product);

        return Ok(product);
      } catch (error) {
        return Err(ErrorFactory.validationError(
          'Invalid product data received from API',
          error
        ));
      }
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get product',
        500,
        error
      ));
    }
  }

  /**
   * Get product by slug
   */
  async getBySlug(slug: string): Promise<Result<WooCommerceProduct, WooError>> {
    try {
      // Validate slug
      if (!slug || slug.trim().length === 0) {
        return Err(ErrorFactory.validationError('Invalid product slug'));
      }

      const result = await this.list({ 
        search: slug,
        limit: 1 
      });

      if (!result.success) {
        return result;
      }

      const product = result.data.products.find(p => p.slug === slug);
      if (!product) {
        return Err(ErrorFactory.productNotFoundError(slug));
      }

      return Ok(product);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get product by slug',
        500,
        error
      ));
    }
  }

  /**
   * Get product variations
   */
  async getVariations(
    productId: number, 
    params: VariationListParams = {}
  ): Promise<Result<ProductVariation[], WooError>> {
    try {
      // Validate product ID
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError('Invalid product ID'));
      }

      const queryParams = this.buildVariationQueryParams(params);
      const cacheKey = `products:${productId}:variations:${JSON.stringify(queryParams)}`;

      // Check cache
      const cachedResult = await this.cache.get<ProductVariation[]>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Make API request
      const response = await this.client.get<ProductVariation[]>(
        `/products/${productId}/variations?${new URLSearchParams(queryParams as any).toString()}`
      );

      if (!response.success) {
        return response;
      }

      // Cache the result
      await this.cache.set(cacheKey, response.data.data);

      return Ok(response.data.data);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get product variations',
        500,
        error
      ));
    }
  }

  /**
   * Search products by keyword
   */
  async search(
    query: string, 
    params: Omit<ProductListParams, 'search'> = {}
  ): Promise<Result<ProductListResponse, WooError>> {
    if (!query || query.trim().length === 0) {
      return Err(ErrorFactory.validationError('Search query cannot be empty'));
    }

    return this.list({ ...params, search: query });
  }

  /**
   * Get products by category
   */
  async getByCategory(
    categoryId: number | string,
    params: Omit<ProductListParams, 'category'> = {}
  ): Promise<Result<ProductListResponse, WooError>> {
    return this.list({ ...params, category: categoryId });
  }

  /**
   * Get featured products
   */
  async getFeatured(
    params: Omit<ProductListParams, 'featured'> = {}
  ): Promise<Result<ProductListResponse, WooError>> {
    return this.list({ ...params, featured: true });
  }

  /**
   * Get on-sale products
   */
  async getOnSale(
    params: Omit<ProductListParams, 'onSale'> = {}
  ): Promise<Result<ProductListResponse, WooError>> {
    return this.list({ ...params, onSale: true });
  }

  /**
   * Validate list parameters
   */
  private validateListParams(params: ProductListParams): Result<void, WooError> {
    // Validate pagination
    if (params.page !== undefined && params.page < 1) {
      return Err(ErrorFactory.validationError('Page must be greater than 0'));
    }

    if (params.limit !== undefined && (params.limit < 1 || params.limit > 100)) {
      return Err(ErrorFactory.validationError('Limit must be between 1 and 100'));
    }

    // Validate price range
    if (params.minPrice !== undefined && params.minPrice < 0) {
      return Err(ErrorFactory.validationError('Min price cannot be negative'));
    }

    if (params.maxPrice !== undefined && params.maxPrice < 0) {
      return Err(ErrorFactory.validationError('Max price cannot be negative'));
    }

    if (
      params.minPrice !== undefined && 
      params.maxPrice !== undefined && 
      params.minPrice > params.maxPrice
    ) {
      return Err(ErrorFactory.validationError('Min price cannot be greater than max price'));
    }

    return Ok(undefined);
  }

  /**
   * Build query parameters for product list
   */
  private buildQueryParams(params: ProductListParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.per_page = params.limit.toString();
    if (params.search) queryParams.search = params.search;
    if (params.category) queryParams.category = params.category.toString();
    if (params.tag) queryParams.tag = params.tag.toString();
    if (params.status) queryParams.status = params.status;
    if (params.featured !== undefined) queryParams.featured = params.featured.toString();
    if (params.onSale !== undefined) queryParams.on_sale = params.onSale.toString();
    if (params.orderby) queryParams.orderby = params.orderby;
    if (params.order) queryParams.order = params.order;
    if (params.offset) queryParams.offset = params.offset.toString();

    // Handle stock status
    if (params.inStock !== undefined) {
      queryParams.stock_status = params.inStock ? 'instock' : 'outofstock';
    }

    // Handle price filters (requires custom handling in WooCommerce)
    if (params.minPrice !== undefined) {
      queryParams.min_price = params.minPrice.toString();
    }
    if (params.maxPrice !== undefined) {
      queryParams.max_price = params.maxPrice.toString();
    }

    // Handle array parameters
    if (params.include?.length) {
      queryParams.include = params.include.join(',');
    }
    if (params.exclude?.length) {
      queryParams.exclude = params.exclude.join(',');
    }
    if (params.parent?.length) {
      queryParams.parent = params.parent.join(',');
    }

    return queryParams;
  }

  /**
   * Build query parameters for variation list
   */
  private buildVariationQueryParams(params: VariationListParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.per_page = params.limit.toString();
    if (params.search) queryParams.search = params.search;
    if (params.status) queryParams.status = params.status;
    if (params.onSale !== undefined) queryParams.on_sale = params.onSale.toString();

    if (params.inStock !== undefined) {
      queryParams.stock_status = params.inStock ? 'instock' : 'outofstock';
    }

    if (params.minPrice !== undefined) {
      queryParams.min_price = params.minPrice.toString();
    }
    if (params.maxPrice !== undefined) {
      queryParams.max_price = params.maxPrice.toString();
    }

    return queryParams;
  }
} 