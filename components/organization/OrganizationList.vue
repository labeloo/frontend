<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">My Organizations</h2>
      <UModal 
      fullscreen
      >
        <UButton label="Create Organization" color="secondary" class="cursor-pointer" />
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
          <UModal size="2xl" class="modal-fullwidth">
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
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div class="h-3 bg-secondary"></div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white truncate">{{ org.name || 'Unnamed Organization' }}</h3>
            <UBadge v-if="org.isActiveOrg" color="success" variant="subtle" class="ml-2">Active</UBadge>
          </div>
          
          <div class="flex items-center mb-4" v-if="org.logo">
            <img :src="org.logo" alt="Organization logo" class="w-12 h-12 rounded-full object-cover mr-3" />
          </div>
          
          <p class="text-gray-500 dark:text-gray-300 mb-6 line-clamp-2" style="min-height: 3rem">
            {{ org.description || 'No description provided' }}
          </p>
            <div class="flex items-center justify-between mt-4">            <UButton color="primary" variant="soft" :to="'/organizations/' + org.id">
              View Details
            </UButton>
            <p class="text-xs text-gray-400">
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

const formatDate = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
}

onMounted(async () => {
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

    const response = await fetch('http://localhost:8787/api/organizations/all', {
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
