<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-stock-950">Organizations</h1>
    <p class="mt-1.5 text-[15px] text-stock-600">
      Every project, task and label class lives inside one of these.
    </p>

    <!-- The shortest way back to the plate. Without it the first pixel is four
         page loads away, and none of them is remembered. -->
    <section aria-labelledby="resume-heading" class="mt-8 border border-stock-400 px-5 py-4">
      <h2 id="resume-heading" class="sr-only">Work in progress</h2>

      <p v-if="resumeState === 'loading'" class="furniture text-stock-600">Checking your tasks</p>

      <div v-else-if="resumeState === 'failed'" class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-[14px] text-correct-500">
          Your assigned tasks could not be loaded, so the shortcut into them is missing. The
          organizations below are unaffected.
        </p>
        <button type="button" class="ink-button ink-button--outline" @click="loadAssignedWork">
          Try again
        </button>
      </div>

      <div v-else-if="nextTask" class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-[15px] font-semibold text-stock-950">Pick up where you left off</p>
          <dl class="furniture mt-2.5 flex flex-wrap gap-x-6 gap-y-2 text-stock-600">
            <div class="docket-field"><dt>Task</dt><dd>#{{ nextTask.id }}</dd></div>
            <div class="docket-field"><dt>Project</dt><dd>#{{ nextTask.projectId }}</dd></div>
            <div class="docket-field"><dt>In progress</dt><dd>{{ openTasks.length }}</dd></div>
          </dl>
        </div>
        <NuxtLink :to="`/annotate/${nextTask.id}`" class="ink-button">Open task {{ nextTask.id }}</NuxtLink>
      </div>

      <p v-else class="text-[14px] text-stock-600">
        Nothing is in progress. Open an organization, then a project, to start or claim a task.
      </p>
    </section>

    <div class="mt-10">
      <OrganizationList />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'homepage',
  middleware: 'auth'
})

useHead({ title: 'Organizations' })

interface AssignedTask {
  id: number
  projectId: number
  status: string
}

const token = useCookie('auth_token')

const resumeState = ref<'loading' | 'ready' | 'failed'>('loading')
const openTasks = ref<AssignedTask[]>([])
const nextTask = computed<AssignedTask | null>(() => openTasks.value[0] ?? null)

/** Tasks already under way, newest priority first - the same list the project
 *  screen reads, unfiltered by project so it answers "what was I doing?". */
const loadAssignedWork = async () => {
  if (!token.value) {
    resumeState.value = 'failed'
    return
  }

  resumeState.value = 'loading'

  try {
    const response = await $fetch<{ data?: AssignedTask[] }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/my-tasks`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )

    const tasks = Array.isArray(response?.data) ? response.data : []
    openTasks.value = tasks.filter(task => task.status === 'annotating')
    resumeState.value = 'ready'
  } catch (error) {
    resumeState.value = 'failed'
  }
}

onMounted(loadAssignedWork)
</script>
