/**
 * HTTP Client for WooCommerce API
 * Following the enhanced unified-10x-dev framework
 */

import { Result, Ok, Err } from '../types/result';
import { 
  WooError,
  ErrorFactory 
} from '../types/errors';
import { HttpConfig, ResolvedWooConfig } from '../types/config';

/**
 * HTTP methods enum
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options interface
 */
export interface RequestOptions {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * Response interface
 */
export interface Response<T> {
  readonly data: T;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (options: RequestOptions) => RequestOptions | Promise<RequestOptions>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = <T>(response: Response<T>) => Response<T> | Promise<Response<T>>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (error: WooError) => WooError | Promise<WooError>;

/**
 * HTTP Client class with comprehensive error handling
 */
export class HttpClient {
  private readonly config: HttpConfig;
  private readonly baseURL: string;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];
  private readonly errorInterceptors: ErrorInterceptor[] = [];
  private readonly abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ResolvedWooConfig) {
    this.config = config.http;
    this.baseURL = `${config.baseURL}/wp-json/${config.version}`;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Main request method with retry logic and error handling
   */
  async request<T>(options: RequestOptions): Promise<Result<Response<T>, WooError>> {
    const requestId = this.generateRequestId();
    
    try {
      // Apply request interceptors
      let processedOptions = { ...options };
      for (const interceptor of this.requestInterceptors) {
        processedOptions = await interceptor(processedOptions);
      }

      // Attempt request with retry logic
      const result = await this.attemptRequest<T>(processedOptions, requestId);
      
      if (result.success) {
        // Apply response interceptors
        let response = result.data;
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response);
        }
        return Ok(response);
      } else {
        // Apply error interceptors
        let error = result.error;
        for (const interceptor of this.errorInterceptors) {
          error = await interceptor(error);
        }
        return Err(error);
      }
    } catch (error) {
      const wooError = this.createErrorFromException(error);
      return Err(wooError);
    } finally {
      // Clean up abort controller
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, headers?: Record<string, string>): Promise<Result<Response<T>, WooError>> {
    const options: RequestOptions = {
      method: 'GET',
      url
    };
    
    if (headers !== undefined) {
      (options as { headers: Record<string, string> }).headers = headers;
    }
    
    return this.request<T>(options);
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response<T>, WooError>> {
    const options: RequestOptions = {
      method: 'POST',
      url
    };
    
    if (body !== undefined) {
      (options as { body: unknown }).body = body;
    }
    
    if (headers !== undefined) {
      (options as { headers: Record<string, string> }).headers = headers;
    }
    
    return this.request<T>(options);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response<T>, WooError>> {
    const options: RequestOptions = {
      method: 'PUT',
      url
    };
    
    if (body !== undefined) {
      (options as { body: unknown }).body = body;
    }
    
    if (headers !== undefined) {
      (options as { headers: Record<string, string> }).headers = headers;
    }
    
    return this.request<T>(options);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<Result<Response<T>, WooError>> {
    const options: RequestOptions = {
      method: 'PATCH',
      url
    };
    
    if (body !== undefined) {
      (options as { body: unknown }).body = body;
    }
    
    if (headers !== undefined) {
      (options as { headers: Record<string, string> }).headers = headers;
    }
    
    return this.request<T>(options);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, headers?: Record<string, string>): Promise<Result<Response<T>, WooError>> {
    const options: RequestOptions = {
      method: 'DELETE',
      url
    };
    
    if (headers !== undefined) {
      (options as { headers: Record<string, string> }).headers = headers;
    }
    
    return this.request<T>(options);
  }

  /**
   * Cancel request by ID
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Attempt request with retry logic
   */
  private async attemptRequest<T>(
    options: RequestOptions, 
    requestId: string
  ): Promise<Result<Response<T>, WooError>> {
    const maxRetries = options.retries ?? this.config.retries;
    let lastError: WooError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeRequest<T>(options, requestId);
        
        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Check if error is retryable
        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          break;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt));
        }
      } catch (error) {
        lastError = this.createErrorFromException(error);
        
        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          break;
        }

        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }

    return Err(lastError ?? ErrorFactory.networkError('Unknown error occurred'));
  }

  /**
   * Execute single request
   */
  private async executeRequest<T>(
    options: RequestOptions, 
    requestId: string
  ): Promise<Result<Response<T>, WooError>> {
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    const url = this.buildURL(options.url);
    const timeout = options.timeout ?? this.config.timeout;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

         try {
       const fetchOptions: RequestInit = {
         method: options.method,
         headers: this.buildHeaders(options.headers),
         signal: abortController.signal
       };
       
       const body = this.buildBody(options.body);
       if (body !== undefined) {
         fetchOptions.body = body;
       }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        return Err(await this.createErrorFromResponse(response));
      }

      // Parse response
      const data = await this.parseResponse<T>(response);
      const responseHeaders = this.extractHeaders(response);

      return Ok({
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        return Err(ErrorFactory.timeoutError('Request timeout', timeout));
      }

      return Err(this.createErrorFromException(error));
    }
  }

  /**
   * Build full URL
   */
  private buildURL(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseURL}/${cleanPath}`;
  }

  /**
   * Build request headers
   */
  private buildHeaders(headers?: Record<string, string>): Record<string, string> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WooHeadless-SDK/1.0.0',
      ...this.config.headers
    };

    return { ...defaultHeaders, ...headers };
  }

  /**
   * Build request body
   */
  private buildBody(body?: unknown): string | undefined {
    if (!body) return undefined;
    
    if (typeof body === 'string') {
      return body;
    }

    return JSON.stringify(body);
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: globalThis.Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    if (contentType.includes('text/')) {
      return response.text() as Promise<T>;
    }

    // Default to JSON
    return response.json() as Promise<T>;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(response: globalThis.Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Create error from HTTP response
   */
  private async createErrorFromResponse(response: globalThis.Response): Promise<WooError> {
    const status = response.status;
    const statusText = response.statusText;

    // Handle rate limiting
    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      return ErrorFactory.rateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }

    // Handle authentication errors
    if (status === 401 || status === 403) {
      return ErrorFactory.authError(`Authentication failed: ${statusText}`, undefined, status);
    }

    // Try to get error details from response body
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    return ErrorFactory.apiError(`HTTP ${status}: ${statusText}`, status, details);
  }

  /**
   * Create error from exception
   */
  private createErrorFromException(error: unknown): WooError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return ErrorFactory.timeoutError('Request was aborted', this.config.timeout);
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        return ErrorFactory.networkError(error.message);
      }
    }

    return ErrorFactory.networkError(
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: WooError, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Use custom retry condition if provided
    if (this.config.retryCondition) {
      return this.config.retryCondition(error);
    }

    // Default retry logic
    return error.retryable === true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitteredDelay = exponentialDelay + Math.random() * 1000; // Add jitter
    
    return Math.min(jitteredDelay, this.config.maxRetryDelay);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 