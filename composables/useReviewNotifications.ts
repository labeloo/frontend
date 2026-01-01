/**
 * Composable for managing review notifications throughout the application
 * 
 * Provides a unified interface for:
 * - Pending review counts (reviews assigned to current user)
 * - Own annotation review status (when user's annotations are reviewed)
 * - Project-specific pending review counts
 * - Auto-refresh with configurable polling interval
 * - Smart caching to minimize API calls
 * 
 * @example
 * ```vue
 * <script setup>
 * const { pendingCount, hasNotifications, startPolling, stopPolling } = useReviewNotifications()
 * 
 * onMounted(() => startPolling())
 * onUnmounted(() => stopPolling())
 * </script>
 * 
 * <template>
 *   <span v-if="hasNotifications" class="badge">{{ pendingCount }}</span>
 * </template>
 * ```
 */

export interface ReviewNotification {
  /** Unique identifier */
  id: number
  /** Type of notification */
  type: 'pending_review' | 'annotation_reviewed' | 'changes_requested'
  /** Related project ID */
  projectId: number
  /** Related task ID */
  taskId?: number
  /** Notification message */
  message: string
  /** When the notification was created */
  createdAt: number
  /** Whether the notification has been read */
  read: boolean
}

export interface OwnAnnotationReview {
  /** Review ID */
  reviewId: number
  /** Task ID that was reviewed */
  taskId: number
  /** Project ID */
  projectId: number
  /** Review status */
  status: 'approved' | 'changes_requested'
  /** Reviewer comment */
  comment?: string
  /** When the review was completed */
  reviewedAt: number
  /** Whether the user has seen this */
  seen: boolean
}

export interface ProjectReviewNotification {
  projectId: number
  projectName: string
  pendingCount: number
}

interface UseReviewNotificationsReturn {
  /** Total pending reviews assigned to current user */
  pendingCount: Ref<number>
  /** Reviews of user's own annotations (unread) */
  ownAnnotationReviews: Ref<OwnAnnotationReview[]>
  /** Count of own annotations that have been reviewed but not seen */
  ownReviewedCount: Ref<number>
  /** Project-specific pending counts */
  projectPendingCounts: Ref<Map<number, number>>
  /** Whether there are any notifications */
  hasNotifications: ComputedRef<boolean>
  /** Whether currently loading */
  isLoading: Ref<boolean>
  /** Last time notifications were refreshed */
  lastRefreshed: Ref<Date | null>
  /** Fetch/refresh all notifications */
  refresh: () => Promise<void>
  /** Fetch pending count for a specific project */
  fetchProjectPendingCount: (projectId: number) => Promise<number>
  /** Mark own annotation review as seen */
  markOwnReviewSeen: (reviewId: number) => void
  /** Start auto-polling for updates */
  startPolling: (intervalMs?: number) => void
  /** Stop auto-polling */
  stopPolling: () => void
  /** Clear all cached data */
  clearCache: () => void
}

// Global state (shared across all component instances)
const pendingCount = ref(0)
const ownAnnotationReviews = ref<OwnAnnotationReview[]>([])
const projectPendingCounts = ref<Map<number, number>>(new Map())
const isLoading = ref(false)
const lastRefreshed = ref<Date | null>(null)

// Cache settings
const CACHE_DURATION_MS = 30 * 1000 // 30 seconds
const DEFAULT_POLL_INTERVAL_MS = 30 * 1000 // 30 seconds
let lastFetchTime = 0
let pollingIntervalId: ReturnType<typeof setInterval> | null = null
let isPollingActive = false

