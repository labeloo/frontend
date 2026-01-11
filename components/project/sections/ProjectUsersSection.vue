<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Project Users</h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">Manage project members and their access</p>
      </div>
      <UButton color="secondary" variant="solid" class="cursor-pointer" icon="i-heroicons-plus" @click="toggleInviteModal">
        Add User
      </UButton>
    </div>

    <!-- Add User Modal -->
    <UModal v-model="showInviteModal">
      <UCard>
        <div class="p-6" @click.stop>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Users to Project
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
            <UFormField label="Search Users" name="current" required>
              <UInput 
                v-model="searchUserState.finds" 
                placeholder="Search by email..." 
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
              :key="`table-key-${userSearchColumns.length}-${roleSelectOptions.length}-${existingUserIds.length}`"
            >
              <!-- Role select slot -->
              <template #role-cell="{ row }">
                <div @click.stop class="flex items-center gap-2">
                  <UAvatar
                    v-if="selectedRoles[row.original.id] && selectedRoles[row.original.id] !== null"
                    :icon="getRoleAvatarPreview(selectedRoles[row.original.id]!).icon"
                    :style="getRoleAvatarPreview(selectedRoles[row.original.id]!).style"
                    size="xs"
                    :class="getRoleAvatarPreview(selectedRoles[row.original.id]!).ringClass"
                    class="ring-1 ring-offset-1"
                  />
                  <USelect 
                    :model-value="selectedRoles[row.original.id] ?? undefined"
                    @update:model-value="(value) => selectedRoles[row.original.id] = value"
                    :items="roleSelectOptions"
                    placeholder="Select Role"
                    class="min-w-[150px]"
                    :loading="rolesLoading"
                    :disabled="isUserInProject(row.original.id)"
                    @focus="() => fetchRoles()"
                    @click.stop
                  />
                </div>
              </template>
              <!-- Status column slot -->
              <template #status-cell="{ row }">
                <div @click.stop>
                  <UBadge 
                    v-if="isUserInProject(row.original.id)"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  >
                    Already in project
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
              :loading="addingUsers"
              @click.stop="addUsersToProject"
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
    </UModal>

    <!-- Search and Filters -->
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
        v-model="selectedRoleFilter"
        :options="roleFilterOptions"
        placeholder="Filter by role"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
      <USpinner size="lg" />
      <p class="text-gray-600 dark:text-gray-300 font-medium">Loading users...</p>
    </div>

    <!-- Error State -->
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
          Start building your team by adding members to this project.
        </p>
        <UButton 
          color="primary" 
          size="lg"
          icon="i-heroicons-plus"
          @click="toggleInviteModal"
        >
          Add Your First User
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
    </div>

    <!-- Users List -->
    <div v-else class="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Project Members</h3>
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
                :icon="getUserAvatarConfig(user.role).icon"
                :style="getUserAvatarConfig(user.role).style"
                size="md"
                class="ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800"
                :class="getUserAvatarConfig(user.role).ringClass"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">{{ user.email }}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">{{ user.role }}</div>
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
                :color="user.isActive ? 'success' : 'warning'" 
                variant="subtle"
              >
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
              
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(user.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit User Roles Section -->
    <UCard class="mt-8">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-pencil-square" class="w-5 h-5 text-primary" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Edit User Roles</h3>
        </div>
      </template>
      
      <div class="space-y-4">
        <UInput
          v-model="editRoleSearchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search users to edit role..."
          class="w-full"
        />
        
        <!-- Users list for role editing -->
        <div v-if="editRoleFilteredUsers.length > 0" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div 
              v-for="user in editRoleFilteredUsers" 
              :key="user.id"
              class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div class="flex items-center space-x-3 flex-1">
                <UAvatar
                  :icon="getUserAvatarConfig(user.role).icon"
                  :style="getUserAvatarConfig(user.role).style"
                  size="sm"
                  class="ring-1 ring-offset-1 ring-offset-white dark:ring-offset-gray-800"
                  :class="getUserAvatarConfig(user.role).ringClass"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ user.email }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Current: {{ user.role }}</div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <USelect 
                  :model-value="editRoleSelections[user.id] ?? undefined"
                  @update:model-value="(value) => editRoleSelections[user.id] = value"
                  :items="roleSelectOptions"
                  placeholder="New Role"
                  class="min-w-[140px]"
                  size="sm"
                  :loading="rolesLoading"
                  @focus="() => fetchRoles()"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="editRoleSearchQuery" class="text-center py-6 text-gray-500 dark:text-gray-400">
          No users found matching "{{ editRoleSearchQuery }}"
        </div>
        <div v-else class="text-center py-6 text-gray-500 dark:text-gray-400">
          Search for users to edit their roles
        </div>
        
        <!-- Update button -->
        <div class="flex justify-end pt-4">
          <UButton
            color="primary"
            :disabled="!hasRoleChanges"
            :loading="updatingRole"
            @click="updateSelectedUserRoles"
            icon="i-heroicons-check"
          >
            Update Roles
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Remove Users Section -->
    <UCard class="mt-8">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-trash" class="w-5 h-5 text-error" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Remove Users</h3>
        </div>
      </template>
      
      <div class="space-y-4">
        <!-- Security notice -->
        <UAlert
          color="info"
          variant="subtle"
          icon="i-heroicons-information-circle"
          title="Security Notice"
          description="You cannot remove yourself from the project. To leave the project, another admin must remove you or transfer ownership."
        />
        
        <UInput
          v-model="removeUserSearchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search users to remove..."
          class="w-full"
        />
        
        <!-- Users list for removal -->
        <div v-if="removeUserFilteredUsers.length > 0" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div 
              v-for="user in removeUserFilteredUsers" 
              :key="user.id"
              class="px-4 py-3 flex items-center justify-between transition-colors"
              :class="[
                user.id === currentUserId
                  ? 'bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                  : usersToRemove.includes(user.id) 
                    ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
              ]"
              @click="user.id !== currentUserId ? toggleUserForRemoval(user.id) : null"
            >
              <div class="flex items-center space-x-3 flex-1">
                <UCheckbox 
                  :model-value="usersToRemove.includes(user.id)"
                  @click.stop
                  @update:model-value="user.id !== currentUserId ? toggleUserForRemoval(user.id) : null"
                  :disabled="user.id === currentUserId"
                />
                <UAvatar
                  :icon="getUserAvatarConfig(user.role).icon"
                  :style="getUserAvatarConfig(user.role).style"
                  size="sm"
                  class="ring-1 ring-offset-1 ring-offset-white dark:ring-offset-gray-800"
                  :class="getUserAvatarConfig(user.role).ringClass"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ user.email }}</span>
                    <UBadge 
                      v-if="user.id === currentUserId"
                      color="primary"
                      variant="subtle"
                      size="xs"
                    >
                      You
                    </UBadge>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ user.role }}</div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <UBadge 
                  :color="user.isActive ? 'success' : 'warning'" 
                  variant="subtle"
                  size="sm"
                >
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="removeUserSearchQuery" class="text-center py-6 text-gray-500 dark:text-gray-400">
          No users found matching "{{ removeUserSearchQuery }}"
        </div>
        <div v-else class="text-center py-6 text-gray-500 dark:text-gray-400">
          Search for users to remove from the project
        </div>
        
        <!-- Selected count and remove button -->
        <div class="flex items-center justify-between pt-4">
          <div v-if="usersToRemove.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
            {{ usersToRemove.length }} user(s) selected for removal
          </div>
          <div v-else></div>
          <UButton
            color="error"
            :disabled="usersToRemove.length === 0"
            :loading="removingUser"
            @click="removeSelectedUsers"
            icon="i-heroicons-trash"
          >
            Remove Selected
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Users Stats -->
    <div v-if="users.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-500">{{ users.length }}</div>
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
          <div class="text-2xl font-bold text-warning">{{ inactiveUsers }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Inactive Users</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-info">{{ uniqueRoles }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Roles</div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'

const UCheckbox = resolveComponent('UCheckbox')

interface ProjectUser {
  id: number
  email: string
  isActive: boolean
  role: string
  createdAt: number
}

interface SearchUser {
  id: number
  email: string
}

interface ProjectRole {
  id: number
  name: string
  description?: string
  permissionFlags?: Record<string, boolean>
  createdAt?: number
  updatedAt?: number
}

interface Props {
  projectId: string
}

const props = defineProps<Props>()

// Reactive state
const users = ref<ProjectUser[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedRoleFilter = ref<string | null>(null)
const showInviteModal = ref(false)
const addingUsers = ref(false)
const updatingRole = ref(false)
const removingUser = ref(false)

// Search users state
const searchUserState = reactive({
  finds: ''
})
const foundUsers = ref<SearchUser[]>([])
const rolesLoading = ref(false)
const roles = ref<ProjectRole[]>([])
const selectedRoles = reactive<Record<number, number | null>>({})
const existingUserIds = ref<number[]>([])
const rowSelection = ref<Record<string, boolean>>({})
const userSearchColumns = ref<TableColumn<SearchUser>[]>([])

// Edit role section state
const editRoleSearchQuery = ref('')
const editRoleSelections = reactive<Record<number, number | undefined>>({})

// Remove user section state
const removeUserSearchQuery = ref('')
const usersToRemove = ref<number[]>([])

// Refs
const userSearchTable = ref()

// Token for API requests
const token = useCookie('auth_token')
const toast = useToast()

// Get current user ID from JWT token
const currentUserId = computed(() => {
  if (!token.value) return null
  return getUserIdFromToken(token.value)
})

// Role options for filter
const roleFilterOptions = computed(() => {
  const uniqueRolesInProject = [...new Set(users.value.map(u => u.role))]
  return [
    { label: 'All Roles', value: null },
    ...uniqueRolesInProject.map(role => ({ label: role, value: role }))
  ]
})

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value

  // Filter by search query (email)
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(user => {
      return user.email ? user.email.toLowerCase().includes(query) : false
    })
  }

  // Filter by selected role
  if (selectedRoleFilter.value) {
    filtered = filtered.filter(user => user.role === selectedRoleFilter.value)
  }

  return filtered
})

