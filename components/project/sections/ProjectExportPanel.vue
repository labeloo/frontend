<!--
  Dataset export. It used to sit open at the top of the Completed tab, 220
  lines of form standing between an annotator and their own finished work, and
  it was rendered in full even to people who could not press the button. It is
  now its own panel, opened on request by someone who holds the permission.
-->
<template>
  <div class="space-y-7">
    <div>
      <h3 class="text-lg font-semibold tracking-[-0.02em] text-stock-950">Export dataset</h3>
      <p class="mt-1 text-[13px] leading-snug text-stock-700">
        {{ completedCount }} completed {{ completedCount === 1 ? 'task' : 'tasks' }} will be written out.
        Only the latest annotation per task is included, and duplicates are dropped.
      </p>
    </div>

    <!-- Format -->
    <fieldset>
      <legend class="furniture text-stock-600">Format</legend>
      <div class="mt-3 grid gap-px bg-stock-400 sm:grid-cols-2">
        <label
          v-for="format in formats"
          :key="format.value"
          class="flex cursor-pointer items-start gap-3 bg-stock-100 p-3 transition-colors hover:bg-stock-200"
          :class="selectedExportFormat === format.value ? 'bg-stock-200' : ''"
        >
          <input
            v-model="selectedExportFormat"
            type="radio"
            name="exportFormat"
            :value="format.value"
            class="mt-0.5"
          />
          <span>
            <span class="block text-[13px] font-medium text-stock-950">{{ format.label }}</span>
            <span class="mt-0.5 block text-xs leading-snug text-stock-700">{{ format.hint }}</span>
          </span>
        </label>
      </div>
    </fieldset>

    <!-- Split -->
    <fieldset>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <legend class="furniture text-stock-600">Split</legend>
        <div class="furniture flex items-center gap-3">
          <span :class="splitIsValid ? 'text-stock-600' : 'text-correct-500'">Total {{ totalPercentage }}%</span>
          <button v-if="!splitIsValid" type="button" class="underline underline-offset-2 hover:text-stock-950" @click="normaliseSplit">
            Make it 100
          </button>
          <button type="button" class="text-stock-600 underline underline-offset-2 hover:text-stock-950" @click="resetSplit">
            Reset 80/10/10
          </button>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-4">
        <label v-for="part in splitParts" :key="part.key" class="block">
          <span class="furniture block text-stock-600">{{ part.label }} %</span>
          <input
            type="number"
            :value="part.value"
            min="0"
            max="100"
            step="1"
            class="mt-1 w-full rounded-none border border-stock-400 bg-stock-50 px-3 py-2 text-[13px] tabular-nums text-stock-950"
            @change="setSplit(part.key, ($event.target as HTMLInputElement).value)"
          />
          <span class="furniture mt-1 block text-stock-600">
            {{ Math.round((completedCount * part.value) / 100) }} tasks
          </span>
        </label>
      </div>

      <div class="mt-3 flex h-2 border border-stock-400" role="img" :aria-label="`Train ${trainPercentage}%, test ${testPercentage}%, validation ${validationPercentage}%`">
        <div class="bg-stock-950" :style="{ width: `${trainPercentage}%` }"></div>
        <div class="bg-stock-600" :style="{ width: `${testPercentage}%` }"></div>
        <div class="bg-stock-400" :style="{ width: `${validationPercentage}%` }"></div>
      </div>
      <dl class="furniture mt-2 flex flex-wrap gap-x-6 gap-y-1 text-stock-600">
        <div class="docket-field"><dt>Train</dt><dd>{{ trainPercentage }}%</dd></div>
        <div class="docket-field"><dt>Test</dt><dd>{{ testPercentage }}%</dd></div>
        <div class="docket-field"><dt>Validation</dt><dd>{{ validationPercentage }}%</dd></div>
      </dl>

      <p v-if="!splitIsValid" class="mt-2 text-[13px] leading-snug text-correct-500">
        The three shares must add up to 100. Press “Make it 100” to put the difference into the
        largest share, or “Reset 80/10/10” to start again.
      </p>
    </fieldset>

    <!-- The one quality check before export. Its result stays on screen. -->
    <div class="border-t border-stock-400 pt-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 class="furniture text-stock-600">Check before export</h4>
          <p class="mt-1 text-[13px] text-stock-700">Find completed tasks that carry no marks.</p>
        </div>
        <button type="button" class="ink-button ink-button--outline" :disabled="checkingAnnotations" @click="checkAnnotationStatus">
          <UIcon :name="checkingAnnotations ? 'i-lucide-loader-circle' : 'i-lucide-search'" class="size-3.5" :class="checkingAnnotations ? 'animate-spin' : ''" />
          Check annotations
        </button>
      </div>

      <div v-if="checkError" class="mt-3 border border-correct-500 bg-stock-100 p-4">
        <p class="furniture text-correct-500">Check failed</p>
        <p class="mt-1 text-[13px] text-stock-700">{{ checkError }}</p>
        <button type="button" class="ink-button mt-3" @click="checkAnnotationStatus">Try again</button>
      </div>

      <div v-else-if="checkResult" class="mt-3 border border-stock-400 bg-stock-100 p-4">
        <p class="furniture" :class="checkResult.without.length ? 'text-correct-500' : 'text-stock-600'">
          {{ checkResult.without.length
            ? `${checkResult.without.length} of ${checkResult.total} completed tasks carry no marks`
            : `All ${checkResult.total} completed tasks carry marks` }}
        </p>
        <ul v-if="checkResult.without.length" class="mt-3 flex flex-wrap gap-x-3 gap-y-2">
          <li v-for="taskId in checkResult.without" :key="taskId">
            <NuxtLink
              :to="`/annotate/${taskId}`"
              class="control border border-stock-400 px-2 py-1 text-stock-700 hover:border-stock-950 hover:text-stock-950"
            >
              Sheet {{ taskId }}
            </NuxtLink>
          </li>
        </ul>
        <p v-if="checkResult.without.length" class="mt-3 text-[13px] leading-snug text-stock-700">
          Exporting now writes empty label files for these sheets. Open each one and mark it, or
          export anyway if empty frames belong in the dataset.
        </p>
      </div>
    </div>

    <!-- Export -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-stock-400 pt-5">
      <p class="furniture text-stock-600">
        <span v-if="!splitIsValid" class="text-correct-500">Split must total 100%</span>
        <span v-else-if="completedCount === 0" class="text-correct-500">Nothing completed to export</span>
        <span v-else>{{ selectedExportFormat.toUpperCase() }} · {{ completedCount }} tasks</span>
      </p>
      <button
        type="button"
        class="ink-button"
        :disabled="exportLoading || !splitIsValid || completedCount === 0"
        @click="handleExportDataset"
      >
        <UIcon :name="exportLoading ? 'i-lucide-loader-circle' : 'i-lucide-download'" class="size-3.5" :class="exportLoading ? 'animate-spin' : ''" />
        {{ exportLoading ? 'Writing dataset…' : 'Export dataset' }}
      </button>
    </div>

    <p v-if="exportStatus" class="text-[13px] leading-snug" :class="exportFailed ? 'text-correct-500' : 'text-stock-700'" role="status" aria-live="polite">
      {{ exportStatus }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
  completedCount: number
}>()

