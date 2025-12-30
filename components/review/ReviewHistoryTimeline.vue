<script setup lang="ts">
import type { Review, ReviewStatus } from '~/types/reviews'
import { formatReviewMessageFull, getReviewActionLabel } from '~/utils/reviewWorkflow'

/**
 * ReviewHistoryTimeline Component
 * 
 * Displays a vertical timeline of review history for an annotation,
 * showing the progression of reviews across multiple rounds.
 */

interface Props {
  /** Array of reviews to display (should be sorted by round) */
  reviews: Review[]
  /** Whether to use compact display mode */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

/**
 * Format a Unix timestamp to relative time string
 */
const formatRelativeTime = (timestamp: number): string => {
  const date = timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo ago`

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y ago`
}

/**
 * Format timestamp to full date string
 */
const formatFullDate = (timestamp: number): string => {
  const date = timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000)
  return date.toLocaleString()
}

/**
 * Get status-based styling configuration
 */
const getStatusConfig = (status: ReviewStatus, isAutoApproved: boolean): {
  dotColor: string
  lineColor: string
  bgColor: string
  borderColor: string
  icon: string
} => {
  if (isAutoApproved) {
    return {
      dotColor: 'bg-green-500',
      lineColor: 'bg-green-200 dark:bg-green-800',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: 'i-heroicons-bolt'
    }
  }

  switch (status) {
    case 'approved':
      return {
        dotColor: 'bg-green-500',
        lineColor: 'bg-green-200 dark:bg-green-800',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: 'i-heroicons-check-circle'
      }
    case 'rejected':
      return {
        dotColor: 'bg-red-500',
        lineColor: 'bg-red-200 dark:bg-red-800',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: 'i-heroicons-x-circle'
      }
    case 'changes_requested':
      return {
        dotColor: 'bg-blue-500',
        lineColor: 'bg-blue-200 dark:bg-blue-800',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: 'i-heroicons-pencil-square'
      }
    case 'pending':
    default:
      return {
        dotColor: 'bg-yellow-500',
        lineColor: 'bg-yellow-200 dark:bg-yellow-800',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: 'i-heroicons-clock'
      }
  }
}

/**
 * Check if this is the last item in the timeline
 */
const isLastItem = (index: number): boolean => {
  return index === props.reviews.length - 1
}
</script>

