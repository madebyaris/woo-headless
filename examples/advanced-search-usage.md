# Advanced Search Engine Usage Examples

This document demonstrates how to use the advanced search engine in the WooCommerce Headless SDK.

## Basic Setup

```typescript
import { WooHeadless } from '@woo-headless/sdk';

const woo = new WooHeadless({
  baseURL: 'https://your-store.com',
  consumerKey: 'ck_your_consumer_key',
  consumerSecret: 'cs_your_consumer_secret',
  advancedSearch: {
    fuzzy: {
      enabled: true,
      threshold: 0.3,
      distance: 100,
      minMatchCharLength: 1,
      includeScore: true
    },
    highlighting: {
      enabled: true,
      preTag: '<mark>',
      postTag: '</mark>',
      fragmentSize: 150,
      maxFragments: 3
    },
    suggestions: {
      enabled: true,
      maxSuggestions: 10,
      minQueryLength: 2,
      showPopular: true,
      showRecent: true
    },
    caching: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxCacheSize: 100,
      cacheKey: 'search-cache'
    },
    analytics: {
      enabled: true,
      trackQueries: true,
      trackFilters: true,
      trackClicks: true,
      trackConversions: false,
      sessionTimeout: 30
    }
  }
});
```

## Quick Search Examples

### Simple Text Search
```typescript
// Basic text search
const results = await woo.search.quickSearch({
  query: 'coffee',
  limit: 20
});

if (results.success) {
  console.log(`Found ${results.data.totalHits} products`);
  results.data.items.forEach(item => {
    console.log(`${item.item.name} - $${item.item.price} (Score: ${item.score})`);
  });
}
```

### Price Range Search
```typescript
// Search within price range
const results = await woo.search.quickSearch({
  query: 'laptop',
  minPrice: 500,
  maxPrice: 1500,
  limit: 10
});

if (results.success) {
  results.data.items.forEach(item => {
    console.log(`${item.item.name} - $${item.item.price}`);
  });
}
```

### Category and Stock Filters
```typescript
// Search by category and stock status
const results = await woo.search.quickSearch({
  category: 15, // Electronics category
  inStock: true,
  featured: true,
  sort: 'price:asc',
  limit: 12
});
```

## Advanced Search with Query Builder

### Complex Query Building
```typescript
// Build complex search query
const query = woo.search.createQueryBuilder()
  .text('premium organic coffee')
  .category([15, 16]) // Coffee and Tea categories
  .price(20, 50)
  .rating(4.0)
  .inStock(true)
  .featured(false)
  .attribute('origin', ['colombia', 'ethiopia'])
  .sort('price', 'asc')
  .sort('rating', 'desc')
  .page(1)
  .limit(20)
  .fuzzy(true)
  .highlight(true)
  .facets(true)
  .suggestions(true)
  .build();

const results = await woo.search.search(query);

if (results.success) {
  console.log(`Processing time: ${results.data.processingTime}ms`);
  console.log(`Total hits: ${results.data.totalHits}`);
  console.log(`Max score: ${results.data.maxScore}`);
  
  // Display results
  results.data.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.item.name}`);
    console.log(`   Price: $${item.item.price}`);
    console.log(`   Score: ${item.score}`);
    console.log(`   Matched fields: ${item.matchedFields.join(', ')}`);
    
    // Display highlights
    if (item.highlights && item.highlights.length > 0) {
      item.highlights.forEach(highlight => {
        console.log(`   Highlight in ${highlight.field}: ${highlight.matches[0].text}`);
      });
    }
  });
  
  // Display facets
  if (results.data.facets.length > 0) {
    console.log('\nAvailable Filters:');
    results.data.facets.forEach(facet => {
      console.log(`${facet.label}:`);
      facet.options.forEach(option => {
        console.log(`  - ${option.label} (${option.count})`);
      });
    });
  }
  
  // Display suggestions
  if (results.data.suggestions.length > 0) {
    console.log('\nSuggestions:');
    results.data.suggestions.forEach(suggestion => {
      console.log(`- ${suggestion.text} (${suggestion.type})`);
    });
  }
}
```

### Manual Query Construction
```typescript
// Manually construct search query
const searchQuery = {
  text: 'wireless headphones',
  filters: [
    { field: 'brand', operator: 'in', value: ['sony', 'bose', 'apple'] },
    { field: 'color', operator: 'eq', value: 'black' }
  ],
  rangeFilters: [
    { field: 'price', min: 100, max: 500 },
    { field: 'rating', min: 4.0 }
  ],
  categoryIds: [23], // Audio category
  sort: [
    { field: 'popularity', direction: 'desc' },
    { field: 'price', direction: 'asc' }
  ],
  pagination: {
    page: 1,
    limit: 24,
    offset: 0,
    total: 0,
    totalPages: 0
  },
  operator: 'AND',
  fuzzy: true,
  highlight: true,
  facets: true,
  suggestions: true
};

