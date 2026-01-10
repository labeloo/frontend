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
        <div class="bg-white dark:bg-neutral-900 rounded-lg shadow">
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
                      ? 'bg-primary/10 text-secondary border-secondary dark:border-secondary/50 border-l-4'
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
        <div v-if="activeSection === 'general'" class="bg-white dark:bg-neutral-900 rounded-lg shadow">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">General Information</h3>
            
            <!-- Loading State -->
            <div v-if="!props.organization" class="flex justify-center items-center py-12">
              <USpinner size="lg" />
              <span class="ml-3 text-gray-600 dark:text-gray-300">Loading organization data...</span>
            </div>
            
            <!-- Form -->
            <form v-else @submit.prevent="saveGeneralSettings" class="space-y-8">
              <!-- Organization Logo -->
              <UFormGroup>
                <template #label>
                  <div class="flex items-center space-x-2 mb-3">
                    <UIcon name="i-heroicons-photo" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span class="text-base font-semibold text-gray-900 dark:text-white">Organization Logo</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Optional</span>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload a visual representation of your organization for branding purposes</p>
                </template>
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
                  </div>
                  <div>
                    <!-- TODO: Implement logo upload functionality -->
                    <UButton color="secondary" variant="outline" size="sm" disabled>
                      <UIcon name="i-heroicons-cloud-arrow-up" class="w-4 h-4 mr-2" />
                      Upload Logo
                    </UButton>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">JPG, PNG up to 2MB (Upload coming soon)</p>
                  </div>
                </div>
              </UFormGroup>

              <!-- Organization Name -->
              <UFormGroup class="space-y-4">
                <template #label>
                  <div class="flex items-center space-x-3 mb-2">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <UIcon name="i-heroicons-building-office-2" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="text-base font-semibold text-gray-900 dark:text-white">Organization Name</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">Required</span>
                      </div>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">The public display name for your organization</p>
                    </div>
                  </div>
                </template>
                
                <!-- Clear Input Label -->
                <div class="mb-4 mt-6">
                  <label for="organization-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ">
                    Organization Name
                  </label>
                </div>
                
                <div class="relative">
                  <UInput 
                    id="organization-name"
                    v-model="formData.name" 
                    placeholder="Enter your organization name"
                    size="xl"
                    :color="formData.name.trim().length === 0 ? 'error' : 'neutral'"
                    class="text-lg font-medium shadow-sm transition-all duration-200 focus:shadow-md hover:shadow-sm rounded-xl px-4 py-4 bg-white dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600 focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
                    :aria-label="'Organization name input - currently: ' + (formData.name || 'empty')"
                  />
                  <div v-if="formData.name.trim().length > 0" class="absolute inset-y-0 right-0 flex items-center pr-4">
                    <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <template #help>
                  <div class="flex items-start space-x-3 mt-3 p-3 rounded-lg" :class="[
                    formData.name.trim().length === 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800'
                  ]">
                    <UIcon 
                      :name="formData.name.trim().length === 0 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" 
                      :class="[
                        'w-5 h-5 mt-0.5 flex-shrink-0',
                        formData.name.trim().length === 0 ? 'text-red-500' : 'text-neutral-500'
                      ]"
                    />
                    <div>
                      <p 
                        :class="[
                          'text-sm font-medium',
                          formData.name.trim().length === 0 ? 'text-red-800 dark:text-red-200' : 'text-neutral-800 dark:text-neutral-200'
                        ]"
                      >
                        {{ formData.name.trim().length === 0 ? 'Organization name is required' : 'Perfect! This name looks great' }}
                      </p>
                      <p 
                        :class="[
                          'text-xs mt-1',
                          formData.name.trim().length === 0 ? 'text-red-700 dark:text-red-300' : 'text-neutral-700 dark:text-neutral-300'
                        ]"
                      >
                        {{ formData.name.trim().length === 0 ? 'Please enter a name for your organization to continue.' : 'This name will appear in invitations, project headers, and throughout the platform.' }}
                      </p>
                    </div>
                  </div>
                </template>
              </UFormGroup>

              <!-- Description -->
              <UFormGroup class="space-y-4">
                <template #label>
                  <div class="flex items-center space-x-3 mb-2">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="text-base font-semibold text-gray-900 dark:text-white">Description</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Optional</span>
                      </div>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tell people what your organization is all about</p>
                    </div>
                  </div>
                </template>
                
                <!-- Clear Input Label -->
                <div class="mb-4 mt-6">
                  <label for="organization-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Description
                  </label>
                </div>
                
                <div class="relative w-full">
                  <UTextarea 
                    id="organization-description"
                    v-model="formData.description" 
                    placeholder="Share your organization's mission, values, or what makes it unique. This helps team members understand your purpose and attracts the right collaborators..."
                    :rows="5"
                    maxlength="500"
                    size="xl"
                    class="w-full text-base leading-relaxed shadow-sm transition-all duration-200 focus:shadow-md hover:shadow-sm resize-none rounded-xl px-4 py-4 bg-white dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600 focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
                    style="resize: none !important;"
                    :aria-label="'Organization description input - ' + (formData.description.length > 0 ? formData.description.length + ' characters entered' : 'empty')"
                  />
                  <div class="absolute bottom-3 right-3">
                    <span 
                      :class="[
                        'text-xs font-medium tabular-nums px-2 py-1 rounded-md',
                        formData.description.length > 450 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' :
                        formData.description.length > 400 ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      ]"
                    >
                      {{ formData.description.length }}/500
                    </span>
                  </div>
                </div>
                <template #help>
                  <div class="flex items-start space-x-3 mt-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800">
                    <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {{ formData.description.length === 0 ? 'Pro tip: Add a description to make your organization more discoverable' : 'Great! Your description helps others understand your organization' }}
                      </p>
                      <p class="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                        {{ formData.description.length === 0 ? 'A good description includes your mission, industry, or what makes your organization special.' : 'This description will be visible to team members and in organization directories.' }}
                      </p>
                    </div>
                  </div>
                </template>
              </UFormGroup>              <!-- Action Buttons -->
              <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <!-- Reset Button -->
                  <div class="flex items-center">
                    <UButton 
                      v-if="hasUnsavedChanges"
                      color="secondary" 
                      variant="ghost" 
                      size="md"
                      @click="resetForm"
                      :disabled="saving"
                      class="flex items-center"
                    >
                      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
                      Reset Changes
                    </UButton>
                  </div>
                  
                  <!-- Save Button -->
                  <div class="flex items-center">
                    <UButton 
                      type="submit" 
                      :color="saved ? 'success' : hasUnsavedChanges ? 'primary' : 'secondary'" 
                      :variant="hasUnsavedChanges ? 'solid' : 'outline'"
                      size="lg"
                      :loading="saving"
                      :disabled="saving || !isGeneralFormValid"
                      class="min-w-[140px] justify-center"
                    >
                      <UIcon v-if="saved" name="i-heroicons-check" class="w-5 h-5 mr-2" />
                      <UIcon v-else-if="hasUnsavedChanges" name="i-heroicons-pencil" class="w-5 h-5 mr-2" />
                      <UIcon v-else name="i-heroicons-document-check" class="w-5 h-5 mr-2" />
                      <span class="font-medium">
                        {{ saved ? 'Saved!' : saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes' }}
                      </span>
                    </UButton>
                  </div>
                </div>
                
                <!-- Success/Info Messages -->
                <div v-if="hasUnsavedChanges || saved" class="mt-4 p-4 rounded-lg" :class="[
                  saved ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                  hasUnsavedChanges ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                  'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                ]">
                  <div class="flex items-center space-x-3">
                    <UIcon 
                      :name="saved ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'" 
                      :class="[
                        'w-5 h-5',
                        saved ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                      ]"
                    />
                    <div>
                      <p :class="[
                        'text-sm font-medium',
                        saved ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'
                      ]">
                        {{ saved ? 'Changes saved successfully!' : 'You have unsaved changes' }}
                      </p>
                      <p :class="[
                        'text-xs mt-1',
                        saved ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                      ]">
                        {{ saved ? 'Your organization settings have been updated.' : 'Don\'t forget to save your changes before leaving this page.' }}
                      </p>
                    </div>
                  </div>
                </div>
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

        <!-- Backend Connections -->
        <div v-else-if="activeSection === 'backend'" class="bg-white dark:bg-neutral-900 rounded-lg shadow">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Backend Connections</h3>
            
            <!-- Model Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               <UModal 
                 v-for="type in backendTypes"
                 :key="type.id"
                 v-model="modalStates[type.id]"
               >
                 <div 
                   class="border rounded-lg p-4 cursor-pointer hover:border-primary-500 transition-colors relative group"
                   :class="getConnection(type.id) ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800'"
                   @click="openModelConfig(type.id)"
                 >
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                           <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 class="font-medium text-gray-900 dark:text-white">{{ type.name }}</h4>
                          <p class="text-xs text-gray-500 dark:text-gray-400">Configure {{ type.name }} connection</p>
                        </div>
                      </div>
                      <div v-if="getConnection(type.id)" class="flex items-center text-green-600 dark:text-green-400 text-xs font-medium">
                        <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
                        Connected
                      </div>
                    </div>
                 </div>

                 <template #content>
                    <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
                      <template #header>
                        <div class="flex items-center justify-between">
                          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                            Configure {{ type.name }}
                          </h3>
                          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="modalStates[type.id] = false" />
                        </div>
                      </template>

                      <div class="space-y-4">
                          <UFormGroup label="Endpoint URL">
                            <UInput
                              v-model="newConnection.endpoint"
                              placeholder="https://api.example.com"
                            />
                          </UFormGroup>

                          <UFormGroup label="API Key">
                            <UInput
                              v-model="newConnection.apiKey"
                              type="password"
                              placeholder="sk-..."
                              icon="i-heroicons-key"
                            />
                          </UFormGroup>
                          
                          <div v-if="testResult" class="text-sm" :class="testResult.success ? 'text-green-600' : 'text-red-600'">
                            <div class="flex items-center">
                              <UIcon :name="testResult.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" class="w-4 h-4 mr-1" />
                              {{ testResult.message }}
                            </div>
                          </div>
                      </div>

                      <template #footer>
                        <div class="flex justify-end space-x-3">
                          <UButton color="neutral" variant="ghost" @click="modalStates[type.id] = false">Cancel</UButton>
                          <UButton
                            color="tertiary"
                            variant="ghost"
                            @click="testConnection"
                            :loading="testingConnection"
                            :disabled="!newConnection.endpoint"
                          >
                            Test Connection
                          </UButton>
                          <UButton
                            color="primary"
                            @click="saveConnection"
                            :disabled="!connectionVerified"
                          >
                            {{ getConnection(type.id) ? 'Update' : 'Connect' }}
                          </UButton>
                        </div>
                      </template>
                    </UCard>
                 </template>
               </UModal>
            </div>

            <!-- Existing Connections List -->
            <div class="space-y-4" v-if="backendConnections.length > 0">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">Active Connections</h4>
              
              <div v-for="(conn, index) in backendConnections" :key="index" class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="flex items-center space-x-4">
                  <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <UIcon name="i-heroicons-server" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 dark:text-white uppercase">{{ conn.backendTypeName }}</h5>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ conn.baseUrl }}</p>
                  </div>
                </div>
                
                <div class="flex items-center space-x-3">
                  <UToggle v-model="conn.isActive" @change="toggleConnection(conn)" />
                  
                  <UModal v-model="modalStates[conn.backendId]">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="sm"
                      @click="openModelConfig(conn.backendId)"
                    />
                    <template #content>
                      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
                        <template #header>
                          <div class="flex items-center justify-between">
                            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                              Configure {{ conn.backendTypeName }}
                            </h3>
                            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="modalStates[conn.backendId] = false" />
                          </div>
                        </template>

                        <div class="space-y-4">
                            <UFormGroup label="Endpoint URL">
                              <UInput
                                v-model="newConnection.endpoint"
                                placeholder="https://api.example.com"
                              />
                            </UFormGroup>

                            <UFormGroup label="API Key">
                              <UInput
                                v-model="newConnection.apiKey"
                                type="password"
                                placeholder="sk-..."
                                icon="i-heroicons-key"
                              />
                            </UFormGroup>
                            
                            <div v-if="testResult" class="text-sm" :class="testResult.success ? 'text-green-600' : 'text-red-600'">
                              <div class="flex items-center">
                                <UIcon :name="testResult.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" class="w-4 h-4 mr-1" />
                                {{ testResult.message }}
                              </div>
                            </div>
                        </div>

                        <template #footer>
                          <div class="flex justify-end space-x-3">
                            <UButton color="neutral" variant="ghost" @click="modalStates[conn.backendId] = false">Cancel</UButton>
                            <UButton
                              color="tertiary"
                              variant="ghost"
                              @click="testConnection"
                              :loading="testingConnection"
                              :disabled="!newConnection.endpoint"
                            >
                              Test Connection
                            </UButton>
                            <UButton
                              color="primary"
                              @click="saveConnection"
                              :disabled="!connectionVerified"
                            >
                              Update
                            </UButton>
                          </div>
                        </template>
                      </UCard>
                    </template>
                  </UModal>

                  <UButton
                    color="warning"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    size="sm"
                    @click="removeConnection(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div v-else-if="activeSection === 'danger'" class="bg-white dark:bg-neutral-900 rounded-lg shadow border border-red-200 dark:border-red-800">
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

