<!--
  The progress sheet. This screen used to print invented figures (45 tasks, a
  Jane Smith, a December due date) that no project ever produced; every number
  here now comes from the same /api/tasks/my-tasks record the pool reads, and
  when a figure cannot be known it is not shown.
-->
<template>
  <section class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-[-0.02em] text-stock-950">Progress</h2>
        <p class="mt-1 text-[13px] text-stock-700">
          {{ canViewAllTasks
            ? 'Every task in this project, and who is holding it.'
            : 'The tasks assigned to you in this project.' }}
        </p>
      </div>

      <button
        type="button"
        class="ink-button ink-button--outline"
        :disabled="loading"
        @click="load()"
      >
        <UIcon :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-rotate-cw'" class="size-3.5" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </header>

    <!-- Failure states say the problem and the way out. -->
    <div v-if="error" class="border border-correct-500 bg-stock-100 p-5">
      <p class="furniture text-correct-500">Progress could not be read</p>
      <p class="mt-2 max-w-xl text-[13px] leading-snug text-stock-700">{{ error }}</p>
      <button type="button" class="ink-button mt-4" @click="load()">Try again</button>
    </div>

    <p v-else-if="loading && !loaded" class="furniture text-stock-600">Reading tasks…</p>

    <template v-else>
      <!-- Nothing to count yet: say why, and where tasks come from. -->
      <div v-if="total === 0" class="border border-stock-400 bg-stock-100 p-6">
        <p class="furniture text-stock-600">No tasks yet</p>
        <p class="mt-2 max-w-xl text-[13px] leading-snug text-stock-700">
          {{ canViewAllTasks
            ? 'Tasks are not written by hand: one is created for every image you upload, and one for every frame extracted from a video. Upload data to fill this project.'
            : 'Nothing in this project is assigned to you yet. A project editor assigns work from the task pool.' }}
        </p>
        <button
          v-if="canViewAllTasks"
          type="button"
          class="ink-button mt-5"
          @click="goToSection('upload-data')"
        >
          <UIcon name="i-lucide-upload" class="size-3.5" />
          Upload data
        </button>
      </div>

      <template v-else>
        <!-- The four facts, printed as a docket rather than four cards. -->
        <div>
          <dl class="docket furniture flex-wrap gap-x-8 gap-y-2 px-4 py-3 text-stock-600">
            <div class="docket-field"><dt>Tasks</dt><dd>{{ total }}</dd></div>
            <div class="docket-field"><dt>Completed</dt><dd>{{ completedCount }} · {{ completedPercent }}%</dd></div>
            <div class="docket-field"><dt>In progress</dt><dd>{{ annotatingCount }}</dd></div>
            <div class="docket-field"><dt>Unassigned</dt><dd>{{ unassignedCount }}</dd></div>
          </dl>

          <div class="h-2 w-full border border-t-0 border-stock-400 bg-stock-100" role="img" :aria-label="`${completedPercent}% of tasks completed`">
            <div class="h-full bg-stock-950" :style="{ width: `${completedPercent}%` }"></div>
          </div>
        </div>

        <!-- Who is holding what. Only meaningful when the whole pool is visible. -->
        <div v-if="canViewAllTasks" class="space-y-3">
          <h3 class="furniture text-stock-600">By member</h3>

          <p v-if="workload.length === 0" class="text-[13px] text-stock-700">
            No task in this project is assigned to anyone yet. Open Annotate to hand work out.
          </p>

          <table v-else class="w-full border-collapse">
            <caption class="sr-only">Tasks held by each member of this project</caption>
            <thead>
              <tr class="furniture border-b border-stock-400 text-left text-stock-600">
                <th scope="col" class="py-2 pr-4 font-normal">Member</th>
                <th scope="col" class="py-2 pr-4 text-right font-normal">In progress</th>
                <th scope="col" class="py-2 pr-4 text-right font-normal">Completed</th>
                <th scope="col" class="py-2 text-right font-normal">Share done</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in workload" :key="row.key" class="border-b border-stock-400">
                <th scope="row" class="max-w-[18rem] truncate py-2 pr-4 text-left text-[13px] font-normal text-stock-950" :title="row.label">
                  {{ row.label }}
                </th>
                <td class="py-2 pr-4 text-right text-[13px] tabular-nums text-stock-950">{{ row.annotating }}</td>
                <td class="py-2 pr-4 text-right text-[13px] tabular-nums text-stock-950">{{ row.completed }}</td>
                <td class="py-2 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <span class="furniture text-stock-600">{{ row.percent }}%</span>
                    <span class="h-1.5 w-24 border border-stock-400 bg-stock-100">
                      <span class="block h-full bg-stock-950" :style="{ width: `${row.percent}%` }"></span>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="unassignedCount > 0" class="text-[13px] text-stock-700">
            {{ unassignedCount }} {{ unassignedCount === 1 ? 'task is' : 'tasks are' }} still in the pool, held by nobody.
            <button type="button" class="underline underline-offset-2 hover:text-stock-950" @click="goToSection('annotate')">
              Hand them out in Annotate
            </button>
          </p>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useProjectRecord, useOrganizationUsers } from '../useProjectRecord'
