<script setup lang="ts">
/**
 * The ink tray.
 *
 * Ordered by how the product actually works rather than by tool family:
 * assistance sits alone at the top because one click with it replaces a minute
 * of tracing, and the manual tools sit below a rule as the fallback they are.
 * Every tool shows its key, so an expert stops reading the tray within a day
 * and a newcomer never has to guess.
 */
interface Props {
  currentTool: string
  isAnnotating: boolean
  annotationCount: number
  hasSelection: boolean
  canUndo: boolean
  canRedo: boolean
  zoomLevel: number
  imageSize: string
  /** False once the segmentation service has been shown not to answer. */
  assistAvailable?: boolean
  assistReason?: string
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

const props = withDefaults(defineProps<Props>(), { zoomLevel: 100, imageSize: '', assistAvailable: true, assistReason: '' })
const emit = defineEmits<Emits>()

type Tool = { id: string; label: string; icon: string; key: string; note: string }

const assist: Tool[] = [
  {
    id: 'magic',
    label: 'Magic stick',
    icon: 'i-lucide-wand-sparkles',
    key: 'M',
    note: 'Click an object · right click removes'
  }
]

const draw: Tool[] = [
  { id: 'rectangle', label: 'Rectangle', icon: 'i-lucide-square', key: 'R', note: 'Drag a box' },
  { id: 'polygon', label: 'Polygon', icon: 'i-lucide-pentagon', key: 'P', note: 'Click points · Enter closes' },
  { id: 'circle', label: 'Circle', icon: 'i-lucide-circle', key: 'C', note: 'Drag from centre' },
  { id: 'line', label: 'Line', icon: 'i-lucide-minus', key: 'L', note: 'Drag end to end' },
  { id: 'dot', label: 'Point', icon: 'i-lucide-circle-dot', key: 'D', note: 'Click to place' },
  { id: 'freehand', label: 'Freehand', icon: 'i-lucide-pen-line', key: 'F', note: 'Draw held down' }
]

const navigate: Tool[] = [
  { id: 'select', label: 'Select', icon: 'i-lucide-mouse-pointer-2', key: 'V', note: 'Move and reshape' },
  { id: 'pan', label: 'Pan', icon: 'i-lucide-hand', key: 'H', note: 'Drag the plate' }
]

const activeNote = computed(() => {
  const all = [...assist, ...draw, ...navigate]
  return all.find((t) => t.id === props.currentTool)?.note ?? ''
})
</script>

<template>
  <div class="flex h-full w-56 flex-none flex-col border-r border-stock-400 bg-stock-100">
    <!-- Assistance first: it is the product's answer, not one option among eight. -->
    <div class="px-3 pt-3">
      <p class="furniture px-1 pb-2 text-stock-600">Assist</p>
      <button
        v-for="tool in assist"
        :key="tool.id"
        type="button"
        :disabled="!assistAvailable"
        :title="assistAvailable ? tool.note : assistReason"
        class="group flex w-full items-center gap-2.5 border px-2.5 py-2 text-left transition-colors duration-150 disabled:cursor-not-allowed"
        :class="!assistAvailable
          ? 'border-stock-400 bg-transparent text-stock-450'
          : currentTool === tool.id
            ? 'border-stock-950 bg-stock-950 text-stock-50'
            : 'border-stock-400 bg-transparent text-stock-950 hover:border-stock-950'"
        @click="emit('tool-selected', tool.id)"
      >
        <UIcon :name="tool.icon" class="size-4 flex-none" />
        <span class="flex-1 text-[13px] font-medium leading-none">{{ tool.label }}</span>
        <kbd class="furniture" :class="currentTool === tool.id && assistAvailable ? 'text-stock-300' : 'text-stock-700'">{{ tool.key }}</kbd>
      </button>

      <!-- The tool is off, so the rail says why rather than leaving a dead button. -->
      <p v-if="!assistAvailable && assistReason" class="mt-2 px-1 text-[12px] leading-snug text-stock-600">
        {{ assistReason }}
      </p>
    </div>

