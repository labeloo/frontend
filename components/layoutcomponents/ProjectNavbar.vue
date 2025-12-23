<template>
    <!-- Sidebar -->
    <aside
        class="bg-white dark:bg-gray-800 shadow-lg h-screen w-64 fixed left-0 top-0 z-40 border-r border-gray-200 dark:border-gray-700">
        <div class="flex flex-col h-full">
            <!-- Logo/Header -->
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                <NuxtLink :to="{ name: 'homepage' }">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white hover:cursor-pointer">Labeloo</h1>
                </NuxtLink>
                <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Project Dashboard</p>
                </div>
            </div>

            <!-- Navigation Menu -->
            <div class="flex-1 p-4 overflow-y-auto">
                <div class="space-y-1">
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project</div>

                    <button @click="handleNavClick('annotate')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'annotate'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 mr-3" />
                        Annotate
                    </button>

                    <button @click="handleNavClick('tasks')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'tasks'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4 mr-3" />
                        Tasks
                    </button>

                    <button @click="handleNavClick('users')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'users'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-users" class="w-4 h-4 mr-3" />
                        Users
                    </button>

                    <button @click="handleNavClick('upload-data')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'upload-data'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-cloud-arrow-up" class="w-4 h-4 mr-3" />
                        Upload Data
                    </button>

                    <button @click="handleNavClick('classes')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'classes'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-academic-cap" class="w-4 h-4 mr-3" />
                        Classes
                    </button>

                    <button @click="handleNavClick('settings')" :class="[
                        'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                        activeSection === 'settings'
                            ? 'bg-info text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]">
                        <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 mr-3" />
                        Settings
                    </button>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex flex-col gap-2">
                    <UtilsColorModeButton class="hover:cursor-pointer" />
                    <UButton color="neutral" variant="ghost" block class="hover:cursor-pointer"
                        @click="handleBackToOrg">
                        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
                        Back to Organization
                    </UButton>
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
const token = useCookie('auth_token')

// Emit events for component navigation
const emit = defineEmits<{
    'section-change': [section: string]
}>()

// Current active section - sync with global state
const activeSection = useState('currentProjectSection', () => 'annotate')

const handleLogout = () => {
    logout()
}

// Handle navigation clicks
const handleNavClick = (section: string) => {
    activeSection.value = section
    emit('section-change', section)
}

// Handle back to organization navigation
const handleBackToOrg = async () => {
    try {
        // Get the current project ID from the route
        const projectId = route.params.id
        
        if (!projectId || !token.value) {
            // Fallback to homepage if no project ID or token
            console.error('Missing project ID or token')
            await navigateTo('/homepage')
            return
        }

        // Define the expected response type
        interface ProjectResponse {
            data: {
                projects: {
                    id: number
                    organizationId: number
                    name: string
                    description: string
                    projectType: number
                    createdAt: number
                    updatedAt: number
                }
            }
        }

        // Fetch project data to get organization ID using $fetch like other components
        const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token.value}`
            }
        })

        const organizationId = response.data?.projects?.organizationId

        if (organizationId) {

            // Navigate to the organization page
            await navigateTo(`/organizations/${organizationId}`)
            return
        } else {

            console.error('No organization ID found in response:', response)
        }
        
        // Fallback if API call fails or no organization ID found

        await navigateTo('/homepage')
    } catch (error) {
        console.error('Error navigating back to organization:', error)
        // Fallback to homepage on error
        await navigateTo('/homepage')
    }
}
</script>
