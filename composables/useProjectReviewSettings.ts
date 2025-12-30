import type {
  ProjectReviewSettings,
  EligibleReviewer
} from '~/types/reviews'

/**
 * Extended project review settings with current workflow mode information
 */
export interface ProjectReviewSettingsWithWorkflow extends ProjectReviewSettings {
  /** The current active workflow mode for the project */
  currentWorkflowMode: string
}

/**
 * Composable for project review settings API operations
 * Provides methods to manage project-level review configuration
 */
export const useProjectReviewSettings = () => {
  const apiUrl = useApiUrl()
  const token = useCookie('auth_token')
  const toast = useToast()

  // Loading states
  const isFetchingSettings = ref(false)
  const isUpdatingSettings = ref(false)
  const isFetchingReviewers = ref(false)

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
   * Get review settings for a project
   * @param projectId - The project ID
   * @returns Project review settings with workflow mode or null on error
   */
  const getProjectReviewSettings = async (
    projectId: number
  ): Promise<ProjectReviewSettingsWithWorkflow | null> => {
    isFetchingSettings.value = true

    try {
      const settings = await $fetch<ProjectReviewSettingsWithWorkflow>(
        `${apiUrl}/api/projects/${projectId}/review-settings`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      return settings
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Review Settings',
        description: message,
        color: 'error'
      })
      return null
    } finally {
      isFetchingSettings.value = false
    }
  }

  /**
   * Update review settings for a project
   * @param projectId - The project ID
   * @param settings - Partial settings to update
   * @returns Updated project review settings or null on error
   */
  const updateProjectReviewSettings = async (
    projectId: number,
    settings: Partial<ProjectReviewSettings>
  ): Promise<ProjectReviewSettings | null> => {
    isUpdatingSettings.value = true

    try {
      const updatedSettings = await $fetch<ProjectReviewSettings>(
        `${apiUrl}/api/projects/${projectId}/review-settings`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          credentials: 'include',
          body: settings
        }
      )

      toast.add({
        title: 'Settings Updated',
        description: 'Review settings have been updated successfully.',
        color: 'success'
      })

      return updatedSettings
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Update Settings',
        description: message,
        color: 'error'
      })
      return null
    } finally {
      isUpdatingSettings.value = false
    }
  }

  /**
   * Get list of users eligible to review for a project
   * @param projectId - The project ID
   * @returns Array of eligible reviewers or empty array on error
   */
  const getEligibleReviewers = async (projectId: number): Promise<EligibleReviewer[]> => {
    isFetchingReviewers.value = true

    try {
      const reviewers = await $fetch<EligibleReviewer[]>(
        `${apiUrl}/api/projects/${projectId}/eligible-reviewers`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'include'
        }
      )

      return reviewers
    } catch (error) {
      const message = formatError(error)
      toast.add({
        title: 'Failed to Fetch Eligible Reviewers',
        description: message,
        color: 'error'
      })
      return []
    } finally {
      isFetchingReviewers.value = false
    }
  }

  return {
    // Methods
    getProjectReviewSettings,
    updateProjectReviewSettings,
    getEligibleReviewers,

    // Loading states
    isFetchingSettings: readonly(isFetchingSettings),
    isUpdatingSettings: readonly(isUpdatingSettings),
    isFetchingReviewers: readonly(isFetchingReviewers)
  }
}