const activeUsers = computed(() => 
  users.value.filter(user => user.isActive).length
)

const inactiveUsers = computed(() => 
  users.value.filter(user => !user.isActive).length
)

const uniqueRoles = computed(() => 
  new Set(users.value.map(user => user.role)).size
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
  }).filter((id): id is number => id !== null && !isUserInProject(id))
  
  return selectedUserIds.length > 0 && selectedUserIds.every(userId => {
    const roleId = selectedRoles[userId]
    return roleId !== null && roleId !== undefined
  })
})

// Edit role section computed properties
const editRoleFilteredUsers = computed(() => {
  if (!editRoleSearchQuery.value.trim()) return []
  const query = editRoleSearchQuery.value.toLowerCase().trim()
  return users.value.filter(user => 
    user.email.toLowerCase().includes(query)
  )
})

const hasRoleChanges = computed(() => {
  return Object.keys(editRoleSelections).some(userId => {
    const newRole = editRoleSelections[Number(userId)]
    return newRole !== undefined && newRole !== null
  })
})

// Remove user section computed properties
const removeUserFilteredUsers = computed(() => {
  if (!removeUserSearchQuery.value.trim()) return []
  const query = removeUserSearchQuery.value.toLowerCase().trim()
  return users.value.filter(user => 
    user.email.toLowerCase().includes(query)
  )
})

