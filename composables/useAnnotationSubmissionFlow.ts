import type { AnnotationCompletionResponse } from './useAnnotationCompletion'

/**
 * State for the submission flow
 */
export interface SubmissionFlowState {
  /** Whether the confirmation modal is shown */
  showConfirmModal: boolean
  /** Whether we're checking the workflow mode */
  isCheckingWorkflow: boolean
  /** Whether review is required (determined before confirmation) */
  requiresReview: boolean
  /** Assigned reviewer email if known */
  assignedReviewerEmail?: string
}

/**
 * Composable for managing the complete annotation submission flow
 * 
 * This composable wraps useAnnotationCompletion with additional workflow
 * detection and confirmation dialog support. It handles the complete flow:
 * 
 * 1. Save annotation data
 * 2. Check workflow mode (optional pre-check)
 * 3. Show confirmation dialog if review is required
 * 4. Submit annotation and handle response
 * 5. Navigate or update UI based on result
 */
export const useAnnotationSubmissionFlow = () => {
  const apiUrl = useApiUrl()
  const token = useCookie('auth_token')
  const toast = useToast()
  const router = useRouter()

  // Import the base composable
  const {
    completeAnnotation,
    resubmitAfterChanges,
    getCompletionMessage,
    getStatusMessage,
    isCompletionSuccessful,
    isCompleting
  } = useAnnotationCompletion()

  // Submission flow state
  const flowState = reactive<SubmissionFlowState>({
    showConfirmModal: false,
    isCheckingWorkflow: false,
    requiresReview: false,
    assignedReviewerEmail: undefined
  })

  // Pending submission data (stored while confirmation is pending)
  const pendingSubmission = ref<{
    annotationId: number
    projectId: number
    taskId?: number
    navigateOnSuccess?: string
  } | null>(null)

  /**
   * Get authorization headers
   */
  const getHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
  })

  /**
   * Check the workflow mode for a project to determine if review is required
   * This is a pre-check before showing the confirmation dialog
   */
  const checkWorkflowMode = async (projectId: number): Promise<{
    requiresReview: boolean
    assignedReviewerEmail?: string
  }> => {
    flowState.isCheckingWorkflow = true

    try {
      const response = await $fetch<{
        mode: 'auto-approve' | 'review-required'
        assignedReviewer?: number
        assignedReviewerEmail?: string
      }>(`${apiUrl}/api/projects/${projectId}/workflow-mode`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include'
      })

      return {
        requiresReview: response.mode === 'review-required',
        assignedReviewerEmail: response.assignedReviewerEmail
      }
    } catch {
      // If we can't determine workflow mode, assume review might be required
      // The actual submission will determine the real outcome
      return { requiresReview: true }
    } finally {
      flowState.isCheckingWorkflow = false
    }
  }

  /**
   * Start the submission flow
   * This checks the workflow mode and shows a confirmation dialog if needed
   * 
   * @param annotationId - The annotation ID to submit
   * @param projectId - The project ID
   * @param taskId - Optional task ID
   * @param options - Additional options
   */
  const startSubmissionFlow = async (
    annotationId: number,
    projectId: number,
    taskId?: number,
    options?: {
      /** Path to navigate to on success */
      navigateOnSuccess?: string
      /** Skip confirmation dialog */
      skipConfirmation?: boolean
    }
  ): Promise<AnnotationCompletionResponse | null> => {
    // Store pending submission data
    pendingSubmission.value = {
      annotationId,
      projectId,
      taskId,
      navigateOnSuccess: options?.navigateOnSuccess
    }

    // If skip confirmation, submit directly
    if (options?.skipConfirmation) {
      return await executeSubmission()
    }

    // Check workflow mode to determine if we need confirmation
    const workflowInfo = await checkWorkflowMode(projectId)
    flowState.requiresReview = workflowInfo.requiresReview
    flowState.assignedReviewerEmail = workflowInfo.assignedReviewerEmail

    // Show confirmation modal
    flowState.showConfirmModal = true

    // Return null - the actual submission happens when user confirms
    return null
  }

  /**
   * Execute the actual submission after confirmation
   */
  const executeSubmission = async (): Promise<AnnotationCompletionResponse | null> => {
    if (!pendingSubmission.value) {
      console.error('No pending submission data')
      return null
    }

    const { annotationId, projectId, taskId, navigateOnSuccess } = pendingSubmission.value

    // Close confirmation modal
    flowState.showConfirmModal = false

    // Execute the completion
    const result = await completeAnnotation(annotationId, projectId, taskId)

    if (result && isCompletionSuccessful(result)) {
      // Navigate if path provided
      if (navigateOnSuccess) {
        await router.push(navigateOnSuccess)
      }
    }

    // Clear pending submission
    pendingSubmission.value = null

    return result
  }

  /**
   * Cancel the submission flow
   */
  const cancelSubmission = () => {
    flowState.showConfirmModal = false
    pendingSubmission.value = null
  }

  /**
   * Confirm and execute the submission
   * Called when user confirms in the modal
   */
  const confirmSubmission = async (): Promise<AnnotationCompletionResponse | null> => {
    return await executeSubmission()
  }

  /**
   * Handle resubmission after changes were requested
   */
  const handleResubmit = async (
    annotationId: number,
    projectId: number,
    navigateOnSuccess?: string
  ): Promise<AnnotationCompletionResponse | null> => {
    const result = await resubmitAfterChanges(annotationId, projectId)

    if (result && isCompletionSuccessful(result) && navigateOnSuccess) {
      await router.push(navigateOnSuccess)
    }

    return result
  }

  /**
   * Quick submit without confirmation (for auto-save scenarios)
   */
  const quickSubmit = async (
    annotationId: number,
    projectId: number,
    taskId?: number
  ): Promise<AnnotationCompletionResponse | null> => {
    return await completeAnnotation(annotationId, projectId, taskId)
  }

  return {
    // Flow control
    startSubmissionFlow,
    confirmSubmission,
    cancelSubmission,
    handleResubmit,
    quickSubmit,

    // State
    flowState: readonly(flowState),
    isCompleting,
    pendingSubmission: readonly(pendingSubmission),

    // Helper methods from base composable
    getCompletionMessage,
    getStatusMessage,
    isCompletionSuccessful
  }
}
