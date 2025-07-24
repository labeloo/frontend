<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Side Menu -->
    <div class="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Task Annotation
          </h1>
          <UButton
            @click="navigateBack"
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-left"
          >
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
      </div>      <!-- Content -->
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
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Project Name</label>
                  <p class="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-200">{{ projectData.name }}</p>
                </div>
                
                <div v-if="projectData.description">
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Description</label>
                  <p class="mt-1 text-sm text-blue-800 dark:text-blue-300">{{ projectData.description }}</p>
                </div>
                
                <div>
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Project Type</label>
                  <p class="mt-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {{ getProjectTypeName(projectData.projectType) }}
                    </span>
                  </p>
                </div>
                
                <div v-if="projectData.labelConfig?.classes?.length">
                  <label class="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Classes ({{ projectData.labelConfig.classes.length }})</label>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <span 
                      v-for="(className, index) in projectData.labelConfig.classes" 
                      :key="index"
                      :class="[
                        'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                        lastSelectedClass === className 
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-500' 
                          : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
                      ]"
                    >
                      <span v-if="index < 9" class="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-1 font-medium">
                        {{ index + 1 }}
                      </span>
                      <span class="flex-1">{{ className }}</span>
                      <UIcon v-if="lastSelectedClass === className" name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-500 ml-1" />
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
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
                  <p class="mt-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusColor(taskData.status)">
                      {{ taskData.status }}
                    </span>
                  </p>
                </div>
                
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data Type</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parseDataType(taskData.dataType) }}</p>
                </div>
                
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ taskData.priority }}</p>
                </div>
                
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created At</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(taskData.createdAt) }}</p>
                </div>
                  <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Updated At</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(taskData.updatedAt) }}</p>
                </div>
                
              </div>
            </div>

            <!-- Metadata Section -->
            <div v-if="parsedMetadata" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Metadata</h3>
              <div class="space-y-2">
                <div v-if="parsedMetadata.originalFileName">
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Original File</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parsedMetadata.originalFileName }}</p>
                </div>
                <div v-if="parsedMetadata.mimeType">
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">MIME Type</label>
                  <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ parsedMetadata.mimeType }}</p>
                </div>
                <div v-if="parsedMetadata.uuid">
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">UUID</label>
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
            <span class="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              {{ annotations.length }}
            </span>
          </h2>
          
          <!-- No annotations state -->
          <div v-if="annotations.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-document-plus" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">No Annotations</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Start annotating to see your work here.</p>
          </div>          <!-- Annotations list -->
          <div v-else class="space-y-4">
            <div v-for="annotation in annotations" :key="annotation.id" 
                 class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">              <div class="flex items-start justify-between mb-2">
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
                  <UButton 
                    size="xs" 
                    color="primary" 
                    @click="applyAnnotation(annotation)"
                    :disabled="!isImageTask"
                  >
                    Apply
                  </UButton>                  <UButton 
                    size="xs" 
                    color="error" 
                    variant="ghost"
                    @click="deleteAnnotationFromDb(annotation.id)"
                    :loading="deletingAnnotation === annotation.id"
                    title="Delete annotation"
                  >
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
                  <pre class="mt-1 text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">{{ JSON.stringify(annotation.annotationData, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col">      <!-- Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            Annotation Workspace
          </h2>
          <div class="flex items-center space-x-4">
            <UButton variant="outline" size="sm" @click="loadData">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
              Refresh
            </UButton>
            <UButton 
              color="primary" 
              size="sm" 
              @click="saveAnnotation"
              :loading="savingAnnotation"
              :disabled="canvasAnnotations.length === 0"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 mr-2" />
              Save Annotation
            </UButton>            <UButton 
              v-if="taskData?.nextTaskId"
              color="success" 
              size="sm" 
              @click="saveAndNext"
              :loading="savingAndNext"
            >
              <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 mr-2" />
              Next
            </UButton>
          </div>
        </div>
      </div><!-- Content Area -->
      <div class="flex-1 p-6 overflow-auto">
        <div v-if="taskData" class="h-full flex flex-col">
          <!-- Annotation Tools -->
          <div v-if="isImageTask" class="mb-4 flex items-center space-x-4">
            <button 
              v-for="tool in tools" 
              :key="tool"
              @click="selectTool(tool)"
              :class="['px-4 py-2 rounded transition-colors', 
                       currentTool === tool ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white']"
            >
              {{ tool }}
            </button>

            <!-- Complete Button -->
            <UButton 
              v-if="isAnnotating"
              @click="completeAnnotation"
              color="success"
              size="sm"
            >
              Complete
            </UButton>

            <!-- Cancel Button -->
            <UButton 
              v-if="isAnnotating"
              @click="cancelAnnotation"
              color="error"
              size="sm"
            >
              Cancel
            </UButton>
          </div>

          <!-- Canvas Container -->
          <div v-if="isImageTask" class="flex-1 flex items-center justify-center">
            <div class="relative" ref="canvasContainer">
              <canvas 
                ref="canvas"
                @click="handleClick"
                @mousemove="handleMouseMove"
                @mousedown="handleMouseDown"
                @mouseup="handleMouseUp"
                @dblclick="handleDoubleClick"
                class="border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
                :class="{ 
                  'cursor-crosshair': !isAnnotating && !isDragging && currentTool !== 'select',
                  'cursor-pointer': isAnnotating || (currentTool === 'select' && hoveredAnnotation !== null),
                  'cursor-move': isDragging,
                }"
              ></canvas>

              <!-- Annotation Tools Overlay -->
              <div 
                v-if="clickedAnnotation !== null && !isAnnotating && !isDragging"
                class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex space-x-2 z-10 transition-opacity duration-200 border border-gray-200 dark:border-gray-600"
                :style="{
                  left: `${annotationToolsPosition.x}px`,
                  top: `${annotationToolsPosition.y}px`,
                }"
              >
                <button
                  @click="startEditing(clickedAnnotation)"
                  class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                  title="Edit"
                >
                  <UIcon name="i-heroicons-pencil" class="w-5 h-5" />
                </button>
                <button
                  @click="deleteAnnotation(clickedAnnotation)"
                  class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                  title="Delete"
                >
                  <UIcon name="i-heroicons-trash" class="w-5 h-5" />
                </button>
                <button
                  @click="toggleDragMode(clickedAnnotation)"
                  class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                  title="Drag"
                >
                  <UIcon name="i-heroicons-arrows-pointing-out" class="w-5 h-5" />
                </button>
              </div>

              <!-- Class Selection Popup -->
              <div 
                v-if="showClassSelector && projectData?.labelConfig?.classes?.length"
                data-class-selector
                class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-20 border border-gray-200 dark:border-gray-600 min-w-48"
                :style="{
                  left: `${classSelectorPosition.x}px`,
                  top: `${classSelectorPosition.y}px`,
                }"
              >
                <div class="flex items-center mb-3">
                  <UIcon name="i-heroicons-tag" class="w-4 h-4 text-blue-500 mr-2" />
                  <h3 class="text-sm font-medium text-gray-900 dark:text-white">Select Class</h3>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  <button
                    v-for="(className, index) in projectData.labelConfig.classes"
                    :key="index"
                    @click="selectAnnotationClass(className)"
                    :class="[
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors border flex items-center',
                      lastSelectedClass === className 
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 border-gray-200 dark:border-gray-600'
                    ]"
                  >
                    <span class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-3 font-medium">
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
                  <button
                    @click="cancelClassSelection"
                    class="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4 inline mr-1" />
                    Cancel (Esc)
                  </button>
                </div>
              </div>
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

