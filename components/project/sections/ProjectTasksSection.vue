<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Project Tasks</h2>
      <UButton color="secondary" class="cursor-pointer">
        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2 " />
        Create Task
      </UButton>
    </div>

    <!-- Task Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <p class="text-sm text-blue-600 dark:text-blue-400">Total</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-200">{{ taskStats.total }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600 mr-3" />
          <div>
            <p class="text-sm text-green-600 dark:text-green-400">Completed</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-200">{{ taskStats.completed }}</p>
          </div>
        </div>
      </div>
      
      <!-- In Review - only visible to users with review permissions -->
      <div v-if="hasReviewPermission || hasViewReviewsPermission" class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-clock" class="w-8 h-8 text-yellow-600 mr-3" />
          <div>
            <p class="text-sm text-yellow-600 dark:text-yellow-400">In Review</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{{ taskStats.inReview }}</p>
          </div>
        </div>
      </div>

      <!-- Changes Needed - only visible to users with review permissions -->
      <div v-if="hasReviewPermission || hasViewReviewsPermission" class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-orange-600 mr-3" />
          <div>
            <p class="text-sm text-orange-600 dark:text-orange-400">Changes Needed</p>
            <p class="text-2xl font-bold text-orange-900 dark:text-orange-200">{{ taskStats.changesNeeded }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-user-minus" class="w-8 h-8 text-gray-600 mr-3" />
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-200">{{ taskStats.unassigned }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <TaskReviewFilters
        :filter-options="filterOptionsWithCounts"
        :sort-options="sortOptions"
        v-model:model-filter="selectedFilter"
        v-model:model-sort="selectedSort"
        :has-active-filters="hasActiveFilters"
        :show-quick-filters="true"
        @reset="resetFilters"
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="animate-pulse">
          <div class="flex items-center gap-4 mb-3">
            <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="filteredTasks.length === 0" 
      class="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {{ hasActiveFilters ? 'No matching tasks' : 'No tasks yet' }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        {{ hasActiveFilters 
          ? 'Try adjusting your filters to see more tasks' 
          : 'Create your first task to get started' 
        }}
      </p>
      <UButton 
        v-if="hasActiveFilters" 
        color="neutral" 
        variant="outline"
        @click="resetFilters"
      >
        Clear Filters
      </UButton>
    </div>

    <!-- Tasks Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TaskCard
        v-for="task in filteredTasks"
        :key="task.id"
        :task="task"
        :show-assign-button="true"
        :show-progress="true"
        :show-completion-info="true"
        :show-review-status="true"
        :current-user-id="currentUserId"
        @view="handleViewTask"
        @assign="handleAssignTask"
        @continue="handleContinueTask"
        @review="handleReviewTask"
        @view-review="handleViewReview"
        @start-review="handleStartReview"
        @fix-issues="handleFixIssues"
      />
    </div>

    <!-- Pagination (if needed) -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <UPagination 
        v-model="currentPage" 
        :total="totalTasks" 
        :page-count="pageSize" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TaskWithReview, TaskStatistics } from '~/types/tasks'
import { useTaskReviewFilters, type FilterOptionItem } from '~/composables/useTaskReviewFilters'

interface Props {
  projectId: string
}

const props = defineProps<Props>()
const router = useRouter()
const toast = useToast()

// Current user (from auth)
const currentUserId = ref<number | undefined>(undefined)

// User permissions for this project
const userPermissions = ref<string[]>([])
const hasReviewPermission = computed(() => userPermissions.value.includes('reviewAnnotations'))
const hasViewReviewsPermission = computed(() => userPermissions.value.includes('viewReviews'))

// Pagination
const currentPage = ref(1)
const pageSize = ref(12)
const totalTasks = ref(0)
const totalPages = computed(() => Math.ceil(totalTasks.value / pageSize.value))

// Loading state
const isLoading = ref(true)

// Tasks data
const tasks = ref<TaskWithReview[]>([])

// Initialize filtering composable
const {
  selectedFilter,
  selectedSort,
  filterOptions: allFilterOptions,
  sortOptions,
  processedTasks,
  getFilterOptionsWithCounts,
  resetFilters,
  hasActiveFilters
} = useTaskReviewFilters<TaskWithReview>()