// Check if a user can be removed (not the current user)
const canRemoveUser = (userId: number): boolean => {
  return userId !== currentUserId.value
}

// Methods
const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await $fetch<{ data: ProjectUser[] }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projectRelations/users`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
          'projectId': String(props.projectId)
        }
      }
    )
    
    users.value = response.data || []
    existingUserIds.value = users.value.map(u => u.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
    console.error('Error fetching project users:', err)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async (forceRefresh = false) => {
  if (!forceRefresh && (roles.value.length > 0 || rolesLoading.value)) return
  
  rolesLoading.value = true
  try {        
    const response = await $fetch<{ data: ProjectRole[] }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projectRoles/all`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
          'projectId': String(props.projectId)
        }
      }
    )
    
    roles.value = response.data || []
  } catch (err) {
    console.error('Error fetching roles:', err)
  } finally {
    rolesLoading.value = false
  }
}

const toggleInviteModal = () => {
  showInviteModal.value = !showInviteModal.value
  if (showInviteModal.value) {
    fetchRoles()
  }
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
          disabled: isUserInProject(row.original.id)
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

const isUserInProject = (userId: number): boolean => {
  return existingUserIds.value.includes(userId)
}

const onSelectUser = (row: TableRow<SearchUser>, e?: Event) => {
  if (isUserInProject(row.original.id)) {
    return
  }
  row.toggleSelected(!row.getIsSelected())
}

let debounceTimeout: ReturnType<typeof setTimeout>
const debouncedUserSearch = (query: string) => {
  clearTimeout(debounceTimeout)

  debounceTimeout = setTimeout(() => {
    if (!query) {
      foundUsers.value = []
      return
    }

    $fetch<{ data: SearchUser[] }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/users/search`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          word: query
        }
      }
    )
      .then((res) => {
        foundUsers.value = res.data || []
      })
      .catch((err) => {
        console.error('Search error:', err)
      })
  }, 300)
}

const addUsersToProject = async () => {
  const selectedRowIndices = Object.keys(rowSelection.value).filter(id => rowSelection.value[id])
  const selectedUserIds = selectedRowIndices.map(rowIndex => {
    const user = foundUsers.value[Number(rowIndex)]
    return user ? user.id : null
  }).filter((id): id is number => id !== null && !isUserInProject(id))
  
  if (selectedUserIds.length === 0) {
    return
  }

  addingUsers.value = true
  let successCount = 0
  let errorCount = 0

  for (const userId of selectedUserIds) {
    const roleId = selectedRoles[userId]
    
    if (!roleId) continue
    
    try {
      await $fetch(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projectRelations/addUser`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
            'projectId': String(props.projectId)
          },
          body: {
            userId: Number(userId),
            roleId: Number(roleId)
          }
        }
      )
      successCount++
    } catch (err) {
      console.error('Failed to add user:', userId, err)
      errorCount++
    }
  }

  addingUsers.value = false

  if (successCount > 0) {
    toast.add({
      title: 'Users Added',
      description: `Successfully added ${successCount} user(s) to the project`,
      color: 'success'
    })
  }

  if (errorCount > 0) {
    toast.add({
      title: 'Some users failed',
      description: `Failed to add ${errorCount} user(s)`,
      color: 'error'
    })
  }

  // Refresh users list
  await fetchUsers()
  
  // Reset selections
  rowSelection.value = {}
  for (const key of Object.keys(selectedRoles)) {
    delete selectedRoles[Number(key)]
  }
  
  // Close modal
  showInviteModal.value = false
}

