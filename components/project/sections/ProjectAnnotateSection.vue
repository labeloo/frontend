<!--
  The task pool.

  This screen used to do three jobs at once - a display of your own permission
  badges, bulk assignment, and a dataset export form - with the annotator's own
  work at the bottom of the pile, behind a tab that never opened by default.
  It now does one: it shows the sheets, says who holds them, and gets you into
  the next one. Export moved into a panel of its own, opened on request.
-->
<template>
  <section class="space-y-8">
    <!-- Header -->
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-[-0.02em] text-stock-950">Annotate</h2>
        <dl class="furniture mt-2 flex flex-wrap gap-x-6 gap-y-1 text-stock-600">
          <div class="docket-field"><dt>Role</dt><dd>{{ roleLabel }}</dd></div>
          <div class="docket-field"><dt>Sheets</dt><dd>{{ totalCount }}</dd></div>
          <div class="docket-field"><dt>Done</dt><dd>{{ completedCount }} · {{ completedPercent }}%</dd></div>
          <div v-if="canViewAllTasks" class="docket-field"><dt>In pool</dt><dd>{{ unassignedCount }}</dd></div>
        </dl>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink v-if="nextSheetId" :to="`/annotate/${nextSheetId}`" class="ink-button">
          <UIcon name="i-lucide-play" class="size-3.5" />
          Continue sheet {{ nextSheetId }}
        </NuxtLink>

        <button v-if="canExportDataset" type="button" class="ink-button ink-button--outline" @click="exportOpen = true">
          <UIcon name="i-lucide-download" class="size-3.5" />
          Export…
        </button>

        <button type="button" class="ink-button ink-button--outline" :disabled="refreshing" @click="fetchTasks()">
          <UIcon :name="refreshing ? 'i-lucide-loader-circle' : 'i-lucide-rotate-cw'" class="size-3.5" :class="refreshing ? 'animate-spin' : ''" />
          Refresh
        </button>
      </div>
    </header>

    <!-- One channel for what just happened to the work, success or failure,
         held on screen rather than thrown into a toast that slides away. -->
    <p
      v-if="actionMessage"
      class="border-l-2 py-1 pl-3 text-[13px] leading-snug"
      :class="actionFailed ? 'border-correct-500 text-correct-500' : 'border-stock-950 text-stock-800'"
      role="status"
      aria-live="polite"
    >
      {{ actionMessage }}
    </p>

    <!-- Failure: what happened, and the way out. -->
    <div v-if="error" class="border border-correct-500 bg-stock-100 p-5">
      <p class="furniture text-correct-500">Tasks could not be read</p>
      <p class="mt-2 max-w-xl text-[13px] leading-snug text-stock-700">{{ error }}</p>
      <button type="button" class="ink-button mt-4" @click="fetchTasks()">Try again</button>
    </div>

    <p v-if="!loaded && !error" class="furniture text-stock-600">Reading tasks…</p>

    <!-- A failed refresh keeps the pool on screen: the sheets below are the
         last good read, not a blank page. -->
    <template v-if="loaded">
      <!-- Handing work out is one control, and only for those who may do it. -->
      <TaskAssignmentSlider
        v-if="canAssignTasks"
        :available-tasks="unassignedCount"
        :unassigned-tasks="tasks.unassigned"
        :project-id="projectId"
        @tasks-assigned="handleTasksAssigned"
        @assignment-error="handleAssignmentError"
      />

      <!-- Tabs -->
      <div>
        <div
          ref="tablist"
          role="tablist"
          aria-label="Task pool"
          class="flex gap-6 border-b border-stock-400"
          @keydown="onTablistKeydown"
        >
          <button
            v-for="(tab, index) in visibleTabs"
            :id="`pool-tab-${tab.key}`"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            :aria-controls="`pool-panel-${tab.key}`"
            :tabindex="activeTab === tab.key ? 0 : -1"
            class="-mb-px flex items-center gap-2 border-b-2 py-2 transition-colors"
            :class="activeTab === tab.key
              ? 'border-stock-950 text-stock-950'
              : 'border-transparent text-stock-600 hover:text-stock-950'"
            @click="selectTab(tab.key)"
          >
            <!-- The label is a control; the count beside it is a figure, so it keeps
                 the mono tabular voice. A tab that reads as a caption is a tab
                 nobody notices they can press. -->
            <span class="control">{{ tab.label }}</span>
            <span class="furniture tabular-nums text-stock-600">{{ countFor(tab.key) }}</span>
            <kbd class="furniture flex size-4 items-center justify-center border border-stock-400 text-stock-600">{{ index + 1 }}</kbd>
          </button>
        </div>

        <div
          :id="`pool-panel-${activeTab}`"
          role="tabpanel"
          :aria-labelledby="`pool-tab-${activeTab}`"
          tabindex="0"
          class="pt-6 transition-opacity"
          :class="refreshing ? 'opacity-60' : ''"
          :aria-busy="refreshing"
        >
          <!-- Empty states say what happened, why, and what to do next. -->
          <div v-if="activeTasks.length === 0" class="max-w-xl border border-stock-400 bg-stock-100 p-6">
            <p class="furniture text-stock-600">{{ emptyState.title }}</p>
            <p class="mt-2 text-[13px] leading-snug text-stock-700">{{ emptyState.body }}</p>
          </div>

          <div v-else class="space-y-8">
            <div v-for="group in activeGroups" :key="group.key" class="space-y-3">
              <!-- Frames from one clip read as one run, in frame order. -->
              <div v-if="group.clip" class="flex items-baseline justify-between gap-4 border-b border-stock-400 pb-1">
                <p class="truncate text-[13px] font-medium text-stock-950" :title="group.clip">{{ group.clip }}</p>
                <p class="furniture flex-none text-stock-600">{{ group.tasks.length }} frames</p>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ProjectTaskCard
                  v-for="task in group.tasks"
                  :key="task.id"
                  :task="task"
                  :selectable="canSelectInActiveTab"
                  :selected="selectedIds.includes(task.id)"
                  :assignee="emailFor(task.assignedTo)"
                  @toggle="toggleSelection"
                >
                  <template v-if="activeTab !== 'unassigned'" #action>
                    <NuxtLink :to="`/annotate/${task.id}`" class="ink-button ink-button--outline w-full justify-center">
                      <UIcon name="i-lucide-square-pen" class="size-3.5" />
                      {{ activeTab === 'completed' ? 'Open to review' : 'Open sheet' }}
                    </NuxtLink>
                  </template>
                </ProjectTaskCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- The action strip follows the selection instead of hiding in the header. -->
      <div v-if="selectedIds.length > 0" class="sticky bottom-0 z-20 border-t border-stock-400 bg-stock-100 px-4 py-3">
        <div v-if="pendingAction" class="flex flex-wrap items-center justify-between gap-4">
          <p class="max-w-2xl text-[13px] leading-snug text-stock-800">{{ pendingAction.question }}</p>
          <div class="flex items-center gap-3">
            <button type="button" class="control text-stock-600 underline underline-offset-2 hover:text-stock-950" @click="pendingAction = null">
              Cancel
            </button>
            <button type="button" class="ink-button" :disabled="working" @click="runPendingAction">
              <UIcon v-if="working" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
              {{ pendingAction.confirmLabel }}
            </button>
          </div>
        </div>

        <div v-else class="flex flex-wrap items-center justify-between gap-4">
          <p class="furniture text-stock-600">
            {{ selectedIds.length }} selected on {{ activeTabLabel }}
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="control text-stock-600 underline underline-offset-2 hover:text-stock-950" @click="clearSelection">
              Clear
            </button>

            <template v-if="activeTab === 'unassigned'">
              <span v-if="activeUsers.length === 0" class="furniture text-correct-500">
                No members to assign to — invite one from the organization first
              </span>
              <label v-else for="bar-assign-user" class="furniture text-stock-600">Assign to</label>
              <select
                v-if="activeUsers.length > 0"
                id="bar-assign-user"
                v-model="barUserId"
                class="appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%23141414%22 stroke-width=%221.5%22><path d=%22M1 2l5 5 5-5%22/></svg>')] bg-[length:9px_6px] bg-[position:right_0.6rem_center] bg-no-repeat rounded-none border border-stock-400 bg-stock-50 py-1.5 pl-2 pr-7 text-[13px] text-stock-950"
              >
                <option :value="undefined">Choose a member…</option>
                <option v-for="user in activeUsers" :key="user.id" :value="user.id">{{ user.email }}</option>
              </select>
              <button type="button" class="ink-button" :disabled="working || !barUserId" @click="assignSelectedTasks">
                <UIcon v-if="working" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
                Assign {{ selectedIds.length }}
              </button>
            </template>

            <button
              v-else-if="activeTab === 'annotating'"
              type="button"
              class="ink-button"
              @click="askComplete"
            >
              <UIcon name="i-lucide-check" class="size-3.5" />
              Mark {{ selectedIds.length }} complete
            </button>

            <button
              v-else-if="activeTab === 'completed' && canAssignTasks"
              type="button"
              class="ink-button"
              @click="askSendBack"
            >
              <UIcon name="i-lucide-undo-2" class="size-3.5" />
              Send {{ selectedIds.length }} back
            </button>
          </div>
        </div>

      </div>
    </template>

    <UModal
      v-if="canExportDataset"
      :open="exportOpen"
      title="Export dataset"
      :ui="{ content: 'max-w-2xl' }"
      @update:open="exportOpen = $event"
    >
      <template #body>
        <ProjectSectionsProjectExportPanel :project-id="projectId" :completed-count="completedCount" />
      </template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
