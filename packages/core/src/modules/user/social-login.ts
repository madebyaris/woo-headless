/**
 * Social Login Integration Service for WooCommerce Headless SDK
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { UserProfile, UserAuthContext } from '../../types/user';

/**
 * Social login provider types
 */
export type SocialProvider = 'google' | 'facebook' | 'apple' | 'twitter' | 'linkedin';

/**
 * Social login configuration
 */
export interface SocialLoginConfig {
  readonly enabled: boolean;
  readonly providers: {
    readonly google?: GoogleOAuthConfig;
    readonly facebook?: FacebookOAuthConfig;
    readonly apple?: AppleSignInConfig;
    readonly twitter?: TwitterOAuthConfig;
    readonly linkedin?: LinkedInOAuthConfig;
  };
  readonly autoCreateAccount: boolean;
  readonly autoLinkExistingAccount: boolean;
  readonly requireEmailVerification: boolean;
  readonly redirectUrls: {
    readonly success: string;
    readonly error: string;
    readonly cancel: string;
  };
}

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig {
  readonly enabled: boolean;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
  readonly prompt?: 'none' | 'consent' | 'select_account';
}

/**
 * Facebook OAuth configuration
 */
export interface FacebookOAuthConfig {
  readonly enabled: boolean;
  readonly appId: string;
  readonly appSecret: string;
  readonly scopes: readonly string[];
  readonly version: string;
}

/**
 * Apple Sign-In configuration
 */
export interface AppleSignInConfig {
  readonly enabled: boolean;
  readonly clientId: string;
  readonly teamId: string;
  readonly keyId: string;
  readonly privateKey: string;
  readonly scopes: readonly string[];
}

/**
 * Twitter OAuth configuration
 */
export interface TwitterOAuthConfig {
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly scopes: readonly string[];
}

/**
 * LinkedIn OAuth configuration
 */
export interface LinkedInOAuthConfig {
  readonly enabled: boolean;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
}

/**
 * Social login initiation request
 */
export interface SocialLoginRequest {
  readonly provider: SocialProvider;
  readonly returnUrl?: string;
  readonly state?: string;
  readonly codeChallenge?: string;
  readonly codeChallengeMethod?: 'S256' | 'plain';
}

/**
 * Social login initiation response
 */
export interface SocialLoginResponse {
  readonly authUrl: string;
  readonly state: string;
  readonly codeVerifier?: string;
  readonly expiresAt: Date;
}

/**
 * Social login callback request
 */
export interface SocialLoginCallbackRequest {
  readonly provider: SocialProvider;
  readonly code: string;
  readonly state: string;
  readonly codeVerifier?: string;
  readonly error?: string;
  readonly errorDescription?: string;
}

/**
 * Social login callback response
 */
export interface SocialLoginCallbackResponse {
  readonly success: boolean;
  readonly userProfile: UserProfile;
  readonly authContext: UserAuthContext;
  readonly isNewAccount: boolean;
  readonly linkedAccounts: readonly SocialAccountLink[];
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresAt?: Date;
}

/**
 * Social account link
 */
export interface SocialAccountLink {
  readonly provider: SocialProvider;
  readonly providerId: string;
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly linkedAt: Date;
  readonly lastUsed: Date;
}

/**
 * Social profile data from provider
 */
export interface SocialProfileData {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly avatar?: string;
  readonly locale?: string;
  readonly verified?: boolean;
  readonly provider: SocialProvider;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: Date;
}

/**
 * Account linking request
 */
export interface AccountLinkingRequest {
  readonly userId: number;
  readonly provider: SocialProvider;
  readonly socialProfile: SocialProfileData;
  readonly overwriteExisting?: boolean;
}

/**
 * Account unlinking request
 */
export interface AccountUnlinkingRequest {
  readonly userId: number;
  readonly provider: SocialProvider;
}

/**
 * Social login service
 */