// Toggle user for removal
const toggleUserForRemoval = (userId: number) => {
  // Prevent removing the current user
  if (userId === currentUserId.value) {
    toast.add({
      title: 'Cannot Remove Yourself',
      description: 'You cannot remove yourself from the project',
      color: 'warning'
    })
    return
  }
  
  const index = usersToRemove.value.indexOf(userId)
  if (index === -1) {
    usersToRemove.value.push(userId)
  } else {
    usersToRemove.value.splice(index, 1)
  }
}

// Update selected user roles (inline section)
const updateSelectedUserRoles = async () => {
  const usersToUpdate = Object.entries(editRoleSelections)
    .filter(([_, roleId]) => roleId !== undefined && roleId !== null)
    .map(([userId, roleId]) => ({
      userId: Number(userId),
      roleId: roleId as number
    }))

  if (usersToUpdate.length === 0) return

  updatingRole.value = true
  let successCount = 0
  let errorCount = 0

  for (const { userId, roleId } of usersToUpdate) {
    try {
      await $fetch(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projectRelations/updateRelation`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
            'projectId': String(props.projectId)
          },
          body: {
            userId,
            newRoleId: roleId
          }
        }
      )
      successCount++
    } catch (err) {
      console.error('Error updating role for user:', userId, err)
      errorCount++
    }
  }

  updatingRole.value = false

  if (successCount > 0) {
    toast.add({
      title: 'Roles Updated',
      description: `Successfully updated ${successCount} user role(s)`,
      color: 'success'
    })
  }

  if (errorCount > 0) {
    toast.add({
      title: 'Some updates failed',
      description: `Failed to update ${errorCount} user role(s)`,
      color: 'error'
    })
  }

  // Clear selections and refresh
  for (const key of Object.keys(editRoleSelections)) {
    delete editRoleSelections[Number(key)]
  }
  editRoleSearchQuery.value = ''
  await fetchUsers()
}

// Remove selected users (inline section)
const removeSelectedUsers = async () => {
  if (usersToRemove.value.length === 0) return

  // Filter out current user ID as a safety measure
  const userIdsToRemove = usersToRemove.value.filter(userId => userId !== currentUserId.value)
  
  if (userIdsToRemove.length === 0) {
    toast.add({
      title: 'No Users to Remove',
      description: 'You cannot remove yourself from the project',
      color: 'warning'
    })
    return
  }

  removingUser.value = true
  let successCount = 0
  let errorCount = 0

  for (const userId of userIdsToRemove) {
    try {
      await $fetch(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projectRelations/removeUser`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
            'projectId': String(props.projectId)
          },
          body: {
            userId
          }
        }
      )
      successCount++
    } catch (err) {
      console.error('Error removing user:', userId, err)
      errorCount++
    }
  }

  removingUser.value = false

  if (successCount > 0) {
    toast.add({
      title: 'Users Removed',
      description: `Successfully removed ${successCount} user(s) from the project`,
      color: 'success'
    })
  }

  if (errorCount > 0) {
    toast.add({
      title: 'Some removals failed',
      description: `Failed to remove ${errorCount} user(s)`,
      color: 'error'
    })
  }

  // Clear selections and refresh
  usersToRemove.value = []
  removeUserSearchQuery.value = ''
  await fetchUsers()
}

