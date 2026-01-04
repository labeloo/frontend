<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <!-- Breadcrumb -->
            <nav class="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
              <NuxtLink 
                :to="`/projects/${projectId}`" 
                class="hover:text-primary transition-colors"
              >
                {{ projectName || 'Project' }}
              </NuxtLink>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 mx-2" />
              <span class="text-gray-900 dark:text-white">Reviews</span>
            </nav>
            
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-7 h-7 mr-3 text-primary" />
              Project Reviews
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review annotations for this project
            </p>
          </div>
          
          <!-- Quick Stats -->
          <div v-if="!isLoadingStats" class="flex items-center space-x-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ stats.pending }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                {{ stats.approved }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Approved</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">
                {{ stats.changesRequested }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Changes Requested</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- Error State -->
      <div 
        v-else-if="error" 
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center"
      >
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error Loading Reviews
        </h3>
        <p class="text-red-600 dark:text-red-300 max-w-md mx-auto mb-4">
          {{ error }}
        </p>
        <UButton color="error" variant="outline" @click="loadData">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
          Try Again
        </UButton>
      </div>

      <!-- Permission Check -->
      <div 
        v-else-if="!hasReviewPermission" 
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-8 text-center"
      >
        <UIcon name="i-heroicons-shield-exclamation" class="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
          No Review Permission
        </h3>
        <p class="text-amber-600 dark:text-amber-300 max-w-md mx-auto">
          You don't have permission to review annotations in this project. 
          Contact your project administrator to request access.
        </p>
        <UButton 
          class="mt-6" 
          color="neutral" 
          variant="outline"
          @click="navigateTo(`/projects/${projectId}`)"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
          Back to Project
        </UButton>
      </div>

      <!-- Review Dashboard with Project Filter -->
      <ReviewDashboard 
        v-else
        :project-id="numericProjectId"
        @review-completed="onReviewCompleted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ReviewDashboard from '~/components/review/ReviewDashboard.vue'

/**
 * Project Reviews Page
 * 
 * Shows pending reviews for a specific project.
 * Accessible from the project navigation sidebar.
 */

// Route params
const route = useRoute()
const projectId = computed(() => route.params.id as string)
const numericProjectId = computed(() => parseInt(projectId.value))

// Page meta
definePageMeta({
  layout: 'project',
  middleware: 'auth'
})

// Dynamic page title
const projectName = ref<string>('')

useHead({
  title: computed(() => projectName.value ? `${projectName.value} - Reviews` : 'Project Reviews')
})

// Auth
const token = useCookie('auth_token')

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const hasReviewPermission = ref(true)
const isLoadingStats = ref(true)
const stats = ref({
  pending: 0,
  approved: 0,
  changesRequested: 0
})

/**
 * Fetch project details
 */
async function fetchProjectDetails(): Promise<void> {
  try {
    const response = await $fetch<{ data: { projects: { name: string } } }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectId.value}`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    projectName.value = response.data.projects?.name ?? 'Project'
  } catch (err) {
    console.error('Error fetching project details:', err)
    projectName.value = 'Project'
  }
}

/**
 * Check if current user has review permission for this project
 */
async function checkPermission(): Promise<void> {
  try {
    // Check user's permissions for this specific project
    const response = await $fetch<{ data: { permissions: string[] } }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectId.value}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    hasReviewPermission.value = response.data.permissions?.includes('reviewAnnotations') ?? false
  } catch (err) {
    console.error('Error checking permissions:', err)
    // Fall back to checking global permissions
    try {
      const userResponse = await $fetch<{ data: { permissions: string[] } }>(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
      hasReviewPermission.value = userResponse.data.permissions?.includes('reviewAnnotations') ?? false
    } catch {
      hasReviewPermission.value = false
    }
  }
}

/**
 * Fetch review statistics for this project
 * Uses the project-scoped assigned-to-me endpoint to derive counts
 */
async function fetchStats(): Promise<void> {
  try {
    isLoadingStats.value = true
    
    // Use the available project-scoped assigned-to-me endpoint
    const response = await $fetch<{ 
      data: Array<{ status: string }> 
    }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectId.value}/reviews/assigned-to-me`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    // Derive counts from the response
    const reviews = response.data || []
    stats.value = {
      pending: reviews.filter(r => r.status === 'pending').length,
      approved: reviews.filter(r => r.status === 'approved').length,
      changesRequested: reviews.filter(r => r.status === 'changes_requested').length
    }
  } catch (err) {
    console.error('Error fetching review stats:', err)
    stats.value = { pending: 0, approved: 0, changesRequested: 0 }
  } finally {
    isLoadingStats.value = false
  }
}

/**
 * Load all page data
 */
async function loadData(): Promise<void> {
  try {
    isLoading.value = true
    error.value = null
    
    await Promise.all([
      fetchProjectDetails(),
      checkPermission()
    ])
    
    if (hasReviewPermission.value) {
      await fetchStats()
    }
  } catch (err) {
    console.error('Error loading page data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load review data'
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle review completion - refresh stats
 */
function onReviewCompleted(): void {
  fetchStats()
}

// Initialize
onMounted(() => {
  loadData()
})

// Watch for route changes (different project)
watch(() => route.params.id, () => {
  loadData()
})
</script>
