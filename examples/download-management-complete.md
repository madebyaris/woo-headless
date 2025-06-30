# WooCommerce Headless SDK - Download Management Complete Guide

## Overview

The Download Management system provides comprehensive handling of digital product downloads, secure file access, analytics tracking, and customer download management for WooCommerce stores. This enterprise-grade solution supports multiple file types, secure token-based downloads, rate limiting, and detailed analytics.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Core Features](#core-features)
4. [API Reference](#api-reference)
5. [Security Features](#security-features)
6. [Analytics & Monitoring](#analytics--monitoring)
7. [Integration Examples](#integration-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Setup

```typescript
import { WooHeadless } from '@woo-headless/sdk';
import { DEFAULT_DOWNLOAD_CONFIG } from '@woo-headless/sdk/user';

// Initialize with download management
const woo = new WooHeadless({
  baseURL: 'https://your-store.com/wp-json/wc/v3',
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  downloadConfig: {
    ...DEFAULT_DOWNLOAD_CONFIG,
    enabled: true,
    maxDownloadsPerProduct: 10,
    defaultExpiryDays: 30,
    secureDownloads: true,
    trackAnalytics: true
  }
});

// Get customer downloads
const downloads = await woo.user.getCustomerDownloads(123);
if (downloads.success) {
  console.log('Customer downloads:', downloads.data);
}
```

### Generate Download Link

```typescript
import { DownloadRequest } from '@woo-headless/sdk/user';

const downloadRequest: DownloadRequest = {
  permissionId: 'perm_123',
  customerId: 123,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  validateOwnership: true
};

const downloadLink = await woo.user.generateDownloadLink(downloadRequest);
if (downloadLink.success) {
  console.log('Secure download URL:', downloadLink.data.secureUrl);
  console.log('Expires at:', downloadLink.data.expiresAt);
  console.log('Downloads remaining:', downloadLink.data.downloadsRemaining);
}
```

## Configuration

### Download Configuration Options

```typescript
import { DownloadConfig } from '@woo-headless/sdk/user';

const downloadConfig: DownloadConfig = {
  // Enable/disable download management
  enabled: true,

  // Download limits
  maxDownloadsPerProduct: 5,
  defaultExpiryDays: 30,
  maxFileSize: 500 * 1024 * 1024, // 500MB

  // Allowed file types
  allowedFileTypes: ['pdf', 'zip', 'exe', 'dmg', 'mp4', 'mp3', 'jpg', 'png'],

  // Security settings
  secureDownloads: true,
  trackAnalytics: true,

  // Rate limiting
  rateLimiting: {
    enabled: true,
    maxDownloadsPerHour: 10,
    maxBandwidthPerHour: 1024 * 1024 * 1024 // 1GB
  },

  // Security features
  security: {
    tokenExpiryMinutes: 60,
    ipValidation: false,
    checksumValidation: true,
    encryptFiles: false
  },

  // Storage configuration
  storage: {
    provider: 'local', // 'local' | 'aws-s3' | 'google-cloud' | 'azure'
    basePath: '/downloads',
    secureBasePath: '/secure/downloads',
    cdnUrl: 'https://cdn.yourstore.com' // Optional
  }
};
```

### Environment Variables

```bash
# Download Management
WOO_DOWNLOADS_ENABLED=true
WOO_DOWNLOADS_MAX_PER_PRODUCT=5
WOO_DOWNLOADS_EXPIRY_DAYS=30
WOO_DOWNLOADS_MAX_FILE_SIZE=524288000

# Security
WOO_DOWNLOADS_SECURE=true
WOO_DOWNLOADS_TOKEN_EXPIRY=60
WOO_DOWNLOADS_IP_VALIDATION=false

# Rate Limiting
WOO_DOWNLOADS_RATE_LIMIT_ENABLED=true
WOO_DOWNLOADS_MAX_PER_HOUR=10
WOO_DOWNLOADS_MAX_BANDWIDTH_PER_HOUR=1073741824

# Storage
WOO_DOWNLOADS_STORAGE_PROVIDER=local
WOO_DOWNLOADS_BASE_PATH=/downloads
WOO_DOWNLOADS_SECURE_PATH=/secure/downloads
WOO_DOWNLOADS_CDN_URL=https://cdn.yourstore.com
```

## Core Features

### 1. Customer Download Management

```typescript
// Get all customer downloads
const downloads = await woo.user.getCustomerDownloads(customerId);

if (downloads.success) {
  downloads.data.forEach(download => {
    console.log(`Product: ${download.productName}`);
    console.log(`File: ${download.fileName}`);
    console.log(`Downloads remaining: ${download.downloadsRemaining}`);
    console.log(`Expires: ${download.accessExpires}`);
    console.log(`Can download: ${download.canDownload}`);
  });
}
```

### 2. Secure Download Links

```typescript
// Generate time-limited, secure download link
const downloadLink = await woo.user.generateDownloadLink({
  permissionId: 'perm_123',
  customerId: 123,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  validateOwnership: true
});

if (downloadLink.success) {
  // Redirect user to secure download URL
  response.redirect(downloadLink.data.secureUrl);
}
```

### 3. Download Analytics

```typescript
// Get download statistics
const stats = await woo.user.getDownloadStatistics(
  customerId, 
  new Date('2024-01-01'), 
  new Date('2024-12-31')
);

if (stats.success) {
  console.log('Total downloads:', stats.data.totalDownloads);
  console.log('Total bandwidth:', stats.data.totalBandwidth);
  console.log('Success rate:', stats.data.successRate);
  console.log('Popular products:', stats.data.popularProducts);
}
```

### 4. Download Validation

```typescript
// The system automatically validates:
// - Download permissions
// - Expiration dates
// - Download limits
// - Customer ownership
// - Rate limits
// - File integrity (if enabled)
```

## API Reference

### CustomerDownload Interface

```typescript
interface CustomerDownload {
  readonly permissionId: string;
  readonly orderId: number;
  readonly orderDate: Date;
  readonly productId: number;
  readonly productName: string;
  readonly downloadId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly downloadsRemaining: number;
  readonly accessExpires: Date | undefined;
  readonly downloadUrl: string;
  readonly isExpired: boolean;
  readonly canDownload: boolean;
}
```

### DownloadLink Interface

```typescript
interface DownloadLink {
  readonly downloadId: string;
  readonly customerId: number;
  readonly orderId: number;
  readonly productId: number;
  readonly downloadUrl: string;
  readonly accessToken: string;
  readonly expiresAt: Date;
  readonly downloadsRemaining: number;
  readonly fileSize: number;
  readonly fileName: string;
  readonly secureUrl: string;
}
```

### DownloadStatistics Interface

```typescript
interface DownloadStatistics {
  readonly totalDownloads: number;
  readonly totalBandwidth: number;
  readonly popularProducts: readonly {
    readonly productId: number;
    readonly productName: string;
    readonly downloadCount: number;
  }[];
  readonly downloadsByDate: readonly {
    readonly date: string;
    readonly count: number;
    readonly bandwidth: number;
  }[];
  readonly averageFileSize: number;
  readonly successRate: number;
}
```

## Security Features

### 1. Token-Based Authentication

```typescript
// Each download link includes a secure, time-limited token
// Token format: dl_[timestamp][random][hash]
// Example: dl_abc123def456ghi789jkl012mno345pqr
```

### 2. Access Control

```typescript
// Automatic validation of:
// - Customer ownership
// - Download permissions
// - Expiration dates
// - Download limits
// - Rate limiting
```

### 3. IP Validation (Optional)

```typescript
const config: DownloadConfig = {
  security: {
    ipValidation: true, // Enable IP validation
    // ... other security options
  }
};

// System will warn if download is from unusual IP
```

### 4. File Integrity

```typescript
const config: DownloadConfig = {
  security: {
    checksumValidation: true, // Enable checksum validation
    // ... other security options
  }
};

// System will validate file integrity before serving
```

## Analytics & Monitoring

### 1. Download Tracking

```typescript
// Automatic tracking of:
// - Download attempts
// - Success/failure rates
// - Bandwidth usage
// - Download duration
// - User agents
// - IP addresses
```

### 2. Performance Monitoring

```typescript
// Get comprehensive statistics
const stats = await woo.user.getDownloadStatistics();

if (stats.success) {
  // Monitor key metrics
  const metrics = {
    totalDownloads: stats.data.totalDownloads,
    averageFileSize: stats.data.averageFileSize,
    successRate: stats.data.successRate,
    totalBandwidth: stats.data.totalBandwidth
  };
  
  // Send to monitoring service
  analytics.track('download_stats', metrics);
}
```

### 3. Popular Products Analysis

```typescript
// Identify top-performing digital products
stats.data.popularProducts.forEach(product => {
  console.log(`Product ${product.productName}: ${product.downloadCount} downloads`);
});
```

## Integration Examples

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { useWooCommerce } from '@woo-headless/react';
import { CustomerDownload } from '@woo-headless/sdk/user';

const CustomerDownloads: React.FC<{ customerId: number }> = ({ customerId }) => {
  const [downloads, setDownloads] = useState<CustomerDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const woo = useWooCommerce();

  useEffect(() => {
    const fetchDownloads = async () => {
      const result = await woo.user.getCustomerDownloads(customerId);
      if (result.success) {
        setDownloads(result.data);
      }
      setLoading(false);
    };

    fetchDownloads();
  }, [customerId]);

  const handleDownload = async (permissionId: string) => {
    const downloadLink = await woo.user.generateDownloadLink({
      permissionId,
      customerId,
      ipAddress: '', // Would be provided by server
      userAgent: navigator.userAgent,
      validateOwnership: true
    });

    if (downloadLink.success) {
      window.open(downloadLink.data.secureUrl, '_blank');
    }
  };

  if (loading) return <div>Loading downloads...</div>;

  return (
    <div className="customer-downloads">
      <h2>Your Downloads</h2>
      {downloads.map(download => (
        <div key={download.permissionId} className="download-item">
          <h3>{download.productName}</h3>
          <p>File: {download.fileName}</p>
          <p>Size: {(download.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          <p>Downloads remaining: {download.downloadsRemaining}</p>
          {download.accessExpires && (
            <p>Expires: {new Date(download.accessExpires).toLocaleDateString()}</p>
          )}
          <button
            onClick={() => handleDownload(download.permissionId)}
            disabled={!download.canDownload}
            className={`download-btn ${download.canDownload ? 'active' : 'disabled'}`}
          >
            {download.canDownload ? 'Download' : 'Expired'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default CustomerDownloads;
```

### Vue Component Example

```vue
<template>
  <div class="customer-downloads">
    <h2>Your Downloads</h2>
    <div v-if="loading">Loading downloads...</div>
    <div v-else>
      <div
        v-for="download in downloads"
        :key="download.permissionId"
        class="download-item"
      >
        <h3>{{ download.productName }}</h3>
        <p>File: {{ download.fileName }}</p>
        <p>Size: {{ formatFileSize(download.fileSize) }}</p>
        <p>Downloads remaining: {{ download.downloadsRemaining }}</p>
        <p v-if="download.accessExpires">
          Expires: {{ formatDate(download.accessExpires) }}
        </p>
        <button
          @click="handleDownload(download.permissionId)"
          :disabled="!download.canDownload"
          :class="['download-btn', download.canDownload ? 'active' : 'disabled']"
        >
          {{ download.canDownload ? 'Download' : 'Expired' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useWooCommerce } from '@woo-headless/vue';
import type { CustomerDownload } from '@woo-headless/sdk/user';

interface Props {
  customerId: number;
}

const props = defineProps<Props>();
const woo = useWooCommerce();

const downloads = ref<CustomerDownload[]>([]);
const loading = ref(true);

const fetchDownloads = async () => {
  const result = await woo.user.getCustomerDownloads(props.customerId);
  if (result.success) {
    downloads.value = result.data;
  }
  loading.value = false;
};

const handleDownload = async (permissionId: string) => {
  const downloadLink = await woo.user.generateDownloadLink({
    permissionId,
    customerId: props.customerId,
    ipAddress: '', // Would be provided by server
    userAgent: navigator.userAgent,
    validateOwnership: true
  });

  if (downloadLink.success) {
    window.open(downloadLink.data.secureUrl, '_blank');
  }
};

const formatFileSize = (bytes: number): string => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString();
};

onMounted(fetchDownloads);
</script>
```

### Express.js Server Integration

```typescript
import express from 'express';
import { WooHeadless } from '@woo-headless/sdk';

const app = express();
const woo = new WooHeadless({
  // ... configuration
});

// Serve download files
app.get('/download/:token/:downloadId', async (req, res) => {
  try {
    const { token, downloadId } = req.params;
    
    // Validate and serve file through the SDK
    const fileStream = await woo.downloads.serveFile(token);
    
    if (!fileStream.success) {
      return res.status(403).json({ error: fileStream.error.message });
    }
    
    const file = fileStream.data;
    
    // Set headers
    Object.entries(file.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Stream file to client
    const reader = file.stream.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) return;
      res.write(value);
      return pump();
    };
    
    await pump();
    res.end();
    
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// Generate download link endpoint
app.post('/api/generate-download', async (req, res) => {
  try {
    const { permissionId, customerId } = req.body;
    
    const downloadLink = await woo.user.generateDownloadLink({
      permissionId,
      customerId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      validateOwnership: true
    });
    
    if (downloadLink.success) {
      res.json(downloadLink.data);
    } else {
      res.status(400).json({ error: downloadLink.error.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});
```

## Best Practices

### 1. Security

```typescript
// Always validate ownership
const downloadLink = await woo.user.generateDownloadLink({
  // ...
  validateOwnership: true // Always enable
});

// Use secure storage
const config: DownloadConfig = {
  storage: {
    provider: 'aws-s3', // Use cloud storage for production
    secureBasePath: '/secure/downloads',
    // ...
  }
};

// Enable rate limiting
const config: DownloadConfig = {
  rateLimiting: {
    enabled: true,
    maxDownloadsPerHour: 10,
    maxBandwidthPerHour: 1024 * 1024 * 1024
  }
};
```

### 2. Performance

```typescript
// Implement caching for frequently accessed files
const config: DownloadConfig = {
  storage: {
    cdnUrl: 'https://cdn.yourstore.com' // Use CDN
  }
};

// Monitor and cleanup expired downloads
setInterval(async () => {
  const cleanedCount = await woo.user.cleanupExpiredDownloads();
  console.log(`Cleaned up ${cleanedCount.data} expired downloads`);
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

### 3. User Experience

```typescript
// Provide clear download status
const downloads = await woo.user.getCustomerDownloads(customerId);

downloads.data?.forEach(download => {
  if (download.isExpired) {
    console.log(`${download.productName}: Expired`);
  } else if (download.downloadsRemaining === 0) {
    console.log(`${download.productName}: Download limit reached`);
  } else {
    console.log(`${download.productName}: ${download.downloadsRemaining} downloads remaining`);
  }
});
```

### 4. Error Handling

```typescript
// Comprehensive error handling
const downloadLink = await woo.user.generateDownloadLink(request);

if (!downloadLink.success) {
  switch (downloadLink.error.code) {
    case 'VALIDATION_ERROR':
      console.log('Invalid download request:', downloadLink.error.message);
      break;
    case 'RATE_LIMIT_ERROR':
      console.log('Rate limit exceeded:', downloadLink.error.message);
      break;
    case 'API_ERROR':
      console.log('API error:', downloadLink.error.message);
      break;
    default:
      console.log('Unknown error:', downloadLink.error.message);
  }
}
```

## Troubleshooting

### Common Issues

1. **Downloads Not Working**
   ```typescript
   // Check if download management is enabled
   const config: DownloadConfig = {
     enabled: true, // Must be true
     // ...
   };
   ```

2. **Rate Limit Errors**
   ```typescript
   // Adjust rate limiting settings
   const config: DownloadConfig = {
     rateLimiting: {
       enabled: true,
       maxDownloadsPerHour: 20, // Increase if needed
       // ...
     }
   };
   ```

3. **Token Expiration**
   ```typescript
   // Increase token expiry time
   const config: DownloadConfig = {
     security: {
       tokenExpiryMinutes: 120, // 2 hours instead of 1
       // ...
     }
   };
   ```

### Debug Mode

```typescript
// Enable debug logging
const woo = new WooHeadless({
  // ... other config
  debug: true
});

// Check download validation
const validation = await woo.downloads.validateDownloadPermission(request);
console.log('Validation result:', validation);
```

### Health Check

```typescript
// Implement health check endpoint
app.get('/health/downloads', async (req, res) => {
  try {
    const stats = await woo.user.getDownloadStatistics();
    
    res.json({
      status: 'healthy',
      downloadManagement: {
        enabled: true,
        totalDownloads: stats.data?.totalDownloads || 0,
        successRate: stats.data?.successRate || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Summary

The WooCommerce Headless SDK Download Management system provides:

✅ **Secure File Access** - Token-based authentication with expiration  
✅ **Rate Limiting** - Prevent abuse with configurable limits  
✅ **Analytics Tracking** - Comprehensive download statistics  
✅ **Multiple Storage Providers** - Local, AWS S3, Google Cloud, Azure  
✅ **File Integrity** - Checksum validation and security features  
✅ **Customer Management** - Complete download history and permissions  
✅ **Enterprise Security** - IP validation, encryption, and access control  
✅ **Framework Agnostic** - Works with React, Vue, Svelte, and vanilla JS  

The system is production-ready and follows enterprise security best practices while maintaining excellent developer experience and performance.