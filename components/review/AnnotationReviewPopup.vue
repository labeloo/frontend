<script setup lang="ts">
/**
 * AnnotationReviewPopup Component
 * 
 * A lightweight popup that appears when clicking an annotation on the canvas
 * to quickly approve or reject with optional feedback message.
 */

import type { Review, CreateReviewPayload } from '~/types/reviews'

interface Props {
  /** The annotation ID to review */
  annotationId: number
  /** The project ID containing the annotation */
  projectId: number
  /** Position to anchor the popup (from click event) */
  position: { x: number; y: number }
  /** Whether the popup is visible */
  visible: boolean
  /** Whether the annotation can be reviewed */
  isReviewable: boolean
}

interface Emits {
  /** Emitted when review is successfully submitted */
  (e: 'success', review: Review): void
  /** Emitted when user cancels or closes the popup */
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// API composable
const { createReview, isCreating } = useReviewApi()

// Form state
const message = ref('')
const messageError = ref('')

// Constants
const MAX_MESSAGE_LENGTH = 500

/**
 * Character count for the message
 */
const messageCharCount = computed(() => message.value.length)

/**
 * Check if message exceeds max length
 */
const isMessageTooLong = computed(() => messageCharCount.value > MAX_MESSAGE_LENGTH)

/**
 * Validate message for reject action
 */
const validateMessageForReject = (): boolean => {
  if (!message.value.trim()) {
    messageError.value = 'Message is required when rejecting'
    return false
  }
  if (isMessageTooLong.value) {
    messageError.value = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`
    return false
  }
  messageError.value = ''
  return true
}

/**
 * Validate message for approve action
 */
const validateMessageForApprove = (): boolean => {
  if (isMessageTooLong.value) {
    messageError.value = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`
    return false
  }
  messageError.value = ''
  return true
}

/**
 * Handle approve action
 */
const handleApprove = async () => {
  if (!validateMessageForApprove()) return

  const payload: CreateReviewPayload = {
    status: 'approved',
    message: message.value.trim() || undefined,
    notifyAnnotator: true
  }

  const result = await createReview(props.projectId, props.annotationId, payload)
  
  if (result) {
    emit('success', result)
    resetForm()
  }
}

/**
 * Handle reject action (changes_requested)
 */
const handleReject = async () => {
  if (!validateMessageForReject()) return

  const payload: CreateReviewPayload = {
    status: 'changes_requested',
    message: message.value.trim(),
    notifyAnnotator: true
  }

  const result = await createReview(props.projectId, props.annotationId, payload)
  
  if (result) {
    emit('success', result)
    resetForm()
  }
}

/**
 * Handle close action
 */
const handleClose = () => {
  resetForm()
  emit('close')
}

/**
 * Reset form state
 */
const resetForm = () => {
  message.value = ''
  messageError.value = ''
}

/**
 * Clear error when message changes
 */
watch(message, () => {
  if (messageError.value) {
    messageError.value = ''
  }
})

/**
 * Reset form when popup becomes visible
 */
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetForm()
  }
})

/**
 * Handle ESC key to close popup
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-9999 flex items-center justify-center"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="handleClose" />

        <!-- Popup Card -->
        <div
          class="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          :style="{
            transform: `translate(0, 0)`,
            animation: 'slideUp 0.2s ease-out'
          }"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 text-primary-500" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                Quick Review
              </h3>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              :disabled="isCreating"
              @click="handleClose"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-4">
            <!-- Not Reviewable Warning -->
            <div
              v-if="!isReviewable"
              class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            >
              <div class="flex items-start gap-2">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Annotation Not Reviewable
                  </p>
                  <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    This annotation is not in a state that can be reviewed.
                  </p>
                </div>
              </div>
            </div>

            <!-- Message Textarea -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label
                  for="review-message"
                  class="block text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  Feedback Message
                  <span class="text-gray-400 font-normal">(optional for approve, required for reject)</span>
                </label>
                <span
                  class="text-xs"
                  :class="[
                    isMessageTooLong
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  ]"
                >
                  {{ messageCharCount }} / {{ MAX_MESSAGE_LENGTH }}
                </span>
              </div>

              <UTextarea
                id="review-message"
                v-model="message"
                :rows="3"
                :disabled="isCreating || !isReviewable"
                placeholder="Add your feedback here..."
                class="w-full text-sm"
                :class="{ 'border-red-500 dark:border-red-400': messageError }"
              />

              <!-- Message Error -->
              <p
                v-if="messageError"
                class="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                <UIcon name="i-heroicons-exclamation-circle" class="w-3.5 h-3.5" />
                {{ messageError }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 pt-2">
              <UButton
                color="success"
                variant="solid"
                size="md"
                class="flex-1 cursor-pointer"
                :disabled="isCreating || !isReviewable"
                :loading="isCreating"
                @click="handleApprove"
              >
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1.5" />
                Approve
              </UButton>

              <UButton
                color="error"
                variant="solid"
                size="md"
                class="flex-1 cursor-pointer"
                :disabled="isCreating || !isReviewable"
                :loading="isCreating"
                @click="handleReject"
              >
                <UIcon name="i-heroicons-x-circle" class="w-4 h-4 mr-1.5" />
                Reject
              </UButton>
            </div>

            <!-- Helper Text -->
            <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5" />
                <span>
                  <strong>Approve</strong> accepts the annotation. 
                  <strong>Reject</strong> requests changes from the annotator.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
