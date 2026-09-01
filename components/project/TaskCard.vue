<!--
  One card for the whole pool. The three tabs differ only in which action sits
  in the action slot; the identity block, the selection behaviour and the key
  path are the same everywhere, so muscle memory carries across tabs.
-->
<template>
  <div
    :class="[
      'group flex flex-col border bg-stock-100 transition-colors',
      selectable ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-reflex-600' : '',
      selected ? 'border-stock-950 bg-stock-200' : 'border-stock-400 hover:border-stock-600'
    ]"
    :role="selectable ? 'checkbox' : undefined"
    :tabindex="selectable ? 0 : undefined"
    :aria-checked="selectable ? selected : undefined"
    :aria-label="selectable ? `${name} — select` : undefined"
    @click="selectable && emit('toggle', task.id)"
    @keydown.space.prevent="selectable && emit('toggle', task.id)"
    @keydown.enter.prevent="selectable && emit('toggle', task.id)"
  >
    <!-- Preview -->
    <div class="relative h-32 border-b border-stock-400 bg-stock-200">
      <img
        v-if="isImage && !previewFailed"
        :src="imageUrl"
        :alt="name"
        class="h-full w-full object-cover"
        loading="lazy"
        @error="previewFailed = true"
      />
      <div v-else class="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
        <UIcon :name="previewFailed ? 'i-lucide-image-off' : 'i-lucide-file'" class="size-5 text-stock-600" />
        <span class="furniture text-stock-600">{{ previewFailed ? 'Preview unavailable' : kindLabel }}</span>
      </div>

      <span
        v-if="selected"
        class="absolute right-0 top-0 flex items-center gap-1 bg-stock-950 px-1.5 py-1 text-stock-50"
      >
        <UIcon name="i-lucide-check" class="size-3" />
        <span class="furniture">Selected</span>
      </span>
    </div>

    <!-- Identity -->
    <div class="flex flex-1 flex-col gap-2 p-3">
      <p class="truncate text-[13px] font-medium leading-snug text-stock-950" :title="name">
        {{ name }}
      </p>

      <dl class="furniture flex flex-wrap gap-x-4 gap-y-1 text-stock-600">
        <div class="docket-field"><dt>Sheet</dt><dd>{{ task.id }}</dd></div>
        <div v-if="detail" class="docket-field"><dt>At</dt><dd>{{ detail }}</dd></div>
        <div class="docket-field">
          <dt>With</dt>
          <dd class="max-w-[9rem] truncate normal-case tracking-normal" :title="assigneeLabel">{{ assigneeLabel }}</dd>
        </div>
        <div v-if="showUpdated" class="docket-field">
          <dt>{{ task.status === 'completed' ? 'Done' : 'Changed' }}</dt>
          <dd class="normal-case tracking-normal">{{ updatedLabel }}</dd>
        </div>
      </dl>

      <div v-if="$slots.action" class="mt-auto pt-1" @click.stop>
        <slot name="action" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useImageUrl } from '~/composables/useImageUrl'
import { formatTaskDate, taskDetail, taskName, type TaskLike } from './taskFacts'

const props = withDefaults(defineProps<{
  task: TaskLike
  selectable?: boolean
  selected?: boolean
  /** Address of the person holding this task; empty means nobody. */
  assignee?: string
}>(), {
  selectable: false,
  selected: false,
  assignee: ''
})

const emit = defineEmits<{
  toggle: [taskId: number]
}>()

const { getTaskImageUrl } = useImageUrl()

const previewFailed = ref(false)
watch(() => props.task.dataUrl, () => { previewFailed.value = false })

const isImage = computed(() => (props.task.dataType || '').includes('image'))
const imageUrl = computed(() => getTaskImageUrl(props.task))
const name = computed(() => taskName(props.task))
const detail = computed(() => taskDetail(props.task))

const kindLabel = computed(() => {
  const type = props.task.dataType || ''
  if (type.includes('video')) return 'Video'
  if (type.includes('audio')) return 'Audio'
  return 'File'
})

const assigneeLabel = computed(() => props.assignee || 'Nobody')

const showUpdated = computed(() => props.task.status !== 'unassigned' && !!props.task.updatedAt)
const updatedLabel = computed(() => formatTaskDate(props.task.updatedAt))
</script>
