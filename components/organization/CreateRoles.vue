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
  permissionFlags: permissionFlags.value, // Reference the reactive object
  organizationId: props.orgId
});

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
        <UInput v-model="roleState.description" required class="w-full" />
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