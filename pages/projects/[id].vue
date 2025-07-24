<template>
  <div class="p-8">
    <!-- Project Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Project #{{ projectId }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Manage your project details, users, tasks, and settings
          </p>
        </div>
        <div class="flex gap-3">
          <UButton color="primary" variant="outline">
            <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-2" />
            Edit Project
          </UButton>
          <UButton color="primary">
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
            Add New Task
          </UButton>
        </div>
      </div>
    </div>    <!-- Debug info -->
    <div class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <p class="text-sm text-blue-600 dark:text-blue-400">
        Current Section: <strong>{{ currentSection }}</strong>
      </p>
    </div>

    <!-- Dynamic Content Based on Active Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <!-- Users Section -->
      <div v-if="currentSection === 'users'" class="p-6">
        <ProjectSectionsProjectUsersSection :project-id="projectId" />
      </div>

      <!-- Tasks Section -->
      <div v-else-if="currentSection === 'tasks'" class="p-6">
        <ProjectSectionsProjectTasksSection :project-id="projectId" />
      </div>

      <!-- Settings Section -->
      <div v-else-if="currentSection === 'settings'" class="p-6">
        <ProjectSectionsProjectSettingsSection :project-id="projectId" />      </div>      <!-- Classes Section -->
      <div v-else-if="currentSection === 'classes'" class="p-6">
        <ProjectSectionsProjectClassesSection :project-id="projectId" />
      </div>

      <!-- Upload Data Section -->
      <div v-else-if="currentSection === 'upload-data'" class="p-6">
        <ProjectSectionsProjectUploadDataSection :project-id="projectId" />
      </div>

      <!-- Annotation Section -->
      <div v-else-if="currentSection === 'annotate'" class="p-6">
        <ProjectSectionsProjectAnnotateSection :project-id="projectId" />
      </div>

      <!-- Default fallback -->
      <div v-else class="p-6">
        <div class="text-center text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto mb-4" />
          <h3 class="text-lg font-medium mb-2">No Content Available</h3>
          <p>Please select a section from the sidebar.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set the layout for this page
definePageMeta({
  layout: 'project'
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

// Get the current section from the global state
const currentSection = useState('currentProjectSection', () => 'users')

// Set page title
useHead({
  title: `Project ${projectId.value} - Labeloo`
})
</script>