// Canvas annotation interfaces
interface CanvasAnnotation {
  type: 'rectangle' | 'polygon' | 'dot'
  startPoint?: { x: number; y: number }
  width?: number
  height?: number
  points?: { x: number; y: number }[]
  center?: { x: number; y: number }
  radius?: number
  className?: string
}

// Canvas refs and state
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const backgroundImage = ref<HTMLImageElement | null>(null)

// Annotation tools state
const tools = ['select', 'rectangle', 'polygon', 'dots']
const currentTool = ref('rectangle')
const isAnnotating = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentPath = ref<{ x: number; y: number }[]>([])
const canvasAnnotations = ref<CanvasAnnotation[]>([])
const mousePosition = ref({ x: 0, y: 0 })

// Interaction state
const hoveredAnnotation = ref<number | null>(null)
const isDragging = ref(false)
const dragStartPosition = ref<{ x: number; y: number } | null>(null)
const selectedAnnotation = ref<number | null>(null)
const clickedAnnotation = ref<number | null>(null)
const annotationToolsPosition = ref({ x: 0, y: 0 })
const hoveredPoint = ref<number | null>(null)
const isOverAnnotation = ref(false)

// Class selection popup state
const showClassSelector = ref(false)
const classSelectorPosition = ref({ x: 0, y: 0 })
const pendingAnnotation = ref<CanvasAnnotation | null>(null)
const selectedClass = ref<string | null>(null)
const lastSelectedClass = ref<string | null>(null)

