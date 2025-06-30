/**
 * Email Verification Service for WooCommerce Headless SDK
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';

/**
 * Email verification token
 */
export interface EmailVerificationToken {
  readonly token: string;
  readonly userId: number;
  readonly email: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly isUsed: boolean;
  readonly attempts: number;
}

/**
 * Email verification request
 */
export interface EmailVerificationRequest {
  readonly userId: number;
  readonly email: string;
  readonly templateType?: 'welcome' | 'change_email' | 'resend';
  readonly returnUrl?: string;
  readonly locale?: string;
}

/**
 * Email verification response
 */
export interface EmailVerificationResponse {
  readonly success: boolean;
  readonly tokenId: string;
  readonly expiresAt: Date;
  readonly message: string;
}

/**
 * Email verification confirmation request
 */
export interface EmailVerificationConfirmRequest {
  readonly token: string;
  readonly userId?: number; // Optional for additional security
}

/**
 * Email verification confirmation response
 */
export interface EmailVerificationConfirmResponse {
  readonly success: boolean;
  readonly userId: number;
  readonly email: string;
  readonly verifiedAt: Date;
  readonly message: string;
}

/**
 * Email verification status
 */
export interface EmailVerificationStatus {
  readonly userId: number;
  readonly email: string;
  readonly isVerified: boolean;
  readonly verificationDate?: Date;
  readonly pendingVerification: boolean;
  readonly lastTokenSent?: Date;
  readonly attemptsRemaining: number;
}

/**
 * Email template configuration
 */
export interface EmailTemplate {
  readonly type: 'welcome' | 'change_email' | 'resend';
  readonly subject: string;
  readonly htmlBody: string;
  readonly textBody: string;
  readonly fromEmail: string;
  readonly fromName: string;
}

/**
 * Email verification configuration
 */
export interface EmailVerificationConfig {
  readonly enabled: boolean;
  readonly tokenExpiryMinutes: number;
  readonly maxAttemptsPerDay: number;
  readonly maxResendAttempts: number;
  readonly resendCooldownMinutes: number;
  readonly baseUrl: string;
  readonly verificationPath: string;
  readonly autoVerifyOnRegistration: boolean;
  readonly requireVerificationForPurchase: boolean;
  readonly emailService: {
    readonly provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'custom';
    readonly apiKey?: string;
    readonly apiUrl?: string;
    readonly fromEmail: string;
    readonly fromName: string;
  };
  readonly templates: {
    readonly welcome: EmailTemplate;
    readonly changeEmail: EmailTemplate;
    readonly resend: EmailTemplate;
  };
}

/**
 * Email verification service
 */
