<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
        <p class="text-gray-600 dark:text-gray-300 mt-1">Organization summary and quick insights</p>
      </div>
      <UBadge color="primary" variant="subtle">
        {{ projects.length }} {{ projects.length === 1 ? 'Project' : 'Projects' }}
      </UBadge>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading overview...</p>
    </div>

    <!-- Overview Content -->
    <div v-else>
      <!-- Quick Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- Projects Card -->
        <UCard class="hover:shadow-lg transition-shadow duration-200">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UIcon name="i-heroicons-folder" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ projects.length || '0' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Projects</p>
            </div>
          </div>
        </UCard>

        <!-- Users Card -->
        <UCard class="hover:shadow-lg transition-shadow duration-200">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UIcon name="i-heroicons-users" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ users.length || '0' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Members</p>
            </div>
          </div>
        </UCard>

        <!-- Roles Card -->
        <UCard class="hover:shadow-lg transition-shadow duration-200">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ roles.length || '0' }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Roles</p>
            </div>
          </div>
        </UCard>

        <!-- Active Projects Card -->
        <UCard class="hover:shadow-lg transition-shadow duration-200">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <UIcon name="i-heroicons-fire" class="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ activeProjects }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">(Last 30 days)</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Recent Projects Section -->
      <div v-if="projects.length > 0" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Projects</h3>
          <UButton variant="ghost" size="sm" @click="navigateToSection('projects')">
            View All
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 ml-1" />
          </UButton>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard 
            v-for="project in recentProjectsList" 
            :key="project.id"
            class="hover:shadow-md transition-shadow duration-200 cursor-pointer"
            @click="viewProject(project.id)"
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <h4 class="font-medium text-gray-900 dark:text-white truncate">{{ project.name }}</h4>
                <UBadge 
                  :color="getProjectTypeColor(project.projectType)" 
                  variant="subtle"
                  size="xs"
                >
                  Type {{ project.projectType }}
                </UBadge>
              </div>
              <p v-if="project.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ project.description }}
              </p>
              <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span class="flex items-center space-x-1">
                  <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                  <span>{{ formatDate(project.createdAt) }}</span>
                </span>
                <span>Role {{ project.roleId }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Recent Users Section -->
      <div v-if="users.length > 0" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Members</h3>
          <UButton variant="ghost" size="sm" @click="navigateToSection('users')">
            View All
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 ml-1" />
          </UButton>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard 
            v-for="user in recentUsersList" 
            :key="user.id"
            class="hover:shadow-md transition-shadow duration-200"
          >
            <div class="flex items-center space-x-3">
              <UAvatar 
                :alt="user.email" 
                size="sm"
                :src="undefined"
              >
                {{ user.email?.charAt(0)?.toUpperCase() || 'U' }}
              </UAvatar>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ user.email || 'Unknown User' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ getRoleName(user.role) }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UButton 
            color="secondary" 
            variant="soft"
            icon="i-heroicons-plus"
            class="justify-center"
            @click="createProject"
          >
            Create New Project
          </UButton>
          <UButton 
            color="success" 
            variant="soft"
            icon="i-heroicons-user-plus"
            class="justify-center"
            @click="navigateToSection('users')"
          >
            Invite Members
          </UButton>
          <UButton 
            color="info" 
            variant="soft"
            icon="i-heroicons-shield-check"
            class="justify-center"
            @click="navigateToSection('roles')"
          >
            Manage Roles
          </UButton>
        </div>
      </div>
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

interface User {
  id: number
  email: string
  isActive : boolean
  role: number
  createdAt: number
}

interface Role {
  id: number
  organizationId: number
  roleName: string
  permissions: number
  createdAt: number
  updatedAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

// Reactive state
const projects = ref<Project[]>([])
const users = ref<User[]>([])
const roles = ref<Role[]>([])
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

const recentProjectsList = computed(() => {
  // Get the 3 most recent projects
  return [...projects.value]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
})

const recentUsersList = computed(() => {
  // Get the 4 most recent users
  return [...users.value]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4)
})

// Methods
const fetchProjects = async () => {
  try {
    const response = await fetch('http://localhost:8787/api/projects/all', {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'orgId': props.organizationId.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Check data structure and assign directly first to debug
    if (data.data) {
      // Filter projects for this organization
      const filteredProjects = data.data.filter((project: Project) => 
        project.organizationId === Number.parseInt(props.organizationId as string)
      )
      projects.value = filteredProjects
    } else if (data) {
      projects.value = []
    }
  } catch (err) {
    console.error('OverviewSection: Error fetching projects:', err)
  }
}

const fetchUsers = async () => {
  try {
    const response = await $fetch<{ data: User[] }>('http://localhost:8787/api/organizationRelations/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'orgId': String(props.organizationId)
      },
    })
    if (response.data) {
      users.value = response.data
    }
  } catch (err) {
    console.error('OverviewSection: Error fetching users:', err)
  }
}

const fetchRoles = async () => {
  try {
    const response = await $fetch<{ data: Role[] }>('http://localhost:8787/api/organizationRoles/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'orgId': String(props.organizationId)
      },
    })
    if (response.data) {
      roles.value = response.data
    }
  } catch (err) {
    console.error('OverviewSection: Error fetching roles:', err)
  }
}

const fetchAllData = async () => {
  loading.value = true
  
  if (!token.value) {
    console.error('OverviewSection: No auth token available')
    loading.value = false
    return
  }
  
  try {
    await Promise.all([
      fetchProjects(),
      fetchUsers(),
      fetchRoles()
    ])
  } finally {
    loading.value = false
  }
}

const createProject = () => {
  console.log('Create project for organization:', props.organizationId)
  navigateTo('/projects/create?organizationId=' + props.organizationId)
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

const getRoleName = (roleId: number): string => {
  const role = roles.value.find(r => r.id === roleId)
  return role?.roleName || `Role :  ${roleId}`
}

const navigateToSection = (section: string) => {
  // Update the global state that the navbar and organization page use
  const currentSection = useState('currentSection')
  currentSection.value = section
}

// Lifecycle
onMounted(() => {
  fetchAllData()
})

// Watch for organization changes
watch(() => props.organizationId, () => {
  fetchAllData()
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
