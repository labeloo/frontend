<script setup lang="ts">
const token = useCookie('auth_token')
if (!token.value) {
    console.warn('No auth token found')
}

import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'

const UCheckbox = resolveComponent('UCheckbox')



const props = defineProps<{
    orgId: string;
}>();

// Loading state for roles
const rolesLoading = ref(false)

// Function to fetch roles when needed
const fetchRoles = async (forceRefresh = false) => {
    if (!forceRefresh && (roles.value.length > 0 || rolesLoading.value)) return
    
    rolesLoading.value = true
    try {        
        const res = await $fetch('http://localhost:8787/api/organizationRoles/all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.value}`,
                "orgId": String(props.orgId)
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

// Function to refresh roles (for external use)
const refreshRoles = () => {
    return fetchRoles(true)
}

const selectOptions = computed(() =>
    roles.value.map(role => ({
        //@ts-ignore
        label: role.name,
        //@ts-ignore
        value: role.id
    }))
)

const columns = ref<TableColumn<User>[]>([])
function generateColumns(): TableColumn<User>[] {
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

//Initialize columns
onMounted(() => {
    columns.value = generateColumns()
    fetchExistingUsers() // Fetch existing users when component mounts
})

//get the roles
const roles = ref([]) //its an array of role objects right now

//rol atama
const selectedRoles = reactive<Record<number, number | null>>({}) // sadece ID

// Existing organization users
const existingUsers = ref<number[]>([]) // Array of user IDs that are already in the organization

// Fetch existing organization users
const fetchExistingUsers = async () => {
    if (!props.orgId) return
    
    try {        const res = await $fetch('http://localhost:8787/api/organizationRelations/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.value}`,
                'orgId': String(props.orgId)
            }
        })
        
        //@ts-ignore
        existingUsers.value = res.data.map(user => user.id)
        console.log('Existing organization users:', existingUsers.value)
    } catch (error) {
        console.error('Error fetching existing users:', error)
    }
}

// Check if a user is already in the organization
const isUserInOrganization = (userId: number): boolean => {
    return existingUsers.value.includes(userId)
}





type User = {
    id: number,
    email: string
}


const userState = reactive({
    finds: ''
})

const table = useTemplateRef('table')

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(row: TableRow<User>, e?: Event) {
    // Prevent selection if user is already in the organization
    if (isUserInOrganization(row.original.id)) {
        console.log('Cannot select user - already in organization:', row.original.id)
        return
    }
    
    /* If you decide to also select the column you can do this  */
    row.toggleSelected(!row.getIsSelected())
    
    console.log('onSelect called for user:', row.original.id)
    console.log('Row selection after toggle:', rowSelection.value)
    console.log(e)
}

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
        
        // biome-ignore lint/complexity/noForEach: <explanation>
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
        }    }
}, { deep: true })

let debounceTimeout: ReturnType<typeof setTimeout>
const foundUsers = ref<User[]>([]);
function debouncedSearch(query: string) {
    clearTimeout(debounceTimeout)

    const token = useCookie('auth_token')
    if (!token.value) {
        console.warn('No auth token found')
    }


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
                console.log(res.data)
                //@ts-ignore
                foundUsers.value = res.data
            })

            .catch((err) => {
                console.error('Search error:', err)
            })
    }, 300) // 300ms debounce
}

// Watch the orgId to refetch existing users when it changes
watch(() => props.orgId, (newOrgId) => {
    if (newOrgId) {
        fetchExistingUsers()
    }
})

// Watch the input field
watch(() => userState.finds, (newValue) => {
    debouncedSearch(newValue)
})

const emit = defineEmits(['users-added'])

// Expose refreshRoles function to parent component
defineExpose({
    refreshRoles
})

// Computed property to check if all selected users have roles assigned
const allSelectedUsersHaveRoles = computed(() => {
    // Get selected user IDs
    const selectedRowIndices = Object.keys(rowSelection.value).filter(id => rowSelection.value[id])
    const selectedUserIds = selectedRowIndices.map(rowIndex => {
        const user = foundUsers.value[Number(rowIndex)]
        return user ? user.id : null
    }).filter((id): id is number => id !== null && !isUserInOrganization(id))
    
    // Check if all selected users have roles assigned
    return selectedUserIds.length > 0 && selectedUserIds.every(userId => {
        const roleId = selectedRoles[userId]
        return roleId !== null && roleId !== undefined
    })
})

