<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Project Settings</h2>
      <p class="text-gray-600 dark:text-gray-300 mt-1">Manage your project configuration and preferences</p>
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

    <div v-else class="space-y-6">
      <!-- Project Info Card -->
      <UCard v-if="projectData" class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Current Project Information</h3>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-folder" class="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p class="text-sm text-blue-600 dark:text-blue-400">Project Name</p>
                <p class="text-lg font-bold text-blue-900 dark:text-blue-200">{{ projectData.name }}</p>
              </div>
            </div>
          </div>

          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p class="text-sm text-green-600 dark:text-green-400">Project Type</p>
                <p class="text-lg font-bold text-green-900 dark:text-green-200">{{ getProjectTypeName(projectData.projectType) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div class="flex items-center">
              <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p class="text-sm text-purple-600 dark:text-purple-400">Created</p>
                <p class="text-lg font-bold text-purple-900 dark:text-purple-200">{{ formatDate(projectData.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="projectData.description" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Description:</p>
          <p class="text-gray-900 dark:text-white">{{ projectData.description }}</p>
        </div>
      </UCard>

      <!-- General Settings -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">General Information</h3>
          
            <!-- Form -->
            <form @submit.prevent="saveGeneralSettings" class="space-y-8">
              <!-- Project Name -->
              <UFormGroup class="space-y-4">
                <template #label>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Project Name</span>
                </template>
                
                <!-- Clear Input Label -->
                <div class="mb-4 mt-6">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Enter a descriptive name for your project</span>
                </div>
                
                <div class="relative">
                  <UInput
                    v-model="formData.name"
                    placeholder="Enter project name"
                    size="lg"
                    :disabled="!isEditing"
                    class="w-full"
                  />
                </div>
                <template #help>
                  <span class="text-xs text-gray-500 dark:text-gray-400">This name will be visible to all project members</span>
                </template>
              </UFormGroup>

              <!-- Description -->
              <UFormGroup class="space-y-4">
                <template #label>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Project Description</span>
                </template>
                
                <!-- Clear Input Label -->
                <div class="mb-4 mt-6">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Describe the purpose and goals of this project</span>
                </div>
                
                <div class="relative w-full">
                  <UTextarea
                    v-model="formData.description"
                    placeholder="Enter project description"
                    :rows="4"
                    :disabled="!isEditing"
                    class="w-full"
                  />
                </div>
                <template #help>
                  <span class="text-xs text-gray-500 dark:text-gray-400">Provide context about what this project aims to achieve</span>
                </template>
              </UFormGroup>

              <!-- Project Type & Status -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UFormGroup class="space-y-4">
                  <template #label>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Project Type</span>
                  </template>
                  
                  <!-- Clear Input Label -->
                  <div class="mb-4 mt-6">
                    <span class="text-xs text-gray-500 dark:text-gray-400">Select the type of annotation project</span>
                  </div>
                  
                  <USelect
                    v-model="formData.type"
                    placeholder="Select project type"
                    :options="projectTypeOptions"
                    :disabled="!isEditing"
                    size="lg"
                    value-attribute="value"
                    option-attribute="label"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500 dark:text-gray-400">This determines the annotation tools available</span>
                  </template>
                </UFormGroup>
                
                <UFormGroup class="space-y-4">
                  <template #label>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Status</span>
                  </template>
                  
                  <!-- Clear Input Label -->
                  <div class="mb-4 mt-6">
                    <span class="text-xs text-gray-500 dark:text-gray-400">Current project status</span>
                  </div>
                  
                  <USelect
                    v-model="formData.status"
                    placeholder="Select status"
                    :options="statusOptions"
                    :disabled="!isEditing"
                    size="lg"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500 dark:text-gray-400">Controls project visibility and access</span>
                  </template>
                </UFormGroup>
              </div>

            <!-- Action Buttons -->
            <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="flex items-center gap-3">
                  <UButton 
                    v-if="!isEditing"
                    color="primary" 
                    @click="startEditing"
                    size="lg"
                  >
                    <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-2" />
                    Edit Settings
                  </UButton>
                  
                  <template v-else>
                    <UButton 
                      type="submit" 
                      color="primary" 
                      :loading="saving"
                      :disabled="!isFormValid || !hasUnsavedChanges"
                      size="lg"
                    >
                      <UIcon name="i-heroicons-check" class="w-4 h-4 mr-2" />
                      Save Changes
                    </UButton>
                    
                    <UButton 
                      color="neutral" 
                      variant="outline" 
                      @click="cancelEditing"
                      :disabled="saving"
                      size="lg"
                    >
                      Cancel
                    </UButton>
                  </template>
                </div>
              </div>
              
              <!-- Success/Info Messages -->
              <div v-if="hasUnsavedChanges || saved" class="mt-4 p-4 rounded-lg" :class="[
                saved 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              ]">
                <div class="flex items-center">
                  <UIcon 
                    :name="saved ? 'i-heroicons-check-circle' : 'i-heroicons-information-circle'" 
                    :class="[
                      'w-4 h-4 mr-3',
                      saved ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    ]" 
                  />
                  <span :class="[
                    'text-sm',
                    saved ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'
                  ]">
                    {{ saved ? 'Settings saved successfully!' : 'You have unsaved changes' }}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Project Statistics -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Project Statistics</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">15</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          </div>
          
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">45</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          </div>
          
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">71%</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
          </div>
        </div>
      </div>

      <!-- Review Workflow Section - Only shown to users with editProject permission -->
      <div v-if="canEditProject" class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div class="p-6">
          <div class="mb-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Review Workflow</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Configure how annotations are reviewed in this project
            </p>
          </div>
          
          <ReviewProjectReviewSettingsForm
            :project-id="Number(projectId)"
            :can-edit="canEditProject"
            @updated="handleReviewSettingsUpdated"
          />
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-800">
        <div class="p-6">
          <h3 class="text-lg font-medium text-red-600 dark:text-red-400 mb-6">Danger Zone</h3>
          
          <div class="space-y-6">
            <!-- Archive Project -->
            <div class="p-4 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Archive Project</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Archive this project to hide it from active projects. Archived projects can be restored later.
              </p>
              <UButton color="warning" variant="outline" size="sm">
                Archive Project
              </UButton>
            </div>

            <!-- Delete Project -->
            <div class="p-4 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Delete Project</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Permanently delete this project and all its data. This action cannot be undone.
              </p>
              <UButton color="error" variant="outline" size="sm">
                Delete Project
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Project Settings Component
 * 
 * Features:
 * - Real-time form validation
 * - Edit mode toggle
 * - Unsaved changes detection
 * - Toast notifications for success/error feedback
 * - Form state management
 */

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

interface Props {
  projectId: string
}

const props = defineProps<Props>()

// Auth
const token = useCookie('auth_token')
const toast = useToast()

// Reactive state
const isEditing = ref(false)
const saving = ref(false)
const saved = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const projectData = ref<ProjectData | null>(null)
const canEditProject = ref(false)

// Form state
const formData = ref({
  name: '',
  description: '',
  type: 1,
  status: 'active'
})

// Original data to compare for unsaved changes
const originalData = ref({
  name: '',
  description: '',
  type: 1,
  status: 'active'
})

// Options
const projectTypeOptions = [
  { label: 'Image Classification', value: 1 },
  { label: 'Object Detection', value: 2 },
  { label: 'Data Analysis', value: 3 },
  { label: 'Text Analysis', value: 4 },
  { label: 'Named Entity Recognition', value: 5 }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' }
]

// Methods
const fetchProjectData = async () => {
  try {
    loading.value = true
    error.value = null
    
    if (!token.value) {
      throw new Error('Authentication required')
    }

    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle the nested response structure
    if (response.data?.projects) {
      projectData.value = response.data.projects
      
      // Update form data with real project data
      const project = response.data.projects
      const projectFormData = {
        name: project.name || '',
        description: project.description || '',
        type: project.projectType || 1,
        status: 'active' // Default status since it's not in API response
      }
      
      formData.value = { ...projectFormData }
      originalData.value = { ...projectFormData }
      
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

/**
 * Fetch user permissions for this project
 */
const fetchPermissions = async () => {
  try {
    if (!token.value) return

    const response = await $fetch<{ data: { permissions: string[] } }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )

    canEditProject.value = response.data.permissions?.includes('editProject') ?? false
  } catch (err) {
    console.error('Error fetching permissions:', err)
    canEditProject.value = false
  }
}

/**
 * Handle review settings update
 */
const handleReviewSettingsUpdated = () => {
  toast.add({
    title: 'Review workflow updated',
    description: 'Project review settings have been saved successfully.',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  })
}

const getProjectTypeName = (type?: number) => {
  switch (type) {
    case 1: return 'Image Classification'
    case 2: return 'Object Detection'
    case 3: return 'Data Analysis'
    case 4: return 'Text Analysis'
    case 5: return 'Named Entity Recognition'
    default: return 'Unknown'
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Computed properties
const isFormValid = computed(() => {
  return formData.value.name.trim().length > 0 && 
         formData.value.description.trim().length > 0
})

const hasUnsavedChanges = computed(() => {
  return (
    formData.value.name !== originalData.value.name ||
    formData.value.description !== originalData.value.description ||
    formData.value.type !== originalData.value.type ||
    formData.value.status !== originalData.value.status
  )
})

// Methods
const startEditing = () => {
  isEditing.value = true
}

const cancelEditing = () => {
  // Reset form data to original values
  formData.value = { ...originalData.value }
  isEditing.value = false
  saved.value = false
}

const saveGeneralSettings = async () => {
  saving.value = true
  saved.value = false
  
  try {
    // Basic validation
    if (!formData.value.name.trim()) {
      throw new Error('Project name is required')
    }

    if (!formData.value.description.trim()) {
      throw new Error('Project description is required')
    }

    if (!projectData.value?.id) {
      throw new Error('Project ID not found')
    }

    const updateData = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      projectType: formData.value.type
    }

    const response = await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectData.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: updateData
    })

    console.log('Project settings saved successfully:', response)

    // Update original data to match saved data
    originalData.value = { ...formData.value }
    
    // Update project data with new values
    if (projectData.value) {
      projectData.value.name = formData.value.name
      projectData.value.description = formData.value.description
      projectData.value.projectType = formData.value.type
    }
    
    // Show success state
    saved.value = true
    isEditing.value = false
    
    // Show success toast
    const toast = useToast()
    toast.add({
      title: 'Settings saved',
      description: 'Project settings have been updated successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    // Reset saved state after 2 seconds
    setTimeout(() => {
      saved.value = false
    }, 2000)
    
  } catch (error: any) {
    console.error('Error saving project settings:', error)
    
    // Show error toast
    const toast = useToast()
    toast.add({
      title: 'Failed to save settings',
      description: error.message || 'An error occurred while saving project settings.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchProjectData()
  fetchPermissions()
})

// Warn user before leaving with unsaved changes
onMounted(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value && isEditing.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})
</script>
