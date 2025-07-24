<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// Tab configuration
const items = [
  {
    label: 'Create Organization',
    description: 'Create your organization here.',
    icon: 'i-lucide-building',
    slot: 'organization' as const
  },
  {
    label: 'Create Roles',
    description: 'Create a new role or use the default ones.',
    icon: 'i-lucide-lock',
    slot: 'roles' as const
  },
  {
    label: 'Add Users',
    description: '',
    icon: 'i-lucide-user-search',
    slot: 'users' as const
  },
] satisfies TabsItem[]

// ===== STATE MANAGEMENT =====
// Reactive state for tab control and validation
const activeTab = ref(0)
const completedTabs = reactive({
  organization: false,
  roles: false,
  users: false
})
const validationError = ref('')
const showRolesModal = ref(false)
const modalClosing = ref(false)
const tabsRef = ref(null)
const searchUsersRef = ref<{ refreshRoles: () => void } | null>(null)
const forceTabUpdate = ref(0) // Used to force tab updates

// Organization data
const organizationState = reactive({
  name: '',
  description: '',
  logo: '',
})
const orgId = ref('')

// Logo upload state
const logoFile = ref<File | null>(null)
const logoUploading = ref(false)
const logoUploadError = ref('')

// Define types for roles and users
interface Role {
  name: string;
  permissions: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

// State for role summary and users in the preview
const roleSummary = ref<Role[]>([
  { name: 'Admin', permissions: 'All permissions' },
  { name: 'Member', permissions: 'Limited permissions' }
])
const userSummary = ref<User[]>([])

// For capturing role data from the role table component
const capturedRoles = ref<Role[]>([])
const capturedUsers = ref<User[]>([])

// Function to update captured roles (to be called from child component)
function updateRoleSummary(roles: Role[]) {
  capturedRoles.value = roles
}

// Function to update captured users (to be called from child component)
function updateUserSummary(users: User[]) {
  capturedUsers.value = users
}

// Default logo to show in the preview if none provided
const defaultLogo = 'http://localhost:8787/api/bucket/public/8c25f65c-f978-484b-9173-e0551b29e912'
const logoPreview = computed(() => organizationState.logo || defaultLogo)

// Router instance
const router = useRouter()

// ===== IMAGE UPLOAD FUNCTIONS =====
// Handle file selection for logo upload
async function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    logoUploadError.value = 'Please select an image file'
    return
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    logoUploadError.value = 'File size must be less than 5MB'
    return
  }
  
  logoFile.value = file
  logoUploadError.value = ''
  
  // Upload the file immediately
  await uploadLogo(file)
}

// Upload logo to the server
async function uploadLogo(file: File) {
  const token = useCookie('auth_token')
  if (!token.value) {
    logoUploadError.value = 'Authentication required'
    return
  }
  
  logoUploading.value = true
  logoUploadError.value = ''
  
  try {
    // Convert file to binary data
    const arrayBuffer = await file.arrayBuffer()
    
    const response = await $fetch('http://localhost:8787/api/bucket/uploadPicture', {
      method: 'POST',
      headers: {
        'type': 'organization',
        'Content-Type': file.type,
        'Authorization': `Bearer ${token.value}`
      },
      body: arrayBuffer
    })
    
    // Set the returned URL to organizationState.logo
    if (response && (response as any).url) {
      organizationState.logo = (response as any).url
      console.log('Logo uploaded successfully:', organizationState.logo)
    } else {
      throw new Error('Invalid response from upload API')
    }
  } catch (error) {
    console.error('Logo upload failed:', error)
    logoUploadError.value = 'Failed to upload logo. Please try again.'
    organizationState.logo = ''
  } finally {
    logoUploading.value = false
  }
}

