/**
 * Download Management Service for WooCommerce Headless SDK
 * Following the Enhanced Unified 10X Developer Framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';

/**
 * Digital product interface
 */
export interface DigitalProduct {
  readonly id: number;
  readonly name: string;
  readonly downloadableFiles: readonly DownloadableFile[];
  readonly downloadLimit?: number;
  readonly downloadExpiry?: number; // Days until download expires
  readonly fileSize: number;
  readonly fileType: string;
  readonly isDownloadable: boolean;
}

/**
 * Downloadable file interface
 */
export interface DownloadableFile {
  readonly id: string;
  readonly name: string;
  readonly file: string; // URL or file path
  readonly downloadCount: number;
  readonly remainingDownloads?: number;
  readonly fileSize: number;
  readonly fileType: string;
  readonly checksum?: string; // For file integrity verification
}

/**
 * Download link interface
 */
export interface DownloadLink {
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

/**
 * Download permission interface
 */
export interface DownloadPermission {
  readonly permissionId: string;
  readonly customerId: number;
  readonly orderId: number;
  readonly productId: number;
  readonly downloadId: string;
  readonly downloadsRemaining: number;
  readonly accessGranted: Date;
  readonly accessExpires: Date | undefined;
  readonly orderKey: string;
  readonly isActive: boolean;
}

/**
 * Customer download interface
 */
export interface CustomerDownload {
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

/**
 * Download analytics interface
 */
export interface DownloadAnalytics {
  readonly downloadId: string;
  readonly customerId: number;
  readonly productId: number;
  readonly downloadedAt: Date;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly fileSize: number;
  readonly downloadDuration?: number;
  readonly successful: boolean;
  readonly errorMessage?: string;
  readonly bandwidth: number; // bytes per second
}

/**
 * Download request interface
 */
export interface DownloadRequest {
  readonly permissionId: string;
  readonly customerId: number;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly validateOwnership?: boolean;
}

/**
 * Download validation result
 */
export interface DownloadValidationResult {
  readonly isValid: boolean;
  readonly permission: DownloadPermission | undefined;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Download statistics
 */
export interface DownloadStatistics {
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

/**
 * Download configuration
 */
export interface DownloadConfig {
  readonly enabled: boolean;
  readonly maxDownloadsPerProduct: number;
  readonly defaultExpiryDays: number;
  readonly maxFileSize: number; // bytes
  readonly allowedFileTypes: readonly string[];
  readonly secureDownloads: boolean;
  readonly trackAnalytics: boolean;
  readonly rateLimiting: {
    readonly enabled: boolean;
    readonly maxDownloadsPerHour: number;
    readonly maxBandwidthPerHour: number; // bytes
  };
  readonly security: {
    readonly tokenExpiryMinutes: number;
    readonly ipValidation: boolean;
    readonly checksumValidation: boolean;
    readonly encryptFiles: boolean;
  };
  readonly storage: {
    readonly provider: 'local' | 'aws-s3' | 'google-cloud' | 'azure';
    readonly basePath: string;
    readonly secureBasePath: string;
    readonly cdnUrl?: string;
  };
}

/**
 * File stream interface for downloads
 */
export interface FileStream {
  readonly stream: ReadableStream;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly headers: Record<string, string>;
}

/**
 * Download management service
 */
export class DownloadManagementService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly config: DownloadConfig;

