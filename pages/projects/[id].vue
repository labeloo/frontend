<template>
  <div>
    <!-- What this project is, printed once. It replaced two buttons ("Edit
         Project", "Add New Task") that were wired to nothing at all. -->
    <header class="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-stock-400 px-4 py-5 sm:px-6 lg:px-8">
      <h1 class="text-xl font-semibold tracking-[-0.02em] text-stock-950">
        {{ projectName || `Project ${projectId}` }}
      </h1>

      <dl class="furniture flex flex-wrap items-baseline gap-x-6 gap-y-2 text-stock-600">
        <div class="docket-field"><dt>Project</dt><dd>{{ projectId }}</dd></div>
        <div v-if="classCount" class="docket-field"><dt>Inks</dt><dd>{{ classCount }}</dd></div>
        <div v-if="projectDescription" class="docket-field hidden lg:flex">
          <dt>Brief</dt>
          <dd class="max-w-[26rem] truncate normal-case tracking-normal">{{ projectDescription }}</dd>
        </div>
      </dl>
    </header>

    <p v-if="projectLoadError" class="furniture border-b border-stock-400 bg-stock-100 px-4 py-2 text-correct-500 sm:px-6 lg:px-8">
      {{ projectLoadError }}
    </p>

    <div class="px-4 py-8 sm:px-6 lg:px-8">
      <ProjectSectionsProjectUsersSection v-if="currentSection === 'users'" :project-id="projectId" />

      <ProjectSectionsProjectTasksSection v-else-if="currentSection === 'tasks'" :project-id="projectId" />

      <ProjectSectionsProjectSettingsSection v-else-if="currentSection === 'settings'" :project-id="projectId" />

      <ProjectSectionsProjectClassesSection v-else-if="currentSection === 'classes'" :project-id="projectId" />

      <ProjectSectionsProjectUploadDataSection v-else-if="currentSection === 'upload-data'" :project-id="projectId" />

      <ProjectSectionsProjectAnnotateSection v-else-if="currentSection === 'annotate'" :project-id="projectId" />

      <div v-else class="max-w-xl border border-stock-400 bg-stock-100 p-6">
        <p class="furniture text-stock-600">Nothing selected</p>
        <p class="mt-2 text-[13px] leading-snug text-stock-700">
          This project has no section open. Pick one from the sidebar — Annotate holds the task
          pool, Upload Data adds images or video, Classes defines the label vocabulary.
        </p>
        <NuxtLink :to="{ path: route.path, query: { ...route.query, section: 'annotate' } }" class="ink-button mt-5 inline-flex">
          Open Annotate
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectRecord } from '~/components/project/useProjectRecord'

definePageMeta({
  layout: 'project'
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const currentSection = useState('currentProjectSection', () => 'annotate')

const { project, projectName, classCount, loadError: projectLoadError, load } = useProjectRecord(projectId)

const projectDescription = computed(() => project.value?.description?.trim() || '')

watch(projectId, () => load(), { immediate: true })
onMounted(() => load())

useHead({
  title: computed(() => `${projectName.value || `Project ${projectId.value}`} — Labeloo`)
})
</script>
