/**
 * Composable for fetching and managing review counts
 * 
 * Used in navigation components to display pending review badges.
 * Provides both global counts and project-specific counts.
 */

export interface ReviewCounts {
  /** Total pending reviews assigned to current user */
  pending: number
  /** Reviews completed today */
  completedToday: number
  /** Reviews with changes requested */
  changesRequested: number
}

export interface ProjectReviewCounts extends ReviewCounts {
  /** Project ID */
  projectId: number
  /** Approved reviews count */
  approved: number
}

interface UseReviewCountsReturn {
  /** Global pending review count */
  globalPendingCount: Ref<number>
  /** Whether global counts are loading */
  isLoadingGlobal: Ref<boolean>
  /** Fetch global review counts */
  fetchGlobalCounts: () => Promise<ReviewCounts>
  /** Fetch project-specific review counts */
  fetchProjectCounts: (projectId: number) => Promise<ProjectReviewCounts>
  /** Get cached project count (returns 0 if not cached) */
  getProjectPendingCount: (projectId: number) => number
  /** Clear all cached counts */
  clearCache: () => void
  /** Refresh all counts */
  refresh: () => Promise<void>
}

// Global state (shared across components)
const globalPendingCount = ref(0)
const isLoadingGlobal = ref(false)
const projectCountsCache = ref<Map<number, ProjectReviewCounts>>(new Map())
const lastFetchTime = ref<number>(0)

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000

export function useReviewCounts(): UseReviewCountsReturn {
  const token = useCookie('auth_token')
  const config = useRuntimeConfig()
  
  /**
   * Check if cache is still valid
   */
  function isCacheValid(): boolean {
    return Date.now() - lastFetchTime.value < CACHE_DURATION
  }
  
  /**
   * Fetch global review counts for current user
   */
  async function fetchGlobalCounts(): Promise<ReviewCounts> {
    // Return cached if valid
    if (isCacheValid() && globalPendingCount.value > 0) {
      return {
        pending: globalPendingCount.value,
        completedToday: 0,
        changesRequested: 0
      }
    }
    
    try {
      isLoadingGlobal.value = true
      
      const response = await $fetch<{ data: ReviewCounts }>(
        `${config.public.apiBase}/api/reviews/stats`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      
      globalPendingCount.value = response.data.pending
      lastFetchTime.value = Date.now()
      
      return response.data
    } catch (error) {
      console.error('Error fetching global review counts:', error)
      return {
        pending: 0,
        completedToday: 0,
        changesRequested: 0
      }
    } finally {
      isLoadingGlobal.value = false
    }
  }
  
  /**
   * Fetch project-specific review counts
   */
  async function fetchProjectCounts(projectId: number): Promise<ProjectReviewCounts> {
    // Check cache first
    const cached = projectCountsCache.value.get(projectId)
    if (cached && isCacheValid()) {
      return cached
    }
    
    try {
      const response = await $fetch<{ 
        data: { pending: number; approved: number; changesRequested: number } 
      }>(
        `${config.public.apiBase}/api/projects/${projectId}/reviews/stats`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      
      const counts: ProjectReviewCounts = {
        projectId,
        pending: response.data.pending,
        approved: response.data.approved,
        changesRequested: response.data.changesRequested,
        completedToday: 0
      }
      
      // Cache the result
      projectCountsCache.value.set(projectId, counts)
      
      return counts
    } catch (error) {
      console.error(`Error fetching review counts for project ${projectId}:`, error)
      return {
        projectId,
        pending: 0,
        approved: 0,
        changesRequested: 0,
        completedToday: 0
      }
    }
  }
  
  /**
   * Get cached project pending count
   */
  function getProjectPendingCount(projectId: number): number {
    return projectCountsCache.value.get(projectId)?.pending ?? 0
  }
  
  /**
   * Clear all cached counts
   */
  function clearCache(): void {
    globalPendingCount.value = 0
    projectCountsCache.value.clear()
    lastFetchTime.value = 0
  }
  
  /**
   * Refresh all counts (force fetch)
   */
  async function refresh(): Promise<void> {
    lastFetchTime.value = 0 // Invalidate cache
    await fetchGlobalCounts()
  }
  
  return {
    globalPendingCount,
    isLoadingGlobal,
    fetchGlobalCounts,
    fetchProjectCounts,
    getProjectPendingCount,
    clearCache,
    refresh
  }
}

/**
 * Auto-refresh review counts periodically
 * 
 * Use this in a layout or root component to keep counts updated.
 */
export function useReviewCountsAutoRefresh(intervalMs = 60000): void {
  const { refresh } = useReviewCounts()
  
  let intervalId: ReturnType<typeof setInterval> | null = null
  
  onMounted(() => {
    // Initial fetch
    refresh()
    
    // Set up auto-refresh
    intervalId = setInterval(() => {
      refresh()
    }, intervalMs)
  })
  
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })
}
