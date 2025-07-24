<template>    <header class="bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">            <NuxtLink :to="{name: 'homepage'}">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white hover:cursor-pointer">Labeloo</h1>
            </NuxtLink>
            <div class="flex items-center gap-3">
                <UtilsColorModeButton class="hover:cursor-pointer" />
                <UButton color="secondary" class="hover:cursor-pointer" @click="handleLogout">Logout</UButton>
            </div>
        </div>
    </header>
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

const handleLogout = () => {
    logout()
}
</script>