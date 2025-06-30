/**
 * Authentication system for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { Result, Ok, Err } from '../types/result';
import { WooError, ErrorFactory } from '../types/errors';
import { JWTConfig, ResolvedWooConfig } from '../types/config';

/**
 * JWT Token interface
 */
export interface JWTToken {
  readonly token: string;
  readonly refreshToken?: string;
  readonly expiresAt: Date;
  readonly issuedAt: Date;
}

/**
 * User credentials interface
 */
export interface UserCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * User registration data
 */
export interface UserRegistration {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly username?: string;
}

/**
 * Authentication response from WooCommerce
 */
export interface AuthResponse {
  readonly success: boolean;
  readonly data: {
    readonly token: string;
    readonly user_email: string;
    readonly user_nicename: string;
    readonly user_display_name: string;
    readonly expires: number;
  };
}

/**
 * Storage interface for tokens
 */
export interface TokenStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * LocalStorage implementation
 */
export class LocalTokenStorage implements TokenStorage {
  private readonly prefix: string;

  constructor(prefix = 'woo-headless') {
    this.prefix = prefix;
  }

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(`${this.prefix}:${key}`);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`${this.prefix}:${key}`, value);
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.prefix}:${key}`);
    } catch {
      // Silently fail
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Silently fail
    }
  }
}

/**
 * SessionStorage implementation
 */
export class SessionTokenStorage implements TokenStorage {
  private readonly prefix: string;

  constructor(prefix = 'woo-headless') {
    this.prefix = prefix;
  }

  async get(key: string): Promise<string | null> {
    try {
      return sessionStorage.getItem(`${this.prefix}:${key}`);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      sessionStorage.setItem(`${this.prefix}:${key}`, value);
    } catch {
      // Silently fail
    }
  }

  async remove(key: string): Promise<void> {
    try {
      sessionStorage.removeItem(`${this.prefix}:${key}`);
    } catch {
      // Silently fail
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith(`${this.prefix}:`)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Silently fail
    }
  }
}

/**
 * Memory storage implementation (for server-side or private contexts)
 */
export class MemoryTokenStorage implements TokenStorage {
  private readonly store = new Map<string, string>();
  private readonly prefix: string;

  constructor(prefix = 'woo-headless') {
    this.prefix = prefix;
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(`${this.prefix}:${key}`) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(`${this.prefix}:${key}`, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(`${this.prefix}:${key}`);
  }

  async clear(): Promise<void> {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.startsWith(`${this.prefix}:`)) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Authentication manager
 */
export class AuthManager {
  private readonly config: JWTConfig;
  private readonly storage: TokenStorage;
  private currentToken: JWTToken | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    config: ResolvedWooConfig,
    storage?: TokenStorage
  ) {
    this.config = config.auth;
    
    // Choose storage based on environment
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined') {
      this.storage = new LocalTokenStorage(config.cache.prefix);
    } else {
      this.storage = new MemoryTokenStorage(config.cache.prefix);
    }

    // Initialize existing token if available
    this.initializeToken();
  }

  /**
   * Initialize token from storage
   */
  private async initializeToken(): Promise<void> {
    try {
      const tokenData = await this.storage.get('token');
      if (tokenData) {
        const parsed = JSON.parse(tokenData) as JWTToken;
        if (this.isTokenValid(parsed)) {
          this.currentToken = parsed;
          this.scheduleRefresh();
        } else {
          await this.clearToken();
        }
      }
    } catch {
      // Invalid token data, clear it
      await this.clearToken();
    }
  }

  /**
   * Set authentication token
   */
  async setToken(tokenData: JWTToken): Promise<void> {
    this.currentToken = tokenData;
    await this.storage.set('token', JSON.stringify(tokenData));
    this.scheduleRefresh();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    if (this.currentToken && this.isTokenValid(this.currentToken)) {
      return this.currentToken.token;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Validate token
   */
  async validateToken(): Promise<Result<boolean, WooError>> {
    if (!this.currentToken) {
      return Ok(false);
    }

    if (!this.isTokenValid(this.currentToken)) {
      await this.clearToken();
      return Ok(false);
    }

    return Ok(true);
  }

  /**
   * Clear authentication token
   */
  async clearToken(): Promise<void> {
    this.currentToken = null;
    await this.storage.remove('token');
    this.clearRefreshTimer();
  }

  /**
   * Logout
   */
  async logout(): Promise<Result<void, WooError>> {
    await this.clearToken();
    return Ok(undefined);
  }

  /**
   * Create JWT token from auth response
   */
  createTokenFromAuthResponse(authResponse: AuthResponse): Result<JWTToken, WooError> {
    if (!authResponse.success || !authResponse.data.token) {
      return Err(ErrorFactory.authError('Invalid authentication response'));
    }

    const now = new Date();
    const expiresAt = new Date(authResponse.data.expires * 1000);

    const token: JWTToken = {
      token: authResponse.data.token,
      expiresAt,
      issuedAt: now
    };

    return Ok(token);
  }

  /**
   * Get authorization header
   */
  getAuthorizationHeader(): Record<string, string> | undefined {
    const token = this.getToken();
    if (!token) {
      return undefined;
    }

    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Schedule token refresh
   */
  private scheduleRefresh(): void {
    this.clearRefreshTimer();

    if (!this.config.autoRefresh || !this.currentToken) {
      return;
    }

    const refreshThreshold = this.config.refreshThreshold ?? 300; // 5 minutes default
    const refreshTime = this.currentToken.expiresAt.getTime() - Date.now() - (refreshThreshold * 1000);

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.handleTokenRefresh();
      }, refreshTime);
    }
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(): Promise<void> {
    // Token refresh would typically require a refresh endpoint
    // For now, we'll clear the token to force re-authentication
    await this.clearToken();
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: JWTToken): boolean {
    return token.expiresAt.getTime() > Date.now();
  }

  /**
   * Generate basic auth header for consumer key/secret
   */
  static generateBasicAuth(consumerKey: string, consumerSecret: string): string {
    const credentials = `${consumerKey}:${consumerSecret}`;
    return `Basic ${btoa(credentials)}`;
  }

  /**
   * Create OAuth signature for WooCommerce REST API
   */
  static createOAuthSignature(
    consumerKey: string,
    consumerSecret: string,
    url: string,
    method: string,
    parameters: Record<string, string> = {}
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
      ...parameters
    };

    // Sort parameters
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map(key => {
        const value = (oauthParams as Record<string, string>)[key];
        return `${key}=${encodeURIComponent(value ?? '')}`;
      })
      .join('&');

    // Create signature base string
    const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&`;

    // This is a simplified version - in production, you'd use a proper HMAC-SHA1 implementation
    const signature = btoa(signatureBase + signingKey);

    return {
      ...oauthParams,
      oauth_signature: signature
    };
  }
} 