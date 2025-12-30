/**
 * Review System Type Definitions
 * 
 * This module contains all TypeScript type definitions for the review functionality
 * in Labeloo.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Represents the current status of a review
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'

/**
 * Represents an action that can be taken on a review
 */
export type ReviewAction = 'approved' | 'rejected' | 'changes_requested'

/**
 * Represents the review mode configuration for a project
 * - 'auto': Automatically approve annotations based on criteria
 * - 'always-required': All annotations require manual review
 * - 'always-skip': Skip review process entirely
 */
export type ReviewMode = 'auto' | 'always-required' | 'always-skip'

/**
 * Represents the current status of an annotation task
 */
export type TaskStatus = 'unassigned' | 'annotating' | 'in_review' | 'changes_needed' | 'completed'

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Represents a review record in the system
 */
export interface Review {
  /** Unique identifier for the review */
  id: string
  /** ID of the annotation being reviewed */
  annotationId: number
  /** ID of the task associated with the annotation */
  taskId: number
  /** ID of the project containing the task */
  projectId: number
  /** ID of the user performing the review */
  reviewerId: number
  /** Current status of the review */
  status: ReviewStatus
  /** Optional message/feedback from the reviewer */
  message: string | null
  /** Whether the review was automatically approved */
  isAutoApproved: boolean
  /** Current round of review (for multi-round reviews) */
  reviewRound: number
  /** Timestamp when the review was created (Unix timestamp) */
  createdAt: number
  /** Timestamp when the review was last updated (Unix timestamp) */
  updatedAt: number
  /** Email of the reviewer (optional, populated in joined queries) */
  reviewerEmail?: string
}

/**
 * Extended review interface with additional context information
 * Used for detailed views and review dashboards
 */
export interface ReviewWithContext extends Review {
  /** URL to access the task's data/image */
  taskDataUrl?: string
  /** Current status of the associated task */
  taskStatus?: TaskStatus
  /** The annotation data being reviewed */
  annotationData?: any
  /** ID of the user who created the annotation */
  annotatorId?: number
  /** Name of the project containing the review */
  projectName?: string
}

// ============================================================================
// Payload Interfaces
// ============================================================================

/**
 * Payload for creating a new review
 */
export interface CreateReviewPayload {
  /** The review action/decision */
  status: ReviewAction
  /** Optional feedback message for the annotator */
  message?: string
  /** Whether to notify the annotator about the review */
  notifyAnnotator?: boolean
}

/**
 * Payload for updating an existing review
 */
export interface UpdateReviewPayload {
  /** Updated review action/decision */
  status?: ReviewAction
  /** Updated feedback message */
  message?: string
}

// ============================================================================
// Settings & Configuration Interfaces
// ============================================================================

/**
 * Project-level review configuration settings
 */
export interface ProjectReviewSettings {
  /** The review mode for the project */
  reviewMode: ReviewMode
  /** Whether annotators can review their own annotations */
  allowSelfReview: boolean
  /** Whether to automatically assign reviewers to submissions */
  autoAssignReviewer: boolean
}

/**
 * Represents a user eligible to perform reviews
 */
export interface EligibleReviewer {
  /** User's unique identifier */
  userId: number
  /** User's email address */
  email: string
  /** Number of pending reviews assigned to this user */
  pendingReviewCount: number
}

// ============================================================================
// Response Interfaces
// ============================================================================

/**
 * Paginated response for review listings
 */
export interface PaginatedReviews {
  /** Array of reviews with context information */
  reviews: ReviewWithContext[]
  /** Total number of reviews matching the query */
  total: number
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  limit: number
}

/**
 * Result of workflow mode determination
 * Indicates whether a submission should be auto-approved or requires review
 */
export interface WorkflowModeResult {
  /** The determined workflow mode */
  mode: 'auto-approve' | 'review-required'
  /** ID of the assigned reviewer (if review is required) */
  assignedReviewer?: number
}
