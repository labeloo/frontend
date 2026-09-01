<script setup lang="ts">
/**
 * The organizations this account belongs to.
 *
 * Loading the page used to fire a success toast every time — a celebration for
 * something nobody asked for, which spends the notification channel that real
 * failures need. Notifications here now only follow an action.
 */
import penguin from '~/assets/images/penguin.png'

interface Organization {
  id: number
  name: string
  logo: string
  description: string
  isActiveOrg: boolean
  createdAt: number
  updatedAt: number
}

const organizations = ref<Organization[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const showCreate = ref(false)

const formatDate = (timestamp: number): string => {
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

const fetchOrganizations = async () => {
  loading.value = true
  loadError.value = null
  try {
    const token = useCookie('auth_token')
    if (!token.value) {
      loadError.value = 'Your session has expired. Sign in again to see your organizations.'
      return
    }

    const response = await fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizations/all', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      }
    })

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Your session has expired. Sign in again.'
          : `The server answered ${response.status}.`
      )
    }

    const responseData: { data: Organization[] } = await response.json()
    organizations.value = responseData.data || []
  } catch (error) {
    loadError.value = error instanceof Error
      ? error.message
      : 'Your organizations could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrganizations)
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-5">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Organizations</h2>
        <p class="text-stock-600 mt-1">Each one holds its own projects, members and model connection.</p>
      </div>
      <button type="button" class="ink-button" @click="showCreate = true">
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        Create organization
      </button>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 min-h-[300px] text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading your organizations</span>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" role="alert" class="border border-correct-500 bg-correct-100 p-5 max-w-2xl">
      <p class="font-medium text-correct-600">Your organizations could not be loaded</p>
      <p class="text-sm text-stock-800 mt-1">{{ loadError }}</p>
      <button type="button" class="ink-button ink-button--outline mt-4" @click="fetchOrganizations">Try again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="organizations.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <div class="flex items-start gap-6">
        <img :src="penguin" alt="" class="w-24 h-auto shrink-0 hidden sm:block">
        <div>
          <h3 class="text-lg font-semibold text-stock-950">You are not in any organization yet</h3>
          <p class="text-stock-700 mt-2">
            An organization is where the work lives: its projects, the people labelling them, the
            roles that decide who may do what, and the SAM 2 connection that powers the magic stick.
            Create one and Labeloo will walk you through roles and members.
          </p>
          <button type="button" class="ink-button mt-5" @click="showCreate = true">
            <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
            Create your first organization
          </button>
        </div>
      </div>
    </div>

    <!-- List -->
    <div v-else class="border border-stock-400">
      <ul class="divide-y divide-stock-400">
        <li v-for="org in organizations" :key="org.id">
          <NuxtLink
            :to="'/organizations/' + org.id"
            class="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-stock-50"
          >
            <img
              v-if="org.logo"
              :src="org.logo"
              alt=""
              class="w-10 h-10 object-cover border border-stock-400 shrink-0"
              @error="hideBrokenLogo"
            >
            <div class="flex-1 min-w-[14rem]">
              <div class="font-medium text-stock-950">{{ org.name || 'Unnamed organization' }}</div>
              <p v-if="org.description" class="text-sm text-stock-600 line-clamp-2 mt-0.5">
                {{ org.description }}
              </p>
            </div>
            <dl class="flex items-center gap-6 furniture">
              <div class="docket-field hidden sm:flex">
                <dt>Created</dt>
                <dd>{{ formatDate(org.createdAt) }}</dd>
              </div>
              <div v-if="!org.isActiveOrg" class="docket-field">
                <dt>Status</dt>
                <dd>Inactive</dd>
              </div>
            </dl>
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-stock-600 shrink-0" />
          </NuxtLink>
        </li>
      </ul>
    </div>

    <UModal
      v-model:open="showCreate"
      fullscreen
      title="Create organization"
      description="Name it, define roles, then add the people who will label."
    >
      <template #body>
        <OrganizationCreateOrg @finished="showCreate = false" />
      </template>
    </UModal>
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