import TaskAssignmentSlider from '~/components/project/TaskAssignmentSlider.vue'
import { useProjectRecord, useOrganizationUsers } from '~/components/project/useProjectRecord'
import { groupTasksByClip, sortTasksForPool, type TaskLike } from '~/components/project/taskFacts'

type TabKey = 'unassigned' | 'annotating' | 'completed'

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

const { organizationId, load: loadProject } = useProjectRecord(() => props.projectId)
const { activeUsers, emailFor, load: loadOrganizationUsers } = useOrganizationUsers(organizationId)

// ── State ───────────────────────────────────────────────────────────────────
const tasks = ref<{ unassigned: TaskLike[]; annotating: TaskLike[]; completed: TaskLike[] }>({
  unassigned: [],
  annotating: [],
  completed: []
})
const loaded = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)
const working = ref(false)
const actionMessage = ref('')
const actionFailed = ref(false)
const exportOpen = ref(false)
const barUserId = ref<number | undefined>(undefined)
const tablist = ref<HTMLElement | null>(null)

const userPermissions = ref<UserPermissions>({
  isOrgAdmin: false,
  canEditProject: false,
  canAssignTasks: false,
  canViewAllTasks: false,
  canExportDataset: false
})

const canAssignTasks = computed(() => userPermissions.value.canAssignTasks)
const canExportDataset = computed(() => userPermissions.value.canExportDataset)
const canViewAllTasks = computed(() => userPermissions.value.canViewAllTasks)

