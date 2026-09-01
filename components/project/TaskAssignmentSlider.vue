<!--
  Hand work out of the pool. One control, one verb: pick how many sheets and
  pick who gets them, in that order, both visible at once.

  Nobody is pre-selected. The old version quietly put the signed-in user in the
  box and hid the box two steps back, so "Assign 50 Tasks" could pile fifty
  sheets onto yourself without ever naming a person.

  Backend: POST /api/tasks/assign/:taskId with { userId }.
-->
<template>
  <section class="border-t border-stock-400 pt-5" aria-labelledby="hand-out-heading">
    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <h3 id="hand-out-heading" class="furniture text-stock-600">Hand out work</h3>
      <p class="furniture text-stock-600">{{ availableTasks }} in the pool</p>
    </div>

    <div v-if="availableTasks === 0" class="mt-3 text-[13px] leading-snug text-stock-700">
      The pool is empty: every task in this project is already with somebody. Upload more data to
      make new tasks, or take work back from the Completed tab.
    </div>

    <template v-else>
      <div class="mt-4 grid gap-6 lg:grid-cols-2">
        <!-- How many -->
        <div>
          <label for="assign-count" class="furniture block text-stock-600">How many sheets</label>
          <div class="mt-2 flex items-center gap-4">
            <input
              id="assign-count"
              v-model.number="selectedTaskCount"
              type="range"
              :min="minTasks"
              :max="availableTasks"
              step="1"
              class="h-1 flex-1 cursor-pointer rounded-none bg-stock-400"
              :disabled="isAssigning"
            />
            <output for="assign-count" class="w-12 text-right text-lg font-semibold tabular-nums text-stock-950">
              {{ selectedTaskCount }}
            </output>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="furniture text-stock-600">Jump to</span>
            <button
              v-for="preset in quickSelectPresets"
              :key="preset.label"
              type="button"
              class="control border px-2 py-1 transition-colors"
              :class="selectedTaskCount === preset.value
                ? 'border-stock-950 bg-stock-950 text-stock-50'
                : 'border-stock-400 text-stock-700 hover:border-stock-950 hover:text-stock-950'"
              :disabled="isAssigning"
              @click="setTaskCount(preset.value)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Who -->
        <div>
          <label for="assign-user" class="furniture block text-stock-600">Who gets them</label>

          <p v-if="loadingUsers" class="furniture mt-2 text-stock-600">Reading the member list…</p>

          <div v-else-if="usersError" class="mt-2">
            <p class="text-[13px] leading-snug text-correct-500">{{ usersError }}</p>
            <button type="button" class="ink-button ink-button--outline mt-2" @click="loadMembers(true)">
              Try again
            </button>
          </div>

          <p v-else-if="userOptions.length === 0" class="mt-2 text-[13px] leading-snug text-stock-700">
            This organization has no active members to assign to. Invite someone from the
            organization's Users screen first.
          </p>

          <select
            v-else
            id="assign-user"
            v-model="selectedUserId"
            class="mt-2 w-full appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%23141414%22 stroke-width=%221.5%22><path d=%22M1 2l5 5 5-5%22/></svg>')] bg-[length:9px_6px] bg-[position:right_0.6rem_center] bg-no-repeat rounded-none border border-stock-400 bg-stock-50 py-2 pl-3 pr-8 text-[13px] text-stock-950"
            :disabled="isAssigning"
          >
            <option :value="undefined">Choose a member…</option>
            <option v-for="option in userOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- What is about to happen, in one sentence, before it happens. -->
      <div class="mt-5 flex flex-wrap items-center justify-between gap-4">
        <dl class="furniture flex flex-wrap gap-x-6 gap-y-1 text-stock-600">
          <div class="docket-field"><dt>Sheets</dt><dd>{{ selectedTaskCount }}</dd></div>
          <div class="docket-field">
            <dt>To</dt>
            <dd class="max-w-[16rem] truncate normal-case tracking-normal">{{ selectedUser?.email || 'nobody yet' }}</dd>
          </div>
          <div class="docket-field"><dt>Left in pool</dt><dd>{{ Math.max(0, availableTasks - selectedTaskCount) }}</dd></div>
          <div v-if="firstSheetName" class="docket-field hidden xl:flex">
            <dt>From</dt>
            <dd class="max-w-[16rem] truncate normal-case tracking-normal">{{ firstSheetName }}</dd>
          </div>
        </dl>

        <div class="flex items-center gap-3">
          <button
            v-if="selectedTaskCount !== defaultCount"
            type="button"
            class="control text-stock-600 underline underline-offset-2 hover:text-stock-950"
            :disabled="isAssigning"
            @click="resetToDefault"
          >
            Reset count
          </button>

          <button
            type="button"
            class="ink-button"
            :disabled="isAssigning || !selectedUserId || selectedTaskCount === 0"
            @click="handleAssignTasks"
          >
            <UIcon :name="isAssigning ? 'i-lucide-loader-circle' : 'i-lucide-user-plus'" class="size-3.5" :class="isAssigning ? 'animate-spin' : ''" />
            {{ isAssigning
              ? 'Assigning…'
              : `Assign ${selectedTaskCount} to ${selectedUser?.email || '…'}` }}
          </button>
        </div>
      </div>

      <p v-if="!selectedUserId && userOptions.length > 0" class="furniture mt-2 text-stock-600">
        Choose a member before assigning
      </p>

      <!-- One channel for the result of this control, said where it happened. -->
      <p
        v-if="statusMessage"
        class="mt-3 text-[13px] leading-snug"
        :class="statusFailed ? 'text-correct-500' : 'text-stock-700'"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useProjectRecord, useOrganizationUsers } from './useProjectRecord'