// ===== API OPERATIONS =====
// Create a new organization and proceed to the next tab if successful
const createOrganization = async () => {
  // Validate organization name
  if (!organizationState.name.trim()) {
    validationError.value = 'Organization name cannot be empty'
    return
  }

  validationError.value = ''
  
  const token = useCookie('auth_token')
  if (!token.value) {
    console.warn('No auth token found')
    return
  }

  try {
    const result = await useFetch('http://localhost:8787/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: organizationState
    })

    //@ts-ignore
    orgId.value = result.data.value.data.id
    
    // Mark this tab as completed and go to next tab
    completedTabs.organization = true
    goToNextTab()
  } catch (error) {
    console.error('Error creating organization:', error)
    validationError.value = error?.toString() || 'Failed to create organization. Please try again.'
  }
}

// Fetch roles from backend and update roleSummary
async function fetchRoles() {
  const token = useCookie('auth_token')
  if (!token.value || !orgId.value) return
  try {
    const result = await useFetch('http://localhost:8787/api/organizationRoles/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': orgId.value
      }
    })
    const data = (result.data.value as unknown as { data?: { name: string; permissionFlags: Record<string, boolean> }[] }).data;
    if (data) {
      roleSummary.value = data.map((role) => ({
        name: role.name,
        permissions: Object.keys(role.permissionFlags || {}).filter(k => role.permissionFlags[k]).join(', ') || 'No permissions'
      }))
    }
  } catch (e) {
    console.error('Failed to fetch roles:', e)
  }
}

// Call fetchRoles after org creation and after role creation
watch(orgId, (val) => { 
  if (val) {
    fetchRoles()
    // Also fetch users when orgId is available and we're on users tab
    if (activeTab.value === 2) {
      fetchAllOrganizationUsers()
    }
  }
})

// Fetch organization users when navigating to users tab
watch(activeTab, (newTab) => {
  if (newTab === 2 && orgId.value) {
    fetchAllOrganizationUsers()
  }
})

const rolesRefreshKey = ref(0)

function handleRoleCreated() {
  showRolesModal.value = false
  fetchRoles()
  rolesRefreshKey.value++ // trigger RolesTable refresh
  
  // Also refresh roles in SearchUsers component if it exists
  if (searchUsersRef.value?.refreshRoles) {
    searchUsersRef.value.refreshRoles()
  }
}

// Fetch all organization users and update the preview
async function fetchAllOrganizationUsers() {
  const token = useCookie('auth_token')
  if (!token.value || !orgId.value) return
  
  try {
    console.log('Fetching all organization users for orgId:', orgId.value)
    const result = await $fetch('http://localhost:8787/api/organizationRelations/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': orgId.value
      }
    })
    
    console.log('API response for organization users:', result)
    
    // Handle the API response structure
    const data = (result as unknown as { data?: Array<{id: number, email: string, role?: {name: string}}>}).data;
    if (data && Array.isArray(data)) {
      userSummary.value = data.map((user) => ({
        name: user.email.split('@')[0],
        email: user.email,
        role: user.role?.name || 'Member' // Use the role name from API or fallback to Member
      }))
      console.log('Updated user summary with all organization members:', userSummary.value)
      console.log('Total organization members:', userSummary.value.length)
    } else {
      console.log('No users found or invalid data structure:', data)
      userSummary.value = []
    }
  } catch (error) {
    console.error('Error fetching organization users:', error)
    userSummary.value = []
  }
}

// Update user summary and mark users as completed
async function handleUsersAdded(users: Array<{id: number, email: string, roleId: number}>) {
  console.log('handleUsersAdded called with:', users)
  
  // Add a small delay to ensure the API has processed the new users
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Instead of just showing newly added users, fetch and show ALL organization users
  await fetchAllOrganizationUsers()
  completedTabs.users = true
}

// ===== TAB NAVIGATION FUNCTIONS =====
// Navigate to the next tab in sequence
function goToNextTab() {
  if (activeTab.value < items.length - 1) {
    // Force close any open modals first
    modalClosing.value = true
    showRolesModal.value = false
    
    // Wait for next tick and then change tabs
    nextTick(() => {
      setTimeout(() => {
        // Increment forced update counter to ensure tab DOM refreshes
        forceTabUpdate.value++
        // Update active tab value
        activeTab.value++
        console.log('Tab changed to:', activeTab.value)
        modalClosing.value = false
      }, 100)
    })
  }
}

