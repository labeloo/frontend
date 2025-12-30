<script setup lang="ts">
import type { ReviewStatus, TaskStatus, Review } from '~/types/reviews'
import { getTaskStatusLabel, getTaskStatusColor, formatReviewMessage } from '~/utils/reviewWorkflow'

/**
 * AnnotationStatus Component
 * 
 * Displays the complete status of an annotation including task status,
 * review status, and optional detailed information about the review process.
 */

/**
 * Annotation object structure expected by this component
 */
interface Annotation {
  /** Current review status */
  reviewStatus?: ReviewStatus
  /** Current task status */
  taskStatus?: TaskStatus
  /** Assigned reviewer information */
  assignedReviewer?: {
    id: number
    email: string
  }
  /** Latest review for this annotation */
  latestReview?: Pick<Review, 'message' | 'isAutoApproved' | 'reviewRound' | 'reviewerEmail'>
  /** Total number of review rounds */
  reviewRoundCount?: number
}

interface Props {
  /** The annotation object containing status information */
  annotation: Annotation
  /** The workflow mode for this annotation's project */
  workflowMode?: 'auto-approve' | 'review-required'
  /** Whether to show detailed review information */
  showDetails?: boolean
}

interface Emits {
  /** Emitted when user clicks to view review history */
  (e: 'viewHistory'): void
}

const props = withDefaults(defineProps<Props>(), {
  workflowMode: undefined,
  showDetails: false
})

const emit = defineEmits<Emits>()

/**
 * Check if the annotation was auto-approved
 */
const isAutoApproved = computed(() => {
  return props.workflowMode === 'auto-approve' || props.annotation.latestReview?.isAutoApproved
})

/**
 * Get the current task status label
 */
const taskStatusLabel = computed(() => {
  if (!props.annotation.taskStatus) return null
  return getTaskStatusLabel(props.annotation.taskStatus)
})

/**
 * Get the current task status color
 */
const taskStatusColor = computed(() => {
  if (!props.annotation.taskStatus) return 'neutral'
  return getTaskStatusColor(props.annotation.taskStatus)
})

/**
 * Get the status message based on review status
 */
const statusMessage = computed(() => {
  if (isAutoApproved.value) {
    return 'This annotation was automatically approved based on project settings.'
  }

  const reviewStatus = props.annotation.reviewStatus

  switch (reviewStatus) {
    case 'pending':
      return 'This annotation is awaiting review from an assigned reviewer.'
    case 'approved':
      return 'This annotation has been reviewed and approved.'
    case 'rejected':
      return 'This annotation has been rejected and requires attention.'
    case 'changes_requested':
      return 'The reviewer has requested changes to this annotation.'
    default:
      return null
  }
})

/**
 * Formatted review message from the latest review
 */
const formattedReviewMessage = computed(() => {
  if (!props.annotation.latestReview) return null
  return formatReviewMessage(props.annotation.latestReview, 150)
})

/**
 * Determine if we should show the review status badge
 */
const showReviewBadge = computed(() => {
  return props.annotation.reviewStatus && props.workflowMode !== 'auto-approve'
})

/**
 * Get icon for the workflow mode indicator
 */
const workflowIcon = computed(() => {
  if (isAutoApproved.value) {
    return 'i-heroicons-bolt'
  }
  return 'i-heroicons-eye'
})
</script>

<template>
  <div class="annotation-status space-y-3">
    <!-- Primary Status Row -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Task Status Badge -->
      <UBadge
        v-if="annotation.taskStatus"
        :color="taskStatusColor as any"
        variant="soft"
        class="text-sm"
      >
        <span class="inline-flex items-center gap-1.5">
          <UIcon
            :name="annotation.taskStatus === 'completed' ? 'i-heroicons-check-circle' : 'i-heroicons-document-text'"
            class="w-4 h-4"
            aria-hidden="true"
          />
          <span>{{ taskStatusLabel }}</span>
        </span>
      </UBadge>

      <!-- Workflow Mode Indicator -->
      <UBadge
        v-if="workflowMode"
        :color="isAutoApproved ? 'success' : 'warning'"
        variant="outline"
        class="text-sm"
      >
        <span class="inline-flex items-center gap-1.5">
          <UIcon
            :name="workflowIcon"
            class="w-4 h-4"
            aria-hidden="true"
          />
          <span>{{ isAutoApproved ? 'Auto-approved' : 'Review Required' }}</span>
        </span>
      </UBadge>

      <!-- Review Status Badge -->
      <ReviewStatusBadge
        v-if="showReviewBadge"
        :status="annotation.reviewStatus!"
        size="md"
      />
    </div>

    <!-- Status Message -->
    <p
      v-if="statusMessage"
      class="text-sm text-gray-600 dark:text-gray-400"
    >
      {{ statusMessage }}
    </p>

    <!-- Detailed Information Section -->
    <div
      v-if="showDetails"
      class="details-section border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-3"
    >
      <!-- Assigned Reviewer -->
      <div
        v-if="annotation.assignedReviewer"
        class="flex items-center gap-2 text-sm"
      >
        <UIcon
          name="i-heroicons-user-circle"
          class="w-5 h-5 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />
        <span class="text-gray-600 dark:text-gray-400">Reviewer:</span>
        <span class="font-medium text-gray-900 dark:text-white">
          {{ annotation.assignedReviewer.email }}
        </span>
      </div>

      <!-- No Reviewer Assigned -->
      <div
        v-else-if="workflowMode === 'review-required' && annotation.reviewStatus === 'pending'"
        class="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-5 h-5"
          aria-hidden="true"
        />
        <span>No reviewer assigned yet</span>
      </div>

      <!-- Latest Review Message -->
      <div
        v-if="formattedReviewMessage && annotation.latestReview"
        class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
      >
        <div class="flex items-start gap-2">
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                Review Feedback
                <span v-if="annotation.latestReview.reviewRound">
                  (Round {{ annotation.latestReview.reviewRound }})
                </span>
              </span>
              <span
                v-if="annotation.latestReview.reviewerEmail"
                class="text-xs text-gray-400 dark:text-gray-500"
              >
                {{ annotation.latestReview.reviewerEmail }}
              </span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              {{ formattedReviewMessage }}
            </p>
          </div>
        </div>
      </div>

      <!-- Review History Button -->
      <div
        v-if="annotation.reviewRoundCount && annotation.reviewRoundCount > 0"
        class="flex items-center justify-between"
      >
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ annotation.reviewRoundCount }} review round{{ annotation.reviewRoundCount > 1 ? 's' : '' }}
        </span>
        <UButton
          variant="ghost"
          size="xs"
          color="primary"
          @click="emit('viewHistory')"
        >
          <UIcon
            name="i-heroicons-clock"
            class="w-4 h-4 mr-1"
            aria-hidden="true"
          />
          View History
        </UButton>
      </div>
    </div>
  </div>
</template>
