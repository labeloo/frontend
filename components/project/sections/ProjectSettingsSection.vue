<template>
  <div>
    <div v-if="loading" class="py-16 text-center">
      <p class="furniture text-stock-600">Loading project…</p>
    </div>

    <section v-else-if="error" class="max-w-xl border border-correct-500 bg-stock-50 p-6">
      <p class="furniture text-correct-500">Settings not loaded</p>
      <p class="mt-2 text-[15px] leading-snug text-stock-950">{{ error }}</p>
      <p class="mt-2 text-[13px] leading-relaxed text-stock-600">
        Nothing has been changed. These fields edit the project record, so they stay closed until
        that record is read.
      </p>
      <button type="button" class="ink-button mt-5" @click="fetchProjectData">
        <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
        Try again
      </button>
    </section>

    <div v-else>
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-3">
        <div>
          <h2 class="text-[22px] font-semibold tracking-tight text-stock-950">Project settings</h2>
          <p class="mt-1 text-[13px] leading-relaxed text-stock-600">
            The name and work type carried by every task in this project.
          </p>
        </div>
        <p v-if="hasUnsavedChanges" class="furniture text-correct-500">Not saved yet</p>
      </div>

      <dl v-if="projectData" class="docket mt-4 flex-wrap gap-x-8 gap-y-2 border border-stock-400 px-4 py-3 furniture text-stock-600">
        <div class="docket-field"><dt>Project</dt><dd>#{{ projectData.id }}</dd></div>
        <div class="docket-field"><dt>Type</dt><dd>{{ projectTypeName(projectData.projectType) }}</dd></div>
        <div class="docket-field"><dt>Classes</dt><dd>{{ projectData.labelConfig?.classes?.length ?? 0 }}</dd></div>
        <div class="docket-field"><dt>Created</dt><dd>{{ formatDate(projectData.createdAt) }}</dd></div>
      </dl>

      <p
        v-if="notice"
        class="mt-4 border px-4 py-2.5 text-[13px] leading-relaxed text-stock-800"
        :class="notice.kind === 'error' ? 'border-correct-500' : 'border-stock-950'"
        role="status"
        aria-live="polite"
      >
        {{ notice.text }}
      </p>

      <form class="mt-8 max-w-2xl" novalidate @submit.prevent="saveGeneralSettings">
        <div class="space-y-6">
          <UFormField
            label="Project name"
            name="name"
            required
            :error="nameError || undefined"
            :help="nameError ? undefined : 'Shown on every task and in the project list.'"
          >
            <UInput v-model="formData.name" placeholder="Street scenes, batch 3" size="lg" class="w-full" :disabled="saving" />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
            help="Optional. What counts as a correct label in this project."
          >
            <UTextarea
              v-model="formData.description"
              placeholder="Label every vehicle that is fully inside the frame."
              :rows="4"
              size="lg"
              class="w-full"
              :disabled="saving"
            />
          </UFormField>

          <UFormField
            label="Work type"
            name="projectType"
            help="Decides which annotation tools a task opens with."
          >
            <USelect
              v-model="formData.type"
              :items="typeItems"
              value-key="value"
              label-key="label"
              placeholder="Select a work type"
              size="lg"
              class="w-full"
              :disabled="saving"
            />
          </UFormField>
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-stock-400 pt-6">
          <button type="submit" class="ink-button" :disabled="!canSave">
            <UIcon name="i-lucide-check" class="size-3.5" />
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          <button
            type="button"
            class="ink-button ink-button--outline"
            :disabled="!hasUnsavedChanges || saving"
            @click="resetForm"
          >
            Undo changes
          </button>
          <p v-if="!canSave && !saving" class="furniture text-stock-600">{{ saveBlockedReason }}</p>
        </div>
      </form>

      <!-- Deleting is the only destructive act this screen can actually perform,
           so it is the only one printed here. -->
      <section class="mt-12 border-t border-stock-400 pt-6">
        <h3 class="text-[15px] font-semibold tracking-tight text-correct-500">Delete this project</h3>
        <p class="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-stock-600">
          Deleting removes the project, its tasks, its annotations and everything uploaded to it.
          There is no undo and no archive: once it is gone, the labelling done in it is gone with it.
        </p>

        <button
          v-if="!deleteOpen"
          type="button"
          class="ink-button ink-button--outline mt-4 text-correct-500"
          @click="deleteOpen = true"
        >
          <UIcon name="i-lucide-trash-2" class="size-3.5" />
          Delete project
        </button>

        <div v-else class="mt-4 max-w-xl border border-correct-500 bg-stock-50 p-4">
          <p class="furniture text-correct-500">Delete “{{ projectData?.name }}”?</p>
          <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">
            This deletes the project and every task and annotation in it. Type the project name to
            confirm you mean this one.
          </p>
          <UInput
            v-model="deleteConfirmation"
            :placeholder="projectData?.name"
            size="lg"
            class="mt-3 w-full"
            :disabled="deleting"
            aria-label="Type the project name to confirm deletion"
          />
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="ink-button"
              :disabled="deleteConfirmation.trim() !== projectData?.name || deleting"
              @click="deleteProject"
            >
              {{ deleting ? 'Deleting…' : 'Delete it' }}
            </button>
            <button type="button" class="ink-button ink-button--outline" :disabled="deleting" @click="cancelDelete">
              Keep the project
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_TYPES, SELECTABLE_PROJECT_TYPES, projectTypeName } from '~/components/project/sections/projectTypes'