// Computed properties
const isImageTask = computed(() => {
  if (!taskData.value) return false
  return parseDataType(taskData.value.dataType).toLowerCase().includes('image')
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
    loading.value = true
    error.value = null
    
    // First fetch task data
    await fetchTaskData()
    
    // Then fetch project data and annotations in parallel
    await Promise.all([
      fetchProjectData(),
      fetchAnnotations()
    ])
    
    // Auto-load first annotation if available and it's an image task
    nextTick(() => {
      if (annotations.value.length > 0 && isImageTask.value) {
        // Wait for canvas to be initialized before applying annotation
        setTimeout(() => {
          if (canvas.value && ctx.value) {
            applyAnnotation(annotations.value[0])
          }
        }, 500) // Small delay to ensure canvas is ready
      }
    })
    
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
}

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

// Canvas annotation methods
const initializeCanvas = () => {
  if (!canvas.value || !taskData.value?.dataUrl) return
  
  ctx.value = canvas.value.getContext('2d')
  
  // Load image and set canvas size
  const img = new Image()
  img.crossOrigin = 'anonymous' // Handle cross-origin images
  
  img.onload = () => {
    canvas.value!.width = img.width
    canvas.value!.height = img.height
    backgroundImage.value = img // Cache the image
    ctx.value!.drawImage(img, 0, 0)
    drawExistingAnnotations()
  }
  
  img.onerror = (error) => {
    console.error('Failed to load image:', error)
    console.log('Image URL:', taskData.value?.dataUrl)
  }
  
  img.src = taskData.value.dataUrl
}

const selectTool = (tool: string) => {
  if (isAnnotating.value) {
    cancelAnnotation()
  }
  currentTool.value = tool
}

const getCanvasPoint = (event: MouseEvent): { x: number; y: number } => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const handleClick = (event: MouseEvent) => {
  const point = getCanvasPoint(event)
  
  if (currentTool.value === 'rectangle') {
    if (!isAnnotating.value) {
      startPoint.value = point
      isAnnotating.value = true
    } else {
      completeRectangle(point)
    }
  } else if (currentTool.value === 'polygon') {
    if (!isAnnotating.value) {
      currentPath.value = [point]
      isAnnotating.value = true
    } else {
      // Check if clicking near first point to close polygon
      const firstPoint = currentPath.value[0]
      const distance = Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y)
      
      if (distance < 20 && currentPath.value.length > 2) {
        completePolygon()
      } else {
        currentPath.value.push(point)
      }
    }
  } else if (currentTool.value === 'dots') {
    // Create dot annotation and show class selector
    const newAnnotation: CanvasAnnotation = {
      type: 'dot',
      center: point,
      radius: 5 // Default radius
    }
    
    // Show class selector if classes are available
    if (projectData.value?.labelConfig?.classes?.length) {
      showClassSelectorPopup(newAnnotation, point)
    } else {
      // Add annotation without class if no classes available
      canvasAnnotations.value.push(newAnnotation)
      redrawCanvas()
    }
  } else {
    // Handle clicking annotations
    const found = findAnnotationUnderPoint(point)
    if (found !== null) {
      clickedAnnotation.value = found
      updateAnnotationToolsPosition(point)
    } else {
      clickedAnnotation.value = null
    }
  }
}