<template>
  <div
    class="review-history-timeline"
    role="list"
    aria-label="Review history timeline"
  >
    <!-- Empty State -->
    <div
      v-if="reviews.length === 0"
      class="text-center py-8"
    >
      <UIcon
        name="i-heroicons-clock"
        class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
        aria-hidden="true"
      />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        No review history available
      </p>
    </div>

    <!-- Timeline -->
    <div
      v-else
      class="relative"
    >
      <div
        v-for="(review, index) in reviews"
        :key="review.id"
        class="timeline-item relative flex gap-4"
        :class="{ 'pb-6': !isLastItem(index) }"
        role="listitem"
      >
        <!-- Timeline Line & Dot -->
        <div class="timeline-indicator flex flex-col items-center">
          <!-- Dot -->
          <div
            class="timeline-dot relative z-10 flex items-center justify-center rounded-full shrink-0"
            :class="[
              compact ? 'w-3 h-3' : 'w-8 h-8',
              getStatusConfig(review.status, review.isAutoApproved).dotColor
            ]"
          >
            <UIcon
              v-if="!compact"
              :name="getStatusConfig(review.status, review.isAutoApproved).icon"
              class="w-4 h-4 text-white"
              aria-hidden="true"
            />
          </div>

          <!-- Connecting Line -->
          <div
            v-if="!isLastItem(index)"
            class="timeline-line flex-1 w-0.5 mt-2"
            :class="getStatusConfig(review.status, review.isAutoApproved).lineColor"
            aria-hidden="true"
          />
        </div>

        <!-- Review Content -->
        <div
          class="timeline-content flex-1 min-w-0"
          :class="{ 'pb-2': !isLastItem(index) }"
        >
          <!-- Compact Mode -->
          <div
            v-if="compact"
            class="flex flex-wrap items-center gap-2 text-sm"
          >
            <span class="font-medium text-gray-900 dark:text-white">
              Round {{ review.reviewRound }}
            </span>
            <span class="text-gray-400 dark:text-gray-500">•</span>
            <ReviewStatusBadge
              :status="review.status"
              size="sm"
              :show-icon="false"
            />
            <span class="text-gray-400 dark:text-gray-500">•</span>
            <span
              class="text-gray-500 dark:text-gray-400"
              :title="formatFullDate(review.createdAt)"
            >
              {{ formatRelativeTime(review.createdAt) }}
            </span>
            <UBadge
              v-if="review.isAutoApproved"
              color="success"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-heroicons-bolt" class="w-3 h-3 mr-1" aria-hidden="true" />
              Auto
            </UBadge>
          </div>

          <!-- Full Mode -->
          <div
            v-else
            class="rounded-lg border p-4"
            :class="[
              getStatusConfig(review.status, review.isAutoApproved).bgColor,
              getStatusConfig(review.status, review.isAutoApproved).borderColor
            ]"
          >
            <!-- Header -->
            <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    Review Round {{ review.reviewRound }}
                  </span>
                  <ReviewStatusBadge
                    :status="review.status"
                    size="sm"
                  />
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <UIcon
                    name="i-heroicons-user-circle"
                    class="w-4 h-4"
                    aria-hidden="true"
                  />
                  <span>{{ review.reviewerEmail || 'Unknown Reviewer' }}</span>
                  <span class="text-gray-300 dark:text-gray-600">•</span>
                  <span :title="formatFullDate(review.createdAt)">
                    {{ formatRelativeTime(review.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- Auto-approved badge -->
              <UBadge
                v-if="review.isAutoApproved"
                color="success"
                variant="outline"
                size="sm"
              >
                <UIcon name="i-heroicons-bolt" class="w-3 h-3 mr-1" aria-hidden="true" />
                Auto-approved
              </UBadge>
            </div>

            <!-- Message -->
            <div class="mt-3">
              <p
                v-if="review.message"
                class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
              >
                {{ review.message }}
              </p>
              <p
                v-else-if="review.isAutoApproved"
                class="text-sm text-gray-500 dark:text-gray-400 italic"
              >
                Automatically approved based on project settings
              </p>
              <p
                v-else
                class="text-sm text-gray-400 dark:text-gray-500 italic"
              >
                No feedback provided
              </p>
            </div>

            <!-- Status action indicator -->
            <div
              v-if="!review.isAutoApproved"
              class="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50"
            >
              <div class="flex items-center gap-2 text-xs">
                <UIcon
                  :name="getStatusConfig(review.status, review.isAutoApproved).icon"
                  class="w-4 h-4"
                  :class="{
                    'text-green-600 dark:text-green-400': review.status === 'approved',
                    'text-red-600 dark:text-red-400': review.status === 'rejected',
                    'text-blue-600 dark:text-blue-400': review.status === 'changes_requested',
                    'text-yellow-600 dark:text-yellow-400': review.status === 'pending'
                  }"
                  aria-hidden="true"
                />
                <span
                  class="font-medium"
                  :class="{
                    'text-green-700 dark:text-green-400': review.status === 'approved',
                    'text-red-700 dark:text-red-400': review.status === 'rejected',
                    'text-blue-700 dark:text-blue-400': review.status === 'changes_requested',
                    'text-yellow-700 dark:text-yellow-400': review.status === 'pending'
                  }"
                >
                  {{ getReviewActionLabel(review.status) }}
                </span>
                <span class="text-gray-500 dark:text-gray-400">
                  by {{ review.reviewerEmail?.split('@')[0] || 'reviewer' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div
      v-if="reviews.length > 0"
      class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
        {{ reviews.length }} review round{{ reviews.length > 1 ? 's' : '' }} total
      </p>
    </div>
  </div>
</template>
