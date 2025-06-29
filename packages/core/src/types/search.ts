/**
 * Advanced Search Engine types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { z } from 'zod';
import { WooCommerceProduct } from './commerce';

/**
 * Search operators for query building
 */
export type SearchOperator = 'AND' | 'OR' | 'NOT';

/**
 * Filter operators for advanced filtering
 */
export type FilterOperator = 
  | 'eq'          // equals
  | 'ne'          // not equals
  | 'gt'          // greater than
  | 'gte'         // greater than or equal
  | 'lt'          // less than
  | 'lte'         // less than or equal
  | 'in'          // in array
  | 'nin'         // not in array
  | 'contains'    // string contains
  | 'startswith'  // string starts with
  | 'endswith'    // string ends with
  | 'between'     // range between two values
  | 'exists'      // field exists
  | 'empty';      // field is empty

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Search result highlight
 */
export interface SearchHighlight {
  readonly field: string;
  readonly matches: readonly {
    readonly text: string;
    readonly indices: readonly [number, number][];
  }[];
}

/**
 * Single search filter
 */
export interface SearchFilter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
  readonly label?: string;
}

/**
 * Range filter for numeric/date values
 */
export interface RangeFilter {
  readonly field: string;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly label?: string;
}

/**
 * Multi-select filter option
 */
export interface FilterOption {
  readonly value: string | number;
  readonly label: string;
  readonly count: number;
  readonly selected: boolean;
}

/**
 * Facet definition for filtering
 */
export interface SearchFacet {
  readonly field: string;
  readonly label: string;
  readonly type: 'terms' | 'range' | 'date_range' | 'boolean';
  readonly options: readonly FilterOption[];
  readonly multiSelect: boolean;
  readonly collapsed: boolean;
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  readonly text: string;
  readonly type: 'query' | 'product' | 'category' | 'brand';
  readonly score: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  readonly item: WooCommerceProduct;
  readonly score: number;
  readonly highlights?: readonly SearchHighlight[];
  readonly matchedFields: readonly string[];
}

/**
 * Search aggregation result
 */
export interface SearchAggregation {
  readonly field: string;
  readonly type: 'terms' | 'stats' | 'histogram';
  readonly buckets?: readonly {
    readonly key: string | number;
    readonly count: number;
    readonly selected: boolean;
  }[];
  readonly stats?: {
    readonly min: number;
    readonly max: number;
    readonly avg: number;
    readonly count: number;
  };
}

/**
 * Search sorting configuration
 */
export interface SearchSort {
  readonly field: string;
  readonly direction: SortDirection;
  readonly label?: string;
}

/**
 * Search pagination
 */
export interface SearchPagination {
  readonly page: number;
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
  readonly totalPages: number;
}

/**
 * Search query configuration
 */
export interface SearchQuery {
  readonly text?: string;
  readonly filters: readonly SearchFilter[];
  readonly rangeFilters: readonly RangeFilter[];
  readonly categoryIds?: readonly number[];
  readonly tagIds?: readonly number[];
  readonly productIds?: readonly number[];
  readonly excludeProductIds?: readonly number[];
  readonly inStock?: boolean;
  readonly onSale?: boolean;
  readonly featured?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minRating?: number;
  readonly attributes?: Record<string, string | string[]>;
  readonly sort: readonly SearchSort[];
  readonly pagination: SearchPagination;
  readonly operator: SearchOperator;
  readonly fuzzy: boolean;
  readonly highlight: boolean;
  readonly facets: boolean;
  readonly suggestions: boolean;
}

/**
 * Search results
 */
export interface SearchResults {
  readonly query: SearchQuery;
  readonly items: readonly SearchResultItem[];
  readonly aggregations: readonly SearchAggregation[];
  readonly facets: readonly SearchFacet[];
  readonly suggestions: readonly SearchSuggestion[];
  readonly pagination: SearchPagination;
  readonly processingTime: number; // milliseconds
  readonly totalHits: number;
  readonly maxScore: number;
  readonly debug?: {
    readonly parsedQuery: Record<string, unknown>;
    readonly executionStats: Record<string, unknown>;
  };
}

/**
 * Search analytics event
 */
export interface SearchAnalyticsEvent {
  readonly type: 'search' | 'filter' | 'sort' | 'paginate' | 'suggestion_click' | 'result_click';
  readonly query?: string;
  readonly filters?: readonly SearchFilter[];
  readonly resultPosition?: number;
  readonly productId?: number;
  readonly timestamp: Date;
  readonly sessionId: string;
  readonly userId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  readonly query: string;
  readonly timestamp: Date;
  readonly resultCount: number;
  readonly clickedResults: readonly number[]; // product IDs
  readonly conversions: readonly number[]; // product IDs that led to purchase
}

/**
 * Search configuration
 */
