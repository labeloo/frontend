<script setup lang="ts">
import type { Review, ReviewAction, CreateReviewPayload, UpdateReviewPayload } from '~/types/reviews'
import { getReviewActionLabel } from '~/utils/reviewWorkflow'

/**
 * ReviewForm Component
 * 
 * A form component for creating or updating annotation reviews.
 * Handles validation, API calls, and provides feedback to the user.
 */

interface Props {
  /** The annotation ID to review */
  annotationId: number
  /** The project ID containing the annotation */
  projectId: number
  /** Existing review data for edit mode */
  existingReview?: Review
  /** Form mode - create or update */
  mode?: 'create' | 'update'
}

interface Emits {
  /** Emitted when review is successfully submitted */
  (e: 'success', review: Review): void
  /** Emitted when user cancels the form */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  existingReview: undefined,
  mode: 'create'
})

const emit = defineEmits<Emits>()

// API composable
const { createReview, updateReview, isCreating, isUpdating } = useReviewApi()

// Form state
const selectedStatus = ref<ReviewAction | null>(
  props.existingReview?.status === 'pending' ? null : (props.existingReview?.status as ReviewAction | undefined) ?? null
)
const message = ref(props.existingReview?.message ?? '')
const notifyAnnotator = ref(true)

// Validation state
const errors = reactive({
  status: '',
  message: ''
})

// Constants
const MAX_MESSAGE_LENGTH = 2000

/**
 * Available review action options
 */
const statusOptions: { value: ReviewAction; label: string; description: string; color: string; icon: string }[] = [
  {
    value: 'approved',
    label: getReviewActionLabel('approved'),
    description: 'Accept this annotation as complete',
    color: 'text-green-600 dark:text-green-400',
    icon: 'i-heroicons-check-circle'
  },
  {
    value: 'changes_requested',
    label: getReviewActionLabel('changes_requested'),
    description: 'Request modifications to the annotation',
    color: 'text-blue-600 dark:text-blue-400',
    icon: 'i-heroicons-pencil-square'
  },
  {
    value: 'rejected',
    label: getReviewActionLabel('rejected'),
    description: 'Reject this annotation entirely',
    color: 'text-red-600 dark:text-red-400',
    icon: 'i-heroicons-x-circle'
  }
]

/**
 * Check if message is required based on selected status
 */
const isMessageRequired = computed(() => {
  return selectedStatus.value === 'rejected' || selectedStatus.value === 'changes_requested'
})

/**
 * Current character count for the message
 */
const messageCharCount = computed(() => message.value.length)

/**
 * Check if message exceeds max length
 */
const isMessageTooLong = computed(() => messageCharCount.value > MAX_MESSAGE_LENGTH)

/**
 * Check if form is in loading state
 */
const isLoading = computed(() => isCreating.value || isUpdating.value)

/**
 * Check if form can be submitted
 */
const canSubmit = computed(() => {
  if (!selectedStatus.value) return false
  if (isMessageRequired.value && !message.value.trim()) return false
  if (isMessageTooLong.value) return false
  return true
})

/**
 * Validate the form fields
 */
