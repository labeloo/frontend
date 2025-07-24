<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Organization Settings</h2>
      <p class="text-gray-600 dark:text-gray-300 mt-1">Manage your organization preferences and configuration</p>
    </div>

    <!-- Settings Sections -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Settings Navigation -->
      <div class="lg:col-span-1">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="p-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings</h3>            <nav class="space-y-1">
              <button
                v-for="section in settingSections"
                :key="section.key"
                @click="section.disabled ? null : activeSection = section.key"
                :class="[
                  'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative',
                  section.disabled 
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50' 
                    : activeSection === section.key
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
                :disabled="section.disabled"
              >
                <UIcon :name="section.icon" class="w-4 h-4 mr-3" />
                {{ section.label }}
                <UIcon 
                  v-if="section.disabled" 
                  name="i-heroicons-lock-closed" 
                  class="w-3 h-3 ml-auto text-gray-400" 
                />
                <!-- Unsaved changes indicator -->
                <div 
                  v-if="section.key === 'general' && hasUnsavedChanges" 
                  class="w-2 h-2 bg-orange-500 rounded-full ml-auto"
                  title="Unsaved changes"
                ></div>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="lg:col-span-2">        <!-- General Settings -->
        <div v-if="activeSection === 'general'" class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">General Information</h3>
            
            <!-- Loading State -->
            <div v-if="!props.organization" class="flex justify-center items-center py-12">
              <USpinner size="lg" />
              <span class="ml-3 text-gray-600 dark:text-gray-300">Loading organization data...</span>
            </div>
            
            <!-- Form -->
            <form v-else @submit.prevent="saveGeneralSettings" class="space-y-6"><!-- Organization Logo -->
              <UFormGroup label="Organization Logo">
                <div class="flex items-center space-x-4">
                  <div class="flex-shrink-0">
                    <img 
                      v-if="formData.logo" 
                      :src="formData.logo" 
                      alt="Organization logo"
                      class="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                    />
                    <div v-else class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <UIcon name="i-heroicons-building-office" class="w-8 h-8 text-gray-400" />
                    </div>
                  </div>                  <div>
                    <!-- TODO: Implement logo upload functionality -->
                    <UButton color="secondary" variant="outline" size="sm" disabled>
                      Change Logo
                    </UButton>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">JPG, PNG up to 2MB (Upload coming soon)</p>
                  </div>
                </div>
              </UFormGroup>              <!-- Organization Name -->
              <UFormGroup label="Organization Name" required>
                <UInput 
                  v-model="formData.name" 
                  placeholder="Enter organization name"
                  :color="formData.name.trim().length === 0 ? 'error' : 'primary'"
                />
                <template #help>
                  <span 
                    v-if="formData.name.trim().length === 0" 
                    class="text-xs text-red-600 dark:text-red-400"
                  >
                    Organization name is required
                  </span>
                </template>
              </UFormGroup>              <!-- Description -->
              <UFormGroup label="Description">
                <UTextarea 
                  v-model="formData.description" 
                  placeholder="Enter organization description"
                  :rows="3"
                  maxlength="500"
                />
                <template #help>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formData.description.length }}/500 characters
                  </span>
                </template>
              </UFormGroup><div class="flex justify-between">
                <UButton 
                  v-if="hasUnsavedChanges"
                  color="secondary" 
                  variant="ghost" 
                  @click="resetForm"
                  :disabled="saving"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
                  Reset Changes
                </UButton>
                <div></div>
                <UButton 
                  type="submit" 
                  :color="saved ? 'success' : hasUnsavedChanges ? 'primary' : 'secondary'" 
                  :variant="hasUnsavedChanges ? 'solid' : 'outline'"
                  :loading="saving"
                  :disabled="saving || !isGeneralFormValid"
                >
                  <UIcon v-if="saved" name="i-heroicons-check" class="w-4 h-4 mr-2" />
                  <UIcon v-else-if="hasUnsavedChanges" name="i-heroicons-pencil" class="w-4 h-4 mr-2" />
                  {{ saved ? 'Saved!' : saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes' }}
                </UButton>
              </div>
            </form>
          </div>
        </div>        <!-- Security Settings -->
        <div v-else-if="activeSection === 'security'" class="bg-white dark:bg-gray-800 rounded-lg shadow relative">
          <!-- Disabled Overlay -->
          <div class="absolute inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <div class="text-center">
              <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Coming Soon</h4>
              <p class="text-sm text-gray-500 dark:text-gray-500">Security features will be available in a future update</p>
            </div>
          </div>
          
          <div class="p-6 pointer-events-none">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Security & Access</h3>
            
            <div class="space-y-6">
              <!-- Two-Factor Authentication -->
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Require 2FA for all organization members</p>
                </div>
                <UToggle v-model="settings.require2FA" />
              </div>

              <!-- SSO -->
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">Single Sign-On (SSO)</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Enable SSO for organization login</p>
                </div>
                <UToggle v-model="settings.enableSSO" />
              </div>

              <!-- Session Timeout -->
              <UFormGroup label="Session Timeout">
                <USelect 
                  v-model="settings.sessionTimeout" 
                  :options="sessionTimeoutOptions"
                />
              </UFormGroup>

              <!-- IP Whitelist -->
              <UFormGroup label="IP Whitelist">
                <UTextarea 
                  v-model="settings.ipWhitelist" 
                  placeholder="Enter IP addresses (one per line)"
                  :rows="3"
                />
                <template #help>
                  <span class="text-xs">Leave empty to allow access from any IP address</span>
                </template>
              </UFormGroup>

              <div class="flex justify-end">
                <UButton color="primary" @click="saveSecuritySettings" :loading="saving">
                  Save Security Settings
                </UButton>
              </div>
            </div>
          </div>
        </div>        <!-- Notifications Settings -->
        <div v-else-if="activeSection === 'notifications'" class="bg-white dark:bg-gray-800 rounded-lg shadow relative">
          <!-- Disabled Overlay -->
          <div class="absolute inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <div class="text-center">
              <UIcon name="i-heroicons-bell-slash" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Coming Soon</h4>
              <p class="text-sm text-gray-500 dark:text-gray-500">Notification features will be available in a future update</p>
            </div>
          </div>
          
          <div class="p-6 pointer-events-none">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Notification Preferences</h3>
            
            <div class="space-y-6">
              <!-- Email Notifications -->
              <div>
                <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Email Notifications</h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-900 dark:text-white">New member joins</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Get notified when someone joins the organization</p>
                    </div>
                    <UToggle v-model="settings.notifications.newMember" />
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-900 dark:text-white">Project updates</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Get notified about project changes</p>
                    </div>
                    <UToggle v-model="settings.notifications.projectUpdates" />
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-900 dark:text-white">Security alerts</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Get notified about security events</p>
                    </div>
                    <UToggle v-model="settings.notifications.securityAlerts" />
                  </div>
                </div>
              </div>

              <!-- Slack Integration -->
              <div class="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Slack Integration</h4>
                <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <p class="text-sm text-gray-900 dark:text-white">Connect Slack workspace</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Send notifications to your Slack channels</p>
                  </div>
                  <UButton color="secondary" variant="outline" size="sm">
                    <UIcon name="i-simple-icons-slack" class="w-4 h-4 mr-2" />
                    Connect
                  </UButton>
                </div>
              </div>

              <div class="flex justify-end">
                <UButton color="primary" @click="saveNotificationSettings" :loading="saving">
                  Save Notification Settings
                </UButton>
              </div>
            </div>
          </div>        </div>

        <!-- Danger Zone -->
        <div v-else-if="activeSection === 'danger'" class="bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-800">
          <div class="p-6">
            <h3 class="text-lg font-medium text-red-600 dark:text-red-400 mb-6">Danger Zone</h3>
            
            <div class="space-y-6">              <!-- Transfer Ownership -->
              <div class="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Transfer Ownership</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Transfer this organization to another user. You will lose admin access.
                </p>
                <!-- Note: This section will handle the ownerID field update -->
                <UButton color="error" variant="outline" size="sm" disabled>
                  Transfer Organization
                </UButton>
                <p class="text-xs text-gray-400 mt-2">Coming soon - This will update the ownerID field</p>
              </div><!-- Delete Organization -->
              <div class="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Delete Organization</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Permanently delete this organization and all of its data. This action cannot be undone.
                </p>
                
                <!-- Delete confirmation form -->
                <div v-if="!showDeleteConfirm" class="flex justify-start">
                  <UButton color="error" size="sm" @click="showDeleteConfirm = true">
                    Delete Organization
                  </UButton>
                </div>
                
                <div v-else class="space-y-4">
                  <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p class="text-sm text-red-800 dark:text-red-200 mb-3">
                      This action cannot be undone. This will permanently delete the organization and all of its data.
                    </p>                    <UFormGroup label="Type the organization name to confirm" class="mb-4">
                      <UInput 
                        v-model="deleteConfirmation" 
                        :placeholder="`Type '${settings.name}' to confirm`"
                        class="w-full"
                        :color="deleteConfirmation && !isDeleteConfirmationValid ? 'error' : isDeleteConfirmationValid ? 'success' : 'primary'"
                      />
                      <template #help>
                        <div class="flex items-center mt-1">
                          <UIcon 
                            v-if="deleteConfirmation && isDeleteConfirmationValid" 
                            name="i-heroicons-check-circle" 
                            class="w-4 h-4 text-green-500 mr-1" 
                          />
                          <UIcon 
                            v-else-if="deleteConfirmation && !isDeleteConfirmationValid" 
                            name="i-heroicons-x-circle" 
                            class="w-4 h-4 text-red-500 mr-1" 
                          />
                          <span 
                            :class="[
                              'text-xs',
                              deleteConfirmation && isDeleteConfirmationValid ? 'text-green-600 dark:text-green-400' :
                              deleteConfirmation && !isDeleteConfirmationValid ? 'text-red-600 dark:text-red-400' :
                              'text-gray-500 dark:text-gray-400'
                            ]"
                          >
                            {{ isDeleteConfirmationValid ? 'Organization name confirmed' : 'Type the exact organization name to enable deletion' }}
                          </span>
                        </div>
                      </template>
                    </UFormGroup>
                    
                    <div class="flex justify-end gap-3">
                      <UButton 
                        color="secondary" 
                        variant="ghost" 
                        size="sm"
                        @click="showDeleteConfirm = false; deleteConfirmation = ''"
                      >
                        Cancel
                      </UButton>
                      <UButton 
                        color="error" 
                        size="sm"
                        :disabled="!isDeleteConfirmationValid"
                        @click="deleteOrganization"
                        :loading="deleting"
                      >
                        Delete Organization
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Organization Settings Component
 * 
 * API Integration:
 * - PUT /api/organizations/:id - Updates organization settings
 *   Body: { name?, logo?, description?, ownerID? }
 *   Note: ownerID updates are handled in Transfer Ownership section (coming soon)
 * 
 * - DELETE /api/organizations/:id - Deletes organization
 * 
 * Features:
 * - Real-time form validation
 * - Unsaved changes detection
 * - Toast notifications for success/error feedback
 * - Auto-save detection and visual indicators
 * - Confirmation dialogs for destructive actions
 */

interface Organization {
  organizations: {
    id: number
    ownerId: number
    name: string
    logo: string
    description: string
    isActiveOrg: boolean
    createdAt: number
    updatedAt: number
  }
  organization_relations: {
    id: number
    userId: number
    organizationId: number
    roleId: number
    createdAt: number
    updatedAt: number
  }
}

interface Props {
  organization: Organization | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  refresh: []
}>()

// Reactive state
const activeSection = ref('general')
const saving = ref(false)
const saved = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirmation = ref('')

// Form state for editing
const formData = ref({
  name: '',
  description: '',
  logo: ''
})

// Use real organization data when available, fallback to mock data
const settings = computed(() => {
  if (props.organization?.organizations) {
    const org = props.organization.organizations
    return {
      name: org.name,
      description: org.description || '',
      logo: org.logo || '',
      require2FA: false,
      enableSSO: false,
      sessionTimeout: '8h',
      ipWhitelist: '',
      notifications: {
        newMember: true,
        projectUpdates: true,
        securityAlerts: true
      }
    }
  }
  
  // Fallback to mock data when organization is not loaded
  return {
    name: 'Acme Corporation',
    description: 'A leading technology company focused on innovation and excellence.',
    logo: '',
    require2FA: false,
    enableSSO: false,
    sessionTimeout: '8h',
    ipWhitelist: '',
    notifications: {
      newMember: true,
      projectUpdates: true,
      securityAlerts: true
    }
  }
})

// Watch for organization changes and update form data
watch(() => props.organization, (newOrg) => {
  if (newOrg?.organizations) {
    const org = newOrg.organizations
    formData.value = {
      name: org.name,
      description: org.description || '',
      logo: org.logo || ''
    }
  }
}, { immediate: true })

// Setting sections
const settingSections = [
  { key: 'general', label: 'General', icon: 'i-heroicons-building-office', disabled: false },
  { key: 'security', label: 'Security', icon: 'i-heroicons-shield-check', disabled: true },
  { key: 'notifications', label: 'Notifications', icon: 'i-heroicons-bell', disabled: true },
  { key: 'danger', label: 'Danger Zone', icon: 'i-heroicons-exclamation-triangle', disabled: false }
]

// Computed properties
const isDeleteConfirmationValid = computed(() => {
  return deleteConfirmation.value.trim().toLowerCase() === settings.value.name.trim().toLowerCase()
})

const isGeneralFormValid = computed(() => {
  return formData.value.name.trim().length > 0
})

const hasUnsavedChanges = computed(() => {
  if (!props.organization?.organizations) return false
  
  const org = props.organization.organizations
  return (
    formData.value.name !== org.name ||
    formData.value.description !== (org.description || '') ||
    formData.value.logo !== (org.logo || '')
    // Add other fields when implemented:
    // formData.value.website !== (org.website || '') ||
    // formData.value.industry !== (org.industry || '') ||
    // formData.value.companySize !== (org.companySize || '')
  )
})

// Watch for disabled section access and redirect to general
watch(activeSection, (newSection) => {
  const section = settingSections.find(s => s.key === newSection)
  if (section?.disabled) {
    activeSection.value = 'general'
  }
})

// Warn user before leaving with unsaved changes
onMounted(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})