const handleDoubleClick = () => {
  if (currentTool.value === 'polygon' && isAnnotating.value && currentPath.value.length > 2) {
    completePolygon()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const point = getCanvasPoint(event)
  mousePosition.value = point
  
  let shouldRedraw = false
  if (isDragging.value && selectedAnnotation.value !== null) {
    const dx = point.x - dragStartPosition.value!.x
    const dy = point.y - dragStartPosition.value!.y
    
    const annotation = canvasAnnotations.value[selectedAnnotation.value]
    if (annotation.type === 'rectangle' && annotation.startPoint) {
      annotation.startPoint.x = annotation.startPoint.x + dx
      annotation.startPoint.y = annotation.startPoint.y + dy
    } else if (annotation.type === 'polygon' && annotation.points) {
      annotation.points = annotation.points.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      }))
    } else if (annotation.type === 'dot' && annotation.center) {
      annotation.center.x = annotation.center.x + dx
      annotation.center.y = annotation.center.y + dy
    }
    
    dragStartPosition.value = point
    shouldRedraw = true
  } else if (isAnnotating.value) {
    shouldRedraw = true
  }
  
  if (shouldRedraw) {
    redrawCanvas()
  }
}

const handleMouseDown = (event: MouseEvent) => {
  if (currentTool.value === 'select') {
    const point = getCanvasPoint(event)
    const found = findAnnotationUnderPoint(point)
    if (found !== null) {
      isDragging.value = true
      selectedAnnotation.value = found
      dragStartPosition.value = point
      clickedAnnotation.value = null
    }
  }
}

const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    selectedAnnotation.value = null
    dragStartPosition.value = null
  }
}

const findAnnotationUnderPoint = (point: { x: number; y: number }): number | null => {
  for (let i = canvasAnnotations.value.length - 1; i >= 0; i--) {
    const annotation = canvasAnnotations.value[i]
    if (isPointInAnnotation(point, annotation)) {
      return i
    }
  }
  return null
}

const isPointInAnnotation = (point: { x: number; y: number }, annotation: CanvasAnnotation): boolean => {
  if (annotation.type === 'rectangle' && annotation.startPoint && annotation.width && annotation.height) {
    const minX = Math.min(annotation.startPoint.x, annotation.startPoint.x + annotation.width)
    const maxX = Math.max(annotation.startPoint.x, annotation.startPoint.x + annotation.width)
    const minY = Math.min(annotation.startPoint.y, annotation.startPoint.y + annotation.height)
    const maxY = Math.max(annotation.startPoint.y, annotation.startPoint.y + annotation.height)
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  } else if (annotation.type === 'polygon' && annotation.points) {
    return isPointInPolygon(point, annotation.points)
  } else if (annotation.type === 'dot' && annotation.center && annotation.radius) {
    const distance = Math.hypot(point.x - annotation.center.x, point.y - annotation.center.y)
    return distance <= annotation.radius
  }
  return false
}

