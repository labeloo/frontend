<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
        <p class="text-gray-600 dark:text-gray-300 mt-1">Organization overview and recent projects</p>
      </div>
      <UBadge color="primary" variant="subtle">
        {{ projects.length }} {{ projects.length === 1 ? 'Project' : 'Projects' }}
      </UBadge>
    </div>    <!-- Projects Loading -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading projects...</p>
    </div>

    <!-- No Projects State -->
    <div v-else-if="projects.length === 0" class="text-center py-12">
      <div class="mx-auto max-w-md">
        <div class="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-heroicons-folder-plus" class="w-12 h-12 text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Projects Yet</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Get started by creating your first project for this organization.
        </p>
        <UButton 
          color="secondary" 
          size="lg"
          icon="i-heroicons-plus"
          class="cursor-pointer"
          @click="createProject"
        >
          Create Project
        </UButton>
      </div>
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div 
        v-for="project in projects" 
        :key="project.id"
        class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-600"
        @click="viewProject(project.id)"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
              {{ project.name }}
            </h3>
            <p v-if="project.description" class="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">
              {{ project.description }}
            </p>
          </div>
          <UBadge 
            :color="getProjectTypeColor(project.projectType)" 
            variant="subtle"
            class="ml-2 flex-shrink-0"
          >
            Type {{ project.projectType }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span class="flex items-center space-x-1">
            <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
            <span>{{ formatDate(project.createdAt) }}</span>
          </span>
          <span class="flex items-center space-x-1">
            <UIcon name="i-heroicons-user" class="w-3 h-3" />
            <span>Role {{ project.roleId }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Organization Stats Section -->
    <div v-if="projects.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary">{{ projects.length }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Total Projects</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-success">{{ activeProjects }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Active Projects</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-warning">{{ recentProjects }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Recent Projects</div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Project {
  id: number
  organizationId: number
  organizationName: string
  organizationLogo: string
  name: string
  description: string
  projectType: number
  roleId: number
  createdAt: number
  updatedAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

// Reactive state
const projects = ref<Project[]>([])
const loading = ref(true)

// Token for API requests
const token = useCookie('auth_token')

// Computed properties
const activeProjects = computed(() => {
  // Assuming projects updated in the last 30 days are active
  const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60)
  return projects.value.filter(p => p.updatedAt > thirtyDaysAgo).length
})

const recentProjects = computed(() => {
  // Projects created in the last 7 days
  const sevenDaysAgo = Date.now() / 1000 - (7 * 24 * 60 * 60)
  return projects.value.filter(p => p.createdAt > sevenDaysAgo).length
})

// Methods
const fetchProjects = async () => {
  try {
    loading.value = true
    
    const response = await fetch('http://localhost:8787/api/projects/all', {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Filter projects for this organization
    if (data.data) {
      projects.value = data.data.filter((project: Project) => 
        project.organizationId === Number.parseInt(props.organizationId as string)
      )
    }
  } catch (err) {
    console.error('Error fetching projects:', err)
  } finally {
    loading.value = false
  }
}

const createProject = () => {
  console.log('Create project for organization:', props.organizationId)
  // Add your project creation logic here
}

const viewProject = (projectId: number) => {
  console.log('View project:', projectId)
  navigateTo(`/projects/${projectId}`)
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getProjectTypeColor = (type: number): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
  const colors: ('primary' | 'secondary' | 'success' | 'warning' | 'error')[] = ['primary', 'secondary', 'success', 'warning', 'error']
  return colors[type % colors.length] || 'primary'
}

// Lifecycle
onMounted(() => {
  fetchProjects()
})

// Watch for organization changes
watch(() => props.organizationId, () => {
  fetchProjects()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
