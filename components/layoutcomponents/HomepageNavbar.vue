<template>    <header class="bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">            <NuxtLink :to="{name: 'homepage'}">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white hover:cursor-pointer">Labeloo</h1>
            </NuxtLink>
            <div class="flex items-center gap-3">
                <!-- Reviews Link with Badge -->
                <NuxtLink 
                    to="/reviews" 
                    class="relative flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 mr-2" />
                    <span>Reviews</span>
                    <!-- Pending Count Badge -->
                    <span 
                        v-if="globalPendingCount > 0"
                        class="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full"
                    >
                        {{ globalPendingCount > 99 ? '99+' : globalPendingCount }}
                    </span>
                </NuxtLink>
                
                <UtilsColorModeButton class="hover:cursor-pointer" />
                <UButton color="secondary" class="hover:cursor-pointer" @click="handleLogout">Logout</UButton>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useReviewCounts } from '@/composables/useReviewCounts'

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
const { globalPendingCount, fetchGlobalCounts } = useReviewCounts()

const handleLogout = () => {
    logout()
}

// Fetch review counts on mount
onMounted(() => {
    fetchGlobalCounts()
})
</script>