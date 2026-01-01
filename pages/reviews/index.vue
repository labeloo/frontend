<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-7 h-7 mr-3 text-primary" />
              My Reviews
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review and provide feedback on annotations assigned to you
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
                {{ stats.completedToday }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Completed Today</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Permission Check -->
      <div 
        v-if="!hasReviewPermission && !isCheckingPermission" 
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-8 text-center"
      >
        <UIcon name="i-heroicons-shield-exclamation" class="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
          No Review Permission
        </h3>
        <p class="text-amber-600 dark:text-amber-300 max-w-md mx-auto">
          You don't have permission to review annotations. Contact your organization administrator 
          to request the "Review Annotations" permission.
        </p>
        <UButton 
          class="mt-6" 
          color="neutral" 
          variant="outline"
          @click="navigateTo('/homepage')"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
          Back to Homepage
        </UButton>
      </div>

      <!-- Loading State for Permission Check -->
      <div v-else-if="isCheckingPermission" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- Review Dashboard -->
      <ReviewDashboard 
        v-else
        @review-completed="onReviewCompleted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ReviewDashboard from '~/components/review/ReviewDashboard.vue'

/**
 * Global Reviews Page
 * 
 * Shows all pending reviews assigned to the current user across all projects.
 * This is the main review inbox where reviewers can see and manage their work.
 */

// Page meta
definePageMeta({
  layout: 'homepage',
  middleware: 'auth'
})

// SEO
useHead({
  title: 'My Reviews - Labeloo'
})

// Auth
const token = useCookie('auth_token')

// State
const hasReviewPermission = ref(true) // Assume true initially
const isCheckingPermission = ref(true)
const isLoadingStats = ref(true)
const stats = ref({
  pending: 0,
  completedToday: 0
})

/**
 * Check if current user has review permission
 */
async function checkPermission(): Promise<void> {
  try {
    isCheckingPermission.value = true
    
    const response = await $fetch<{ data: { permissions: string[] } }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/users/me`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    hasReviewPermission.value = response.data.permissions?.includes('reviewAnnotations') ?? false
  } catch (error) {
    console.error('Error checking permissions:', error)
    hasReviewPermission.value = false
  } finally {
    isCheckingPermission.value = false
  }
}

/**
 * Fetch review statistics
 */
async function fetchStats(): Promise<void> {
  try {
    isLoadingStats.value = true
    
    const response = await $fetch<{ data: { pending: number; completedToday: number } }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/reviews/stats`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    stats.value = response.data
  } catch (error) {
    console.error('Error fetching review stats:', error)
    // Use defaults
    stats.value = { pending: 0, completedToday: 0 }
  } finally {
    isLoadingStats.value = false
  }
}

/**
 * Handle review completion - refresh stats
 */
function onReviewCompleted(): void {
  fetchStats()
}

// Initialize
onMounted(async () => {
  await checkPermission()
  if (hasReviewPermission.value) {
    await fetchStats()
  }
})
</script>
