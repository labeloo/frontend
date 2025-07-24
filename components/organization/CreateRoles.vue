<script setup lang="ts">
import { reactive, ref, computed, defineEmits } from 'vue'

const props = defineProps<{
    orgId: string;
}>();

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

// Create ref for permission flags to manage state
const permissionFlags = ref<PermissionFlags>({
  admin: false,
  editOrganization: false,
  deleteOrganization: false,
  editMembers: false,
  editRoles: false,
  editProjects: false,
  createProjects: false,
  deleteProjects: false,
});

// Track if the flags have been modified to show indicators
const flagsModified = ref(false);

const emit = defineEmits(['role-created'])

const roleState = reactive({ 
  name: '',
  description: '',
  icon: 'i-heroicons-user-group',
  permissionFlags: permissionFlags.value, // Reference the reactive object
  organizationId: props.orgId
});

// Available icons for role selection
const availableIcons = ref([
  { label: 'User Group', value: 'i-heroicons-user-group' },
  { label: 'Shield Check', value: 'i-heroicons-shield-check' },
  { label: 'Briefcase', value: 'i-heroicons-briefcase' },
  { label: 'Academic Cap', value: 'i-heroicons-academic-cap' },
  { label: 'Cog 6 Tooth', value: 'i-heroicons-cog-6-tooth' },
  { label: 'Key', value: 'i-heroicons-key' },
  { label: 'Eye', value: 'i-heroicons-eye' },
  { label: 'Pencil', value: 'i-heroicons-pencil' },
  { label: 'Document Text', value: 'i-heroicons-document-text' },
  { label: 'Folder', value: 'i-heroicons-folder' },
  { label: 'Chart Bar', value: 'i-heroicons-chart-bar' },
  { label: 'Lightning Bolt', value: 'i-heroicons-bolt' },
  { label: 'Star', value: 'i-heroicons-star' },
  { label: 'Fire', value: 'i-heroicons-fire' },
  { label: 'Heart', value: 'i-heroicons-heart' },
  { label: 'Cube', value: 'i-heroicons-cube' },
  { label: 'Puzzle Piece', value: 'i-heroicons-puzzle-piece' },
  { label: 'Trophy', value: 'i-heroicons-trophy' },
  { label: 'Rocket', value: 'i-heroicons-rocket-launch' },
  { label: 'Globe', value: 'i-heroicons-globe-alt' }
])

// Helper function to get icon display name
const getIconDisplayName = (iconValue: string) => {
  const icon = availableIcons.value.find(icon => icon.value === iconValue)
  return icon ? icon.label : iconValue
}

const handleRoleState = (state: PermissionFlags) => {
  // Make a copy of the state to avoid reference issues
  permissionFlags.value = { ...state };
  
  // Also update the roleState
  roleState.permissionFlags = permissionFlags.value;
  
  // Mark flags as modified
  flagsModified.value = true;
  
  console.log('Updated permissionFlags:', permissionFlags.value);
  console.log('Updated roleState:', roleState);
}

const createRole = async () => {
  const token = useCookie('auth_token')
  if (!token.value) {
    console.warn('No auth token found')
    return; // Exit early if no token
  }

  // Ensure the latest permission flags are included
  roleState.permissionFlags = { ...permissionFlags.value };
  
  try {
    const result = await useFetch('http://localhost:8787/api/organizationRoles/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: roleState
    });
    
    console.log('Role created:', result);
    emit('role-created'); // Notify parent
  } catch (error) {
    console.error('Failed to create role:', error);
    // Handle error appropriately
  }
}

// Computed property to show a summary of enabled flags
const enabledFlagsCount = computed(() => {
  return Object.values(permissionFlags.value).filter(Boolean).length;
});
</script>

<template>
    <UFormField label="Role Name" name="name" required>
        <UInput v-model="roleState.name" required class="w-full" />
    </UFormField>
    <UFormField label="Role Description" name="description" hint="Optional">
        <UInput v-model="roleState.description" class="w-full" />
    </UFormField>
    
    <UFormField label="Role Icon" name="icon" hint="Choose an icon that represents this role">
        <div class="space-y-4">
            <!-- Selected icon preview -->
            <div v-if="roleState.icon" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div class="p-2 bg-primary/10 rounded-lg">
                    <UIcon :name="roleState.icon" class="w-5 h-5 text-primary" />
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Selected: {{ getIconDisplayName(roleState.icon) }}</span>
            </div>
            
            <!-- Icon selection grid -->
            <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border max-h-48 overflow-y-auto">
                <button
                    v-for="icon in availableIcons"
                    :key="icon.value"
                    type="button"
                    @click="roleState.icon = icon.value"
                    class="p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    :class="[
                        roleState.icon === icon.value 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-600 dark:text-gray-400'
                    ]"
                    :title="icon.label"
                >
                    <UIcon :name="icon.value" class="w-5 h-5" />
                </button>
            </div>
        </div>
    </UFormField>
    
    <UFormField label="Manage Roles" name="roles" required>
        <div class="flex flex-col gap-4 justify-between">
            <UModal>
                <UButton label="Edit Flags" color="success" class="cursor-pointer">
                    <span v-if="flagsModified">
                        ({{ enabledFlagsCount }} flags set)
                    </span>
                </UButton>
                <template #content>
                    <div class="p-4">
                        <OrganizationManageRoles 
                            :initialState="permissionFlags"
                            @update:state="handleRoleState"/>
                    </div>
                </template>
            </UModal>
            <UButton label="Create Role" color="secondary" class="cursor-pointer self-end" @click="createRole"></UButton>
        </div>
    </UFormField>
</template>