export function useReviewNotifications(): UseReviewNotificationsReturn {
  const token = useCookie('auth_token')
  const config = useRuntimeConfig()
  
  /**
   * Count of own annotations that have been reviewed but not seen
   */
  const ownReviewedCount = computed(() => {
    return ownAnnotationReviews.value.filter(r => !r.seen).length
  })
  
  /**
   * Whether there are any notifications to show
   */
  const hasNotifications = computed(() => {
    return pendingCount.value > 0 || ownReviewedCount.value > 0
  })
  
  /**
   * Check if cache is still valid
   */
  function isCacheValid(): boolean {
    return Date.now() - lastFetchTime < CACHE_DURATION_MS
  }
  
  /**
   * Fetch all notification data
   */
  async function refresh(): Promise<void> {
    // Skip if cache is valid (unless forced)
    if (isCacheValid() && pendingCount.value >= 0) {
      return
    }
    
    if (!token.value) {
      return
    }
    
    try {
      isLoading.value = true
      
      // Fetch pending reviews count
      const statsResponse = await $fetch<{ data: { pending: number; completedToday?: number } }>(
        `${config.public.apiBase}/api/reviews/stats`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      ).catch(() => ({ data: { pending: 0 } }))
      
      pendingCount.value = statsResponse.data.pending
      
      // Fetch own annotation reviews (optional endpoint - may not exist)
      try {
        const ownReviewsResponse = await $fetch<{ data: OwnAnnotationReview[] }>(
          `${config.public.apiBase}/api/reviews/my-annotations`,
          {
            headers: {
              Authorization: `Bearer ${token.value}`
            }
          }
        )
        
        // Only update with new unseen reviews
        const existingIds = new Set(ownAnnotationReviews.value.map(r => r.reviewId))
        const newReviews = ownReviewsResponse.data.filter(r => !existingIds.has(r.reviewId))
        
        if (newReviews.length > 0) {
          ownAnnotationReviews.value = [...ownAnnotationReviews.value, ...newReviews]
        }
      } catch {
        // Endpoint may not exist - that's okay
      }
      
      lastFetchTime = Date.now()
      lastRefreshed.value = new Date()
      
    } catch (error) {
      console.error('Error fetching review notifications:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Fetch pending review count for a specific project
   */
  async function fetchProjectPendingCount(projectId: number): Promise<number> {
    // Check cache first
    const cached = projectPendingCounts.value.get(projectId)
    if (cached !== undefined && isCacheValid()) {
      return cached
    }
    
    if (!token.value) {
      return 0
    }
    
    try {
      const response = await $fetch<{ data: { pending: number } }>(
        `${config.public.apiBase}/api/projects/${projectId}/reviews/stats`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      
      const count = response.data.pending
      projectPendingCounts.value.set(projectId, count)
      
      return count
    } catch (error) {
      console.error(`Error fetching pending reviews for project ${projectId}:`, error)
      return 0
    }
  }
  
  /**
   * Mark an own annotation review as seen
   */
  function markOwnReviewSeen(reviewId: number): void {
    const review = ownAnnotationReviews.value.find(r => r.reviewId === reviewId)
    if (review) {
      review.seen = true
    }
  }
  
  /**
   * Start auto-polling for notification updates
   */
  function startPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS): void {
    // Prevent multiple polling instances
    if (isPollingActive) {
      return
    }
    
    isPollingActive = true
    
    // Initial fetch
    refresh()
    
    // Set up polling interval
    pollingIntervalId = setInterval(() => {
      // Invalidate cache to force refresh
      lastFetchTime = 0
      refresh()
    }, intervalMs)
  }
  
  /**
   * Stop auto-polling
   */
  function stopPolling(): void {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId)
      pollingIntervalId = null
    }
    isPollingActive = false
  }
  
  /**
   * Clear all cached notification data
   */
  function clearCache(): void {
    pendingCount.value = 0
    ownAnnotationReviews.value = []
    projectPendingCounts.value.clear()
    lastFetchTime = 0
    lastRefreshed.value = null
  }
  
  return {
    pendingCount,
    ownAnnotationReviews,
    ownReviewedCount,
    projectPendingCounts,
    hasNotifications,
    isLoading,
    lastRefreshed,
    refresh,
    fetchProjectPendingCount,
    markOwnReviewSeen,
    startPolling,
    stopPolling,
    clearCache
  }
}

/**
 * Auto-setup review notifications with polling
 * 
 * Use this in a layout component to automatically start/stop polling
 * based on component lifecycle.
 * 
 * @example
 * ```vue
 * <script setup>
 * // In your layout or app component
 * useReviewNotificationsAutoRefresh(30000) // Poll every 30 seconds
 * </script>
 * ```
 */
export function useReviewNotificationsAutoRefresh(intervalMs = DEFAULT_POLL_INTERVAL_MS): UseReviewNotificationsReturn {
  const notifications = useReviewNotifications()
  
  onMounted(() => {
    notifications.startPolling(intervalMs)
  })
  
  onUnmounted(() => {
    notifications.stopPolling()
  })
  
  return notifications
}

/**
 * Composable for fetching review counts for multiple projects at once
 * 
 * Useful for projects list pages where you need to show pending counts
 * for each project in a grid/list.
 * 
 * @example
 * ```vue
 * <script setup>
 * const projectIds = [1, 2, 3, 4, 5]
 * const { counts, fetchAll, getCount } = useProjectReviewCounts(projectIds)
 * 
 * onMounted(() => fetchAll())
 * </script>
 * 
 * <template>
 *   <div v-for="id in projectIds">
 *     <span v-if="getCount(id) > 0">{{ getCount(id) }} pending</span>
 *   </div>
 * </template>
 * ```
 */
export function useProjectReviewCounts(projectIds: Ref<number[]> | number[]) {
  const { fetchProjectPendingCount, projectPendingCounts } = useReviewNotifications()
  const isLoading = ref(false)
  
  const ids = isRef(projectIds) ? projectIds : ref(projectIds)
  
  /**
   * Fetch counts for all projects
   */
  async function fetchAll(): Promise<void> {
    if (ids.value.length === 0) return
    
    isLoading.value = true
    
    try {
      // Fetch in parallel, but limit concurrency
      const batchSize = 5
      for (let i = 0; i < ids.value.length; i += batchSize) {
        const batch = ids.value.slice(i, i + batchSize)
        await Promise.all(batch.map(id => fetchProjectPendingCount(id)))
      }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Get cached count for a project
   */
  function getCount(projectId: number): number {
    return projectPendingCounts.value.get(projectId) ?? 0
  }
  
  return {
    counts: projectPendingCounts,
    isLoading,
    fetchAll,
    getCount
  }
}
