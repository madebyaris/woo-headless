/**
 * Review and Rating system types for WooCommerce Headless SDK
 * Following the enhanced unified-10x-dev framework
 */

/**
 * Product review interface
 */
export interface ProductReview {
  readonly id: number;
  readonly date_created: string; // ISO 8601 datetime
  readonly date_created_gmt: string; // ISO 8601 datetime GMT
  readonly product_id: number;
  readonly status: ReviewStatus;
  readonly reviewer: string;
  readonly reviewer_email: string;
  readonly review: string;
  readonly rating: number; // 1-5 stars
  readonly verified: boolean; // True if reviewer purchased the product
  readonly reviewer_avatar_urls: {
    readonly '24': string;
    readonly '48': string;
    readonly '96': string;
  };
  readonly helpful_votes: number;
  readonly total_votes: number;
  readonly images?: readonly ReviewImage[];
  readonly parent_id?: number; // For threaded reviews
  readonly replies?: readonly ProductReview[];
  readonly flagged?: boolean;
}

/**
 * Review status enumeration
 */
export type ReviewStatus = 'approved' | 'hold' | 'spam' | 'unspam' | 'trash' | 'untrash';

/**
 * Review image attachment
 */
export interface ReviewImage {
  readonly id: string;
  readonly url: string;
  readonly alt: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size: number;
  readonly uploaded_at: string;
}

/**
 * New review submission interface
 */
export interface CreateReviewRequest {
  readonly product_id: number;
  readonly review: string;
  readonly reviewer: string;
  readonly reviewer_email: string;
  readonly rating: number; // 1-5 stars
  readonly parent_id?: number; // For reply to existing review
  readonly images?: readonly File[] | readonly string[]; // File objects or URLs
}

/**
 * Review update interface
 */
export interface UpdateReviewRequest {
  readonly review?: string;
  readonly rating?: number;
  readonly status?: ReviewStatus;
  readonly images?: readonly ReviewImage[];
}

/**
 * Review list parameters
 */
export interface ReviewListParams {
  readonly page?: number;
  readonly limit?: number;
  readonly product?: number | number[]; // Product ID(s)
  readonly status?: ReviewStatus | ReviewStatus[];
  readonly reviewer?: string; // Reviewer name or email
  readonly reviewer_email?: string;
  readonly reviewer_exclude?: string[]; // Exclude specific reviewers
  readonly rating?: number | number[]; // Filter by rating(s)
  readonly verified?: boolean; // Only verified purchases
  readonly after?: string; // Date filter - after this date
  readonly before?: string; // Date filter - before this date
  readonly search?: string; // Search in review content
  readonly orderby?: 'date' | 'date_gmt' | 'id' | 'rating' | 'helpful_votes';
  readonly order?: 'asc' | 'desc';
  readonly include?: number[]; // Include specific review IDs
  readonly exclude?: number[]; // Exclude specific review IDs
  readonly parent?: number; // Get replies to specific review
  readonly offset?: number;
}

/**
 * Review list response with pagination
 */
export interface ReviewListResponse {
  readonly reviews: readonly ProductReview[];
  readonly totalReviews: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly perPage: number;
  readonly averageRating: number;
  readonly ratingDistribution: RatingDistribution;
}

/**
 * Rating distribution analytics
 */
export interface RatingDistribution {
  readonly 1: number; // Count of 1-star reviews
  readonly 2: number; // Count of 2-star reviews
  readonly 3: number; // Count of 3-star reviews
  readonly 4: number; // Count of 4-star reviews
  readonly 5: number; // Count of 5-star reviews
  readonly total: number;
  readonly average: number;
  readonly percentage: {
    readonly 1: number;
    readonly 2: number;
    readonly 3: number;
    readonly 4: number;
    readonly 5: number;
  };
}

/**
 * Review statistics for analytics
 */
export interface ReviewAnalytics {
  readonly productId: number;
  readonly totalReviews: number;
  readonly averageRating: number;
  readonly ratingDistribution: RatingDistribution;
  readonly verifiedPurchaseRatio: number; // Percentage of verified reviews
  readonly responseRate: number; // Percentage of reviews with replies
  readonly helpfulnessRatio: number; // Average helpful votes per review
  readonly recentTrend: {
    readonly period: string; // '7d', '30d', '90d'
    readonly averageRating: number;
    readonly reviewCount: number;
    readonly ratingChange: number; // +/- change from previous period
  };
  readonly topKeywords: readonly {
    readonly keyword: string;
    readonly count: number;
    readonly sentiment: 'positive' | 'negative' | 'neutral';
  }[];
}

/**
 * Review helpful vote interface
 */
export interface ReviewVote {
  readonly review_id: number;
  readonly user_id?: number;
  readonly user_email?: string;
  readonly vote_type: 'helpful' | 'not_helpful';
  readonly voted_at: string;
  readonly ip_address?: string;
}

/**
 * Review validation result
 */
export interface ReviewValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canSubmit: boolean;
  readonly requiresModeration: boolean;
  readonly spamScore?: number; // 0-100, higher means more likely spam
}

/**
 * Review moderation interface
 */
export interface ReviewModeration {
  readonly review_id: number;
  readonly action: 'approve' | 'hold' | 'spam' | 'trash';
  readonly reason?: string;
  readonly moderator_id?: number;
  readonly moderated_at: string;
  readonly automated: boolean; // True if auto-moderated by system
}

/**
 * Review filter options for advanced filtering
 */
export interface ReviewFilter {
  readonly field: 'rating' | 'verified' | 'helpful_votes' | 'date' | 'reviewer';
  readonly operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  readonly value: string | number | boolean | readonly (string | number)[];
}

/**
 * Review sorting options
 */
export interface ReviewSort {
  readonly field: 'date' | 'rating' | 'helpful_votes' | 'verified';
  readonly direction: 'asc' | 'desc';
}

/**
 * Review search configuration
 */
export interface ReviewSearchConfig {
  readonly query?: string;
  readonly filters?: readonly ReviewFilter[];
  readonly sort?: readonly ReviewSort[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
  };
  readonly includeReplies?: boolean;
  readonly includeImages?: boolean;
  readonly includeAnalytics?: boolean;
}

/**
 * Review notification settings
 */
export interface ReviewNotificationSettings {
  readonly newReviewNotification: boolean;
  readonly replyNotification: boolean;
  readonly helpfulVoteNotification: boolean;
  readonly moderationNotification: boolean;
  readonly emailTemplate?: string;
  readonly webhookUrl?: string;
}

/**
 * Review export options
 */
export interface ReviewExportOptions {
  readonly format: 'json' | 'csv' | 'xlsx';
  readonly filters?: ReviewListParams;
  readonly fields?: readonly string[]; // Specific fields to export
  readonly includeImages: boolean;
  readonly includeReplies: boolean;
  readonly dateRange?: {
    readonly from: string;
    readonly to: string;
  };
}

/**
 * Review import options
 */
export interface ReviewImportOptions {
  readonly format: 'json' | 'csv';
  readonly validateBeforeImport: boolean;
  readonly skipDuplicates: boolean;
  readonly defaultStatus: ReviewStatus;
  readonly batchSize: number; // Number of reviews to process at once
}

/**
 * Review submission rate limiting
 */
export interface ReviewRateLimit {
  readonly maxReviewsPerHour: number;
  readonly maxReviewsPerDay: number;
  readonly cooldownPeriod: number; // Minutes between reviews from same user
  readonly skipLimitForVerified: boolean; // Skip limits for verified purchasers
} 