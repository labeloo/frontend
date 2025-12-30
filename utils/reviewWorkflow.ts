import type {
  Review,
  ReviewAction,
  ReviewStatus,
  TaskStatus,
  ProjectReviewSettings,
  ReviewMode
} from '~/types/reviews'

// ============================================================================
// Types
// ============================================================================

/**
 * Display information for workflow status badges/labels
 */
export interface WorkflowStatusDisplay {
  /** Human-readable label */
  label: string
  /** Color theme for UI components (e.g., 'success', 'warning', 'error') */
  color: string
  /** Icon name for the status */
  icon: string
}

/**
 * Result of checking if a user can submit a review
 */
export interface CanSubmitReviewResult {
  /** Whether the user can submit a review */
  can: boolean
  /** Reason why the user cannot submit (if can is false) */
  reason?: string
}

/**
 * Annotation data structure for workflow utilities
 */
export interface AnnotationForWorkflow {
  /** ID of the user who created the annotation */
  annotatorId?: number
  /** Current status of the annotation/task */
  status?: TaskStatus
  /** Review status if applicable */
  reviewStatus?: ReviewStatus
}

// ============================================================================
// Status Display Utilities
// ============================================================================

/**
 * Get display information for workflow status based on annotation state and workflow mode
 * @param annotation - The annotation data
 * @param workflowMode - The project's review mode
 * @returns Display information including label, color, and icon
 */
export const getWorkflowStatusDisplay = (
  annotation: AnnotationForWorkflow,
  workflowMode: ReviewMode
): WorkflowStatusDisplay => {
  const status = annotation.status
  const reviewStatus = annotation.reviewStatus

  // Handle based on task status first
  switch (status) {
    case 'unassigned':
      return {
        label: 'Unassigned',
        color: 'neutral',
        icon: 'i-heroicons-user-minus'
      }

    case 'annotating':
      return {
        label: 'In Progress',
        color: 'info',
        icon: 'i-heroicons-pencil-square'
      }

    case 'in_review':
      // Check review status for more specific display
      if (reviewStatus === 'pending') {
        return {
          label: 'Pending Review',
          color: 'warning',
          icon: 'i-heroicons-clock'
        }
      }
      return {
        label: 'In Review',
        color: 'warning',
        icon: 'i-heroicons-eye'
      }

    case 'changes_needed':
      return {
        label: 'Changes Requested',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      }

    case 'completed':
      // Check if it was auto-approved based on workflow mode
      if (workflowMode === 'always-skip') {
        return {
          label: 'Completed (No Review)',
          color: 'success',
          icon: 'i-heroicons-check-circle'
        }
      }
      if (reviewStatus === 'approved') {
        return {
          label: 'Approved',
          color: 'success',
          icon: 'i-heroicons-check-badge'
        }
      }
      return {
        label: 'Completed',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      }

    default:
      return {
        label: 'Unknown',
        color: 'neutral',
        icon: 'i-heroicons-question-mark-circle'
      }
  }
}

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Check if a user can submit a review for an annotation
 * @param annotation - The annotation to review
 * @param currentUserId - The ID of the current user
 * @param projectSettings - The project's review settings
 * @returns Object indicating if user can review and reason if not
 */
export const canUserSubmitReview = (
  annotation: AnnotationForWorkflow,
  currentUserId: number,
  projectSettings: ProjectReviewSettings
): CanSubmitReviewResult => {
  // Check if annotation is in a reviewable state
  if (annotation.status !== 'in_review') {
    return {
      can: false,
      reason: 'This annotation is not currently in review'
    }
  }

  // Check self-review permission
  if (annotation.annotatorId === currentUserId && !projectSettings.allowSelfReview) {
    return {
      can: false,
      reason: 'You cannot review your own annotations'
    }
  }

  // Check if review mode allows reviews
  if (projectSettings.reviewMode === 'always-skip') {
    return {
      can: false,
      reason: 'Reviews are disabled for this project'
    }
  }

  return { can: true }
}

// ============================================================================
// Label Utilities
// ============================================================================

/**
 * Get human-readable label for a review action
 * @param status - The review action/status
 * @returns Human-readable label
 */
export const getReviewActionLabel = (status: ReviewAction | ReviewStatus): string => {
  const labels: Record<string, string> = {
    approved: 'Approve',
    rejected: 'Reject',
    changes_requested: 'Request Changes',
    pending: 'Pending'
  }

  return labels[status] || status
}

