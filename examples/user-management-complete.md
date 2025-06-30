# Complete User Management Guide

This guide demonstrates the comprehensive user management features of the WooCommerce Headless SDK, including email verification and social login integration.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Email Verification](#email-verification)
3. [Social Login Integration](#social-login-integration)
4. [User Profile Management](#user-profile-management)
5. [Advanced Features](#advanced-features)

---

## Basic Setup

```typescript
import { WooHeadless } from '@woo-headless/sdk';
import { 
  EmailVerificationConfig,
  SocialLoginConfig,
  UserSyncConfig
} from '@woo-headless/sdk';

// Configure email verification
const emailVerificationConfig: EmailVerificationConfig = {
  enabled: true,
  tokenExpiryMinutes: 60,
  maxAttemptsPerDay: 5,
  maxResendAttempts: 3,
  resendCooldownMinutes: 15,
  baseUrl: 'https://your-store.com',
  verificationPath: '/verify-email',
  autoVerifyOnRegistration: false,
  requireVerificationForPurchase: true,
  emailService: {
    provider: 'sendgrid',
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: 'noreply@your-store.com',
    fromName: 'Your Store'
  },
  templates: {
    welcome: {
      type: 'welcome',
      subject: 'Welcome! Please verify your email',
      htmlBody: `
        <h2>Welcome to Your Store!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="{{verificationUrl}}" style="background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Verify Email Address
        </a>
        <p>This link expires in {{expiryMinutes}} minutes.</p>
      `,
      textBody: `
        Welcome to Your Store!
        
        Please verify your email: {{verificationUrl}}
        
        This link expires in {{expiryMinutes}} minutes.
      `,
      fromEmail: 'noreply@your-store.com',
      fromName: 'Your Store'
    },
    // ... other templates
  }
};

// Configure social login
const socialLoginConfig: SocialLoginConfig = {
  enabled: true,
  providers: {
    google: {
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scopes: ['openid', 'email', 'profile'],
      prompt: 'select_account'
    },
    facebook: {
      enabled: true,
      appId: process.env.FACEBOOK_APP_ID!,
      appSecret: process.env.FACEBOOK_APP_SECRET!,
      scopes: ['email', 'public_profile'],
      version: 'v18.0'
    },
    apple: {
      enabled: true,
      clientId: process.env.APPLE_CLIENT_ID!,
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
      scopes: ['name', 'email']
    }
  },
  autoCreateAccount: true,
  autoLinkExistingAccount: true,
  requireEmailVerification: false,
  redirectUrls: {
    success: '/auth/callback',
    error: '/auth/error',
    cancel: '/auth/cancel'
  }
};

// Configure user sync
const userSyncConfig: UserSyncConfig = {
  enabled: true,
  syncOnLogin: true,
  syncProfile: true,
  syncAddresses: true,
  syncPreferences: true,
  syncOrderHistory: true,
  syncWishlist: true,
  cacheUserData: true,
  cacheTtl: 3600 // 1 hour
};

// Initialize WooCommerce SDK
const woo = new WooHeadless({
  baseURL: 'https://your-store.com',
  consumerKey: process.env.WOO_CONSUMER_KEY!,
  consumerSecret: process.env.WOO_CONSUMER_SECRET!,
  userSync: userSyncConfig
});

// Initialize user service with email verification
const userService = new UserService(
  woo.client,
  woo.cache,
  userSyncConfig,
  emailVerificationConfig
);

// Initialize social login service
const socialLogin = new SocialLoginService(
  woo.client,
  woo.cache,
  socialLoginConfig
);
```

---

## Email Verification

### Send Welcome Verification Email

```typescript
async function sendWelcomeVerification(userId: number, email: string) {
  console.log('📧 Sending welcome verification email...');
  
  const result = await userService.sendEmailVerification({
    userId,
    email,
    templateType: 'welcome',
    returnUrl: '/dashboard',
    locale: 'en'
  });

  if (result.success) {
    console.log('✅ Verification email sent successfully');
    console.log(`📅 Token expires at: ${result.data.expiresAt}`);
    console.log(`🔑 Token ID: ${result.data.tokenId}`);
  } else {
    console.error('❌ Failed to send verification email:', result.error.message);
  }

  return result;
}
```

### Handle Email Verification Confirmation

```typescript
async function handleEmailVerification(token: string, userId?: number) {
  console.log('🔍 Confirming email verification...');
  
  const result = await userService.confirmEmailVerification({
    token,
    userId // Optional for additional security
  });

  if (result.success) {
    console.log('✅ Email verified successfully!');
    console.log(`👤 User ID: ${result.data.userId}`);
    console.log(`📧 Email: ${result.data.email}`);
    console.log(`📅 Verified at: ${result.data.verifiedAt}`);
    
    // Update user interface
    showSuccessMessage('Email verified! You can now make purchases.');
    
    // Redirect to dashboard or intended page
    window.location.href = '/dashboard';
  } else {
    console.error('❌ Email verification failed:', result.error.message);
    showErrorMessage(result.error.message);
  }

  return result;
}
```

### Check Verification Status

```typescript
async function checkVerificationStatus(userId: number) {
  console.log('🔍 Checking email verification status...');
  
  const result = await userService.getEmailVerificationStatus(userId);

  if (result.success) {
    const status = result.data;
    
    console.log(`📧 Email: ${status.email}`);
    console.log(`✅ Verified: ${status.isVerified}`);
    
    if (status.isVerified) {
      console.log(`📅 Verified on: ${status.verificationDate}`);
    } else {
      console.log(`⏳ Pending verification: ${status.pendingVerification}`);
      console.log(`🔄 Attempts remaining: ${status.attemptsRemaining}`);
      
      if (status.lastTokenSent) {
        console.log(`📤 Last token sent: ${status.lastTokenSent}`);
      }
    }
    
    return status;
  } else {
    console.error('❌ Failed to get verification status:', result.error.message);
    return null;
  }
}
```

### Resend Verification Email

```typescript
async function resendVerificationEmail(userId: number) {
  console.log('🔄 Resending verification email...');
  
  // Check current status first
  const status = await checkVerificationStatus(userId);
  
  if (status?.isVerified) {
    console.log('✅ Email is already verified');
    return;
  }
  
  if (status?.attemptsRemaining === 0) {
    console.log('⚠️ No more resend attempts remaining');
    return;
  }
  
  const result = await userService.resendEmailVerification(userId);

  if (result.success) {
    console.log('✅ Verification email resent successfully');
    console.log(`📅 New token expires at: ${result.data.expiresAt}`);
  } else {
    console.error('❌ Failed to resend verification email:', result.error.message);
  }

  return result;
}
```

---

## Social Login Integration

### Initiate Google Login

```typescript
async function initiateGoogleLogin() {
  console.log('🔐 Initiating Google login...');
  
  const result = await socialLogin.initiateSocialLogin({
    provider: 'google',
    returnUrl: '/dashboard'
  });

  if (result.success) {
    console.log('✅ Google login initiated');
    console.log(`🔗 Auth URL: ${result.data.authUrl}`);
    console.log(`🎫 State: ${result.data.state}`);
    
    // Redirect user to Google OAuth
    window.location.href = result.data.authUrl;
  } else {
    console.error('❌ Failed to initiate Google login:', result.error.message);
  }

  return result;
}
```

### Handle Social Login Callback

```typescript
async function handleSocialLoginCallback(
  provider: 'google' | 'facebook' | 'apple',
  code: string,
  state: string
) {
  console.log(`🔍 Handling ${provider} login callback...`);
  
  const result = await socialLogin.handleSocialLoginCallback({
    provider,
    code,
    state
  });

  if (result.success) {
    const data = result.data;
    
    console.log('✅ Social login successful!');
    console.log(`👤 User: ${data.userProfile.displayName}`);
    console.log(`📧 Email: ${data.userProfile.email}`);
    console.log(`🆕 New account: ${data.isNewAccount}`);
    console.log(`🔗 Linked accounts: ${data.linkedAccounts.length}`);
    
    // Set authentication context in main user service
    const authResult = userService.setAuthContext(data.authContext);
    if (authResult.success) {
      console.log('🔐 Authentication context set');
    }
    
    // Store tokens securely
    if (data.accessToken) {
      sessionStorage.setItem('social_access_token', data.accessToken);
    }
    if (data.refreshToken) {
      sessionStorage.setItem('social_refresh_token', data.refreshToken);
    }
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
  } else {
    console.error(`❌ ${provider} login failed:`, result.error.message);
    window.location.href = '/login?error=' + encodeURIComponent(result.error.message);
  }

  return result;
}
```

### Link Additional Social Account

```typescript
async function linkSocialAccount(
  userId: number,
  provider: 'google' | 'facebook' | 'apple'
) {
  console.log(`🔗 Linking ${provider} account to user ${userId}...`);
  
  // First, initiate the social login flow
  const loginResult = await socialLogin.initiateSocialLogin({
    provider,
    returnUrl: `/settings/accounts?link=${provider}`
  });

  if (loginResult.success) {
    // This would redirect to provider, then come back to callback
    // In the callback, check if this is a linking operation
    window.location.href = loginResult.data.authUrl;
  } else {
    console.error(`❌ Failed to initiate ${provider} linking:`, loginResult.error.message);
  }
}
```

### Unlink Social Account

```typescript
async function unlinkSocialAccount(
  userId: number,
  provider: 'google' | 'facebook' | 'apple'
) {
  console.log(`🔓 Unlinking ${provider} account from user ${userId}...`);
  
  const result = await socialLogin.unlinkSocialAccount({
    userId,
    provider
  });

  if (result.success) {
    console.log(`✅ ${provider} account unlinked successfully`);
    
    // Update UI
    updateAccountsUI();
    showSuccessMessage(`${provider} account has been unlinked`);
  } else {
    console.error(`❌ Failed to unlink ${provider} account:`, result.error.message);
    showErrorMessage(result.error.message);
  }

  return result;
}
```

### Get Linked Accounts

```typescript
async function getLinkedAccounts(userId: number) {
  console.log('🔍 Getting linked social accounts...');
  
  const linkedAccounts = await socialLogin.getLinkedAccounts(userId);
  
  console.log(`🔗 Found ${linkedAccounts.length} linked accounts:`);
  
  linkedAccounts.forEach(account => {
    console.log(`  ${account.provider}: ${account.name} (${account.email})`);
    console.log(`    Linked: ${account.linkedAt}`);
    console.log(`    Last used: ${account.lastUsed}`);
  });
  
  return linkedAccounts;
}
```

---

## User Profile Management

### Complete User Registration Flow

```typescript
async function completeUserRegistration(
  email: string,
  firstName: string,
  lastName: string,
  password: string
) {
  console.log('👤 Starting user registration flow...');
  
  try {
    // 1. Create user account (this would typically be done by your auth system)
    const userData = {
      email,
      first_name: firstName,
      last_name: lastName,
      username: email.split('@')[0],
      password
    };
    
    const createUserResponse = await woo.client.post('/wp/v2/users', userData);
    
    if (!createUserResponse.success) {
      throw new Error('Failed to create user account');
    }
    
    const newUser = createUserResponse.data.data;
    console.log(`✅ User created with ID: ${newUser.id}`);
    
    // 2. Send welcome verification email
    const verificationResult = await sendWelcomeVerification(newUser.id, email);
    
    if (!verificationResult.success) {
      console.warn('⚠️ Failed to send verification email, but account was created');
    }
    
    // 3. Set up user profile
    const authContext = {
      userId: newUser.id,
      email: newUser.email,
      isAuthenticated: true,
      sessionId: generateSessionId()
    };
    
    userService.setAuthContext(authContext);
    
    // 4. Sync initial user data
    const syncResult = await userService.syncUserData({
      userId: newUser.id,
      forceRefresh: true
    });
    
    if (syncResult.success) {
      console.log('✅ User data synced successfully');
    }
    
    console.log('🎉 User registration completed successfully!');
    
    return {
      success: true,
      userId: newUser.id,
      email: newUser.email,
      verificationSent: verificationResult.success
    };
    
  } catch (error) {
    console.error('❌ User registration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Update User Profile

```typescript
async function updateUserProfile(
  userId: number,
  updates: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    bio?: string;
    website?: string;
    phone?: string;
  }
) {
  console.log('✏️ Updating user profile...');
  
  // Check if email verification is required for profile updates
  if (userService.isEmailVerificationRequired('profile_update')) {
    const status = await checkVerificationStatus(userId);
    if (!status?.isVerified) {
      console.error('❌ Email verification required for profile updates');
      return { success: false, error: 'Email verification required' };
    }
  }
  
  const result = await userService.updateUserProfile(userId, {
    profile: updates
  });

  if (result.success) {
    console.log('✅ Profile updated successfully');
    console.log(`👤 Updated profile:`, result.data);
    
    // Update UI
    updateProfileUI(result.data);
    showSuccessMessage('Profile updated successfully');
  } else {
    console.error('❌ Failed to update profile:', result.error.message);
    showErrorMessage(result.error.message);
  }

  return result;
}
```

---

## Advanced Features

### Complete Authentication Flow

```typescript
class AuthenticationManager {
  private userService: UserService;
  private socialLogin: SocialLoginService;
  
  constructor(userService: UserService, socialLogin: SocialLoginService) {
    this.userService = userService;
    this.socialLogin = socialLogin;
  }
  
  /**
   * Handle user login (email/password or social)
   */
  async handleLogin(method: 'email' | 'google' | 'facebook' | 'apple', credentials?: any) {
    console.log(`🔐 Handling ${method} login...`);
    
    try {
      if (method === 'email') {
        return await this.handleEmailLogin(credentials);
      } else {
        return await this.handleSocialLogin(method);
      }
    } catch (error) {
      console.error(`❌ ${method} login failed:`, error);
      return { success: false, error: error.message };
    }
  }
  
  private async handleEmailLogin(credentials: { email: string; password: string }) {
    // This would integrate with your authentication system
    // For example, Better Auth, Auth0, Firebase Auth, etc.
    
    // Placeholder for email/password authentication
    const authResult = await authenticateWithEmailPassword(credentials);
    
    if (authResult.success) {
      const authContext = {
        userId: authResult.user.wordpressUserId,
        email: authResult.user.email,
        isAuthenticated: true,
        accessToken: authResult.accessToken,
        sessionId: authResult.sessionId
      };
      
      // Set context in user service
      this.userService.setAuthContext(authContext);
      
      // Check email verification status
      const verificationStatus = await this.userService.getEmailVerificationStatus(authResult.user.wordpressUserId);
      
      return {
        success: true,
        user: authResult.user,
        requiresEmailVerification: verificationStatus.success && !verificationStatus.data.isVerified
      };
    }
    
    return authResult;
  }
  
  private async handleSocialLogin(provider: 'google' | 'facebook' | 'apple') {
    const result = await this.socialLogin.initiateSocialLogin({
      provider,
      returnUrl: '/dashboard'
    });
    
    if (result.success) {
      // Redirect to provider
      window.location.href = result.data.authUrl;
    }
    
    return result;
  }
  
  /**
   * Handle logout
   */
  async handleLogout() {
    console.log('👋 Logging out user...');
    
    // Clear user service context
    this.userService.clearAuthContext();
    
    // Clear stored tokens
    sessionStorage.removeItem('social_access_token');
    sessionStorage.removeItem('social_refresh_token');
    localStorage.removeItem('auth_token');
    
    // Redirect to login page
    window.location.href = '/login';
  }
  
  /**
   * Check if user is authenticated and verified
   */
  async isUserReadyForPurchase(userId: number): Promise<boolean> {
    const authContext = this.userService.getCurrentAuthContext();
    
    if (!authContext || !authContext.isAuthenticated) {
      return false;
    }
    
    // Check email verification if required
    if (this.userService.isEmailVerificationRequired('purchase')) {
      const status = await this.userService.getEmailVerificationStatus(userId);
      return status.success && status.data.isVerified;
    }
    
    return true;
  }
}
```

### Integration with Checkout Flow

```typescript
async function integrateWithCheckout() {
  console.log('🛒 Integrating user management with checkout...');
  
  // Get current user
  const authContext = userService.getCurrentAuthContext();
  
  if (!authContext) {
    console.log('👤 No authenticated user, redirecting to login...');
    window.location.href = '/login?return_url=' + encodeURIComponent(window.location.href);
    return;
  }
  
  // Check if user is ready for purchase
  const authManager = new AuthenticationManager(userService, socialLogin);
  const isReady = await authManager.isUserReadyForPurchase(authContext.userId);
  
  if (!isReady) {
    console.log('📧 Email verification required for purchase');
    
    // Show verification required modal
    showEmailVerificationModal({
      onResend: () => resendVerificationEmail(authContext.userId),
      onCancel: () => window.location.href = '/dashboard'
    });
    
    return;
  }
  
  // User is ready, proceed with checkout
  console.log('✅ User verified, proceeding with checkout...');
  
  // Get user profile for pre-filling checkout form
  const profileResult = await userService.getUserProfile(authContext.userId);
  
  if (profileResult.success) {
    const profile = profileResult.data;
    
    // Pre-fill checkout form
    prefillCheckoutForm({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone
    });
  }
  
  // Continue with normal checkout flow
  proceedToCheckout();
}
```

---

## Helper Functions

```typescript
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

function showSuccessMessage(message: string) {
  // Implementation depends on your UI framework
  console.log('✅', message);
}

function showErrorMessage(message: string) {
  // Implementation depends on your UI framework
  console.error('❌', message);
}

function updateProfileUI(profile: UserProfile) {
  // Update your UI with the new profile data
  console.log('🔄 Updating profile UI:', profile);
}

function updateAccountsUI() {
  // Update linked accounts UI
  console.log('🔄 Updating accounts UI');
}

function showEmailVerificationModal(options: {
  onResend: () => void;
  onCancel: () => void;
}) {
  // Show modal asking user to verify email
  console.log('📧 Showing email verification modal');
}

function prefillCheckoutForm(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  // Pre-fill checkout form with user data
  console.log('📝 Pre-filling checkout form:', data);
}

function proceedToCheckout() {
  // Continue with checkout process
  console.log('🛒 Proceeding to checkout');
}

// Placeholder for external auth integration
async function authenticateWithEmailPassword(credentials: {
  email: string;
  password: string;
}) {
  // This would integrate with your chosen auth provider
  return {
    success: true,
    user: {
      id: 'external_user_123',
      wordpressUserId: 123,
      email: credentials.email
    },
    accessToken: 'access_token_123',
    sessionId: generateSessionId()
  };
}
```

---

## Environment Variables

Make sure to set these environment variables:

```bash
# Email Service (SendGrid example)
SENDGRID_API_KEY=your_sendgrid_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Apple Sign-In
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# WooCommerce
WOO_CONSUMER_KEY=your_woocommerce_consumer_key
WOO_CONSUMER_SECRET=your_woocommerce_consumer_secret
```

---

## Summary

This complete user management system provides:

✅ **Email Verification**
- Welcome emails with verification links
- Resend functionality with rate limiting
- Email change verification
- Purchase requirement enforcement

✅ **Social Login Integration**
- Google, Facebook, Apple Sign-In support
- Account linking/unlinking
- Automatic user creation
- Secure token management

✅ **Profile Management**
- Complete user profile CRUD
- Address validation
- Preference management
- Order history integration

✅ **Security Features**
- CSRF protection with state parameters
- PKCE for OAuth flows
- Rate limiting for verification attempts
- Secure token storage

✅ **Integration Ready**
- Works with external auth systems
- Checkout flow integration
- Framework-agnostic design
- Comprehensive error handling

The system is production-ready and follows security best practices while providing a seamless user experience.