const getRoleColor = (role: string): 'error' | 'primary' | 'secondary' | 'warning' | 'info' => {
  const roleLower = role.toLowerCase()
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'warning' | 'info'> = {
    admin: 'error',
    manager: 'warning',
    annotator: 'primary',
    reviewer: 'info',
    viewer: 'secondary'
  }
  return colors[roleLower] || 'secondary'
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp * 1000).toLocaleDateString()
}

// Avatar configuration based on user role
const getUserAvatarConfig = (role: string) => {
  const roleLower = role.toLowerCase()
  const configs: Record<string, { icon: string; style: Record<string, string>; ringClass: string }> = {
    admin: {
      icon: 'i-heroicons-shield-check-solid',
      style: { 
        backgroundColor: '#dc2626',
        color: 'white'
      },
      ringClass: 'ring-red-500'
    },
    manager: {
      icon: 'i-heroicons-briefcase-solid',
      style: { 
        backgroundColor: '#f59e0b',
        color: 'white'
      },
      ringClass: 'ring-amber-500'
    },
    annotator: {
      icon: 'i-heroicons-pencil-square-solid',
      style: { 
        backgroundColor: '#3b82f6',
        color: 'white'
      },
      ringClass: 'ring-blue-500'
    },
    reviewer: {
      icon: 'i-heroicons-check-badge-solid',
      style: { 
        backgroundColor: '#06b6d4',
        color: 'white'
      },
      ringClass: 'ring-cyan-500'
    },
    viewer: {
      icon: 'i-heroicons-eye-solid',
      style: { 
        backgroundColor: '#6b7280',
        color: 'white'
      },
      ringClass: 'ring-gray-500'
    }
  }
  
  return configs[roleLower] || {
    icon: 'i-heroicons-user-solid',
    style: { backgroundColor: '#3b82f6', color: 'white' },
    ringClass: 'ring-blue-500'
  }
}

// Get role avatar preview by role ID for invite modal
const getRoleAvatarPreview = (roleId: number) => {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) {
    return {
      icon: 'i-heroicons-user-solid',
      style: { backgroundColor: '#6b7280', color: 'white' },
      ringClass: 'ring-gray-500'
    }
  }
  
  return getUserAvatarConfig(role.name)
}

// Lifecycle
onMounted(() => {
  fetchUsers()
  fetchRoles()
  userSearchColumns.value = generateUserSearchColumns()
})

// Watch for project changes
watch(() => props.projectId, () => {
  fetchUsers()
  fetchRoles(true)
})

// Watch the search input field for user search
watch(() => searchUserState.finds, (newValue) => {
  debouncedUserSearch(newValue)
})

// Watch rowSelection changes
watch(rowSelection, (newSelection) => {
  // Optional: Add logic here if needed
}, { deep: true })

// Watch existing users to remove them from selection if they get added
watch(existingUserIds, (newExistingUsers) => {
  if (newExistingUsers.length > 0) {
    const currentSelection = { ...rowSelection.value }
    let selectionChanged = false
    
    Object.keys(currentSelection).forEach(rowIndex => {
      if (currentSelection[rowIndex]) {
        const user = foundUsers.value[Number(rowIndex)]
        if (user && isUserInProject(user.id)) {
          delete currentSelection[rowIndex]
          selectionChanged = true
        }
      }
    })
    
    if (selectionChanged) {
      rowSelection.value = currentSelection
    }
  }
}, { deep: true })
</script>
