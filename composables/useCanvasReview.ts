/**
 * Composable for Canvas-Integrated Review Functionality
 * 
 * Manages the state and logic for displaying the annotation review popup
 * when clicking on annotations in the canvas.
 */

import type { Review } from '~/types/reviews'

export interface CanvasReviewState {
  /** Whether the review popup is visible */
  isPopupVisible: boolean
  /** The annotation ID being reviewed */
  selectedAnnotationId: number | null
  /** The project ID for the review */
  projectId: number | null
  /** Position where the popup should appear */
  popupPosition: { x: number; y: number }
  /** Whether the selected annotation is reviewable */
  isAnnotationReviewable: boolean
}

export const useCanvasReview = () => {
  // State
  const state = reactive<CanvasReviewState>({
    isPopupVisible: false,
    selectedAnnotationId: null,
    projectId: null,
    popupPosition: { x: 0, y: 0 },
    isAnnotationReviewable: false
  })

  /**
   * Open the review popup for a specific annotation
   * 
   * @param annotationId - The annotation ID to review
   * @param projectId - The project ID containing the annotation
   * @param position - The click position on the canvas
   * @param isReviewable - Whether the annotation can be reviewed
   */
  const openReviewPopup = (
    annotationId: number,
    projectId: number,
    position: { x: number; y: number },
    isReviewable: boolean = true
  ) => {
    state.selectedAnnotationId = annotationId
    state.projectId = projectId
    state.popupPosition = position
    state.isAnnotationReviewable = isReviewable
    state.isPopupVisible = true
  }

  /**
   * Close the review popup
   */
  const closeReviewPopup = () => {
    state.isPopupVisible = false
    // Delay clearing state to allow exit animation
    setTimeout(() => {
      state.selectedAnnotationId = null
      state.projectId = null
      state.popupPosition = { x: 0, y: 0 }
      state.isAnnotationReviewable = false
    }, 200)
  }

  /**
   * Handle successful review submission
   */
  const onReviewSuccess = (review: Review) => {
    closeReviewPopup()
    // Emit event or trigger refresh logic
    // This will be handled by the parent component
  }

  /**
   * Check if an annotation can be reviewed based on its status
   * 
   * @param reviewStatus - The review status of the annotation
   * @param taskStatus - The status of the task
   * @returns Whether the annotation is reviewable
   */
  const checkAnnotationReviewable = (
    reviewStatus: string | null | undefined,
    taskStatus: string | null | undefined
  ): boolean => {
    // Annotation must be in pending or changes_requested state
    const validReviewStatus = 
      reviewStatus === 'pending' || 
      reviewStatus === 'changes_requested'
    
    // Task must be in in_review or changes_needed state
    const validTaskStatus = 
      taskStatus === 'in_review' || 
      taskStatus === 'changes_needed'
    
    return validReviewStatus && validTaskStatus
  }

  return {
    // State
    state: readonly(state),
    
    // Methods
    openReviewPopup,
    closeReviewPopup,
    onReviewSuccess,
    checkAnnotationReviewable
  }
}
