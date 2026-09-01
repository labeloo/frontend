<template>
  <div>
    <div v-if="loading" class="py-16 text-center">
      <p class="furniture text-stock-600">Loading project…</p>
    </div>

    <section v-else-if="error" class="max-w-xl border border-correct-500 bg-stock-50 p-6">
      <p class="furniture text-correct-500">Project not loaded</p>
      <p class="mt-2 text-[15px] leading-snug text-stock-950">{{ error }}</p>
      <p class="mt-2 text-[13px] leading-relaxed text-stock-600">
        Nothing has been uploaded. Files are attached to a project, so this screen waits until it
        knows which one.
      </p>
      <button type="button" class="ink-button mt-5" @click="fetchProjectData">
        <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
        Try again
      </button>
    </section>

    <div v-else>
      <div class="border-b border-stock-400 pb-3">
        <h2 class="text-[22px] font-semibold tracking-tight text-stock-950">Upload data</h2>
        <p class="mt-1 max-w-2xl text-[13px] leading-relaxed text-stock-600">
          Every image becomes one task. Every video is cut into frames and every frame becomes its
          own task, carrying the video name, frame index and timestamp.
        </p>
      </div>

      <dl class="docket mt-4 flex-wrap gap-x-8 gap-y-2 border border-stock-400 px-4 py-3 furniture text-stock-600">
        <div class="docket-field min-w-0">
          <dt>Project</dt>
          <dd class="truncate">{{ projectData?.name || `#${props.projectId}` }}</dd>
        </div>
        <div class="docket-field"><dt>Type</dt><dd>{{ projectTypeName(projectData?.projectType) }}</dd></div>
        <div class="docket-field"><dt>Classes</dt><dd>{{ classCount }}</dd></div>
      </dl>

      <!-- Uploading into a project with no vocabulary makes tasks nobody can label. -->
      <p v-if="classCount === 0" class="mt-4 border border-correct-500 px-4 py-2.5 text-[13px] leading-relaxed text-stock-800">
        This project has no classes yet. Files uploaded now still become tasks, but an annotator
        opening one has nothing to apply. Define the classes in the Classes section first.
      </p>

      <!-- Drop zone -->
      <div
        class="mt-6 border border-dashed p-8 text-center transition-colors"
        :class="isDragging ? 'border-stock-950 bg-stock-50' : 'border-stock-400'"
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @click="openFilePicker"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*,video/*,.zip"
          class="sr-only"
          aria-label="Choose images, ZIP archives or videos to upload"
          :disabled="busy"
          @change="handleFileSelect"
        />
        <UIcon name="i-lucide-upload" class="mx-auto size-7 text-stock-600" />
        <p class="mt-3 text-[15px] font-medium text-stock-950">Drop files here</p>
        <p class="mt-1 text-[13px] leading-relaxed text-stock-600">
          Images (JPG, PNG, GIF, WebP) or ZIP up to 50&nbsp;MB each · Videos (MP4, AVI, MOV, MKV,
          WebM) up to 100&nbsp;MB each
        </p>
        <button type="button" class="ink-button ink-button--outline mt-4" :disabled="busy" @click.stop="openFilePicker">
          <UIcon name="i-lucide-folder-open" class="size-3.5" />
          Choose files
        </button>
      </div>

      <p class="mt-2 text-[13px] leading-relaxed text-stock-600">
        Repeats are only checked against the list below. Uploading the same folder twice makes a
        second task for every file in it.
      </p>

      <!-- Refused files, named with their reason, where the choice was made. -->
      <div v-if="rejectedFiles.length" class="mt-4 border border-correct-500 p-4" role="status" aria-live="polite">
        <div class="flex items-baseline justify-between gap-4">
          <p class="furniture text-correct-500">{{ rejectedFiles.length }} file(s) not added</p>
          <button type="button" class="control text-stock-600 hover:text-stock-950" @click="rejectedFiles = []">
            Dismiss
          </button>
        </div>
        <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto">
          <li v-for="item in rejectedFiles" :key="item.name" class="text-[13px] text-stock-800">
            <span class="truncate">{{ item.name }}</span>
            <span class="text-stock-600"> — {{ item.reason }}</span>
          </li>
        </ul>
      </div>

      <!-- Frame rate, shown only once a video is queued: it is the one setting
           that changes how many tasks a video turns into. -->
      <div v-if="selectedVideos.length" class="mt-4 border border-stock-400 p-4">
        <label for="upload-fps" class="block text-[14px] font-semibold text-stock-950">
          Frame extraction rate
        </label>
        <p class="mt-1 text-[13px] leading-relaxed text-stock-600">
          At {{ videoFps }} FPS each second of footage becomes {{ videoFps }} task{{ videoFps === 1 ? '' : 's' }}.
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UInput id="upload-fps" v-model.number="videoFps" type="number" :min="1" :max="30" class="w-24" :disabled="busy" />
          <button
            v-for="preset in fpsPresets"
            :key="preset"
            type="button"
            class="control border px-2.5 py-1.5"
            :class="videoFps === preset
              ? 'border-stock-950 bg-stock-950 text-stock-50'
              : 'border-stock-400 text-stock-600 hover:border-stock-950 hover:text-stock-950'"
            :disabled="busy"
            @click="videoFps = preset"
          >
            {{ preset }} FPS
          </button>
        </div>
        <p class="mt-3 text-[13px] text-stock-800">
          {{ selectedVideos.length }} video{{ selectedVideos.length === 1 ? '' : 's' }} →
          <span class="font-semibold">~{{ estimatedFrameTasks.toLocaleString() }} tasks</span>
          <span v-if="unmeasuredVideos"> plus {{ unmeasuredVideos }} of unread length</span>
        </p>
      </div>

      <!-- Selection -->
      <div v-if="selectedFiles.length" class="mt-6">
        <div class="flex items-baseline justify-between gap-4 border-b border-stock-400 pb-2">
          <h3 class="furniture text-stock-600">Selected · {{ selectedFiles.length }}</h3>
          <button type="button" class="control text-stock-600 hover:text-correct-500" :disabled="busy" @click="clearFiles">
            Remove all
          </button>
        </div>
        <ul class="max-h-72 divide-y divide-stock-400 overflow-y-auto">
          <li v-for="(file, index) in selectedFiles" :key="fileKey(file)" class="flex items-center gap-3 py-2">
            <UIcon :name="fileIcon(file)" class="size-4 flex-none text-stock-600" />
            <span class="min-w-0 flex-1 truncate text-[13px] text-stock-950">{{ file.name }}</span>
            <span class="furniture flex-none text-stock-600">{{ fileFact(file) }}</span>
            <button
              type="button"
              class="control flex-none px-2 py-1 text-stock-600 hover:text-correct-500"
              :disabled="busy"
              :aria-label="`Remove ${file.name}`"
              @click="removeFile(index)"
            >
              Remove
            </button>
          </li>
        </ul>
      </div>

      <!-- A large extraction is decided before the upload, not discovered after it. -->
      <label v-if="needsExtractionConfirm" class="mt-4 flex items-start gap-3 border border-correct-500 p-4">
        <input v-model="extractionConfirmed" type="checkbox" class="mt-0.5 size-4 flex-none accent-reflex-600" :disabled="busy" />
        <span class="text-[13px] leading-relaxed text-stock-800">
          This makes about {{ estimatedFrameTasks.toLocaleString() }} tasks from
          {{ selectedVideos.length }} video{{ selectedVideos.length === 1 ? '' : 's' }}. There is no bulk
          delete for tasks, so the way back is to delete the project. Lower the frame rate, or confirm
          this is what you want.
        </span>
      </label>

      <!-- Real bytes while sending; an honest wait while the server works. -->
      <div v-if="busy" class="mt-6 border border-stock-400 p-4" role="status" aria-live="polite">
        <div class="flex items-baseline justify-between gap-4">
          <p class="furniture text-stock-600">{{ progressLabel }}</p>
          <p v-if="uploadState === 'sending'" class="furniture text-stock-600">{{ uploadPercent }}%</p>
        </div>
        <div v-if="uploadState === 'sending'" class="mt-3 h-1.5 w-full bg-stock-300">
          <div class="h-1.5 bg-stock-950 transition-[width] duration-200" :style="{ width: `${uploadPercent}%` }" />
        </div>
        <p class="mt-2 text-[13px] leading-relaxed text-stock-800">{{ progressDetail }}</p>
      </div>

      <div v-if="selectedFiles.length && !busy" class="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" class="ink-button" :disabled="!canUpload" @click="uploadFiles">
          <UIcon name="i-lucide-upload" class="size-3.5" />
          Upload {{ selectedFiles.length }} file{{ selectedFiles.length === 1 ? '' : 's' }}
        </button>
        <p v-if="needsExtractionConfirm && !extractionConfirmed" class="furniture text-correct-500">
          Confirm the frame count first
        </p>
      </div>

      <!-- The result stays on screen until the next upload replaces it. -->
      <div
        v-if="result"
        class="mt-6 border p-4"
        :class="result.kind === 'error' ? 'border-correct-500' : 'border-stock-950'"
        role="status"
        aria-live="polite"
      >
        <p class="furniture" :class="result.kind === 'error' ? 'text-correct-500' : 'text-stock-600'">
          {{ result.kind === 'error' ? 'Upload failed' : 'Upload complete' }}
        </p>
        <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">{{ result.text }}</p>
        <ul v-if="result.skipped.length" class="mt-2 space-y-1">
          <li v-for="name in result.skipped" :key="name" class="text-[13px] text-stock-600">
            {{ name }} — skipped by the server
          </li>
        </ul>
        <button v-if="result.kind === 'error' && selectedFiles.length" type="button" class="ink-button mt-3" @click="uploadFiles">
          <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
          Try again
        </button>
      </div>

      <!-- Empty selection: say what this screen is for and what to do next. -->
      <div v-if="!selectedFiles.length && !busy" class="mt-6 border border-dashed border-stock-400 p-6">
        <p class="text-[14px] font-semibold text-stock-950">Nothing selected</p>
        <p class="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-stock-600">
          A project has no work in it until data is uploaded: no tasks to assign, nothing for an
          annotator to open. Drop images, a ZIP of images, or video above — the count of tasks each
          choice makes is shown before anything is sent.
        </p>
      </div>

      <!-- What this session sent, so a finished upload leaves a record. -->
      <div v-if="recentUploads.length" class="mt-10 border-t border-stock-400 pt-4">
        <h3 class="furniture text-stock-600">Uploaded in this session</h3>
        <ul class="mt-3 divide-y divide-stock-400">
          <li v-for="upload in recentUploads.slice(0, 10)" :key="upload.id" class="flex items-center gap-3 py-2">
            <UIcon name="i-lucide-check" class="size-4 flex-none text-stock-600" />
            <span class="min-w-0 flex-1 truncate text-[13px] text-stock-950">{{ upload.name }}</span>
            <span class="furniture flex-none text-stock-600">{{ formatUploadTime(upload.uploadedAt) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projectTypeName } from '~/components/project/sections/projectTypes'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

interface ProjectData {
  id: number
  name: string
  description?: string
  projectType: number
  labelConfig?: {
    classes: string[]
  }
  organizationId: number
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectData
    project_relations: any
  }
}

interface UploadedFile {
  id: string
  name: string
  uploadedAt: number
}

const token = useCookie('auth_token')

const loading = ref(true)
const error = ref<string | null>(null)
const projectData = ref<ProjectData | null>(null)
const selectedFiles = ref<File[]>([])
const rejectedFiles = ref<{ name: string, reason: string }[]>([])
const isDragging = ref(false)
const recentUploads = ref<UploadedFile[]>([])
const fileInput = ref<HTMLInputElement>()

const uploadState = ref<'idle' | 'sending' | 'processing'>('idle')
const uploadPercent = ref(0)
const progressLabel = ref('')
const progressDetail = ref('')
const result = ref<{ kind: 'done' | 'error', text: string, skipped: string[] } | null>(null)

/** Container formats the backend can extract frames from. */
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
const fpsPresets = [1, 5, 10, 15, 30]
const TASK_WARNING_THRESHOLD = 500

