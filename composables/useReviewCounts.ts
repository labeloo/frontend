/**
 * Composable for fetching and managing review counts
 * 
 * Used in navigation components to display pending review badges.
 * Provides both global counts and project-specific counts.
 * 
 * Uses the assigned-to-me endpoints to derive counts since there's no
 * dedicated stats endpoint in the backend.
 */

import type { ReviewWithContext } from '~/types/reviews'

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
   * Uses the assigned-to-me endpoint to count pending reviews
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
      
      // Use the existing assigned-to-me endpoint to get reviews assigned to current user
      const response = await $fetch<{ data: ReviewWithContext[] }>(
        `${config.public.apiUrl}/api/reviews/assigned-to-me`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      
      // Count pending reviews from the response
      const reviews = response.data || []
      const pendingCount = reviews.filter(r => r.status === 'pending').length
      const changesRequestedCount = reviews.filter(r => r.status === 'changes_requested').length
      
      globalPendingCount.value = pendingCount
      lastFetchTime.value = Date.now()
      
      return {
        pending: pendingCount,
        completedToday: 0, // Not available from this endpoint
        changesRequested: changesRequestedCount
      }
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
   * Uses the project-scoped assigned-to-me endpoint
   */
  async function fetchProjectCounts(projectId: number): Promise<ProjectReviewCounts> {
    // Check cache first
    const cached = projectCountsCache.value.get(projectId)
    if (cached && isCacheValid()) {
      return cached
    }
    
    try {
      // Use the existing project-scoped assigned-to-me endpoint
      const response = await $fetch<{ data: ReviewWithContext[] }>(
        `${config.public.apiUrl}/api/projects/${projectId}/reviews/assigned-to-me`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      
      // Count from the response
      const reviews = response.data || []
      const pendingCount = reviews.filter(r => r.status === 'pending').length
      const approvedCount = reviews.filter(r => r.status === 'approved').length
      const changesRequestedCount = reviews.filter(r => r.status === 'changes_requested').length
      
      const counts: ProjectReviewCounts = {
        projectId,
        pending: pendingCount,
        approved: approvedCount,
        changesRequested: changesRequestedCount,
        completedToday: 0 // Not available from this endpoint
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