/**
 * Get human-readable label for a task status
 * @param taskStatus - The task status
 * @returns Human-readable label
 */
export const getTaskStatusLabel = (taskStatus: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    unassigned: 'Unassigned',
    annotating: 'Annotating',
    in_review: 'In Review',
    changes_needed: 'Changes Needed',
    completed: 'Completed'
  }

  return labels[taskStatus] || taskStatus
}

/**
 * Get color theme for a task status
 * @param taskStatus - The task status
 * @returns Color theme string for UI components
 */
export const getTaskStatusColor = (taskStatus: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    unassigned: 'neutral',
    annotating: 'info',
    in_review: 'warning',
    changes_needed: 'error',
    completed: 'success'
  }

  return colors[taskStatus] || 'neutral'
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a review message for display, with optional truncation
 * @param review - The review object
 * @param maxLength - Maximum length before truncation (default: 100)
 * @returns Formatted message string
 */
export const formatReviewMessage = (
  review: Pick<Review, 'message' | 'isAutoApproved'>,
  maxLength: number = 100
): string => {
  // Handle auto-approved reviews
  if (review.isAutoApproved) {
    return 'Automatically approved'
  }

  // Handle null or empty messages
  if (!review.message || review.message.trim() === '') {
    return 'No feedback provided'
  }

  const message = review.message.trim()

  // Truncate if necessary
  if (message.length > maxLength) {
    return `${message.substring(0, maxLength).trim()}...`
  }

  return message
}

/**
 * Format a review message for full display (no truncation)
 * @param review - The review object
 * @returns Full formatted message string
 */
export const formatReviewMessageFull = (
  review: Pick<Review, 'message' | 'isAutoApproved'>
): string => {
  if (review.isAutoApproved) {
    return 'This annotation was automatically approved based on project settings.'
  }

  if (!review.message || review.message.trim() === '') {
    return 'No feedback was provided with this review.'
  }

  return review.message.trim()
}

// ============================================================================
// Sorting Utilities
// ============================================================================

/**
 * Sort reviews by review round in descending order (newest first)
 * @param reviews - Array of reviews to sort
 * @returns New sorted array of reviews
 */
export const sortReviewsByRound = <T extends Pick<Review, 'reviewRound'>>(
  reviews: T[]
): T[] => {
  return [...reviews].sort((a, b) => b.reviewRound - a.reviewRound)
}

/**
 * Sort reviews by creation date in descending order (newest first)
 * @param reviews - Array of reviews to sort
 * @returns New sorted array of reviews
 */
export const sortReviewsByDate = <T extends Pick<Review, 'createdAt'>>(
  reviews: T[]
): T[] => {
  return [...reviews].sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Group reviews by review round
 * @param reviews - Array of reviews to group
 * @returns Map of review round to reviews
 */
export const groupReviewsByRound = <T extends Pick<Review, 'reviewRound'>>(
  reviews: T[]
): Map<number, T[]> => {
  const grouped = new Map<number, T[]>()

  for (const review of reviews) {
    const round = review.reviewRound
    const existing = grouped.get(round) || []
    existing.push(review)
    grouped.set(round, existing)
  }

  return grouped
}

// ============================================================================
// Review Status Utilities
// ============================================================================

/**
 * Check if a review status indicates the annotation was accepted
 * @param status - The review status
 * @returns True if the annotation was approved
 */
export const isReviewApproved = (status: ReviewStatus): boolean => {
  return status === 'approved'
}

/**
 * Check if a review status indicates changes are needed
 * @param status - The review status
 * @returns True if changes are needed
 */
export const isReviewNeedsChanges = (status: ReviewStatus): boolean => {
  return status === 'changes_requested' || status === 'rejected'
}

/**
 * Check if a review is still pending
 * @param status - The review status
 * @returns True if the review is pending
 */
export const isReviewPending = (status: ReviewStatus): boolean => {
  return status === 'pending'
}

/**
 * Get the latest review from an array of reviews
 * @param reviews - Array of reviews
 * @returns The most recent review or undefined if empty
 */
export const getLatestReview = <T extends Pick<Review, 'reviewRound' | 'createdAt'>>(
  reviews: T[]
): T | undefined => {
  if (reviews.length === 0) return undefined

  return reviews.reduce((latest, current) => {
    // First compare by round, then by creation date
    if (current.reviewRound > latest.reviewRound) return current
    if (current.reviewRound === latest.reviewRound && current.createdAt > latest.createdAt) {
      return current
    }
    return latest
  })
}