export class EmailVerificationService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: EmailVerificationConfig;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: EmailVerificationConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Send email verification
   */
  async sendVerification(request: EmailVerificationRequest): Promise<Result<EmailVerificationResponse, WooError>> {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'Email verification is disabled',
          'Enable email verification in configuration to use this feature'
        ));
      }

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(request.userId, request.email);
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Generate verification token
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + (this.config.tokenExpiryMinutes * 60 * 1000));

      // Store token in cache and database
      const tokenData: EmailVerificationToken = {
        token,
        userId: request.userId,
        email: request.email,
        createdAt: new Date(),
        expiresAt,
        isUsed: false,
        attempts: 0
      };

      await this.storeVerificationToken(tokenData);

      // Send email
      const emailResult = await this.sendVerificationEmail(request, token);
      if (!emailResult.success) {
        // Clean up token if email failed
        await this.removeVerificationToken(token);
        return emailResult;
      }

      // Update rate limiting
      await this.updateRateLimit(request.userId, request.email);

      return Ok({
        success: true,
        tokenId: token,
        expiresAt,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to send verification email',
        500,
        error
      ));
    }
  }

  /**
   * Confirm email verification
   */
  async confirmVerification(request: EmailVerificationConfirmRequest): Promise<Result<EmailVerificationConfirmResponse, WooError>> {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'Email verification is disabled'
        ));
      }

      // Retrieve and validate token
      const tokenResult = await this.getVerificationToken(request.token);
      if (!tokenResult.success) {
        return Err(ErrorFactory.validationError(
          'Invalid or expired verification token'
        ));
      }

      const tokenData = tokenResult.data;

      // Check if token is already used
      if (tokenData.isUsed) {
        return Err(ErrorFactory.validationError(
          'Verification token has already been used'
        ));
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        await this.removeVerificationToken(request.token);
        return Err(ErrorFactory.validationError(
          'Verification token has expired'
        ));
      }

      // Additional user ID check if provided
      if (request.userId && request.userId !== tokenData.userId) {
        return Err(ErrorFactory.validationError(
          'Token does not match user'
        ));
      }

      // Mark email as verified in WooCommerce/WordPress
      const verificationResult = await this.markEmailAsVerified(tokenData.userId, tokenData.email);
      if (!verificationResult.success) {
        return verificationResult;
      }

      // Mark token as used
      await this.markTokenAsUsed(request.token);

      // Clear rate limiting for this user
      await this.clearRateLimit(tokenData.userId, tokenData.email);

      const verifiedAt = new Date();

      return Ok({
        success: true,
        userId: tokenData.userId,
        email: tokenData.email,
        verifiedAt,
        message: 'Email verified successfully'
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to confirm email verification',
        500,
        error
      ));
    }
  }

  /**
   * Get email verification status
   */
  async getVerificationStatus(userId: number): Promise<Result<EmailVerificationStatus, WooError>> {
    try {
      // Get user data from WordPress/WooCommerce
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (!userResponse.success) {
        return Err(ErrorFactory.apiError(
          'Failed to get user data',
          404,
          'User not found'
        ));
      }

      const userData = userResponse.data.data;
      const email = userData.email;

      // Check if email is verified (from user meta)
      const isVerified = await this.isEmailVerified(userId);
      const verificationDate = await this.getVerificationDate(userId);
      
             // Check for pending verification tokens
       const pendingTokens = await this.getPendingTokens(userId, email);
       const pendingVerification = pendingTokens.length > 0;
       const lastTokenSent: Date | undefined = pendingTokens.length > 0 
         ? pendingTokens[0].createdAt 
         : undefined;

      // Check rate limiting
      const rateLimitInfo = await this.getRateLimitInfo(userId, email);
      const attemptsRemaining = Math.max(0, this.config.maxResendAttempts - rateLimitInfo.attempts);

             const status: EmailVerificationStatus = {
         userId,
         email,
         isVerified,
         ...(verificationDate && { verificationDate }),
         pendingVerification,
         ...(lastTokenSent && { lastTokenSent }),
         attemptsRemaining
       };

       return Ok(status);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get verification status',
        500,
        error
      ));
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(userId: number): Promise<Result<EmailVerificationResponse, WooError>> {
    try {
      // Get user email
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (!userResponse.success) {
        return Err(ErrorFactory.apiError(
          'User not found',
          404
        ));
      }

      const email = userResponse.data.data.email;

      // Check if already verified
      const isVerified = await this.isEmailVerified(userId);
      if (isVerified) {
        return Err(ErrorFactory.validationError(
          'Email is already verified'
        ));
      }

      // Invalidate existing tokens
      await this.invalidateUserTokens(userId, email);

      // Send new verification
      return this.sendVerification({
        userId,
        email,
        templateType: 'resend'
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to resend verification email',
        500,
        error
      ));
    }
  }

  /**
   * Check if email verification is required for a specific action
   */
  isVerificationRequired(action: 'purchase' | 'profile_update' | 'password_change'): boolean {
    switch (action) {
      case 'purchase':
        return this.config.requireVerificationForPurchase;
      case 'profile_update':
      case 'password_change':
        return this.config.enabled;
      default:
        return false;
    }
  }

  // Private helper methods

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    const hash = this.simpleHash(`${timestamp}-${random}`);
    return `${timestamp}${random}${hash}`.substr(0, 64);
  }

  /**
   * Simple hash function for token generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Store verification token
   */
  private async storeVerificationToken(tokenData: EmailVerificationToken): Promise<Result<void, WooError>> {
    try {
      // Store in cache for quick access
      const cacheKey = `email_verification:${tokenData.token}`;
      await this.cache.set(cacheKey, tokenData, this.config.tokenExpiryMinutes * 60);

      // Store in user meta (WordPress)
      const metaKey = '_email_verification_tokens';
      const existingTokens = await this.getUserTokens(tokenData.userId);
      const updatedTokens = [...existingTokens, tokenData];

      await this.client.post(`/wp/v2/users/${tokenData.userId}`, {
        meta: {
          [metaKey]: JSON.stringify(updatedTokens)
        }
      });

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to store verification token',
        error
      ));
    }
  }

  /**
   * Get verification token
   */
  private async getVerificationToken(token: string): Promise<Result<EmailVerificationToken, WooError>> {
    try {
      // Try cache first
      const cacheKey = `email_verification:${token}`;
      const cached = await this.cache.get<EmailVerificationToken>(cacheKey);
      
      if (cached.success && cached.data) {
        return Ok(cached.data);
      }

      // Search in user meta if not in cache
      // This is a fallback and would be slower
      return Err(ErrorFactory.validationError(
        'Verification token not found'
      ));

    } catch (error) {
      return Err(ErrorFactory.cacheError(
        'Failed to retrieve verification token',
        error
      ));
    }
  }

  /**
   * Mark email as verified
   */
  private async markEmailAsVerified(userId: number, email: string): Promise<Result<void, WooError>> {
    try {
      const verificationData = {
        isEmailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        verifiedEmail: email
      };

      await this.client.post(`/wp/v2/users/${userId}`, {
        meta: {
          '_email_verified': 'true',
          '_email_verified_at': verificationData.emailVerifiedAt,
          '_verified_email': email
        }
      });

      return Ok(undefined);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to mark email as verified',
        500,
        error
      ));
    }
  }

  /**
   * Check if email is verified
   */
  private async isEmailVerified(userId: number): Promise<boolean> {
    try {
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        return meta._email_verified === 'true';
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get verification date
   */
  private async getVerificationDate(userId: number): Promise<Date | undefined> {
    try {
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        const verifiedAt = meta._email_verified_at;
        return verifiedAt ? new Date(verifiedAt) : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    request: EmailVerificationRequest,
    token: string
  ): Promise<Result<EmailVerificationResponse, WooError>> {
    try {
      const template = this.getEmailTemplate(request.templateType || 'welcome');
      const verificationUrl = this.buildVerificationUrl(token, request.returnUrl);

      const emailData = {
        to: request.email,
        subject: template.subject,
        html: this.processTemplate(template.htmlBody, {
          verificationUrl,
          userId: request.userId,
          email: request.email,
          expiryMinutes: this.config.tokenExpiryMinutes
        }),
        text: this.processTemplate(template.textBody, {
          verificationUrl,
          userId: request.userId,
          email: request.email,
          expiryMinutes: this.config.tokenExpiryMinutes
        }),
        from: {
          email: template.fromEmail,
          name: template.fromName
        }
      };

      // Send email based on provider
      const emailResult = await this.sendEmail(emailData);
      if (!emailResult.success) {
        return emailResult;
      }

      return Ok({
        success: true,
        tokenId: token,
        expiresAt: new Date(Date.now() + (this.config.tokenExpiryMinutes * 60 * 1000)),
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to send verification email',
        500,
        error
      ));
    }
  }

  /**
   * Build verification URL
   */
  private buildVerificationUrl(token: string, returnUrl?: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const path = this.config.verificationPath.replace(/^\//, '');
    let url = `${baseUrl}/${path}?token=${encodeURIComponent(token)}`;
    
    if (returnUrl) {
      url += `&return_url=${encodeURIComponent(returnUrl)}`;
    }
    
    return url;
  }

  /**
   * Get email template
   */
  private getEmailTemplate(type: 'welcome' | 'change_email' | 'resend'): EmailTemplate {
    return this.config.templates[type];
  }

  /**
   * Process email template
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return processed;
  }

  /**
   * Send email via configured provider
   */
  private async sendEmail(emailData: any): Promise<Result<EmailVerificationResponse, WooError>> {
    try {
      // This would integrate with the configured email service
      // For now, return success as placeholder
      console.log('📧 Email would be sent:', emailData.subject, 'to', emailData.to);
      
      return Ok({
        success: true,
        tokenId: 'sent',
        expiresAt: new Date(),
        message: 'Email sent successfully'
      });

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Email delivery failed',
        500,
        error
      ));
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(userId: number, email: string): Promise<Result<void, WooError>> {
    const rateLimitInfo = await this.getRateLimitInfo(userId, email);
    
    if (rateLimitInfo.attempts >= this.config.maxResendAttempts) {
      const cooldownEnd = new Date(rateLimitInfo.lastAttempt.getTime() + (this.config.resendCooldownMinutes * 60 * 1000));
      
      if (new Date() < cooldownEnd) {
        return Err(ErrorFactory.validationError(
          `Too many verification attempts. Please wait ${this.config.resendCooldownMinutes} minutes before trying again.`
        ));
      }
    }

    return Ok(undefined);
  }

  /**
   * Get rate limit info
   */
  private async getRateLimitInfo(userId: number, email: string): Promise<{ attempts: number; lastAttempt: Date }> {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      const cached = await this.cache.get<{ attempts: number; lastAttempt: string }>(cacheKey);
      
      if (cached.success && cached.data) {
        return {
          attempts: cached.data.attempts,
          lastAttempt: new Date(cached.data.lastAttempt)
        };
      }
      
      return { attempts: 0, lastAttempt: new Date(0) };
    } catch {
      return { attempts: 0, lastAttempt: new Date(0) };
    }
  }

  /**
   * Update rate limit
   */
  private async updateRateLimit(userId: number, email: string): Promise<void> {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      const currentInfo = await this.getRateLimitInfo(userId, email);
      
      const updatedInfo = {
        attempts: currentInfo.attempts + 1,
        lastAttempt: new Date().toISOString()
      };
      
      await this.cache.set(cacheKey, updatedInfo, 24 * 60 * 60); // 24 hours
    } catch (error) {
      console.warn('Failed to update rate limit:', error);
    }
  }

  /**
   * Clear rate limit
   */
  private async clearRateLimit(userId: number, email: string): Promise<void> {
    try {
      const cacheKey = `email_verification_rate_limit:${userId}:${email}`;
      await this.cache.delete(cacheKey);
    } catch (error) {
      console.warn('Failed to clear rate limit:', error);
    }
  }

  /**
   * Get user tokens
   */
  private async getUserTokens(userId: number): Promise<EmailVerificationToken[]> {
    try {
      const userResponse = await this.client.get<any>(`/wp/v2/users/${userId}`);
      if (userResponse.success) {
        const meta = userResponse.data.data.meta || {};
        const tokensJson = meta._email_verification_tokens;
        return tokensJson ? JSON.parse(tokensJson) : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get pending tokens
   */
  private async getPendingTokens(userId: number, email: string): Promise<EmailVerificationToken[]> {
    const allTokens = await this.getUserTokens(userId);
    const now = new Date();
    
    return allTokens.filter(token => 
      token.email === email &&
      !token.isUsed &&
      new Date(token.expiresAt) > now
    );
  }

  /**
   * Mark token as used
   */
  private async markTokenAsUsed(token: string): Promise<void> {
    try {
      const cacheKey = `email_verification:${token}`;
      const tokenData = await this.cache.get<EmailVerificationToken>(cacheKey);
      
      if (tokenData.success && tokenData.data) {
        const updatedToken = {
          ...tokenData.data,
          isUsed: true
        };
        
        await this.cache.set(cacheKey, updatedToken, this.config.tokenExpiryMinutes * 60);
      }
    } catch (error) {
      console.warn('Failed to mark token as used:', error);
    }
  }

  /**
   * Remove verification token
   */
  private async removeVerificationToken(token: string): Promise<void> {
    try {
      const cacheKey = `email_verification:${token}`;
      await this.cache.delete(cacheKey);
    } catch (error) {
      console.warn('Failed to remove verification token:', error);
    }
  }

  /**
   * Invalidate user tokens
   */
  private async invalidateUserTokens(userId: number, email: string): Promise<void> {
    try {
      const tokens = await this.getPendingTokens(userId, email);
      
      for (const token of tokens) {
        await this.removeVerificationToken(token.token);
      }
    } catch (error) {
      console.warn('Failed to invalidate user tokens:', error);
    }
  }
}

/**
 * Default email verification configuration
 */
export const DEFAULT_EMAIL_VERIFICATION_CONFIG: EmailVerificationConfig = {
  enabled: true,
  tokenExpiryMinutes: 60,
  maxAttemptsPerDay: 5,
  maxResendAttempts: 3,
  resendCooldownMinutes: 15,
  baseUrl: '',
  verificationPath: '/verify-email',
  autoVerifyOnRegistration: false,
  requireVerificationForPurchase: false,
  emailService: {
    provider: 'smtp',
    fromEmail: 'noreply@example.com',
    fromName: 'WooCommerce Store'
  },
  templates: {
    welcome: {
      type: 'welcome',
      subject: 'Welcome! Please verify your email address',
      htmlBody: `
        <h2>Welcome to our store!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
      textBody: `
        Welcome to our store!
        
        Please verify your email address by clicking this link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you didn't create this account, please ignore this email.
      `,
      fromEmail: 'noreply@example.com',
      fromName: 'WooCommerce Store'
    },
    changeEmail: {
      type: 'change_email',
      subject: 'Verify your new email address',
      htmlBody: `
        <h2>Email Address Change</h2>
        <p>You requested to change your email address. Please click the link below to verify your new email:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify New Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you didn't request this change, please contact support immediately.</p>
      `,
      textBody: `
        Email Address Change
        
        You requested to change your email address. Please verify your new email by clicking this link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you didn't request this change, please contact support immediately.
      `,
      fromEmail: 'noreply@example.com',
      fromName: 'WooCommerce Store'
    },
    resend: {
      type: 'resend',
      subject: 'Email verification - Resent',
      htmlBody: `
        <h2>Email Verification</h2>
        <p>Here's your requested email verification link:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>This link will expire in {{expiryMinutes}} minutes.</p>
        <p>If you continue to have issues, please contact support.</p>
      `,
      textBody: `
        Email Verification
        
        Here's your requested email verification link:
        {{verificationUrl}}
        
        This link will expire in {{expiryMinutes}} minutes.
        
        If you continue to have issues, please contact support.
      `,
      fromEmail: 'noreply@example.com',
      fromName: 'WooCommerce Store'
    }
  }
};