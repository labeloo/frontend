<template>    <div>
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-8">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Your Organizations</h2>
                    <p class="mt-1 text-gray-500 dark:text-gray-400">Manage your organizations and their projects</p>
                </div>
                <OrganizationList />
            </div>
        </main>
    </div>
</template>

<script setup>
  definePageMeta({
  layout: 'homepage'
})
</script>