const videoFps = ref(5)
const videoDurations = ref<Record<string, number>>({})
const extractionConfirmed = ref(false)

const busy = computed(() => uploadState.value !== 'idle')

const fileKey = (file: File) => `${file.name}:${file.size}`

const isVideoFile = (file: File) =>
  file.type.startsWith('video/') ||
  VIDEO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))

const isZipFile = (file: File) =>
  file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')

const selectedVideos = computed(() => selectedFiles.value.filter(isVideoFile))
const selectedNonVideos = computed(() => selectedFiles.value.filter(file => !isVideoFile(file)))

const classCount = computed(() => projectData.value?.labelConfig?.classes?.length || 0)

/** A video's length decides how many tasks it becomes, so it is read from the
 *  file before the upload rather than reported once the work is done. */
const measureVideo = (file: File) => {
  const key = fileKey(file)
  if (videoDurations.value[key] !== undefined) return

  const url = URL.createObjectURL(file)
  const probe = document.createElement('video')
  probe.preload = 'metadata'
  probe.onloadedmetadata = () => {
    videoDurations.value[key] = Number.isFinite(probe.duration) ? probe.duration : 0
    URL.revokeObjectURL(url)
  }
  probe.onerror = () => {
    videoDurations.value[key] = 0
    URL.revokeObjectURL(url)
  }
  probe.src = url
}