// Filter options based on user permissions
// Only show review-related options (in_review, changes_needed, needs_my_review) if user has appropriate permissions
const filterOptions = computed<FilterOptionItem[]>(() => {
  return allFilterOptions.filter(option => {
    // Always show basic options
    if (['all', 'unassigned', 'annotating', 'completed'].includes(option.value)) {
      return true
    }
    // Show review-related options only if user has review or view reviews permission
    if (['in_review', 'changes_needed', 'needs_my_review'].includes(option.value)) {
      return hasReviewPermission.value || hasViewReviewsPermission.value
    }
    return true
  })
})

// Computed: filtered and sorted tasks
const filteredTasks = computed(() => processedTasks(tasks.value))

// Computed: filter options with counts (using permission-filtered options)
const filterOptionsWithCounts = computed(() => {
  const allWithCounts = getFilterOptionsWithCounts(tasks.value)
  // Filter based on permissions
  return allWithCounts.filter(option => {
    if (['all', 'unassigned', 'annotating', 'completed'].includes(option.value)) {
      return true
    }
    if (['in_review', 'changes_needed', 'needs_my_review'].includes(option.value)) {
      return hasReviewPermission.value || hasViewReviewsPermission.value
    }
    return true
  })
})

// Computed: task statistics
const taskStats = computed<TaskStatistics>(() => ({
  total: tasks.value.length,
  unassigned: tasks.value.filter(t => t.status === 'unassigned').length,
  annotating: tasks.value.filter(t => t.status === 'annotating').length,
  inReview: tasks.value.filter(t => t.status === 'in_review').length,
  changesNeeded: tasks.value.filter(t => t.status === 'changes_needed').length,
  completed: tasks.value.filter(t => t.status === 'completed').length,
  autoApproved: tasks.value.filter(t => t.isAutoApproved).length,
  pendingMyReview: tasks.value.filter(t => 
    t.status === 'in_review' && t.isCurrentUserReview
  ).length
}))

// Backend response type for grouped tasks
interface GroupedTasksResponse {
  data: {
    unassigned: TaskWithReview[]
    annotating: TaskWithReview[]
    in_review: TaskWithReview[]
    changes_needed: TaskWithReview[]
    completed: TaskWithReview[]
  }
}

// Fetch tasks
async function fetchTasks(): Promise<void> {
  isLoading.value = true
  try {
    const authToken = useCookie('auth_token')
    const config = useRuntimeConfig()
    
    // Fetch from the correct backend endpoint (tasks grouped by status)
    const response = await $fetch<GroupedTasksResponse>(
      `${config.public.apiUrl}/api/tasks/project/${props.projectId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken.value}`
        }
      }
    )
    
    // Flatten the grouped tasks into a single array
    const groupedData = response.data
    const allTasks: TaskWithReview[] = [
      ...(groupedData.unassigned || []),
      ...(groupedData.annotating || []),
      ...(groupedData.in_review || []),
      ...(groupedData.changes_needed || []),
      ...(groupedData.completed || [])
    ]
    
    tasks.value = allTasks
    totalTasks.value = allTasks.length
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load tasks. Please try again.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Task action handlers
function handleViewTask(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}`)
}

function handleAssignTask(task: TaskWithReview): void {
  // Open assignment modal or slider
  console.log('Assign task:', task.id)
}

function handleContinueTask(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}`)
}

function handleReviewTask(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}?mode=review`)
}

function handleViewReview(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}?mode=view-review`)
}

function handleStartReview(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}?mode=review`)
}

function handleFixIssues(task: TaskWithReview): void {
  router.push(`/annotate/${task.id}?mode=fix`)
}

// Fetch user permissions for this project
async function fetchUserPermissions(): Promise<void> {
  try {
    const authToken = useCookie('auth_token')
    const config = useRuntimeConfig()
    
    const response = await $fetch<{ data: { permissions: string[] } }>(
      `${config.public.apiUrl}/api/projects/${props.projectId}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${authToken.value}`
        }
      }
    )
    
    userPermissions.value = response.data?.permissions || []
  } catch (error) {
    console.error('Failed to fetch user permissions:', error)
    // Default to empty permissions on error
    userPermissions.value = []
  }
}

// Watch for page changes
watch(currentPage, () => {
  fetchTasks()
})

// Initial fetch
onMounted(async () => {
  // Fetch permissions first, then tasks
  await fetchUserPermissions()
  await fetchTasks()
})
</script>
