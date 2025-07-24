<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">Manage organization members and their access</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="toggleInviteModal">
        Invite User
      </UButton>
    </div>    <!-- Invite User Modal -->
    <UModal v-model="showInviteModal">
      <UCard>
        <div class="p-6" @click.stop>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Invite Users to Organization
            </h3>
            <UButton 
              color="secondary" 
              variant="ghost" 
              icon="i-heroicons-x-mark-20-solid" 
              class="-my-1" 
              @click="showInviteModal = false" 
            />
          </div>
          
          <!-- Search Users Form -->
          <UForm :state="searchUserState" class="flex flex-col gap-4">
            <UFormField label="Add Users to Your Organization" name="current" required>
              <UInput 
                v-model="searchUserState.finds" 
                placeholder="Search User" 
                required 
                class="w-full"
                @click.stop
                @focus.stop
              />
            </UFormField>
              <UTable 
              v-if="foundUsers.length > 0" 
              :data="foundUsers" 
              :columns="userSearchColumns" 
              ref="userSearchTable"
              v-model:row-selection="rowSelection" 
              @select="onSelectUser" 
              @click.stop
              :key="`table-key-${userSearchColumns.length}-${roleSelectOptions.length}-${existingUsers.length}`"
            >              <!-- Role select slot -->
              <template #role-cell="{ row }">
                <div @click.stop>                  <USelect 
                    :model-value="selectedRoles[row.original.id] ?? undefined"
                    @update:model-value="(value) => selectedRoles[row.original.id] = value"
                    :items="roleSelectOptions"
                    placeholder="Select Role"
                    class="min-w-[150px]"
                    :loading="rolesLoading"
                    :disabled="isUserInOrganization(row.original.id)"
                    @focus="() => fetchRolesForSearch()"
                    @click.stop
                  />
                </div>
              </template>
              <!-- Status column slot -->
              <template #status-cell="{ row }">
                <div @click.stop>
                  <UBadge 
                    v-if="isUserInOrganization(row.original.id)"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  >
                    Already in organization
                  </UBadge>
                  <UBadge 
                    v-else
                    color="secondary"
                    variant="subtle"
                    size="sm"
                  >
                    Available
                  </UBadge>
                </div>
              </template>
            </UTable>
              <!-- Add Users button -->
            <UButton 
              v-if="foundUsers.length > 0 && Object.keys(rowSelection).some(key => rowSelection[key])"
              label="Add Users" 
              color="secondary" 
              size="lg"
              class="self-end cursor-pointer mt-4"
              icon="i-heroicons-user-plus"
              :disabled="!allSelectedUsersHaveRoles"
              @click.stop="addUsersToOrganization"
            />
            
            <!-- Helper message when button is disabled -->
            <div 
              v-if="foundUsers.length > 0 && Object.keys(rowSelection).some(key => rowSelection[key]) && !allSelectedUsersHaveRoles"
              class="text-sm text-amber-600 mt-2 text-right"
            >
              Please assign roles to all selected users before adding them.
            </div>
          </UForm>
        </div>
      </UCard>
    </UModal><!-- Search and Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search users..."
          @click.stop
          @focus.stop
        />
      </div>
      <USelect
        v-model="selectedRole"
        :options="roleOptions"
        placeholder="Filter by role"
      />
    </div><!-- Users Loading -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading users...</p>
    </div>    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- No Users State -->
    <div v-else-if="filteredUsers.length === 0 && !searchQuery" class="text-center py-12">
      <div class="mx-auto max-w-md">
        <div class="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Users Yet</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Start building your team by inviting members to this organization.
        </p>        <UButton 
          color="primary" 
          size="lg"
          icon="i-heroicons-plus"
          @click="toggleInviteModal"
        >
          Invite Your First User
        </UButton>
      </div>
    </div>

    <!-- No Search Results -->
    <div v-else-if="filteredUsers.length === 0 && searchQuery" class="text-center py-12">
      <div class="mx-auto max-w-md">
        <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
        <p class="text-gray-600 dark:text-gray-300">
          Try adjusting your search terms or filters.
        </p>
      </div>
    </div>    <!-- Users List -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Organization Members</h3>
      </div>
      
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div 
          v-for="user in filteredUsers" 
          :key="user.id"
          class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <UAvatar
                :src="user.avatar"
                :alt="user.name"
                size="md"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">{{ user.name }}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">{{ user.email }}</div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <UBadge 
                :color="getRoleColor(user.role)" 
                variant="subtle"
              >
                {{ user.role }}
              </UBadge>
              
              <UBadge 
                :color="getStatusColor(user.status)" 
                variant="subtle"
              >
                {{ user.status }}
              </UBadge>
              
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatLastActive(user.lastActive) }}
              </span>
              
              <UDropdown :items="getUserActions(user)">
                <UButton 
                  color="secondary" 
                  variant="ghost" 
                  icon="i-heroicons-ellipsis-horizontal"
                />
              </UDropdown>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Stats -->
    <div v-if="users.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary">{{ users.length }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-success">{{ activeUsers }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-warning">{{ pendingUsers }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Pending Invites</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-info">{{ adminUsers }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Admins</div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'

const UCheckbox = resolveComponent('UCheckbox')

interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: string
  status: 'active' | 'pending' | 'inactive'
  lastActive: number
  joinedAt: number
}

interface SearchUser {
  id: number
  email: string
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

// Reactive state for existing functionality
const users = ref<User[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedRole = ref<string | null>(null)
const showInviteModal = ref(false)

// New reactive state for search users functionality
const searchUserState = reactive({
  finds: ''
})
const foundUsers = ref<SearchUser[]>([])
const rolesLoading = ref(false)
const roles = ref<{id: number, name: string}[]>([])
const selectedRoles = reactive<Record<number, number | null>>({})
const existingUsers = ref<number[]>([])
const rowSelection = ref<Record<string, boolean>>({})
const userSearchColumns = ref<TableColumn<SearchUser>[]>([])

// Refs
const searchUsersRef = ref()
const userSearchTable = useTemplateRef('userSearchTable')

// Token for API requests
const token = useCookie('auth_token')

// Role options for filter
const roleOptions = [
  { label: 'All Roles', value: null },
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' }
]

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value

  // Filter by search query (name or email)
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(user => {
      // Safely check if name and email exist before calling toLowerCase
      const nameMatch = user.name ? user.name.toLowerCase().includes(query) : false
      const emailMatch = user.email ? user.email.toLowerCase().includes(query) : false
      return nameMatch || emailMatch
    })
  }

  // Filter by selected role
  if (selectedRole.value) {
    filtered = filtered.filter(user => user.role === selectedRole.value)
  }

  return filtered
})

