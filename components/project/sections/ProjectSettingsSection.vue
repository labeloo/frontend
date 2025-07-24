<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Project Settings</h2>
      <UButton color="primary">
        <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-2" />
        Edit Settings
      </UButton>
    </div>

    <div class="space-y-6">
      <!-- General Settings -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">General Settings</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name
            </label>
            <UInput
              placeholder="Enter project name"
              value="AI Image Classification Project"
              readonly
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Description
            </label>
            <UTextarea
              placeholder="Enter project description"
              value="A comprehensive project for training AI models to classify images into different categories."
              readonly
            />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Type
              </label>
              <USelect
                placeholder="Select project type"
                :options="[
                  { label: 'Image Classification', value: 'image_classification' },
                  { label: 'Text Analysis', value: 'text_analysis' },
                  { label: 'Object Detection', value: 'object_detection' }
                ]"
                value="image_classification"
                disabled
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <USelect
                placeholder="Select status"
                :options="[
                  { label: 'Active', value: 'active' },
                  { label: 'Paused', value: 'paused' },
                  { label: 'Completed', value: 'completed' }
                ]"
                value="active"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Project Statistics -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Project Statistics</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">15</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          </div>
          
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">45</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          </div>
          
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">71%</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-red-900 dark:text-red-400 mb-4">Danger Zone</h3>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Archive Project</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Archive this project to hide it from active projects</p>
            </div>            <UButton color="warning" variant="outline">Archive</UButton>
          </div>
          
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Delete Project</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Permanently delete this project and all its data</p>
            </div>
            <UButton color="error" variant="outline">Delete</UButton>
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