interface BackendType {
  id: string
  name: string
  isActive: boolean
}

interface BackendConnection {
  id: number
  organizationId: number
  backendId: string
  backendTypeName: string
  baseUrl: string
  apiKey?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  // UI specific fields
  status?: 'verified' | 'unverified'
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

// Backend Connections State
const backendTypes = ref<BackendType[]>([])
const backendConnections = ref<BackendConnection[]>([])
const newConnection = ref({
  name: 'sam2',
  endpoint: '',
  apiKey: ''
})
const testingConnection = ref(false)
const connectionVerified = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const modalStates = ref<Record<string, boolean>>({})
const selectedModel = ref('')

onMounted(() => {
  fetchBackendTypes()
  fetchBackendConnections()
})

const getConnection = (name: string) => {
  return backendConnections.value.find(c => c.backendId === name)
}

const openModelConfig = (modelName: string) => {
  console.log('Opening config for:', modelName)
  selectedModel.value = modelName
  const existing = getConnection(modelName)
  
  newConnection.value = {
    name: modelName,
    endpoint: existing ? existing.baseUrl : '',
    apiKey: existing ? existing.apiKey || '' : ''
  }
  
  testResult.value = null
  connectionVerified.value = false 
  modalStates.value[modelName] = true
}

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
  { key: 'backend', label: 'Backend Connections', icon: 'i-heroicons-server', disabled: false },
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

