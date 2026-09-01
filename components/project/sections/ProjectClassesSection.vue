<template>
  <div>
    <div v-if="loading" class="py-16 text-center">
      <p class="furniture text-stock-600">Loading classes…</p>
    </div>

    <!-- The list could not be read: say what is missing and offer the way back. -->
    <section v-else-if="error" class="max-w-xl border border-correct-500 bg-stock-50 p-6">
      <p class="furniture text-correct-500">Classes not loaded</p>
      <p class="mt-2 text-[15px] leading-snug text-stock-950">{{ error }}</p>
      <p class="mt-2 text-[13px] leading-relaxed text-stock-600">
        Nothing has been changed. The class list lives on the project, so until it loads there is
        nothing safe to edit here.
      </p>
      <button type="button" class="ink-button mt-5" @click="fetchProjectData">
        <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
        Try again
      </button>
    </section>

    <div v-else>
      <!-- Heading strip: the state of the list and the one control that saves it. -->
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-3">
        <div>
          <h2 class="text-[22px] font-semibold tracking-tight text-stock-950">Classes</h2>
          <p class="mt-1 text-[13px] leading-relaxed text-stock-600">
            The only vocabulary an annotator may apply. Each class prints in the ink shown beside it.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p v-if="hasChanges" class="furniture text-correct-500">Not saved yet</p>
          <button
            type="button"
            class="ink-button"
            :disabled="!hasChanges || updating"
            @click="updateClasses"
          >
            <UIcon name="i-lucide-check" class="size-3.5" />
            {{ updating ? 'Saving…' : 'Save classes' }}
          </button>
        </div>
      </div>

      <dl class="docket mt-4 flex-wrap gap-x-8 gap-y-2 border border-stock-400 px-4 py-3 furniture text-stock-600">
        <div class="docket-field min-w-0">
          <dt>Project</dt>
          <dd class="truncate">{{ projectData?.name || `#${props.projectId}` }}</dd>
        </div>
        <div class="docket-field"><dt>Type</dt><dd>{{ projectTypeName(projectData?.projectType) }}</dd></div>
        <div class="docket-field"><dt>Classes</dt><dd>{{ classes.length }}</dd></div>
        <div class="docket-field"><dt>Saved</dt><dd>{{ originalClasses.length }}</dd></div>
      </dl>

      <!-- What happened to the list, said where the list is. -->
      <p
        v-if="notice"
        class="mt-4 border px-4 py-2.5 text-[13px] leading-relaxed"
        :class="notice.kind === 'error' ? 'border-correct-500 text-stock-800' : 'border-stock-950 text-stock-800'"
        role="status"
        aria-live="polite"
      >
        {{ notice.text }}
      </p>

      <div class="mt-6 flex gap-2">
        <UInput
          v-model="newClassName"
          placeholder="car, pedestrian, traffic light"
          size="lg"
          class="flex-1"
          :disabled="updating"
          aria-label="Class name, or several separated by commas"
          @keydown.enter="handleAddClassKeydown"
        />
        <button
          type="button"
          class="ink-button"
          :disabled="!newClassName.trim() || updating"
          @click="addClass"
        >
          <UIcon name="i-lucide-plus" class="size-3.5" />
          Add
        </button>
      </div>

      <ul v-if="classes.length" class="mt-6 divide-y divide-stock-400 border-y border-stock-400">
        <li v-for="(className, index) in classes" :key="className" class="py-2.5">
          <div class="flex items-center gap-3">
            <span class="furniture w-6 text-stock-600">{{ index + 1 }}</span>
            <span class="swatch" :style="{ backgroundColor: classInk(className) }" />
            <span class="min-w-0 flex-1 truncate text-[14px] text-stock-950">{{ className }}</span>
            <button
              type="button"
              class="control px-2 py-1 text-stock-600 hover:text-correct-500"
              :disabled="updating"
              :aria-label="`Remove class ${className}`"
              @click="askRemove(index)"
            >
              Remove
            </button>
          </div>

          <!-- Removing shifts every later class onto a different ink, so it is said first. -->
          <div v-if="pendingRemoval === index" class="mt-2 border border-correct-500 bg-stock-50 p-3">
            <p class="furniture text-correct-500">Remove “{{ className }}”?</p>
            <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">
              Marks already made with this class keep their record but lose their ink and print as
              unclassed.
              <template v-if="classes.length - index - 1 > 0">
                The {{ classes.length - index - 1 }} class(es) below it move up a place, so each one
                prints in a different colour from tomorrow on.
              </template>
              Nothing changes on the server until you press Save classes.
            </p>
            <div class="mt-3 flex gap-2">
              <button type="button" class="ink-button" @click="removeClass(index)">Remove it</button>
              <button type="button" class="ink-button ink-button--outline" @click="pendingRemoval = null">Keep it</button>
            </div>
          </div>
        </li>
      </ul>

      <!-- An empty list is the state that stops labelling, so it says so. -->
      <div v-else class="mt-6 border border-dashed border-stock-400 p-6">
        <p class="text-[14px] font-semibold text-stock-950">No classes on this project</p>
        <p class="mt-1.5 max-w-xl text-[13px] leading-relaxed text-stock-600">
          An annotator opening a task here has nothing to apply, so no annotation can be recorded.
          Add the classes this dataset is being labelled for — type them above, separated by commas.
          {{ hasChanges ? 'Your removals are not saved yet: press Save classes to make them real.' : '' }}
        </p>
      </div>

      <p v-if="inkRepeatsFrom" class="mt-4 text-[13px] leading-relaxed text-correct-500">
        There are nine inks. From class {{ inkRepeatsFrom }} on they repeat — {{ repeatedPairs }}
        print in the same colour, and an annotator can only tell them apart by name.
      </p>

      <!-- Leaving this screen with unsaved edits is how the list gets lost, so it asks. -->
      <div v-if="pendingSection" class="mt-6 border border-correct-500 bg-stock-50 p-4">
        <p class="furniture text-correct-500">Unsaved classes</p>
        <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">
          The class list on screen is not the one on the server. Leaving this section now drops the
          edits.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="ink-button" :disabled="updating" @click="saveThenLeave">
            {{ updating ? 'Saving…' : 'Save and continue' }}
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="discardThenLeave">
            Discard edits and continue
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="pendingSection = null">
            Stay here
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router'
import { inkForClass, CLASS_INKS } from '~/utils/inks'
import { projectTypeName } from '~/components/project/sections/projectTypes'