export class SocialLoginService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: SocialLoginConfig;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: SocialLoginConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Initiate social login
   */
  async initiateSocialLogin(request: SocialLoginRequest): Promise<Result<SocialLoginResponse, WooError>> {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'Social login is disabled',
          'Enable social login in configuration to use this feature'
        ));
      }

      const providerConfig = this.getProviderConfig(request.provider);
      if (!providerConfig || !providerConfig.enabled) {
        return Err(ErrorFactory.configurationError(
          `${request.provider} login is not configured or disabled`
        ));
      }

      // Generate state for CSRF protection
      const state = request.state || this.generateState();
      
      // Generate PKCE parameters for security
      const { codeVerifier, codeChallenge } = this.generatePKCE();

      // Build authorization URL based on provider
      const authUrl = await this.buildAuthorizationUrl(request.provider, {
        state,
        codeChallenge: request.codeChallenge || codeChallenge,
        codeChallengeMethod: request.codeChallengeMethod || 'S256',
        returnUrl: request.returnUrl
      });

      // Store state and verifier for later validation
      await this.storeAuthState(state, {
        provider: request.provider,
        codeVerifier: request.codeVerifier || codeVerifier,
        returnUrl: request.returnUrl,
        createdAt: new Date()
      });

      return Ok({
        authUrl,
        state,
        codeVerifier: request.codeVerifier || codeVerifier,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to initiate social login',
        500,
        error
      ));
    }
  }

  /**
   * Handle social login callback
   */
  async handleSocialLoginCallback(request: SocialLoginCallbackRequest): Promise<Result<SocialLoginCallbackResponse, WooError>> {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'Social login is disabled'
        ));
      }

      // Handle error from provider
      if (request.error) {
        return Err(ErrorFactory.validationError(
          `Social login failed: ${request.error}`,
          request.errorDescription
        ));
      }

      // Validate state
      const stateData = await this.getAuthState(request.state);
      if (!stateData) {
        return Err(ErrorFactory.validationError(
          'Invalid or expired state parameter'
        ));
      }

      if (stateData.provider !== request.provider) {
        return Err(ErrorFactory.validationError(
          'Provider mismatch in callback'
        ));
      }

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(
        request.provider,
        request.code,
        request.codeVerifier || stateData.codeVerifier
      );

      if (!tokenResult.success) {
        return tokenResult;
      }

      const tokens = tokenResult.data;

      // Get user profile from provider
      const profileResult = await this.getSocialProfile(request.provider, tokens.accessToken);
      if (!profileResult.success) {
        return profileResult;
      }

      const socialProfile = profileResult.data;

      // Find or create user account
      const accountResult = await this.findOrCreateAccount(socialProfile);
      if (!accountResult.success) {
        return accountResult;
      }

      const { userProfile, isNewAccount } = accountResult.data;

      // Link social account to user
      await this.linkSocialAccount(userProfile.id, socialProfile);

      // Get linked accounts
      const linkedAccounts = await this.getLinkedAccounts(userProfile.id);

      // Create auth context
      const authContext: UserAuthContext = {
        userId: userProfile.id,
        email: userProfile.email,
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        sessionId: this.generateSessionId(),
        expiresAt: tokens.expiresAt,
        permissions: ['read:profile', 'write:profile']
      };

      // Clean up auth state
      await this.removeAuthState(request.state);

      return Ok({
        success: true,
        userProfile,
        authContext,
        isNewAccount,
        linkedAccounts,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to handle social login callback',
        500,
        error
      ));
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(request: AccountLinkingRequest): Promise<Result<SocialAccountLink, WooError>> {
    try {
      // Check if account is already linked
      const existingLinks = await this.getLinkedAccounts(request.userId);
      const existingLink = existingLinks.find(link => link.provider === request.provider);

      if (existingLink && !request.overwriteExisting) {
        return Err(ErrorFactory.validationError(
          `${request.provider} account is already linked to this user`
        ));
      }

      // Create social account link
      const link: SocialAccountLink = {
        provider: request.provider,
        providerId: request.socialProfile.id,
        email: request.socialProfile.email,
        name: request.socialProfile.name,
        avatar: request.socialProfile.avatar,
        linkedAt: new Date(),
        lastUsed: new Date()
      };

      // Store link in user meta
      await this.storeSocialAccountLink(request.userId, link);

      return Ok(link);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to link social account',
        500,
        error
      ));
    }
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(request: AccountUnlinkingRequest): Promise<Result<void, WooError>> {
    try {
      const linkedAccounts = await this.getLinkedAccounts(request.userId);
      const accountToUnlink = linkedAccounts.find(link => link.provider === request.provider);

      if (!accountToUnlink) {
        return Err(ErrorFactory.validationError(
          `${request.provider} account is not linked to this user`
        ));
      }

      // Remove the link
      const updatedLinks = linkedAccounts.filter(link => link.provider !== request.provider);
      await this.storeSocialAccountLinks(request.userId, updatedLinks);

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to unlink social account',
        500,
        error
      ));
    }
  }

  /**
   * Get linked social accounts for user
   */
  async getLinkedAccounts(userId: number): Promise<readonly SocialAccountLink[]> {
    try {
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        const linksJson = meta._social_account_links;
        return linksJson ? JSON.parse(linksJson) : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Refresh social login tokens
   */
  async refreshSocialTokens(provider: SocialProvider, _refreshToken: string): Promise<Result<{ accessToken: string; refreshToken?: string; expiresAt?: Date }, WooError>> {
    try {
      const providerConfig = this.getProviderConfig(provider);
      if (!providerConfig) {
        return Err(ErrorFactory.configurationError(
          `${provider} is not configured`
        ));
      }

      // Implementation would depend on provider
      // For now, return placeholder
      return Ok({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to refresh social tokens',
        500,
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Get provider configuration
   */
  private getProviderConfig(provider: SocialProvider): any {
    return this.config.providers[provider];
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * Generate PKCE parameters
   */
  private generatePKCE(): { _codeVerifier: string; codeChallenge: string } {
    const codeVerifier = this.generateRandomString(128);
    const codeChallenge = this.base64URLEncode(this.sha256(codeVerifier));
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Simple SHA256 implementation (in real implementation, use crypto library)
   */
  private sha256(plain: string): string {
    // This is a placeholder - in real implementation, use proper crypto
    return btoa(plain).replace(/[+/=]/g, '');
  }

  /**
   * Base64 URL encode
   */
  private base64URLEncode(str: string): string {
    return btoa(str).replace(/[+/=]/g, (match) => {
      switch (match) {
        case '+': return '-';
        case '/': return '_';
        case '=': return '';
        default: return match;
      }
    });
  }

  /**
   * Build authorization URL for provider
   */
  private async buildAuthorizationUrl(provider: SocialProvider, params: {
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    returnUrl?: string;
  }): Promise<string> {
    const config = this.getProviderConfig(provider);
    const baseUrls = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
      apple: 'https://appleid.apple.com/auth/authorize',
      twitter: 'https://twitter.com/i/oauth2/authorize',
      linkedin: 'https://www.linkedin.com/oauth/v2/authorization'
    };

    const redirectUri = this.config.redirectUrls.success;
    const baseUrl = baseUrls[provider];
    
    const urlParams = new URLSearchParams({
      client_id: config.clientId || config.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod
    });

    // Add provider-specific parameters
    switch (provider) {
      case 'google':
        urlParams.append('scope', config.scopes.join(' '));
        if (config.prompt) urlParams.append('prompt', config.prompt);
        break;
      case 'facebook':
        urlParams.append('scope', config.scopes.join(','));
        break;
      case 'apple':
        urlParams.append('scope', config.scopes.join(' '));
        urlParams.append('response_mode', 'form_post');
        break;
      case 'twitter':
        urlParams.append('scope', config.scopes.join(' '));
        break;
      case 'linkedin':
        urlParams.append('scope', config.scopes.join(' '));
        break;
    }

    return `${baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Store auth state for validation
   */
  private async storeAuthState(state: string, data: any): Promise<void> {
    const cacheKey = `social_auth_state:${state}`;
    await this.cache.set(cacheKey, data, 10 * 60); // 10 minutes
  }

  /**
   * Get auth state
   */
  private async getAuthState(state: string): Promise<any> {
    try {
      const cacheKey = `social_auth_state:${state}`;
      const cached = await this.cache.get(cacheKey);
      return cached.success ? cached.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Remove auth state
   */
  private async removeAuthState(state: string): Promise<void> {
    try {
      const cacheKey = `social_auth_state:${state}`;
      await this.cache.delete(cacheKey);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    provider: SocialProvider,
    code: string,
    _codeVerifier: string
  ): Promise<Result<{ accessToken: string; refreshToken?: string; expiresAt?: Date }, WooError>> {
    try {
      // This would implement actual token exchange for each provider
      // For now, return placeholder
      return Ok({
        accessToken: `${provider}_access_token_${code}`,
        refreshToken: `${provider}_refresh_token_${code}`,
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to exchange code for tokens',
        500,
        error
      ));
    }
  }

  /**
   * Get social profile from provider
   */
  private async getSocialProfile(provider: SocialProvider, accessToken: string): Promise<Result<SocialProfileData, WooError>> {
    try {
      // This would implement actual profile fetching for each provider
      // For now, return placeholder
      const profile: SocialProfileData = {
        id: `${provider}_user_123`,
        email: `user@${provider}.com`,
        name: `${provider} User`,
        firstName: `${provider}`,
        lastName: 'User',
        avatar: `https://avatar.${provider}.com/user.jpg`,
        locale: 'en',
        verified: true,
        provider,
        accessToken
      };

      return Ok(profile);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get social profile',
        500,
        error
      ));
    }
  }

  /**
   * Find or create user account
   */
  private async findOrCreateAccount(socialProfile: SocialProfileData): Promise<Result<{ userProfile: UserProfile; isNewAccount: boolean }, WooError>> {
    try {
      // Try to find existing user by email
      const existingUserResponse = await this.client.get<any>('/wp/v2/users', {
        search: socialProfile.email
      });

      if (existingUserResponse.success && existingUserResponse.data.data.length > 0) {
        // User exists, return existing profile
        const userData = existingUserResponse.data.data[0];
        const userProfile: UserProfile = {
          id: userData.id,
          wordpressUserId: userData.id,
          username: userData.username || userData.slug,
          email: userData.email,
          firstName: userData.first_name || socialProfile.firstName || '',
          lastName: userData.last_name || socialProfile.lastName || '',
          displayName: userData.display_name || socialProfile.name,
          avatar: socialProfile.avatar,
          roles: userData.roles || ['customer'],
          status: 'active',
          dateRegistered: userData.date || new Date().toISOString(),
          isEmailVerified: true, // Assume verified if coming from social login
          isPhoneVerified: false
        };

        return Ok({ userProfile, isNewAccount: false });
      }

      // Create new user if auto-create is enabled
      if (!this.config.autoCreateAccount) {
        return Err(ErrorFactory.validationError(
          'User account not found and auto-creation is disabled'
        ));
      }

      // Create new user
      const newUserData = {
        username: this.generateUsername(socialProfile.email),
        email: socialProfile.email,
        first_name: socialProfile.firstName || '',
        last_name: socialProfile.lastName || '',
        display_name: socialProfile.name,
        roles: ['customer']
      };

      const createUserResponse = await this.client.post('/wp/v2/users', newUserData);
      if (!createUserResponse.success) {
        return createUserResponse;
      }

      const createdUser = createUserResponse.data.data;
      const userProfile: UserProfile = {
        id: createdUser.id,
        wordpressUserId: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        firstName: createdUser.first_name || '',
        lastName: createdUser.last_name || '',
        displayName: createdUser.display_name,
        avatar: socialProfile.avatar,
        roles: createdUser.roles || ['customer'],
        status: 'active',
        dateRegistered: createdUser.date || new Date().toISOString(),
        isEmailVerified: true, // Auto-verified for social login
        isPhoneVerified: false
      };

      return Ok({ userProfile, isNewAccount: true });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to find or create user account',
        500,
        error
      ));
    }
  }

  /**
   * Generate unique username from email
   */
  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0].toLowerCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${baseUsername}_${timestamp}`;
  }

  /**
   * Store social account link
   */
  private async storeSocialAccountLink(userId: number, link: SocialAccountLink): Promise<void> {
    const existingLinks = await this.getLinkedAccounts(userId);
    const updatedLinks = existingLinks.filter(l => l.provider !== link.provider);
    updatedLinks.push(link);
    await this.storeSocialAccountLinks(userId, updatedLinks);
  }

  /**
   * Store social account links
   */
  private async storeSocialAccountLinks(userId: number, links: readonly SocialAccountLink[]): Promise<void> {
    try {
      await this.client.post(`/wp/v2/users/${userId}`, {
        meta: {
          '_social_account_links': JSON.stringify(links)
        }
      });
    } catch (error) {
      console.warn('Failed to store social account links:', error);
    }
  }
}

/**
 * Default social login configuration
 */
export const DEFAULT_SOCIAL_LOGIN_CONFIG: SocialLoginConfig = {
  enabled: false,
  providers: {},
  autoCreateAccount: true,
  autoLinkExistingAccount: true,
  requireEmailVerification: false,
  redirectUrls: {
    success: '/auth/callback',
    error: '/auth/error',
    cancel: '/auth/cancel'
  }
};