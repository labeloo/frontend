<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Video
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Upload video files for frame extraction and labeling. Supported formats: MP4, AVI, MOV, MKV, WebM.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <!-- Video Upload Section -->
      <div class="space-y-4">
        <div>
          <!-- FPS Selection -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frame Extraction Rate (FPS)
            </label>
            <div class="flex items-center space-x-4">
              <UInput
                v-model="videoSettings.fps"
                type="number"
                min="1"
                max="60"
                placeholder="Enter FPS"
                size="sm"
                class="w-32"
                :disabled="isUploadingVideos"
              />
              <div class="flex space-x-2">
                <UButton
                  v-for="preset in fpsPresets"
                  :key="preset"
                  @click="videoSettings.fps = preset"
                  variant="outline"
                  size="xs"
                  :color="videoSettings.fps === preset ? 'info' : 'secondary'"
                  :disabled="isUploadingVideos"
                >
                  {{ preset }} FPS
                </UButton>
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher FPS extracts more frames from videos. Recommended: 1-5 FPS for general use.
            </p>
          </div>

          <!-- Video Drop Zone -->
          <div
            @drop="handleVideoDrop"
            @dragover.prevent
            @dragenter.prevent="isVideosDragging = true"
            @dragleave.prevent="isVideosDragging = false"
            class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
            :class="{ 'border-primary bg-primary/5': isVideosDragging }"
          >
            <input
              ref="videoFileInput"
              type="file"
              multiple
              accept="video/*"
              @change="handleVideoFileSelect"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              :disabled="isUploadingVideos"
            />
            
            <div class="space-y-3">
              <div class="flex justify-center">
                <UIcon name="i-heroicons-video-camera" class="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <p class="text-lg font-medium text-gray-900 dark:text-white">
                  Drop video files here or click to browse
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Videos (MP4, AVI, MOV, MKV, WebM) up to 100MB each
                </p>
              </div>
              <UButton
                type="button"
                color="secondary"
                variant="outline"
                icon="i-heroicons-folder-open"
                :disabled="isUploadingVideos || !videoSettings.fps"
              >
                Choose Video Files
              </UButton>
            </div>
          </div>

          <!-- Video Upload Progress -->
          <div v-if="isUploadingVideos" class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Processing videos...</span>
              <span class="text-sm text-gray-500">{{ videoUploadProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-primary h-2 rounded-full transition-all duration-300"
                :style="{ width: `${videoUploadProgress}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Extracting frames at {{ videoSettings.fps }} FPS...
            </p>
          </div>

          <!-- Uploaded Videos List -->
          <div v-if="uploadedVideos.length > 0" class="mt-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected Videos ({{ uploadedVideos.length }})
              </h4>
              <div class="flex space-x-2">
                <UButton
                  @click="clearAllVideos"
                  variant="ghost"
                  color="error"
                  size="xs"
                  icon="i-heroicons-trash"
                  :disabled="isUploadingVideos"
                >
                  Clear All
                </UButton>
                <UButton
                  @click="uploadVideos"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-cloud-arrow-up"
                  :loading="isUploadingVideos"
                >
                  Upload & Process
                </UButton>
              </div>
            </div>
            
            <div class="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div
                v-for="(video, index) in uploadedVideos"
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <UIcon name="i-heroicons-video-camera" class="w-5 h-5 text-gray-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ video.name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatFileSize(video.size) }}
                    </p>
                  </div>
                </div>
                <UButton
                  @click="removeVideo(index)"
                  variant="ghost"
                  color="error"
                  size="xs"
                  icon="i-heroicons-x-mark"
                  :disabled="isUploadingVideos"
                />
              </div>
            </div>
          </div>

          <!-- Empty State for Videos -->
          <div v-else class="mt-4 text-center py-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <UIcon name="i-heroicons-video-camera" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No videos selected. Add videos to extract frames for labeling.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const props = defineProps<{
  projectId: string
}>()

const toast = useToast()
const token = useCookie('auth_token')

// Video upload state
const uploadedVideos = ref<File[]>([])
const isUploadingVideos = ref(false)
const videoUploadProgress = ref(0)
const isVideosDragging = ref(false)
const videoFileInput = ref<HTMLInputElement>()

// Video settings
const videoSettings = reactive({
  fps: 5 // Default FPS
})

// FPS presets
const fpsPresets = [1, 5, 10, 15, 30, 60]

// Video file handling methods
const handleVideoDrop = (event: DragEvent) => {
  event.preventDefault()
  isVideosDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files) {
    handleVideoFiles(Array.from(files))
  }
}

const handleVideoFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    handleVideoFiles(Array.from(files))
  }
}

const handleVideoFiles = (files: File[]) => {
  const validFiles: File[] = []
  const invalidFiles: string[] = []
  
  files.forEach(file => {
    // Check file type
    const isVideo = file.type.startsWith('video/')
    
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    
    if (!isVideo) {
      invalidFiles.push(`${file.name} - Invalid file type`)
    } else if (file.size > maxSize) {
      invalidFiles.push(`${file.name} - File too large (max 100MB)`)
    } else if (uploadedVideos.value.some(v => v.name === file.name && v.size === file.size)) {
      invalidFiles.push(`${file.name} - File already uploaded`)
    } else {
      validFiles.push(file)
    }
  })
  
  // Add valid files
  if (validFiles.length > 0) {
    uploadedVideos.value.push(...validFiles)
    
    toast.add({
      title: 'Videos Added',
      description: `${validFiles.length} video(s) added successfully`,
      color: 'success'
    })
  }
  
  // Show warnings for invalid files
  if (invalidFiles.length > 0) {
    toast.add({
      title: 'Some Videos Skipped',
      description: invalidFiles.join(', '),
      color: 'warning'
    })
  }
  
  // Clear the input
  if (videoFileInput.value) {
    videoFileInput.value.value = ''
  }
}

const removeVideo = (index: number) => {
  const videoName = uploadedVideos.value[index].name
  uploadedVideos.value.splice(index, 1)
  
  toast.add({
    title: 'Video Removed',
    description: `${videoName} has been removed`,
    color: 'info'
  })
}

const clearAllVideos = () => {
  uploadedVideos.value = []
  
  toast.add({
    title: 'All Videos Cleared',
    description: 'All uploaded videos have been removed',
    color: 'info'
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const uploadVideos = async () => {
  if (uploadedVideos.value.length === 0) return

  if (!videoSettings.fps || videoSettings.fps <= 0) {
    toast.add({
      title: 'Invalid FPS',
      description: 'Please set a valid FPS value for video processing',
      color: 'warning'
    })
    return
  }

  isUploadingVideos.value = true
  videoUploadProgress.value = 0

  try {
    // Create FormData for video upload
    const videoFormData = new FormData()
    uploadedVideos.value.forEach(video => {
      videoFormData.append('files', video)
    })

    const videoUploadResponse = await fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/bucket/uploadDataVideo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'projectId': props.projectId,
        'fps': videoSettings.fps.toString()
      },
      body: videoFormData
    })

    if (!videoUploadResponse.ok) {
      const videoUploadErrorData = await videoUploadResponse.text()
      console.warn(`Video upload failed: ${videoUploadResponse.statusText} - ${videoUploadErrorData}`)
      
      toast.add({
        title: 'Video Upload Failed',
        description: `Video upload failed. Please try again.`,
        color: 'error'
      })
    } else {
      const videoResult = await videoUploadResponse.json()
      toast.add({
        title: 'Videos Processed Successfully',
        description: `${uploadedVideos.value.length} video(s) uploaded and ${videoResult.createdTasks} frames extracted at ${videoSettings.fps} FPS`,
        color: 'success'
      })
      
      // Clear uploaded videos after success
      uploadedVideos.value = []
    }
  } catch (videoUploadErr) {
    console.warn('Video upload error:', videoUploadErr)
    toast.add({
      title: 'Video Upload Failed',
      description: `Video upload failed. Please try again.`,
      color: 'error'
    })
  } finally {
    isUploadingVideos.value = false
    videoUploadProgress.value = 0
  }
}
</script>