interface Props {
  projectId: string
}

interface Project {
  id: number
  organizationId: number
  name: string
  description: string
  projectType: number
  labelConfig: {
    classes: string[]
  }
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: Project
    project_relations: {
      id: number
      userId: number
      projectId: number
      roleId: number
      createdAt: number
      updatedAt: number
    }
  }
}

const props = defineProps<Props>()

const token = useCookie('auth_token')

const loading = ref(true)
const error = ref<string | null>(null)
const updating = ref(false)
const projectData = ref<Project | null>(null)
const classes = ref<string[]>([])
const originalClasses = ref<string[]>([])
const newClassName = ref('')
const pendingRemoval = ref<number | null>(null)
const notice = ref<{ kind: 'done' | 'error', text: string } | null>(null)

const hasChanges = computed(() => {
  if (classes.value.length !== originalClasses.value.length) return true
  return !classes.value.every((className, index) => className === originalClasses.value[index])
})

const classInk = (className: string) => inkForClass(className, classes.value)

const inkRepeatsFrom = computed(() =>
  classes.value.length > CLASS_INKS.length ? CLASS_INKS.length + 1 : null
)

const repeatedPairs = computed(() => {
  const pairs = classes.value
    .slice(CLASS_INKS.length)
    .map((className, index) => `${classes.value[index]} and ${className}`)
  return pairs.slice(0, 3).join(', ') + (pairs.length > 3 ? `, and ${pairs.length - 3} more pair(s)` : '')
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
        'Authorization': `Bearer ${token.value}`
      }
    })

    projectData.value = response.data.projects

    const saved = response.data.projects.labelConfig?.classes ?? []
    classes.value = [...saved]
    originalClasses.value = [...saved]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The project could not be loaded.'
  } finally {
    loading.value = false
  }
}

const addClass = () => {
  const names = newClassName.value
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)

  if (!names.length) return

  const duplicates: string[] = []
  names.forEach(name => {
    if (classes.value.includes(name)) duplicates.push(name)
    else classes.value.push(name)
  })

  newClassName.value = ''
  pendingRemoval.value = null

  // The list itself is the receipt for an addition; only the refusals need words.
  notice.value = duplicates.length
    ? { kind: 'error', text: `Already in the list, not added again: ${duplicates.join(', ')}.` }
    : null
}

const handleAddClassKeydown = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  addClass()
}

const askRemove = (index: number) => {
  pendingRemoval.value = pendingRemoval.value === index ? null : index
}

const removeClass = (index: number) => {
  classes.value.splice(index, 1)
  pendingRemoval.value = null
  notice.value = null
}

const updateClasses = async () => {
  if (!hasChanges.value) return

  try {
    updating.value = true
    notice.value = null

    if (!token.value) {
      throw new Error('You are signed out, so nothing could be saved.')
    }
    if (!projectData.value) {
      throw new Error('The project is not loaded, so nothing could be saved.')
    }

    const updatedProject = {
      ...projectData.value,
      labelConfig: {
        classes: classes.value
      }
    }

    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: updatedProject
    })

    if (response.data?.projects) {
      projectData.value = response.data.projects
    } else {
      projectData.value = updatedProject
    }
    originalClasses.value = [...classes.value]

    notice.value = {
      kind: 'done',
      text: `Saved. This project now has ${classes.value.length} class(es); annotators see the change on their next task.`
    }
    return true
  } catch (err) {
    notice.value = {
      kind: 'error',
      text: `${err instanceof Error ? err.message : 'The classes could not be saved.'} The list on screen is unchanged — press Save classes to try again.`
    }
    return false
  } finally {
    updating.value = false
  }
}

/**
 * The sidebar swaps sections by writing this state, which unmounts this
 * component and takes any unsaved list with it. Hold the switch until the
 * edits have somewhere to go.
 */
const currentSection = useState<string>('currentProjectSection', () => 'annotate')
const pendingSection = ref<string | null>(null)

watch(currentSection, (next, previous) => {
  if (next === 'classes' || previous !== 'classes' || !hasChanges.value) return
  pendingSection.value = next
  currentSection.value = 'classes'
})

// The section also lives in the URL, so the same hold is put on the navigation
// itself; otherwise the query would move on without the panel.
onBeforeRouteUpdate(to => {
  if (!hasChanges.value) return true
  const raw = Array.isArray(to.query.section) ? to.query.section[0] : to.query.section
  if (!raw || raw === 'classes') return true
  pendingSection.value = String(raw)
  currentSection.value = 'classes'
  return false
})

const leaveToPendingSection = () => {
  const target = pendingSection.value
  pendingSection.value = null
  if (target) currentSection.value = target
}

const saveThenLeave = async () => {
  const ok = await updateClasses()
  if (ok) leaveToPendingSection()
}

const discardThenLeave = () => {
  classes.value = [...originalClasses.value]
  leaveToPendingSection()
}

onMounted(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasChanges.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))
})

watch(() => props.projectId, () => {
  if (props.projectId) {
    fetchProjectData()
  }
}, { immediate: true })
</script>