const activeUsers = computed(() => 
  users.value.filter(user => user.status === 'active').length
)

const pendingUsers = computed(() => 
  users.value.filter(user => user.status === 'pending').length
)

const adminUsers = computed(() => 
  users.value.filter(user => user.role === 'admin').length
)

// Search users computed properties
const roleSelectOptions = computed(() =>
  roles.value.map(role => ({
    label: role.name,
    value: role.id
  }))
)

const allSelectedUsersHaveRoles = computed(() => {
  const selectedRowIndices = Object.keys(rowSelection.value).filter(id => rowSelection.value[id])
  const selectedUserIds = selectedRowIndices.map(rowIndex => {
    const user = foundUsers.value[Number(rowIndex)]
    return user ? user.id : null
  }).filter((id): id is number => id !== null && !isUserInOrganization(id))
  
  return selectedUserIds.length > 0 && selectedUserIds.every(userId => {
    const roleId = selectedRoles[userId]
    return roleId !== null && roleId !== undefined
  })
})

// Methods for existing functionality
const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await $fetch('http://localhost:8787/api/organizationRelations/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': String(props.organizationId)
      }
    })
    
    // @ts-ignore - API response typing
    users.value = response.data || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

const toggleInviteModal = () => {
  showInviteModal.value = !showInviteModal.value
}

