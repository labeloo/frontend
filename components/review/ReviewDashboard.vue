<script setup lang="ts">
import type { ReviewWithContext } from '~/types/reviews'

/**
 * ReviewDashboard Component
 * 
 * Displays a dashboard of pending reviews assigned to the current user.
 * Can show reviews for a specific project or across all projects.
 */

interface Props {
  /** Project ID to filter reviews (undefined shows all projects) */
  projectId?: number
}

const props = defineProps<Props>()

// API composable
const { getAssignedReviews, getAllAssignedReviews, isFetching } = useReviewApi()

// Component state
const reviews = ref<ReviewWithContext[]>([])
const hasError = ref(false)

// Filter/sort state
const selectedProjectFilter = ref<number | 'all'>('all')
const sortOrder = ref<'newest' | 'oldest'>('oldest')

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
 * Get unique projects from reviews for filter dropdown
 */
const availableProjects = computed(() => {
  const projectMap = new Map<number, string>()
  
  reviews.value.forEach(review => {
    if (!projectMap.has(review.projectId)) {
      projectMap.set(review.projectId, review.projectName || `Project ${review.projectId}`)
    }
  })

  return Array.from(projectMap.entries()).map(([id, name]) => ({
    value: id,
    label: name
  }))
})

/**
 * Filter dropdown options
 */
const projectFilterOptions = computed(() => [
  { value: 'all' as const, label: 'All Projects' },
  ...availableProjects.value
])

/**
 * Sort order options
 */
const sortOptions = [
  { value: 'oldest' as const, label: 'Oldest First' },
  { value: 'newest' as const, label: 'Newest First' }
]

/**
 * Filtered and sorted reviews
 */
const filteredReviews = computed(() => {
  let result = [...reviews.value]

  // Apply project filter (only when not in single project mode)
  if (!props.projectId && selectedProjectFilter.value !== 'all') {
    result = result.filter(r => r.projectId === selectedProjectFilter.value)
  }

  // Apply sort
  result.sort((a, b) => {
    const diff = a.createdAt - b.createdAt
    return sortOrder.value === 'oldest' ? diff : -diff
  })

  return result
})

/**
 * Check if showing all projects mode
 */
const isAllProjectsMode = computed(() => !props.projectId)

/**
 * Fetch reviews based on props
 */
const fetchReviews = async () => {
  hasError.value = false
  
  let result: ReviewWithContext[]
  
  if (props.projectId) {
    result = await getAssignedReviews(props.projectId)
  } else {
    result = await getAllAssignedReviews()
  }

  // Filter to only pending reviews
  reviews.value = result.filter(r => r.status === 'pending')
}

/**
 * Navigate to annotation review page
 */
const openReview = (review: ReviewWithContext) => {
  navigateTo(`/annotate/${review.taskId}?review=${review.id}`)
}

/**
 * Refresh the reviews list
 */
const refresh = async () => {
  await fetchReviews()
}

// Fetch on mount
onMounted(fetchReviews)

// Expose refresh for parent components
defineExpose({ refresh })
</script>

