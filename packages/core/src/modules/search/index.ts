/**
 * Advanced Search Engine for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import Fuse from 'fuse.js';
import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { WooCommerceProduct, ProductSchema } from '../../types/commerce';
import { AdvancedSearchConfig } from '../../types/config';
import {
  SearchQuery,
  SearchResults,
  SearchResultItem,
  SearchFilter,
  RangeFilter,
  SearchFacet,
  SearchSuggestion,
  SearchAggregation,
  SearchPagination,
  SearchAnalyticsEvent,
  SearchHistoryEntry,
  SearchQueryBuilder,
  SearchHighlight,
  QuickSearchParams,
  AutoCompleteRequest,
  AutoCompleteResponse,
  FilterOperator,
  SortDirection,
  SearchOperator,
  SearchQuerySchema,
  isSearchQuery
} from '../../types/search';
import { generateId } from '../../test/utils';

/**
 * Search analytics manager
 */
class SearchAnalyticsManager {
  private readonly config: AdvancedSearchConfig;
  private readonly cache: CacheManager;
  private readonly sessionId: string;
  private searchHistory: SearchHistoryEntry[] = [];

  constructor(config: AdvancedSearchConfig, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
    this.sessionId = generateId();
  }

  /**
   * Track search event
   */
  async trackEvent(event: SearchAnalyticsEvent): Promise<Result<void, WooError>> {
    try {
      if (!this.config.analytics.enabled) {
        return Ok(undefined);
      }

      // Store event in cache for batching
      const eventKey = `search-analytics:${event.type}:${Date.now()}`;
      await this.cache.set(eventKey, event);

      // Update search history for query events
      if (event.type === 'search' && event.query) {
        await this.updateSearchHistory(event.query, 0); // result count will be updated later
      }

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to track search event',
        error
      ));
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit: number = 10): Promise<Result<SearchHistoryEntry[], WooError>> {
    try {
      const cacheKey = 'search-history';
      const cachedHistory = await this.cache.get<SearchHistoryEntry[]>(cacheKey);
      
      if (cachedHistory.success && cachedHistory.data) {
        return Ok(cachedHistory.data.slice(0, limit));
      }

      return Ok([]);
    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to get search history',
        error
      ));
    }
  }

  /**
   * Update search history
   */
  private async updateSearchHistory(query: string, resultCount: number): Promise<void> {
    const entry: SearchHistoryEntry = {
      query,
      timestamp: new Date(),
      resultCount,
      clickedResults: [],
      conversions: []
    };

    this.searchHistory.unshift(entry);
    this.searchHistory = this.searchHistory.slice(0, 50); // Keep last 50 searches

    await this.cache.set('search-history', this.searchHistory);
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Search query builder implementation
 */
class SearchQueryBuilderImpl implements SearchQueryBuilder {
  private query: Partial<SearchQuery> = {
    filters: [],
    rangeFilters: [],
    sort: [],
    operator: 'AND',
    fuzzy: true,
    highlight: true,
    facets: true,
    suggestions: true,
    pagination: {
      page: 1,
      limit: 20,
      offset: 0,
      total: 0,
      totalPages: 0
    }
  };

  text(queryText: string): SearchQueryBuilder {
    this.query.text = queryText;
    return this;
  }

  filter(field: string, operator: FilterOperator, value: unknown): SearchQueryBuilder {
    const filters = [...(this.query.filters || [])];
    filters.push({ field, operator, value });
    this.query.filters = filters;
    return this;
  }

  range(field: string, min?: number, max?: number): SearchQueryBuilder {
    const rangeFilters = [...(this.query.rangeFilters || [])];
    rangeFilters.push({ field, min, max });
    this.query.rangeFilters = rangeFilters;
    return this;
  }

  category(categoryId: number | number[]): SearchQueryBuilder {
    this.query.categoryIds = Array.isArray(categoryId) ? categoryId : [categoryId];
    return this;
  }

  tag(tagId: number | number[]): SearchQueryBuilder {
    this.query.tagIds = Array.isArray(tagId) ? tagId : [tagId];
    return this;
  }

  price(min?: number, max?: number): SearchQueryBuilder {
    this.query.minPrice = min;
    this.query.maxPrice = max;
    return this;
  }

  rating(min: number): SearchQueryBuilder {
    this.query.minRating = min;
    return this;
  }

  inStock(inStock: boolean = true): SearchQueryBuilder {
    this.query.inStock = inStock;
    return this;
  }

  onSale(onSale: boolean = true): SearchQueryBuilder {
    this.query.onSale = onSale;
    return this;
  }

  featured(featured: boolean = true): SearchQueryBuilder {
    this.query.featured = featured;
    return this;
  }

  attribute(name: string, value: string | string[]): SearchQueryBuilder {
    const attributes = { ...(this.query.attributes || {}) };
    attributes[name] = value;
    this.query.attributes = attributes;
    return this;
  }

  sort(field: string, direction: SortDirection = 'asc'): SearchQueryBuilder {
    const sortFields = [...(this.query.sort || [])];
    sortFields.push({ field, direction });
    this.query.sort = sortFields;
    return this;
  }

  page(pageNum: number): SearchQueryBuilder {
    if (this.query.pagination) {
      this.query.pagination = {
        ...this.query.pagination,
        page: pageNum,
        offset: (pageNum - 1) * this.query.pagination.limit
      };
    }
    return this;
  }

  limit(limitNum: number): SearchQueryBuilder {
    if (this.query.pagination) {
      this.query.pagination = {
        ...this.query.pagination,
        limit: limitNum,
        offset: (this.query.pagination.page - 1) * limitNum
      };
    }
    return this;
  }

  fuzzy(enabled: boolean = true): SearchQueryBuilder {
    this.query.fuzzy = enabled;
    return this;
  }

  highlight(enabled: boolean = true): SearchQueryBuilder {
    this.query.highlight = enabled;
    return this;
  }

  facets(enabled: boolean = true): SearchQueryBuilder {
    this.query.facets = enabled;
    return this;
  }

  suggestions(enabled: boolean = true): SearchQueryBuilder {
    this.query.suggestions = enabled;
    return this;
  }

  build(): SearchQuery {
    // Validate and return complete query
    const completeQuery = {
      text: this.query.text,
      filters: this.query.filters || [],
      rangeFilters: this.query.rangeFilters || [],
      categoryIds: this.query.categoryIds,
      tagIds: this.query.tagIds,
      productIds: this.query.productIds,
      excludeProductIds: this.query.excludeProductIds,
      inStock: this.query.inStock,
      onSale: this.query.onSale,
      featured: this.query.featured,
      minPrice: this.query.minPrice,
      maxPrice: this.query.maxPrice,
      minRating: this.query.minRating,
      attributes: this.query.attributes,
      sort: this.query.sort || [],
      pagination: this.query.pagination!,
      operator: this.query.operator || 'AND',
      fuzzy: this.query.fuzzy !== undefined ? this.query.fuzzy : true,
      highlight: this.query.highlight !== undefined ? this.query.highlight : true,
      facets: this.query.facets !== undefined ? this.query.facets : true,
      suggestions: this.query.suggestions !== undefined ? this.query.suggestions : true
    };

    return completeQuery;
  }

  reset(): SearchQueryBuilder {
    this.query = {
      filters: [],
      rangeFilters: [],
      sort: [],
      operator: 'AND',
      fuzzy: true,
      highlight: true,
      facets: true,
      suggestions: true,
      pagination: {
        page: 1,
        limit: 20,
        offset: 0,
        total: 0,
        totalPages: 0
      }
    };
    return this;
  }
}

/**
 * Main advanced search service
 */
export class SearchService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: AdvancedSearchConfig;
  private readonly analytics: SearchAnalyticsManager;
  private fuseInstance: Fuse<WooCommerceProduct> | null = null;
  private productsIndex: WooCommerceProduct[] = [];

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: AdvancedSearchConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
    this.analytics = new SearchAnalyticsManager(config, cache);
    this.initializeFuseInstance();
  }

  /**
   * Initialize Fuse.js search index
   */
  private async initializeFuseInstance(): Promise<void> {
    try {
      // Try to load cached products index
      const cachedIndex = await this.cache.get<WooCommerceProduct[]>('search-index');
      if (cachedIndex.success && cachedIndex.data) {
        this.productsIndex = cachedIndex.data;
        this.createFuseInstance();
      } else {
        // Load initial products for index
        await this.refreshSearchIndex();
      }
    } catch (error) {
      console.warn('Failed to initialize search index:', error);
    }
  }

  /**
   * Create Fuse.js instance with configuration
   */
  private createFuseInstance(): void {
    const fuseOptions: Fuse.IFuseOptions<WooCommerceProduct> = {
      includeScore: this.config.fuzzy.includeScore,
      includeMatches: this.config.highlighting.enabled,
      threshold: this.config.fuzzy.threshold,
      distance: this.config.fuzzy.distance,
      minMatchCharLength: this.config.fuzzy.minMatchCharLength,
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'description', weight: 0.2 },
        { name: 'short_description', weight: 0.2 },
        { name: 'sku', weight: 0.3 },
        { name: 'categories.name', weight: 0.1 },
        { name: 'tags.name', weight: 0.1 }
      ]
    };

    this.fuseInstance = new Fuse(this.productsIndex, fuseOptions);
  }

  /**
   * Refresh search index with latest products
   */
  async refreshSearchIndex(): Promise<Result<void, WooError>> {
    try {
      // Fetch all products for indexing (in chunks to avoid timeout)
      const allProducts: WooCommerceProduct[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get<WooCommerceProduct[]>(
          `/products?page=${page}&per_page=${limit}&status=publish`
        );

        if (!response.success) {
          return response;
        }

        const products = response.data.data;
        if (products.length === 0) {
          hasMore = false;
        } else {
          allProducts.push(...products);
          page++;
        }

        // Prevent infinite loops
        if (page > 50) {
          break;
        }
      }

      this.productsIndex = allProducts;
      this.createFuseInstance();

      // Cache the index
      await this.cache.set('search-index', allProducts);

      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to refresh search index',
        500,
        error
      ));
    }
  }

  /**
   * Quick search with simple parameters
   */
  async quickSearch(params: QuickSearchParams): Promise<Result<SearchResults, WooError>> {
    try {
      const builder = this.createQueryBuilder();

      if (params.query) {
        builder.text(params.query);
      }

      if (params.category) {
        builder.category(params.category);
      }

      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        builder.price(params.minPrice, params.maxPrice);
      }

      if (params.inStock !== undefined) {
        builder.inStock(params.inStock);
      }

      if (params.onSale !== undefined) {
        builder.onSale(params.onSale);
      }

      if (params.featured !== undefined) {
        builder.featured(params.featured);
      }

      if (params.page !== undefined) {
        builder.page(params.page);
      }

      if (params.limit !== undefined) {
        builder.limit(params.limit);
      }

      if (params.sort) {
        const [field, direction] = params.sort.split(':');
        builder.sort(field, (direction as SortDirection) || 'asc');
      }

      return this.search(builder.build());
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to perform quick search',
        500,
        error
      ));
    }
  }

  /**
   * Advanced search with full query object
   */
  async search(query: SearchQuery): Promise<Result<SearchResults, WooError>> {
    const startTime = performance.now();

    try {
      // Validate query
      const validationResult = this.validateSearchQuery(query);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      if (this.config.caching.enabled) {
        const cachedResult = await this.cache.get<SearchResults>(cacheKey);
        if (cachedResult.success && cachedResult.data) {
          return Ok(cachedResult.data);
        }
      }

      // Track search analytics
      await this.analytics.trackEvent({
        type: 'search',
        query: query.text,
        filters: query.filters,
        timestamp: new Date(),
        sessionId: this.analytics.getSessionId()
      });

      // Perform search
      let searchResults: SearchResultItem[] = [];

      if (query.text && this.fuseInstance) {
        // Use Fuse.js for text search
        const fuseResults = this.fuseInstance.search(query.text);
        searchResults = fuseResults.map(result => ({
          item: result.item,
          score: result.score || 0,
          highlights: this.extractHighlights(result),
          matchedFields: this.extractMatchedFields(result)
        }));
      } else {
        // Use all products if no text query
        searchResults = this.productsIndex.map(product => ({
          item: product,
          score: 1.0,
          highlights: [],
          matchedFields: []
        }));
      }

      // Apply filters
      searchResults = this.applyFilters(searchResults, query);

      // Apply sorting
      searchResults = this.applySorting(searchResults, query.sort);

      // Calculate totals
      const totalHits = searchResults.length;
      const maxScore = searchResults.length > 0 ? Math.max(...searchResults.map(r => r.score)) : 0;

      // Apply pagination
      const { paginatedResults, pagination } = this.applyPagination(searchResults, query.pagination);

      // Generate facets and aggregations
      const facets = query.facets ? this.generateFacets(searchResults, query) : [];
      const aggregations = this.generateAggregations(searchResults, query);

      // Generate suggestions
      const suggestions = query.suggestions ? await this.generateSuggestions(query.text || '') : [];

      const processingTime = performance.now() - startTime;

      const results: SearchResults = {
        query,
        items: paginatedResults,
        aggregations,
        facets,
        suggestions,
        pagination,
        processingTime,
        totalHits,
        maxScore,
        debug: this.config.analytics.enabled ? {
          parsedQuery: query,
          executionStats: {
            indexSize: this.productsIndex.length,
            processingTime,
            cacheHit: false
          }
        } : undefined
      };

      // Cache results
      if (this.config.caching.enabled) {
        await this.cache.set(cacheKey, results);
      }

      return Ok(results);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Search failed',
        500,
        error
      ));
    }
  }

  /**
   * Auto-complete suggestions
   */
  async autoComplete(request: AutoCompleteRequest): Promise<Result<AutoCompleteResponse, WooError>> {
    const startTime = performance.now();

    try {
      if (request.query.length < this.config.suggestions.minQueryLength) {
        return Ok({
          query: request.query,
          suggestions: [],
          products: [],
          categories: [],
          processingTime: performance.now() - startTime
        });
      }

      const suggestions: SearchSuggestion[] = [];
      const products: WooCommerceProduct[] = [];

      if (this.fuseInstance && request.includeProducts) {
        const fuseResults = this.fuseInstance.search(request.query, {
          limit: request.limit || 5
        });

        products.push(...fuseResults.map(result => result.item));

        // Generate query suggestions based on product matches
        fuseResults.forEach(result => {
          suggestions.push({
            text: result.item.name,
            type: 'product',
            score: result.score || 0,
            metadata: { productId: result.item.id }
          });
        });
      }

      // TODO: Add category suggestions
      const categories: { id: number; name: string; count: number }[] = [];

      const response: AutoCompleteResponse = {
        query: request.query,
        suggestions: suggestions.slice(0, request.limit || 10),
        products,
        categories,
        processingTime: performance.now() - startTime
      };

      return Ok(response);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Auto-complete failed',
        500,
        error
      ));
    }
  }

  /**
   * Create query builder
   */
  createQueryBuilder(): SearchQueryBuilder {
    return new SearchQueryBuilderImpl();
  }

  /**
   * Get search analytics
   */
  async getSearchHistory(limit?: number): Promise<Result<SearchHistoryEntry[], WooError>> {
    return this.analytics.getSearchHistory(limit);
  }

  /**
   * Track search result click
   */
  async trackResultClick(productId: number, position: number, query?: string): Promise<Result<void, WooError>> {
    return this.analytics.trackEvent({
      type: 'result_click',
      query,
      productId,
      resultPosition: position,
      timestamp: new Date(),
      sessionId: this.analytics.getSessionId()
    });
  }

  // Private helper methods

  private validateSearchQuery(query: SearchQuery): Result<void, WooError> {
    try {
      SearchQuerySchema.parse(query);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Invalid search query',
        error
      ));
    }
  }

  private generateCacheKey(query: SearchQuery): string {
    const keyData = {
      text: query.text,
      filters: query.filters,
      rangeFilters: query.rangeFilters,
      sort: query.sort,
      pagination: { page: query.pagination.page, limit: query.pagination.limit }
    };
    return `search:${btoa(JSON.stringify(keyData))}`;
  }

  private extractHighlights(fuseResult: Fuse.FuseResult<WooCommerceProduct>): SearchHighlight[] {
    if (!this.config.highlighting.enabled || !fuseResult.matches) {
      return [];
    }

    return fuseResult.matches.map(match => ({
      field: match.key || '',
      matches: [{
        text: match.value || '',
        indices: match.indices || []
      }]
    }));
  }

  private extractMatchedFields(fuseResult: Fuse.FuseResult<WooCommerceProduct>): string[] {
    if (!fuseResult.matches) {
      return [];
    }

    return fuseResult.matches.map(match => match.key || '').filter(Boolean);
  }

  private applyFilters(results: SearchResultItem[], query: SearchQuery): SearchResultItem[] {
    let filteredResults = [...results];

    // Apply basic filters
    if (query.categoryIds && query.categoryIds.length > 0) {
      filteredResults = filteredResults.filter(result =>
        result.item.categories.some(cat => query.categoryIds!.includes(cat.id))
      );
    }

    if (query.inStock !== undefined) {
      filteredResults = filteredResults.filter(result =>
        query.inStock ? result.item.stock_status === 'instock' : result.item.stock_status !== 'instock'
      );
    }

    if (query.onSale !== undefined) {
      filteredResults = filteredResults.filter(result =>
        query.onSale ? result.item.on_sale : !result.item.on_sale
      );
    }

    if (query.featured !== undefined) {
      filteredResults = filteredResults.filter(result =>
        query.featured ? result.item.featured : !result.item.featured
      );
    }

    // Apply price filters
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filteredResults = filteredResults.filter(result => {
        const price = parseFloat(result.item.price) || 0;
        const minOk = query.minPrice === undefined || price >= query.minPrice;
        const maxOk = query.maxPrice === undefined || price <= query.maxPrice;
        return minOk && maxOk;
      });
    }

    // Apply custom filters
    query.filters.forEach(filter => {
      filteredResults = this.applyCustomFilter(filteredResults, filter);
    });

    // Apply range filters
    query.rangeFilters.forEach(filter => {
      filteredResults = this.applyRangeFilter(filteredResults, filter);
    });

    return filteredResults;
  }

  private applyCustomFilter(results: SearchResultItem[], filter: SearchFilter): SearchResultItem[] {
    // TODO: Implement custom filter logic based on filter.field and filter.operator
    return results;
  }

  private applyRangeFilter(results: SearchResultItem[], filter: RangeFilter): SearchResultItem[] {
    // TODO: Implement range filter logic
    return results;
  }

  private applySorting(results: SearchResultItem[], sorts: readonly { field: string; direction: SortDirection }[]): SearchResultItem[] {
    if (sorts.length === 0) {
      // Default sort by relevance score
      return results.sort((a, b) => b.score - a.score);
    }

    return results.sort((a, b) => {
      for (const sort of sorts) {
        let aValue: any;
        let bValue: any;

        switch (sort.field) {
          case 'price':
            aValue = parseFloat(a.item.price) || 0;
            bValue = parseFloat(b.item.price) || 0;
            break;
          case 'name':
            aValue = a.item.name;
            bValue = b.item.name;
            break;
          case 'date':
            aValue = new Date(a.item.date_created);
            bValue = new Date(b.item.date_created);
            break;
          case 'rating':
            aValue = parseFloat(a.item.average_rating) || 0;
            bValue = parseFloat(b.item.average_rating) || 0;
            break;
          case 'popularity':
            aValue = a.item.total_sales || 0;
            bValue = b.item.total_sales || 0;
            break;
          default:
            aValue = a.score;
            bValue = b.score;
        }

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private applyPagination(
    results: SearchResultItem[], 
    pagination: SearchPagination
  ): { paginatedResults: SearchResultItem[]; pagination: SearchPagination } {
    const total = results.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedResults = results.slice(offset, offset + pagination.limit);

    return {
      paginatedResults,
      pagination: {
        ...pagination,
        total,
        totalPages,
        offset
      }
    };
  }

  private generateFacets(results: SearchResultItem[], query: SearchQuery): SearchFacet[] {
    const facets: SearchFacet[] = [];

    // TODO: Generate facets based on product attributes, categories, etc.
    // This would analyze the current result set and generate facet options

    return facets;
  }

  private generateAggregations(results: SearchResultItem[], query: SearchQuery): SearchAggregation[] {
    const aggregations: SearchAggregation[] = [];

    // Price range aggregation
    if (results.length > 0) {
      const prices = results.map(r => parseFloat(r.item.price) || 0).filter(p => p > 0);
      if (prices.length > 0) {
        aggregations.push({
          field: 'price',
          type: 'stats',
          stats: {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
            count: prices.length
          }
        });
      }
    }

    return aggregations;
  }

  private async generateSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    if (!query || query.length < this.config.suggestions.minQueryLength) {
      return suggestions;
    }

    // Get recent search history for suggestions
    const historyResult = await this.analytics.getSearchHistory(5);
    if (historyResult.success) {
      historyResult.data.forEach(entry => {
        if (entry.query.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            text: entry.query,
            type: 'query',
            score: entry.resultCount / 100, // Simple scoring based on result count
            metadata: { timestamp: entry.timestamp }
          });
        }
      });
    }

    return suggestions.slice(0, this.config.suggestions.maxSuggestions);
  }
} 