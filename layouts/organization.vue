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
      <LayoutcomponentsOrganizationNavbar @section-change="handleSectionChange" />
    </div>

    <div class="flex flex-1 flex-col lg:ml-64">
      <header class="docket sticky top-0 z-30 flex-wrap gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" class="furniture flex flex-wrap items-center gap-2 text-stock-600">
          <NuxtLink to="/homepage" class="hover:text-stock-950">Organizations</NuxtLink>
          <span aria-hidden="true">/</span>
          <span class="text-stock-950">{{ organizationLabel }}</span>
          <span aria-hidden="true">/</span>
          <span class="text-stock-950">{{ sectionLabel }}</span>
        </nav>

        <LayoutcomponentsSessionField class="ml-auto" />
      </header>

      <nav aria-label="Organization sections" class="border-b border-stock-400 lg:hidden">
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
        </ul>
      </nav>

      <main id="content" tabindex="-1" class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const token = useCookie('auth_token')

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'models', label: 'Models' },
  { id: 'settings', label: 'Settings' }
]

// The section is a place, so it lives in the URL: a refresh, the back button and
// a shared link all land on the same panel. The navbar and the page keep reading
// the shared state, which this layout holds in step with the query.
const currentSection = useState('currentSection', () => 'overview')

const sectionFromRoute = computed(() => {
  const raw = Array.isArray(route.query.section) ? route.query.section[0] : route.query.section
  return SECTIONS.some(section => section.id === raw) ? String(raw) : 'overview'
})

watch(sectionFromRoute, section => { currentSection.value = section }, { immediate: true })

// The navbar announces the move; the watcher below carries it into the URL.
const handleSectionChange = (section: string) => {
  currentSection.value = section
}

const sectionLabel = computed(
  () => SECTIONS.find(section => section.id === currentSection.value)?.label ?? 'Overview'
)

// Panels also move the section by writing the shared state directly - the
// overview's shortcuts, the class editor's unsaved-work guard. However the move
// was made, the URL has to end up telling the truth.
watch(currentSection, section => {
  if (section !== sectionFromRoute.value) {
    navigateTo({ path: route.path, query: { ...route.query, section } })
  }
})

const organizationId = computed(() => String(route.params.id ?? ''))
const organizationName = ref('')

const organizationLabel = computed(
  () => organizationName.value || `Organization #${organizationId.value}`
)

// The docket must be able to name where you are. If the name cannot be read the
// strip falls back to the id and the breadcrumb still leads out.
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

watch(organizationId, loadOrganizationName)
onMounted(loadOrganizationName)
</script>
