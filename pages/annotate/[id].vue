<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Side Menu -->
    <div class="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Task Annotation
          </h1>
          <UButton @click="navigateBack" color="secondary" variant="ghost" size="sm" icon="i-heroicons-arrow-left">
            Back
          </UButton>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Task ID: {{ taskId }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-6">
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-center">
            <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <p class="text-red-800 dark:text-red-300 text-sm">{{ error }}</p>
          </div>
        </div>
      </div> <!-- Content -->
      <div v-else class="space-y-6 p-6">
        <!-- Project Details Section -->
        <div v-if="projectData">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <UIcon name="i-heroicons-folder" class="w-5 h-5 mr-2" />
            Project Details
          </h2>

          <div class="space-y-3">
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Project
                    Name</label>
                  <p class="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-200">{{ projectData.name }}</p>
                </div>

                <div v-if="projectData.description">
                  <label
                    class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Description</label>
                  <p class="mt-1 text-sm text-blue-800 dark:text-blue-300">{{ projectData.description }}</p>
                </div>

                <div>
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Project
                    Type</label>
                  <p class="mt-1">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {{ getProjectTypeName(projectData.projectType) }}
                    </span>
                  </p>
                </div>

                <div v-if="projectData.labelConfig?.classes?.length">
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Classes
                    ({{ projectData.labelConfig.classes.length }})</label>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <span v-for="(className, index) in projectData.labelConfig.classes" :key="index" :class="[
                      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                      lastSelectedClass === className
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-500'
                        : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
                    ]">
                      <span v-if="index < 9"
                        class="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-1 font-medium">
                        {{ index + 1 }}
                      </span>
                      <span class="flex-1">{{ className }}</span>
                      <UIcon v-if="lastSelectedClass === className" name="i-heroicons-star-solid"
                        class="w-3 h-3 text-yellow-500 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Attributes Section -->
        <div v-if="taskData">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 mr-2" />
            Attributes
          </h2>

          <div class="space-y-3">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="space-y-3">

                <div>
                  <label
                    class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
                  <p class="mt-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusColor(taskData.status)">
                      {{ taskData.status }}
                    </span>
                  </p>
                </div>

                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data
                    Type</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parseDataType(taskData.dataType) }}</p>
                </div>

                <div>
                  <label
                    class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ taskData.priority }}</p>
                </div>

                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created
                    At</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(taskData.createdAt) }}</p>
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Updated
                    At</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(taskData.updatedAt) }}</p>
                </div>

              </div>
            </div>

            <!-- Metadata Section -->
            <div v-if="parsedMetadata" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Metadata</h3>
              <div class="space-y-2">
                <div v-if="parsedMetadata.originalFileName">
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Original
                    File</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parsedMetadata.originalFileName }}</p>
                </div>
                <div v-if="parsedMetadata.mimeType">
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">MIME
                    Type</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parsedMetadata.mimeType }}</p>
                </div>
                <div v-if="parsedMetadata.uuid">
                  <label
                    class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">UUID</label>
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-300 font-mono">{{ parsedMetadata.uuid }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Annotations Section -->
        <div>
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <UIcon name="i-heroicons-annotation" class="w-5 h-5 mr-2" />
            Annotations
            <span
              class="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              {{ annotations.length }}
            </span>
          </h2>

          <!-- No annotations state -->
          <div v-if="annotations.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-document-plus" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">No Annotations</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Start annotating to see your work here.</p>
          </div> <!-- Annotations list -->
          <div v-else class="space-y-4">
            <div v-for="annotation in annotations" :key="annotation.id"
              class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    Annotation #{{ annotation.id }}
                  </span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getReviewStatusColor(annotation.reviewStatus)">
                    {{ annotation.reviewStatus }}
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <UButton size="xs" color="primary" @click="applyAnnotation(annotation)" :disabled="!isImageTask">
                    Apply
                  </UButton>
                  <UButton size="xs" color="error" variant="ghost" @click="deleteAnnotationFromDb(annotation.id)"
                    :loading="deletingAnnotation === annotation.id" title="Delete annotation">
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                  </UButton>
                </div>
              </div>

              <div class="space-y-2 text-xs">
                <div>
                  <span class="font-medium text-gray-500 dark:text-gray-400">User:</span>
                  <span class="ml-1 text-gray-900 dark:text-white">{{ annotation.userEmail }}</span>
                </div>

                <div>
                  <span class="font-medium text-gray-500 dark:text-gray-400">Created:</span>
                  <span class="ml-1 text-gray-900 dark:text-white">{{ formatDate(annotation.createdAt) }}</span>
                </div>

                <div v-if="annotation.isGroundTruth" class="flex items-center">
                  <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-500 mr-1" />
                  <span class="text-yellow-700 dark:text-yellow-300 font-medium">Ground Truth</span>
                </div>

                <div class="mt-3">
                  <span class="font-medium text-gray-500 dark:text-gray-400">Data:</span>
                  <pre
                    class="mt-1 text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">{{ JSON.stringify(annotation.annotationData, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col"> <!-- Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            Annotation Workspace
          </h2>
          <div class="flex items-center space-x-4">
            <UButton color ="success" variant="subtle" size="sm" @click="loadData" class="cursor-pointer">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
              Refresh
            </UButton>
            <UButton color="secondary" size="lg" @click="saveAnnotation" :loading="savingAnnotation"
              :disabled="canvasAnnotations.length === 0" class="cursor-pointer">
              <UIcon name="i-heroicons-check" class="w-4 h-4 mr-2" />
              Save Annotation
            </UButton>
            <UButton v-if="taskData?.nextTaskId" color="success" size="sm" @click="saveAndNext"
              :loading="savingAndNext">
              <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 mr-2" />
              Next
            </UButton>
          </div>
        </div>
      </div><!-- Content Area -->
      <div class="flex-1 p-6 overflow-auto">
        <div v-if="taskData" class="h-full flex flex-col">
          <!-- Enhanced Annotation Toolbar -->
          <div v-if="isImageTask" class="mb-6">
            <AnnotationToolbar :current-tool="currentTool" :is-annotating="isAnnotating"
              :annotation-count="canvasAnnotations.length" :has-selection="selectedAnnotationIndex !== null"
              :can-undo="annotationHistory.length > 0 && historyIndex > 0"
              :can-redo="annotationHistory.length > 0 && historyIndex < annotationHistory.length - 1"
              :zoom-level="Math.round((konvaCanvas?.getImageScale() || 0) * 100)"
              :image-size="konvaCanvas?.getOriginalImageSize()?.width > 0 ? `${konvaCanvas.getOriginalImageSize().width}×${konvaCanvas.getOriginalImageSize().height}` : ''"
              @tool-selected="selectTool" @complete-annotation="completeAnnotation"
              @cancel-annotation="cancelAnnotation" @zoom-in="zoomIn" @zoom-out="zoomOut" @reset-zoom="resetZoom"
              @fit-to-screen="fitToScreen" @undo="undo" @redo="redo" @delete-selected="deleteSelectedAnnotation"
              @duplicate-selected="duplicateSelectedAnnotation" @clear-all="clearAllAnnotations"
              @export-annotations="exportAnnotations" />
          </div>

          <!-- Konva Canvas Container -->
          <div v-if="isImageTask" class="flex-1 flex items-center justify-center p-4">
            <!-- Debug info -->
            <div v-if="!taskData?.dataUrl" class="text-center">
              <p class="text-red-600">No dataUrl available</p>
              <p class="text-sm text-gray-500">Task data: {{ taskData }}</p>
            </div>


            <KonvaAnnotationCanvas v-if="taskData?.dataUrl" ref="konvaCanvas" :image-url="taskData.dataUrl"
              :annotations="canvasAnnotations" :current-tool="currentTool" :is-annotating="isAnnotating"
              :classes="projectData?.labelConfig?.classes || []" :canvas-width="800" :canvas-height="600"
              @update:annotations="canvasAnnotations = $event" @update:is-annotating="isAnnotating = $event"
              @annotation-completed="onAnnotationCompleted" @annotation-updated="onAnnotationUpdated"
              @annotation-deleted="onAnnotationDeleted" @show-class-selector="onShowClassSelector" />
          </div>
          <!-- Class Selection Popup -->
          <div v-if="showClassSelector && projectData?.labelConfig?.classes?.length" data-class-selector
            class="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-600 min-w-48 max-w-64"
            :style="{
              left: `${classSelectorPosition.x}px`,
              top: `${classSelectorPosition.y}px`,
            }">
            <div class="flex items-center mb-3">
              <UIcon name="i-heroicons-tag" class="w-4 h-4 text-blue-500 mr-2" />
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Select Class</h3>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <button v-for="(className, index) in projectData.labelConfig.classes" :key="index"
                @click="selectAnnotationClass(className)" :class="[
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors border flex items-center',
                  lastSelectedClass === className
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 border-gray-200 dark:border-gray-600'
                ]">
                <span
                  class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-3 font-medium">
                  {{ index + 1 }}
                </span>
                <span class="flex-1">{{ className }}</span>
                <span v-if="lastSelectedClass === className" class="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  Enter
                </span>
              </button>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Press 1-{{ projectData.labelConfig.classes.length }} or Enter for last selected
              </div>
              <button @click="cancelClassSelection"
                class="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                <UIcon name="i-heroicons-x-mark" class="w-4 h-4 inline mr-1" />
                Cancel (Esc)
              </button>
            </div>
          </div>

          <!-- Placeholder for other data types -->
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <UIcon name="i-heroicons-document" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-600 dark:text-gray-400">
                Data type: {{ parseDataType(taskData.dataType) }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Annotation interface for this data type will be implemented here.
              </p>
            </div>
          </div>
        </div>

        <!-- Loading state for main content -->
        <div v-else class="h-full flex items-center justify-center">
          <div class="text-center">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p class="text-gray-600 dark:text-gray-400">Loading task data...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import KonvaAnnotationCanvas from '~/components/annotation/KonvaAnnotationCanvas.vue'
import AnnotationToolbar from '~/components/annotation/AnnotationToolbar.vue'

interface TaskData {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: string
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
  nextTaskId: number | null
}

interface ProjectData {
  id: number
  organizationId: number
  name: string
  description: string
  projectType: number
  labelConfig: {
    classes: string[]
  }
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectData
    project_relations: any
  }
}

interface Annotation {
  id: number
  taskId: number
  userId: number
  projectId: number
  annotationData: any
  isGroundTruth: boolean
  reviewStatus: string
  reviewerId: number | null
  createdAt: number
  updatedAt: number
  userEmail: string
}

interface TaskResponse {
  data: TaskData
}

interface AnnotationsResponse {
  data: Annotation[]
}

// Get route params
const route = useRoute()
const taskId = route.params.id as string

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const taskData = ref<TaskData | null>(null)
const projectData = ref<ProjectData | null>(null)
const annotations = ref<Annotation[]>([])
const savingAnnotation = ref(false)
const savingAndNext = ref(false)
const deletingAnnotation = ref<number | null>(null)

// Auth
const token = useCookie('auth_token')

// Refs
const konvaCanvas = ref<any>(null)

// Canvas annotation interfaces
interface CanvasAnnotation {
  type: 'rectangle' | 'polygon' | 'dot' | 'line' | 'circle' | 'freehand'
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  width?: number
  height?: number
  points?: { x: number; y: number }[]
  center?: { x: number; y: number }
  radius?: number
  className?: string
}


// Annotation tools state
const tools = ['select', 'rectangle', 'polygon', 'dot', 'line', 'circle', 'freehand']
const currentTool = ref('rectangle')
const isAnnotating = ref(false)


const canvasAnnotations = ref<CanvasAnnotation[]>([])


// Enhanced toolbar state
const selectedAnnotationIndex = ref<number | null>(null)
const annotationHistory = ref<CanvasAnnotation[][]>([])
const historyIndex = ref(-1)


// Class selection popup state
const showClassSelector = ref(false)
const classSelectorPosition = ref({ x: 0, y: 0 })
const pendingAnnotation = ref<CanvasAnnotation | null>(null)
const selectedClass = ref<string | null>(null)
const lastSelectedClass = ref<string | null>(null)

// Computed properties
const isImageTask = computed(() => {
  if (!taskData.value) return false
  const parsedDataType = parseDataType(taskData.value.dataType)

  // Check multiple ways to determine if it's an image
  const hasImageInDataType = parsedDataType.toLowerCase().includes('image')
  const hasImageMimeType = parsedDataType.startsWith('image/')
  const hasImageUrl = taskData.value.dataUrl && (
    taskData.value.dataUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(taskData.value.dataUrl)
  )

  const isImage = hasImageInDataType || hasImageMimeType || hasImageUrl

  // Debug logging
  console.log('Data type check:', {
    originalDataType: taskData.value.dataType,
    parsedDataType: parsedDataType,
    dataUrl: taskData.value.dataUrl?.substring(0, 100) + '...',
    hasImageInDataType,
    hasImageMimeType,
    hasImageUrl,
    isImage: isImage
  })

  return isImage
})

const parsedMetadata = computed(() => {
  if (!taskData.value?.metadata) return null
  try {
    return JSON.parse(taskData.value.metadata)
  } catch {
    return null
  }
})

// Methods
const fetchTaskData = async () => {
  try {
    if (!token.value) {
      throw new Error('Authentication required')
    }

    const response = await $fetch<TaskResponse>(`http://localhost:8787/api/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    taskData.value = response.data
  } catch (err) {
    console.error('Error fetching task data:', err)
    throw err
  }
}

const fetchAnnotations = async () => {
  try {
    if (!token.value) {
      throw new Error('Authentication required')
    }

    const response = await $fetch<AnnotationsResponse>(`http://localhost:8787/api/annotations/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    annotations.value = response.data
  } catch (err) {
    console.error('Error fetching annotations:', err)
    // Don't throw error for annotations, just log it
    annotations.value = []
  }
}

const fetchProjectData = async () => {
  try {
    if (!token.value || !taskData.value?.projectId) {
      throw new Error('Authentication required or no project ID')
    }

    const response = await $fetch<ProjectResponse>(`http://localhost:8787/api/projects/${taskData.value.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data?.projects) {
      projectData.value = response.data.projects
    } else {
      throw new Error('Project not found')
    }
  } catch (err) {
    console.error('Error fetching project data:', err)
    // Don't throw error for project data, just log it
    projectData.value = null
  }
}

const loadData = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Reset canvas annotations when loading new data
    canvasAnnotations.value = [];

    await fetchTaskData();
    await Promise.all([
      fetchProjectData(),
      fetchAnnotations()
    ]);

    // New logic: If there are annotations from the DB, apply the first one.
    // We will fix the applyAnnotation method in the next step.
    if (annotations.value.length > 0 && isImageTask.value) {
      const firstAnnotation = annotations.value[0];
      // This 'if' statement fixes the TypeScript error.
      if (firstAnnotation) {
        applyAnnotation(firstAnnotation);
      }
    }

  } catch (err) {
    console.error('Error loading data:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load data';
  } finally {
    loading.value = false;
  }
};

const navigateBack = () => {
  const router = useRouter()
  // Navigate back to the project page
  if (taskData.value) {
    router.push(`/projects/${taskData.value.projectId}`)
  } else {
    router.back()
  }
}

const parseDataType = (dataType: string) => {
  // Remove quotes if present
  return dataType.replace(/"/g, '')
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString()
}

const getProjectTypeName = (type: number) => {
  switch (type) {
    case 1: return 'Classification'
    case 2: return 'Object Detection'
    case 3: return 'Data Analysis'
    default: return 'Unknown'
  }
}

// Get maximum canvas size based on viewport
const getMaxCanvasSize = () => {
  const maxWidth = Math.min(window.innerWidth * 0.7, 1200)
  const maxHeight = Math.min(window.innerHeight * 0.7, 800)
  return { width: maxWidth, height: maxHeight }
}


const selectTool = (tool: string) => {
  if (isAnnotating.value) {
    cancelAnnotation()
  }
  currentTool.value = tool
}

// Konva event handlers
const onAnnotationCompleted = (annotation: CanvasAnnotation) => {
  canvasAnnotations.value.push(annotation)
}

const onAnnotationUpdated = (annotation: CanvasAnnotation, index: number) => {
  canvasAnnotations.value[index] = annotation
}

const onAnnotationDeleted = (index: number) => {
  canvasAnnotations.value.splice(index, 1)
}

const onShowClassSelector = (annotation: CanvasAnnotation, position: { x: number; y: number }) => {
  pendingAnnotation.value = annotation
  classSelectorPosition.value = position
  showClassSelector.value = true
}

const selectAnnotationClass = (className: string) => {
  if (!pendingAnnotation.value) return

  // Remember the last selected class
  lastSelectedClass.value = className

  // Add the class to the annotation
  pendingAnnotation.value.className = className

  // Complete the annotation
  if (konvaCanvas.value) {
    konvaCanvas.value.finalizeAnnotation(className)
  }

  // Clean up
  pendingAnnotation.value = null
  showClassSelector.value = false
}

const cancelClassSelection = () => {
  // Don't add the annotation if cancelled
  pendingAnnotation.value = null
  showClassSelector.value = false

  // Cancel the current annotation in Konva
  if (konvaCanvas.value) {
    konvaCanvas.value.cancelCurrentAnnotation()
  }
}

const completeAnnotation = () => {
  if (konvaCanvas.value) {
    konvaCanvas.value.completeCurrentAnnotation(lastSelectedClass.value)
  }
}

const cancelAnnotation = () => {
  if (konvaCanvas.value) {
    konvaCanvas.value.cancelCurrentAnnotation()
  }
}

// Enhanced toolbar methods
const zoomIn = () => {
  if (konvaCanvas.value && konvaCanvas.value.getImageScale) {
    const currentScale = konvaCanvas.value.getImageScale()
    const newScale = Math.min(currentScale * 1.2, 3)
    // Implement zoom functionality in KonvaAnnotationCanvas
    console.log('Zoom in to:', newScale)
  }
}

const zoomOut = () => {
  if (konvaCanvas.value && konvaCanvas.value.getImageScale) {
    const currentScale = konvaCanvas.value.getImageScale()
    const newScale = Math.max(currentScale / 1.2, 0.1)
    // Implement zoom functionality in KonvaAnnotationCanvas
    console.log('Zoom out to:', newScale)
  }
}

const resetZoom = () => {
  // Reset zoom to original scale
  console.log('Reset zoom')
}

const fitToScreen = () => {
  // Fit image to screen
  console.log('Fit to screen')
}

const addToHistory = () => {
  const currentState = JSON.parse(JSON.stringify(canvasAnnotations.value))
  annotationHistory.value = annotationHistory.value.slice(0, historyIndex.value + 1)
  annotationHistory.value.push(currentState)
  historyIndex.value = annotationHistory.value.length - 1
}

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    canvasAnnotations.value = JSON.parse(JSON.stringify(annotationHistory.value[historyIndex.value]))
  }
}

const redo = () => {
  if (historyIndex.value < annotationHistory.value.length - 1) {
    historyIndex.value++
    canvasAnnotations.value = JSON.parse(JSON.stringify(annotationHistory.value[historyIndex.value]))
  }
}

const deleteSelectedAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    addToHistory()
    canvasAnnotations.value.splice(selectedAnnotationIndex.value, 1)
    selectedAnnotationIndex.value = null
  }
}

const duplicateSelectedAnnotation = () => {
  if (selectedAnnotationIndex.value !== null) {
    const annotation = canvasAnnotations.value[selectedAnnotationIndex.value]
    if (annotation) {
      addToHistory()
      const duplicated = JSON.parse(JSON.stringify(annotation))
      // Offset the duplicated annotation
      if (duplicated.startPoint) {
        duplicated.startPoint.x += 20
        duplicated.startPoint.y += 20
      } else if (duplicated.center) {
        duplicated.center.x += 20
        duplicated.center.y += 20
      } else if (duplicated.points) {
        duplicated.points = duplicated.points.map((p: { x: number; y: number }) => ({
          x: p.x + 20,
          y: p.y + 20
        }))
      }
      canvasAnnotations.value.push(duplicated)
    }
  }
}

const clearAllAnnotations = () => {
  if (canvasAnnotations.value.length > 0) {
    addToHistory()
    canvasAnnotations.value = []
  }
  
  // Also clear any pending annotations and reset canvas state
  if (konvaCanvas.value) {
    konvaCanvas.value.cancelCurrentAnnotation()
  }
  
  // Clear any pending annotation state
  pendingAnnotation.value = null
  showClassSelector.value = false
  selectedAnnotationIndex.value = null
}

const exportAnnotations = () => {
  const dataStr = JSON.stringify(canvasAnnotations.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `annotations-task-${taskId}.json`
  link.click()
  URL.revokeObjectURL(url)
}


const getStatusColor = (status: string) => {
  switch (status) {
    case 'unassigned':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    case 'annotating':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
  }
}

const getReviewStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
  }
}

// Set page meta
definePageMeta({
  layout: false
})

// Keyboard event handler
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showClassSelector.value) {
      cancelClassSelection()
    } else {
      cancelAnnotation()
    }
  } else if (showClassSelector.value && projectData.value?.labelConfig?.classes) {
    // Handle number keys for class selection (1-9)
    const numKey = parseInt(event.key)
    if (numKey >= 1 && numKey <= projectData.value.labelConfig.classes.length && numKey <= 9) {
      const className = projectData.value.labelConfig.classes[numKey - 1]
      if (className) {
        selectAnnotationClass(className)
        event.preventDefault()
      }
    }
    // Handle Enter key for last selected class
    else if (event.key === 'Enter' && lastSelectedClass.value) {
      // Check if the last selected class is still available in current classes
      if (projectData.value.labelConfig.classes.includes(lastSelectedClass.value)) {
        selectAnnotationClass(lastSelectedClass.value)
        event.preventDefault()
      }
    }
  }
}

// Lifecycle
onMounted(() => {
  loadData()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// ❌ DELETE your current saveAnnotation method.

// ✅ ADD this final, correct version.
const saveAnnotation = async () => {
  if (!taskData.value || canvasAnnotations.value.length === 0) {
    console.warn('No annotations to save');
    return;
  }

  if (!konvaCanvas.value) {
    console.error('Konva canvas is not ready. Cannot save.');
    return;
  }

  try {
    savingAnnotation.value = true;

    if (!token.value) throw new Error('Authentication required');

    // Get all necessary info and functions from the Konva component
    const convertToOriginal = konvaCanvas.value.convertToOriginal;
    const imageScale = konvaCanvas.value.getImageScale();

    if (!convertToOriginal || imageScale <= 0) {
      throw new Error('Invalid conversion functions or scaling information from canvas component.');
    }

    const annotationData = {
      annotations: canvasAnnotations.value.map((ann) => {
        const converted: any = { type: ann.type, className: ann.className };

        // Get the conversion function and imageScale from the child component
        const convertToOriginal = konvaCanvas.value.convertToOriginal;
        const imageScale = konvaCanvas.value.getImageScale();

        if (ann.type === 'rectangle' && ann.startPoint && typeof ann.width === 'number' && typeof ann.height === 'number') {
          // For rectangles: Define the two opposite corners in raw canvas space
          const topLeft = ann.startPoint;
          const bottomRight = {
            x: ann.startPoint.x + ann.width,
            y: ann.startPoint.y + ann.height
          };
          
          // Convert both corner points using convertToOriginal
          const convertedTopLeft = convertToOriginal(topLeft);
          const convertedBottomRight = convertToOriginal(bottomRight);
          
          // Calculate the final, correct top-left startPoint, positive width and height
          converted.startPoint = {
            x: Math.min(convertedTopLeft.x, convertedBottomRight.x),
            y: Math.min(convertedTopLeft.y, convertedBottomRight.y)
          };
          converted.width = Math.abs(convertedBottomRight.x - convertedTopLeft.x);
          converted.height = Math.abs(convertedBottomRight.y - convertedTopLeft.y);
          
        } else if ((ann.type === 'polygon' || ann.type === 'freehand') && ann.points) {
          // For polygons and freehand: Convert each point
          converted.points = ann.points.map(p => convertToOriginal(p));
          
        } else if (ann.type === 'line' && ann.startPoint && ann.endPoint) {
          // For lines: Convert both endpoints
          converted.startPoint = convertToOriginal(ann.startPoint);
          converted.endPoint = convertToOriginal(ann.endPoint);
          
        } else if ((ann.type === 'circle' || ann.type === 'dot') && ann.center && ann.radius) {
          // For circles and dots: Convert center and scale radius
          converted.center = convertToOriginal(ann.center);
          // Convert radius by dividing by imageScale (raw radius is in canvas units)
          converted.radius = ann.radius / imageScale;
        }
        
        return converted;
      })
    };

    const savePayload = {
      taskId: parseInt(taskId),
      projectId: taskData.value.projectId,
      annotationData,
      metadata: { 
        timestamp: Date.now(),
        canvasSize: { 
          width: konvaCanvas.value.getDisplayImageSize().width, 
          height: konvaCanvas.value.getDisplayImageSize().height 
        }
      }
    };

    await $fetch(`http://localhost:8787/api/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.value}` },
      body: savePayload
    });

    await fetchAnnotations();
    canvasAnnotations.value = []; // Clear annotations after saving

  } catch (err) {
    console.error('Error saving annotation:', err);
  } finally {
    savingAnnotation.value = false;
  }
};

const saveAndNext = async () => {
  if (!taskData.value?.nextTaskId) {
    console.warn('No next task available')
    return
  }

  try {
    savingAndNext.value = true

    // Save annotation only if there are annotations to save
    if (canvasAnnotations.value.length > 0) {
      await saveAnnotation()
    }

    // Navigate to the next task
    const router = useRouter()
    router.push(`/annotate/${taskData.value.nextTaskId}`)

  } catch (err) {
    console.error('Error saving annotation and moving to next task:', err)
    // Handle error - show notification or error message
  } finally {
    savingAndNext.value = false
  }
}

const applyAnnotation = (annotation: Annotation) => {
  if (!isImageTask.value || !konvaCanvas.value) {
    console.warn('Cannot apply annotation: not an image task or Konva canvas not ready');
    return;
  }

  try {
    // Convert the annotation data from the database into the format the canvas expects.
    const converted = convertApiAnnotationToCanvas(annotation.annotationData);

    // Set the canvasAnnotations array. The Konva component will automatically redraw.
    canvasAnnotations.value = converted;

    console.log(`Applied annotation #${annotation.id} with ${converted.length} elements`);
  } catch (error) {
    console.error('Error applying annotation:', error);
  }
};

const convertApiAnnotationToCanvas = (annotationData: any): CanvasAnnotation[] => {
  if (!annotationData || !konvaCanvas.value) {
    return [];
  }

  // Get the conversion functions directly from the Konva component.
  const originalToDisplay = konvaCanvas.value.convertToDisplay;
  const imageScale = konvaCanvas.value.getImageScale();

  if (!originalToDisplay || !imageScale) {
    console.error("Conversion functions not available from canvas component.");
    return [];
  }

  const convertedAnnotations: CanvasAnnotation[] = [];
  const annotationsToProcess = annotationData.annotations || (Array.isArray(annotationData) ? annotationData : [annotationData]);

  for (const ann of annotationsToProcess) {
    if (ann.type === 'rectangle' && ann.startPoint && typeof ann.width === 'number' && typeof ann.height === 'number') {
      // Convert the start point from original to raw canvas coordinates
      const canvasStartPoint = originalToDisplay(ann.startPoint);
      
      // Scale the dimensions from original to raw canvas coordinates
      const canvasWidth = ann.width * imageScale;
      const canvasHeight = ann.height * imageScale;
      
      convertedAnnotations.push({
        type: 'rectangle',
        startPoint: canvasStartPoint,
        width: canvasWidth,
        height: canvasHeight,
        className: ann.className || ann.class
      });
      
    } else if ((ann.type === 'polygon' || ann.type === 'freehand') && ann.points) {
      convertedAnnotations.push({
        type: ann.type,
        points: ann.points.map((p: { x: number; y: number }) => originalToDisplay(p)),
        className: ann.className || ann.class,
      });
      
    } else if (ann.type === 'line' && ann.startPoint && ann.endPoint) {
      convertedAnnotations.push({
        type: 'line',
        startPoint: originalToDisplay(ann.startPoint),
        endPoint: originalToDisplay(ann.endPoint),
        className: ann.className || ann.class,
      });
      
    } else if ((ann.type === 'circle' || ann.type === 'dot') && ann.center) {
      // Convert center from original to raw canvas coordinates
      const canvasCenter = originalToDisplay(ann.center);
      
      // Scale radius from original to raw canvas coordinates
      const canvasRadius = (ann.radius || 5) * imageScale;
      
      convertedAnnotations.push({
        type: ann.type,
        center: canvasCenter,
        radius: canvasRadius,
        className: ann.className || ann.class,
      });
    }
  }

  return convertedAnnotations;
};

const deleteAnnotationFromDb = async (annotationId: number) => {
  if (!token.value) {
    console.error('Authentication required')
    return
  }

  try {
    deletingAnnotation.value = annotationId

    await $fetch(`http://localhost:8787/api/annotations/${annotationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    // Remove annotation from local state
    annotations.value = annotations.value.filter(annotation => annotation.id !== annotationId)

    console.log(`Annotation #${annotationId} deleted successfully`)

  } catch (error) {
    console.error('Error deleting annotation:', error)
    // Could show a toast notification here
  } finally {
    deletingAnnotation.value = null
  }
}



// Watch for annotation changes to add to history
watch(canvasAnnotations, (newAnnotations) => {
  if (newAnnotations.length > 0) {
    addToHistory()
  }
}, { deep: true })

// Initialize history on component mount
onMounted(() => {
  // Initialize with empty state
  annotationHistory.value = [[]]
  historyIndex.value = 0
})
</script>