// Move to a specific tab (with prerequisite checking)
function goToTab(index: number) {
  // Prevent going back to tab 0 after organization is created
  if ((index === 0 && completedTabs.organization) ||
      (index === 1 && completedTabs.organization) ||
      (index === 2 && completedTabs.organization && completedTabs.roles)) {
    if (index === 0 && completedTabs.organization) return; // block going back
    // Force close any open modals first
    modalClosing.value = true
    showRolesModal.value = false
    nextTick(() => {
      setTimeout(() => {
        forceTabUpdate.value++
        activeTab.value = index
        console.log('Tab changed to:', activeTab.value)
        modalClosing.value = false
      }, 100)
    })
  } else {
    console.log('Tab change prevented - prerequisites not met')
  }
}

// Handle modal closure and refresh tabs if needed
function refreshTabsAfterModalClose() {
  // Wait for any animations to complete
  setTimeout(() => {
    // Force tab component to re-render
    forceTabUpdate.value++
    nextTick(() => {
      // This will force the tabs to re-evaluate their state
      console.log('Modal closed, refreshing tabs')
    })
  }, 50)
}

// Complete the roles tab and move to the next tab
function completeRolesTab() {
  completedTabs.roles = true
  
  // Force close any open modals first
  modalClosing.value = true
  showRolesModal.value = false
  
  // Navigate to next tab with a slight delay to ensure modal is closed
  setTimeout(() => {
    forceTabUpdate.value++ // Force tab re-render
    if (!modalClosing.value) {
      goToNextTab()
    } else {
      // If modal is still closing, wait a bit longer
      setTimeout(() => {
        goToNextTab()
      }, 200)
    }
  }, 100)
}

// Reset all state when the component is mounted or opened, so that old data does not persist when reopening the modal.
function resetCreateOrgState() {
  organizationState.name = ''
  organizationState.description = ''
  organizationState.logo = ''
  orgId.value = ''
  completedTabs.organization = false
  completedTabs.roles = false
  completedTabs.users = false
  validationError.value = ''
  showRolesModal.value = false
  modalClosing.value = false
  forceTabUpdate.value = 0
  roleSummary.value = []
  userSummary.value = []
  capturedRoles.value = []
  capturedUsers.value = []
  // Reset logo upload state
  logoFile.value = null
  logoUploading.value = false
  logoUploadError.value = ''
}

// Reset state when component is mounted
onMounted(() => {
  resetCreateOrgState()
})

function goToOrganizationPage() {
  // This would route to the organization page, e.g. /organization/:id
  // For now, route to a placeholder
  if (orgId.value) {
    router.push(`/organizations/${orgId.value}`)
  } else {
    router.push('/organizations')
  }
}
</script>

