<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Project Users</h2>
      <UButton color="primary">
        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
        Add User
      </UButton>
    </div>

    <!-- Users List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">John Doe</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Project Manager</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">          <UBadge color="success" variant="soft">Active</UBadge>
          <UButton color="neutral" variant="ghost" size="sm">
            <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
          </UButton>
        </div>
      </div>

      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Jane Smith</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Data Annotator</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <UBadge color="success" variant="soft">Active</UBadge>
          <UButton color="neutral" variant="ghost" size="sm">
            <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
          </UButton>
        </div>
      </div>

      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Mike Johnson</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Reviewer</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <UBadge color="warning" variant="soft">Pending</UBadge>
          <UButton color="neutral" variant="ghost" size="sm">
            <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
          </UButton>
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