    <div class="px-3 pt-4">
      <p class="furniture px-1 pb-2 text-stock-600">Draw</p>
      <div class="border border-stock-400">
        <button
          v-for="(tool, index) in draw"
          :key="tool.id"
          type="button"
          class="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors duration-150"
          :class="[
            index > 0 ? 'border-t border-stock-400' : '',
            currentTool === tool.id ? 'bg-stock-950 text-stock-50' : 'text-stock-950 hover:bg-stock-200'
          ]"
          @click="emit('tool-selected', tool.id)"
        >
          <UIcon :name="tool.icon" class="size-4 flex-none" />
          <span class="flex-1 text-[13px] leading-none">{{ tool.label }}</span>
          <kbd class="furniture" :class="currentTool === tool.id ? 'text-stock-300' : 'text-stock-700'">{{ tool.key }}</kbd>
        </button>
      </div>
    </div>

    <div class="px-3 pt-4">
      <p class="furniture px-1 pb-2 text-stock-600">Navigate</p>
      <div class="border border-stock-400">
        <button
          v-for="(tool, index) in navigate"
          :key="tool.id"
          type="button"
          class="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors duration-150"
          :class="[
            index > 0 ? 'border-t border-stock-400' : '',
            currentTool === tool.id ? 'bg-stock-950 text-stock-50' : 'text-stock-950 hover:bg-stock-200'
          ]"
          @click="emit('tool-selected', tool.id)"
        >
          <UIcon :name="tool.icon" class="size-4 flex-none" />
          <span class="flex-1 text-[13px] leading-none">{{ tool.label }}</span>
          <kbd class="furniture" :class="currentTool === tool.id ? 'text-stock-300' : 'text-stock-700'">{{ tool.key }}</kbd>
        </button>
      </div>
    </div>

    <!-- What the selected tool expects, so nobody has to hover to find out. -->
    <p v-if="activeNote" class="px-4 pt-3 text-[12px] leading-snug text-stock-600">{{ activeNote }}</p>

    <div v-if="isAnnotating" class="mt-3 flex gap-2 px-3">
      <button type="button" class="ink-button flex-1 justify-center" @click="emit('complete-annotation')">Finish</button>
      <button type="button" class="ink-button ink-button--outline justify-center" @click="emit('cancel-annotation')">Esc</button>
    </div>

    <div class="flex-1" />

    <!-- Plate actions. Quieter than the tools: they act on the sheet, not on it. -->
    <div class="border-t border-stock-400 px-3 py-3">
      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-stock-700 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!canUndo" @click="emit('undo')">
          <UIcon name="i-lucide-undo-2" class="size-3.5" /> Undo
        </button>
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-stock-700 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!canRedo" @click="emit('redo')">
          <UIcon name="i-lucide-redo-2" class="size-3.5" /> Redo
        </button>
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-stock-700 hover:text-stock-950" @click="emit('fit-to-screen')">
          <UIcon name="i-lucide-scan" class="size-3.5" /> Fit
        </button>
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-stock-700 hover:text-stock-950" @click="emit('reset-zoom')">
          <UIcon name="i-lucide-search" class="size-3.5" /> 100%
        </button>
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-stock-700 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!hasSelection" @click="emit('duplicate-selected')">
          <UIcon name="i-lucide-copy" class="size-3.5" /> Copy
        </button>
        <button type="button" class="control flex items-center gap-2 py-1 text-left text-correct-500 enabled:hover:text-correct-600 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!hasSelection" @click="emit('delete-selected')">
          <UIcon name="i-lucide-trash-2" class="size-3.5" /> Delete
        </button>
      </div>

      <dl class="furniture mt-3 flex items-center justify-between border-t border-stock-400 pt-2.5 text-stock-600">
        <div class="docket-field"><dt>Zoom</dt><dd class="text-stock-950">{{ Math.round(zoomLevel) }}%</dd></div>
        <div v-if="imageSize" class="docket-field"><dt>Plate</dt><dd class="text-stock-950">{{ imageSize }}</dd></div>
      </dl>

      <div class="mt-2 flex gap-2">
        <button type="button" class="control flex-1 border border-stock-400 py-1.5 text-stock-700 enabled:hover:border-stock-950 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!annotationCount" @click="emit('export-annotations')">Export</button>
        <button type="button" class="control flex-1 border border-stock-400 py-1.5 text-correct-500 enabled:hover:border-correct-500 disabled:text-stock-450 disabled:cursor-not-allowed" :disabled="!annotationCount" @click="emit('clear-all')">Clear all</button>
      </div>
    </div>
  </div>
</template>