// Options
const sessionTimeoutOptions = [
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' },
  { label: '8 hours', value: '8h' },
  { label: '24 hours', value: '24h' },
  { label: 'Never', value: 'never' }
]

// Token for API requests
const token = useCookie('auth_token')

// Methods
const saveGeneralSettings = async () => {
  saving.value = true
  saved.value = false
  
  try {
    if (!props.organization?.organizations?.id) {
      throw new Error('Organization ID not found')
    }

    // Basic validation
    if (!formData.value.name.trim()) {
      throw new Error('Organization name is required')
    }    const updateData: Record<string, any> = {
      name: formData.value.name.trim(),
      logo: formData.value.logo || undefined,
      description: formData.value.description.trim()
    }

    // Remove undefined values to keep the request clean
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key]
      }
    })

    const response = await $fetch(`http://localhost:8787/api/organizations/${props.organization.organizations.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: updateData
    })

    console.log('General settings saved successfully:', response)
    
    // Show success state
    saved.value = true
    
    // Emit refresh event to update parent component
    emit('refresh')
      // Show success toast
    const toast = useToast()
    toast.add({
      title: 'Settings saved',
      description: 'Organization settings have been updated successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    // Reset saved state after 2 seconds
    setTimeout(() => {
      saved.value = false
    }, 2000)
    
  } catch (error: any) {
    console.error('Error saving settings:', error)
    
    // Show error toast
    const toast = useToast()
    toast.add({
      title: 'Failed to save settings',
      description: error.message || 'An error occurred while saving organization settings.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    saving.value = false
  }
}

const saveSecuritySettings = async () => {
  saving.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Security settings saved')
  } catch (error) {
    console.error('Error saving security settings:', error)
  } finally {
    saving.value = false
  }
}

const saveNotificationSettings = async () => {
  saving.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Notification settings saved')
  } catch (error) {
    console.error('Error saving notification settings:', error)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  if (props.organization?.organizations) {
    const org = props.organization.organizations
    formData.value = {
      name: org.name,
      description: org.description || '',
      logo: org.logo || ''
    }
  }
}

const deleteOrganization = async () => {
  deleting.value = true
  try {
    if (!props.organization?.organizations?.id) {
      throw new Error('Organization ID not found')
    }

    const response = await $fetch(`http://localhost:8787/api/organizations/${props.organization.organizations.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      }
    })

    console.log('Organization deleted successfully:', response)
      // Show success toast
    const toast = useToast()
    toast.add({
      title: 'Organization deleted',
      description: 'The organization has been permanently deleted.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    // Reset form state
    showDeleteConfirm.value = false
    deleteConfirmation.value = ''
    
    // Redirect to homepage after a brief delay
    setTimeout(async () => {
      await navigateTo('/homepage')
    }, 1500)
    
  } catch (error: any) {
    console.error('Error deleting organization:', error)
    
    // Show error toast
    const toast = useToast()
    toast.add({
      title: 'Failed to delete organization',
      description: error.message || 'An error occurred while deleting the organization.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
    
    // Reset form state on error too
    showDeleteConfirm.value = false
    deleteConfirmation.value = ''
  } finally {
    deleting.value = false
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