<template>
  <div class="review-dashboard">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Pending Reviews
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ filteredReviews.length }} review{{ filteredReviews.length !== 1 ? 's' : '' }} waiting for your attention
        </p>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Project Filter (only in all projects mode) -->
        <USelect
          v-if="isAllProjectsMode && availableProjects.length > 1"
          v-model="selectedProjectFilter"
          :items="projectFilterOptions"
          placeholder="Filter by project"
          class="w-48"
          size="sm"
        />

        <!-- Sort Order -->
        <USelect
          v-model="sortOrder"
          :items="sortOptions"
          class="w-36"
          size="sm"
        />

        <!-- Refresh Button -->
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          :loading="isFetching"
          @click="refresh"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-4 h-4"
            :class="{ 'animate-spin': isFetching }"
            aria-hidden="true"
          />
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isFetching && reviews.length === 0"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex gap-4">
          <!-- Thumbnail skeleton -->
          <div class="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
          
          <!-- Content skeleton -->
          <div class="flex-1 space-y-3">
            <div class="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div class="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          <!-- Button skeleton -->
          <div class="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredReviews.length === 0"
      class="text-center py-16 px-4"
    >
      <div class="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <UIcon
          name="i-heroicons-check-badge"
          class="w-10 h-10 text-green-500 dark:text-green-400"
          aria-hidden="true"
        />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
        No pending reviews
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        {{ isAllProjectsMode 
          ? "You're all caught up! There are no annotations waiting for your review."
          : "There are no annotations waiting for your review in this project."
        }}
      </p>
    </div>

    <!-- Reviews List -->
    <div
      v-else
      class="space-y-4"
    >
      <div
        v-for="review in filteredReviews"
        :key="review.id"
        class="review-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 transition-colors duration-150"
      >
        <div class="flex flex-col sm:flex-row gap-4 p-4">
          <!-- Task Thumbnail -->
          <div class="shrink-0">
            <div
              v-if="review.taskDataUrl"
              class="w-full sm:w-28 h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
            >
              <AuthenticatedImage
                :src="review.taskDataUrl"
                alt="Task preview"
                class="w-full h-full object-cover"
              />
            </div>
            <div
              v-else
              class="w-full sm:w-28 h-28 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-photo"
                class="w-10 h-10 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <!-- Project Name (in all projects mode) -->
            <div
              v-if="isAllProjectsMode && review.projectName"
              class="flex items-center gap-2 mb-1"
            >
              <UIcon
                name="i-heroicons-folder"
                class="w-4 h-4 text-gray-400"
                aria-hidden="true"
              />
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ review.projectName }}
              </span>
            </div>

            <!-- Task Info -->
            <h3 class="text-base font-medium text-gray-900 dark:text-white mb-2">
              Task #{{ review.taskId }}
              <span class="text-gray-400 dark:text-gray-500 font-normal">
                · Annotation #{{ review.annotationId }}
              </span>
            </h3>

            <!-- Meta Info -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <!-- Annotator -->
              <div
                v-if="review.annotatorId"
                class="flex items-center gap-1.5"
              >
                <UIcon
                  name="i-heroicons-user"
                  class="w-4 h-4"
                  aria-hidden="true"
                />
                <span>Annotator #{{ review.annotatorId }}</span>
              </div>

              <!-- Timestamp -->
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-heroicons-clock"
                  class="w-4 h-4"
                  aria-hidden="true"
                />
                <span :title="formatFullDate(review.createdAt)">
                  Submitted {{ formatRelativeTime(review.createdAt) }}
                </span>
              </div>

              <!-- Review Round -->
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="w-4 h-4"
                  aria-hidden="true"
                />
                <span>Round {{ review.reviewRound }}</span>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="mt-3">
              <ReviewStatusBadge
                :status="review.status"
                size="sm"
              />
            </div>
          </div>

          <!-- Action Button -->
          <div class="flex items-center shrink-0">
            <UButton
              color="primary"
              size="md"
              @click="openReview(review)"
            >
              <UIcon
                name="i-heroicons-eye"
                class="w-4 h-4 mr-1.5"
                aria-hidden="true"
              />
              Review
            </UButton>
          </div>
        </div>

        <!-- Task Status Indicator -->
        <div
          v-if="review.taskStatus"
          class="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50"
        >
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <UIcon
              name="i-heroicons-document-text"
              class="w-4 h-4"
              aria-hidden="true"
            />
            <span>
              Task Status: 
              <span class="font-medium">
                {{ review.taskStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Load More / Summary -->
    <div
      v-if="filteredReviews.length > 0 && !isFetching"
      class="mt-6 text-center"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Showing {{ filteredReviews.length }} of {{ reviews.length }} pending review{{ reviews.length !== 1 ? 's' : '' }}
      </p>
    </div>
  </div>
</template>