import type { TaskLike } from '../taskFacts'

interface UserPermissions {
  isOrgAdmin: boolean
  canEditProject: boolean
  canAssignTasks: boolean
  canViewAllTasks: boolean
  canExportDataset: boolean
}

interface TasksResponse {
  data: TaskLike[]
  permissions?: UserPermissions
}

const props = defineProps<{
  projectId: string
}>()

const token = useCookie('auth_token')
const route = useRoute()

const { organizationId, load: loadProject } = useProjectRecord(() => props.projectId)
const { emailFor, load: loadUsers } = useOrganizationUsers(organizationId)

const tasks = ref<TaskLike[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref<string | null>(null)
const canViewAllTasks = ref(false)

const total = computed(() => tasks.value.length)
const completedCount = computed(() => tasks.value.filter(task => task.status === 'completed').length)
const annotatingCount = computed(() => tasks.value.filter(task => task.status === 'annotating').length)
const unassignedCount = computed(() => tasks.value.filter(task => task.status === 'unassigned').length)
const completedPercent = computed(() => (total.value === 0 ? 0 : Math.round((completedCount.value / total.value) * 100)))

const workload = computed(() => {
  const rows = new Map<number, { annotating: number; completed: number }>()
  for (const task of tasks.value) {
    if (!task.assignedTo) continue
    const row = rows.get(task.assignedTo) || { annotating: 0, completed: 0 }
    if (task.status === 'completed') row.completed += 1
    else row.annotating += 1
    rows.set(task.assignedTo, row)
  }

  return [...rows.entries()]
    .map(([userId, counts]) => {
      const held = counts.annotating + counts.completed
      return {
        key: String(userId),
        label: emailFor(userId) || `User ${userId}`,
        annotating: counts.annotating,
        completed: counts.completed,
        percent: held === 0 ? 0 : Math.round((counts.completed / held) * 100)
      }
    })
    .sort((a, b) => b.annotating + b.completed - (a.annotating + a.completed))
})

// The section is a place held in the URL, so move by navigating, not by
// writing shared state the layout would overwrite on the next route change.
const goToSection = (section: string) => {
  navigateTo({ path: route.path, query: { ...route.query, section } })
}

const load = async () => {
  if (!props.projectId || !import.meta.client) return
  try {
    loading.value = true
    error.value = null

    if (!token.value) throw new Error('Your session has expired. Log in again to read this project.')

    await loadProject()
    if (organizationId.value) await loadUsers()

    const params = new URLSearchParams({ projectId: props.projectId })
    if (organizationId.value) params.append('organizationId', String(organizationId.value))

    const response = await $fetch<TasksResponse>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/my-tasks?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )

    tasks.value = Array.isArray(response.data) ? response.data : []
    canViewAllTasks.value = response.permissions?.canViewAllTasks || false
    loaded.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      error.value = 'You do not have permission to read tasks in this project. Ask a project editor to add you.'
    } else if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      error.value = 'Your session has expired. Log in again to read this project.'
    } else {
      error.value = message || 'The task list could not be reached. Check your connection and try again.'
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.projectId, () => {
  loaded.value = false
  tasks.value = []
  load()
}, { immediate: true })
</script>
