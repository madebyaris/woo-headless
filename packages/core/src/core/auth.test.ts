/**
 * Tests for AuthManager
 * Following the enhanced unified-10x-dev framework
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager, LocalTokenStorage, SessionTokenStorage, MemoryTokenStorage } from './auth';
import { 
  createResolvedMockConfig, 
  assertSuccess,
  assertError,
  wait
} from '../test/utils';

describe('AuthManager', () => {
  let authManager: AuthManager;
  let config = createResolvedMockConfig();

  beforeEach(() => {
    authManager = new AuthManager(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Management', () => {
    it('should store JWT token correctly', async () => {
      const token = {
        token: 'test-jwt-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(token);
      
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getToken()).toBe('test-jwt-token');
    });

    it('should store empty token (validation is up to API)', async () => {
      const emptyToken = {
        token: '', // Empty token - stored but may fail at API level
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(emptyToken);
      
      // AuthManager stores any token format - validation happens at API level
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getToken()).toBe('');
    });

    it('should detect expired tokens', async () => {
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        issuedAt: new Date(Date.now() - 3600000)
      };

      await authManager.setToken(expiredToken);
      
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getToken()).toBeNull();
    });

    it('should clear token successfully', async () => {
      const token = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(token);
      expect(authManager.isAuthenticated()).toBe(true);

      await authManager.clearToken();
      
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getToken()).toBeNull();
    });
  });

  describe('Authorization Headers', () => {
    it('should generate correct authorization header for JWT', async () => {
      const token = {
        token: 'test-jwt-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(token);
      
      const headers = authManager.getAuthorizationHeader();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer test-jwt-token'
      });
    });

    it('should return undefined when not authenticated', () => {
      const headers = authManager.getAuthorizationHeader();
      
      expect(headers).toBeUndefined();
    });

    it('should generate basic auth header from static method', () => {
      const basicAuth = AuthManager.generateBasicAuth('consumer_key', 'consumer_secret');
      
      expect(basicAuth).toContain('Basic');
      expect(basicAuth).toBe('Basic ' + btoa('consumer_key:consumer_secret'));
    });
  });

  describe('Token Validation', () => {
    it('should validate valid tokens', async () => {
      const token = {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(token);
      
      const result = await authManager.validateToken();
      
      assertSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should invalidate expired tokens', async () => {
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        issuedAt: new Date(Date.now() - 3600000)
      };

      await authManager.setToken(expiredToken);
      
      const result = await authManager.validateToken();
      
      assertSuccess(result);
      expect(result.data).toBe(false);
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should handle missing tokens', async () => {
      const result = await authManager.validateToken();
      
      assertSuccess(result);
      expect(result.data).toBe(false);
    });
  });

  describe('Auth Response Processing', () => {
    it('should create token from valid auth response', () => {
      const authResponse = {
        success: true,
        data: {
          token: 'jwt-token-from-server',
          user_email: 'user@example.com',
          user_nicename: 'user',
          user_display_name: 'User Name',
          expires: Math.floor((Date.now() + 3600000) / 1000)
        }
      };

      const result = authManager.createTokenFromAuthResponse(authResponse);
      
      assertSuccess(result);
      expect(result.data.token).toBe('jwt-token-from-server');
      expect(result.data.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle invalid auth response', () => {
      const invalidResponse = {
        success: false,
        data: {
          token: '',
          user_email: '',
          user_nicename: '',
          user_display_name: '',
          expires: 0
        }
      };

      const result = authManager.createTokenFromAuthResponse(invalidResponse);
      
      assertError(result);
      expect(result.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const token = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await authManager.setToken(token);
      expect(authManager.isAuthenticated()).toBe(true);

      const result = await authManager.logout();
      
      assertSuccess(result);
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Storage Strategies', () => {
    it('should work with LocalTokenStorage', async () => {
      const localStorage = new LocalTokenStorage('test');
      const localAuthManager = new AuthManager(config, localStorage);

      const token = {
        token: 'local-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await localAuthManager.setToken(token);
      
      expect(localAuthManager.isAuthenticated()).toBe(true);
    });

    it('should work with SessionTokenStorage', async () => {
      const sessionStorage = new SessionTokenStorage('test');
      const sessionAuthManager = new AuthManager(config, sessionStorage);

      const token = {
        token: 'session-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await sessionAuthManager.setToken(token);
      
      expect(sessionAuthManager.isAuthenticated()).toBe(true);
    });

    it('should work with MemoryTokenStorage', async () => {
      const memoryStorage = new MemoryTokenStorage('test');
      const memoryAuthManager = new AuthManager(config, memoryStorage);

      const token = {
        token: 'memory-token',
        expiresAt: new Date(Date.now() + 3600000),
        issuedAt: new Date()
      };

      await memoryAuthManager.setToken(token);
      
      expect(memoryAuthManager.isAuthenticated()).toBe(true);
    });
  });

  describe('OAuth Signature', () => {
    it('should create OAuth signature for WooCommerce API', () => {
      const signature = AuthManager.createOAuthSignature(
        'consumer_key',
        'consumer_secret',
        'https://example.com/wp-json/wc/v3/products',
        'GET'
      );

      expect(signature).toHaveProperty('oauth_consumer_key');
      expect(signature).toHaveProperty('oauth_signature');
      expect(signature).toHaveProperty('oauth_timestamp');
      expect(signature).toHaveProperty('oauth_nonce');
      expect(signature.oauth_consumer_key).toBe('consumer_key');
    });
  });
}); 