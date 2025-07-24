<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Annotation Center
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Manage task assignments and track annotation progress
        </p>
      </div>      <div class="flex items-center gap-4">
        <UButton 
          v-if="selectedUnassignedTasks.length > 0" 
          @click="assignSelectedTasks" 
          :loading="assignLoading"
          color="primary"
        >
          <UIcon name="i-heroicons-user-plus" class="w-4 h-4 mr-2" />
          Assign ({{ selectedUnassignedTasks.length }})
        </UButton>
        <UButton 
          v-if="selectedAnnotatingTasks.length > 0" 
          @click="completeSelectedTasks" 
          :loading="completeLoading"
          color="success"
        >
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-2" />
          Complete ({{ selectedAnnotatingTasks.length }})
        </UButton>
        <UButton @click="refreshTasks" :loading="loading" variant="outline">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !tasks" class="flex items-center justify-center py-12">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading tasks...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div class="flex items-center">
        <UIcon name="i-heroicons-exclamation-circle" class="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
        <div>
          <h3 class="text-red-800 dark:text-red-300 font-medium">Error Loading Tasks</h3>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1">{{ error }}</p>
        </div>
      </div>      <UButton @click="refreshTasks" variant="outline" color="error" class="mt-4" size="sm">
        Try Again
      </UButton>
    </div>    <!-- Main Content -->
    <div v-else-if="tasks" class="space-y-6">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">Unassigned</p>
              <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{{ tasks.unassigned.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <UIcon name="i-heroicons-pencil" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-300">Annotating</p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-200">{{ tasks.annotating.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-300">Completed</p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-200">{{ tasks.completed.length }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
          >
            <div class="flex items-center">
              <UIcon :name="tab.icon" class="w-4 h-4 mr-2" />
              {{ tab.label }}
              <span class="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {{ getTaskCount(tab.key) }}
              </span>
            </div>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-4">        <!-- Unassigned Tab -->
        <div v-if="activeTab === 'unassigned'">
          <div v-if="tasks.unassigned.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Unassigned Tasks</h3>
            <p class="text-gray-500 dark:text-gray-400">All tasks have been assigned to team members.</p>
          </div>          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="task in tasks.unassigned" 
              :key="task.id" 
              :class="[
                'border p-4 rounded cursor-pointer transition-all',
                selectedUnassignedTasks.includes(task.id) 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 hover:border-blue-300'
              ]"
              @click="toggleUnassignedTaskSelection(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium">Task {{ task.id }}</h4>
                <UCheckbox 
                  :model-value="selectedUnassignedTasks.includes(task.id)"
                  @change="toggleUnassignedTaskSelection(task.id)"
                  @click.stop
                />
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Status: {{ task.status }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="task.dataUrl" class="w-full h-32 object-cover mt-2 rounded" />
            </div>
          </div>
        </div>        <!-- Annotating Tab -->
        <div v-if="activeTab === 'annotating'">
          <div v-if="tasks.annotating.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-pencil" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Tasks in Progress</h3>
            <p class="text-gray-500 dark:text-gray-400">No tasks are currently being annotated.</p>
          </div>          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="task in tasks.annotating" 
              :key="task.id" 
              :class="[
                'border p-4 rounded cursor-pointer transition-all relative',
                selectedAnnotatingTasks.includes(task.id)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-blue-500 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              ]"
              @click="toggleAnnotatingTaskSelection(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium">Task {{ task.id }}</h4>
                <div class="flex items-center gap-2">
                  <UCheckbox 
                    :model-value="selectedAnnotatingTasks.includes(task.id)"
                    @change="toggleAnnotatingTaskSelection(task.id)"
                    @click.stop
                  />
                  <UButton
                    @click.stop="navigateToAnnotate(task.id)"
                    size="xs"
                    variant="ghost"
                    color="secondary"
                  >
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
                  </UButton>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Status: {{ task.status }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="task.dataUrl" class="w-full h-32 object-cover mt-2 rounded" />
              <div v-if="!selectedAnnotatingTasks.includes(task.id)" class="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
                <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-1" />
                Click to select or continue annotation
              </div>
              <div v-else class="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
                Selected for completion
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Tab -->
        <div v-if="activeTab === 'completed'" @click.stop>
          <!-- Export Button Header -->
          <div v-if="tasks.completed.length > 0" class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Completed Tasks ({{ tasks.completed.length }})
            </h3>
<!--             <UButton 
              @click.stop="openExportModal" 
              color="success"
              variant="solid"
              :loading="exportLoading"
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
              Export Dataset
            </UButton> -->
          </div>
          <!-- Export Dataset Modal -->
          <UModal v-model="showExportModal">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Export Dataset
                  </h3>
                  <UButton 
                    color="neutral" 
                    variant="ghost" 
                    icon="i-heroicons-x-mark-20-solid" 
                    class="-my-1"
                    @click="closeExportModal"
                  />
                </div>
              </template>

              <div class="space-y-6">
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Export Format
                  </h4>
                  <div class="space-y-3">
                    <label class="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        v-model="selectedExportFormat" 
                        value="yolo"
                        class="text-primary focus:ring-primary"
                      >
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">YOLO Format</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Standard YOLO annotation format with normalized coordinates
                        </p>
                      </div>
                    </label>
                    <!-- Future formats can be added here -->
                    <label class="flex items-center space-x-3 opacity-50 cursor-not-allowed">
                      <input 
                        type="radio" 
                        disabled
                        class="text-gray-400"
                      >
                      <div>
                        <p class="text-sm font-medium text-gray-400">COCO Format</p>
                        <p class="text-xs text-gray-400">Coming soon...</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Dataset Split Configuration -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Dataset Split Configuration
                  </h4>
                  <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                      <!-- Train Split -->
                      <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Train (%)
                        </label>
                        <input 
                          type="number"
                          v-model.number="trainPercentage"
                          min="0"
                          max="100"
                          @input="updateSplitPercentages('train')"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      
                      <!-- Test Split -->
                      <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Test (%)
                        </label>
                        <input 
                          type="number"
                          v-model.number="testPercentage"
                          min="0"
                          max="100"
                          @input="updateSplitPercentages('test')"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      
                      <!-- Validation Split -->
                      <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Validation (%)
                        </label>
                        <input 
                          type="number"
                          v-model.number="validationPercentage"
                          min="0"
                          max="100"
                          @input="updateSplitPercentages('validation')"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <!-- Visual Progress Bars -->
                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Split Distribution</span>
                        <span class="font-medium" :class="totalPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          Total: {{ totalPercentage }}%
                        </span>
                      </div>
                      <div class="flex rounded-lg overflow-hidden h-2">
                        <div 
                          class="bg-blue-500 transition-all duration-200" 
                          :style="{ width: `${trainPercentage}%` }"
                          :title="`Train: ${trainPercentage}%`"
                        ></div>
                        <div 
                          class="bg-green-500 transition-all duration-200" 
                          :style="{ width: `${testPercentage}%` }"
                          :title="`Test: ${testPercentage}%`"
                        ></div>
                        <div 
                          class="bg-yellow-500 transition-all duration-200" 
                          :style="{ width: `${validationPercentage}%` }"
                          :title="`Validation: ${validationPercentage}%`"
                        ></div>
                      </div>
                      <div class="flex justify-between text-xs">
                        <span class="flex items-center">
                          <div class="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          Train ({{ Math.round((tasks?.completed?.length || 0) * trainPercentage / 100) }} tasks)
                        </span>
                        <span class="flex items-center">
                          <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          Test ({{ Math.round((tasks?.completed?.length || 0) * testPercentage / 100) }} tasks)
                        </span>
                        <span class="flex items-center">
                          <div class="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                          Validation ({{ Math.round((tasks?.completed?.length || 0) * validationPercentage / 100) }} tasks)
                        </span>
                      </div>
                    </div>
                    
                    <!-- Warning for invalid split -->
                    <div v-if="totalPercentage !== 100" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div class="flex items-start">
                        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
                        <div>
                          <p class="text-xs font-medium text-amber-800 dark:text-amber-300">Invalid Split</p>
                          <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Percentages must total exactly 100%. Current total: {{ totalPercentage }}%
                          </p>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>

                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div class="flex items-start">
                    <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                    <div>
                      <h5 class="text-sm font-medium text-blue-900 dark:text-blue-300">Export Information</h5>
                      <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        This will export {{ tasks?.completed?.length || 0 }} completed tasks with their annotations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex justify-end space-x-3">
                  <UButton 
                    color="neutral" 
                    variant="outline" 
                    @click="closeExportModal"
                  >
                    Cancel
                  </UButton>
                  <UButton 
                    color="primary" 
                    @click="handleExportDataset"
                    :loading="exportLoading"
                    :disabled="!selectedExportFormat || totalPercentage !== 100"
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
                    Export Dataset
                  </UButton>
                </div>
              </template>
            </UCard>
          </UModal>
          <div v-if="tasks.completed.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Completed Tasks</h3>
            <p class="text-gray-500 dark:text-gray-400">Completed tasks will appear here.</p>
          </div>          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="task in tasks.completed" :key="task.id" class="border border-purple-500 p-4 rounded">
              <h4>Task {{ task.id }}</h4>
              <p>Status: {{ task.status }}</p>
              <p>Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="task.dataUrl" class="w-full h-32 object-cover mt-2" />
            </div>
          </div>


        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

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

interface TasksResponse {
  data: {
    unassigned: Task[]
    annotating: Task[]
    completed: Task[]
  }
}

// Props
const props = defineProps<{
  projectId: string
}>()

// Reactive state
const loading = ref(false)
const error = ref<string | null>(null)
const tasks = ref<TasksResponse['data'] | null>(null)
const activeTab = ref<'unassigned' | 'annotating' | 'completed'>('unassigned')
const selectedUnassignedTasks = ref<number[]>([])
const selectedAnnotatingTasks = ref<number[]>([])
const assignLoading = ref(false)
const completeLoading = ref(false)

// Export functionality
const showExportModal = ref(false)
const selectedExportFormat = ref('yolo')
const exportLoading = ref(false)

// Dataset split percentages
const trainPercentage = ref(80)
const testPercentage = ref(10)
const validationPercentage = ref(10)

// Computed property for total percentage
const totalPercentage = computed(() => 
  trainPercentage.value + testPercentage.value + validationPercentage.value
)

// Tab configuration
const tabs = [
  {
    key: 'unassigned' as const,
    label: 'Unassigned',
    icon: 'i-heroicons-clock'
  },
  {
    key: 'annotating' as const,
    label: 'Annotating',
    icon: 'i-heroicons-pencil'
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    icon: 'i-heroicons-check-circle'
  }
]

// Computed
const getTaskCount = (tabKey: string) => {
  if (!tasks.value) return 0
  return tasks.value[tabKey as keyof typeof tasks.value]?.length || 0
}

// Auth
const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')
const toast = useToast()

// Methods
const fetchTasks = async () => {
  try {
    loading.value = true
    error.value = null
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    console.log('Fetching tasks for project:', props.projectId)
    console.log('Using token:', token.value ? 'Token exists' : 'No token')
    
    const response = await $fetch<TasksResponse>(`http://localhost:8787/api/tasks/project/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })
    
    console.log('API Response:', response)
    tasks.value = response.data
    console.log('Tasks set to:', tasks.value)
    
  } catch (err) {
    console.error('Error fetching tasks:', err)
    error.value = err instanceof Error ? err.message : 'Failed to fetch tasks'
  } finally {
    loading.value = false
  }
}

const refreshTasks = () => {
  fetchTasks()
}

// Task selection methods
const toggleUnassignedTaskSelection = (taskId: number) => {
  const index = selectedUnassignedTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedUnassignedTasks.value.splice(index, 1)
  } else {
    selectedUnassignedTasks.value.push(taskId)
  }
}

const toggleAnnotatingTaskSelection = (taskId: number) => {
  const index = selectedAnnotatingTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedAnnotatingTasks.value.splice(index, 1)
  } else {
    selectedAnnotatingTasks.value.push(taskId)
  }
}

const assignSelectedTasks = async () => {
  if (selectedUnassignedTasks.value.length === 0) return
  
  try {
    assignLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    const response = await $fetch('http://localhost:8787/api/tasks/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        taskId: selectedUnassignedTasks.value,
        status: 'annotating'
      }
    })
      console.log('Tasks assigned successfully:', response)
    
    // Show success toast
    toast.add({
      title: 'Tasks Assigned',
      description: `${selectedUnassignedTasks.value.length} task(s) assigned successfully`,
      color: 'success'
    })
    
    // Clear selection and refresh tasks
    selectedUnassignedTasks.value = []
    await fetchTasks()
      } catch (err) {
    console.error('Error assigning tasks:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to assign tasks'
    error.value = errorMessage
    
    // Show error toast
    toast.add({
      title: 'Assignment Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    assignLoading.value = false
  }
}

const completeSelectedTasks = async () => {
  if (selectedAnnotatingTasks.value.length === 0) return
  
  try {
    completeLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    const response = await $fetch('http://localhost:8787/api/tasks/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        taskId: selectedAnnotatingTasks.value,
        status: 'completed'
      }
    })
      console.log('Tasks completed successfully:', response)
    
    // Show success toast
    toast.add({
      title: 'Tasks Completed',
      description: `${selectedAnnotatingTasks.value.length} task(s) completed successfully`,
      color: 'success'
    })
    
    // Clear selection and refresh tasks
    selectedAnnotatingTasks.value = []
    await fetchTasks()
      } catch (err) {
    console.error('Error completing tasks:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to complete tasks'
    error.value = errorMessage
    
    // Show error toast
    toast.add({
      title: 'Completion Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    completeLoading.value = false
  }
}

// Task actions
const handleAssignTask = (task: Task) => {
  // TODO: Implement task assignment logic
  console.log('Assign task:', task.id)
}

const handleViewTask = (task: Task) => {
  // TODO: Implement task viewing logic
  console.log('View task:', task.id)
}

const handleContinueTask = (task: Task) => {
  // TODO: Implement continue annotation logic
  console.log('Continue task:', task.id)
}

const handleReviewTask = (task: Task) => {
  // TODO: Implement task review logic
  console.log('Review task:', task.id)
}

const navigateToAnnotate = (taskId: number) => {
  const router = useRouter()
  router.push(`/annotate/${taskId}`)
}

// Export functionality
const handleExportDataset = async () => {
  try {
    exportLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    console.log('Exporting dataset for project:', props.projectId)
    
    // Use native fetch instead of $fetch for better blob handling
    const response = await fetch(`http://localhost:8787/api/tasks/export/${props.projectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'export-format': selectedExportFormat.value
      },
      body: JSON.stringify({
        splitConfig: {
          train: trainPercentage.value,
          test: testPercentage.value,
          validation: validationPercentage.value
        }
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check if response is a ZIP file
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/zip')) {
      // Handle ZIP file download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `dataset_${props.projectId}_${selectedExportFormat.value}_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // Show success toast
      toast.add({
        title: 'Dataset Exported',
        description: `Dataset exported successfully in ${selectedExportFormat.value.toUpperCase()} format with ${trainPercentage.value}/${testPercentage.value}/${validationPercentage.value} split`,
        color: 'success'
      })
    } else {
      // Handle JSON response (fallback)
      const data = await response.json()
      console.log('Export response:', data)
      
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `dataset_${props.projectId}_${selectedExportFormat.value}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.add({
        title: 'Dataset Exported',
        description: `Dataset exported successfully as JSON`,
        color: 'success'
      })
    }
    
    // Close modal
    closeExportModal()
    
  } catch (err) {
    console.error('Error exporting dataset:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to export dataset'
    
    // Show error toast
    toast.add({
      title: 'Export Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    exportLoading.value = false
  }
}

// Modal management
const openExportModal = () => {
  console.log('Opening export modal')
  showExportModal.value = true
}

const closeExportModal = () => {
  console.log('Closing export modal')
  showExportModal.value = false
  // Reset form values to defaults when closing
  selectedExportFormat.value = 'yolo'
  trainPercentage.value = 80
  testPercentage.value = 10
  validationPercentage.value = 10
}

// Dataset split management
const updateSplitPercentages = (changedType: 'train' | 'test' | 'validation') => {
  // Ensure values don't go below 0 or above 100
  trainPercentage.value = Math.max(0, Math.min(100, trainPercentage.value))
  testPercentage.value = Math.max(0, Math.min(100, testPercentage.value))
  validationPercentage.value = Math.max(0, Math.min(100, validationPercentage.value))
  
  // Auto-adjust other percentages if total exceeds 100
  const total = trainPercentage.value + testPercentage.value + validationPercentage.value
  if (total > 100) {
    const excess = total - 100
    if (changedType === 'train') {
      // Reduce test and validation proportionally
      const remaining = testPercentage.value + validationPercentage.value
      if (remaining > 0) {
        const testRatio = testPercentage.value / remaining
        const validationRatio = validationPercentage.value / remaining
        testPercentage.value = Math.max(0, testPercentage.value - (excess * testRatio))
        validationPercentage.value = Math.max(0, validationPercentage.value - (excess * validationRatio))
      }
    } else if (changedType === 'test') {
      // Reduce train and validation proportionally
      const remaining = trainPercentage.value + validationPercentage.value
      if (remaining > 0) {
        const trainRatio = trainPercentage.value / remaining
        const validationRatio = validationPercentage.value / remaining
        trainPercentage.value = Math.max(0, trainPercentage.value - (excess * trainRatio))
        validationPercentage.value = Math.max(0, validationPercentage.value - (excess * validationRatio))
      }
    } else if (changedType === 'validation') {
      // Reduce train and test proportionally
      const remaining = trainPercentage.value + testPercentage.value
      if (remaining > 0) {
        const trainRatio = trainPercentage.value / remaining
        const testRatio = testPercentage.value / remaining
        trainPercentage.value = Math.max(0, trainPercentage.value - (excess * trainRatio))
        testPercentage.value = Math.max(0, testPercentage.value - (excess * testRatio))
      }
    }
  }
}

// Lifecycle
onMounted(() => {
  fetchTasks()
})

// Watch for project ID changes
watch(() => props.projectId, () => {
  if (props.projectId) {
    // Clear selections when switching projects
    selectedUnassignedTasks.value = []
    selectedAnnotatingTasks.value = []
    // Close modal when switching projects
    showExportModal.value = false
    fetchTasks()
  }
}, { immediate: true })
</script>