const token = useCookie('auth_token')

const formats = [
  { value: 'yolo', label: 'YOLO', hint: 'Text labels with normalised coordinates, one file per image.' },
  { value: 'coco', label: 'COCO', hint: 'One JSON file for detection and instance segmentation.' }
]

const selectedExportFormat = ref('yolo')
const exportLoading = ref(false)
const exportStatus = ref('')
const exportFailed = ref(false)

const trainPercentage = ref(80)
const testPercentage = ref(10)
const validationPercentage = ref(10)

const totalPercentage = computed(() => trainPercentage.value + testPercentage.value + validationPercentage.value)
const splitIsValid = computed(() => totalPercentage.value === 100)

const splitParts = computed(() => [
  { key: 'train' as const, label: 'Train', value: trainPercentage.value },
  { key: 'test' as const, label: 'Test', value: testPercentage.value },
  { key: 'validation' as const, label: 'Validation', value: validationPercentage.value }
])

// Whole percentages only: the old proportional rebalance produced 33.33333333
// in a number field and read as a broken tool.
const setSplit = (key: 'train' | 'test' | 'validation', raw: string) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(raw) || 0)))
  if (key === 'train') trainPercentage.value = value
  else if (key === 'test') testPercentage.value = value
  else validationPercentage.value = value
}

const resetSplit = () => {
  trainPercentage.value = 80
  testPercentage.value = 10
  validationPercentage.value = 10
}