// Search users methods
const generateUserSearchColumns = (): TableColumn<SearchUser>[] => {
  return [
    {
      id: 'select',
      //@ts-ignore
      header: ({ table }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all'
        }),
      //@ts-ignore
      cell: ({ row }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            row.toggleSelected(!!value),
          'aria-label': 'Select row',
          disabled: isUserInOrganization(row.original.id)
        })
    },
    {
      accessorKey: 'id',
      header: 'ID'
    },
    {
      accessorKey: 'email',
      header: 'Email'
    },
    {
      id: 'role',
      header: 'Role'
    },
    {
      id: 'status',
      header: 'Status'
    }
  ]
}

const fetchRolesForSearch = async (forceRefresh = false) => {
  if (!forceRefresh && (roles.value.length > 0 || rolesLoading.value)) return
  
  rolesLoading.value = true
  try {        
    const res = await $fetch('http://localhost:8787/api/organizationRoles/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        "orgId": String(props.organizationId)
      }
    })
    //@ts-ignore
    roles.value = res.data.map((r) => ({
      id: r.id,
      name: r.name
    }))
  } catch (error) {
    console.error('Error fetching roles:', error)
  } finally {
    rolesLoading.value = false
  }
}

const fetchExistingUsers = async () => {
  if (!props.organizationId) return
  
  try {        
    const res = await $fetch('http://localhost:8787/api/organizationRelations/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': String(props.organizationId)
      }
    })
    
    //@ts-ignore
    existingUsers.value = res.data.map(user => user.id)
    console.log('Existing organization users:', existingUsers.value)
  } catch (error) {
    console.error('Error fetching existing users:', error)
  }
}

const isUserInOrganization = (userId: number): boolean => {
  return existingUsers.value.includes(userId)
}

const onSelectUser = (row: TableRow<SearchUser>, e?: Event) => {
  if (isUserInOrganization(row.original.id)) {
    console.log('Cannot select user - already in organization:', row.original.id)
    return
  }
  
  row.toggleSelected(!row.getIsSelected())
  console.log('onSelect called for user:', row.original.id)
}

let debounceTimeout: ReturnType<typeof setTimeout>
const debouncedUserSearch = (query: string) => {
  clearTimeout(debounceTimeout)

  debounceTimeout = setTimeout(() => {
    if (!query) return

    $fetch('http://localhost:8787/api/users/search', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        word: query
      }
    })
      .then((res) => {
        console.log('Fetched users:', res)
        //@ts-ignore
        foundUsers.value = res.data
      })
      .catch((err) => {
        console.error('Search error:', err)
      })
  }, 300)
}

const addUsersToOrganization = async () => {
  const selectedRowIndices = Object.keys(rowSelection.value).filter(id => rowSelection.value[id])
  const selectedUserIds = selectedRowIndices.map(rowIndex => {
    const user = foundUsers.value[Number(rowIndex)]
    return user ? user.id : null
  }).filter((id): id is number => id !== null && !isUserInOrganization(id))
  
  if (selectedUserIds.length === 0) {
    console.warn('No users selected')
    return
  }

  const usersToAdd = selectedUserIds.map(userId => {
    const roleId = selectedRoles[userId]
    
    if (!userId || !roleId) {
      return null
    }
    
    return {
      roleId: Number(roleId),
      userId: Number(userId)
    }
  }).filter((user): user is { roleId: number; userId: number } => 
    user !== null && user?.roleId != null && user?.userId != null
  )

  if (usersToAdd.length === 0) {
    console.warn('No users with assigned roles')
    return
  }

  try {
    const response = await $fetch('http://localhost:8787/api/organizationRelations/addUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        'orgId': String(props.organizationId)
      },
      body: usersToAdd
    })
    
    console.log('API Response received:', response)
    console.log('Users added successfully to API')

    // Refresh the existing users list
    await fetchExistingUsers()
    await fetchUsers()
    
    // Reset selections
    rowSelection.value = {}
    for (const key of Object.keys(selectedRoles)) {
      delete selectedRoles[Number(key)]
    }
    
    // Close modal
    showInviteModal.value = false
    
    console.log('Users added process completed')
  } catch (error: unknown) {
    console.error('Failed to add users:', error)
  }
}

