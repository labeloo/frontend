import type { ReviewStatus } from '~/types/reviews'

/**
 * Task status types for filtering
 */
export type TaskStatus = 'unassigned' | 'annotating' | 'in_review' | 'changes_needed' | 'completed'

/**
 * Review filter options
 */
export type ReviewFilterOption = 'all' | 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'auto_approved'

/**
 * Task filter options (combined task status and review status)
 */
export type TaskFilterOption = 
  | 'all'
  | 'unassigned'
  | 'annotating'
  | 'in_review'
  | 'changes_needed'
  | 'completed'
  | 'needs_my_review'

/**
 * Sort options for tasks
 */
export type TaskSortOption = 
  | 'created_desc'
  | 'created_asc'
  | 'updated_desc'
  | 'updated_asc'
  | 'priority_desc'
  | 'priority_asc'
  | 'review_status'

/**
 * Minimal task interface for filtering
 */
export interface FilterableTask {
  id: number
  status: TaskStatus
  priority: number
  createdAt: number
  updatedAt: number
  reviewStatus?: ReviewStatus
  isAutoApproved?: boolean
  isCurrentUserReview?: boolean
}

/**
 * Filter option definitions for UI
 */
export interface FilterOptionItem {
  value: TaskFilterOption
  label: string
  icon?: string
  description?: string
}

/**
 * Sort option definitions for UI
 */
export interface SortOptionItem {
  value: TaskSortOption
  label: string
  icon?: string
}

/**
 * Composable for filtering and sorting tasks by review status
 */
