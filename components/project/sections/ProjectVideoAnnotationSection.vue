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
      <div class="flex-1 relative bg-black flex items-center justify-center overflow-hidden" ref="videoContainerRef">
        <div class="relative" :style="videoContainerStyle">
            <video
            ref="videoRef"
            :src="videoUrl"
            class="w-full h-full block"
            @loadedmetadata="onVideoLoaded"
            @durationchange="onDurationChange"
            @timeupdate="onTimeUpdate"
            @ended="isPlaying = false"
            ></video>
            
            <!-- Interaction Layer -->
            <div 
                class="absolute inset-0 cursor-crosshair z-10"
                @click="handleVideoClick"
            ></div>

            <!-- SVG Overlay for Annotations -->
            <svg 
                class="absolute inset-0 pointer-events-none z-20"
                :viewBox="`0 0 ${videoNaturalWidth} ${videoNaturalHeight}`"
                preserveAspectRatio="none"
            >
                <polygon
                    v-for="(ann, index) in currentAnnotations"
                    :key="index"
                    :points="formatPoints(ann.points)"
                    fill="rgba(0, 255, 0, 0.3)"
                    stroke="rgba(0, 255, 0, 0.8)"
                    stroke-width="2"
                />
            </svg>
        </div>
      </div>

      <!-- Controls Section (Below Video) -->
      <div class="bg-gray-800 border-t border-gray-700 p-4">
        <!-- Debug Info (Temporary) -->
        <div class="text-xs text-gray-500 mb-2 font-mono">
            Time: {{ currentTime.toFixed(2) }} / {{ duration.toFixed(2) }} | 
            Frame: {{ currentFrame }} |
            Status: {{ sam2Status }}
        </div>

        <!-- Progress Bar Container -->
        <div 
            class="relative w-full h-6 mb-2 cursor-pointer group/progress flex items-center" 
            @click="handleProgressBarClick"
        >
            <!-- Background Track -->
            <div class="w-full h-2 bg-gray-600 rounded-lg group-hover/progress:h-3 transition-all duration-200 relative overflow-hidden">
                <!-- Progress Fill -->
                <div 
                    class="absolute top-0 left-0 h-full bg-primary-500 rounded-lg pointer-events-none transition-all duration-100"
                    :style="{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }"
                ></div>
                <!-- Propagated Frames Indicator (Optional) -->
                <div 
                    v-for="frame in propagatedFrames" 
                    :key="frame"
                    class="absolute top-0 h-full bg-green-500/50 w-[2px]"
                    :style="{ left: `${(frame / totalFrames) * 100}%` }"
                ></div>
            </div>
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
                color="primary"
                icon="i-heroicons-sparkles"
                :loading="isPropagating"
                @click="propagateVideo"
                :disabled="!hasClicks"
             >
                Render / Propagate
             </UButton>
             
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
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  projectId: string
}>()

const { fetch: apiFetch, url: apiUrl } = useApi()
const toast = useToast()

// SAM 2 Configuration
const SAM2_API_URL = 'http://localhost:8000' // Adjust if needed

const fileInput = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const videoContainerRef = ref<HTMLElement | null>(null)
const isUploading = ref(false)
const videoUrl = ref<string | null>(null)
const videoUuid = ref<string | null>(null)
const videoPath = ref<string | null>(null) // Absolute path on server
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const fps = ref(30) // Default FPS, should be detected or passed
const videoNaturalWidth = ref(0)
const videoNaturalHeight = ref(0)
const containerWidth = ref(0)
const containerHeight = ref(0)

// SAM 2 State
const sam2Status = ref<'idle' | 'initializing' | 'ready' | 'error'>('idle')
const isPropagating = ref(false)
const propagatedAnnotations = ref<Record<number, any[]>>({}) // frame_idx -> annotations
const currentClickAnnotations = ref<any[]>([]) // Annotations for the current frame from clicks
const hasClicks = ref(false)

const currentFrame = computed(() => Math.floor(currentTime.value * fps.value))
const totalFrames = computed(() => Math.floor(duration.value * fps.value))

const currentAnnotations = computed(() => {
    // Prefer propagated annotations if available for this frame
    if (propagatedAnnotations.value[currentFrame.value]) {
        return propagatedAnnotations.value[currentFrame.value]
    }
    // Otherwise show click feedback if we are on the frame where we clicked
    // Note: This logic might need refinement. For now, we just show what we have.
    // If we just clicked, we want to show the result.
    // But if we move away and come back, we might want to show it too.
    // Ideally, clicks should be stored per frame too.
    return currentClickAnnotations.value.filter(a => {
        // Only show if we are on the frame (or close enough?)
        // For now, let's assume clicks are transient until propagated, 
        // OR we store them in a separate structure per frame.
        // Let's simplify: currentClickAnnotations is just for the *last* click action.
        // If we want to support multiple keyframes, we need a map.
        return true 
    })
})

const propagatedFrames = computed(() => {
    return Object.keys(propagatedAnnotations.value).map(Number)
})

// Video sizing logic
const videoContainerStyle = computed(() => {
    if (!videoNaturalWidth.value || !videoNaturalHeight.value || !containerWidth.value || !containerHeight.value) {
        return { width: '100%', height: '100%' }
    }
    
    const videoRatio = videoNaturalWidth.value / videoNaturalHeight.value
    const containerRatio = containerWidth.value / containerHeight.value
    
    let width, height
    
    if (containerRatio > videoRatio) {
        height = containerHeight.value
        width = height * videoRatio
    } else {
        width = containerWidth.value
        height = width / videoRatio
    }
    
    return {
        width: `${width}px`,
        height: `${height}px`
    }
})

