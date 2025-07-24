<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Project Tasks</h2>
      <UButton color="primary">
        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
        Create Task
      </UButton>
    </div>

    <!-- Task Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <p class="text-sm text-blue-600 dark:text-blue-400">Total Tasks</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-200">45</p>
          </div>
        </div>
      </div>
      
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600 mr-3" />
          <div>
            <p class="text-sm text-green-600 dark:text-green-400">Completed</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-200">32</p>
          </div>
        </div>
      </div>
      
      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-clock" class="w-8 h-8 text-yellow-600 mr-3" />
          <div>
            <p class="text-sm text-yellow-600 dark:text-yellow-400">In Progress</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-200">8</p>
          </div>
        </div>
      </div>
      
      <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <div class="flex items-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-600 mr-3" />
          <div>
            <p class="text-sm text-red-600 dark:text-red-400">Pending</p>
            <p class="text-2xl font-bold text-red-900 dark:text-red-200">5</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tasks List -->
    <div class="space-y-4">
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <h3 class="font-medium text-gray-900 dark:text-white">Image Classification Task #1</h3>            <UBadge color="success" variant="soft">Completed</UBadge>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500">Due: Dec 15, 2024</span>
            <UButton color="neutral" variant="ghost" size="sm">
              <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
            </UButton>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Classify 1000 images into categories: cats, dogs, birds
        </p>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
            <span class="text-sm text-gray-500">Assigned to: Jane Smith</span>
          </div>
          <div class="w-24 bg-gray-200 rounded-full h-2">
            <div class="bg-green-600 h-2 rounded-full" style="width: 100%"></div>
          </div>
        </div>
      </div>

      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <h3 class="font-medium text-gray-900 dark:text-white">Text Annotation Task #2</h3>
            <UBadge color="warning" variant="soft">In Progress</UBadge>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500">Due: Dec 20, 2024</span>
            <UButton color="neutral" variant="ghost" size="sm">
              <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
            </UButton>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Annotate sentiment analysis on customer reviews dataset
        </p>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
            <span class="text-sm text-gray-500">Assigned to: Mike Johnson</span>
          </div>
          <div class="w-24 bg-gray-200 rounded-full h-2">
            <div class="bg-yellow-600 h-2 rounded-full" style="width: 65%"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  projectId: string
}

const props = defineProps<Props>()
</script>
