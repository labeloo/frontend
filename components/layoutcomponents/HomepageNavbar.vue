<template>    <header class="bg-primary dark:bg-primary-500 shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">            <NuxtLink :to="{name: 'homepage'}">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white hover:cursor-pointer">Labeloo</h1>
            </NuxtLink>
            <div class="flex items-center gap-3">
                <!-- Reviews Link with Badge -->
                <NuxtLink 
                    to="/reviews" 
                    class="relative flex items-center px-3 py-2 text-sm font-medium text-black-700 dark:text-white-300  dark:hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 mr-2" />
                    <span>Reviews</span>
                    <!-- Pending Count Badge -->
                    <span 
                        v-if="pendingCount > 0"
                        class="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse"
                    >
                        {{ pendingCount > 99 ? '99+' : pendingCount }}
                    </span>
                </NuxtLink>
                
                <UtilsColorModeButton class="hover:cursor-pointer" />
                
                <!-- User Menu with Notifications -->
                <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
                    <UButton class="text-sm font-medium cursor-pointer text-black-700 dark:text-white-300  dark:hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                        <UIcon name="i-heroicons-user-circle" class="w-5 h-5 mr-1" />
                        <span class="hidden sm:inline">Account</span>
                        <!-- Notification indicator -->
                        <span 
                            v-if="hasNotifications" 
                            class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
                        />
                    </UButton>
                </UDropdown>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useReviewNotificationsAutoRefresh } from '@/composables/useReviewNotifications'

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
const router = useRouter()

// Use auto-refresh notifications (polls every 30 seconds)
const { pendingCount, hasNotifications } = useReviewNotificationsAutoRefresh(30000)

/**
 * Handle logout
 */
const handleLogout = () => {
    logout()
}

/**
 * Navigate to reviews page
 */
const goToReviews = () => {
    router.push('/reviews')
}

/**
 * User menu dropdown items
 */
const userMenuItems = computed(() => {
    const items: any[][] = []
    
    // Notifications section (if any pending reviews)
    if (pendingCount.value > 0) {
        items.push([
            {
                label: `You have ${pendingCount.value} pending review${pendingCount.value > 1 ? 's' : ''}`,
                icon: 'i-heroicons-clipboard-document-check',
                class: 'text-amber-600 dark:text-amber-400',
                click: goToReviews
            }
        ])
    }
    
    // Account actions
    items.push([
        {
            label: 'My Reviews',
            icon: 'i-heroicons-clipboard-document-list',
            click: goToReviews
        },
        {
            label: 'Settings',
            icon: 'i-heroicons-cog-6-tooth',
            disabled: true
        }
    ])
    
    // Logout
    items.push([
        {
            label: 'Logout',
            icon: 'i-heroicons-arrow-right-on-rectangle',
            click: handleLogout
        }
    ])
    
    return items
})
</script>