const results = await woo.search.search(searchQuery);
```

## Auto-Complete and Suggestions

### Real-time Auto-Complete
```typescript
// Auto-complete for search input
const autoComplete = await woo.search.autoComplete({
  query: 'cof', // User typing
  limit: 8,
  includeProducts: true,
  includeCategories: true,
  includeBrands: true
});

if (autoComplete.success) {
  console.log('Suggestions:');
  autoComplete.data.suggestions.forEach(suggestion => {
    console.log(`- ${suggestion.text} (${suggestion.type})`);
  });
  
  console.log('Matching Products:');
  autoComplete.data.products.forEach(product => {
    console.log(`- ${product.name} ($${product.price})`);
  });
  
  console.log('Categories:');
  autoComplete.data.categories.forEach(category => {
    console.log(`- ${category.name} (${category.count} products)`);
  });
}
```

## Search Index Management

### Refresh Search Index
```typescript
// Refresh the search index with latest products
const refreshResult = await woo.search.refreshSearchIndex();

if (refreshResult.success) {
  console.log('Search index refreshed successfully');
} else {
  console.error('Failed to refresh search index:', refreshResult.error);
}
```

## Analytics and Tracking

### Track Search Events
```typescript
// Track when user clicks on a search result
await woo.search.trackResultClick(
  123, // Product ID
  1,   // Position in results (1-based)
  'coffee beans' // Original search query
);

// Get search history
const history = await woo.search.getSearchHistory(10);
if (history.success) {
  console.log('Recent searches:');
  history.data.forEach(entry => {
    console.log(`- "${entry.query}" (${entry.resultCount} results)`);
    console.log(`  Searched at: ${entry.timestamp}`);
    console.log(`  Clicked products: ${entry.clickedResults.join(', ')}`);
  });
}
```

## Error Handling

### Robust Error Handling
```typescript
const searchWithErrorHandling = async (query: string) => {
  try {
    const result = await woo.search.quickSearch({ 
      query,
      limit: 20 
    });
    
    if (!result.success) {
      switch (result.error.code) {
        case 'VALIDATION_ERROR':
          console.error('Invalid search parameters:', result.error.message);
          break;
        case 'NETWORK_ERROR':
          console.error('Network issue:', result.error.message);
          break;
        case 'API_ERROR':
          console.error('API error:', result.error.message);
          break;
        case 'CACHE_ERROR':
          console.error('Cache error:', result.error.message);
          break;
        default:
          console.error('Unknown error:', result.error.message);
      }
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
};

// Usage
const results = await searchWithErrorHandling('coffee');
if (results) {
  console.log(`Found ${results.totalHits} products`);
}
```

## Performance Optimization

### Debounced Search for Real-time Input
```typescript
// Debounced search function for search-as-you-type
let searchTimeout: NodeJS.Timeout;

const debouncedSearch = (query: string, delay: number = 300) => {
  clearTimeout(searchTimeout);
  
  searchTimeout = setTimeout(async () => {
    if (query.length >= 2) {
      const results = await woo.search.quickSearch({
        query,
        limit: 10
      });
      
      if (results.success) {
        displaySearchResults(results.data);
      }
    }
  }, delay);
};

// Use with input field
document.getElementById('search-input')?.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value;
  debouncedSearch(query);
});
```

### Pagination Example
```typescript
const paginatedSearch = async (query: string, page: number = 1) => {
  const results = await woo.search.quickSearch({
    query,
    page,
    limit: 20,
    sort: 'relevance:desc'
  });
  
  if (results.success) {
    const { pagination } = results.data;
    
    console.log(`Page ${pagination.page} of ${pagination.totalPages}`);
    console.log(`Showing ${pagination.offset + 1}-${Math.min(pagination.offset + pagination.limit, pagination.total)} of ${pagination.total} results`);
    
    return {
      items: results.data.items,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
      totalPages: pagination.totalPages,
      currentPage: pagination.page
    };
  }
  
  return null;
};
```

## Integration Examples

### React Hook Example
```typescript
import { useState, useEffect, useCallback } from 'react';
import { WooHeadless, SearchResults } from '@woo-headless/sdk';

export const useProductSearch = (woo: WooHeadless) => {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await woo.search.quickSearch({
        query,
        limit: 20,
        sort: 'relevance:desc'
      });
      
      if (result.success) {
        setResults(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [woo]);

  const autoComplete = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    
    const result = await woo.search.autoComplete({
      query,
      limit: 8,
      includeProducts: true
    });
    
    return result.success ? result.data.suggestions : [];
  }, [woo]);

  return {
    results,
    loading,
    error,
    search,
    autoComplete
  };
};
```

This advanced search engine provides comprehensive functionality for modern e-commerce search experiences with fuzzy matching, filtering, analytics, and performance optimization. 