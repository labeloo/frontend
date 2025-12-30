<script setup lang="ts">
import type { ProjectReviewSettings, EligibleReviewer, ReviewMode } from '~/types/reviews'

/**
 * ProjectReviewSettingsModal Component
 * 
 * A modal/section component for managing project-level review settings.
 * Allows configuration of review workflow mode and reviewer assignment options.
 */

interface Props {
  /** The project ID to manage settings for */
  projectId: number
  /** Whether the modal is open (if used as modal) */
  isOpen?: boolean
}

interface Emits {
  /** Emitted when modal is closed */
  (e: 'close'): void
  /** Emitted when settings are successfully updated */
  (e: 'updated', settings: ProjectReviewSettings): void
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

const emit = defineEmits<Emits>()

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

// Form state
const reviewMode = ref<ReviewMode>('auto')
const allowSelfReview = ref(false)
const autoAssignReviewer = ref(true)

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
  // This would require comparing with initial values
  // For now, always allow save
  return true
})

/**
 * Loading state for initial fetch
 */
const isLoading = computed(() => {
  return isFetchingSettings.value || isFetchingReviewers.value
})

/**
 * Fetch initial settings and reviewers
 */
const fetchData = async () => {
  const [settings, reviewers] = await Promise.all([
    getProjectReviewSettings(props.projectId),
    getEligibleReviewers(props.projectId)
  ])

  if (settings) {
    reviewMode.value = settings.reviewMode
    allowSelfReview.value = settings.allowSelfReview
    autoAssignReviewer.value = settings.autoAssignReviewer
    currentWorkflowMode.value = settings.currentWorkflowMode
  }

  eligibleReviewers.value = reviewers
  hasLoaded.value = true
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

  const result = await updateProjectReviewSettings(props.projectId, settings)

  if (result) {
    emit('updated', result)
    emit('close')
  }
}

/**
 * Handle modal close
 */
const handleClose = () => {
  emit('close')
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

// Fetch on mount
onMounted(fetchData)

// Watch for projectId changes
watch(() => props.projectId, fetchData)
</script>

<template>
  <UModal
    :open="isOpen"
    @close="handleClose"
  >
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Review Settings
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure how annotations are reviewed in this project
            </p>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="handleClose"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" aria-hidden="true" />
          </UButton>
        </div>

        <!-- Loading State -->
        <div
          v-if="isLoading && !hasLoaded"
          class="space-y-6"
        >
          <div class="animate-pulse space-y-4">
            <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>

        <!-- Form Content -->
        <div
          v-else
          class="space-y-6"
        >
          <!-- Current Workflow Mode Indicator -->
          <div
            v-if="currentWorkflowMode"
            class="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg border border-primary-200 dark:border-primary-800"
          >
            <UIcon
              name="i-heroicons-information-circle"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
              aria-hidden="true"
            />
            <span class="text-sm text-primary-700 dark:text-primary-300">
              Current workflow: 
              <span class="font-medium">
                {{ currentWorkflowMode === 'auto-approve' ? 'Auto-approve' : 'Review required' }}
              </span>
            </span>
          </div>

          <!-- Review Mode Selection -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-gray-900 dark:text-white">
              Review Mode
            </label>

            <div class="space-y-3">
              <label
                v-for="option in reviewModeOptions"
                :key="option.value"
                class="relative flex items-start p-4 rounded-lg border cursor-pointer transition-all duration-150"
                :class="[
                  reviewMode === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                ]"
              >
                <input
                  v-model="reviewMode"
                  type="radio"
                  :value="option.value"
                  class="sr-only"
                  :disabled="isUpdatingSettings"
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
                      aria-hidden="true"
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
                    <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {{ option.description }}
                    </span>
                  </div>

                  <UIcon
                    v-if="reviewMode === option.value"
                    name="i-heroicons-check-circle-solid"
                    class="w-5 h-5 text-primary-500 shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </label>
            </div>

            <!-- Warning Message -->
            <div
              v-if="warningMessage"
              class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span class="text-sm text-amber-700 dark:text-amber-300">
                {{ warningMessage }}
              </span>
            </div>
          </div>

          <!-- Additional Options -->
          <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              Additional Options
            </h3>

            <!-- Allow Self Review -->
            <div class="flex items-start gap-3">
              <UCheckbox
                id="allow-self-review"
                v-model="allowSelfReview"
                :disabled="isUpdatingSettings || reviewMode === 'always-skip'"
              />
              <div class="flex-1">
                <label
                  for="allow-self-review"
                  class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  :class="{ 'opacity-50': reviewMode === 'always-skip' }"
                >
                  Allow Self Review
                </label>
                <p
                  class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                  :class="{ 'opacity-50': reviewMode === 'always-skip' }"
                >
                  Allow annotators to review and approve their own annotations. Not recommended for quality assurance.
                </p>
              </div>
            </div>

            <!-- Auto Assign Reviewer -->
            <div class="flex items-start gap-3">
              <UCheckbox
                id="auto-assign-reviewer"
                v-model="autoAssignReviewer"
                :disabled="isUpdatingSettings || reviewMode === 'always-skip'"
              />
              <div class="flex-1">
                <label
                  for="auto-assign-reviewer"
                  class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  :class="{ 'opacity-50': reviewMode === 'always-skip' }"
                >
                  Auto-assign Reviewers
                </label>
                <p
                  class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                  :class="{ 'opacity-50': reviewMode === 'always-skip' }"
                >
                  Automatically assign reviewers to submissions based on their current workload.
                </p>
              </div>
            </div>
          </div>

          <!-- Eligible Reviewers Section -->
          <div
            v-if="reviewMode !== 'always-skip'"
            class="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                Eligible Reviewers
              </h3>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ eligibleReviewers.length }} reviewer{{ eligibleReviewers.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- No Reviewers -->
            <div
              v-if="eligibleReviewers.length === 0"
              class="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2"
                aria-hidden="true"
              />
              <p class="text-sm text-gray-500 dark:text-gray-400">
                No eligible reviewers
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Add users with review permissions to this project
              </p>
            </div>

            <!-- Reviewers List -->
            <div
              v-else
              class="space-y-2 max-h-48 overflow-y-auto"
            >
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
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ reviewer.email }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-medium"
                    :class="getWorkloadColor(reviewer.pendingReviewCount)"
                  >
                    {{ reviewer.pendingReviewCount }} pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="isUpdatingSettings"
            @click="handleClose"
          >
            Cancel
          </UButton>

          <UButton
            color="primary"
            :loading="isUpdatingSettings"
            :disabled="isUpdatingSettings || (isLoading && !hasLoaded)"
            @click="handleSave"
          >
            <UIcon
              v-if="!isUpdatingSettings"
              name="i-heroicons-check"
              class="w-4 h-4 mr-1.5"
              aria-hidden="true"
            />
            Save Settings
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
