<template>
    <!-- Sidebar -->
    <aside class="bg-white dark:bg-gray-800 shadow-lg h-screen w-64 fixed left-0 top-0 z-40 border-r border-gray-200 dark:border-gray-700">
        <div class="flex flex-col h-full">
            <!-- Logo/Header -->
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                <NuxtLink :to="{ name: 'homepage' }">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white hover:cursor-pointer">Labeloo</h1>
                </NuxtLink>
            </div>            <!-- Navigation Menu -->
            <div class="flex-1 p-4 overflow-y-auto">
                <!-- Manual navigation for debugging -->
                <div class="space-y-1">
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Organization</div>
                    
                    <button
                        @click="handleNavClick('overview')"
                        :class="[
                            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                            activeSection === 'overview'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                    >
                        <UIcon name="i-heroicons-home" class="w-4 h-4 mr-3" />
                        Overview
                    </button>
                    
                    <button
                        @click="handleNavClick('projects')"
                        :class="[
                            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                            activeSection === 'projects'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                    >
                        <UIcon name="i-heroicons-folder" class="w-4 h-4 mr-3" />
                        Projects
                    </button>
                    
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Management</div>
                    
                    <button
                        @click="handleNavClick('users')"
                        :class="[
                            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                            activeSection === 'users'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                    >
                        <UIcon name="i-heroicons-users" class="w-4 h-4 mr-3" />
                        Users
                    </button>
                    
                    <button
                        @click="handleNavClick('roles')"
                        :class="[
                            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                            activeSection === 'roles'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                    >
                        <UIcon name="i-heroicons-user-group" class="w-4 h-4 mr-3" />
                        Roles
                    </button>
                    
                    <button
                        @click="handleNavClick('settings')"
                        :class="[
                            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                            activeSection === 'settings'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                    >
                        <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 mr-3" />
                        Settings
                    </button>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex flex-col gap-2">
                    <UtilsColorModeButton class="hover:cursor-pointer" />
                    <UButton color="secondary" block class="hover:cursor-pointer" @click="handleLogout">
                        <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-4 h-4 mr-2" />
                        Logout
                    </UButton>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

// Define middleware as a navigation guard
definePageMeta({
    middleware: [async () => {
        const { isAuthenticated } = useAuth()
        if (!isAuthenticated.value) {
            return navigateTo('/login')
        }
    }]
})

const { logout } = useAuth()
const route = useRoute()

// Emit events for component navigation
const emit = defineEmits<{
  'section-change': [section: string]
}>()

// Current active section - default to overview
const activeSection = ref('overview')

const handleLogout = () => {
    logout()
}

// Handle navigation clicks
const handleNavClick = (section: string) => {
    activeSection.value = section
    emit('section-change', section)
}
</script>