const handleUsersAdded = async (userDetails: { id: number; email: string; roleId: number }[]) => {
  console.log('Users added:', userDetails)
  showInviteModal.value = false
  
  // Refresh the users list
  await fetchUsers()
  
  // Refresh roles in SearchUsers component if needed
  if (searchUsersRef.value?.refreshRoles) {
    searchUsersRef.value.refreshRoles()
  }
}

const getUserActions = (user: User) => [
  [{
    label: 'View Profile',
    icon: 'i-heroicons-user',
    click: () => viewUser(user.id)
  }, {
    label: 'Edit Role',
    icon: 'i-heroicons-pencil',
    click: () => editUserRole(user.id)
  }],
  [{
    label: 'Remove User',
    icon: 'i-heroicons-trash',
    click: () => removeUser(user.id)
  }]
]

const viewUser = (userId: number) => {
  console.log('View user:', userId)
}

const editUserRole = (userId: number) => {
  console.log('Edit user role:', userId)
}

const removeUser = (userId: number) => {
  console.log('Remove user:', userId)
}

const getRoleColor = (role: string): 'error' | 'primary' | 'secondary' | 'warning' | 'info' => {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'warning' | 'info'> = {
    admin: 'error',
    manager: 'warning',
    member: 'primary',
    viewer: 'secondary'
  }
  return colors[role] || 'secondary'
}

const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
  const colors: Record<string, 'success' | 'warning' | 'error'> = {
    active: 'success',
    pending: 'warning',
    inactive: 'error'
  }
  return colors[status] || 'warning'
}

const formatLastActive = (timestamp: number) => {
  if (timestamp === 0) return 'Never'
  
  const now = Date.now() / 1000
  const diff = now - timestamp
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60)
    return `${minutes}m ago`
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600)
    return `${hours}h ago`
  }
  
  const days = Math.floor(diff / 86400)
  return `${days}d ago`
}

// Lifecycle
onMounted(() => {
  fetchUsers()
  userSearchColumns.value = generateUserSearchColumns()
  fetchExistingUsers() // Fetch existing users when component mounts
})

// Watch for organization changes
watch(() => props.organizationId, () => {
  fetchUsers()
  if (props.organizationId) {
    fetchExistingUsers()
  }
})

// Watch the search input field for user search
watch(() => searchUserState.finds, (newValue) => {
  debouncedUserSearch(newValue)
})

// Watch rowSelection changes
watch(rowSelection, (newSelection) => {
  console.log('Row selection changed:', newSelection)
}, { deep: true })

// Watch existing users to remove them from selection if they get added
watch(existingUsers, (newExistingUsers) => {
  if (newExistingUsers.length > 0) {
    // Remove any existing users from current selections
    const currentSelection = { ...rowSelection.value }
    let selectionChanged = false
    
    Object.keys(currentSelection).forEach(rowIndex => {
      if (currentSelection[rowIndex]) {
        const user = foundUsers.value[Number(rowIndex)]
        if (user && isUserInOrganization(user.id)) {
          delete currentSelection[rowIndex]
          selectionChanged = true
          console.log('Removed existing user from selection:', user.id)
        }
      }
    })
    
    if (selectionChanged) {
      rowSelection.value = currentSelection
    }
  }
}, { deep: true })
</script>