export interface AdvancedSearchConfig {
  readonly fuzzy: {
    readonly enabled: boolean;
    readonly threshold: number; // 0.0 = exact match, 1.0 = match anything
    readonly distance: number; // maximum Levenshtein distance
    readonly minMatchCharLength: number;
    readonly includeScore: boolean;
  };
  readonly highlighting: {
    readonly enabled: boolean;
    readonly preTag: string;
    readonly postTag: string;
    readonly fragmentSize: number;
    readonly maxFragments: number;
  };
  readonly suggestions: {
    readonly enabled: boolean;
    readonly maxSuggestions: number;
    readonly minQueryLength: number;
    readonly showPopular: boolean;
    readonly showRecent: boolean;
  };
  readonly facets: {
    readonly enabled: boolean;
    readonly maxFacets: number;
    readonly maxFacetValues: number;
    readonly minDocumentCount: number;
  };
  readonly analytics: {
    readonly enabled: boolean;
    readonly trackQueries: boolean;
    readonly trackFilters: boolean;
    readonly trackClicks: boolean;
    readonly trackConversions: boolean;
    readonly sessionTimeout: number; // minutes
  };
  readonly caching: {
    readonly enabled: boolean;
    readonly ttl: number; // milliseconds
    readonly maxCacheSize: number; // number of cached queries
    readonly cacheKey: string;
  };
  readonly performance: {
    readonly maxResults: number;
    readonly searchTimeout: number; // milliseconds
    readonly debounceDelay: number; // milliseconds for auto-complete
    readonly prefetchResults: boolean;
  };
}

/**
 * Search builder for constructing complex queries
 */
export interface SearchQueryBuilder {
  text(query: string): SearchQueryBuilder;
  filter(field: string, operator: FilterOperator, value: unknown): SearchQueryBuilder;
  range(field: string, min?: number, max?: number): SearchQueryBuilder;
  category(categoryId: number | number[]): SearchQueryBuilder;
  tag(tagId: number | number[]): SearchQueryBuilder;
  price(min?: number, max?: number): SearchQueryBuilder;
  rating(min: number): SearchQueryBuilder;
  inStock(inStock?: boolean): SearchQueryBuilder;
  onSale(onSale?: boolean): SearchQueryBuilder;
  featured(featured?: boolean): SearchQueryBuilder;
  attribute(name: string, value: string | string[]): SearchQueryBuilder;
  sort(field: string, direction?: SortDirection): SearchQueryBuilder;
  page(page: number): SearchQueryBuilder;
  limit(limit: number): SearchQueryBuilder;
  fuzzy(enabled?: boolean): SearchQueryBuilder;
  highlight(enabled?: boolean): SearchQueryBuilder;
  facets(enabled?: boolean): SearchQueryBuilder;
  suggestions(enabled?: boolean): SearchQueryBuilder;
  build(): SearchQuery;
  reset(): SearchQueryBuilder;
}

// Zod schemas for validation
export const SearchFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startswith', 'endswith', 'between', 'exists', 'empty']),
  value: z.unknown(),
  label: z.string().optional(),
});

export const RangeFilterSchema = z.object({
  field: z.string(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  label: z.string().optional(),
});

export const SearchSortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
  label: z.string().optional(),
});

export const SearchPaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  offset: z.number().min(0),
  total: z.number().min(0),
  totalPages: z.number().min(0),
});

export const SearchQuerySchema = z.object({
  text: z.string().optional(),
  filters: z.array(SearchFilterSchema),
  rangeFilters: z.array(RangeFilterSchema),
  categoryIds: z.array(z.number().positive()).optional(),
  tagIds: z.array(z.number().positive()).optional(),
  productIds: z.array(z.number().positive()).optional(),
  excludeProductIds: z.array(z.number().positive()).optional(),
  inStock: z.boolean().optional(),
  onSale: z.boolean().optional(),
  featured: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  attributes: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  sort: z.array(SearchSortSchema),
  pagination: SearchPaginationSchema,
  operator: z.enum(['AND', 'OR', 'NOT']),
  fuzzy: z.boolean(),
  highlight: z.boolean(),
  facets: z.boolean(),
  suggestions: z.boolean(),
});

export const SearchAnalyticsEventSchema = z.object({
  type: z.enum(['search', 'filter', 'sort', 'paginate', 'suggestion_click', 'result_click']),
  query: z.string().optional(),
  filters: z.array(SearchFilterSchema).optional(),
  resultPosition: z.number().positive().optional(),
  productId: z.number().positive().optional(),
  timestamp: z.date(),
  sessionId: z.string(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Type guards
export function isSearchQuery(obj: unknown): obj is SearchQuery {
  try {
    SearchQuerySchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isSearchFilter(obj: unknown): obj is SearchFilter {
  try {
    SearchFilterSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isSearchAnalyticsEvent(obj: unknown): obj is SearchAnalyticsEvent {
  try {
    SearchAnalyticsEventSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick search parameters for simple searches
 */
export interface QuickSearchParams {
  readonly query?: string;
  readonly category?: number;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly inStock?: boolean;
  readonly onSale?: boolean;
  readonly featured?: boolean;
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: string; // field:direction format, e.g., 'price:asc'
}

/**
 * Auto-complete request
 */
export interface AutoCompleteRequest {
  readonly query: string;
  readonly limit?: number;
  readonly categories?: readonly number[];
  readonly includeProducts?: boolean;
  readonly includeCategories?: boolean;
  readonly includeBrands?: boolean;
}

/**
 * Auto-complete response
 */
export interface AutoCompleteResponse {
  readonly query: string;
  readonly suggestions: readonly SearchSuggestion[];
  readonly products: readonly WooCommerceProduct[];
  readonly categories: readonly {
    readonly id: number;
    readonly name: string;
    readonly count: number;
  }[];
  readonly processingTime: number;
} 