interface ProjectData {
  id: number
  name: string
  description?: string
  projectType: number
  labelConfig?: {
    classes: string[]
  }
  organizationId: number
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectData
    project_relations: any
  }
}

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const token = useCookie('auth_token')

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)
const notice = ref<{ kind: 'done' | 'error', text: string } | null>(null)
const projectData = ref<ProjectData | null>(null)
const deleteOpen = ref(false)
const deleteConfirmation = ref('')

const formData = ref({
  name: '',
  description: '',
  type: 1
})

const originalData = ref({
  name: '',
  description: '',
  type: 1
})

/** Only the seeded types may be chosen; a project already on a withdrawn type
 *  keeps it in the list so saving the name cannot silently change its type. */
const typeItems = computed(() => {
  const current = PROJECT_TYPES.find(type => type.value === formData.value.type)
  if (current && !current.selectable) return [...SELECTABLE_PROJECT_TYPES, current]
  return SELECTABLE_PROJECT_TYPES
})

const nameError = computed(() => {
  const name = formData.value.name.trim()
  if (!name) return 'A project name is required.'
  if (name.length > 100) return `${name.length} characters. The limit is 100.`
  return null
})

const hasUnsavedChanges = computed(() =>
  formData.value.name !== originalData.value.name ||
  formData.value.description !== originalData.value.description ||
  formData.value.type !== originalData.value.type
)

const canSave = computed(() => !saving.value && !nameError.value && hasUnsavedChanges.value)

const saveBlockedReason = computed(() => {
  if (nameError.value) return 'A name is needed'
  if (!hasUnsavedChanges.value) return 'Nothing changed'
  return ''
})

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

const fetchProjectData = async () => {
  try {
    loading.value = true
    error.value = null

    if (!token.value) {
      throw new Error('You are signed out, so the project could not be read.')
    }

    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.data?.projects) {
      throw new Error(`No project ${props.projectId} is open to you.`)
    }

    projectData.value = response.data.projects

    const loaded = {
      name: response.data.projects.name || '',
      description: response.data.projects.description || '',
      type: response.data.projects.projectType || 1
    }

    formData.value = { ...loaded }
    originalData.value = { ...loaded }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The project could not be loaded.'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formData.value = { ...originalData.value }
  notice.value = null
}

const changedFieldNames = () => {
  const changed: string[] = []
  if (formData.value.name !== originalData.value.name) changed.push('name')
  if (formData.value.description !== originalData.value.description) changed.push('description')
  if (formData.value.type !== originalData.value.type) changed.push('work type')
  return changed
}

const saveGeneralSettings = async () => {
  if (!canSave.value) return

  const changed = changedFieldNames()
  saving.value = true
  notice.value = null

  try {
    const project = projectData.value
    if (!project?.id) {
      throw new Error('The project is not loaded, so nothing could be saved.')
    }

    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${project.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: {
        name: formData.value.name.trim(),
        description: formData.value.description.trim(),
        projectType: formData.value.type
      }
    })

    formData.value.name = formData.value.name.trim()
    formData.value.description = formData.value.description.trim()
    originalData.value = { ...formData.value }

    project.name = formData.value.name
    project.description = formData.value.description
    project.projectType = formData.value.type

    // The confirmation names what actually moved, so it cannot claim more than it did.
    notice.value = { kind: 'done', text: `Saved: ${changed.join(', ')}.` }
  } catch (err: any) {
    notice.value = {
      kind: 'error',
      text: `${err?.data?.details || err?.message || 'The settings could not be saved.'} Your edits are still on screen — press Save changes to try again.`
    }
  } finally {
    saving.value = false
  }
}

const cancelDelete = () => {
  deleteOpen.value = false
  deleteConfirmation.value = ''
}

const deleteProject = async () => {
  if (!projectData.value || deleteConfirmation.value.trim() !== projectData.value.name) return

  deleting.value = true
  notice.value = null

  const organizationId = projectData.value.organizationId

  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${projectData.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    await navigateTo(`/organizations/${organizationId}?section=projects`)
  } catch (err: any) {
    deleting.value = false
    notice.value = {
      kind: 'error',
      text: `${err?.data?.details || err?.message || 'The project could not be deleted.'} It is still here and nothing was removed.`
    }
  }
}

onMounted(() => {
  fetchProjectData()
})

onMounted(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})
</script>