const videoDuration = (file: File) => videoDurations.value[fileKey(file)] || 0

const formatDuration = (seconds: number) => {
  const whole = Math.round(seconds)
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

const videoTaskEstimate = (file: File) => {
  const duration = videoDuration(file)
  if (!duration || !videoFps.value) return 0
  return Math.max(1, Math.round(duration * videoFps.value))
}

const estimatedFrameTasks = computed(() =>
  selectedVideos.value.reduce((total, file) => total + videoTaskEstimate(file), 0)
)

const unmeasuredVideos = computed(() =>
  selectedVideos.value.filter(file => !videoDuration(file)).length
)

const needsExtractionConfirm = computed(() => estimatedFrameTasks.value > TASK_WARNING_THRESHOLD)

watch(needsExtractionConfirm, needed => {
  if (!needed) extractionConfirmed.value = false
})

const canUpload = computed(() =>
  selectedFiles.value.length > 0 &&
  !busy.value &&
  (!needsExtractionConfirm.value || extractionConfirmed.value)
)

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 bytes'
  const units = ['bytes', 'KB', 'MB', 'GB']
  const step = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, step)).toFixed(1))} ${units[step]}`
}

const fileFact = (file: File) => {
  if (!isVideoFile(file)) return formatFileSize(file.size)
  const duration = videoDuration(file)
  if (!duration) return `${formatFileSize(file.size)} · reading length`
  return `${formatDuration(duration)} · ~${videoTaskEstimate(file).toLocaleString()} tasks`
}

const fileIcon = (file: File) => {
  if (isVideoFile(file)) return 'i-lucide-film'
  if (isZipFile(file)) return 'i-lucide-file-archive'
  if (file.type.startsWith('image/')) return 'i-lucide-file-image'
  return 'i-lucide-file'
}

const fetchProjectData = async () => {
  try {
    loading.value = true
    error.value = null

    if (!token.value) {
      throw new Error('You are signed out, so the project could not be read.')
    }

    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.data?.projects) {
      throw new Error(`No project ${props.projectId} is open to you.`)
    }

    projectData.value = response.data.projects
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The project could not be loaded.'
  } finally {
    loading.value = false
  }
}

const openFilePicker = () => {
  if (busy.value) return
  fileInput.value?.click()
}

const addFiles = (files: File[]) => {
  const rejected: { name: string, reason: string }[] = []

  files.forEach(file => {
    const video = isVideoFile(file)
    const usable = video || isZipFile(file) || file.type.startsWith('image/')
    // Videos get a larger budget than stills - they are the source of many frames.
    const maxSize = (video ? 100 : 50) * 1024 * 1024

    if (!usable) {
      rejected.push({ name: file.name, reason: 'not an image, ZIP or video' })
    } else if (file.size > maxSize) {
      rejected.push({ name: file.name, reason: `${formatFileSize(file.size)}, over the ${video ? 100 : 50} MB limit` })
    } else if (selectedFiles.value.some(existing => fileKey(existing) === fileKey(file))) {
      rejected.push({ name: file.name, reason: 'already in this list' })
    } else {
      selectedFiles.value.push(file)
      if (video) measureVideo(file)
    }
  })

  rejectedFiles.value = rejected

  if (fileInput.value) fileInput.value.value = ''
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files))
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) addFiles(Array.from(target.files))
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const clearFiles = () => {
  selectedFiles.value = []
  rejectedFiles.value = []
}

/** fetch cannot report upload progress, so the byte transfer runs on XHR. */
const postWithProgress = (url: string, headers: Record<string, string>, body: FormData, onProgress: (percent: number) => void) =>
  new Promise<any>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    Object.entries(headers).forEach(([key, value]) => request.setRequestHeader(key, value))

    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(request.responseText ? JSON.parse(request.responseText) : {})
        } catch {
          resolve({})
        }
      } else {
        reject(new Error(`The server refused the upload (${request.status} ${request.statusText || ''}).`.trim()))
      }
    }
    request.onerror = () => reject(new Error('The connection dropped before the upload finished.'))
    request.onabort = () => reject(new Error('The upload was stopped.'))
    request.send(body)
  })

const uploadFiles = async () => {
  if (!canUpload.value) return

  const apiBase = import.meta.env.NUXT_PUBLIC_API_URL
  const authHeaders = {
    'Authorization': `Bearer ${token.value}`,
    'projectId': props.projectId
  }

  const stills = [...selectedNonVideos.value]
  const videos = [...selectedVideos.value]
  const sent: File[] = []
  const summary: string[] = []
  const skipped: string[] = []

  result.value = null
  uploadPercent.value = 0

  const track = (label: string, processingText: string) => (percent: number) => {
    uploadPercent.value = percent
    progressLabel.value = label
    if (percent >= 100) {
      uploadState.value = 'processing'
      progressDetail.value = processingText
    }
  }

  try {
    if (stills.length) {
      uploadState.value = 'sending'
      progressLabel.value = `Sending ${stills.length} image file(s)`
      progressDetail.value = 'The transfer can be stopped by closing this page; nothing is created until it finishes.'

      const body = new FormData()
      stills.forEach(file => body.append('files', file))

      const response = await postWithProgress(
        `${apiBase}/api/bucket/uploadData`,
        authHeaders,
        body,
        track(
          `Sending ${stills.length} image file(s)`,
          'Sent. The server is unpacking the files and making one task per image — this part reports no percentage.'
        )
      )

      sent.push(...stills)
      const tasks = Number(response?.createdTasks) || 0
      summary.push(`${stills.length} file(s) uploaded · ${tasks.toLocaleString()} task(s) created`)
      ;(response?.uploadedFiles || [])
        .filter((entry: any) => entry?.type === 'skipped')
        .forEach((entry: any) => skipped.push(entry.originalFileName || entry.fileName || 'unnamed file'))
    }

    if (videos.length) {
      uploadState.value = 'sending'
      uploadPercent.value = 0
      progressLabel.value = `Sending ${videos.length} video(s)`
      progressDetail.value = 'The transfer can be stopped by closing this page; nothing is created until it finishes.'

      const body = new FormData()
      videos.forEach(file => body.append('files', file))

      const response = await postWithProgress(
        `${apiBase}/api/bucket/uploadDataVideo`,
        { ...authHeaders, 'fps': String(videoFps.value) },
        body,
        track(
          `Sending ${videos.length} video(s)`,
          'Sent. The server is cutting the footage into frames — this can take several minutes and reports no percentage.'
        )
      )

      sent.push(...videos)
      const tasks = Number(response?.createdTasks) || 0
      summary.push(`${videos.length} video(s) cut at ${videoFps.value} FPS · ${tasks.toLocaleString()} task(s) created`)
    }

    recentUploads.value.unshift(...sent.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      uploadedAt: Date.now()
    })))

    // Only what actually reached the server leaves the list.
    const sentKeys = new Set(sent.map(fileKey))
    selectedFiles.value = selectedFiles.value.filter(file => !sentKeys.has(fileKey(file)))
    extractionConfirmed.value = false

    result.value = {
      kind: 'done',
      text: `${summary.join(' · ')}. The new tasks are in the task pool, unassigned.`,
      skipped
    }
  } catch (err) {
    // Whatever did not reach the server stays selected, so a retry is one press.
    const sentKeys = new Set(sent.map(fileKey))
    selectedFiles.value = selectedFiles.value.filter(file => !sentKeys.has(fileKey(file)))

    result.value = {
      kind: 'error',
      text: `${err instanceof Error ? err.message : 'The upload failed.'}${summary.length ? ` What did go through: ${summary.join(' · ')}.` : ''} The files that did not go through are still selected below — press Try again, or remove them and pick others.`,
      skipped
    }
  } finally {
    uploadState.value = 'idle'
    uploadPercent.value = 0
    progressLabel.value = ''
    progressDetail.value = ''
  }
}

const formatUploadTime = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

onMounted(() => {
  fetchProjectData()
})
</script>