/** Put the whole difference into the largest share, so nothing lands on a fraction. */
const normaliseSplit = () => {
  const difference = 100 - totalPercentage.value
  const largest = Math.max(trainPercentage.value, testPercentage.value, validationPercentage.value)
  if (trainPercentage.value === largest) trainPercentage.value = Math.max(0, trainPercentage.value + difference)
  else if (testPercentage.value === largest) testPercentage.value = Math.max(0, testPercentage.value + difference)
  else validationPercentage.value = Math.max(0, validationPercentage.value + difference)

  if (totalPercentage.value !== 100) resetSplit()
}

// ── Annotation check ────────────────────────────────────────────────────────
const checkingAnnotations = ref(false)
const checkError = ref('')
const checkResult = ref<{ total: number; with: number; without: number[] } | null>(null)

const checkAnnotationStatus = async () => {
  if (props.completedCount === 0) {
    checkError.value = 'There are no completed tasks to check yet.'
    return
  }

  try {
    checkingAnnotations.value = true
    checkError.value = ''

    if (!token.value) throw new Error('Your session has expired. Log in again to run this check.')

    const response = await $fetch<any>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/annotation-status/${props.projectId}`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )

    const withAnnotations = response?.data?.tasksWithAnnotations || []
    const withoutAnnotations = response?.data?.tasksWithoutAnnotations || []

    checkResult.value = {
      total: props.completedCount,
      with: withAnnotations.length,
      without: withoutAnnotations.map((id: unknown) => Number(id)).filter((id: number) => !Number.isNaN(id))
    }
  } catch (err) {
    checkResult.value = null
    checkError.value = err instanceof Error
      ? `${err.message}. Try again, or export and inspect the archive.`
      : 'The check could not be run. Try again, or export and inspect the archive.'
  } finally {
    checkingAnnotations.value = false
  }
}

// ── Export ──────────────────────────────────────────────────────────────────
const handleExportDataset = async () => {
  try {
    exportLoading.value = true
    exportFailed.value = false
    exportStatus.value = ''

    if (!token.value) throw new Error('Your session has expired. Log in again to export.')
    if (props.completedCount === 0) throw new Error('No completed tasks available for export')

    const requestBody = {
      exportFormat: selectedExportFormat.value,
      splitConfig: {
        train: trainPercentage.value,
        test: testPercentage.value,
        validation: validationPercentage.value
      },
      options: {
        onlyLatestAnnotations: true,
        deduplicateAnnotations: true,
        validateAnnotations: true,
        validateCoordinates: true,
        debugMode: true,
        ensureProperSplit: true,
        validateImageDimensions: true,
        inspectDatabase: true,
        inspectAnnotationData: true,
        inspectTaskMetadata: true,
        debugFileGeneration: true,
        verifyAnnotationCount: true,
        logEmptyTasks: true
      }
    }

    const response = await fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/export/${props.projectId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'export-format': selectedExportFormat.value
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '' }))
      throw new Error(errorData.error || `The server refused the export (HTTP ${response.status}).`)
    }

    const contentType = response.headers.get('content-type') || ''
    const isZip = contentType.includes('application/zip')
    const blob = isZip
      ? await response.blob()
      : new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' })

    if (blob.size === 0) {
      throw new Error('The archive came back empty. Run the annotation check: completed tasks with no marks produce no label files.')
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `project-${props.projectId}-${selectedExportFormat.value}-${stamp}.${isZip ? 'zip' : 'json'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const sizeKb = (blob.size / 1024).toFixed(1)
    exportStatus.value = blob.size < 2048
      ? `Downloaded ${link.download} (${sizeKb} KB). That is small for ${props.completedCount} tasks — the label files may be empty. Run the annotation check.`
      : `Downloaded ${link.download} (${sizeKb} KB), split ${trainPercentage.value}/${testPercentage.value}/${validationPercentage.value}.`
  } catch (err) {
    exportFailed.value = true
    const message = err instanceof Error ? err.message : ''
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      exportStatus.value = 'Export needs project editor or organization administrator permission. Ask your project administrator for export access.'
    } else if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      exportStatus.value = 'Your session has expired. Log in again and retry the export.'
    } else {
      exportStatus.value = message || 'The export could not be written. Try again in a moment.'
    }
  } finally {
    exportLoading.value = false
  }
}
</script>