<template>  
<div class="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 lg:p-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left side: Form (2 columns on large screens) -->
      <div class="lg:col-span-2">
        <!-- Custom navigation tabs with visual indicators -->
        <div class="mb-8 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg shadow-sm">
          <div class="flex flex-wrap md:flex-nowrap gap-3">        
            <button 
              v-for="(item, i) in items" 
              :key="i"
              class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all duration-200"
              :class="[
                activeTab === i ? 'bg-white dark:bg-gray-800 text-secondary dark:text-secondary shadow-sm font-medium' : 'hover:bg-gray-200 dark:hover:bg-gray-700',
                (i === 0 && completedTabs.organization) || (i === 1 && !completedTabs.organization) || (i === 2 && (!completedTabs.organization || !completedTabs.roles)) 
                  ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ]"
              @click="() => {
                if ((i === 0 && !completedTabs.organization) || (i === 1 && completedTabs.organization) || (i === 2 && completedTabs.organization && completedTabs.roles)) {
                  goToTab(i);
                }
              }"
            >
              <!-- Tab icon using UIcon -->
              <UIcon v-if="i === 0" name="lucide:building" class="text-lg flex-shrink-0" />
              <UIcon v-else-if="i === 1" name="lucide:lock" class="text-lg flex-shrink-0" />
              <UIcon v-else-if="i === 2" name="lucide:user-search" class="text-lg flex-shrink-0" />
              
              <!-- Tab label -->
              <span>{{ item.label }}</span>
                <!-- Status indicator -->
              <UIcon 
                v-if="i === 0 && completedTabs.organization" 
                name="lucide:check-circle" 
                class="ml-1 text-sm flex-shrink-0 text-green-500" 
              />
              <UIcon 
                v-else-if="i === 1 && completedTabs.roles" 
                name="lucide:check-circle" 
                class="ml-1 text-sm flex-shrink-0 text-green-500" 
              />
              <UIcon 
                v-else-if="i === 2 && completedTabs.users" 
                name="lucide:check-circle" 
                class="ml-1 text-sm flex-shrink-0 text-green-500" 
              />
            </button>
          </div>
        </div>
          <!-- Tab content managed manually -->
        <div class="w-full mt-6">
          <!-- ORGANIZATION TAB -->
          <div v-if="activeTab === 0" class="space-y-6">
            <p class="text-gray-600 dark:text-gray-400 text-lg">
              {{ items[0].description }}
            </p>
              <!-- Validation error alert -->
            <UAlert v-if="validationError" color="error" class="mb-6">
              <template #title>Organization Creation Error</template>
              <template #description>{{ validationError }}</template>
              <template #icon>
                <UIcon name="lucide:alert-circle" class="text-xl" />
              </template>
            </UAlert>            <!-- Organization form -->
            <UForm :state="organizationState" class="flex flex-col gap-6" @submit.prevent="createOrganization">
              <UFormField label="Organization Name" name="name" size="xl" required>
                <UInput v-model="organizationState.name" class="w-full" size="lg" placeholder="Enter your organization name" />
              </UFormField>              <UFormField label="Description" name="description" size="xl" hint="Help people understand what your organization does">
                <UTextarea v-model="organizationState.description" class="w-full" size="lg" placeholder="Describe your organization's purpose and goals" :rows="3" />
              </UFormField>
              <UFormField label="Organization Logo" name="logo" size="xl" hint="Upload your organization's logo (max 5MB)">
                <div class="space-y-3">
                  <UInput 
                    type="file" 
                    accept="image/*"
                    class="w-full" 
                    size="lg"
                    @change="handleLogoUpload"
                    :disabled="logoUploading"
                  />
                  
                  <!-- Upload status -->
                  <div v-if="logoUploading" class="flex items-center gap-2 text-sm text-blue-600">
                    <UIcon name="lucide:loader-2" class="animate-spin" />
                    <span>Uploading logo...</span>
                  </div>
                  
                  <!-- Upload error -->
                  <div v-if="logoUploadError" class="text-sm text-red-600">
                    <UIcon name="lucide:alert-circle" class="inline mr-1" />
                    {{ logoUploadError }}
                  </div>
                  
                  <!-- Upload success -->
                  <div v-if="organizationState.logo && !logoUploading" class="flex items-center gap-2 text-sm text-green-600">
                    <UIcon name="lucide:check-circle" />
                    <span>Logo uploaded successfully</span>
                  </div>
                  
                  <!-- Logo preview -->
                  <div v-if="organizationState.logo" class="mt-3">
                    <img 
                      :src="organizationState.logo" 
                      alt="Logo preview" 
                      class="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      onerror="this.style.display='none'"
                    />
                  </div>
                </div>
              </UFormField>
                <UButton 
                label="Create and Continue" 
                type="submit" 
                color="secondary"
                size="lg"
                class="self-end cursor-pointer mt-3" 
                trailing
              >
                <template #trailing>
                  <UIcon name="lucide:arrow-right" />
                </template>
              </UButton>
            </UForm>
          </div>
            <!-- ROLES TAB -->
          <div v-if="activeTab === 1" class="space-y-6">
            <p class="text-gray-600 dark:text-gray-400 text-lg mb-6">
              {{ items[1].description }}
            </p>
              <!-- Missing prerequisites alert -->
            <UAlert v-if="!completedTabs.organization" color="info" class="mb-6">
              <template #title>Organization Required</template>
              <template #description>Please complete the organization creation step first before managing roles.</template>
              <template #icon>
                <UIcon name="lucide:info" class="text-xl" />
              </template>
            </UAlert>

            <!-- Roles management section -->
            <template v-if="completedTabs.organization">
              <!-- Roles table -->
              <OrganizationRolesTable :orgId="orgId" :refresh-key="rolesRefreshKey" />
                <div class="flex flex-col gap-6 mt-6">
                <!-- Create role modal -->
                <UModal v-model="showRolesModal" @after:leave="refreshTabsAfterModalClose">
                  <UButton 
                    label="Create a New Role" 
                    color="secondary" 
                    size="lg"
                    class="cursor-pointer w-full md:w-auto"
                    icon="lucide:plus-circle"
                  ></UButton>
                  <template #content>
                    <div class="p-6">
                      <OrganizationCreateRoles :orgId="orgId" @role-created="handleRoleCreated" />
                    </div>
                  </template>
                </UModal>
                
                <!-- Navigation button -->            
                <UButton 
                  label="Continue to Next Step" 
                  @click="completeRolesTab" 
                  type="button" 
                  color="secondary"
                  size="lg" 
                  class="self-end cursor-pointer mt-3"
                  trailing
                >
                  <template #trailing>
                    <UIcon name="lucide:arrow-right" />
                  </template>
                </UButton>
              </div>
            </template>
          </div>
            <!-- USERS TAB -->
          <div v-if="activeTab === 2" class="space-y-6">
            <p class="text-gray-600 dark:text-gray-400 text-lg mb-6">
              {{ items[2].description || 'Add users to your organization and assign them roles.' }}
            </p>
              <!-- Missing prerequisites alert -->
            <UAlert v-if="!completedTabs.roles" color="info" class="mb-6">
              <template #title>Roles Required</template>
              <template #description>Please complete the roles creation step first before adding users.</template>
              <template #icon>
                <UIcon name="lucide:info" class="text-xl" />
              </template>
            </UAlert>
              <!-- User management section -->
            <template v-if="completedTabs.roles">
              <OrganizationSearchUsers ref="searchUsersRef" :orgId="orgId" @users-added="handleUsersAdded"/>
              <!-- See Organization button -->
              <UButton 
                label="See Organization" 
                color="secondary"
                size="lg"
                class="self-end cursor-pointer mt-6"
                icon="lucide:eye"
                @click="goToOrganizationPage"
              />
            </template>
          </div>
        </div>
      </div>
        <!-- Right side: Preview (1 column on large screens) -->
      <div class="lg:col-span-1 bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-md sticky top-4 self-start">
        <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-6 flex items-center">
          <UIcon name="lucide:eye" class="mr-3 text-secondary" />
          Organization Preview
        </h3>

        <!-- Organization Preview Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md mb-8">
          <!-- Header with logo -->
          <div class="relative bg-gradient-to-r from-secondary/80 to-primary/80 h-32 flex items-center justify-center">
            <div class="absolute -bottom-12 left-6 bg-white dark:bg-gray-700 rounded-full p-1 border-4 border-white dark:border-gray-700 shadow-md">
              <img 
                :src="logoPreview" 
                :alt="organizationState.name || 'Organization Logo'" 
                class="w-20 h-20 rounded-full object-cover"
                onerror="this.src='https://via.placeholder.com/100?text=Logo'"
              >
            </div>
          </div>
            <!-- Organization Details -->
          <div class="pt-16 px-6 pb-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
              {{ organizationState.name || 'Your Organization Name' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mt-3 mb-4 line-clamp-3 min-h-[4rem]">
              {{ organizationState.description || 'Your organization description will appear here. Add details about what your organization does and its mission.' }}
            </p>

            <!-- Step progress -->
            <div class="mt-6 flex flex-wrap gap-2">
              <UBadge 
                :color="completedTabs.organization ? 'success' : 'secondary'" 
                size="lg"
                class="px-3 py-1"
              >
                <template #default>
                  <span class="flex items-center gap-1">
                    <UIcon :name="completedTabs.organization ? 'lucide:check' : 'lucide:circle-dot'" class="text-sm" />
                    <span>Organization Created</span>
                  </span>
                </template>
              </UBadge>
              <UBadge 
                :color="completedTabs.roles ? 'success' : 'secondary'" 
                size="lg"
                class="px-3 py-1"
              >
                <template #default>
                  <span class="flex items-center gap-1">
                    <UIcon :name="completedTabs.roles ? 'lucide:check' : 'lucide:circle-dot'" class="text-sm" />
                    <span>Roles Configured</span>
                  </span>
                </template>
              </UBadge>
              <UBadge 
                :color="completedTabs.users ? 'success' : 'secondary'" 
                size="lg"
                class="px-3 py-1"
              >
                <template #default>
                  <span class="flex items-center gap-1">
                    <UIcon :name="completedTabs.users ? 'lucide:check' : 'lucide:circle-dot'" class="text-sm" />
                    <span>Users Added</span>
                  </span>
                </template>
              </UBadge>
            </div>
          </div>
        </div>        <!-- Roles Summary (Show when on roles tab or later) -->
        <div v-if="activeTab >= 1" class="mb-8">
          <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center text-lg">
            <UIcon name="lucide:shield" class="mr-2 text-secondary" />
            Roles Overview
          </h4>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <ul class="divide-y divide-gray-200 dark:divide-gray-700">
              <li v-for="(role, index) in roleSummary" :key="index" class="py-3 flex justify-between items-center">
                <span class="font-medium text-base">{{ role.name }}</span>
                <span class="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{{ role.permissions }}</span>
              </li>
              <li v-if="roleSummary.length === 0" class="py-4 text-center text-gray-500">
                <UIcon name="lucide:info" class="mx-auto mb-2 text-xl" />
                <p>No roles configured yet</p>
              </li>
            </ul>
          </div>
        </div>

        <!-- Users Summary (Show when on users tab) -->
        <div v-if="activeTab >= 2" class="mb-8">
          <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center text-lg">
            <UIcon name="lucide:users" class="mr-2 text-secondary" />
            Team Members
          </h4>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <ul class="divide-y divide-gray-200 dark:divide-gray-700">
              <li v-for="(user, index) in userSummary" :key="index" class="py-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-base">{{ user.name }}</p>
                    <p class="text-sm text-gray-500">{{ user.email }}</p>
                  </div>
                  <UBadge size="sm" color="secondary" class="ml-2">{{ user.role }}</UBadge>
                </div>
              </li>
              <li v-if="userSummary.length === 0" class="py-4 text-center text-gray-500">
                <UIcon name="lucide:user-x" class="mx-auto mb-2 text-xl" />
                <p>No users added yet</p>
              </li>
            </ul>
          </div>
        </div>

        <!-- Inspirational quote -->
        <div class="text-center mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <UIcon name="lucide:lightbulb" class="mx-auto mb-3 text-2xl text-yellow-500" />
          <p class="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">
            "Great teams are built on collaboration and clear organization."
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Default margin for our form elements */
UForm {
  padding: 0;
}

/* Make sure buttons are more touchable on mobile */
button {
  min-height: 44px;
}

/* Add spacing around form fields for better readability */
:deep(.form-field) {
  margin-bottom: 1rem;
}

/* Ensure our preview card stays visible while scrolling on larger screens */
@media (min-width: 1024px) {
  .sticky {
    position: sticky;
    top: 1rem;
  }
}

/* Add better transitions for UI elements */
:deep(.transition-all) {
  transition: all 0.3s ease;
}

/* Add scroll to preview card */
.lg\:col-span-1 {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
