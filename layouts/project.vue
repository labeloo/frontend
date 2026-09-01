<template>
  <div class="flex min-h-screen flex-col">
    <!-- Parked above the sheet until it takes focus: the keyboard path past the rail. -->
    <a
      href="#content"
      class="furniture absolute left-4 top-4 z-50 -translate-y-20 border border-stock-950 bg-stock-100 px-3 py-2 text-stock-950 transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>

    <!-- The fixed sidebar is desktop furniture. Below lg it would leave the
         content a sliver, so it is withdrawn and the rail below carries the
         same sections. -->
    <div class="hidden lg:block">
      <LayoutcomponentsProjectNavbar @section-change="handleSectionChange" />
    </div>

    <div class="flex flex-1 flex-col lg:ml-64">
      <header class="docket sticky top-0 z-30 flex-wrap gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" class="furniture flex flex-wrap items-center gap-2 text-stock-600">
          <NuxtLink to="/homepage" class="hover:text-stock-950">Organizations</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink :to="organizationPath" class="hover:text-stock-950">{{ organizationLabel }}</NuxtLink>
          <span aria-hidden="true">/</span>
          <span class="text-stock-950">{{ projectLabel }}</span>
          <span aria-hidden="true">/</span>
          <span class="text-stock-950">{{ sectionLabel }}</span>
        </nav>

        <LayoutcomponentsSessionField class="ml-auto" />
      </header>

      <nav aria-label="Project sections" class="border-b border-stock-400 lg:hidden">
        <ul class="flex overflow-x-auto">
          <li v-for="section in SECTIONS" :key="section.id">
            <NuxtLink
              :to="{ path: route.path, query: { ...route.query, section: section.id } }"
              class="furniture block whitespace-nowrap border-r border-stock-400 px-4 py-3"
              :class="
                currentSection === section.id
                  ? 'bg-stock-950 text-stock-50'
                  : 'text-stock-600 hover:text-stock-950'
              "
              :aria-current="currentSection === section.id ? 'page' : undefined"
            >
              {{ section.label }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="`/annotate/video/${projectId}`"
              class="furniture block whitespace-nowrap border-r border-stock-400 px-4 py-3 text-stock-600 hover:text-stock-950"
            >
              Video tracking
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <main id="content" tabindex="-1" class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectRecord } from '~/components/project/useProjectRecord'

const route = useRoute()
const token = useCookie('auth_token')

const SECTIONS = [
  { id: 'annotate', label: 'Annotate' },
  { id: 'tasks', label: 'Progress' },
  { id: 'users', label: 'Users' },
  { id: 'upload-data', label: 'Upload data' },
  { id: 'classes', label: 'Classes' },
  { id: 'settings', label: 'Settings' }
]

// The section is a place, so it lives in the URL: a refresh, the back button and
// a shared link all land on the same panel. The navbar and the page keep reading
// the shared state, which this layout holds in step with the query.
const currentSection = useState('currentProjectSection', () => 'annotate')

const sectionFromRoute = computed(() => {
  const raw = Array.isArray(route.query.section) ? route.query.section[0] : route.query.section
  return SECTIONS.some(section => section.id === raw) ? String(raw) : 'annotate'
})

watch(sectionFromRoute, section => { currentSection.value = section }, { immediate: true })

// The navbar announces the move; the watcher below carries it into the URL.
const handleSectionChange = (section: string) => {
  currentSection.value = section
}

const sectionLabel = computed(
  () => SECTIONS.find(section => section.id === currentSection.value)?.label ?? 'Annotate'
)

// Panels also move the section by writing the shared state directly - the
// overview's shortcuts, the class editor's unsaved-work guard. However the move
// was made, the URL has to end up telling the truth.
watch(currentSection, section => {
  if (section !== sectionFromRoute.value) {
    navigateTo({ path: route.path, query: { ...route.query, section } })
  }
})

const projectId = computed(() => String(route.params.id ?? ''))

// One shared project record for the whole screen: the sidebar reads the same one.
const { projectName, organizationId, load } = useProjectRecord(projectId)

const projectLabel = computed(() => projectName.value || `Project #${projectId.value}`)

const organizationName = ref('')
const organizationLabel = computed(
  () => organizationName.value || (organizationId.value ? `Organization #${organizationId.value}` : 'Organization')
)
const organizationPath = computed(() =>
  organizationId.value ? `/organizations/${organizationId.value}` : '/homepage'
)

// A project screen has to name the organization it sits in, and the way back has
// to be a link rather than a button that first asks the network where it is. If
// the name cannot be read the docket falls back to the id and still leads out.
const loadOrganizationName = async () => {
  organizationName.value = ''
  if (!organizationId.value || !token.value) return

  try {
    const response = await $fetch<{ data?: Array<{ organizations?: { name?: string } }> }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${organizationId.value}`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )
    organizationName.value = response?.data?.[0]?.organizations?.name ?? ''
  } catch (error) {
    organizationName.value = ''
  }
}

watch(projectId, () => load(), { immediate: true })
watch(organizationId, loadOrganizationName, { immediate: true })
</script>
