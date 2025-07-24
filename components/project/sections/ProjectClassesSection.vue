<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading classes...</p>
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
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Project Classes</h2>
      </div>

      <!-- Classes Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div class="flex items-center">
            <UIcon name="i-heroicons-academic-cap" class="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p class="text-sm text-blue-600 dark:text-blue-400">Total Classes</p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-200">{{ classes.length }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div class="flex items-center">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p class="text-sm text-green-600 dark:text-green-400">Active Classes</p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-200">{{ classes.length }}</p>
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
      </div>      <!-- Class Management Section -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Manage Classes</h3>
        </template>

        <div class="space-y-6">
          <!-- Add Class Input -->
          <div class="flex space-x-2">
            <UInput
              v-model="newClassName"
              placeholder="Enter class name(s) - separate multiple with commas (e.g., 'cat, dog, person')"
              size="lg"
              :disabled="updating"
              class="flex-1"
              @keydown.enter="handleAddClassKeydown"
            />
            <UButton
              @click="addClass"
              :disabled="!newClassName.trim() || updating"
              icon="i-heroicons-plus"
              size="lg"
              color="primary"
            >
              Add
            </UButton>
          </div>

          <!-- Classes List -->
          <div v-if="classes.length > 0" class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Classes ({{ classes.length }})
              </h4>
              <UButton
                @click="updateClasses"
                :loading="updating"
                color="primary"
                size="sm"
                icon="i-heroicons-check"
              >
                Update Classes
              </UButton>
            </div>
            
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(className, index) in classes"
                :key="index"
                class="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20"
              >
                <span class="text-sm font-medium">{{ className }}</span>
                <UButton
                  @click="removeClass(index)"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  color="primary"
                  variant="ghost"
                  :disabled="updating"
                />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <UIcon name="i-heroicons-tag" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">No Classes</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Add your first class above to get started.</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

interface Props {
  projectId: string
}

interface Project {
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
    projects: Project
    project_relations: {
      id: number
      userId: number
      projectId: number
      roleId: number
      createdAt: number
      updatedAt: number
    }
  }
}

const props = defineProps<Props>()

// Auth and utils
const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')
const toast = useToast()

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const updating = ref(false)
const projectData = ref<Project | null>(null)
const classes = ref<string[]>([])
const newClassName = ref('')

// Computed properties
const getProjectTypeName = (type: number | undefined) => {
  if (!type) return 'Unknown'
  switch (type) {
    case 1: return 'Classification'
    case 2: return 'Object Detection'
    case 3: return 'Data Analysis'
    default: return 'Unknown'
  }
}

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
        'Authorization': `Bearer ${token.value}`
      }
    })
    
    // Extract project data from nested response
    projectData.value = response.data.projects
    
    // Extract classes from labelConfig
    if (response.data.projects.labelConfig?.classes) {
      classes.value = [...response.data.projects.labelConfig.classes]
    } else {
      classes.value = []
    }
    
  } catch (err) {
    console.error('Error fetching project data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load project data'
  } finally {
    loading.value = false
  }
}

const addClass = () => {
  const input = newClassName.value.trim()
  
  if (!input) {
    return
  }
  
  // Split by comma and clean up each class name
  const classNames = input
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
  
  if (classNames.length === 0) {
    return
  }
  
  const addedClasses: string[] = []
  const duplicateClasses: string[] = []
  
  // Process each class name
  classNames.forEach(className => {
    if (classes.value.includes(className)) {
      duplicateClasses.push(className)
    } else {
      classes.value.push(className)
      addedClasses.push(className)
    }
  })
  
  // Clear the input
  newClassName.value = ''
  
  // Show success message for added classes
  if (addedClasses.length > 0) {
    if (addedClasses.length === 1) {
      toast.add({
        title: 'Class Added',
        description: `Class "${addedClasses[0]}" has been added`,
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Classes Added', 
        description: `${addedClasses.length} classes have been added: ${addedClasses.join(', ')}`,
        color: 'success'
      })
    }
  }
  
  // Show warning for duplicates
  if (duplicateClasses.length > 0) {
    if (duplicateClasses.length === 1) {
      toast.add({
        title: 'Duplicate Class',
        description: `Class "${duplicateClasses[0]}" already exists`,
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Duplicate Classes',
        description: `${duplicateClasses.length} classes already exist: ${duplicateClasses.join(', ')}`,
        color: 'warning'
      })
    }
  }
}

const removeClass = (index: number) => {
  const className = classes.value[index]
  classes.value.splice(index, 1)
  
  toast.add({
    title: 'Class Removed',
    description: `Class "${className}" has been removed`,
    color: 'info'
  })
}

const handleAddClassKeydown = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  addClass()
}

const updateClasses = async () => {
  try {
    updating.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    if (!projectData.value) {
      throw new Error('Project data not loaded')
    }
      // Prepare the updated project data
    const updatedProject = {
      ...projectData.value,
      labelConfig: {
        classes: classes.value
      }
    }
    
    const response = await $fetch<ProjectResponse>(`http://localhost:8787/api/projects/${props.projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: updatedProject
    })
    
    // Update local project data from response
    if (response.data?.projects) {
      projectData.value = response.data.projects
    } else {
      projectData.value = updatedProject
    }
    
    toast.add({
      title: 'Classes Updated',
      description: `Project classes have been updated successfully`,
      color: 'success'
    })
    
  } catch (err) {
    console.error('Error updating classes:', err)
    toast.add({
      title: 'Update Failed',
      description: err instanceof Error ? err.message : 'Failed to update classes',
      color: 'error'
    })
  } finally {
    updating.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchProjectData()
})

// Watch for project ID changes
watch(() => props.projectId, () => {
  if (props.projectId) {
    fetchProjectData()
  }
}, { immediate: true })
</script>