const isPointInPolygon = (point: { x: number; y: number }, points: { x: number; y: number }[]): boolean => {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const updateAnnotationToolsPosition = (point: { x: number; y: number }) => {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  annotationToolsPosition.value = {
    x: point.x + rect.left - 60,
    y: point.y + rect.top - 40
  }
}

const showClassSelectorPopup = (annotation: CanvasAnnotation, position: { x: number; y: number }) => {
  if (!canvas.value) return
  
  pendingAnnotation.value = annotation
  const rect = canvas.value.getBoundingClientRect()
  
  // Position the popup near the mouse but ensure it stays within viewport
  const popupWidth = 200 // Estimated popup width
  const popupHeight = 150 // Estimated popup height
  
  let x = position.x + rect.left + 10
  let y = position.y + rect.top - 10
  
  // Adjust if popup would go off screen
  if (x + popupWidth > window.innerWidth) {
    x = position.x + rect.left - popupWidth - 10
  }
  if (y + popupHeight > window.innerHeight) {
    y = position.y + rect.top - popupHeight + 10
  }
  
  classSelectorPosition.value = { x, y }
  showClassSelector.value = true
}

const selectAnnotationClass = (className: string) => {
  if (!pendingAnnotation.value) return
  
  // Remember the last selected class
  lastSelectedClass.value = className
  
  // Add the class to the annotation
  pendingAnnotation.value.className = className
  
  // Add the annotation to the canvas
  canvasAnnotations.value.push(pendingAnnotation.value)
  
  // Clean up
  pendingAnnotation.value = null
  showClassSelector.value = false
  
  // Redraw canvas
  redrawCanvas()
}

const cancelClassSelection = () => {
  // Don't add the annotation if cancelled
  pendingAnnotation.value = null
  showClassSelector.value = false
  
  // Redraw canvas to remove any preview
  redrawCanvas()
}

const completeRectangle = (endPoint: { x: number; y: number }) => {
  if (!startPoint.value) return
  
  const newAnnotation: CanvasAnnotation = {
    type: 'rectangle',
    startPoint: { ...startPoint.value },
    width: endPoint.x - startPoint.value.x,
    height: endPoint.y - startPoint.value.y
  }
  
  // Show class selector if classes are available
  if (projectData.value?.labelConfig?.classes?.length) {
    showClassSelectorPopup(newAnnotation, endPoint)
  } else {
    // Add annotation without class if no classes available
    canvasAnnotations.value.push(newAnnotation)
    redrawCanvas()
  }
  
  isAnnotating.value = false
  startPoint.value = null
}

const completePolygon = () => {
  if (currentPath.value.length < 3) return
  
  const newAnnotation: CanvasAnnotation = {
    type: 'polygon',
    points: [...currentPath.value]
  }
  
  // Show class selector if classes are available
  if (projectData.value?.labelConfig?.classes?.length) {
    // Use the center of the polygon for popup position
    const centerX = currentPath.value.reduce((sum, p) => sum + p.x, 0) / currentPath.value.length
    const centerY = currentPath.value.reduce((sum, p) => sum + p.y, 0) / currentPath.value.length
    showClassSelectorPopup(newAnnotation, { x: centerX, y: centerY })
  } else {
    // Add annotation without class if no classes available
    canvasAnnotations.value.push(newAnnotation)
    redrawCanvas()
  }
  
  isAnnotating.value = false
  currentPath.value = []
}

const completeAnnotation = () => {
  if (!isAnnotating.value) return
  
  if (currentTool.value === 'rectangle' && startPoint.value) {
    completeRectangle(mousePosition.value)
  } else if (currentTool.value === 'polygon' && currentPath.value.length > 2) {
    completePolygon()
  }
}

const cancelAnnotation = () => {
  isAnnotating.value = false
  startPoint.value = null
  currentPath.value = []
  clickedAnnotation.value = null
  redrawCanvas()
}

const deleteAnnotation = (index: number) => {
  canvasAnnotations.value.splice(index, 1)
  clickedAnnotation.value = null
  redrawCanvas()
}

const startEditing = (index: number) => {
  selectedAnnotation.value = index
  const annotation = canvasAnnotations.value[index]
  
  if (annotation.type === 'rectangle' && annotation.startPoint) {
    isAnnotating.value = true
    currentTool.value = 'rectangle'
    startPoint.value = { ...annotation.startPoint }
  } else if (annotation.type === 'polygon' && annotation.points) {
    isAnnotating.value = true
    currentTool.value = 'polygon'
    currentPath.value = [...annotation.points]
  } else if (annotation.type === 'dot' && annotation.center) {
    // For dots, we can just enable drag mode instead of editing mode
    isDragging.value = true
    selectedAnnotation.value = index
    dragStartPosition.value = mousePosition.value
    clickedAnnotation.value = null
    return
  }
  
  canvasAnnotations.value.splice(index, 1)
  clickedAnnotation.value = null
}

const toggleDragMode = (index: number) => {
  isDragging.value = true
  selectedAnnotation.value = index
  dragStartPosition.value = mousePosition.value
  clickedAnnotation.value = null
}

const redrawCanvas = () => {
  if (!canvas.value || !ctx.value || !backgroundImage.value) return
  
  // Clear canvas
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Draw cached background image immediately
  ctx.value.drawImage(backgroundImage.value, 0, 0)
  
  // Draw annotations
  drawExistingAnnotations()
  drawCurrentAnnotation()
}

const drawExistingAnnotations = () => {
  if (!ctx.value) return
  
  ctx.value.strokeStyle = '#00ff00'
  ctx.value.lineWidth = 2
  canvasAnnotations.value.forEach((annotation, index) => {
    const isSelected = index === selectedAnnotation.value
    
    ctx.value!.beginPath()
    if (annotation.type === 'rectangle' && annotation.startPoint && annotation.width && annotation.height) {
      ctx.value!.strokeRect(
        annotation.startPoint.x,
        annotation.startPoint.y,
        annotation.width,
        annotation.height
      )
      
      // Draw class name if available
      if (annotation.className) {
        ctx.value!.fillStyle = isSelected ? '#ff0000' : '#00ff00'
        ctx.value!.font = '12px Arial'
        ctx.value!.fillText(
          annotation.className,
          annotation.startPoint.x,
          annotation.startPoint.y - 5
        )
      }
    } else if (annotation.type === 'polygon' && annotation.points) {
      ctx.value!.moveTo(annotation.points[0].x, annotation.points[0].y)
      annotation.points.forEach(point => {
        ctx.value!.lineTo(point.x, point.y)
      })
      ctx.value!.closePath()
      
      // Draw class name if available
      if (annotation.className && annotation.points.length > 0) {
        const centerX = annotation.points.reduce((sum, p) => sum + p.x, 0) / annotation.points.length
        const centerY = annotation.points.reduce((sum, p) => sum + p.y, 0) / annotation.points.length
        ctx.value!.fillStyle = isSelected ? '#ff0000' : '#00ff00'
        ctx.value!.font = '12px Arial'
        ctx.value!.fillText(annotation.className, centerX, centerY - 5)
      }
    } else if (annotation.type === 'dot' && annotation.center && annotation.radius) {
      ctx.value!.arc(annotation.center.x, annotation.center.y, annotation.radius, 0, 2 * Math.PI)
      ctx.value!.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)'
      ctx.value!.fill()
      
      // Draw class name if available
      if (annotation.className) {
        ctx.value!.fillStyle = isSelected ? '#ff0000' : '#00ff00'
        ctx.value!.font = '12px Arial'
        ctx.value!.fillText(
          annotation.className,
          annotation.center.x + annotation.radius + 5,
          annotation.center.y - 5
        )
      }
    }
    
    ctx.value!.strokeStyle = isSelected ? '#ff0000' : '#00ff00'
    ctx.value!.lineWidth = isSelected ? 3 : 2
    ctx.value!.stroke()
  })
}

