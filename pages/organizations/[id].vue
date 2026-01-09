<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col justify-center items-center min-h-[400px] py-8 space-y-3">
      <ULoading />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading organization details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div class="mx-auto max-w-md">
        <h3 class="text-2xl font-semibold text-red-600 mb-4">Error Loading Organization</h3>
        <p class="text-gray-500 mb-6">{{ error }}</p>
        <UButton @click="refreshData" color="primary">Try Again</UButton>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Organization Header -->
      <div v-if="organization" class="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 overflow-hidden">
        <div class="h-3 bg-primary"></div>
        <div class="p-8">
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-6">
              <div class="flex-shrink-0">
                <img 
                  :src="organization.organizations.logo || DEFAULT_ORGANIZATION_LOGO" 
                  :alt="`${organization.organizations.name} logo`"
                  class="w-20 h-20 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                  @error="handleImageError"
                />
              </div>
              
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{ organization.organizations.name }}
                  </h1>
                  <UBadge v-if="organization.organizations.isActiveOrg" color="success" variant="subtle">
                    Active
                  </UBadge>
                </div>
                <p v-if="organization.organizations.description" class="text-gray-600 dark:text-gray-300 text-lg mb-4">
                  {{ organization.organizations.description }}
                </p>
                <div class="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                  <span class="flex items-center space-x-1">
                    <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                    <span>Created {{ formatDate(organization.organizations.createdAt) }}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <UIcon name="i-heroicons-identification" class="w-4 h-4" />
                    <span>Organization ID: {{ organization.organizations.id }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      <!-- Dynamic Section Content -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div class="p-8">

          <!-- Overview Section (Default) -->
          <OrganizationSectionsOverviewSection 
            v-if="activeSection === 'overview'"
            :organization-id="organizationId?.toString()"
          />

          <!-- Projects Section -->
          <OrganizationSectionsProjectsSection 
            v-else-if="activeSection === 'projects'"
            :organization-id="organizationId"
            @refresh="() => {}"
          />

          <!-- Users Section -->
          <OrganizationSectionsUsersSection 
            v-else-if="activeSection === 'users'"
            :organization-id="organizationId"
          />

          <!-- Roles Section -->
          <OrganizationSectionsRolesSection 
            v-else-if="activeSection === 'roles'"
            :organization-id="organizationId"
          />          <!-- Settings Section -->
          <OrganizationSectionsSettingsSection 
            v-else-if="activeSection === 'settings'"
            :organization="organization"
            @refresh="refreshData"
          />

          <!-- Fallback Debug -->
          <div v-else class="text-center py-8">
            <p class="text-gray-500">Unknown section: {{ activeSection }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_ORGANIZATION_LOGO } from '~/utils/constants'

interface Organization {
  organizations: {
    id: number
    ownerId: number
    name: string
    logo: string
    description: string
    isActiveOrg: boolean
    createdAt: number
    updatedAt: number
  }
  organization_relations: {
    id: number
    userId: number
    organizationId: number
    roleId: number
    createdAt: number
    updatedAt: number
  }
}

// Get route parameters
const route = useRoute()
const organizationId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : id[0]
})

// Auth composable
const { isAuthenticated } = useAuth()

// Use the global state for section management (shared with layout)
const activeSection = useState('currentSection', () => {
  // Check if there's a section query parameter
  const sectionFromQuery = route.query.section as string
  return sectionFromQuery || 'overview'
})

// Reactive state
const organization = ref<Organization | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Token for API requests
const token = useCookie('auth_token')

// Fetch organization details
const fetchOrganization = async () => {
  try {
    const response = await fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${organizationId.value}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch organization: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.data && data.data.length > 0) {
      organization.value = data.data[0]
    } else {
      throw new Error('Organization not found')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load organization'
    console.error('Error fetching organization:', err)
  } finally {
    loading.value = false
  }
}

// Refresh all data
const refreshData = async () => {
  loading.value = true
  error.value = null
  
  await fetchOrganization()
}

// Utility functions
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    // Set a simple data URI for a gray circle as fallback
    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIyMCIgeT0iMjAiPgo8cGF0aCBkPSJNMjAgM0MxMC44IDMgMy4zIDEwLjggMy4zIDIwUzEwLjggMzcgMjAgMzdTMzYuNyAyOS4yIDM2LjcgMjBTMjkuMiAzIDIwIDNaTTIwIDguM0MyMi43NyA4LjMgMjUgMTAuNTcgMjUgMTMuM1MyMi43NyAxOC4zIDIwIDE4LjNTMTUgMTYuMDcgMTUgMTMuM1MxNy4yMyA4LjMgMjAgOC4zWk0yMCAzMi4yQzE1Ljg1IDMyLjIgMTIuMTcgMjkuODcgMTAgMjYuM0MxMC4wNSAyMy4zMiAxNi42OCAyMS41IDIwIDIxLjVTMjkuOTUgMjMuMzIgMzAgMjYuM0MyNy44MyAyOS44NyAyNC4xNSAzMi4yIDIwIDMyLjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo8L3N2Zz4='
  }
}

// Middleware to check authentication
definePageMeta({
  middleware: 'auth',
  layout: 'organization'
})

// Initialize data on mount
onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }
  
  await refreshData()
})

// SEO
useSeoMeta({
  title: () => organization.value ? `${organization.value.organizations.name} - Organization Details` : 'Organization Details',
  description: () => organization.value?.organizations.description || 'View organization details and projects'
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