<script setup lang="ts">
import type { ProjectReviewSettings, ProjectReviewSettingsResponse, EligibleReviewer, ReviewMode } from '~/types/reviews'

/**
 * ProjectReviewSettingsForm Component
 * 
 * An inline form component for managing project-level review settings.
 * This is the non-modal version for embedding in settings pages.
 */

interface Props {
  /** The project ID to manage settings for */
  projectId: number
  /** Whether the user has permission to edit */
  canEdit?: boolean
}

interface Emits {
  /** Emitted when settings are successfully updated */
  (e: 'updated', settings: ProjectReviewSettings): void
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true
})

const emit = defineEmits<Emits>()

const toast = useToast()

// Composables
const {
  getProjectReviewSettings,
  updateProjectReviewSettings,
  getEligibleReviewers,
  isFetchingSettings,
  isUpdatingSettings,
  isFetchingReviewers
} = useProjectReviewSettings()

// Component state
const hasLoaded = ref(false)
const currentWorkflowMode = ref<string>('')
const eligibleReviewers = ref<EligibleReviewer[]>([])
const isEditing = ref(false)

// Form state
const reviewMode = ref<ReviewMode>('auto')
const allowSelfReview = ref(false)
const autoAssignReviewer = ref(true)

// Original values for comparison
const originalValues = ref({
  reviewMode: 'auto' as ReviewMode,
  allowSelfReview: false,
  autoAssignReviewer: true
})

/**
 * Review mode options with descriptions
 */
const reviewModeOptions: {
  value: ReviewMode
  label: string
  description: string
  icon: string
}[] = [
  {
    value: 'auto',
    label: 'Automatic',
    description: 'Automatically detect based on available reviewers. If reviewers are available, reviews will be required. Otherwise, annotations will be auto-approved.',
    icon: 'i-heroicons-sparkles'
  },
  {
    value: 'always-required',
    label: 'Always Required',
    description: 'All annotations must be reviewed before completion. Annotations will wait in queue until a reviewer approves or requests changes.',
    icon: 'i-heroicons-shield-check'
  },
  {
    value: 'always-skip',
    label: 'Skip Review',
    description: 'Skip the review process entirely. All submitted annotations will be automatically approved and marked as completed.',
    icon: 'i-heroicons-forward'
  }
]

/**
 * Check if there's a warning condition
 */
const hasWarning = computed(() => {
  return reviewMode.value === 'always-required' && eligibleReviewers.value.length === 0
})

/**
 * Warning message for the current configuration
 */
const warningMessage = computed(() => {
  if (reviewMode.value === 'always-required' && eligibleReviewers.value.length === 0) {
    return 'No eligible reviewers found. Annotations will be stuck in review queue until reviewers are assigned to this project.'
  }
  return null
})

/**
 * Check if form has changes
 */
const hasChanges = computed(() => {
  return (
    reviewMode.value !== originalValues.value.reviewMode ||
    allowSelfReview.value !== originalValues.value.allowSelfReview ||
    autoAssignReviewer.value !== originalValues.value.autoAssignReviewer
  )
})

/**
 * Loading state for initial fetch
 */
const isLoading = computed(() => {
  return isFetchingSettings.value || isFetchingReviewers.value
})

/**
 * Get workflow mode display text
 */
const workflowModeDisplay = computed(() => {
  switch (currentWorkflowMode.value) {
    case 'auto-approve':
      return { label: 'Auto-approve', color: 'success', icon: 'i-heroicons-check-circle' }
    case 'review-required':
      return { label: 'Review Required', color: 'warning', icon: 'i-heroicons-clock' }
    default:
      return { label: 'Not configured', color: 'neutral', icon: 'i-heroicons-question-mark-circle' }
  }
})

/**
 * Fetch initial settings and reviewers
 */
const fetchData = async () => {
  const [settings, reviewers] = await Promise.all([
    getProjectReviewSettings(props.projectId) as Promise<ProjectReviewSettingsResponse | null>,
    getEligibleReviewers(props.projectId)
  ])

  if (settings) {
    reviewMode.value = settings.reviewMode
    allowSelfReview.value = settings.allowSelfReview
    autoAssignReviewer.value = settings.autoAssignReviewer
    currentWorkflowMode.value = settings.currentWorkflowMode || ''
    
    // Store original values
    originalValues.value = {
      reviewMode: settings.reviewMode,
      allowSelfReview: settings.allowSelfReview,
      autoAssignReviewer: settings.autoAssignReviewer
    }
  }

  eligibleReviewers.value = reviewers
  hasLoaded.value = true
}

