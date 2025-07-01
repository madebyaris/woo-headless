/**
 * Review and Rating management module for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

import { HttpClient } from '../../core/client';
import { CacheManager } from '../../core/cache';
import { Result, Ok, Err } from '../../types/result';
import { WooError, ErrorFactory } from '../../types/errors';
import { 
  ProductReview,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewListParams,
  ReviewListResponse,
  ReviewAnalytics,
  ReviewValidationResult,
  ReviewVote,
  ReviewModeration,
  RatingDistribution,
  ReviewStatus,
  ReviewSearchConfig,
  ReviewFilter,
  ReviewImage
} from '../../types/review';
/**
 * Review validation schema
 */
const CreateReviewSchema = {
  product_id: { min: 1, type: 'number' },
  review: { min: 10, max: 10000, type: 'string' },
  reviewer: { min: 1, max: 100, type: 'string' },
  reviewer_email: { type: 'email' },
  rating: { min: 1, max: 5, type: 'number' },
  parent_id: { type: 'number', optional: true },
  images: { type: 'array', optional: true }
};

/**
 * Review service class with comprehensive functionality
 */
export class ReviewService {
  private readonly client: HttpClient;
  private readonly cache: CacheManager;
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(client: HttpClient, cache: CacheManager) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * List reviews with advanced filtering and pagination
   */
  async list(params: ReviewListParams = {}): Promise<Result<ReviewListResponse, WooError>> {
    try {
      // Validate parameters
      const validationResult = this.validateListParams(params);
      if (!validationResult.success) {
        return validationResult;
      }

      // Build query parameters
      const queryParams = this.buildQueryParams(params);
      const cacheKey = `reviews:list:${JSON.stringify(queryParams)}`;

      // Check cache
      const cachedResult = await this.cache.get<ReviewListResponse>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Make API request
      const response = await this.client.get<ProductReview[]>(
        `/products/reviews?${new URLSearchParams(queryParams as any).toString()}`
      );

      if (!response.success) {
        return response;
      }

      // Extract pagination from headers
      const totalReviews = parseInt(response.data.headers['x-wp-total'] || '0');
      const totalPages = parseInt(response.data.headers['x-wp-totalpages'] || '0');

      // Process and validate reviews
      const reviews = response.data.data;
      
      // Calculate rating distribution and average
      const ratingDistribution = this.calculateRatingDistribution(reviews);
      const averageRating = ratingDistribution.average;

      const result: ReviewListResponse = {
        reviews,
        totalReviews,
        totalPages,
        currentPage: params.page || 1,
        perPage: params.limit || 10,
        averageRating,
        ratingDistribution
      };

      // Cache the result with TTL
      await this.cache.set(cacheKey, result, 300); // 5 minutes cache

      return Ok(result);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to list reviews',
        500,
        error
      ));
    }
  }

  /**
   * Get a single review by ID
   */
  async get(reviewId: number): Promise<Result<ProductReview, WooError>> {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError('Invalid review ID'));
      }

      const cacheKey = `reviews:single:${reviewId}`;

      // Check cache
      const cachedResult = await this.cache.get<ProductReview>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Make API request
      const response = await this.client.get<ProductReview>(`/products/reviews/${reviewId}`);

      if (!response.success) {
        if (response.error.statusCode === 404) {
          return Err(ErrorFactory.validationError('Review not found'));
        }
        return response;
      }

      const review = response.data.data;

      // Cache the result
      await this.cache.set(cacheKey, review, 600); // 10 minutes cache

      return Ok(review);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get review',
        500,
        error
      ));
    }
  }

  /**
   * Create a new review with validation and rate limiting
   */
  async create(reviewData: CreateReviewRequest): Promise<Result<ProductReview, WooError>> {
    try {
      // Validate request data
      const validation = await this.validateReview(reviewData);
      if (!validation.isValid) {
        return Err(ErrorFactory.validationError(
          'Review validation failed',
          validation.errors
        ));
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(reviewData.reviewer_email);
      if (!rateLimitCheck.success) {
        return rateLimitCheck;
      }

      // Process images if provided
      let processedImages: ReviewImage[] = [];
      if (reviewData.images && reviewData.images.length > 0) {
        const imageResult = await this.processReviewImages(reviewData.images);
        if (!imageResult.success) {
          return imageResult;
        }
        processedImages = imageResult.data;
      }

      // Prepare review payload
      const reviewPayload = {
        product_id: reviewData.product_id,
        review: this.sanitizeContent(reviewData.review),
        reviewer: this.sanitizeContent(reviewData.reviewer),
        reviewer_email: reviewData.reviewer_email,
        rating: reviewData.rating,
        parent: reviewData.parent_id || 0,
        status: validation.requiresModeration ? 'hold' : 'approved'
      };

      // Submit review
      const response = await this.client.post<ProductReview>('/products/reviews', reviewPayload);

      if (!response.success) {
        return response;
      }

      const createdReview = response.data.data;

      // Attach images if any
      if (processedImages.length > 0) {
        await this.attachImagesToReview(createdReview.id, processedImages);
      }

      // Update rate limiting counter
      this.updateRateLimit(reviewData.reviewer_email);

      // Invalidate related caches
      await this.invalidateReviewCaches(reviewData.product_id);

      // Log analytics event
      await this.trackReviewEvent('review_created', {
        reviewId: createdReview.id,
        productId: reviewData.product_id,
        rating: reviewData.rating,
        hasImages: processedImages.length > 0
      });

      return Ok(createdReview);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to create review',
        500,
        error
      ));
    }
  }

  /**
   * Update an existing review
   */
  async update(reviewId: number, updateData: UpdateReviewRequest): Promise<Result<ProductReview, WooError>> {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError('Invalid review ID'));
      }

      // Get existing review first
      const existingReview = await this.get(reviewId);
      if (!existingReview.success) {
        return existingReview;
      }

      // Prepare update payload
      const updatePayload: any = {};
      
      if (updateData.review !== undefined) {
        updatePayload.review = this.sanitizeContent(updateData.review);
      }
      
      if (updateData.rating !== undefined) {
        if (updateData.rating < 1 || updateData.rating > 5) {
          return Err(ErrorFactory.validationError('Rating must be between 1 and 5'));
        }
        updatePayload.rating = updateData.rating;
      }
      
      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status;
      }

      // Update review
      const response = await this.client.put<ProductReview>(`/products/reviews/${reviewId}`, updatePayload);

      if (!response.success) {
        return response;
      }

      const updatedReview = response.data.data;

      // Update images if provided
      if (updateData.images) {
        await this.updateReviewImages(reviewId, updateData.images);
      }

      // Invalidate caches
      await this.cache.delete(`reviews:single:${reviewId}`);
      await this.invalidateReviewCaches(existingReview.data.product_id);

      return Ok(updatedReview);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to update review',
        500,
        error
      ));
    }
  }

  /**
   * Delete a review
   */
  async delete(reviewId: number, force = false): Promise<Result<boolean, WooError>> {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError('Invalid review ID'));
      }

      // Get review first to get product ID for cache invalidation
      const existingReview = await this.get(reviewId);
      if (!existingReview.success) {
        return existingReview;
      }

      // Delete review
      const response = await this.client.delete(`/products/reviews/${reviewId}?force=${force}`);

      if (!response.success) {
        return response;
      }

      // Invalidate caches
      await this.cache.delete(`reviews:single:${reviewId}`);
      await this.invalidateReviewCaches(existingReview.data.product_id);

      return Ok(true);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to delete review',
        500,
        error
      ));
    }
  }

  /**
   * Get reviews for a specific product with analytics
   */
  async getProductReviews(productId: number, params: Omit<ReviewListParams, 'product'> = {}): Promise<Result<ReviewListResponse, WooError>> {
    return this.list({ ...params, product: productId });
  }

  /**
   * Get review analytics for a product
   */
  async getAnalytics(productId: number, period = '30d'): Promise<Result<ReviewAnalytics, WooError>> {
    try {
      if (!productId || productId <= 0) {
        return Err(ErrorFactory.validationError('Invalid product ID'));
      }

      const cacheKey = `reviews:analytics:${productId}:${period}`;

      // Check cache
      const cachedResult = await this.cache.get<ReviewAnalytics>(cacheKey);
      if (cachedResult.success && cachedResult.data) {
        return Ok(cachedResult.data);
      }

      // Get all reviews for the product
      const reviewsResult = await this.getProductReviews(productId, { limit: 1000 });
      if (!reviewsResult.success) {
        return reviewsResult;
      }

      const reviews = reviewsResult.data.reviews;
      const ratingDistribution = this.calculateRatingDistribution(reviews);

      // Calculate analytics
      const verifiedReviews = reviews.filter(r => r.verified);
      const reviewsWithReplies = reviews.filter(r => r.replies && r.replies.length > 0);
      const totalHelpfulVotes = reviews.reduce((sum, r) => sum + r.helpful_votes, 0);

      // Get previous period data for trend analysis
      const previousPeriodData = await this.getPreviousPeriodData(productId, period);

      const analytics: ReviewAnalytics = {
        productId,
        totalReviews: reviews.length,
        averageRating: ratingDistribution.average,
        ratingDistribution,
        verifiedPurchaseRatio: reviews.length > 0 ? (verifiedReviews.length / reviews.length) * 100 : 0,
        responseRate: reviews.length > 0 ? (reviewsWithReplies.length / reviews.length) * 100 : 0,
        helpfulnessRatio: reviews.length > 0 ? totalHelpfulVotes / reviews.length : 0,
        recentTrend: {
          period,
          averageRating: ratingDistribution.average,
          reviewCount: reviews.length,
          ratingChange: previousPeriodData ? ratingDistribution.average - previousPeriodData.averageRating : 0
        },
        topKeywords: await this.extractTopKeywords(reviews)
      };

      // Cache analytics
      await this.cache.set(cacheKey, analytics, 3600); // 1 hour cache

      return Ok(analytics);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to get review analytics',
        500,
        error
      ));
    }
  }

  /**
   * Vote on review helpfulness
   */
  async voteHelpful(reviewId: number, voteType: 'helpful' | 'not_helpful', userEmail?: string): Promise<Result<ReviewVote, WooError>> {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError('Invalid review ID'));
      }

      // Check if user already voted
      if (userEmail) {
        const existingVote = await this.getUserVote(reviewId, userEmail);
        if (existingVote) {
          return Err(ErrorFactory.validationError('User has already voted on this review'));
        }
      }

      // Submit vote
      const votePayload = {
        review_id: reviewId,
        vote_type: voteType,
        user_email: userEmail,
        voted_at: new Date().toISOString()
      };

      const response = await this.client.post<ReviewVote>(`/products/reviews/${reviewId}/vote`, votePayload);

      if (!response.success) {
        return response;
      }

      // Invalidate review cache
      await this.cache.delete(`reviews:single:${reviewId}`);

      return Ok(response.data.data);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to vote on review',
        500,
        error
      ));
    }
  }

  /**
   * Moderate a review (approve, hold, spam, trash)
   */
  async moderate(reviewId: number, action: ReviewStatus, reason?: string): Promise<Result<ReviewModeration, WooError>> {
    try {
      if (!reviewId || reviewId <= 0) {
        return Err(ErrorFactory.validationError('Invalid review ID'));
      }

      const validActions: ReviewStatus[] = ['approved', 'hold', 'spam', 'trash'];
      if (!validActions.includes(action)) {
        return Err(ErrorFactory.validationError('Invalid moderation action'));
      }

      // Update review status
      const updateResult = await this.update(reviewId, { status: action });
      if (!updateResult.success) {
        return updateResult;
      }

      // Log moderation action
      const moderation: ReviewModeration = {
        review_id: reviewId,
        action,
        reason,
        moderated_at: new Date().toISOString(),
        automated: false
      };

      // Track moderation event
      await this.trackReviewEvent('review_moderated', {
        reviewId,
        action,
        reason
      });

      return Ok(moderation);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to moderate review',
        500,
        error
      ));
    }
  }

  /**
   * Search reviews with advanced filtering
   */
  async search(config: ReviewSearchConfig): Promise<Result<ReviewListResponse, WooError>> {
    try {
      // Convert search config to list params
      const params: ReviewListParams = {
        page: config.pagination.page,
        limit: config.pagination.limit,
        search: config.query
      };

      // Apply filters
      if (config.filters) {
        for (const filter of config.filters) {
          this.applyFilterToParams(params, filter);
        }
      }

      // Apply sorting
      if (config.sort && config.sort.length > 0) {
        const primarySort = config.sort[0];
        params.orderby = primarySort.field as any;
        params.order = primarySort.direction;
      }

      return this.list(params);
    } catch (error) {
      return Err(ErrorFactory.apiError(
        'Failed to search reviews',
        500,
        error
      ));
    }
  }

  // Private helper methods

  private validateListParams(params: ReviewListParams): Result<void, WooError> {
    if (params.page && params.page < 1) {
      return Err(ErrorFactory.validationError('Page must be >= 1'));
    }
    
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return Err(ErrorFactory.validationError('Limit must be between 1 and 100'));
    }
    
    if (params.rating) {
      const ratings = Array.isArray(params.rating) ? params.rating : [params.rating];
      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          return Err(ErrorFactory.validationError('Rating must be between 1 and 5'));
        }
      }
    }

    return Ok(undefined);
  }

  private buildQueryParams(params: ReviewListParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.per_page = params.limit.toString();
    if (params.product) {
      queryParams.product = Array.isArray(params.product) 
        ? params.product.join(',') 
        : params.product.toString();
    }
    if (params.status) {
      queryParams.status = Array.isArray(params.status) 
        ? params.status.join(',') 
        : params.status;
    }
    if (params.reviewer) queryParams.reviewer = params.reviewer;
    if (params.reviewer_email) queryParams.reviewer_email = params.reviewer_email;
    if (params.rating) {
      queryParams.rating = Array.isArray(params.rating) 
        ? params.rating.join(',') 
        : params.rating.toString();
    }
    if (params.verified !== undefined) queryParams.verified = params.verified.toString();
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;
    if (params.search) queryParams.search = params.search;
    if (params.orderby) queryParams.orderby = params.orderby;
    if (params.order) queryParams.order = params.order;
    if (params.include) queryParams.include = params.include.join(',');
    if (params.exclude) queryParams.exclude = params.exclude.join(',');
    if (params.parent) queryParams.parent = params.parent.toString();
    if (params.offset) queryParams.offset = params.offset.toString();

    return queryParams;
  }

  private calculateRatingDistribution(reviews: readonly ProductReview[]): RatingDistribution {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (const review of reviews) {
      const rating = Math.floor(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    }

    const total = reviews.length;
    const average = total > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total 
      : 0;

    const percentage = {
      1: total > 0 ? (distribution[1] / total) * 100 : 0,
      2: total > 0 ? (distribution[2] / total) * 100 : 0,
      3: total > 0 ? (distribution[3] / total) * 100 : 0,
      4: total > 0 ? (distribution[4] / total) * 100 : 0,
      5: total > 0 ? (distribution[5] / total) * 100 : 0
    };

    return {
      ...distribution,
      total,
      average: Math.round(average * 100) / 100,
      percentage
    };
  }

  private async validateReview(reviewData: CreateReviewRequest): Promise<ReviewValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Schema validation
      CreateReviewSchema.parse(reviewData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message));
      }
    }

    // Content validation
    const spamScore = await this.calculateSpamScore(reviewData.review);
    const requiresModeration = spamScore > 70 || this.containsProfanity(reviewData.review);

    if (spamScore > 90) {
      errors.push('Review appears to be spam');
    } else if (spamScore > 70) {
      warnings.push('Review may require manual moderation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      requiresModeration,
      spamScore
    };
  }

  private async checkRateLimit(userEmail: string): Promise<Result<void, WooError>> {
    const now = Date.now();
    const userKey = userEmail.toLowerCase();
    const userLimit = this.rateLimitStore.get(userKey);

    // Default rate limits
    const maxPerHour = 5;
    const hourInMs = 60 * 60 * 1000;

    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= maxPerHour) {
          return Err(ErrorFactory.rateLimitError(
            'Too many reviews submitted. Please wait before submitting another review.',
            Math.ceil((userLimit.resetTime - now) / 1000)
          ));
        }
      } else {
        // Reset counter
        this.rateLimitStore.set(userKey, { count: 0, resetTime: now + hourInMs });
      }
    } else {
      // First time user
      this.rateLimitStore.set(userKey, { count: 0, resetTime: now + hourInMs });
    }

    return Ok(undefined);
  }

  private updateRateLimit(userEmail: string): void {
    const userKey = userEmail.toLowerCase();
    const userLimit = this.rateLimitStore.get(userKey);
    
    if (userLimit) {
      userLimit.count++;
      this.rateLimitStore.set(userKey, userLimit);
    }
  }

  private sanitizeContent(content: string): string {
    // Basic HTML sanitization - in production, use a proper sanitization library
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }

  private async calculateSpamScore(content: string): Promise<number> {
    // Simple spam detection - in production, use more sophisticated methods
    let score = 0;
    
    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) score += 30;
    
    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 2) score += 25;
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /click here/gi,
      /free offer/gi,
      /limited time/gi,
      /act now/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) score += 20;
    }
    
    return Math.min(score, 100);
  }

  private containsProfanity(content: string): boolean {
    // Basic profanity filter - in production, use a comprehensive profanity filter
    const profanityWords = ['spam', 'fake', 'scam']; // Minimal list for example
    const lowerContent = content.toLowerCase();
    
    return profanityWords.some(word => lowerContent.includes(word));
  }

  private async processReviewImages(images: readonly (File | string)[]): Promise<Result<ReviewImage[], WooError>> {
    // Image processing implementation would go here
    // For now, return empty array
    return Ok([]);
  }

  private async attachImagesToReview(reviewId: number, images: ReviewImage[]): Promise<void> {
    // Implementation for attaching images to review
  }

  private async updateReviewImages(reviewId: number, images: ReviewImage[]): Promise<void> {
    // Implementation for updating review images
  }

  private async invalidateReviewCaches(productId: number): Promise<void> {
    // Invalidate all review-related caches for a product
    const cacheKeys = [
      `reviews:list:*${productId}*`,
      `reviews:analytics:${productId}*`
    ];
    
    for (const pattern of cacheKeys) {
      await this.cache.deletePattern(pattern);
    }
  }

  private async trackReviewEvent(event: string, data: any): Promise<void> {
    // Analytics tracking implementation
    console.log(`Review event: ${event}`, data);
  }

  private async getUserVote(reviewId: number, userEmail: string): Promise<ReviewVote | null> {
    // Check if user has already voted - implementation would query database
    return null;
  }

  private async getPreviousPeriodData(productId: number, period: string): Promise<{ averageRating: number } | null> {
    // Get previous period data for trend analysis
    return null;
  }

  private async extractTopKeywords(reviews: readonly ProductReview[]): Promise<Array<{keyword: string; count: number; sentiment: 'positive' | 'negative' | 'neutral'}>> {
    // Extract and analyze keywords from reviews
    // This would use NLP libraries in production
    return [];
  }

  private applyFilterToParams(params: ReviewListParams, filter: ReviewFilter): void {
    // Apply individual filter to params object
    switch (filter.field) {
      case 'rating':
        if (filter.operator === 'eq') {
          params.rating = filter.value as number;
        }
        break;
      case 'verified':
        if (filter.operator === 'eq') {
          params.verified = filter.value as boolean;
        }
        break;
      // Add more filter implementations
    }
  }
} 