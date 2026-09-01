<script setup lang="ts">
/**
 * The first screen of an organization.
 *
 * Its job is to answer, in one look: is this place set up to work? The four
 * counter cards it used to carry never mentioned the one thing that decides
 * whether the magic stick works at all — the SAM 2 connection — so a manager
 * could reach three green ticks and still hand their team a broken tool. That
 * fact now sits at the top, and links straight to where it is fixed.
 */
import { projectTypeName } from '~/components/project/sections/projectTypes'

interface Project {
  id: number
  organizationId: number
  name: string
  description: string
  projectType: number
  roleId: number
  createdAt: number
  updatedAt: number
}

interface Member {
  id: number
  email: string
  isActive: boolean
  role: string
  createdAt: number
}

interface Role {
  id: number
  name: string
  description: string
}

interface BackendConnection {
  id: number
  backendId: string
  backendTypeName: string
  baseUrl: string
  isActive: boolean
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()

const projects = ref<Project[]>([])
const members = ref<Member[]>([])
const roles = ref<Role[]>([])
const connections = ref<BackendConnection[]>([])
const loading = ref(true)

const token = useCookie('auth_token')

const sam2Connection = computed(() =>
  connections.value.find(c => (c.backendId || '').toLowerCase().startsWith('sam'))
)

const recentProjectsList = computed(() =>
  [...projects.value].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
)

const recentMembersList = computed(() =>
  [...members.value].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
)

const authHeaders = () => ({
  Authorization: `Bearer ${token.value}`,
  'Content-Type': 'application/json',
  orgId: String(props.organizationId)
})

const fetchProjects = async () => {
  try {
    const response = await $fetch<{ data: Project[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/projects/all',
      { headers: authHeaders() }
    )
    projects.value = (response.data ?? []).filter(
      p => p.organizationId === Number.parseInt(props.organizationId as string)
    )
  } catch {
    projects.value = []
  }
}

const fetchMembers = async () => {
  try {
    const response = await $fetch<{ data: Member[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
      { method: 'GET', headers: authHeaders() }
    )
    members.value = response.data ?? []
  } catch {
    members.value = []
  }
}

const fetchRoles = async () => {
  try {
    const response = await $fetch<{ data: Role[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/all',
      { method: 'GET', headers: authHeaders() }
    )
    roles.value = response.data ?? []
  } catch {
    roles.value = []
  }
}

const fetchConnections = async () => {
  try {
    const response = await $fetch<{ data: BackendConnection[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations',
      { headers: authHeaders() }
    )
    connections.value = response.data ?? []
  } catch {
    connections.value = []
  }
}

const fetchAllData = async () => {
  loading.value = true
  if (!token.value) {
    loading.value = false
    return
  }
  try {
    await Promise.all([fetchProjects(), fetchMembers(), fetchRoles(), fetchConnections()])
  } finally {
    loading.value = false
  }
}

const goToSection = (section: string) => {
  router.push({ query: { ...route.query, section } })
}

const createProject = () => {
  navigateTo('/projects/create?organizationId=' + props.organizationId)
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

onMounted(fetchAllData)

watch(() => props.organizationId, fetchAllData)
</script>

<template>
  <div class="space-y-10">
    <header class="border-b border-stock-400 pb-5">
      <h2 class="text-2xl font-semibold text-stock-950">Overview</h2>
      <p class="text-stock-600 mt-1">What this organization holds, and whether it is ready to work.</p>
    </header>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading organization</span>
    </div>

    <template v-else>
      <!-- Fact strip -->
      <dl class="docket flex-wrap gap-x-10 gap-y-2 py-3 furniture">
        <div class="docket-field">
          <dt>Projects</dt>
          <dd>{{ projects.length }}</dd>
        </div>
        <div class="docket-field">
          <dt>Members</dt>
          <dd>{{ members.length }}</dd>
        </div>
        <div class="docket-field">
          <dt>Roles</dt>
          <dd>{{ roles.length }}</dd>
        </div>
        <div class="docket-field">
          <dt>SAM 2</dt>
          <dd>{{ sam2Connection ? (sam2Connection.isActive ? 'Connected' : 'Disabled') : 'Not connected' }}</dd>
        </div>
      </dl>

      <!-- The one fact that decides whether assisted labelling works -->
      <section
        v-if="!sam2Connection || !sam2Connection.isActive"
        class="border border-stock-400 p-5 max-w-3xl"
      >
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-triangle-alert" class="w-5 h-5 text-correct-600 mt-0.5 shrink-0" />
          <div>
            <h3 class="font-semibold text-stock-950">
              {{ sam2Connection ? 'The SAM 2 connection is switched off' : 'No SAM 2 connection' }}
            </h3>
            <p class="text-stock-700 mt-1">
              Without it the magic stick and video tracking fail for everyone in this
              organization, and annotators have to draw every shape by hand. Nothing else
              breaks — the rest of the tool works as normal.
            </p>
            <button type="button" class="ink-button ink-button--outline mt-4" @click="goToSection('settings')">
              {{ sam2Connection ? 'Switch it back on' : 'Connect SAM 2' }}
            </button>
          </div>
        </div>
      </section>

      <section v-else class="border border-stock-400 p-5 max-w-3xl">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-check" class="w-5 h-5 text-stock-950 mt-0.5 shrink-0" />
          <div>
            <h3 class="font-semibold text-stock-950">SAM 2 is connected</h3>
            <p class="text-sm text-stock-600 mt-1 font-mono break-all">{{ sam2Connection.baseUrl }}</p>
            <p class="text-stock-700 mt-2">
              Assisted labelling is available. Tracking speed depends on that host: roughly
              1–3.5 seconds per frame on a CPU, far quicker on a GPU.
            </p>
          </div>
        </div>
      </section>

      <!-- Projects -->
      <section>
        <div class="flex items-end justify-between gap-4 border-b border-stock-400 pb-3">
          <h3 class="text-lg font-semibold text-stock-950">Recent projects</h3>
          <button v-if="projects.length" type="button" class="ink-button ink-button--outline" @click="goToSection('projects')">
            All {{ projects.length }}
          </button>
        </div>

        <p v-if="projects.length === 0" class="text-stock-700 mt-4 max-w-prose">
          No projects yet. A project holds the images or video, the label classes and the tasks —
          nothing can be annotated until one exists.
          <button type="button" class="underline decoration-stock-400 underline-offset-4 hover:decoration-stock-950" @click="createProject">
            Create the first project.
          </button>
        </p>

        <ul v-else class="divide-y divide-stock-400 border-b border-stock-400">
          <li v-for="project in recentProjectsList" :key="project.id">
            <button
              type="button"
              class="w-full text-left py-3 flex flex-wrap items-center gap-4 hover:bg-stock-50"
              @click="viewProject(project.id)"
            >
              <span class="flex-1 min-w-[12rem] font-medium text-stock-950">{{ project.name }}</span>
              <dl class="flex items-center gap-6 furniture">
                <div class="docket-field">
                  <dt>Type</dt>
                  <dd>{{ projectTypeName(project.projectType) }}</dd>
                </div>
                <div class="docket-field hidden md:flex">
                  <dt>Created</dt>
                  <dd>{{ formatDate(project.createdAt) }}</dd>
                </div>
              </dl>
            </button>
          </li>
        </ul>
      </section>

      <!-- Members -->
      <section>
        <div class="flex items-end justify-between gap-4 border-b border-stock-400 pb-3">
          <h3 class="text-lg font-semibold text-stock-950">Recent members</h3>
          <button v-if="members.length" type="button" class="ink-button ink-button--outline" @click="goToSection('users')">
            All {{ members.length }}
          </button>
        </div>

        <p v-if="members.length === 0" class="text-stock-700 mt-4 max-w-prose">
          Only you. Members are added from accounts that already exist on Labeloo — there is no
          invitation email yet, so a new labeller signs up first and you add them by their address.
        </p>

        <ul v-else class="divide-y divide-stock-400 border-b border-stock-400">
          <li v-for="member in recentMembersList" :key="member.id" class="py-3 flex flex-wrap items-center gap-4">
            <span class="flex-1 min-w-[12rem] text-stock-950">{{ member.email }}</span>
            <dl class="furniture">
              <div class="docket-field">
                <dt>Role</dt>
                <dd>{{ member.role || 'None' }}</dd>
              </div>
            </dl>
          </li>
        </ul>
      </section>

      <!-- Next steps -->
      <section class="border-t border-stock-400 pt-6">
        <h3 class="furniture text-stock-600">Go to</h3>
        <div class="flex flex-wrap gap-3 mt-3">
          <button type="button" class="ink-button" @click="createProject">
            <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
            New project
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="goToSection('users')">
            <UIcon name="i-lucide-user-plus" class="w-3.5 h-3.5" />
            Add member
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="goToSection('roles')">
            <UIcon name="i-lucide-list-checks" class="w-3.5 h-3.5" />
            Roles
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="goToSection('settings')">
            <UIcon name="i-lucide-settings" class="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
