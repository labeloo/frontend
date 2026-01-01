<script setup lang="ts">
/**
 * AnnotationSubmitConfirmModal Component
 * 
 * A confirmation modal shown before submitting an annotation for review.
 * Provides context about the review workflow and allows the user to confirm or cancel.
 */

interface Props {
  /** Whether the modal is open */
  isOpen: boolean
  /** Whether the annotation requires review */
  requiresReview: boolean
  /** Email of the assigned reviewer (if known) */
  assignedReviewerEmail?: string
  /** Whether submission is in progress */
  isSubmitting?: boolean
}

interface Emits {
  /** Emitted when user confirms submission */
  (e: 'confirm'): void
  /** Emitted when user cancels */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  assignedReviewerEmail: undefined,
  isSubmitting: false
})

const emit = defineEmits<Emits>()

/**
 * Get the modal configuration based on workflow
 */
const modalConfig = computed(() => {
  if (!props.requiresReview) {
    return {
      title: 'Complete Annotation',
      description: 'Your annotation will be saved and automatically approved.',
      icon: 'i-heroicons-check-badge',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      confirmText: 'Complete',
      confirmColor: 'success' as const
    }
  }

  if (props.assignedReviewerEmail) {
    return {
      title: 'Submit for Review',
      description: `Your annotation will be submitted and assigned to ${props.assignedReviewerEmail} for review.`,
      icon: 'i-heroicons-user-circle',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      confirmText: 'Submit for Review',
      confirmColor: 'primary' as const
    }
  }

  return {
    title: 'Submit for Review',
    description: 'Your annotation will be submitted for review. You\'ll be notified when a reviewer has evaluated your work.',
    icon: 'i-heroicons-eye',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    confirmText: 'Submit for Review',
    confirmColor: 'primary' as const
  }
})
</script>

<template>
  <UModal
    :open="isOpen"
    @close="emit('cancel')"
  >
    <template #content>
      <div class="p-6">
        <!-- Icon -->
        <div class="flex justify-center mb-4">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center"
            :class="modalConfig.iconBg"
          >
            <UIcon
              :name="modalConfig.icon"
              class="w-8 h-8"
              :class="modalConfig.iconColor"
              aria-hidden="true"
            />
          </div>
        </div>

        <!-- Title -->
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          {{ modalConfig.title }}
        </h2>

        <!-- Description -->
        <p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {{ modalConfig.description }}
        </p>

        <!-- Info Box for Review Required -->
        <div
          v-if="requiresReview"
          class="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-information-circle"
              class="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">What happens next?</p>
              <ul class="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Your annotation will be sent to a reviewer</li>
                <li>You'll receive a notification with the review result</li>
                <li>If changes are requested, you can make edits and resubmit</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-center gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="isSubmitting"
            @click="emit('cancel')"
          >
            Cancel
          </UButton>

          <UButton
            :color="modalConfig.confirmColor"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="emit('confirm')"
          >
            <UIcon
              v-if="!isSubmitting"
              :name="requiresReview ? 'i-heroicons-paper-airplane' : 'i-heroicons-check'"
              class="w-4 h-4 mr-1.5"
              aria-hidden="true"
            />
            {{ modalConfig.confirmText }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
