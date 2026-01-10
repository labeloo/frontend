<!-- 
  TaskAssignmentSlider Component
  
  A comprehensive task assignment interface that allows users to:
  - Select the number of tasks to assign using an interactive slider
  - Preview the tasks that will be assigned
  - Get time estimates for completion
  - Use quick selection presets (1, 5, 10, 25, 50, All)
  - See visual feedback during assignment
  - Track assignment progress
  
  Uses the backend endpoint: POST /api/tasks/assign/:taskId
  Requires authentication via JWT token
-->
<template>
  <div class="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <UIcon name="i-heroicons-user-plus" class="w-5 h-5 mr-2" />
          Bulk Task Assignment
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Assign multiple tasks to organization members
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <UBadge 
          v-if="availableTasks > 0" 
          color="primary" 
          variant="subtle"
          size="md"
        >
          {{ availableTasks }} available
        </UBadge>
        <UBadge 
          v-else 
          color="neutral" 
          variant="subtle"
          size="md"
        >
          No tasks available
        </UBadge>
      </div>
    </div>

    <!-- Assignment Success Animation -->
    <div 
      v-if="showSuccessAnimation" 
      class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 transition-all duration-500 ease-in-out"
    >
      <div class="flex items-center">
        <div class="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg animate-pulse">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div class="ml-3">
          <h4 class="text-sm font-medium text-green-900 dark:text-green-300">
            Tasks Assigned Successfully!
          </h4>
          <p class="text-xs text-green-700 dark:text-green-400 mt-1">
            {{ lastAssignedCount }} {{ lastAssignedCount === 1 ? 'task' : 'tasks' }} assigned to {{ selectedUser?.email || 'user' }}. Assignment completed successfully.
          </p>
        </div>
      </div>
    </div>

    <div v-if="availableTasks > 0" class="space-y-4">
      <!-- Slider Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of tasks to assign:
          </label>
          <div class="flex items-center space-x-2">
            <span class="text-lg font-bold text-primary">{{ selectedTaskCount }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              / {{ availableTasks }} tasks
            </span>
          </div>
        </div>

        <!-- Custom Range Slider -->
        <div class="relative">
          <input
            v-model.number="selectedTaskCount"
            type="range"
            :min="minTasks"
            :max="availableTasks"
            :step="1"
            class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            :style="sliderStyle"
          />
          
          <!-- Tick marks for better UX -->
          <div class="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
            <span>{{ minTasks }}</span>
            <span v-if="availableTasks >= 25">{{ Math.floor(availableTasks * 0.25) }}</span>
            <span v-if="availableTasks >= 10">{{ Math.floor(availableTasks * 0.5) }}</span>
            <span v-if="availableTasks >= 25">{{ Math.floor(availableTasks * 0.75) }}</span>
            <span>{{ availableTasks }}</span>
          </div>
        </div>

        <!-- Quick Selection Buttons -->
        <div class="flex items-center space-x-2 mt-3">
          <span class="text-sm text-gray-600 dark:text-gray-400">Quick select:</span>
          <UButton
            v-for="preset in quickSelectPresets"
            :key="preset.label"
            @click="setTaskCount(preset.value)"
            size="xs"
            variant="outline"
            :color="selectedTaskCount === preset.value ? 'primary' : 'neutral'"
            class="cursor-pointer"
          >
            {{ preset.label }}
          </UButton>
        </div>
      </div>

      <!-- Task Preview -->
      <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                Assignment Preview
              </h4>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                {{ selectedTaskCount }} {{ selectedTaskCount === 1 ? 'task' : 'tasks' }} will be assigned to selected user
              </p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              Estimated time: {{ estimatedTime }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ estimatedTimePerTask }}min per task
            </div>
          </div>
        </div>

        <!-- Progress visualization -->
        <div class="mt-3">
          <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Assignment progress</span>
            <span>{{ Math.round((selectedTaskCount / availableTasks) * 100) }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              class="bg-gradient-to-r from-primary to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              :style="{ width: `${(selectedTaskCount / availableTasks) * 100}%` }"
            ></div>
          </div>
          
          <!-- Task Preview Info -->
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Tasks {{ selectedTaskCount > 1 ? `#${props.unassignedTasks.slice(0, selectedTaskCount).map(t => t.id).join(', #')}` : `#${props.unassignedTasks[0]?.id || 'N/A'}` }}</span>
            <span>{{ availableTasks - selectedTaskCount }} remaining</span>
          </div>
        </div>
      </div>

      <!-- User Selection -->
      <div v-if="showUserSelection || isAssigning" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
          <UIcon name="i-heroicons-user-circle" class="w-4 h-4 mr-2" />
          Select User to Assign Tasks
        </h4>
        
        <div class="space-y-3">
          <!-- User Selection Dropdown -->
          <div v-if="loadingUsers" class="flex items-center justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-blue-600 mr-2" />
            <span class="text-sm text-blue-600">Loading organization users...</span>
          </div>
          
          <div v-else-if="userOptions.length === 0" class="text-center py-4">
            <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500">No organization users found</p>
          </div>
          
          <div v-else class="space-y-2">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300">
              Assign to:
            </label>
            <USelect
              v-model="selectedUserId"
              :items="userOptions"
              placeholder="Select a user..."
              size="md"
              class="w-full"
            />
            
            <!-- Selected User Preview -->
            <div v-if="selectedUser" class="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md p-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              <span>
                Tasks will be assigned to <strong>{{ selectedUser.email }}</strong> ({{ selectedUser.role }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Assignment Action -->
      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
          <span>{{ showUserSelection ? 'Select user and assign tasks' : 'Click assign to choose user' }}</span>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Reset Button -->
          <UButton
            v-if="selectedTaskCount !== Math.min(5, availableTasks)"
            @click="resetToDefault"
            :disabled="isAssigning"
            variant="ghost"
            size="sm"
            color="neutral"
            class="cursor-pointer"
          >
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-3 h-3 mr-1" />
            Reset
          </UButton>
          
          <!-- Cancel Assignment Button (when user selection is shown) -->
          <UButton
            v-if="showUserSelection && !isAssigning"
            @click="showUserSelection = false"
            variant="outline"
            size="md"
            color="neutral"
            class="cursor-pointer"
          >
            Cancel
          </UButton>
          
          <!-- Main Assignment Button -->
          <UButton
            v-if="!showUserSelection"
            @click="() => { 
              console.log('Showing user selection, current users:', organizationUsers.length); 
              showUserSelection = true; 
              if (organizationUsers.length === 0) {
                console.log('No users loaded, fetching project data');
                fetchProjectData(); 
              }
            }"
            :disabled="selectedTaskCount === 0 || availableTasks === 0"
            size="lg"
            color="primary"
            class="cursor-pointer px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <UIcon name="i-heroicons-user-plus" class="w-4 h-4 mr-2" />
            Assign {{ selectedTaskCount }} {{ selectedTaskCount === 1 ? 'Task' : 'Tasks' }}
          </UButton>
          
          <!-- Confirm Assignment Button (when user is selected) -->
          <UButton
            v-else
            @click="handleAssignTasks"
            :loading="isAssigning"
            :disabled="!selectedUserId || selectedTaskCount === 0"
            size="lg"
            color="success"
            class="cursor-pointer px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <UIcon name="i-heroicons-check" class="w-4 h-4 mr-2" />
            {{ isAssigning ? 'Assigning...' : 'Confirm Assignment' }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- No Tasks Available State -->
    <div v-else class="text-center py-8">
      <UIcon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No Tasks Available
      </h3>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        All tasks have been assigned or there are no unassigned tasks in this project.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getUserIdFromToken } from '~/utils/jwt'

interface Task {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: 'unassigned' | 'annotating' | 'completed'
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
}

interface OrganizationUser {
  id: number
  email: string
  isActive: boolean
  role: string
  createdAt: number
}

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

// Props
const props = defineProps<{
  availableTasks: number
  unassignedTasks: Task[]
  projectId: string
}>()

// Emits
const emit = defineEmits<{
  tasksAssigned: [taskIds: number[]]
  assignmentError: [error: string]
}>()

// Composables
const toast = useToast()
const token = useCookie('auth_token')

// State
const selectedTaskCount = ref(1)
const isAssigning = ref(false)
const estimatedTimePerTask = ref(5) // 5 minutes per task estimate
const showSuccessAnimation = ref(false)
const lastAssignedCount = ref(0)

// Organization and user assignment state
const organizationUsers = ref<OrganizationUser[]>([])
const selectedUserId = ref<number | undefined>(undefined)
const showUserSelection = ref(false)
const loadingUsers = ref(false)
const organizationId = ref<number | null>(null)

// Computed
const minTasks = computed(() => Math.min(1, props.availableTasks))
const maxTasks = computed(() => props.availableTasks)

const quickSelectPresets = computed(() => {
  const presets = []
  const available = props.availableTasks
  
  if (available >= 1) presets.push({ label: '1', value: 1 })
  if (available >= 5) presets.push({ label: '5', value: 5 })
  if (available >= 10) presets.push({ label: '10', value: 10 })
  if (available >= 25) presets.push({ label: '25', value: 25 })
  if (available >= 50) presets.push({ label: '50', value: 50 })
  if (available > 50) presets.push({ label: 'All', value: available })
  
  return presets
})

const estimatedTime = computed(() => {
  const totalMinutes = selectedTaskCount.value * estimatedTimePerTask.value
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
})

const sliderStyle = computed(() => {
  const percentage = (selectedTaskCount.value - minTasks.value) / (maxTasks.value - minTasks.value) * 100
  return {
    background: `linear-gradient(to right, #0B2139 0%, #0B2139 ${percentage}%, #d1d5db ${percentage}%, #d1d5db 100%)`
  }
})

const userOptions = computed(() => {
  console.log('Computing user options from organization users:', organizationUsers.value)
  const options = organizationUsers.value
    .filter(user => user.isActive)
    .map(user => ({
      label: `${user.email} (${user.role})`,
      value: user.id,
      email: user.email,
      role: user.role
    }))
  console.log('Generated user options:', options)
  return options
})

const selectedUser = computed(() => {
  return organizationUsers.value.find(user => user.id === selectedUserId.value)
})

const taskPreviewIds = computed(() => {
  return props.unassignedTasks
    .slice(0, selectedTaskCount.value)
    .map(task => task.id)
})

// Get current user ID from JWT token for auto-selection
const currentUserId = computed(() => {
  return getUserIdFromToken(token.value)
})

// Methods
const setTaskCount = (count: number) => {
  selectedTaskCount.value = Math.min(count, props.availableTasks)
}

const resetToDefault = () => {
  const defaultCount = Math.min(5, props.availableTasks, 10)
  selectedTaskCount.value = Math.max(minTasks.value, defaultCount)
}

// Fetch project data to get organization ID
const fetchProjectData = async () => {
  if (!token.value || !props.projectId) return

  try {
    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    if (response?.data?.projects?.organizationId) {
      organizationId.value = response.data.projects.organizationId
      await fetchOrganizationUsers()
    }
  } catch (error) {
    console.error('Error fetching project data:', error)
  }
}

// Fetch organization users
const fetchOrganizationUsers = async () => {
  if (!token.value || !organizationId.value) return

  try {
    loadingUsers.value = true
    
    const response = await $fetch<{ data: OrganizationUser[] }>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': organizationId.value.toString()
      }
    })

    console.log('Organization users API response:', response)
    
    if (response?.data && Array.isArray(response.data)) {
      // Store all users first, then filter active ones for selection
      organizationUsers.value = response.data
      console.log('Stored organization users:', organizationUsers.value)
      
      const activeUsers = organizationUsers.value.filter(user => user.isActive)
      console.log('Active users:', activeUsers)
      
      // Auto-select current user if available
      const currentUser = activeUsers.find(user => user.id === currentUserId.value)
      if (currentUser) {
        selectedUserId.value = currentUser.id
        console.log('Auto-selected current user:', currentUser.email)
      } else if (activeUsers.length > 0) {
        selectedUserId.value = activeUsers[0]?.id
        console.log('Auto-selected first user:', activeUsers[0]?.email)
      }
    } else {
      console.log('No valid data in response or data is not an array')
      organizationUsers.value = []
    }
  } catch (error) {
    console.error('Error fetching organization users:', error)
    toast.add({
      title: 'Error Loading Users',
      description: 'Failed to load organization users for assignment',
      color: 'error'
    })
  } finally {
    loadingUsers.value = false
  }
}

