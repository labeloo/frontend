<script setup lang="ts">
import type { Review } from '~/types/reviews'
import { formatReviewMessageFull, sortReviewsByRound } from '~/utils/reviewWorkflow'

/**
 * ReviewList Component
 * 
 * Displays a chronological list of reviews for an annotation,
 * organized by review rounds with detailed information for each review.
 */

interface Props {
  /** The annotation ID to fetch reviews for */
  annotationId: number
  /** The project ID containing the annotation */
  projectId: number
  /** Current user's ID to highlight their reviews */
  currentUserId?: number
}

const props = defineProps<Props>()

// API composable
const { getReviewsByAnnotation, isFetching } = useReviewApi()

// Component state
const reviews = ref<Review[]>([])
const hasError = ref(false)

/**
 * Format a Unix timestamp to relative time string
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Relative time string (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: number): string => {
  // Handle both seconds and milliseconds timestamps
  const date = timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`
}

/**
 * Format timestamp to full date string for tooltip
 */
const formatFullDate = (timestamp: number): string => {
  const date = timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000)
  return date.toLocaleString()
}

/**
 * Sorted reviews by round (newest first)
 */
const sortedReviews = computed(() => sortReviewsByRound(reviews.value))

/**
 * Check if a review is from the current user
 */
const isCurrentUserReview = (review: Review): boolean => {
  return props.currentUserId !== undefined && review.reviewerId === props.currentUserId
}

/**
 * Fetch reviews on component mount
 */
const fetchReviews = async () => {
  hasError.value = false
  const result = await getReviewsByAnnotation(props.projectId, props.annotationId)
  
  if (result.length === 0 && isFetching.value === false) {
    // Could be empty or error - the composable handles toast for errors
    reviews.value = []
  } else {
    reviews.value = result
  }
}

// Fetch on mount
onMounted(fetchReviews)

// Expose refresh method for parent components
defineExpose({
  refresh: fetchReviews
})
</script>

<template>
  <div class="review-list">
    <!-- Loading Skeleton -->
    <div
      v-if="isFetching"
      class="space-y-4"
    >
      <div
        v-for="i in 2"
        :key="i"
        class="animate-pulse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <!-- Header skeleton -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div class="space-y-1">
              <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div class="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <!-- Body skeleton -->
        <div class="space-y-2">
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div class="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="sortedReviews.length === 0"
      class="text-center py-12 px-4"
    >
      <div class="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <UIcon
          name="i-heroicons-clipboard-document-list"
          class="w-8 h-8 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
        No reviews yet
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        This annotation hasn't been reviewed yet.
      </p>
    </div>

    <!-- Reviews List -->
    <div
      v-else
      class="space-y-4"
    >
      <div
        v-for="review in sortedReviews"
        :key="review.id"
        class="review-item bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-all duration-150"
        :class="[
          isCurrentUserReview(review)
            ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-800'
            : 'border-gray-200 dark:border-gray-700',
          review.isAutoApproved
            ? 'bg-linear-to-r from-green-50/50 to-transparent dark:from-green-950/20'
            : ''
        ]"
      >
        <!-- Review Header -->
        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Left side: Reviewer info -->
            <div class="flex items-center gap-3">
              <!-- Avatar placeholder -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                :class="[
                  isCurrentUserReview(review)
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                ]"
              >
                {{ review.reviewerEmail?.charAt(0).toUpperCase() || 'R' }}
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ review.reviewerEmail || 'Unknown Reviewer' }}
                  </span>
                  <UBadge
                    v-if="isCurrentUserReview(review)"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  >
                    You
                  </UBadge>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span :title="formatFullDate(review.createdAt)">
                    {{ formatRelativeTime(review.createdAt) }}
                  </span>
                  <span class="text-gray-300 dark:text-gray-600">•</span>
                  <span class="font-medium">
                    Round {{ review.reviewRound }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right side: Status badge -->
            <ReviewStatusBadge
              :status="review.status"
              size="sm"
            />
          </div>
        </div>

        <!-- Review Body -->
        <div class="px-4 py-3">
          <p
            v-if="review.message || review.isAutoApproved"
            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
          >
            {{ formatReviewMessageFull(review) }}
          </p>
          <p
            v-else
            class="text-sm text-gray-400 dark:text-gray-500 italic"
          >
            No feedback provided
          </p>
        </div>

        <!-- Review Footer (for auto-approved) -->
        <div
          v-if="review.isAutoApproved"
          class="px-4 py-2 bg-green-50 dark:bg-green-950/30 border-t border-green-100 dark:border-green-900/50"
        >
          <div class="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
            <UIcon
              name="i-heroicons-bolt"
              class="w-4 h-4"
              aria-hidden="true"
            />
            <span>Auto-approved based on project settings</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews count summary -->
    <div
      v-if="sortedReviews.length > 0 && !isFetching"
      class="mt-4 text-center"
    >
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Showing {{ sortedReviews.length }} review{{ sortedReviews.length > 1 ? 's' : '' }}
      </p>
    </div>
  </div>
</template>
