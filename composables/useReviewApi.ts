import type {
  Review,
  ReviewWithContext,
  CreateReviewPayload,
  UpdateReviewPayload,
  PaginatedReviews,
  ReviewStatus
} from '~/types/reviews'

/**
 * Filter options for fetching project reviews
 */
export interface ProjectReviewFilters {
  /** Filter by review status */
  status?: ReviewStatus
  /** Filter by reviewer ID */
  reviewerId?: number
  /** Page number for pagination (1-indexed) */
  page?: number
  /** Number of items per page */
  limit?: number
}

/**
 * Composable for review API operations
 * Provides methods to interact with the review system endpoints
 */
export const useReviewApi = () => {
  const apiUrl = useApiUrl()
  const token = useCookie('auth_token')
  const toast = useToast()

  // Loading states
  const isCreating = ref(false)
  const isFetching = ref(false)
  const isUpdating = ref(false)

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
   * Create a new review for an annotation
   * @param projectId - The project ID
   * @param annotationId - The annotation ID to review
   * @param payload - The review creation payload
   * @returns The created review or null on error
   */
  const createReview = async (
    projectId: number,
    annotationId: number,
    payload: CreateReviewPayload
  ): Promise<Review | null> => {
    isCreating.value = true

    try {
      const response = await $fetch<{ data: Review }>(
        `${apiUrl}/api/projects/${projectId}/annotations/${annotationId}/reviews`,
        {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include',
          body: payload
        }
      )

      toast.add({
        title: 'Review Submitted',
        description: 'Your review has been submitted successfully.',
        color: 'success'
      })

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Submit Review',
        description: message,
        color: 'error'
      })
      return null
    } finally {
      isCreating.value = false
    }
  }

  /**
   * Get all reviews for a specific annotation
   * @param projectId - The project ID
   * @param annotationId - The annotation ID
   * @returns Array of reviews or empty array on error
   */
  const getReviewsByAnnotation = async (
    projectId: number,
    annotationId: number
  ): Promise<Review[]> => {
    isFetching.value = true

    try {
      const response = await $fetch<{ data: Review[] }>(
        `${apiUrl}/api/projects/${projectId}/annotations/${annotationId}/reviews`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Reviews',
        description: message,
        color: 'error'
      })
      return []
    } finally {
      isFetching.value = false
    }
  }

  /**
   * Update an existing review
   * @param projectId - The project ID
   * @param reviewId - The review ID to update
   * @param payload - The update payload
   * @returns The updated review or null on error
   */
  const updateReview = async (
    projectId: number,
    reviewId: string,
    payload: UpdateReviewPayload
  ): Promise<Review | null> => {
    isUpdating.value = true

    try {
      const response = await $fetch<{ data: Review }>(
        `${apiUrl}/api/projects/${projectId}/reviews/${reviewId}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          credentials: 'include',
          body: payload
        }
      )

      toast.add({
        title: 'Review Updated',
        description: 'The review has been updated successfully.',
        color: 'success'
      })

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Update Review',
        description: message,
        color: 'error'
      })
      return null
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Get paginated reviews for a project with optional filters
   * @param projectId - The project ID
   * @param filters - Optional filter parameters
   * @returns Paginated reviews response or null on error
   */
  const getProjectReviews = async (
    projectId: number,
    filters?: ProjectReviewFilters
  ): Promise<PaginatedReviews | null> => {
    isFetching.value = true

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.reviewerId) params.append('reviewerId', filters.reviewerId.toString())
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const queryString = params.toString()
      const url = `${apiUrl}/api/projects/${projectId}/reviews${queryString ? `?${queryString}` : ''}`

      const response = await $fetch<{ data: PaginatedReviews }>(url, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include'
      })

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Project Reviews',
        description: message,
        color: 'error'
      })
      return null
    } finally {
      isFetching.value = false
    }
  }

  /**
   * Get reviews assigned to the current user for a specific project
   * @param projectId - The project ID
   * @returns Array of reviews with context or empty array on error
   */
  const getAssignedReviews = async (projectId: number): Promise<ReviewWithContext[]> => {
    isFetching.value = true

    try {
      const response = await $fetch<{ data: ReviewWithContext[] }>(
        `${apiUrl}/api/projects/${projectId}/reviews/assigned-to-me`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Assigned Reviews',
        description: message,
        color: 'error'
      })
      return []
    } finally {
      isFetching.value = false
    }
  }

  /**
   * Get all reviews assigned to the current user across all projects
   * @returns Array of reviews with context or empty array on error
   */
  const getAllAssignedReviews = async (): Promise<ReviewWithContext[]> => {
    isFetching.value = true

    try {
      const response = await $fetch<{ data: ReviewWithContext[] }>(
        `${apiUrl}/api/reviews/assigned-to-me`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      return response.data
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Assigned Reviews',
        description: message,
        color: 'error'
      })
      return []
    } finally {
      isFetching.value = false
    }
  }

  return {
    // Methods
    createReview,
    getReviewsByAnnotation,
    updateReview,
    getProjectReviews,
    getAssignedReviews,
    getAllAssignedReviews,

    // Loading states
    isCreating: readonly(isCreating),
    isFetching: readonly(isFetching),
    isUpdating: readonly(isUpdating)
  }
}
