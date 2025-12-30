<script setup lang="ts">
import type { ReviewStatus } from '~/types/reviews'

/**
 * ReviewStatusBadge Component
 * 
 * Displays a styled badge indicating the review status with an optional icon.
 * Uses Nuxt UI components for consistent styling across the application.
 */

interface Props {
  /** The review status to display */
  status: ReviewStatus
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the status icon */
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showIcon: true
})

/**
 * Configuration for each review status
 */
const statusConfig: Record<ReviewStatus, {
  label: string
  color: 'warning' | 'success' | 'error' | 'info'
  icon: string
}> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    icon: 'i-heroicons-clock'
  },
  approved: {
    label: 'Approved',
    color: 'success',
    icon: 'i-heroicons-check'
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    icon: 'i-heroicons-x-mark'
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'info',
    icon: 'i-heroicons-pencil-square'
  }
}

/**
 * Get the current status configuration
 */
const currentConfig = computed(() => statusConfig[props.status])

/**
 * Size-based classes for the badge
 */
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }
  return sizes[props.size]
})

/**
 * Size-based classes for the icon
 */
const iconSizeClasses = computed(() => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  return sizes[props.size]
})

/**
 * Aria label for accessibility
 */
const ariaLabel = computed(() => `Review status: ${currentConfig.value.label}`)
</script>

<template>
  <UBadge
    :color="currentConfig.color"
    variant="subtle"
    :class="sizeClasses"
    :aria-label="ariaLabel"
    role="status"
  >
    <span class="inline-flex items-center gap-1.5">
      <UIcon
        v-if="showIcon"
        :name="currentConfig.icon"
        :class="iconSizeClasses"
        aria-hidden="true"
      />
      <span>{{ currentConfig.label }}</span>
    </span>
  </UBadge>
</template>
