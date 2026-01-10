<template>
  <div v-if="isMounted" :key="colorModeKey" class="space-y-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">My Organizations</h2>
      <UModal 
      fullscreen 
      >
        <UButton label="Create Organization" color="primary" class="cursor-pointer font-bold" />
        <template #content>
          <OrganizationCreateOrg />
        </template>
      </UModal>
    </div>    <div v-if="loading" class="flex flex-col justify-center items-center min-h-[400px] py-8 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Getting your organizations...</p>
    </div>


    <!-- If there are no organizations and not loading-->
    <div v-else-if="organizations.length === 0" class="text-center py-8 min-h-[400px] flex items-center justify-center">
      <div class="mx-auto max-w-md"> <img src="~/assets/images/loading.png" alt="No organizations"
          class="mx-auto w-48 h-auto mb-3" />
        <h3 class="text-2xl font-semibold text-secondary mb-4">No Organizations Found</h3>
        <p class="text-gray-500 mb-6">Get started by creating your first organization</p>      
          <UModal fullscreen>
          <UButton label="Create Organization" color="secondary" class="cursor-pointer" size="xl" />

          <template #content>
            <OrganizationCreateOrg />
          </template>
        </UModal>
      </div>
    </div>
    <!-- If there are organizations-->
    <div v-else class="min-h-[400px] grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="org in organizations" :key="org.id"
        class="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div class="h-3 bg-primary"></div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white truncate">{{ org.name || 'Unnamed Organization' }}</h3>
            <UBadge v-if="org.isActiveOrg" color="success" variant="subtle" class="ml-2">Active</UBadge>
          </div>
          
          <div class="flex items-center mb-4">
            <img 
              :src="org.logo || defaultOrgLogo" 
              alt="Organization logo" 
              class="w-12 h-12 rounded-full object-cover mr-3"
              @error="handleImageError"
            />
          </div>
          
          <p class="text-gray-500 dark:text-gray-300 mb-6 line-clamp-2" style="min-height: 3rem">
            {{ org.description || 'No description provided' }}
          </p>
            <div class="flex items-center justify-between mt-4">            <UButton color="primary" variant="solid" :to="'/organizations/' + org.id" class="text-white">
              View Details
            </UButton>
            <p class="text-xs text-black dark:text-white">
              Created: {{ formatDate(org.createdAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DEFAULT_ORGANIZATION_LOGO_PATH } from '~/utils/constants'

// Get the API URL using runtime config
const apiUrl = useApiUrl()

// Computed default logo URL
const defaultOrgLogo = computed(() => `${apiUrl}${DEFAULT_ORGANIZATION_LOGO_PATH}`)

interface Organization {
  id: number;
  name: string;
  logo: string;
  description: string;
  isActiveOrg: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ApiResponse {
  data: Organization[];
}

const organizations = ref<Organization[]>([]);
const loading = ref(true);
const toast = useToast();
const colorMode = useColorMode()

// Ensure component is mounted before rendering
const isMounted = ref(false)
const colorModeKey = ref(0)

// Watch for color mode changes and force re-render
watch(() => colorMode.value, () => {
    colorModeKey.value++
})

const formatDate = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    // Set a simple data URI for a gray circle as fallback
    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMiIgeT0iMTIiPgo8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJTNi40OCAyMiAxMiAyMlMyMiAxNy41MiAyMiAxMlMxNy41MiAyIDEyIDJaTTEyIDVDMTMuNjYgNSAxNSA2LjM0IDE1IDhTMTMuNjYgMTEgMTIgMTFTOSA5LjY2IDkgOFMxMC4zNCA1IDEyIDVaTTEyIDE5LjJDOS41NCAxOS4yIDcuMyAxNy45MiA2IDE1Ljk4QzYuMDMgMTMuOTkgMTAuMDEgMTIuOSAxMiAxMi45UzE3Ljk3IDEzLjk5IDE4IDE1Ljk4QzE2LjcgMTcuOTIgMTQuNDYgMTkuMiAxMiAxOS4yWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4KPC9zdmc+'
  }
}

onMounted(async () => {
  isMounted.value = true
  fetchOrganizations();
});

const fetchOrganizations = async () => {
  loading.value = true;
  try {
    const token = useCookie('auth_token')
    if (!token.value) {
      console.warn('No auth token found')
      toast.add({ title: 'Authentication Error', description: 'Please login to view your organizations', color: 'error' })
      return
    }

    const response = await fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizations/all', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch organizations');
    }
    
    const responseData: ApiResponse = await response.json();
    organizations.value = responseData.data || [];
    
    if (organizations.value.length > 0) {
      toast.add({ 
        title: 'Organizations Loaded', 
        description: `Found ${organizations.value.length} organization(s)`, 
        color: 'success' 
      });
    }
  } catch (error) {
    console.error('Error fetching organizations:', error);
    toast.add({ 
      title: 'Failed to Load Organizations', 
      description: 'There was an error retrieving your organizations. Please try again.', 
      color: 'error' 
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Add global styling for modals used in this component */
:deep(.modal-fullwidth .u-modal-container) {
  width: 95%;
  max-width: 1200px;
}

:deep(.modal-fullwidth .u-modal-body) {
  padding: 0;
}
</style>
