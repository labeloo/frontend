<script setup lang="ts">
/**
 * RolesTable Component
 * 
 * Displays organization roles in a table format with the ability to view
 * detailed permission flags for each role in a modal.
 */

// ----- Imports -----
import PermissionFlagsModal from './PermissionFlagsModal.vue';
import { watch, onMounted } from 'vue';

// ----- Types -----
interface Role {
    name: string;
    description: string;
    icon?: string;
    color?: string;
    permissionFlags: Record<string, boolean>;
    // Using Record to handle additional API fields
    [key: string]: string | boolean | Record<string, boolean> | undefined;
}

// ----- Props -----
const props = defineProps<{
    orgId: string | number; // Organization ID for fetching roles
    refreshKey?: number;
}>();

// ----- State -----
const rolesData = ref<Role[]>([]);
const isModalOpen = ref(false);
const selectedRole = ref<Role | null>(null);

// Color hex map for proper display (500 shades)
const colorHexMap: Record<string, string> = {
  orange: '#f97316', red: '#ef4444', amber: '#f59e0b', yellow: '#eab308', 
  lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', 
  cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', 
  violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', rose: '#f43f5e'
}

// ----- Authentication -----
const token = useCookie('auth_token');
if (!token.value) {
    console.warn('No auth token found');
}

// ----- Data Fetching -----
const fetchRoles = async () => {
    try {
        const result = await $fetch<{ data: Role[] }>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.value}`,
                "orgId": String(props.orgId)
            }
        });

        if (result?.data) {
            rolesData.value = result.data;
            console.log('Roles fetched:', rolesData.value);
        }
    } catch (error) {
        console.error('Error fetching roles:', error);
        rolesData.value = [];
    }
};

// ----- Modal Handling -----
const showPermissionFlags = (role: Role) => {
    // Create a clean copy of the role data to prevent reactivity issues
    selectedRole.value = {
        name: role.name,
        description: role.description || "",
        permissionFlags: role.permissionFlags || {}
    };
    isModalOpen.value = true;
}

const closeModal = () => {
    isModalOpen.value = false;
    selectedRole.value = null;
}

// ----- Watchers -----
// Watch for orgId changes to refetch data for new organization
watch(() => props.orgId, (newOrgId, oldOrgId) => {
    if (newOrgId && newOrgId !== oldOrgId) {
        console.log(`Organization changed from ${oldOrgId} to ${newOrgId}, refetching roles`);
        fetchRoles();
    }
}, { immediate: false });

// Watch for manual refresh trigger
watch(() => props.refreshKey, (newKey) => {
    console.log('Refresh key changed, refetching roles:', newKey);
    fetchRoles();
});

// ----- Lifecycle -----
// Load roles data when component is mounted
onMounted(() => {
    fetchRoles();
});
</script>

<template>
    <div>
        <!-- Roles data table with responsive container -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <!-- Column headers -->
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Role Name
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Description
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Permission Flags
                        </th>
                    </tr>
                </thead>
                
                <!-- Table data -->
                <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <!-- Role row for each role -->
                    <tr v-for="role in rolesData" :key="role.name" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div class="flex items-center">
                                <div class="p-2 rounded-lg mr-3" 
                                    :style="{ backgroundColor: colorHexMap[role.color || 'blue'] + '20' }">
                                    <UIcon :name="role.icon || 'i-heroicons-user-group'" 
                                        class="w-4 h-4" 
                                        :style="{ color: colorHexMap[role.color || 'blue'] }" />
                                </div>
                                <div>
                                    <div class="font-medium">{{ role.name }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {{ role.description }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <UButton size="sm" color="primary" @click="showPermissionFlags(role)">
                                View Permissions
                            </UButton>
                        </td>
                    </tr>
                    
                    <!-- Empty state message when no roles found -->
                    <tr v-if="rolesData.length === 0">
                        <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No roles found
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Permission flags modal component -->
        <PermissionFlagsModal 
            :show="isModalOpen" 
            :role="selectedRole" 
            @close="closeModal" 
        />
    </div>
</template>

<style scoped>
/* Table styling for better visual appearance */
table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}
</style>