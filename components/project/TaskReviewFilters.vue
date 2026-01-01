<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Filter Dropdown -->
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Filter:
      </label>
      <USelectMenu
        v-model="selectedFilter"
        :items="filterOptionsForSelect"
        placeholder="All Tasks"
        class="w-48"
        value-key="value"
      />
    </div>

    <!-- Sort Dropdown -->
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Sort:
      </label>
      <USelectMenu
        v-model="selectedSort"
        :items="sortOptionsForSelect"
        placeholder="Newest First"
        class="w-44"
        value-key="value"
      />
    </div>

    <!-- Reset Button -->
    <UButton
      v-if="hasActiveFilters"
      variant="ghost"
      size="sm"
      color="neutral"
      @click="handleReset"
    >
      <UIcon name="i-heroicons-x-mark" class="w-4 h-4 mr-1" />
      Reset
    </UButton>

    <!-- Quick Filters (optional) -->
    <div v-if="showQuickFilters" class="flex items-center gap-1 ml-auto">
      <UButton
        v-if="myReviewCount > 0"
        :variant="selectedFilter === 'needs_my_review' ? 'solid' : 'outline'"
        :color="selectedFilter === 'needs_my_review' ? 'warning' : 'neutral'"
        size="xs"
        @click="selectedFilter = 'needs_my_review'"
      >
        <UIcon name="i-heroicons-clipboard-document-check" class="w-3 h-3 mr-1" />
        My Reviews
        <UBadge 
          size="xs" 
          :color="selectedFilter === 'needs_my_review' ? 'warning' : 'neutral'"
          class="ml-1"
        >
          {{ myReviewCount }}
        </UBadge>
      </UButton>

      <UButton
        v-if="changesNeededCount > 0"
        :variant="selectedFilter === 'changes_needed' ? 'solid' : 'outline'"
        :color="selectedFilter === 'changes_needed' ? 'error' : 'neutral'"
        size="xs"
        @click="selectedFilter = 'changes_needed'"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 mr-1" />
        Needs Fix
        <UBadge 
          size="xs" 
          :color="selectedFilter === 'changes_needed' ? 'error' : 'neutral'"
          class="ml-1"
        >
          {{ changesNeededCount }}
        </UBadge>
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 
  TaskFilterOption, 
  TaskSortOption, 
  FilterOptionItem, 
  SortOptionItem 
} from '~/composables/useTaskReviewFilters'

interface Props {
  /** Filter options with optional counts */
  filterOptions: Array<FilterOptionItem & { count?: number }>
  /** Sort options */
  sortOptions: SortOptionItem[]
  /** Currently selected filter */
  modelFilter: TaskFilterOption
  /** Currently selected sort */
  modelSort: TaskSortOption
  /** Whether to show counts in dropdowns */
  showCounts?: boolean
  /** Whether to show quick filter buttons */
  showQuickFilters?: boolean
  /** Whether any filters are active */
  hasActiveFilters?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCounts: true,
  showQuickFilters: true,
  hasActiveFilters: false
})

const emit = defineEmits<{
  'update:modelFilter': [value: TaskFilterOption]
  'update:modelSort': [value: TaskSortOption]
  reset: []
}>()

// Two-way binding for filter
const selectedFilter = computed({
  get: () => props.modelFilter,
  set: (value) => emit('update:modelFilter', value)
})

// Two-way binding for sort
const selectedSort = computed({
  get: () => props.modelSort,
  set: (value) => emit('update:modelSort', value)
})

// Format options for USelectMenu
const filterOptionsForSelect = computed(() => 
  props.filterOptions.map(option => ({
    ...option,
    label: option.label,
    value: option.value
  }))
)

const sortOptionsForSelect = computed(() => 
  props.sortOptions.map(option => ({
    ...option,
    label: option.label,
    value: option.value
  }))
)

// Quick filter counts
const myReviewCount = computed(() => 
  props.filterOptions.find(o => o.value === 'needs_my_review')?.count ?? 0
)

const changesNeededCount = computed(() => 
  props.filterOptions.find(o => o.value === 'changes_needed')?.count ?? 0
)

// Handle reset
function handleReset(): void {
  emit('reset')
}
</script>
