<script setup lang="ts">
/**
 * Permission Flags Modal Component
 * 
 * Displays a modal with all permission flags for a selected role,
 * showing which permissions are enabled or disabled.
 */

// ----- Types -----
interface RoleWithPermissions {
  name?: string;
  roleName?: string; // For backward compatibility
  permissionFlags: Record<string, boolean>;
}

// ----- Props -----
const props = defineProps<{
  show: boolean;
  role: RoleWithPermissions | null;
}>();

// ----- Events -----
const emit = defineEmits(['close']);

// ----- Computed -----
// Get the role name safely, handling both API formats
const roleName = computed(() => {
  if (!props.role) return 'Role';
  
  // Prefer name from API, fall back to roleName for compatibility
  return typeof props.role.name === 'string' 
    ? props.role.name 
    : (typeof props.role.roleName === 'string' ? props.role.roleName : 'Role');
});

// ----- Methods -----
const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show && role" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Overlay background -->
    <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModal"></div>
    
    <!-- Modal content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 max-w-md md:max-w-xl w-full max-h-[90vh] flex flex-col relative">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex-1 truncate pr-4">
          {{ roleName }} Permissions
        </h3>
        <button 
          @click="closeModal"
          class="text-gray-400 hover:text-gray-500 focus:outline-none flex-shrink-0"
        >
          <span class="sr-only">Close</span>
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Body - scrollable content -->
      <div class="px-6 py-4 flex-1 overflow-y-auto">
        <!-- Flag count summary -->
        <div class="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <strong>Flag count:</strong> {{ role && role.permissionFlags ? Object.keys(role.permissionFlags).length : 0 }}
        </div>
        
        <!-- Warning for no permissions -->
        <div v-if="!role || !role.permissionFlags || Object.keys(role.permissionFlags).length === 0" 
             class="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded">
          Warning: No permission flags found for this role.
        </div>
        
        <!-- Permission flags list -->
        <div class="grid grid-cols-1 gap-3 mt-2">
          <div v-if="role && role.permissionFlags">
            <div v-for="(value, key) in role.permissionFlags" :key="key" 
                class="border rounded p-3 flex justify-between items-center dark:border-gray-700 mb-2">
              <!-- Flag name (formatted with spaces between camel case words) -->
              <span class="font-medium capitalize text-gray-900 dark:text-white">
                {{ key.replace(/([A-Z])/g, ' $1').trim() }}
              </span>
              
              <!-- Flag value badge (green for true, red for false) -->
              <span 
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  value 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-400'
                ]"
              >
                {{ value ? 'True' : 'False' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer with close button -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button 
          @click="closeModal"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded font-medium text-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