import { taskName, type TaskLike } from './taskFacts'

const props = defineProps<{
  availableTasks: number
  unassignedTasks: TaskLike[]
  projectId: string
}>()

const emit = defineEmits<{
  tasksAssigned: [taskIds: number[]]
  assignmentError: [error: string]
}>()

const token = useCookie('auth_token')

const { organizationId, load: loadProject } = useProjectRecord(() => props.projectId)
const { activeUsers, loadError: usersError, load: loadOrganizationUsers } = useOrganizationUsers(organizationId)

const selectedTaskCount = ref(1)
const selectedUserId = ref<number | undefined>(undefined)
const isAssigning = ref(false)
const loadingUsers = ref(false)
const statusMessage = ref('')
const statusFailed = ref(false)

const minTasks = computed(() => Math.min(1, props.availableTasks))
const defaultCount = computed(() => Math.max(minTasks.value, Math.min(5, props.availableTasks)))

const quickSelectPresets = computed(() => {
  const available = props.availableTasks
  const presets: { label: string; value: number }[] = []
  for (const step of [1, 5, 10, 25, 50]) {
    if (available >= step) presets.push({ label: String(step), value: step })
  }
  if (available > 50) presets.push({ label: 'All', value: available })
  return presets
})

const userOptions = computed(() =>
  activeUsers.value.map(user => ({
    label: `${user.email} · ${user.role}`,
    value: user.id
  }))
)

const selectedUser = computed(() => activeUsers.value.find(user => user.id === selectedUserId.value))

const tasksToAssign = computed(() =>
  props.unassignedTasks.slice(0, selectedTaskCount.value).map(task => task.id)
)

const firstSheetName = computed(() => {
  const first = props.unassignedTasks[0]
  return first ? taskName(first) : ''
})

const setTaskCount = (count: number) => {
  selectedTaskCount.value = Math.max(minTasks.value, Math.min(count, props.availableTasks))
}

const resetToDefault = () => {
  selectedTaskCount.value = defaultCount.value
}

const loadMembers = async (force = false) => {
  try {
    loadingUsers.value = true
    await loadProject(force)
    if (organizationId.value) await loadOrganizationUsers(force)
  } finally {
    loadingUsers.value = false
  }
}

const handleAssignTasks = async () => {
  if (!selectedUserId.value || !token.value) {
    statusFailed.value = true
    statusMessage.value = !token.value
      ? 'Your session has expired. Log in again to assign work.'
      : 'Choose the member who should get these sheets.'
    return
  }

  const taskIds = tasksToAssign.value
  if (taskIds.length === 0) {
    statusFailed.value = true
    statusMessage.value = 'There is nothing left in the pool to assign.'
    return
  }

  const recipient = selectedUser.value?.email || `user ${selectedUserId.value}`

  try {
    isAssigning.value = true
    statusMessage.value = ''
    statusFailed.value = false

    const results = await Promise.allSettled(
      taskIds.map(taskId =>
        $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/assign/${taskId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
            'Content-Type': 'application/json'
          },
          body: { userId: selectedUserId.value }
        })
      )
    )

    const assigned = taskIds.filter((_, index) => results[index]?.status === 'fulfilled')
    const failed = taskIds.length - assigned.length

    if (assigned.length > 0) emit('tasksAssigned', assigned)

    if (failed === taskIds.length) {
      throw new Error('The server refused every assignment. Your permissions may have changed — reload the page and try again.')
    }

    statusFailed.value = failed > 0
    statusMessage.value = failed > 0
      ? `${assigned.length} of ${taskIds.length} sheets went to ${recipient}; ${failed} were refused and are still in the pool. Try the rest again.`
      : `${assigned.length} ${assigned.length === 1 ? 'sheet' : 'sheets'} assigned to ${recipient}. They are now in that member's task list.`

    // The pool shrinks under us; clamp to what is actually left.
    selectedTaskCount.value = Math.max(
      minTasks.value,
      Math.min(defaultCount.value, Math.max(0, props.availableTasks - assigned.length))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The assignment could not be completed.'
    statusFailed.value = true
    statusMessage.value = message
    emit('assignmentError', message)
  } finally {
    isAssigning.value = false
  }
}

watch(() => props.availableTasks, newCount => {
  if (selectedTaskCount.value > newCount) {
    selectedTaskCount.value = Math.max(minTasks.value, newCount)
  }
  if (selectedTaskCount.value < minTasks.value) {
    selectedTaskCount.value = minTasks.value
  }
}, { immediate: true })

onMounted(async () => {
  selectedTaskCount.value = defaultCount.value
  if (props.projectId) await loadMembers()
})
</script>
