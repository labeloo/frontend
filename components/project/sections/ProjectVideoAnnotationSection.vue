<template>
  <div class="h-full flex flex-col">
    <!-- Upload Section -->
    <div v-if="!videoUrl" class="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div class="text-center max-w-md">
        <UIcon name="i-heroicons-video-camera" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Video for Annotation</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">Upload a video to start annotating with SAM 2 models.</p>
        
        <input
          type="file"
          ref="fileInput"
          accept="video/*"
          class="hidden"
          @change="handleFileSelect"
        />
        
        <UButton
          size="xl"
          color="primary"
          :loading="isUploading"
          @click="triggerFileInput"
        >
          Select Video
        </UButton>
      </div>
    </div>

    <!-- Video Player Section -->
    <div v-else class="flex-1 flex flex-col min-h-0 bg-gray-900 rounded-lg overflow-hidden">
      <!-- Video Container -->
      <div class="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video
          ref="videoRef"
          :src="videoUrl"
          class="w-full h-full object-contain"
          @loadedmetadata="onVideoLoaded"
          @durationchange="onDurationChange"
          @timeupdate="onTimeUpdate"
          @ended="isPlaying = false"
          @click="togglePlay"
        ></video>
      </div>

      <!-- Controls Section (Below Video) -->
      <div class="bg-gray-800 border-t border-gray-700 p-4">
        <!-- Debug Info (Temporary) -->
        <div class="text-xs text-gray-500 mb-2 font-mono">
            Time: {{ currentTime.toFixed(2) }} / {{ duration.toFixed(2) }} | 
            Video Duration: {{ videoRef?.duration }} |
            FPS: {{ fps }}
        </div>

        <!-- Progress Bar Container -->
        <div class="relative w-full h-6 mb-2 cursor-pointer group/progress flex items-center" @click="handleProgressBarClick">
            <!-- Background Track -->
            <div class="w-full h-2 bg-gray-600 rounded-lg group-hover/progress:h-3 transition-all duration-200 relative overflow-hidden">
                <!-- Progress Fill -->
                <div 
                    class="absolute top-0 left-0 h-full bg-primary-500 rounded-lg pointer-events-none transition-all duration-100"
                    :style="{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }"
                ></div>
            </div>
            <!-- Hover Thumb (Optional visual indicator) -->
            <div 
                class="absolute h-4 w-4 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 pointer-events-none transition-opacity duration-200"
                :style="{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translateX(-50%)' }"
            ></div>
        </div>

        <div class="flex items-center justify-between text-white">
          <div class="flex items-center gap-4">
            <UButton
              variant="ghost"
              color="white"
              :icon="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
              @click="togglePlay"
            />
            
            <div class="flex items-center gap-2 border-l border-gray-600 pl-4">
              <UButton
                variant="ghost"
                color="white"
                icon="i-heroicons-chevron-left"
                size="sm"
                @click="stepFrame(-1)"
                title="Previous Frame"
              />
              <div class="flex flex-col items-center min-w-[80px]">
                <span class="text-xs font-mono text-gray-400">Frame</span>
                <span class="text-sm font-mono font-bold text-white">{{ currentFrame }} / {{ totalFrames }}</span>
              </div>
              <UButton
                variant="ghost"
                color="white"
                icon="i-heroicons-chevron-right"
                size="sm"
                @click="stepFrame(1)"
                title="Next Frame"
              />
            </div>

            <span class="text-sm font-mono ml-4 text-gray-300">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </span>
          </div>

          <div class="flex items-center gap-4">
             <UButton
                variant="ghost"
                color="white"
                icon="i-heroicons-arrow-path"
                @click="resetVideo"
                title="Change Video"
             />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  projectId: string
}>()

const { fetch: apiFetch, url: apiUrl } = useApi()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const isUploading = ref(false)
const videoUrl = ref<string | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const fps = ref(30) // Default FPS

const currentFrame = computed(() => Math.floor(currentTime.value * fps.value))
const totalFrames = computed(() => Math.floor(duration.value * fps.value))

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  await uploadVideo(file)
}

const uploadVideo = async (file: File) => {
  isUploading.value = true
  const formData = new FormData()
  formData.append('files', file)

  try {
    const response = await apiFetch('/api/bucket/uploadDataVideo', {
      method: 'POST',
      headers: {
        'projectId': props.projectId,
        'fps': fps.value.toString()
      },
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Upload response:', data)
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        const uploadedFile = data.uploadedFiles[0]
        videoUrl.value = `${apiUrl}/api/bucket/taskData/${props.projectId}/${uploadedFile.fileName}`
        toast.add({ title: 'Success', description: 'Video uploaded successfully', color: 'green' })
      } else {
        console.warn('No uploaded files in response', data)
        toast.add({ title: 'Warning', description: 'Upload completed but no file returned', color: 'orange' })
      }
    } else {
      throw new Error('Upload failed')
    }
  } catch (error) {
    console.error('Upload error:', error)
    toast.add({ title: 'Error', description: 'Failed to upload video', color: 'red' })
  } finally {
    isUploading.value = false
  }
}

const onDurationChange = () => {
    if (videoRef.value) {
        duration.value = videoRef.value.duration
        console.log('Duration changed:', duration.value)
    }
}

const onVideoLoaded = () => {
  console.log('Video loaded metadata')
  if (videoRef.value) {
    duration.value = videoRef.value.duration
    console.log('Duration set to:', duration.value)
  }
}

const onTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const togglePlay = () => {
  if (!videoRef.value) return
  if (videoRef.value.paused) {
    videoRef.value.play()
    isPlaying.value = true
  } else {
    videoRef.value.pause()
    isPlaying.value = false
  }
}

const stepFrame = (frames: number) => {
  if (!videoRef.value) return
  
  // Pause if playing
  if (!videoRef.value.paused) {
    videoRef.value.pause()
    isPlaying.value = false
  }

  let vidDuration = duration.value
  if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
      vidDuration = videoRef.value.duration
  }

  if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
      console.warn('Invalid duration, cannot step frame')
      return
  }

  const current = videoRef.value.currentTime
  const frameTime = 1 / fps.value
  let newTime = current + (frames * frameTime)
  
  // Clamp
  newTime = Math.max(0, Math.min(newTime, vidDuration))
  
  console.log(`Stepping frame: ${frames}, Current: ${current}, New: ${newTime}`)

  // Set time
  videoRef.value.currentTime = newTime
  currentTime.value = newTime
}

const handleProgressBarClick = (event: MouseEvent) => {
    if (!videoRef.value) return
    
    let vidDuration = duration.value
    // Fallback to video element duration if ref is 0 or invalid
    if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
        vidDuration = videoRef.value.duration
    }

    console.log('Click - Duration:', vidDuration, 'Ref Duration:', duration.value, 'Element Duration:', videoRef.value.duration)

    if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
        console.warn('Invalid duration, cannot seek')
        return
    }

    const progressBar = event.currentTarget as HTMLElement
    const rect = progressBar.getBoundingClientRect()
    const x = event.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * vidDuration
    
    console.log(`Seeking to: ${newTime} (${percentage * 100}%)`)
    
    videoRef.value.currentTime = newTime
    currentTime.value = newTime
}

const resetVideo = () => {
  videoUrl.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  // Cleanup if needed
})
</script>

<style scoped>
/* Add any specific styles here */
</style>