const roleLabel = computed(() => {
  if (userPermissions.value.isOrgAdmin) return 'Organization admin'
  if (userPermissions.value.canEditProject) return 'Project editor'
  return 'Team member'
})

// ── Counts ──────────────────────────────────────────────────────────────────
const unassignedCount = computed(() => tasks.value.unassigned.length)
const annotatingCount = computed(() => tasks.value.annotating.length)
const completedCount = computed(() => tasks.value.completed.length)
const totalCount = computed(() => unassignedCount.value + annotatingCount.value + completedCount.value)
const completedPercent = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100)
)

/** The sheet the Continue button opens: the first one still in hand. */
const nextSheetId = computed(() => sortTasksForPool(tasks.value.annotating)[0]?.id ?? null)

// ── Tabs ────────────────────────────────────────────────────────────────────
// A team member cannot assign, and the backend refuses a self-claim, so the
// pool tab would be a wall of work they are not allowed to touch. It is not
// shown to them, and their own tasks open first.
const visibleTabs = computed(() => {
  const list: { key: TabKey; label: string }[] = []
  if (canAssignTasks.value) list.push({ key: 'unassigned', label: 'Pool' })
  list.push({ key: 'annotating', label: canViewAllTasks.value ? 'In progress' : 'My tasks' })
  list.push({ key: 'completed', label: canViewAllTasks.value ? 'Completed' : 'My completed' })
  return list
})

const activeTab = ref<TabKey>('annotating')
const activeTabLabel = computed(() => visibleTabs.value.find(tab => tab.key === activeTab.value)?.label || '')

const countFor = (key: TabKey) => tasks.value[key].length

const activeTasks = computed(() => tasks.value[activeTab.value])
const activeGroups = computed(() => groupTasksByClip(activeTasks.value))

const canSelectInActiveTab = computed(() => {
  if (activeTab.value === 'unassigned') return canAssignTasks.value
  if (activeTab.value === 'completed') return canAssignTasks.value
  return true
})

