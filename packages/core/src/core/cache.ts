/**
 * Multi-layer caching system for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { Result, Ok, Err } from '../types/result';
import { WooError, ErrorFactory } from '../types/errors';
import { CacheConfig, CacheStorageType } from '../types/config';

/**
 * Cache entry interface with metadata
 */
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly key: string;
}

/**
 * Cache storage interface
 */
export interface CacheStorage {
  get<T>(key: string): Promise<Result<T | null, WooError>>;
  set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>>;
  delete(key: string): Promise<Result<void, WooError>>;
  clear(): Promise<Result<void, WooError>>;
  has(key: string): Promise<Result<boolean, WooError>>;
  size(): Promise<Result<number, WooError>>;
}

/**
 * Memory cache implementation (L1)
 */
export class MemoryCache implements CacheStorage {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSizeMB = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  async get<T>(key: string): Promise<Result<T | null, WooError>> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (!entry) {
        return Ok(null);
      }

      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        return Ok(null);
      }

      return Ok(entry.data);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get from memory cache', error));
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>> {
    try {
      // Check size limit
      const size = this.estimateSize(value);
      if (size > this.maxSize) {
        return Err(ErrorFactory.cacheError('Value too large for cache'));
      }

      // Evict old entries if needed
      await this.evictIfNeeded(size);

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };

      this.cache.set(key, entry);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to set in memory cache', error));
    }
  }

  async delete(key: string): Promise<Result<void, WooError>> {
    try {
      this.cache.delete(key);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to delete from memory cache', error));
    }
  }

  async clear(): Promise<Result<void, WooError>> {
    try {
      this.cache.clear();
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to clear memory cache', error));
    }
  }

  async has(key: string): Promise<Result<boolean, WooError>> {
    try {
      const result = await this.get(key);
      return result.success ? Ok(result.data !== null) : result;
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to check memory cache', error));
    }
  }

  async size(): Promise<Result<number, WooError>> {
    try {
      return Ok(this.cache.size);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get memory cache size', error));
    }
  }

  private estimateSize(value: unknown): number {
    // Rough estimate of object size in bytes
    return JSON.stringify(value).length * 2; // UTF-16 characters
  }

  private async evictIfNeeded(requiredSize: number): Promise<void> {
    let currentSize = 0;
    const entries = Array.from(this.cache.entries());

    // Calculate current size
    for (const [, entry] of entries) {
      currentSize += this.estimateSize(entry.data);
    }

    // Evict oldest entries if needed (LRU)
    if (currentSize + requiredSize > this.maxSize) {
      const sortedEntries = entries.sort((a, b) => 
        (a[1] as CacheEntry<unknown>).timestamp - (b[1] as CacheEntry<unknown>).timestamp
      );

      for (const [key] of sortedEntries) {
        this.cache.delete(key);
        currentSize -= this.estimateSize(this.cache.get(key));
        
        if (currentSize + requiredSize <= this.maxSize) {
          break;
        }
      }
    }
  }
}

/**
 * LocalStorage cache implementation (L2)
 */
export class LocalStorageCache implements CacheStorage {
  private readonly prefix: string;
  private readonly maxSize: number;

  constructor(prefix = 'woo-cache', maxSizeMB = 10) {
    this.prefix = prefix;
    this.maxSize = maxSizeMB * 1024 * 1024;
  }