    const response = await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${props.organization.organizations.id}`, {
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

const testConnection = async () => {
  if (!newConnection.value.endpoint) return
  
  testingConnection.value = true
  testResult.value = null
  connectionVerified.value = false
  
  try {
    // Ensure endpoint has protocol
    let endpoint = newConnection.value.endpoint.trim()
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint}`
    }
    
    // Remove trailing slash if present
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1)
    }

    // Update the input with the sanitized value
    newConnection.value.endpoint = endpoint

    const response = await $fetch<{ success: boolean; name: string }>(`${endpoint}/health`, {
      method: 'GET',
      timeout: 5000
    })

    if (response.success) {
      testResult.value = {
        success: true,
        message: `Successfully connected to ${response.name || newConnection.value.name}`
      }
      connectionVerified.value = true
      // Update the name to match what the server returned if needed, or just verify it matches
      if (response.name && response.name !== newConnection.value.name) {
        testResult.value.message += ` (Note: Server identified as ${response.name})`
      }
    } else {
      throw new Error('Invalid response from server')
    }
  } catch (error: any) {
    console.error('Connection test failed:', error)
    testResult.value = {
      success: false,
      message: `Connection failed: ${error.message || 'Unknown error'}`
    }
    connectionVerified.value = false
  } finally {
    testingConnection.value = false
  }
}