const handleAssignTasks = async () => {
  if (!selectedUserId.value) {
    toast.add({
      title: 'No User Selected',
      description: 'Please select a user to assign tasks to.',
      color: 'error'
    })
    return
  }

  if (!token.value) {
    toast.add({
      title: 'Authentication Required',
      description: 'Please log in to assign tasks.',
      color: 'error'
    })
    return
  }

  if (selectedTaskCount.value === 0 || selectedTaskCount.value > props.availableTasks) {
    toast.add({
      title: 'Invalid Selection',
      description: 'Please select a valid number of tasks to assign.',
      color: 'error'
    })
    return
  }

  try {
    isAssigning.value = true

    // Get the first N unassigned tasks
    const tasksToAssign = props.unassignedTasks
      .slice(0, selectedTaskCount.value)
      .map(task => task.id)

    if (tasksToAssign.length !== selectedTaskCount.value) {
      throw new Error(`Only ${tasksToAssign.length} tasks are available for assignment`)
    }

    console.log('Assigning tasks:', {
      taskIds: tasksToAssign,
      userId: selectedUserId.value,
      selectedUser: selectedUser.value?.email,
      count: selectedTaskCount.value
    })

    // Assign each task using the backend endpoint
    const assignmentPromises = tasksToAssign.map(async (taskId) => {
      const response = await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/assign/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        },
        body: {
          userId: selectedUserId.value
        }
      })
      return { taskId, response }
    })

    const results = await Promise.allSettled(assignmentPromises)
    
    // Check for any failed assignments
    const failed = results.filter(result => result.status === 'rejected')
    const succeeded = results.filter(result => result.status === 'fulfilled')

    if (failed.length > 0) {
      console.error('Some task assignments failed:', failed)
      throw new Error(`${failed.length} out of ${selectedTaskCount.value} task assignments failed`)
    }

    // Success - emit the assigned task IDs
    emit('tasksAssigned', tasksToAssign)
    
    // Show success animation
    lastAssignedCount.value = selectedTaskCount.value
    showSuccessAnimation.value = true
    
    // Hide success animation after 3 seconds
    setTimeout(() => {
      showSuccessAnimation.value = false
    }, 3000)
    
    toast.add({
      title: 'Tasks Assigned Successfully',
      description: `${selectedTaskCount.value} ${selectedTaskCount.value === 1 ? 'task' : 'tasks'} assigned to ${selectedUser.value?.email || 'user'}. Estimated completion time: ${estimatedTime.value}`,
      color: 'success'
    })

    // Hide user selection and reset selection
    showUserSelection.value = false
    selectedTaskCount.value = Math.min(1, props.availableTasks - selectedTaskCount.value)

  } catch (error) {
    console.error('Error assigning tasks:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign tasks'
    
    emit('assignmentError', errorMessage)
    
    toast.add({
      title: 'Assignment Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    isAssigning.value = false
  }
}

// Watchers
watch(() => props.availableTasks, (newCount) => {
  // Adjust selected count if it exceeds available tasks
  if (selectedTaskCount.value > newCount) {
    selectedTaskCount.value = Math.max(minTasks.value, newCount)
  }
}, { immediate: true })

// Initialize with reasonable default
onMounted(async () => {
  const defaultCount = Math.min(5, props.availableTasks, 10) // Default to 5 tasks or available count
  selectedTaskCount.value = Math.max(minTasks.value, defaultCount)
  
  // Fetch project data to get organization users when component loads
  if (props.projectId) {
    console.log('Component mounted, fetching project data for projectId:', props.projectId)
    await fetchProjectData()
  }
})
</script>

<style scoped>
/* Custom slider styling */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #0B2139;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 2px solid white;
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #0B2139;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 2px solid white;
  border: none;
}

.slider::-webkit-slider-track {
  height: 12px;
  cursor: pointer;
  border-radius: 6px;
}

.slider::-moz-range-track {
  height: 12px;
  cursor: pointer;
  border-radius: 6px;
  background: #d1d5db;
  border: none;
}

.slider:focus {
  outline: none;
}

.slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(11, 33, 57, 0.3);
}

.slider:focus::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgba(11, 33, 57, 0.3);
}
</style>