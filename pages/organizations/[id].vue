<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 min-h-[400px] text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading organization</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="min-h-[400px] py-12">
      <div class="max-w-xl border border-correct-500 bg-correct-100 p-6" role="alert">
        <h1 class="text-xl font-semibold text-correct-600">This organization could not be opened</h1>
        <p class="text-stock-800 mt-2">{{ error }}</p>
        <div class="flex flex-wrap gap-3 mt-5">
          <button type="button" class="ink-button" @click="refreshData">Try again</button>
          <NuxtLink to="/homepage" class="ink-button ink-button--outline">All organizations</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Main -->
    <div v-else>
      <!-- Sheet head: the organization as a strip of facts, not a hero card -->
      <header v-if="organization" class="border-b border-stock-400 pb-6 mb-8">
        <div class="flex items-start gap-5">
          <img
            v-if="organization.organizations.logo"
            :src="organization.organizations.logo"
            :alt="`${organization.organizations.name} logo`"
            class="w-14 h-14 object-cover border border-stock-400 shrink-0"
            @error="hideBrokenLogo"
          >
          <div class="min-w-0">
            <h1 class="text-3xl font-semibold text-stock-950">
              {{ organization.organizations.name }}
            </h1>
            <p v-if="organization.organizations.description" class="text-stock-700 mt-2 max-w-3xl">
              {{ organization.organizations.description }}
            </p>
          </div>
        </div>

        <dl class="docket flex-wrap gap-x-8 gap-y-2 py-3 mt-5 furniture border-b-0">
          <div class="docket-field">
            <dt>Created</dt>
            <dd>{{ formatDate(organization.organizations.createdAt) }}</dd>
          </div>
          <div class="docket-field">
            <dt>ID</dt>
            <dd>{{ organization.organizations.id }}</dd>
          </div>
          <div class="docket-field">
            <dt>Status</dt>
            <dd>{{ organization.organizations.isActiveOrg ? 'Active' : 'Inactive' }}</dd>
          </div>
        </dl>
      </header>

      <OrganizationSectionsOverviewSection
        v-if="activeSection === 'overview'"
        :organization-id="organizationId"
      />

      <OrganizationSectionsProjectsSection
        v-else-if="activeSection === 'projects'"
        :organization-id="organizationId"
      />

      <OrganizationSectionsUsersSection
        v-else-if="activeSection === 'users'"
        :organization-id="organizationId"
      />

      <OrganizationSectionsRolesSection
        v-else-if="activeSection === 'roles'"
        :organization-id="organizationId"
      />

      <OrganizationSectionsSettingsSection
        v-else-if="activeSection === 'settings'"
        :organization="organization"
        @refresh="refreshData"
      />

      <div v-else class="border border-stock-400 p-8 max-w-2xl">
        <h2 class="text-lg font-semibold text-stock-950">There is no "{{ activeSection }}" section</h2>
        <p class="text-stock-700 mt-2">
          The address asks for a section this organization does not have. Pick one from the
          list on the left, or go back to the overview.
        </p>
        <NuxtLink
          :to="{ query: { section: 'overview' } }"
          class="ink-button ink-button--outline mt-5"
        >
          Overview
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Organization {
  organizations: {
    id: number
    ownerId: number
    name: string
    logo: string
    description: string
    isActiveOrg: boolean
    createdAt: number
    updatedAt: number
  }
  organization_relations: {
    id: number
    userId: number
    organizationId: number
    roleId: number
    createdAt: number
    updatedAt: number
  }
}

const route = useRoute()

const organizationId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : id[0]
})

const { isAuthenticated } = useAuth()

/**
 * The open section lives in the address, so Back leaves the section rather
 * than the organization, a link to Settings opens Settings, and moving to
 * another organization starts at its overview instead of inheriting whatever
 * was last open somewhere else.
 */
const activeSection = computed(() => (route.query.section as string) || 'overview')

const organization = ref<Organization | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Read by the sidebar, so it can name the organization being edited.
const currentOrganizationName = useState<string | null>('currentOrganizationName', () => null)

const token = useCookie('auth_token')

const fetchOrganization = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${organizationId.value}`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session has expired. Sign in again.')
      if (response.status === 403) throw new Error('You are not a member of this organization.')
      if (response.status === 404) throw new Error('No organization with this address exists.')
      throw new Error(`The server answered ${response.status}.`)
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      organization.value = data.data[0]
      currentOrganizationName.value = organization.value?.organizations?.name ?? null
    } else {
      throw new Error('No organization with this address exists, or you are not a member of it.')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The organization could not be loaded.'
    currentOrganizationName.value = null
  } finally {
    loading.value = false
  }
}

const refreshData = async () => {
  loading.value = true
  error.value = null
  await fetchOrganization()
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const hideBrokenLogo = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) target.style.display = 'none'
}

definePageMeta({
  middleware: 'auth',
  layout: 'organization'
})

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }
  await refreshData()
})

onUnmounted(() => {
  currentOrganizationName.value = null
})

watch(organizationId, refreshData)

useSeoMeta({
  title: () => organization.value
    ? `${organization.value.organizations.name} — Labeloo`
    : 'Organization — Labeloo',
  description: () => organization.value?.organizations.description || 'Organization settings, members and projects'
})
</script>
