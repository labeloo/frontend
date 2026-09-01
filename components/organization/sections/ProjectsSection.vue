<script setup lang="ts">
/**
 * The projects of one organization.
 *
 * The badge used to print "Type 0" and colour it from the raw number, so a
 * project type could come out in correction red and read as a fault. Types
 * are named from the one shared list now, and the row menu — which held two
 * console.log actions — is gone rather than pretending to offer them.
 */
import { projectTypeName } from '~/components/project/sections/projectTypes'

interface Project {
  id: number
  organizationId: number
  organizationName: string
  organizationLogo: string
  name: string
  description: string
  projectType: number
  roleId: number
  createdAt: number
  updatedAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const token = useCookie('auth_token')

const activeProjects = computed(() => {
  const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 60 * 60
  return projects.value.filter(p => p.updatedAt > thirtyDaysAgo).length
})

const fetchProjects = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/projects/all', {
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        orgId: props.organizationId.toString()
      }
    })

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Your session has expired. Sign in again and retry.'
          : `The server answered ${response.status}.`
      )
    }

    const data = await response.json()

    if (data.data) {
      projects.value = data.data.filter((project: Project) =>
        project.organizationId === Number.parseInt(props.organizationId as string)
      )
    } else {
      projects.value = []
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The projects could not be loaded.'
  } finally {
    loading.value = false
  }
}

const createProject = () => {
  navigateTo(`/projects/create?organizationId=${props.organizationId}`)
}

const viewProject = (projectId: number) => {
  navigateTo(`/projects/${projectId}`)
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(fetchProjects)

watch(() => props.organizationId, fetchProjects)
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-5">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Projects</h2>
        <p class="text-stock-600 mt-1">Every dataset this organization is labelling.</p>
      </div>
      <button type="button" class="ink-button" @click="createProject">
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        Create project
      </button>
    </header>

    <dl v-if="projects.length > 0" class="docket flex-wrap gap-x-8 gap-y-2 py-3 furniture">
      <div class="docket-field">
        <dt>Projects</dt>
        <dd>{{ projects.length }}</dd>
      </div>
      <div class="docket-field">
        <dt>Touched in 30 days</dt>
        <dd>{{ activeProjects }}</dd>
      </div>
    </dl>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading projects</span>
    </div>

    <div v-else-if="error" role="alert" class="border border-correct-500 bg-correct-100 p-5">
      <p class="font-medium text-correct-600">The projects could not be loaded</p>
      <p class="text-sm text-stock-800 mt-1">{{ error }}</p>
      <button type="button" class="ink-button ink-button--outline mt-4" @click="fetchProjects">Try again</button>
    </div>

    <div v-else-if="projects.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <h3 class="text-lg font-semibold text-stock-950">No projects yet</h3>
      <p class="text-stock-700 mt-2">
        A project holds the images or video, the label classes an annotator may apply, and the
        tasks handed out to members. Nothing can be labelled until one exists.
      </p>
      <button type="button" class="ink-button mt-5" @click="createProject">
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        Create the first project
      </button>
    </div>

    <div v-else class="border border-stock-400">
      <ul class="divide-y divide-stock-400">
        <li v-for="project in projects" :key="project.id">
          <button
            type="button"
            class="w-full text-left px-5 py-4 hover:bg-stock-50 flex flex-wrap items-start gap-4"
            @click="viewProject(project.id)"
          >
            <div class="flex-1 min-w-[16rem]">
              <div class="font-medium text-stock-950">{{ project.name }}</div>
              <p v-if="project.description" class="text-sm text-stock-600 mt-1 line-clamp-2">
                {{ project.description }}
              </p>
            </div>

            <dl class="flex items-center gap-6 furniture pt-1">
              <div class="docket-field">
                <dt>Type</dt>
                <dd>{{ projectTypeName(project.projectType) }}</dd>
              </div>
              <div class="docket-field hidden md:flex">
                <dt>Created</dt>
                <dd>{{ formatDate(project.createdAt) }}</dd>
              </div>
            </dl>

            <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-stock-600 mt-1 shrink-0" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
