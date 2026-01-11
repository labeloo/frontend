<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      <!-- Tool Selection -->
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tools:</span>
        <div class="flex items-center space-x-1">
          <UButton
            v-for="tool in tools"
            :key="tool.id"
            @click="selectTool(tool.id)"
            :variant="currentTool === tool.id ? 'solid' : 'outline'"
            :color="currentTool === tool.id ? 'primary' : 'neutral'"
            size="sm"
            :icon="tool.icon"
            :title="tool.tooltip"
          >
            {{ tool.label }}
          </UButton>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Drawing Controls -->
      <div v-if="isAnnotating" class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Drawing:</span>
        <UButton
          @click="completeAnnotation"
          color="success"
          size="sm"
          icon="i-heroicons-check"
        >
          Complete
        </UButton>
        <UButton
          @click="cancelAnnotation"
          color="error"
          variant="outline"
          size="sm"
          icon="i-heroicons-x-mark"
        >
          Cancel
        </UButton>
      </div>

      <!-- Polygon specific controls -->
      <div v-if="currentTool === 'polygon' && isAnnotating" class="flex items-center space-x-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Click to add points • Double-click or click first point to close
        </span>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- View Controls -->
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
        <UButton
          @click="zoomIn"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-magnifying-glass-plus"
          title="Zoom In"
        />
        <UButton
          @click="zoomOut"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-magnifying-glass-minus"
          title="Zoom Out"
        />
        <UButton
          @click="resetZoom"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-arrow-path"
          title="Reset Zoom"
        />
        <UButton
          @click="fitToScreen"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-squares-2x2"
          title="Fit to Screen"
        />
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Edit Controls -->
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Edit:</span>
        <UButton
          @click="undo"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-arrow-uturn-left"
          title="Undo (Ctrl+Z)"
          :disabled="!canUndo"
        />
        <UButton
          @click="redo"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-arrow-uturn-right"
          title="Redo (Ctrl+Y)"
          :disabled="!canRedo"
        />
        <UButton
          @click="deleteSelected"
          variant="outline"
          color="error"
          size="sm"
          icon="i-heroicons-trash"
          title="Delete Selected (Delete)"
          :disabled="!hasSelection"
        />
        <UButton
          @click="duplicateSelected"
          variant="outline"
          color="secondary"
          size="sm"
          icon="i-heroicons-document-duplicate"
          title="Duplicate Selected (Ctrl+D)"
          :disabled="!hasSelection"
        />
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Quick Actions -->
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Quick:</span>
        <UButton
          @click="clearAll"
          variant="outline"
          color="error"
          size="sm"
          icon="i-heroicons-trash"
          title="Clear All Annotations"
        >
          Clear All
        </UButton>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-center space-x-4">
        <span>Annotations: {{ annotationCount }}</span>
        <span v-if="hasSelection">Selected: 1</span>
        <span v-if="currentTool !== 'select'">Tool: {{ currentToolLabel }}</span>
      </div>
      <div class="flex items-center space-x-4">
        <span v-if="zoomLevel !== 100">Zoom: {{ zoomLevel }}%</span>
        <span>{{ imageSize }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tool {
  id: string
  label: string
  icon: string
  tooltip: string
}

interface Props {
  currentTool: string
  isAnnotating: boolean
  annotationCount: number
  hasSelection: boolean
  canUndo: boolean
  canRedo: boolean
  zoomLevel: number
  imageSize: string
}

interface Emits {
  (e: 'tool-selected', tool: string): void
  (e: 'complete-annotation'): void
  (e: 'cancel-annotation'): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'reset-zoom'): void
  (e: 'fit-to-screen'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'delete-selected'): void
  (e: 'duplicate-selected'): void
  (e: 'clear-all'): void
  (e: 'export-annotations'): void
}

const props = withDefaults(defineProps<Props>(), {
  zoomLevel: 100,
  imageSize: ''
})

const emit = defineEmits<Emits>()

const tools: Tool[] = [
  {
    id: 'select',
    label: 'Select',
    icon: 'i-heroicons-cursor-arrow-rays',
    tooltip: 'Select and move annotations (V)'
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: 'i-heroicons-rectangle-stack',
    tooltip: 'Draw rectangle annotations (R)'
  },
  {
    id: 'polygon',
    label: 'Polygon',
    icon: 'i-heroicons-star',
    tooltip: 'Draw polygon annotations (P)'
  },
  {
    id: 'dot',
    label: 'Point',
    icon: 'i-heroicons-map-pin',
    tooltip: 'Add point annotations (D)'
  },
  {
    id: 'line',
    label: 'Line',
    icon: 'i-heroicons-minus',
    tooltip: 'Draw line annotations (L)'
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: 'i-heroicons-ellipsis-horizontal-circle',
    tooltip: 'Draw circle annotations (C)'
  },
  {
    id: 'magic',
    label: 'Magic Stick',
    icon: 'i-heroicons-sparkles',
    tooltip: 'Magic Stick (M)'
  },
  {
    id: 'freehand',
    label: 'Freehand',
    icon: 'i-heroicons-pencil',
    tooltip: 'Draw freehand annotations (F)'
  }
]

const currentToolLabel = computed(() => {
  const tool = tools.find(t => t.id === props.currentTool)
  return tool?.label || props.currentTool
})

const selectTool = (tool: string) => {
  emit('tool-selected', tool)
}

const completeAnnotation = () => {
  emit('complete-annotation')
}

const cancelAnnotation = () => {
  emit('cancel-annotation')
}

const zoomIn = () => {
  emit('zoom-in')
}

const zoomOut = () => {
  emit('zoom-out')
}

const resetZoom = () => {
  emit('reset-zoom')
}

const fitToScreen = () => {
  emit('fit-to-screen')
}

const undo = () => {
  emit('undo')
}

const redo = () => {
  emit('redo')
}

const deleteSelected = () => {
  emit('delete-selected')
}

const duplicateSelected = () => {
  emit('duplicate-selected')
}

const clearAll = () => {
  emit('clear-all')
}

const exportAnnotations = () => {
  emit('export-annotations')
}

// Note: Keyboard shortcuts are now handled by the useShortcuts composable
// in the parent canvas page for customization support
</script>