export function useTaskReviewFilters<T extends FilterableTask>() {
  // Reactive filter state
  const selectedFilter = ref<TaskFilterOption>('all')
  const selectedSort = ref<TaskSortOption>('created_desc')
  const searchQuery = ref('')

  /**
   * Available filter options for UI dropdowns
   */
  const filterOptions: FilterOptionItem[] = [
    { 
      value: 'all', 
      label: 'All Tasks', 
      icon: 'i-heroicons-squares-2x2',
      description: 'Show all tasks regardless of status'
    },
    { 
      value: 'unassigned', 
      label: 'Unassigned', 
      icon: 'i-heroicons-user-minus',
      description: 'Tasks not yet assigned to anyone'
    },
    { 
      value: 'annotating', 
      label: 'In Progress', 
      icon: 'i-heroicons-pencil-square',
      description: 'Tasks currently being annotated'
    },
    { 
      value: 'in_review', 
      label: 'Pending Review', 
      icon: 'i-heroicons-clock',
      description: 'Tasks waiting for review'
    },
    { 
      value: 'changes_needed', 
      label: 'Changes Requested', 
      icon: 'i-heroicons-exclamation-triangle',
      description: 'Tasks that need revisions'
    },
    { 
      value: 'completed', 
      label: 'Completed', 
      icon: 'i-heroicons-check-circle',
      description: 'Tasks that have been approved'
    },
    { 
      value: 'needs_my_review', 
      label: 'Needs My Review', 
      icon: 'i-heroicons-clipboard-document-check',
      description: 'Tasks assigned to you for review'
    }
  ]

  /**
   * Available sort options for UI dropdowns
   */
  const sortOptions: SortOptionItem[] = [
    { 
      value: 'created_desc', 
      label: 'Newest First', 
      icon: 'i-heroicons-arrow-down' 
    },
    { 
      value: 'created_asc', 
      label: 'Oldest First', 
      icon: 'i-heroicons-arrow-up' 
    },
    { 
      value: 'updated_desc', 
      label: 'Recently Updated', 
      icon: 'i-heroicons-arrow-path' 
    },
    { 
      value: 'updated_asc', 
      label: 'Least Recently Updated', 
      icon: 'i-heroicons-arrow-path' 
    },
    { 
      value: 'priority_desc', 
      label: 'Highest Priority', 
      icon: 'i-heroicons-arrow-trending-up' 
    },
    { 
      value: 'priority_asc', 
      label: 'Lowest Priority', 
      icon: 'i-heroicons-arrow-trending-down' 
    },
    { 
      value: 'review_status', 
      label: 'By Review Status', 
      icon: 'i-heroicons-clipboard-document-list' 
    }
  ]

  /**
   * Filter tasks by the selected filter option
   */
  function filterTasks(tasks: T[]): T[] {
    if (selectedFilter.value === 'all') {
      return tasks
    }

    if (selectedFilter.value === 'needs_my_review') {
      return tasks.filter(task => 
        task.status === 'in_review' && task.isCurrentUserReview === true
      )
    }

    return tasks.filter(task => task.status === selectedFilter.value)
  }

  /**
   * Get the sort order for review status (for sorting by review workflow stage)
   */
  function getReviewStatusOrder(status: TaskStatus): number {
    const order: Record<TaskStatus, number> = {
      'changes_needed': 0,  // Highest priority - needs attention
      'in_review': 1,       // Second priority - pending action
      'annotating': 2,      // In progress
      'unassigned': 3,      // Not started
      'completed': 4        // Done
    }
    return order[status] ?? 5
  }

  /**
   * Sort tasks by the selected sort option
   */
  function sortTasks(tasks: T[]): T[] {
    const sorted = [...tasks]
    
    switch (selectedSort.value) {
      case 'created_desc':
        return sorted.sort((a, b) => b.createdAt - a.createdAt)
      case 'created_asc':
        return sorted.sort((a, b) => a.createdAt - b.createdAt)
      case 'updated_desc':
        return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
      case 'updated_asc':
        return sorted.sort((a, b) => a.updatedAt - b.updatedAt)
      case 'priority_desc':
        return sorted.sort((a, b) => b.priority - a.priority)
      case 'priority_asc':
        return sorted.sort((a, b) => a.priority - b.priority)
      case 'review_status':
        return sorted.sort((a, b) => 
          getReviewStatusOrder(a.status) - getReviewStatusOrder(b.status)
        )
      default:
        return sorted
    }
  }

  /**
   * Apply both filter and sort to tasks
   */
  function processedTasks(tasks: T[]): T[] {
    const filtered = filterTasks(tasks)
    return sortTasks(filtered)
  }

  /**
   * Get count of tasks matching each filter option
   */
  function getFilterCounts(tasks: T[]): Record<TaskFilterOption, number> {
    return {
      all: tasks.length,
      unassigned: tasks.filter(t => t.status === 'unassigned').length,
      annotating: tasks.filter(t => t.status === 'annotating').length,
      in_review: tasks.filter(t => t.status === 'in_review').length,
      changes_needed: tasks.filter(t => t.status === 'changes_needed').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      needs_my_review: tasks.filter(t => 
        t.status === 'in_review' && t.isCurrentUserReview === true
      ).length
    }
  }

  /**
   * Get filter options with counts for UI
   */
  function getFilterOptionsWithCounts(tasks: T[]): Array<FilterOptionItem & { count: number }> {
    const counts = getFilterCounts(tasks)
    return filterOptions.map(option => ({
      ...option,
      count: counts[option.value]
    }))
  }

  /**
   * Reset filters to default state
   */
  function resetFilters(): void {
    selectedFilter.value = 'all'
    selectedSort.value = 'created_desc'
    searchQuery.value = ''
  }

  /**
   * Check if any filter is active (not default)
   */
  const hasActiveFilters = computed(() => 
    selectedFilter.value !== 'all' || 
    selectedSort.value !== 'created_desc' ||
    searchQuery.value !== ''
  )

  /**
   * Get the currently selected filter option details
   */
  const currentFilter = computed(() => 
    filterOptions.find(o => o.value === selectedFilter.value)
  )

  /**
   * Get the currently selected sort option details
   */
  const currentSort = computed(() => 
    sortOptions.find(o => o.value === selectedSort.value)
  )

  return {
    // State
    selectedFilter,
    selectedSort,
    searchQuery,
    
    // Options
    filterOptions,
    sortOptions,
    
    // Methods
    filterTasks,
    sortTasks,
    processedTasks,
    getFilterCounts,
    getFilterOptionsWithCounts,
    resetFilters,
    
    // Computed
    hasActiveFilters,
    currentFilter,
    currentSort
  }
}
