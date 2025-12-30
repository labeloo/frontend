import type { Review } from '~/types/reviews'

/**
 * Response from the annotation completion API
 */
export interface AnnotationCompletionResponse {
  /** Whether the annotation requires review */
  requiresReview: boolean
  /** ID of the assigned reviewer (if review is required) */
  assignedReviewer?: number
  /** Email of the assigned reviewer (if available) */
  assignedReviewerEmail?: string
  /** The created review record (if review is required) */
  review?: Review
  /** Whether the annotation was auto-approved */
  isAutoApproved?: boolean
  /** The new status of the annotation */
  status: string
}

/**
 * Completion message configuration
 */
export interface CompletionMessage {
  /** Toast title */
  title: string
  /** Toast description */
  description: string
  /** Toast color */
  color: 'success' | 'info' | 'warning'
  /** Icon name */
  icon: string
}

/**
 * Composable for handling annotation completion with review workflow integration
 * 
 * Manages the logic for completing annotations, determining if review is required,
 * and providing appropriate user feedback based on the workflow configuration.
 */
export const useAnnotationCompletion = () => {
  const apiUrl = useApiUrl()
  const token = useCookie('auth_token')
  const toast = useToast()

  // Loading state
  const isCompleting = ref(false)

  /**
   * Get authorization headers for API requests
   */
  const getHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
  })

  /**
   * Format error message from API response
   */
  const formatError = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'object' && error !== null) {
      const err = error as { data?: { message?: string }; message?: string }
      return err.data?.message || err.message || 'An unexpected error occurred'
    }
    return 'An unexpected error occurred'
  }

  /**
   * Get the appropriate completion message based on the API response
   * @param response - The completion API response
   * @returns Message configuration for the toast
   */
  const getCompletionMessage = (response: AnnotationCompletionResponse): CompletionMessage => {
    // Auto-approved case
    if (!response.requiresReview || response.isAutoApproved) {
      return {
        title: 'Annotation Completed',
        description: 'Your annotation has been completed and auto-approved.',
        color: 'success',
        icon: 'i-heroicons-check-badge'
      }
    }

    // Review required with assigned reviewer
    if (response.assignedReviewer && response.assignedReviewerEmail) {
      return {
        title: 'Submitted for Review',
        description: `Your annotation has been submitted and assigned to ${response.assignedReviewerEmail} for review.`,
        color: 'info',
        icon: 'i-heroicons-user-circle'
      }
    }

    // Review required without specific reviewer assignment
    if (response.assignedReviewer) {
      return {
        title: 'Submitted for Review',
        description: 'Your annotation has been submitted and assigned to a reviewer.',
        color: 'info',
        icon: 'i-heroicons-eye'
      }
    }

    // Review required, waiting for reviewer assignment
    return {
      title: 'Submitted for Review',
      description: 'Your annotation has been submitted for review. You\'ll be notified when it\'s reviewed.',
      color: 'info',
      icon: 'i-heroicons-clock'
    }
  }

  /**
   * Get a short status message for inline display
   * @param response - The completion API response
   * @returns Short status message string
   */
  const getStatusMessage = (response: AnnotationCompletionResponse): string => {
    if (!response.requiresReview || response.isAutoApproved) {
      return 'Completed and auto-approved'
    }

    if (response.assignedReviewerEmail) {
      return `Pending review by ${response.assignedReviewerEmail}`
    }

    if (response.assignedReviewer) {
      return 'Pending review'
    }

    return 'Submitted for review'
  }

  /**
   * Check if the annotation was successfully completed (either approved or submitted for review)
   * @param response - The completion API response
   * @returns Whether the completion was successful
   */
  const isCompletionSuccessful = (response: AnnotationCompletionResponse): boolean => {
    return response.status === 'completed' || response.status === 'in_review'
  }

  /**
   * Complete an annotation and handle the review workflow
   * @param annotationId - The annotation ID to complete
   * @param projectId - The project ID containing the annotation
   * @param taskId - Optional task ID for the annotation
   * @returns The completion response or null on error
   */
  const completeAnnotation = async (
    annotationId: number,
    projectId: number,
    taskId?: number
  ): Promise<AnnotationCompletionResponse | null> => {
    isCompleting.value = true

    try {
      const response = await $fetch<AnnotationCompletionResponse>(
        `${apiUrl}/api/projects/${projectId}/annotations/${annotationId}/complete`,
        {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include',
          body: taskId ? { taskId } : undefined
        }
      )

      // Show appropriate toast based on response
      const message = getCompletionMessage(response)
      toast.add({
        title: message.title,
        description: message.description,
        color: message.color
      })

      return response
    } catch (error) {
      const errorMessage = formatError(error)
      toast.add({
        title: 'Failed to Complete Annotation',
        description: errorMessage,
        color: 'error'
      })
      return null
    } finally {
      isCompleting.value = false
    }
  }

  /**
   * Submit annotation for review explicitly (when not using auto-complete flow)
   * @param annotationId - The annotation ID to submit
   * @param projectId - The project ID containing the annotation
   * @returns The completion response or null on error
   */
  const submitForReview = async (
    annotationId: number,
    projectId: number
  ): Promise<AnnotationCompletionResponse | null> => {
    isCompleting.value = true

    try {
      const response = await $fetch<AnnotationCompletionResponse>(
        `${apiUrl}/api/projects/${projectId}/annotations/${annotationId}/submit-for-review`,
        {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      // Show toast
      toast.add({
        title: 'Submitted for Review',
        description: 'Your annotation has been submitted and is waiting for review.',
        color: 'info'
      })

      return response
    } catch (error) {
      const errorMessage = formatError(error)
      toast.add({
        title: 'Failed to Submit for Review',
        description: errorMessage,
        color: 'error'
      })
      return null
    } finally {
      isCompleting.value = false
    }
  }

  /**
   * Resubmit annotation after making requested changes
   * @param annotationId - The annotation ID to resubmit
   * @param projectId - The project ID containing the annotation
   * @returns The completion response or null on error
   */
  const resubmitAfterChanges = async (
    annotationId: number,
    projectId: number
  ): Promise<AnnotationCompletionResponse | null> => {
    isCompleting.value = true

    try {
      const response = await $fetch<AnnotationCompletionResponse>(
        `${apiUrl}/api/projects/${projectId}/annotations/${annotationId}/resubmit`,
        {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      // Show toast
      const message = getCompletionMessage(response)
      toast.add({
        title: 'Changes Resubmitted',
        description: message.description,
        color: message.color
      })

      return response
    } catch (error) {
      const errorMessage = formatError(error)
      toast.add({
        title: 'Failed to Resubmit',
        description: errorMessage,
        color: 'error'
      })
      return null
    } finally {
      isCompleting.value = false
    }
  }

  return {
    // Methods
    completeAnnotation,
    submitForReview,
    resubmitAfterChanges,
    
    // Helpers
    getCompletionMessage,
    getStatusMessage,
    isCompletionSuccessful,

    // Loading state
    isCompleting: readonly(isCompleting)
  }
}