/**
 * Start editing mode
 */
const startEditing = () => {
  isEditing.value = true
}

/**
 * Cancel editing and reset form
 */
const cancelEditing = () => {
  // Reset to original values
  reviewMode.value = originalValues.value.reviewMode
  allowSelfReview.value = originalValues.value.allowSelfReview
  autoAssignReviewer.value = originalValues.value.autoAssignReviewer
  isEditing.value = false
}

/**
 * Handle form submission
 */
const handleSave = async () => {
  const settings: Partial<ProjectReviewSettings> = {
    reviewMode: reviewMode.value,
    allowSelfReview: allowSelfReview.value,
    autoAssignReviewer: autoAssignReviewer.value
  }

  const result = await updateProjectReviewSettings(props.projectId, settings) as ProjectReviewSettingsResponse | null

  if (result) {
    // Update original values
    originalValues.value = {
      reviewMode: reviewMode.value,
      allowSelfReview: allowSelfReview.value,
      autoAssignReviewer: autoAssignReviewer.value
    }
    
    currentWorkflowMode.value = result.currentWorkflowMode || ''
    isEditing.value = false
    
    toast.add({
      title: 'Review settings saved',
      description: 'Project review workflow has been updated successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    emit('updated', result)
  }
}

/**
 * Get reviewer initials for avatar
 */
const getReviewerInitials = (email: string): string => {
  const localPart = email.split('@')[0] || ''
  const parts = localPart.split(/[._-]/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  }
  return localPart.substring(0, 2).toUpperCase() || 'RV'
}

/**
 * Get workload indicator color
 */
const getWorkloadColor = (count: number): string => {
  if (count === 0) return 'text-green-600 dark:text-green-400'
  if (count < 5) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get workload label
 */
const getWorkloadLabel = (count: number): string => {
  if (count === 0) return 'Available'
  return `${count} pending`
}

// Fetch on mount
onMounted(fetchData)

// Watch for projectId changes
watch(() => props.projectId, fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="isLoading && !hasLoaded"
      class="space-y-6"
    >
      <div class="animate-pulse space-y-4">
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Current Workflow Status Card -->
      <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div 
              class="flex items-center justify-center w-10 h-10 rounded-full"
              :class="{
                'bg-green-100 dark:bg-green-900/30': workflowModeDisplay.color === 'success',
                'bg-yellow-100 dark:bg-yellow-900/30': workflowModeDisplay.color === 'warning',
                'bg-gray-100 dark:bg-gray-700': workflowModeDisplay.color === 'neutral'
              }"
            >
              <UIcon 
                :name="workflowModeDisplay.icon" 
                class="w-5 h-5"
                :class="{
                  'text-green-600 dark:text-green-400': workflowModeDisplay.color === 'success',
                  'text-yellow-600 dark:text-yellow-400': workflowModeDisplay.color === 'warning',
                  'text-gray-600 dark:text-gray-400': workflowModeDisplay.color === 'neutral'
                }"
              />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                Current Workflow Mode
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ workflowModeDisplay.label }}
              </p>
            </div>
          </div>
          <UBadge :color="workflowModeDisplay.color as any" variant="subtle">
            {{ workflowModeDisplay.label }}
          </UBadge>
        </div>
      </div>

      <!-- Warning Alert -->
      <UAlert
        v-if="hasWarning && warningMessage"
        color="warning"
        variant="subtle"
        :title="warningMessage"
        icon="i-heroicons-exclamation-triangle"
        class="mb-6"
      />

      <!-- Review Mode Selection -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            Review Mode
          </label>
          <div v-if="!isEditing && canEdit">
            <UButton
              color="primary"
              variant="outline"
              size="sm"
              @click="startEditing"
            >
              <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-2" />
              Edit Settings
            </UButton>
          </div>
        </div>

        <div class="space-y-3">
          <label
            v-for="option in reviewModeOptions"
            :key="option.value"
            class="relative flex items-start p-4 rounded-lg border transition-all duration-150"
            :class="[
              reviewMode === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
              isEditing && canEdit
                ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
                : 'cursor-default'
            ]"
          >
            <input
              v-model="reviewMode"
              type="radio"
              :value="option.value"
              class="sr-only"
              :disabled="!isEditing || isUpdatingSettings || !canEdit"
            />
            
            <div class="flex gap-3 w-full">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                :class="[
                  reviewMode === option.value
                    ? 'bg-primary-100 dark:bg-primary-900'
                    : 'bg-gray-100 dark:bg-gray-700'
                ]"
              >
                <UIcon
                  :name="option.icon"
                  class="w-5 h-5"
                  :class="[
                    reviewMode === option.value
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  ]"
                />
              </div>

              <div class="flex-1">
                <span
                  class="block text-sm font-medium"
                  :class="[
                    reviewMode === option.value
                      ? 'text-primary-900 dark:text-primary-100'
                      : 'text-gray-900 dark:text-white'
                  ]"
                >
                  {{ option.label }}
                </span>
                <span
                  class="block text-sm mt-1"
                  :class="[
                    reviewMode === option.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-500 dark:text-gray-400'
                  ]"
                >
                  {{ option.description }}
                </span>
              </div>

              <!-- Selected indicator -->
              <div
                v-if="reviewMode === option.value"
                class="shrink-0"
              >
                <UIcon
                  name="i-heroicons-check-circle-solid"
                  class="w-5 h-5 text-primary-600 dark:text-primary-400"
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Additional Options (only shown when editing) -->
      <div v-if="isEditing" class="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-medium text-gray-900 dark:text-white">Additional Options</h4>
        
        <!-- Allow Self Review -->
        <label class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex-1">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              Allow Self-Review
            </span>
            <span class="block text-sm text-gray-500 dark:text-gray-400">
              Allow annotators to review their own annotations
            </span>
          </div>
          <UToggle
            v-model="allowSelfReview"
            :disabled="isUpdatingSettings || !canEdit"
          />
        </label>

        <!-- Auto-assign Reviewer -->
        <label class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex-1">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              Auto-assign Reviewers
            </span>
            <span class="block text-sm text-gray-500 dark:text-gray-400">
              Automatically assign available reviewers to new annotations
            </span>
          </div>
          <UToggle
            v-model="autoAssignReviewer"
            :disabled="isUpdatingSettings || !canEdit"
          />
        </label>
      </div>

      <!-- Eligible Reviewers Section -->
      <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">
          Eligible Reviewers
          <span class="text-gray-500 dark:text-gray-400 font-normal">
            ({{ eligibleReviewers.length }})
          </span>
        </h4>

        <div v-if="eligibleReviewers.length === 0" class="text-center py-6">
          <UIcon 
            name="i-heroicons-user-group" 
            class="w-10 h-10 text-gray-400 mx-auto mb-3" 
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No eligible reviewers found.
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Assign users with the "Review Annotations" permission to this project.
          </p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="reviewer in eligibleReviewers"
            :key="reviewer.userId"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span class="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {{ getReviewerInitials(reviewer.email) }}
                </span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ reviewer.email }}
                </p>
                <p class="text-xs" :class="getWorkloadColor(reviewer.pendingReviewCount)">
                  {{ getWorkloadLabel(reviewer.pendingReviewCount) }}
                </p>
              </div>
            </div>
            <UBadge
              :color="reviewer.pendingReviewCount === 0 ? 'success' : reviewer.pendingReviewCount < 5 ? 'warning' : 'error'"
              variant="subtle"
              size="sm"
            >
              {{ reviewer.pendingReviewCount }} reviews
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Action Buttons (when editing) -->
      <div
        v-if="isEditing"
        class="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700"
      >
        <UButton
          color="primary"
          :loading="isUpdatingSettings"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          <UIcon name="i-heroicons-check" class="w-4 h-4 mr-2" />
          Save Changes
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="isUpdatingSettings"
          @click="cancelEditing"
        >
          Cancel
        </UButton>
        
        <!-- Unsaved changes indicator -->
        <div v-if="hasChanges" class="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <div class="w-2 h-2 bg-orange-500 rounded-full" />
          Unsaved changes
        </div>
      </div>
    </div>
  </div>
</template>