  async get<T>(key: string): Promise<Result<T | null, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(null);
      }

      const item = localStorage.getItem(`${this.prefix}:${key}`);
      if (!item) {
        return Ok(null);
      }

      const entry = JSON.parse(item) as CacheEntry<T>;

      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        localStorage.removeItem(`${this.prefix}:${key}`);
        return Ok(null);
      }

      return Ok(entry.data);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get from localStorage', error));
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(undefined);
      }

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };

      const serialized = JSON.stringify(entry);
      
      // Check size limit
      if (serialized.length > this.maxSize) {
        return Err(ErrorFactory.cacheError('Value too large for localStorage'));
      }

      try {
        localStorage.setItem(`${this.prefix}:${key}`, serialized);
        return Ok(undefined);
      } catch (e) {
        // Handle quota exceeded
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          await this.evictOldest();
          localStorage.setItem(`${this.prefix}:${key}`, serialized);
          return Ok(undefined);
        }
        throw e;
      }
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to set in localStorage', error));
    }
  }

  async delete(key: string): Promise<Result<void, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(undefined);
      }

      localStorage.removeItem(`${this.prefix}:${key}`);
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to delete from localStorage', error));
    }
  }

  async clear(): Promise<Result<void, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(undefined);
      }

      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      }
      return Ok(undefined);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to clear localStorage', error));
    }
  }

  async has(key: string): Promise<Result<boolean, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(false);
      }

      return Ok(localStorage.getItem(`${this.prefix}:${key}`) !== null);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to check localStorage', error));
    }
  }

  async size(): Promise<Result<number, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return Ok(0);
      }

      let count = 0;
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          count++;
        }
      }
      return Ok(count);
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get localStorage size', error));
    }
  }

  private async evictOldest(): Promise<void> {
    const entries: Array<[string, CacheEntry<unknown>]> = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(`${this.prefix}:`)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            entries.push([key, JSON.parse(item)]);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      if (entries[i]) {
        localStorage.removeItem(entries[i][0]);
      }
    }
  }
}

/**
 * IndexedDB cache implementation (L3)
 */
export class IndexedDBCache implements CacheStorage {
  private readonly dbName: string;
  private readonly storeName = 'cache';
  private readonly version = 1;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'woo-cache-db') {
    this.dbName = dbName;
  }

  private async initDB(): Promise<Result<IDBDatabase, WooError>> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return Err(ErrorFactory.cacheError('IndexedDB not available'));
      }

      if (this.db) {
        return Ok(this.db);
      }

      return new Promise((resolve) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to open IndexedDB')));
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(Ok(request.result));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to initialize IndexedDB', error));
    }
  }

  async get<T>(key: string): Promise<Result<T | null, WooError>> {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return Ok(null);
      }

      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve) => {
        const request = store.get(key);

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to get from IndexedDB')));
        };

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;
          
          if (!entry) {
            resolve(Ok(null));
            return;
          }

          // Check if expired
          if (Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key); // Clean up expired entry
            resolve(Ok(null));
            return;
          }

          resolve(Ok(entry.data));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get from IndexedDB', error));
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<Result<void, WooError>> {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }

      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        key
      };

      return new Promise((resolve) => {
        const request = store.put(entry);

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to set in IndexedDB')));
        };

        request.onsuccess = () => {
          resolve(Ok(undefined));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to set in IndexedDB', error));
    }
  }

  async delete(key: string): Promise<Result<void, WooError>> {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }

      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve) => {
        const request = store.delete(key);

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to delete from IndexedDB')));
        };

        request.onsuccess = () => {
          resolve(Ok(undefined));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to delete from IndexedDB', error));
    }
  }

  async clear(): Promise<Result<void, WooError>> {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return dbResult;
      }

      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve) => {
        const request = store.clear();

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to clear IndexedDB')));
        };

        request.onsuccess = () => {
          resolve(Ok(undefined));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to clear IndexedDB', error));
    }
  }

  async has(key: string): Promise<Result<boolean, WooError>> {
    const result = await this.get(key);
    return result.success ? Ok(result.data !== null) : result;
  }

  async size(): Promise<Result<number, WooError>> {
    try {
      const dbResult = await this.initDB();
      if (!dbResult.success) {
        return Ok(0);
      }

      const db = dbResult.data;
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve) => {
        const request = store.count();

        request.onerror = () => {
          resolve(Err(ErrorFactory.cacheError('Failed to get IndexedDB size')));
        };

        request.onsuccess = () => {
          resolve(Ok(request.result));
        };
      });
    } catch (error) {
      return Err(ErrorFactory.cacheError('Failed to get IndexedDB size', error));
    }
  }
}

