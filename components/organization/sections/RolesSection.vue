<template>
  <div class="space-y-6" @click.stop>
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h2>
        <p class="text-gray-600 dark:text-gray-300 mt-1">Manage organization roles and permissions</p>
      </div>      <UButton 
        icon="i-heroicons-plus"
        color="primary"
        @click.stop="scrollToForm"
      >
        Create Role
      </UButton>
    </div>    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6" @click.stop>
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Roles</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ roles.length }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6" @click.stop>
        <div class="flex items-center">
          <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Active Roles</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ activeRoles }}</p>
          </div>
        </div>
      </div>
    </div>    <!-- Filters and Search -->
    <div class="flex flex-col sm:flex-row gap-4" @click.stop>
      <div class="flex-1">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search roles..."
          class="w-full"
          @click.stop
          @focus.stop
        />
      </div>
    </div>

    <!-- Roles Table -->    <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" @click.stop>      <div v-if="loading" class="flex justify-center items-center py-12" @click.stop>
        <USpinner size="lg" />
      </div>
      
      <div v-else-if="filteredRoles.length === 0" class="text-center py-12" @click.stop>
        <div class="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-user-group" class="w-12 h-12 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No roles found</h3>
        <p class="text-gray-600 dark:text-gray-300">
          {{ searchQuery ? 'Try adjusting your search criteria' : 'Create your first role to get started' }}
        </p>
      </div>

      <div v-else class="overflow-x-auto">        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700" @click.stop>
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Permissions
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Members
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" @click.stop>
            <tr v-for="role in filteredRoles" :key="role.id" class="hover:bg-gray-50 dark:hover:bg-gray-700" @click.stop>              <td class="px-6 py-4 whitespace-nowrap" @click.stop>
                <div class="flex items-center">
                  <div class="p-2 bg-primary/10 rounded-lg mr-3">
                    <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ role.name }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ role.description }}</div>
                  </div>
                </div>
              </td><td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-wrap gap-1" @click.stop>
                  <UBadge 
                    v-for="permission in getPermissionsList(role.permissionFlags)" 
                    :key="permission"
                    color="secondary" 
                    variant="outline" 
                    size="xs"
                    @click.stop
                  >
                    {{ permission }}
                  </UBadge>                  <UBadge 
                    v-if="getEnabledPermissionsCount(role.permissionFlags) > 3"
                    color="secondary" 
                    variant="outline" 
                    size="xs"
                    @click.stop
                  >
                    +{{ getEnabledPermissionsCount(role.permissionFlags) - 3 }} more
                  </UBadge>
                </div>
              </td>              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white" @click.stop>
                {{ role.memberCount || 0 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" @click.stop>
                {{ formatDate(role.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <UDropdown :items="getRoleActions(role)" @click.stop>
                  <UButton color="secondary" variant="ghost" icon="i-heroicons-ellipsis-horizontal" @click.stop />
                </UDropdown>
              </td>
            </tr>
          </tbody>        </table>
      </div>
    </div>    <!-- Create Role Form -->
    <div class="create-role-form bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 mt-6" @click.stop>
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Create New Role</h3>
        <p class="text-gray-600 dark:text-gray-400">Define a new role with specific permissions for your organization</p>
      </div>
      
      <div class="space-y-8">        <div class="space-y-2">
          <UFormGroup label="Role Name" required>
            <template #description>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Choose a descriptive name for this role (e.g., "Project Manager", "Developer")</p>
            </template>
            <UInput 
              v-model="newRole.name" 
              placeholder="Enter role name" 
              size="xl"
              class="w-full"
              @click.stop
              @focus.stop
            />
          </UFormGroup>
        </div>
        
        <div class="space-y-2">
          <UFormGroup label="Description">
            <template #description>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Provide a brief description of this role's responsibilities (optional)</p>
            </template>
            <UTextarea 
              v-model="newRole.description" 
              placeholder="Enter role description"
              size="xl"
              rows="4"
              class="w-full"
              @click.stop
              @focus.stop
            />
          </UFormGroup>
        </div>
        
        <div class="space-y-2">
          <UFormGroup label="Permissions">
            <template #description>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Select the permissions this role should have. Changes are saved automatically.</p>
            </template>
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700" @click.stop>
              <OrganizationManageRoles 
                :initialState="permissionFlags"
                @update:state="handlePermissionUpdate"
              />
            </div>
          </UFormGroup>
        </div>
      </div>      
      <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">        <UButton 
          color="secondary" 
          variant="ghost" 
          size="lg"
          @click.stop="clearForm"
        >
          Clear Form
        </UButton>
        <UButton 
          color="primary" 
          size="lg"
          @click.stop="createRole" 
          :loading="creating"
        >
          Create Role
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define the interface for permissions to ensure type safety
interface PermissionFlags {
  admin: boolean;
  editOrganization: boolean;
  deleteOrganization: boolean;
  editMembers: boolean;
  editRoles: boolean;
  editProjects: boolean;
  createProjects: boolean;
  deleteProjects: boolean;
}

interface Role {
  id: number
  name: string
  description: string
  permissionFlags: PermissionFlags
  memberCount?: number
  createdAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

// Reactive state
const roles = ref<Role[]>([])
const loading = ref(true)
const creating = ref(false)
const searchQuery = ref('')
const flagsModified = ref(false)

// Permission flags state
const permissionFlags = ref<PermissionFlags>({
  admin: false,
  editOrganization: false,
  deleteOrganization: false,
  editMembers: false,
  editRoles: false,
  editProjects: false,
  createProjects: false,
  deleteProjects: false,
})

const newRole = ref({
  name: '',
  description: '',
  permissionFlags: {
    admin: false,
    editOrganization: false,
    deleteOrganization: false,
    editMembers: false,
    editRoles: false,
    editProjects: false,
    createProjects: false,
    deleteProjects: false,
  } as PermissionFlags
})

// Token for API requests
const token = useCookie('auth_token')

// Computed properties
const filteredRoles = computed(() => {
  let filtered = roles.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(role => 
      role.name.toLowerCase().includes(query) ||
      role.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

const activeRoles = computed(() => roles.value.length)

// Permission management functions
const handlePermissionUpdate = (state: PermissionFlags) => {
  // Make a copy of the state to avoid reference issues
  permissionFlags.value = { ...state }
  
  // Also update the newRole
  newRole.value.permissionFlags = permissionFlags.value
  
  // Mark flags as modified
  flagsModified.value = true
  
  console.log('Updated permissionFlags:', permissionFlags.value)
}

const clearForm = () => {
  resetForm()
}

const scrollToForm = () => {
  // Use nextTick to ensure DOM is updated
  nextTick(() => {
    const formElement = document.querySelector('.create-role-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

// Handler for when a role is successfully created
const onRoleCreated = () => {
  resetForm()
  fetchRoles() // Refresh the roles list
}

const resetForm = () => {
  newRole.value = {
    name: '',
    description: '',
    permissionFlags: {
      admin: false,
      editOrganization: false,
      deleteOrganization: false,
      editMembers: false,
      editRoles: false,
      editProjects: false,
      createProjects: false,
      deleteProjects: false,
    }
  }
  
  permissionFlags.value = {
    admin: false,
    editOrganization: false,
    deleteOrganization: false,
    editMembers: false,
    editRoles: false,
    editProjects: false,
    createProjects: false,
    deleteProjects: false,
  }
  
  flagsModified.value = false
}

// Methods
const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await $fetch('http://localhost:8787/api/organizationRoles/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': String(props.organizationId)
      }
    })
    
    //@ts-ignore
    roles.value = res.data.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissionFlags: role.permissionFlags || {},
      memberCount: 0, // This would need to come from API if available
      createdAt: role.createdAt || Date.now() / 1000
    }))
  } catch (error) {
    console.error('Error fetching roles:', error)
  } finally {
    loading.value = false
  }
}

const createRole = async () => {
  creating.value = true
  try {
    // Ensure the latest permission flags are included
    newRole.value.permissionFlags = { ...permissionFlags.value }
    
    const roleData = {
      name: newRole.value.name,
      description: newRole.value.description,
      permissionFlags: newRole.value.permissionFlags,
      organizationId: props.organizationId
    }
    
    const result = await $fetch('http://localhost:8787/api/organizationRoles/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: roleData
    })
    
    console.log('Role created:', result)
      // Refresh the roles list
    await fetchRoles()
    
    // Reset form after successful creation
    resetForm()
    
  } catch (error) {
    console.error('Error creating role:', error)
  } finally {
    creating.value = false
  }
}

const getPermissionsList = (permissionFlags: PermissionFlags) => {
  const enabledPermissions = Object.keys(permissionFlags).filter(key => 
    permissionFlags[key as keyof PermissionFlags]
  )
  return enabledPermissions.slice(0, 3) // Show only first 3 permissions
}

// Helper function to get count of enabled permissions
const getEnabledPermissionsCount = (permissionFlags: PermissionFlags) => {
  return Object.values(permissionFlags).filter(Boolean).length
}

const getRoleActions = (role: Role) => {
  return [
    [{
      label: 'View Details',
      icon: 'i-heroicons-eye',
      click: () => viewRole(role)
    }],
    [{
      label: 'Edit Role',
      icon: 'i-heroicons-pencil',
      click: () => editRole(role)
    }],
    [{
      label: 'Delete Role',
      icon: 'i-heroicons-trash',
      click: () => deleteRole(role)
    }]
  ]
}

const viewRole = (role: Role) => {
  console.log('View role:', role)
}

const editRole = (role: Role) => {
  console.log('Edit role:', role)
}

const deleteRole = (role: Role) => {
  console.log('Delete role:', role)
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Initialize data
onMounted(() => {
  fetchRoles()
})

// Watch for organization changes
watch(() => props.organizationId, () => {
  fetchRoles()
})
</script>
