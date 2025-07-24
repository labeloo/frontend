<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
    <!-- Task Image/Preview -->
    <div class="relative h-48 bg-gray-100 dark:bg-gray-700">
      <img 
        v-if="task.dataType.includes('image')"
        :src="task.dataUrl" 
        :alt="`Task ${task.id}`"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div v-else class="flex items-center justify-center h-full">
        <UIcon name="i-heroicons-document" class="w-12 h-12 text-gray-400" />
        <span class="ml-2 text-gray-500 dark:text-gray-400">{{ getFileType() }}</span>
      </div>
      
      <!-- Status Badge -->
      <div class="absolute top-3 right-3">
        <span :class="statusBadgeClass">
          {{ task.status.toUpperCase() }}
        </span>
      </div>

      <!-- Priority Badge -->
      <div v-if="task.priority > 0" class="absolute top-3 left-3">
        <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-full">
          High Priority
        </span>
      </div>
    </div>

    <!-- Task Info -->
    <div class="p-4">
      <div class="flex items-start justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Task #{{ task.id }}
        </h3>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatDate(task.createdAt) }}
        </div>
      </div>

      <!-- Metadata -->
      <div v-if="parsedMetadata" class="mb-3">
        <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
          {{ parsedMetadata.originalFileName }}
        </p>
        <p v-if="parsedMetadata.extractedFrom" class="text-xs text-gray-500 dark:text-gray-500 truncate">
          From: {{ parsedMetadata.extractedFrom }}
        </p>
      </div>

      <!-- Assignment Info -->
      <div v-if="task.assignedTo" class="mb-3 flex items-center text-sm text-gray-600 dark:text-gray-400">
        <UIcon name="i-heroicons-user" class="w-4 h-4 mr-1" />
        Assigned to User #{{ task.assignedTo }}
      </div>

      <!-- Progress Bar (for annotating tasks) -->
      <div v-if="showProgress" class="mb-3">
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{{ mockProgress }}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${mockProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Completion Info -->
      <div v-if="showCompletionInfo && task.status === 'completed'" class="mb-3">
        <div class="flex items-center text-sm text-green-600 dark:text-green-400">
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
          Completed {{ formatDate(task.updatedAt) }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-4">
        <!-- View Button -->
        <UButton 
          variant="outline" 
          size="sm" 
          @click="$emit('view', task)"
          class="flex-1"
        >
          <UIcon name="i-heroicons-eye" class="w-4 h-4 mr-1" />
          View
        </UButton>

        <!-- Assign Button (for unassigned tasks) -->
        <UButton 
          v-if="showAssignButton && task.status === 'unassigned'" 
          color="primary" 
          size="sm" 
          @click="$emit('assign', task)"
          class="flex-1"
        >
          <UIcon name="i-heroicons-user-plus" class="w-4 h-4 mr-1" />
          Assign
        </UButton>

        <!-- Continue Button (for annotating tasks) -->
        <UButton 
          v-if="task.status === 'annotating'" 
          color="primary" 
          size="sm" 
          @click="$emit('continue', task)"
          class="flex-1"
        >
          <UIcon name="i-heroicons-play" class="w-4 h-4 mr-1" />
          Continue
        </UButton>

        <!-- Review Button (for completed tasks) -->        <UButton 
          v-if="showCompletionInfo && task.status === 'completed'" 
          color="success" 
          variant="outline"
          size="sm" 
          @click="$emit('review', task)"
          class="flex-1"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 mr-1" />
          Review
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Task {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: 'unassigned' | 'annotating' | 'completed'
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
}

// Props
const props = defineProps<{
  task: Task
  showAssignButton?: boolean
  showProgress?: boolean
  showCompletionInfo?: boolean
}>()

// Emits
defineEmits<{
  view: [task: Task]
  assign: [task: Task]
  continue: [task: Task]
  review: [task: Task]
}>()

// Computed properties
const statusBadgeClass = computed(() => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
  switch (props.task.status) {
    case 'unassigned':
      return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`
    case 'annotating':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300`
    case 'completed':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300`
  }
})

const parsedMetadata = computed(() => {
  try {
    return JSON.parse(props.task.metadata)
  } catch {
    return null
  }
})

const mockProgress = computed(() => {
  // Generate a mock progress based on task ID for demonstration
  // In a real app, this would come from the API
  return Math.min(Math.max((props.task.id * 17) % 100, 10), 90)
})

// Methods
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getFileType = () => {
  if (props.task.dataType.includes('image')) return 'Image'
  if (props.task.dataType.includes('video')) return 'Video'
  if (props.task.dataType.includes('audio')) return 'Audio'
  return 'File'
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
  // You could add a fallback image here
}
</script>