const emptyState = computed(() => {
  if (activeTab.value === 'unassigned') {
    return {
      title: 'The pool is empty',
      body: 'Every task in this project is already with somebody. Upload more images or video to make new tasks.'
    }
  }
  if (activeTab.value === 'annotating') {
    return canViewAllTasks.value
      ? {
          title: 'Nothing in hand',
          body: 'No task in this project is being worked on. Hand sheets out from the pool above and they will appear here.'
        }
      : {
          title: 'Nothing assigned to you',
          body: 'You have no sheets to mark yet. A project editor hands work out from the pool; ask for a batch and it will land here.'
        }
  }
  return canViewAllTasks.value
    ? {
        title: 'Nothing completed yet',
        body: 'Sheets appear here once their annotator marks them complete. Open one from here to review the marks.'
      }
    : {
        title: 'You have not finished a sheet yet',
        body: 'Mark a sheet complete from “My tasks” and it will move here, where you can reopen it.'
      }
})

// ── Selection ───────────────────────────────────────────────────────────────
// One set, derived by tab: selections can no longer survive a tab switch and
// act on sheets that are off screen.
const selectedIds = ref<number[]>([])
const pendingAction = ref<{ question: string; confirmLabel: string; run: () => Promise<void> } | null>(null)

const clearSelection = () => {
  selectedIds.value = []
  pendingAction.value = null
  actionMessage.value = ''
}

const toggleSelection = (taskId: number) => {
  const index = selectedIds.value.indexOf(taskId)
  if (index > -1) selectedIds.value.splice(index, 1)
  else selectedIds.value.push(taskId)
  pendingAction.value = null
}

const selectTab = (key: TabKey) => {
  if (activeTab.value === key) return
  activeTab.value = key
  clearSelection()
}

const onTablistKeydown = (event: KeyboardEvent) => {
  const keys = visibleTabs.value.map(tab => tab.key)
  const current = keys.indexOf(activeTab.value)
  let next = -1

  if (event.key === 'ArrowRight') next = (current + 1) % keys.length
  else if (event.key === 'ArrowLeft') next = (current - 1 + keys.length) % keys.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = keys.length - 1
  else return

  event.preventDefault()
  const key = keys[next]
  if (!key) return
  selectTab(key)
  nextTick(() => {
    tablist.value?.querySelector<HTMLElement>(`#pool-tab-${key}`)?.focus()
  })
}

// The tool is keyboard-first; 1/2/3 reach the tabs from anywhere on the page.
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))) return

  const index = Number(event.key) - 1
  const tab = visibleTabs.value[index]
  if (!Number.isInteger(index) || index < 0 || !tab) return

  event.preventDefault()
  selectTab(tab.key)
}

// ── Fetching ────────────────────────────────────────────────────────────────
const describeError = (err: unknown, fallback: string) => {
  const message = err instanceof Error ? err.message : ''
  if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
    return 'The server refused this: it needs project editor or organization administrator permission. Ask your project administrator, then reload.'
  }
  if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
    return 'Your session has expired. Log in again to carry on.'
  }
  if (message.includes('404') || message.toLowerCase().includes('not found')) {
    return 'That task or project no longer exists. Refresh to see the current pool.'
  }
  return message || fallback
}

const fetchTasks = async () => {
  if (!props.projectId || !import.meta.client) return
  try {
    refreshing.value = true
    error.value = null

    if (!token.value) throw new Error('Your session has expired. Log in again to read this project.')

    await loadProject()
    if (organizationId.value) await loadOrganizationUsers()

    const params = new URLSearchParams({ projectId: props.projectId })
    if (organizationId.value) params.append('organizationId', String(organizationId.value))

    const response = await $fetch<TasksResponse>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/my-tasks?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )

    const list = Array.isArray(response.data) ? response.data : []
    tasks.value = {
      unassigned: sortTasksForPool(list.filter(task => task.status === 'unassigned')),
      annotating: sortTasksForPool(list.filter(task => task.status === 'annotating')),
      completed: sortTasksForPool(list.filter(task => task.status === 'completed'))
    }

    userPermissions.value = {
      isOrgAdmin: response.permissions?.isOrgAdmin || false,
      canEditProject: response.permissions?.canEditProject || false,
      canAssignTasks: response.permissions?.canAssignTasks || false,
      canViewAllTasks: response.permissions?.canViewAllTasks || false,
      canExportDataset: response.permissions?.canExportDataset || false
    }

    // Drop anything selected that is no longer in the tab we are looking at.
    const visibleIds = new Set(tasks.value[activeTab.value].map(task => task.id))
    selectedIds.value = selectedIds.value.filter(id => visibleIds.has(id))

    if (!visibleTabs.value.some(tab => tab.key === activeTab.value)) {
      activeTab.value = 'annotating'
    }

    loaded.value = true
  } catch (err) {
    error.value = describeError(err, 'The task list could not be reached. Check your connection and try again.')
  } finally {
    refreshing.value = false
  }
}