async function addUsers() {
    // Debug logging
    console.log('Row Selection:', rowSelection.value)
    console.log('Selected Roles:', selectedRoles)
    console.log('Found Users:', foundUsers.value)
    
    // Collect selected row indices and map them to actual user IDs
    const selectedRowIndices = Object.keys(rowSelection.value).filter(id => rowSelection.value[id])
    console.log('Selected Row Indices:', selectedRowIndices)    // Map row indices to actual user IDs and filter out existing users
    const selectedUserIds = selectedRowIndices.map(rowIndex => {
        const user = foundUsers.value[Number(rowIndex)]
        return user ? user.id : null
    }).filter((id): id is number => id !== null && !isUserInOrganization(id)) // Filter out existing users and ensure type safety
    
    console.log('Actual Selected User IDs (filtered):', selectedUserIds)
    
    if (selectedUserIds.length === 0) {
        console.warn('No users selected')
        return
    }    // Build the request body according to the specified format
    const usersToAdd = selectedUserIds.map(userId => {
        const roleId = selectedRoles[userId]
        console.log(`User ID: ${userId}, Role ID: ${roleId}`)
        
        // Validate each user's data before adding to payload
        if (!userId || userId === null || userId === undefined) {
            console.error('Invalid userId:', userId)
            return null
        }
        
        if (!roleId || roleId === null || roleId === undefined) {
            console.error('Invalid roleId for user:', userId, 'roleId:', roleId)
            return null
        }
        
        return {
            roleId: Number(roleId), // Ensure roleId is a number
            userId: Number(userId)  // Ensure userId is a number
        }
    }).filter((user): user is { roleId: number; userId: number } => 
        user !== null && user?.roleId != null && user?.userId != null
    ) // Filter out invalid entries

    console.log('Users to add (after validation):', usersToAdd);
    console.log('Individual user data validation:');
    usersToAdd.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
            userId: user.userId,
            userIdType: typeof user.userId,
            roleId: user.roleId,
            roleIdType: typeof user.roleId,            isUserIdValid: user.userId !== null && user.userId !== undefined && !Number.isNaN(user.userId),
            isRoleIdValid: user.roleId !== null && user.roleId !== undefined && !Number.isNaN(user.roleId)
        })
    });

    if (usersToAdd.length === 0) {
        console.warn('No users with assigned roles')
        return
    }    // Validate orgId before making the request
    if (!props.orgId) {
        console.error('orgId is undefined or empty:', props.orgId)
        return
    }    try {
        console.log('=== API REQUEST DEBUG ===')
        console.log('Sending request with body:', usersToAdd)
        console.log('OrgId being sent:', props.orgId, 'Type:', typeof props.orgId)
        console.log('Request URL:', 'http://localhost:8787/api/organizationRelations/addUser')
        console.log('Request method:', 'POST')
        console.log('Full headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.value}`,
            'orgId': String(props.orgId)
        })
        console.log('Full request body:', JSON.stringify(usersToAdd, null, 2))
        console.log('=== END DEBUG ===')
        
        const response = await $fetch('http://localhost:8787/api/organizationRelations/addUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.value}`,
                'orgId': String(props.orgId)
            },
            body: usersToAdd
        })
        
        console.log('API Response received:', response)

        console.log('Users added successfully to API')

        // Refresh the existing users list to update the UI
        await fetchExistingUsers()

        // Add a small delay to ensure the API has fully processed the changes
        await new Promise(resolve => setTimeout(resolve, 300))

        // Emit event to parent with user details for display
        const userDetails = selectedUserIds.map(userId => {
            const user = foundUsers.value.find(u => u.id === userId)
            return {
                id: userId,
                email: user?.email || '',
                roleId: selectedRoles[userId]
            }
        }).filter(user => user.roleId)

        console.log('Emitting users-added event with:', userDetails)
        emit('users-added', userDetails)
          // Reset selections after successful addition
        rowSelection.value = {}
        for (const key of Object.keys(selectedRoles)) {
            delete selectedRoles[Number(key)]
        }        console.log('Users added process completed')
    } catch (error: unknown) {
        console.error('=== API ERROR DEBUG ===')
        console.error('Failed to add users:', error)
        console.error('Error type:', typeof error)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        console.error('=== END ERROR DEBUG ===')
    }
}

</script>


<template>    <UForm :state="userState" class="flex flex-col gap-4">
        <UFormField label="Add Users to Your Organization" name="current" required>
            <UInput v-model="userState.finds" placeholder="Search User" required class="w-full" />
        </UFormField>        <UTable v-if="foundUsers.length > 0" :data="foundUsers" :columns="columns" ref="table"
            v-model:row-selection="rowSelection" @select="onSelect" :key="`table-key-${columns.length}-${selectOptions.length}-${existingUsers.length}`">
            <!-- Role select slot -->            <template #role-cell="{ row }">
                <USelect 
                    :model-value="selectedRoles[row.original.id] ?? null"
                    @update:model-value="(value) => selectedRoles[row.original.id] = value"
                    :items="selectOptions"
                    placeholder="Select Role"
                    class="min-w-[150px]"
                    :loading="rolesLoading"
                    :disabled="isUserInOrganization(row.original.id)"
                    @focus="() => fetchRoles()"
                />
            </template>
            <!-- Status column slot -->
            <template #status-cell="{ row }">
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
            </template>
        </UTable>          <!-- Add Users button -->
        <UButton 
            v-if="foundUsers.length > 0 && Object.keys(rowSelection).some(key => rowSelection[key])"
            label="Add Users" 
            color="secondary" 
            size="lg"
            class="self-end cursor-pointer mt-4"
            icon="lucide:user-plus"
            :disabled="!allSelectedUsersHaveRoles"
            @click="addUsers"
        />
        
        <!-- Helper message when button is disabled -->
        <div 
            v-if="foundUsers.length > 0 && Object.keys(rowSelection).some(key => rowSelection[key]) && !allSelectedUsersHaveRoles"
            class="text-sm text-amber-600 mt-2 text-right"
        >
            Please assign roles to all selected users before adding them.
        </div>        <!-- Debug info -->
        <div v-if="foundUsers.length > 0" class="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
            <div>Selected: {{ Object.keys(rowSelection).filter(key => rowSelection[key]).length }} users</div>
            <div>All have roles: {{ allSelectedUsersHaveRoles ? 'Yes' : 'No' }}</div>
            <div>Row Selection Object: {{ JSON.stringify(rowSelection) }}</div>
            <div>Selected Roles Object: {{ JSON.stringify(selectedRoles) }}</div>
            <div>Selected Row Indices: {{ Object.keys(rowSelection).filter(key => rowSelection[key]) }}</div>
            <div>Actual User IDs: {{ Object.keys(rowSelection).filter(key => rowSelection[key]).map(rowIndex => foundUsers[Number(rowIndex)]?.id) }}</div>
        </div>
    </UForm>
</template>