const validateForm = (): boolean => {
  let isValid = true
  
  // Reset errors
  errors.status = ''
  errors.message = ''

  // Validate status
  if (!selectedStatus.value) {
    errors.status = 'Please select a review decision'
    isValid = false
  }

  // Validate message
  if (isMessageRequired.value && !message.value.trim()) {
    errors.message = 'Feedback message is required when rejecting or requesting changes'
    isValid = false
  }

  if (isMessageTooLong.value) {
    errors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`
    isValid = false
  }

  return isValid
}

/**
 * Handle form submission
 */
const handleSubmit = async () => {
  if (!validateForm()) return

  let result: Review | null = null

  if (props.mode === 'create') {
    const payload: CreateReviewPayload = {
      status: selectedStatus.value!,
      message: message.value.trim() || undefined,
      notifyAnnotator: notifyAnnotator.value
    }

    result = await createReview(props.projectId, props.annotationId, payload)
  } else if (props.mode === 'update' && props.existingReview) {
    const payload: UpdateReviewPayload = {
      status: selectedStatus.value!,
      message: message.value.trim() || undefined
    }

    result = await updateReview(props.projectId, props.existingReview.id, payload)
  }

  if (result) {
    emit('success', result)
  }
}

/**
 * Handle cancel action
 */
const handleCancel = () => {
  emit('cancel')
}

/**
 * Clear validation error when field is modified
 */
watch(selectedStatus, () => {
  errors.status = ''
})

watch(message, () => {
  if (errors.message && !isMessageRequired.value) {
    errors.message = ''
  } else if (errors.message && message.value.trim()) {
    errors.message = ''
  }
})
</script>

<template>
  <form
    class="review-form space-y-6"
    @submit.prevent="handleSubmit"
  >
    <!-- Status Selection -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-900 dark:text-white">
        Review Decision
        <span class="text-red-500">*</span>
      </label>

      <div class="grid gap-3">
        <label
          v-for="option in statusOptions"
          :key="option.value"
          class="relative flex items-start p-4 rounded-lg border cursor-pointer transition-all duration-150"
          :class="[
            selectedStatus === option.value
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 ring-2 ring-primary-500'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          ]"
        >
          <input
            v-model="selectedStatus"
            type="radio"
            :value="option.value"
            class="sr-only"
            :disabled="isLoading"
          />
          <div class="flex items-center gap-3 w-full">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full"
              :class="[
                selectedStatus === option.value
                  ? 'bg-primary-100 dark:bg-primary-900'
                  : 'bg-gray-100 dark:bg-gray-700'
              ]"
            >
              <UIcon
                :name="option.icon"
                class="w-5 h-5"
                :class="option.color"
                aria-hidden="true"
              />
            </div>
            <div class="flex-1">
              <span
                class="block text-sm font-medium"
                :class="option.color"
              >
                {{ option.label }}
              </span>
              <span class="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ option.description }}
              </span>
            </div>
            <UIcon
              v-if="selectedStatus === option.value"
              name="i-heroicons-check-circle-solid"
              class="w-5 h-5 text-primary-500"
              aria-hidden="true"
            />
          </div>
        </label>
      </div>

      <!-- Status Error -->
      <p
        v-if="errors.status"
        class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
      >
        <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" aria-hidden="true" />
        {{ errors.status }}
      </p>
    </div>

    <!-- Message Textarea -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label
          for="review-message"
          class="block text-sm font-medium text-gray-900 dark:text-white"
        >
          Feedback Message
          <span v-if="isMessageRequired" class="text-red-500">*</span>
          <span v-else class="text-gray-400 font-normal">(optional)</span>
        </label>
        <span
          class="text-xs"
          :class="[
            isMessageTooLong
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          ]"
        >
          {{ messageCharCount }} / {{ MAX_MESSAGE_LENGTH }}
        </span>
      </div>

      <UTextarea
        id="review-message"
        v-model="message"
        :rows="4"
        :disabled="isLoading"
        :placeholder="
          isMessageRequired
            ? 'Please provide feedback explaining your decision...'
            : 'Optional: Add feedback for the annotator...'
        "
        :color="errors.message ? 'error' : undefined"
        class="w-full"
      />

      <!-- Message Error -->
      <p
        v-if="errors.message"
        class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
      >
        <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" aria-hidden="true" />
        {{ errors.message }}
      </p>

      <!-- Message Hint -->
      <p
        v-if="isMessageRequired && !errors.message"
        class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
      >
        <UIcon name="i-heroicons-information-circle" class="w-4 h-4" aria-hidden="true" />
        Feedback is required when rejecting or requesting changes
      </p>
    </div>

    <!-- Notify Annotator Checkbox (Create mode only) -->
    <div
      v-if="mode === 'create'"
      class="flex items-start gap-3"
    >
      <UCheckbox
        id="notify-annotator"
        v-model="notifyAnnotator"
        :disabled="isLoading"
      />
      <div class="flex-1">
        <label
          for="notify-annotator"
          class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
        >
          Notify annotator
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Send a notification to the annotator about this review decision
        </p>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        :disabled="isLoading"
        @click="handleCancel"
      >
        Cancel
      </UButton>

      <UButton
        type="submit"
        color="primary"
        :disabled="!canSubmit || isLoading"
        :loading="isLoading"
      >
        <UIcon
          v-if="!isLoading"
          :name="mode === 'create' ? 'i-heroicons-paper-airplane' : 'i-heroicons-check'"
          class="w-4 h-4 mr-1.5"
          aria-hidden="true"
        />
        {{ mode === 'create' ? 'Submit Review' : 'Update Review' }}
      </UButton>
    </div>
  </form>
</template>