// API Methods for Backend Connections
const fetchBackendTypes = async () => {
  try {
    const response = await $fetch<{ data: BackendType[] }>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations/types', {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'orgId': props.organization?.organizations?.id.toString() || ''
      }
    })
    backendTypes.value = response.data
    // Initialize modal states
    response.data.forEach(type => {
      modalStates.value[type.id] = false
    })
  } catch (error) {
    console.error('Error fetching backend types:', error)
  }
}

const fetchBackendConnections = async () => {
  try {
    const response = await $fetch<{ data: BackendConnection[] }>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations', {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'orgId': props.organization?.organizations?.id.toString() || ''
      }
    })
    backendConnections.value = response.data.map(conn => ({
      ...conn,
      status: 'verified' // Assume fetched connections are verified
    }))
    // Initialize modal states for connections
    response.data.forEach(conn => {
      modalStates.value[conn.backendId] = false
    })
  } catch (error) {
    console.error('Error fetching backend connections:', error)
  }
}

const saveConnection = async () => {
  if (!connectionVerified.value) return
  
  saving.value = true
  try {
    const existing = getConnection(newConnection.value.name)
    // Find backend type by ID (which matches the name 'sam2', 'sam3' etc)
    const backendType = backendTypes.value.find(t => t.id === newConnection.value.name)
    
    if (!backendType) {
      throw new Error(`Backend type ${newConnection.value.name} not found`)
    }

    if (existing) {
      // Update existing
      const response = await $fetch<{ data: BackendConnection }>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${existing.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'orgId': props.organization?.organizations?.id.toString() || ''
        },
        body: {
          baseUrl: newConnection.value.endpoint,
          apiKey: newConnection.value.apiKey,
          isActive: true
        }
      })
      
      // Update local state
      const index = backendConnections.value.findIndex(c => c.id === existing.id)
      if (index !== -1) {
        backendConnections.value[index] = { ...response.data, status: 'verified' }
      }
    } else {
      // Create new
      const response = await $fetch<{ data: BackendConnection }>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'orgId': props.organization?.organizations?.id.toString() || ''
        },
        body: {
          backendId: backendType.id,
          baseUrl: newConnection.value.endpoint,
          apiKey: newConnection.value.apiKey,
          isActive: true
        }
      })
      
      backendConnections.value.push({ ...response.data, status: 'verified' })
    }

    if (selectedModel.value) {
      modalStates.value[selectedModel.value] = false
    }
    
    const toast = useToast()
    toast.add({
      title: 'Connection saved',
      description: `Backend connection for ${newConnection.value.name} has been saved successfully.`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error: any) {
    console.error('Error saving connection:', error)
    const toast = useToast()
    toast.add({
      title: 'Failed to save connection',
      description: error.message || 'An error occurred while saving the connection.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    saving.value = false
  }
}

const removeConnection = async (index: number) => {
  const conn = backendConnections.value[index]
  if (!conn) return

  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${conn.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'orgId': props.organization?.organizations?.id.toString() || ''
      }
    })
    
    backendConnections.value.splice(index, 1)
    
    const toast = useToast()
    toast.add({
      title: 'Connection removed',
      description: 'Backend connection has been removed successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error: any) {
    console.error('Error removing connection:', error)
    const toast = useToast()
    toast.add({
      title: 'Failed to remove connection',
      description: error.message || 'An error occurred while removing the connection.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

const toggleConnection = async (conn: BackendConnection) => {
  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${conn.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'orgId': props.organization?.organizations?.id.toString() || ''
      },
      body: {
        isActive: conn.isActive
      }
    })
  } catch (error: any) {
    console.error('Error toggling connection:', error)
    // Revert change on error
    conn.isActive = !conn.isActive
    
    const toast = useToast()
    toast.add({
      title: 'Failed to update connection',
      description: error.message || 'An error occurred while updating the connection status.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
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

    const response = await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${props.organization.organizations.id}`, {
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