// ── Bulk actions ────────────────────────────────────────────────────────────
const updateStatus = async (taskIds: number[], status: 'annotating' | 'completed') => {
  await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/tasks/update', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.value}`,
      'Content-Type': 'application/json'
    },
    body: { taskId: taskIds, status }
  })
}

/**
 * Assignment always names a person and always goes through the assign
 * endpoint. The old header button flipped status only, leaving sheets in
 * "annotating" with no owner and out of everybody's list.
 */
const assignSelectedTasks = async () => {
  const userId = barUserId.value
  const ids = [...selectedIds.value]
  if (!userId || ids.length === 0) return

  const recipient = activeUsers.value.find(user => user.id === userId)?.email || `user ${userId}`

  try {
    working.value = true
    actionFailed.value = false
    actionMessage.value = ''

    const results = await Promise.allSettled(
      ids.map(taskId =>
        $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/assign/${taskId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
            'Content-Type': 'application/json'
          },
          body: { userId }
        })
      )
    )

    const failed = results.filter(result => result.status === 'rejected').length
    const done = ids.length - failed

    if (done === 0) throw new Error('The server refused every assignment.')

    actionFailed.value = failed > 0
    actionMessage.value = failed > 0
      ? `${done} of ${ids.length} sheets went to ${recipient}; ${failed} were refused and stayed in the pool.`
      : `${done} ${done === 1 ? 'sheet' : 'sheets'} assigned to ${recipient}.`

    selectedIds.value = []
    await fetchTasks()
  } catch (err) {
    actionFailed.value = true
    actionMessage.value = describeError(err, 'The sheets could not be assigned. Try again.')
  } finally {
    working.value = false
  }
}

// Completing is one-way for anyone who cannot edit the project, so it is named
// and confirmed rather than fired from a button that appears mid-header.
const askComplete = () => {
  const count = selectedIds.value.length
  pendingAction.value = {
    question: `Mark ${count} ${count === 1 ? 'sheet' : 'sheets'} complete? They leave your list and move to Completed. Only a project editor can send them back.`,
    confirmLabel: `Mark ${count} complete`,
    run: async () => {
      const ids = [...selectedIds.value]
      await updateStatus(ids, 'completed')
      actionFailed.value = false
      actionMessage.value = `${ids.length} ${ids.length === 1 ? 'sheet' : 'sheets'} marked complete.`
    }
  }
}

const askSendBack = () => {
  const count = selectedIds.value.length
  pendingAction.value = {
    question: `Send ${count} ${count === 1 ? 'sheet' : 'sheets'} back to annotation? They leave Completed and return to the annotator who holds them, with their marks intact.`,
    confirmLabel: `Send ${count} back`,
    run: async () => {
      const ids = [...selectedIds.value]
      await updateStatus(ids, 'annotating')
      actionFailed.value = false
      actionMessage.value = `${ids.length} ${ids.length === 1 ? 'sheet' : 'sheets'} sent back to annotation.`
    }
  }
}

const runPendingAction = async () => {
  const action = pendingAction.value
  if (!action) return
  try {
    working.value = true
    await action.run()
    selectedIds.value = []
    pendingAction.value = null
    await fetchTasks()
  } catch (err) {
    actionFailed.value = true
    actionMessage.value = describeError(err, 'That change could not be saved. Nothing moved; try again.')
    pendingAction.value = null
  } finally {
    working.value = false
  }
}

// ── Slider handlers ─────────────────────────────────────────────────────────
// The slider says what happened, where it happened; the section only reloads.
const handleTasksAssigned = async () => {
  await fetchTasks()
}

const handleAssignmentError = (message: string) => {
  actionFailed.value = true
  actionMessage.value = message
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
let defaultTabChosen = false

// The first tab an annotator meets should be their own work, not a pool they
// may not touch. Chosen once, from the permissions the first read returns.
watch([loaded, canViewAllTasks, canAssignTasks], () => {
  if (!loaded.value || defaultTabChosen) return
  defaultTabChosen = true
  activeTab.value = canAssignTasks.value && unassignedCount.value > 0 && annotatingCount.value === 0
    ? 'unassigned'
    : 'annotating'
})

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})

watch(() => props.projectId, () => {
  loaded.value = false
  defaultTabChosen = false
  tasks.value = { unassigned: [], annotating: [], completed: [] }
  clearSelection()
  barUserId.value = undefined
  fetchTasks()
}, { immediate: true })
</script>
