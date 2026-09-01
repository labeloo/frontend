<template>
  <div class="relative">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center bg-stock-200" :class="imageClass">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-stock-600" />
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center bg-stock-200" :class="imageClass">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-correct-500" />
    </div>
    
    <!-- Image -->
    <img 
      v-else-if="blobUrl" 
      :src="blobUrl" 
      :alt="alt"
      :class="imageClass"
      @error="handleImageError"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  src: string
  alt?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  class: ''
})

const loading = ref(true)
const error = ref(false)
const blobUrl = ref<string | null>(null)
const token = useCookie('auth_token')

const imageClass = computed(() => props.class || 'w-full h-32 object-cover')

const fetchImage = async () => {
  try {
    loading.value = true
    error.value = false
    
    if (!token.value) {
      throw new Error('No authentication token')
    }

    const response = await fetch(props.src, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const blob = await response.blob()
    blobUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    console.error('Error fetching authenticated image:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleImageError = () => {
  error.value = true
}

// Cleanup blob URL when component is unmounted
onUnmounted(() => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
  }
})

// Watch for src changes
watch(() => props.src, () => {
  if (props.src) {
    fetchImage()
  }
}, { immediate: true })
</script>
