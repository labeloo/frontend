<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Data
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Upload images and data files for annotation in this project
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading project...</p>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
      class="mb-6"
    />

    <!-- Main Content -->
    <div v-else>
      <!-- Project Info Card -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Project Information</h3>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-folder" class="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p class="text-sm text-blue-600 dark:text-blue-400">Project</p>
                <p class="text-lg font-bold text-blue-900 dark:text-blue-200">{{ projectData?.name || 'Loading...' }}</p>
              </div>
            </div>
          </div>

          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-tag" class="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p class="text-sm text-green-600 dark:text-green-400">Classes</p>
                <p class="text-lg font-bold text-green-900 dark:text-green-200">{{ classCount }}</p>
              </div>
            </div>
          </div>

          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p class="text-sm text-purple-600 dark:text-purple-400">Project Type</p>
                <p class="text-lg font-bold text-purple-900 dark:text-purple-200">{{ getProjectTypeName(projectData?.projectType) }}</p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- File Upload Section -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Upload Files</h3>
        </template>

        <div class="space-y-6">
          <!-- Instructions -->
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div class="flex items-start space-x-2">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Upload Guidelines</h4>
                <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Supported formats: JPG, PNG, GIF, WebP</li>
                  <li>• You can also upload ZIP files containing images</li>
                  <li>• Maximum file size: 50MB per file</li>
                  <li>• Files will be automatically processed for annotation</li>
                  <li>• Duplicate files will be automatically detected and skipped</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- File Drop Zone -->
          <div
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            :class="{ 'border-primary bg-primary/5': isDragging }"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*,.zip"
              @change="handleFileSelect"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              :disabled="uploading"
            />
            
            <div class="space-y-4">
              <div class="flex justify-center">
                <UIcon name="i-heroicons-cloud-arrow-up" class="w-16 h-16 text-gray-400" />
              </div>
              <div>
                <p class="text-xl font-medium text-gray-900 dark:text-white">
                  Drop files here or click to browse
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Images (JPG, PNG, GIF, WebP) or ZIP files up to 50MB each
                </p>
              </div>
              <UButton
                type="button"
                color="primary"
                variant="outline"
                icon="i-heroicons-folder-open"
                size="lg"
                :disabled="uploading"
              >
                Choose Files
              </UButton>
            </div>
          </div>

          <!-- Upload Progress -->
          <div v-if="uploading" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading files...</span>
              <span class="text-sm text-gray-500">{{ uploadProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                class="bg-primary h-3 rounded-full transition-all duration-300"
                :style="{ width: `${uploadProgress}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
              Please don't close this page while uploading...
            </p>
          </div>

          <!-- Selected Files List -->
          <div v-if="selectedFiles.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected Files ({{ selectedFiles.length }})
              </h4>
              <UButton
                @click="clearAllFiles"
                variant="ghost"
                color="error"
                size="xs"
                icon="i-heroicons-trash"
                :disabled="uploading"
              >
                Clear All
              </UButton>
            </div>
            
            <div class="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <UIcon 
                      :name="getFileIcon(file)" 
                      class="w-5 h-5 text-gray-500" 
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ file.name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatFileSize(file.size) }}
                    </p>
                  </div>
                </div>
                <UButton
                  @click="removeFile(index)"
                  variant="ghost"
                  color="error"
                  size="xs"
                  icon="i-heroicons-x-mark"
                  :disabled="uploading"
                />
              </div>
            </div>
          </div>

          <!-- Upload Button -->
          <div v-if="selectedFiles.length > 0 && !uploading" class="flex justify-end">
            <UButton
              @click="uploadFiles"
              color="primary"
              size="lg"
              icon="i-heroicons-cloud-arrow-up"
              :loading="uploading"
            >
              Upload {{ selectedFiles.length }} File{{ selectedFiles.length !== 1 ? 's' : '' }}
            </UButton>
          </div>

          <!-- Empty State -->
          <div v-if="selectedFiles.length === 0 && !uploading" class="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <UIcon name="i-heroicons-photo" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No files selected. Drop files above or click to browse.
            </p>
          </div>
        </div>
      </UCard>

      <!-- Recent Uploads Section -->
      <UCard v-if="recentUploads.length > 0">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Uploads</h3>
            <UBadge color="primary" variant="subtle">
              {{ recentUploads.length }} file{{ recentUploads.length !== 1 ? 's' : '' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-2">
          <div
            v-for="upload in recentUploads.slice(0, 10)"
            :key="upload.id"
            class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
          >
            <div class="flex items-center space-x-3">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-600" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ upload.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Uploaded {{ formatUploadTime(upload.uploadedAt) }}
                </p>
              </div>
            </div>
            <UBadge color="success" variant="subtle" size="xs">
              Uploaded
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  projectId: string
}

const props = defineProps<Props>()

// Types
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

// Auth
const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')
const toast = useToast()

// Reactive state
const loading = ref(true)
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref<string | null>(null)
const projectData = ref<ProjectData | null>(null)
const selectedFiles = ref<File[]>([])
const isDragging = ref(false)
const recentUploads = ref<UploadedFile[]>([])

// Refs
const fileInput = ref<HTMLInputElement>()

// Computed
const classCount = computed(() => {
  return projectData.value?.labelConfig?.classes?.length || 0
})

// Methods
const fetchProjectData = async () => {
  try {
    loading.value = true
    error.value = null
    
    if (!token.value) {
      throw new Error('Authentication required')
    }

    const response = await $fetch<ProjectResponse>(`http://localhost:8787/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle the nested response structure
    if (response.data?.projects) {
      projectData.value = response.data.projects
    } else {
      throw new Error('Project not found')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load project'
    console.error('Error fetching project:', err)
  } finally {
    loading.value = false
  }
}

const getProjectTypeName = (type?: number) => {
  switch (type) {
    case 1: return 'Classification'
    case 2: return 'Object Detection'
    case 3: return 'Data Analysis'
    default: return 'Unknown'
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFiles = (files: File[]) => {
  const validFiles: File[] = []
  const invalidFiles: string[] = []
  
  files.forEach(file => {
    // Check file type
    const isImage = file.type.startsWith('image/')
    const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    
    if (!isImage && !isZip) {
      invalidFiles.push(`${file.name} - Invalid file type`)
    } else if (file.size > maxSize) {
      invalidFiles.push(`${file.name} - File too large (max 50MB)`)
    } else if (selectedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      invalidFiles.push(`${file.name} - File already selected`)
    } else {
      validFiles.push(file)
    }
  })
  
  // Add valid files
  if (validFiles.length > 0) {
    selectedFiles.value.push(...validFiles)
    
    toast.add({
      title: 'Files Added',
      description: `${validFiles.length} file(s) added successfully`,
      color: 'success'
    })
  }
  
  // Show warnings for invalid files
  if (invalidFiles.length > 0) {
    toast.add({
      title: 'Some Files Skipped',
      description: invalidFiles.join(', '),
      color: 'warning'
    })
  }
  
  // Clear the input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index: number) => {
  const fileName = selectedFiles.value[index].name
  selectedFiles.value.splice(index, 1)
  
  toast.add({
    title: 'File Removed',
    description: `${fileName} has been removed`,
    color: 'info'
  })
}

const clearAllFiles = () => {
  selectedFiles.value = []
  
  toast.add({
    title: 'All Files Cleared',
    description: 'All selected files have been removed',
    color: 'info'
  })
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return

  try {
    uploading.value = true
    uploadProgress.value = 0

    // Create FormData for file upload
    const formData = new FormData()
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch('http://localhost:8787/api/bucket/uploadData', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'projectId': props.projectId
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Upload failed: ${response.statusText} - ${errorData}`)
    }

    const result = await response.json()
    console.log('Upload successful:', result)

    // Add to recent uploads
    const newUploads = selectedFiles.value.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      uploadedAt: Date.now()
    }))
    
    recentUploads.value.unshift(...newUploads)

    toast.add({
      title: 'Upload Successful',
      description: `${selectedFiles.value.length} file(s) uploaded successfully`,
      color: 'success'
    })

    // Clear selected files
    selectedFiles.value = []
    uploadProgress.value = 100

  } catch (err) {
    console.error('Upload error:', err)
    toast.add({
      title: 'Upload Failed',
      description: err instanceof Error ? err.message : 'Failed to upload files',
      color: 'error'
    })
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.value = 0
    }, 2000)
  }
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return 'i-heroicons-photo'
  } else if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
    return 'i-heroicons-archive-box'
  }
  return 'i-heroicons-document'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatUploadTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// Lifecycle
onMounted(() => {
  fetchProjectData()
})

// Cleanup
onUnmounted(() => {
  // Clean up any pending uploads or file references
  if (uploading.value) {
    uploading.value = false
  }
})
</script>