// Resize observer for container
let resizeObserver: ResizeObserver | null = null

watch(videoContainerRef, (el) => {
    if (el) {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                containerWidth.value = entry.contentRect.width
                containerHeight.value = entry.contentRect.height
            }
        })
        resizeObserver.observe(el)
    } else {
        resizeObserver?.disconnect()
    }
})

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
        videoUuid.value = uploadedFile.uuid
        videoPath.value = uploadedFile.path // Capture absolute path
        
        toast.add({ title: 'Success', description: 'Video uploaded successfully', color: 'green' })
        
        // Initialize SAM 2
        if (videoPath.value) {
            await initSam2(videoPath.value)
        }
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

const initSam2 = async (path: string) => {
    sam2Status.value = 'initializing'
    try {
        const res = await fetch(`${SAM2_API_URL}/video/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_path: path })
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || 'Failed to init SAM 2')
        }
        sam2Status.value = 'ready'
        toast.add({ title: 'SAM 2 Ready', description: 'Video initialized for segmentation', color: 'green' })
    } catch (e: any) {
        console.error(e)
        sam2Status.value = 'error'
        toast.add({ title: 'Error', description: e.message || 'Failed to initialize SAM 2', color: 'red' })
    }
}

const handleVideoClick = async (event: MouseEvent) => {
    if (sam2Status.value !== 'ready' || !videoPath.value) return
    
    // Calculate coordinates relative to the video element (which matches natural size aspect ratio)
    // The click event is on the overlay which matches the video size exactly due to our layout
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    // Click coordinates in element space
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    
    // Scale to video natural size
    const scaleX = videoNaturalWidth.value / rect.width
    const scaleY = videoNaturalHeight.value / rect.height
    
    const x = clickX * scaleX
    const y = clickY * scaleY
    
    console.log(`Click at ${x}, ${y} (Frame: ${currentFrame.value})`)
    
    try {
        const res = await fetch(`${SAM2_API_URL}/video/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video_path: videoPath.value,
                frame_idx: currentFrame.value,
                x,
                y,
                label: 1, // Foreground
                obj_id: 1 // Default object ID
            })
        })
        
        if (!res.ok) throw new Error('Click failed')
        
        const data = await res.json()
        // data.annotations is List[Annotation]
        currentClickAnnotations.value = data.annotations
        hasClicks.value = true
        
        // Clear propagated annotations for this frame to show the new click result immediately
        // (Optional: might want to clear all propagation if we modify the seed)
        
    } catch (e) {
        console.error(e)
        toast.add({ title: 'Error', description: 'Failed to process click', color: 'red' })
    }
}

const propagateVideo = async () => {
    if (!videoPath.value) return
    isPropagating.value = true
    try {
        const res = await fetch(`${SAM2_API_URL}/video/propagate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_path: videoPath.value })
        })
        
        if (!res.ok) throw new Error('Propagation failed')
        
        const data = await res.json()
        // data.annotations is { frame_idx: [Annotation] }
        propagatedAnnotations.value = data.annotations
        toast.add({ title: 'Success', description: 'Segmentation propagated', color: 'green' })
    } catch (e) {
        console.error(e)
        toast.add({ title: 'Error', description: 'Propagation failed', color: 'red' })
    } finally {
        isPropagating.value = false
    }
}

const formatPoints = (points: {x: number, y: number}[]) => {
    return points.map(p => `${p.x},${p.y}`).join(' ')
}

const onDurationChange = () => {
    if (videoRef.value) {
        duration.value = videoRef.value.duration
    }
}

const onVideoLoaded = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
    videoNaturalWidth.value = videoRef.value.videoWidth
    videoNaturalHeight.value = videoRef.value.videoHeight
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
  
  if (!videoRef.value.paused) {
    videoRef.value.pause()
    isPlaying.value = false
  }

  let vidDuration = duration.value
  if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
      vidDuration = videoRef.value.duration
  }

  const current = videoRef.value.currentTime
  const frameTime = 1 / fps.value
  let newTime = current + (frames * frameTime)
  newTime = Math.max(0, Math.min(newTime, vidDuration))
  
  videoRef.value.currentTime = newTime
  currentTime.value = newTime
}

const handleProgressBarClick = (event: MouseEvent) => {
    if (!videoRef.value) return
    
    let vidDuration = duration.value
    if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) {
        vidDuration = videoRef.value.duration
    }

    if (!vidDuration || isNaN(vidDuration) || !isFinite(vidDuration)) return

    const progressBar = event.currentTarget as HTMLElement
    const rect = progressBar.getBoundingClientRect()
    const x = event.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * vidDuration
    
    videoRef.value.currentTime = newTime
    currentTime.value = newTime
}

const resetVideo = async () => {
  if (videoPath.value) {
      try {
          await fetch(`${SAM2_API_URL}/video/reset`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ video_path: videoPath.value })
          })
      } catch (e) {
          console.error('Failed to reset video on server', e)
      }
  }

  videoUrl.value = null
  videoPath.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
  propagatedAnnotations.value = {}
  currentClickAnnotations.value = []
  hasClicks.value = false
  sam2Status.value = 'idle'
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
/* Add any specific styles here */
</style>