const drawCurrentAnnotation = () => {
  if (!ctx.value || !isAnnotating.value) return
  
  ctx.value.beginPath()
  ctx.value.strokeStyle = '#ff0000'
  ctx.value.lineWidth = 2

  if (currentTool.value === 'rectangle' && startPoint.value) {
    const width = mousePosition.value.x - startPoint.value.x
    const height = mousePosition.value.y - startPoint.value.y
    ctx.value.strokeRect(
      startPoint.value.x,
      startPoint.value.y,
      width,
      height
    )
  } else if (currentTool.value === 'polygon' && currentPath.value.length > 0) {
    ctx.value.moveTo(currentPath.value[0].x, currentPath.value[0].y)
    currentPath.value.forEach(point => {
      ctx.value!.lineTo(point.x, point.y)
    })
    ctx.value.lineTo(mousePosition.value.x, mousePosition.value.y)
    ctx.value.stroke()

    // Draw points
    currentPath.value.forEach((point, index) => {
      ctx.value!.beginPath()
      ctx.value!.fillStyle = index === 0 ? '#00ff00' : '#ffffff'
      ctx.value!.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.value!.fill()
      ctx.value!.stroke()
    })
  }
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

// Watchers
watch(taskData, (newTaskData) => {
  if (newTaskData && isImageTask.value) {
    nextTick(() => {
      initializeCanvas()
    })
  }
}, { immediate: true })

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
      selectAnnotationClass(className)
      event.preventDefault()
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

const saveAnnotation = async () => {
  if (!taskData.value || canvasAnnotations.value.length === 0) {
    console.warn('No annotations to save')
    return
  }

  try {
    savingAnnotation.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }    const annotationData = {
      annotations: canvasAnnotations.value.map(annotation => ({
        ...annotation,
        // Include class information in the saved data
        class: annotation.className
      }))
    }

    await $fetch(`http://localhost:8787/api/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: {
        taskId: parseInt(taskId),
        projectId: taskData.value.projectId,
        annotationData
      }
    })

    // Refresh annotations after saving
    await fetchAnnotations()
    
    // Show success message or notification here if needed
    console.log('Annotation saved successfully')
    
  } catch (err) {
    console.error('Error saving annotation:', err)
    // Handle error - show notification or error message
    throw err
  } finally {
    savingAnnotation.value = false
  }
}

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
  if (!isImageTask.value || !canvas.value || !ctx.value) {
    console.warn('Cannot apply annotation: not an image task or canvas not ready')
    return
  }

  try {
    // Clear current canvas annotations
    canvasAnnotations.value = []
    
    // Convert API annotation data to canvas format
    const convertedAnnotations = convertApiAnnotationToCanvas(annotation.annotationData)
    
    // Add converted annotations to canvas
    canvasAnnotations.value.push(...convertedAnnotations)
    
    // Redraw canvas with new annotations
    redrawCanvas()
    
    console.log(`Applied annotation #${annotation.id} with ${convertedAnnotations.length} elements`)
      } catch (error) {
    console.error('Error applying annotation:', error)
    // Could show a toast notification here
  }
}

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

const convertApiAnnotationToCanvas = (annotationData: any): CanvasAnnotation[] => {
  const canvasAnnotations: CanvasAnnotation[] = []
  
  if (!annotationData) {
    return canvasAnnotations
  }

  try {
    // Handle different annotation data formats
    let annotations = []
    
    if (annotationData.annotations && Array.isArray(annotationData.annotations)) {
      // Format: { annotations: [...] }
      annotations = annotationData.annotations
    } else if (Array.isArray(annotationData)) {
      // Format: [...]
      annotations = annotationData
    } else if (annotationData.type) {
      // Format: single annotation object
      annotations = [annotationData]
    }

    for (const ann of annotations) {
      if (ann.type === 'rectangle') {
        // Rectangle format: { type: 'rectangle', startPoint: {x, y}, width: number, height: number }
        if (ann.startPoint && typeof ann.width === 'number' && typeof ann.height === 'number') {
          canvasAnnotations.push({
            type: 'rectangle',
            startPoint: { x: ann.startPoint.x, y: ann.startPoint.y },
            width: ann.width,
            height: ann.height,
            className: ann.className || ann.class
          })
        }
        // COCO bbox format: { type: 'rectangle', bbox: [x, y, width, height] }
        else if (ann.bbox && Array.isArray(ann.bbox) && ann.bbox.length >= 4) {
          canvasAnnotations.push({
            type: 'rectangle',
            startPoint: { x: ann.bbox[0], y: ann.bbox[1] },
            width: ann.bbox[2],
            height: ann.bbox[3],
            className: ann.className || ann.class
          })
        }
      } else if (ann.type === 'polygon') {
        // Polygon format: { type: 'polygon', points: [{x, y}, ...] }
        if (ann.points && Array.isArray(ann.points) && ann.points.length >= 3) {
          canvasAnnotations.push({
            type: 'polygon',
            points: ann.points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
            className: ann.className || ann.class
          })
        }
        // COCO segmentation format: { type: 'polygon', segmentation: [[x1,y1,x2,y2,...]] }
        else if (ann.segmentation && Array.isArray(ann.segmentation) && ann.segmentation[0]) {
          const coords = ann.segmentation[0]
          const points = []
          
          // Convert flat array to points array
          for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
              points.push({ x: coords[i], y: coords[i + 1] })
            }
          }
          
          if (points.length >= 3) {
            canvasAnnotations.push({
              type: 'polygon',
              points: points,
              className: ann.className || ann.class
            })
          }
        }
      } else if (ann.type === 'dot') {
        // Dot format: { type: 'dot', center: {x, y}, radius: number }
        if (ann.center && typeof ann.radius === 'number') {
          canvasAnnotations.push({
            type: 'dot',
            center: { x: ann.center.x, y: ann.center.y },
            radius: ann.radius,
            className: ann.className || ann.class
          })
        }
      }
      // Handle legacy formats or other types
      else if (ann.bbox && Array.isArray(ann.bbox)) {
        // Fallback to bbox if type is not specified
        canvasAnnotations.push({
          type: 'rectangle',
          startPoint: { x: ann.bbox[0], y: ann.bbox[1] },
          width: ann.bbox[2],
          height: ann.bbox[3],
          className: ann.className || ann.class
        })
      }
    }
    
  } catch (error) {
    console.error('Error converting annotation data:', error)
  }

  return canvasAnnotations
}
</script>