  constructor(
    client: HttpClient,
    cache: CacheManager,
    config: DownloadConfig
  ) {
    this.client = client;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Get customer's downloadable products
   */
  async getCustomerDownloads(customerId: number): Promise<Result<CustomerDownload[], WooError>> {
    try {
      if (!this.config.enabled) {
        return Err(ErrorFactory.configurationError(
          'Download management is disabled',
          'Enable download management in configuration to use this feature'
        ));
      }

      // Get customer's download permissions from WooCommerce
      const response = await this.client.get<any>(`/customers/${customerId}/downloads`);
      
      if (!response.success) {
        return Err(ErrorFactory.apiError(
          'Failed to fetch customer downloads',
          response.error?.statusCode || 500,
          response.error
        ));
      }

      const downloads = response.data.data;
      const customerDownloads: CustomerDownload[] = [];

      for (const download of downloads) {
        const customerDownload = await this.mapToCustomerDownload(download);
        if (customerDownload) {
          customerDownloads.push(customerDownload);
        }
      }

      // Sort by order date (newest first)
      customerDownloads.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());

      return Ok(customerDownloads);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get customer downloads',
        500,
        error
      ));
    }
  }

  /**
   * Generate secure download link
   */
  async generateDownloadLink(request: DownloadRequest): Promise<Result<DownloadLink, WooError>> {
    try {
      // Validate download permission
      const validationResult = await this.validateDownloadPermission(request);
      if (!validationResult.isValid || !validationResult.permission) {
        return Err(ErrorFactory.validationError(
          'Download permission validation failed',
          validationResult.errors.join(', ')
        ));
      }

      const permission = validationResult.permission;

      // Check rate limiting
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = await this.checkRateLimit(request.customerId, request.ipAddress);
        if (!rateLimitResult.success) {
          return rateLimitResult;
        }
      }

      // Generate secure access token
      const accessToken = this.generateSecureToken(permission);
      const expiresAt = new Date(Date.now() + (this.config.security.tokenExpiryMinutes * 60 * 1000));

      // Get file information
      const fileInfo = await this.getFileInformation(permission.downloadId);
      if (!fileInfo.success) {
        return fileInfo;
      }

      const file = fileInfo.data;

      // Generate secure download URL
      const secureUrl = this.generateSecureUrl(accessToken, permission.downloadId);

      // Cache the token for validation
      await this.cacheDownloadToken(accessToken, permission, expiresAt);

      const downloadLink: DownloadLink = {
        downloadId: permission.downloadId,
        customerId: permission.customerId,
        orderId: permission.orderId,
        productId: permission.productId,
        downloadUrl: secureUrl,
        accessToken,
        expiresAt,
        downloadsRemaining: permission.downloadsRemaining,
        fileSize: file.fileSize,
        fileName: file.fileName,
        secureUrl
      };

      return Ok(downloadLink);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to generate download link',
        500,
        error
      ));
    }
  }

  /**
   * Validate download permission
   */
  async validateDownloadPermission(request: DownloadRequest): Promise<DownloadValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get permission from WooCommerce
      const permissionResponse = await this.client.get<any>(`/customers/${request.customerId}/downloads/${request.permissionId}`);
      
      if (!permissionResponse.success) {
        errors.push('Download permission not found');
        return { isValid: false, permission: undefined, errors, warnings };
      }

      const permissionData = permissionResponse.data.data;
      const permission = this.mapToDownloadPermission(permissionData);

      // Validate ownership
      if (request.validateOwnership && permission.customerId !== request.customerId) {
        errors.push('Customer does not own this download');
      }

      // Check if permission is active
      if (!permission.isActive) {
        errors.push('Download permission is not active');
      }

      // Check download limits
      if (permission.downloadsRemaining <= 0) {
        errors.push('Download limit exceeded');
      }

      // Check expiration
      if (permission.accessExpires && new Date() > permission.accessExpires) {
        errors.push('Download access has expired');
      }

      // IP validation if enabled
      if (this.config.security.ipValidation) {
        const ipValidation = await this.validateCustomerIP(request.customerId, request.ipAddress);
        if (!ipValidation) {
          warnings.push('Download from unusual IP address');
        }
      }

      return {
        isValid: errors.length === 0,
        permission: errors.length === 0 ? permission : undefined,
        errors,
        warnings
      };

    } catch (error) {
      errors.push('Failed to validate download permission');
      return { isValid: false, permission: undefined, errors, warnings };
    }
  }

  /**
   * Track download attempt
   */
  async trackDownload(analytics: DownloadAnalytics): Promise<Result<void, WooError>> {
    try {
      if (!this.config.trackAnalytics) {
        return Ok(undefined);
      }

      // Store analytics in cache for immediate access
      const cacheKey = `download_analytics:${analytics.downloadId}:${Date.now()}`;
      await this.cache.set(cacheKey, analytics, 24 * 60 * 60); // 24 hours

      // Store in WooCommerce (could be custom table or meta data)
      const analyticsData = {
        download_id: analytics.downloadId,
        customer_id: analytics.customerId,
        product_id: analytics.productId,
        downloaded_at: analytics.downloadedAt.toISOString(),
        ip_address: analytics.ipAddress,
        user_agent: analytics.userAgent,
        file_size: analytics.fileSize,
        download_duration: analytics.downloadDuration,
        successful: analytics.successful,
        error_message: analytics.errorMessage,
        bandwidth: analytics.bandwidth
      };

      // This would typically go to a custom analytics endpoint
      await this.client.post('/download-analytics', analyticsData);

      return Ok(undefined);

    } catch (error) {
      // Don't fail the download if analytics tracking fails
      console.warn('Failed to track download analytics:', error);
      return Ok(undefined);
    }
  }

  /**
   * Serve secure file download
   */
  async serveFile(downloadToken: string): Promise<Result<FileStream, WooError>> {
    try {
      // Validate download token
      const tokenValidation = await this.validateDownloadToken(downloadToken);
      if (!tokenValidation.success) {
        return tokenValidation;
      }

      const { permission, fileInfo } = tokenValidation.data;

      // Update download count
      await this.updateDownloadCount(permission.permissionId);

      // Generate file stream
      const fileStream = await this.createFileStream(fileInfo.filePath, fileInfo.fileName, fileInfo.fileSize);
      if (!fileStream.success) {
        return fileStream;
      }

      // Track download start
      const startTime = Date.now();
      await this.trackDownload({
        downloadId: permission.downloadId,
        customerId: permission.customerId,
        productId: permission.productId,
        downloadedAt: new Date(),
        ipAddress: '', // Would be provided by the request context
        userAgent: '', // Would be provided by the request context
        fileSize: fileInfo.fileSize,
        successful: true,
        bandwidth: 0 // Would be calculated during transfer
      });

      return Ok(fileStream.data);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to serve file download',
        500,
        error
      ));
    }
  }

  /**
   * Get download statistics
   */
  async getDownloadStatistics(
    customerId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<DownloadStatistics, WooError>> {
    try {
      if (!this.config.trackAnalytics) {
        return Err(ErrorFactory.configurationError(
          'Download analytics is disabled'
        ));
      }

      // Build query parameters
      const params: any = {};
      if (customerId) params.customer_id = customerId;
      if (startDate) params.start_date = startDate.toISOString().split('T')[0];
      if (endDate) params.end_date = endDate.toISOString().split('T')[0];

      // Get analytics data
      const response = await this.client.get<any>('/download-analytics/stats', params);
      
      if (!response.success) {
        return Err(ErrorFactory.apiError(
          'Failed to fetch download statistics',
          response.error?.statusCode || 500,
          response.error
        ));
      }

      const data = response.data.data;
      
      const statistics: DownloadStatistics = {
        totalDownloads: data.total_downloads || 0,
        totalBandwidth: data.total_bandwidth || 0,
        popularProducts: data.popular_products?.map((p: any) => ({
          productId: p.product_id,
          productName: p.product_name,
          downloadCount: p.download_count
        })) || [],
        downloadsByDate: data.downloads_by_date?.map((d: any) => ({
          date: d.date,
          count: d.count,
          bandwidth: d.bandwidth
        })) || [],
        averageFileSize: data.average_file_size || 0,
        successRate: data.success_rate || 100
      };

      return Ok(statistics);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get download statistics',
        500,
        error
      ));
    }
  }

  /**
   * Cleanup expired downloads
   */
  async cleanupExpiredDownloads(): Promise<Result<number, WooError>> {
    try {
      let cleanedCount = 0;

      // Note: Since CacheManager doesn't have a keys() method,
      // this cleanup would need to be implemented differently
      // For now, we'll return 0 and add a note for future implementation
      
      // TODO: Implement cleanup using a separate tracking mechanism
      // or extend CacheManager to support key pattern matching
      
      return Ok(cleanedCount);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to cleanup expired downloads',
        500,
        error
      ));
    }
  }

  // Private helper methods

  /**
   * Map WooCommerce download data to CustomerDownload
   */
  private async mapToCustomerDownload(downloadData: any): Promise<CustomerDownload | null> {
    try {
      const now = new Date();
      const accessExpires = downloadData.access_expires ? new Date(downloadData.access_expires) : undefined;
      const isExpired = accessExpires ? now > accessExpires : false;
      const canDownload = downloadData.downloads_remaining > 0 && !isExpired;

      return {
        permissionId: downloadData.permission_id,
        orderId: downloadData.order_id,
        orderDate: new Date(downloadData.order_date),
        productId: downloadData.product_id,
        productName: downloadData.product_name,
        downloadId: downloadData.download_id,
        fileName: downloadData.file_name,
        fileSize: downloadData.file_size || 0,
        downloadsRemaining: downloadData.downloads_remaining,
        accessExpires,
        downloadUrl: '', // Will be generated when needed
        isExpired,
        canDownload
      };
    } catch (error) {
      console.warn('Failed to map download data:', error);
      return null;
    }
  }

  /**
   * Map to DownloadPermission
   */
  private mapToDownloadPermission(data: any): DownloadPermission {
    return {
      permissionId: data.permission_id,
      customerId: data.customer_id,
      orderId: data.order_id,
      productId: data.product_id,
      downloadId: data.download_id,
      downloadsRemaining: data.downloads_remaining,
      accessGranted: new Date(data.access_granted),
      accessExpires: data.access_expires ? new Date(data.access_expires) : undefined,
      orderKey: data.order_key,
      isActive: data.is_active || true
    };
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(permission: DownloadPermission): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    const hash = this.simpleHash(`${permission.permissionId}-${permission.customerId}-${timestamp}`);
    return `dl_${timestamp}${random}${hash}`.substr(0, 64);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate secure download URL
   */
  private generateSecureUrl(token: string, downloadId: string): string {
    const baseUrl = this.config.storage.basePath;
    return `${baseUrl}/download/${token}/${downloadId}`;
  }

  /**
   * Cache download token
   */
  private async cacheDownloadToken(
    token: string, 
    permission: DownloadPermission, 
    expiresAt: Date
  ): Promise<void> {
    const cacheKey = `download_token:${token}`;
    const tokenData = {
      permission,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.cache.set(cacheKey, tokenData, ttl);
  }

  /**
   * Validate download token
   */
  private async validateDownloadToken(token: string): Promise<Result<{ permission: DownloadPermission; fileInfo: any }, WooError>> {
    try {
      const cacheKey = `download_token:${token}`;
      const tokenData = await this.cache.get<{
        permission: DownloadPermission;
        expiresAt: string;
        createdAt: string;
      }>(cacheKey);
      
      if (!tokenData.success || !tokenData.data) {
        return Err(ErrorFactory.validationError(
          'Invalid or expired download token'
        ));
      }

      const data = tokenData.data;
      const expiresAt = new Date(data.expiresAt);
      
      if (new Date() > expiresAt) {
        await this.cache.delete(cacheKey);
        return Err(ErrorFactory.validationError(
          'Download token has expired'
        ));
      }

      // Get file information
      const fileInfo = await this.getFileInformation(data.permission.downloadId);
      if (!fileInfo.success) {
        return fileInfo;
      }

      return Ok({
        permission: data.permission,
        fileInfo: fileInfo.data
      });

    } catch (error) {
      return Err(ErrorFactory.validationError(
        'Failed to validate download token'
      ));
    }
  }

  /**
   * Get file information
   */
  private async getFileInformation(downloadId: string): Promise<Result<any, WooError>> {
    try {
      // This would fetch file metadata from WooCommerce or file system
      // For now, return placeholder data
      const fileInfo = {
        downloadId,
        fileName: `file_${downloadId}.zip`,
        fileSize: 1024 * 1024, // 1MB placeholder
        filePath: `/secure/downloads/${downloadId}`,
        mimeType: 'application/zip'
      };

      return Ok(fileInfo);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get file information',
        500,
        error
      ));
    }
  }

  /**
   * Create file stream
   */
  private async createFileStream(
    filePath: string, 
    fileName: string, 
    fileSize: number
  ): Promise<Result<FileStream, WooError>> {
    try {
      // This would create an actual file stream
      // For now, return placeholder
      const stream = new ReadableStream({
        start(controller) {
          // Placeholder stream implementation
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
          controller.close();
        }
      });

      const fileStream: FileStream = {
        stream,
        fileName,
        fileSize,
        mimeType: this.getMimeType(fileName),
        headers: {
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileSize.toString(),
          'Content-Type': this.getMimeType(fileName),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      };

      return Ok(fileStream);

    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to create file stream',
        500,
        error
      ));
    }
  }

  /**
   * Get MIME type from file name
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'exe': 'application/octet-stream',
      'dmg': 'application/octet-stream',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'txt': 'text/plain'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(customerId: number, ipAddress: string): Promise<Result<void, WooError>> {
    if (!this.config.rateLimiting.enabled) {
      return Ok(undefined);
    }

    try {
      const hourlyKey = `rate_limit:downloads:${customerId}:${new Date().getHours()}`;
      const cached = await this.cache.get<number>(hourlyKey);
      const currentCount = cached.success ? (cached.data || 0) : 0;

      if (currentCount >= this.config.rateLimiting.maxDownloadsPerHour) {
        return Err(ErrorFactory.validationError(
          `Download rate limit exceeded. Maximum ${this.config.rateLimiting.maxDownloadsPerHour} downloads per hour.`
        ));
      }

      // Update count
      await this.cache.set(hourlyKey, currentCount + 1, 3600); // 1 hour TTL

      return Ok(undefined);

    } catch (error) {
      // Don't fail downloads if rate limiting check fails
      console.warn('Rate limiting check failed:', error);
      return Ok(undefined);
    }
  }

  /**
   * Validate customer IP
   */
  private async validateCustomerIP(customerId: number, ipAddress: string): Promise<boolean> {
    try {
      // This would implement IP validation logic
      // For now, return true as placeholder
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update download count
   */
  private async updateDownloadCount(permissionId: string): Promise<void> {
    try {
      // Update download count in WooCommerce
      await this.client.post(`/download-permissions/${permissionId}/increment`);
    } catch (error) {
      console.warn('Failed to update download count:', error);
    }
  }
}

/**
 * Default download management configuration
 */
export const DEFAULT_DOWNLOAD_CONFIG: DownloadConfig = {
  enabled: true,
  maxDownloadsPerProduct: 5,
  defaultExpiryDays: 30,
  maxFileSize: 500 * 1024 * 1024, // 500MB
  allowedFileTypes: ['pdf', 'zip', 'exe', 'dmg', 'mp4', 'mp3', 'jpg', 'png'],
  secureDownloads: true,
  trackAnalytics: true,
  rateLimiting: {
    enabled: true,
    maxDownloadsPerHour: 10,
    maxBandwidthPerHour: 1024 * 1024 * 1024 // 1GB
  },
  security: {
    tokenExpiryMinutes: 60,
    ipValidation: false,
    checksumValidation: true,
    encryptFiles: false
  },
  storage: {
    provider: 'local',
    basePath: '/downloads',
    secureBasePath: '/secure/downloads'
  }
};