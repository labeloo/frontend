<template>
  <aside class="bg-stock-100 h-screen w-64 fixed left-0 top-0 z-40 border-r border-stock-400">
    <div class="flex flex-col h-full">
      <!-- Wordmark -->
      <div class="px-5 py-4 border-b border-stock-400">
        <NuxtLink :to="{ name: 'homepage' }" class="text-xl font-semibold text-stock-950">
          Labeloo
        </NuxtLink>
      </div>

      <!-- Which organization this is. Without it, a manager with several of
           them cannot tell whose settings they are about to change. -->
      <div class="px-5 py-4 border-b border-stock-400">
        <p class="furniture text-stock-600">Organization</p>
        <p class="text-stock-950 font-medium mt-2 break-words leading-snug">
          {{ organizationName || 'Loading' }}
        </p>
        <NuxtLink
          to="/homepage"
          class="control text-stock-600 hover:text-stock-950 inline-flex items-center gap-1.5 mt-3"
        >
          <UIcon name="i-lucide-arrow-left" class="w-3 h-3" />
          All organizations
        </NuxtLink>
      </div>

      <!-- Sections -->
      <nav class="flex-1 p-3 overflow-y-auto" aria-label="Organization sections">
        <p class="furniture text-stock-600 px-2 pt-2 pb-3">This organization</p>
        <ul class="space-y-0.5">
          <li v-for="item in navItems" :key="item.key">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left border-l-2 transition-colors"
              :class="activeSection === item.key
                ? 'border-stock-950 bg-stock-950 text-stock-50'
                : 'border-transparent text-stock-700 hover:text-stock-950 hover:bg-stock-200'"
              :aria-current="activeSection === item.key ? 'page' : undefined"
              @click="handleNavClick(item.key)"
            >
              <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
              {{ item.label }}
            </button>
          </li>
        </ul>
      </nav>

      <div class="p-3 border-t border-stock-400">
        <button type="button" class="ink-button ink-button--outline w-full justify-center" @click="handleLogout">
          <UIcon name="i-lucide-log-out" class="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  middleware: [async () => {
    const { isAuthenticated } = useAuth()
    if (!isAuthenticated.value) {
      return navigateTo('/login')
    }
  }]
})

const { logout } = useAuth()
const route = useRoute()
const router = useRouter()

const emit = defineEmits<{
  'section-change': [section: string]
}>()

const navItems = [
  { key: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard' },
  { key: 'projects', label: 'Projects', icon: 'i-lucide-folder' },
  { key: 'users', label: 'Members', icon: 'i-lucide-users' },
  { key: 'roles', label: 'Roles', icon: 'i-lucide-list-checks' },
  { key: 'settings', label: 'Settings', icon: 'i-lucide-settings' }
]

// The page writes this while it loads the organization.
const organizationName = useState<string | null>('currentOrganizationName', () => null)

// The section is a fact about the address, not a fact about the session: Back
// returns to the previous section, and a link carries the section with it.
const activeSection = computed(() => (route.query.section as string) || 'overview')

const handleLogout = () => {
  logout()
}

const handleNavClick = (section: string) => {
  router.push({ query: { ...route.query, section } })
  emit('section-change', section)
}
</script>