/**
 * Multi-layer cache manager
 */
export class CacheManager {
  private readonly layers: Map<string, CacheStorage> = new Map();
  private readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeLayers();
  }

  private initializeLayers(): void {
    // Always include memory cache as L1
    this.layers.set('memory', new MemoryCache(this.config.maxSize));

    // Add persistent storage based on config
    if (this.config.storage === 'localStorage') {
      this.layers.set('localStorage', new LocalStorageCache(this.config.prefix, this.config.maxSize));
    } else if (this.config.storage === 'sessionStorage') {
      // SessionStorage implementation would be similar to LocalStorage
      this.layers.set('localStorage', new LocalStorageCache(this.config.prefix, this.config.maxSize));
    }

    // Add IndexedDB for large data sets
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.layers.set('indexedDB', new IndexedDBCache(this.config.prefix));
    }
  }

  /**
   * Get value from cache (checks all layers)
   */
  async get<T>(key: string): Promise<Result<T | null, WooError>> {
    if (!this.config.enabled) {
      return Ok(null);
    }

    // Check each layer in order
    for (const [layerName, layer] of this.layers) {
      const result = await layer.get<T>(key);
      
      if (result.success && result.data !== null) {
        // Promote to higher layers
        await this.promote(key, result.data, layerName);
        return result;
      }
    }

    return Ok(null);
  }

  /**
   * Set value in cache (sets in all layers)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, WooError>> {
    if (!this.config.enabled) {
      return Ok(undefined);
    }

    const finalTtl = ttl ?? this.config.ttl;
    const errors: WooError[] = [];

    // Set in all layers
    for (const layer of this.layers.values()) {
      const result = await layer.set(key, value, finalTtl);
      if (!result.success) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError('Failed to set in some cache layers', errors));
    }

    return Ok(undefined);
  }

  /**
   * Delete value from all cache layers
   */
  async delete(key: string): Promise<Result<void, WooError>> {
    const errors: WooError[] = [];

    for (const layer of this.layers.values()) {
      const result = await layer.delete(key);
      if (!result.success) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError('Failed to delete from some cache layers', errors));
    }

    return Ok(undefined);
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<Result<void, WooError>> {
    const errors: WooError[] = [];

    for (const layer of this.layers.values()) {
      const result = await layer.clear();
      if (!result.success) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return Err(ErrorFactory.cacheError('Failed to clear some cache layers', errors));
    }

    return Ok(undefined);
  }

  /**
   * Check if key exists in any cache layer
   */
  async has(key: string): Promise<Result<boolean, WooError>> {
    if (!this.config.enabled) {
      return Ok(false);
    }

    for (const layer of this.layers.values()) {
      const result = await layer.has(key);
      if (result.success && result.data) {
        return Ok(true);
      }
    }

    return Ok(false);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<Result<Record<string, number>, WooError>> {
    const stats: Record<string, number> = {};

    for (const [layerName, layer] of this.layers) {
      const sizeResult = await layer.size();
      if (sizeResult.success) {
        stats[layerName] = sizeResult.data;
      }
    }

    return Ok(stats);
  }

  /**
   * Promote value to higher cache layers
   */
  private async promote<T>(key: string, value: T, foundLayer: string): Promise<void> {
    const layerOrder = ['memory', 'localStorage', 'indexedDB'];
    const foundIndex = layerOrder.indexOf(foundLayer);

    // Promote to all layers above where it was found
    for (let i = 0; i < foundIndex; i++) {
      const layerName = layerOrder[i];
      const layer = this.layers.get(layerName);
      if (layer) {
        await layer.set(key, value, this.config.ttl);
      }
    }
  }
} 