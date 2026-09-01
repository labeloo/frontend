<script setup lang="ts">
/**
 * Adding people to an organization.
 *
 * This is deliberately not called an invitation: there is no invitation email
 * and no pending-invite record behind it. It searches accounts that already
 * exist on Labeloo and attaches them to this organization, and it says so, so
 * that a manager hiring a labelling team is not left wondering why nobody
 * received anything.
 *
 * Selection is keyed by user id rather than by row position, so changing the
 * search cannot silently carry a tick from one person onto another.
 */

const props = defineProps<{
  orgId: string | number
}>()

const emit = defineEmits(['users-added'])

interface FoundUser {
  id: number
  email: string
}

const token = useCookie('auth_token')

const roles = ref<{ id: number; name: string }[]>([])
const rolesLoading = ref(false)
const rolesError = ref('')

const query = ref('')
const foundUsers = ref<FoundUser[]>([])
const searchState = ref<'idle' | 'searching' | 'done' | 'error'>('idle')
const searchError = ref('')
const lastQuery = ref('')

const existingUsers = ref<number[]>([])

// userId -> roleId. The pair travels together, so a changed search cannot
// separate a chosen role from the person it was chosen for.
const picked = reactive<Record<number, number | null>>({})

const adding = ref(false)

const roleItems = computed(() => roles.value.map(r => ({ label: r.name, value: r.id })))

const isUserInOrganization = (userId: number) => existingUsers.value.includes(userId)

const selectedIds = computed(() =>
  Object.keys(picked).map(Number).filter(id => !isUserInOrganization(id))
)

const readyToAdd = computed(() =>
  selectedIds.value.length > 0 && selectedIds.value.every(id => picked[id] != null)
)

const missingRoleCount = computed(() =>
  selectedIds.value.filter(id => picked[id] == null).length
)

const fetchRoles = async (forceRefresh = false) => {
  if (!forceRefresh && (roles.value.length > 0 || rolesLoading.value)) return
  rolesLoading.value = true
  rolesError.value = ''
  try {
    const res = await $fetch<{ data: { id: number; name: string }[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/all',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: String(props.orgId)
        }
      }
    )
    roles.value = (res.data ?? []).map(r => ({ id: r.id, name: r.name }))
    if (roles.value.length === 0) {
      rolesError.value = 'This organization has no roles yet. Create one first — every member needs a role.'
    }
  } catch (error: any) {
    rolesError.value = error?.data?.error || error?.message || 'The roles could not be loaded.'
  } finally {
    rolesLoading.value = false
  }
}

const refreshRoles = () => fetchRoles(true)

const fetchExistingUsers = async () => {
  if (!props.orgId) return
  try {
    const res = await $fetch<{ data: { id: number }[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: String(props.orgId)
        }
      }
    )
    existingUsers.value = (res.data ?? []).map(u => u.id)
    for (const id of existingUsers.value) delete picked[id]
  } catch {
    // A failure here only costs the "already a member" marking; the add call
    // itself is still authoritative, so it is not worth an alarm.
    existingUsers.value = []
  }
}

const toggle = (user: FoundUser) => {
  if (isUserInOrganization(user.id)) return
  if (user.id in picked) delete picked[user.id]
  else picked[user.id] = roles.value.length === 1 ? roles.value[0]!.id : null
}

let debounceTimeout: ReturnType<typeof setTimeout>

const runSearch = (value: string) => {
  clearTimeout(debounceTimeout)
  const trimmed = value.trim()

  if (!trimmed) {
    foundUsers.value = []
    searchState.value = 'idle'
    searchError.value = ''
    return
  }

  searchState.value = 'searching'

  debounceTimeout = setTimeout(async () => {
    try {
      const res = await $fetch<{ data: FoundUser[] }>(
        import.meta.env.NUXT_PUBLIC_API_URL + '/api/users/search',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token.value}`,
            word: trimmed
          }
        }
      )
      foundUsers.value = res.data ?? []
      lastQuery.value = trimmed
      searchState.value = 'done'
      searchError.value = ''
    } catch (error: any) {
      foundUsers.value = []
      searchState.value = 'error'
      searchError.value = error?.data?.error || error?.message || 'The search could not be run.'
    }
  }, 300)
}

watch(query, runSearch)

watch(() => props.orgId, (id) => {
  if (id) {
    fetchExistingUsers()
    fetchRoles(true)
  }
})

onMounted(() => {
  fetchExistingUsers()
  fetchRoles()
})

const addUsers = async () => {
  const payload = selectedIds.value
    .filter(id => picked[id] != null)
    .map(id => ({ roleId: Number(picked[id]), userId: Number(id) }))

  if (payload.length === 0) return

  if (!props.orgId) {
    useToast().add({
      title: 'No organization selected',
      description: 'Reload the page and try again.',
      color: 'error'
    })
    return
  }

  adding.value = true
  try {
    await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/addUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        orgId: String(props.orgId)
      },
      body: payload
    })

    const details = payload.map(p => ({
      id: p.userId,
      email: foundUsers.value.find(u => u.id === p.userId)?.email || '',
      roleId: p.roleId
    }))

    await fetchExistingUsers()
    for (const key of Object.keys(picked)) delete picked[Number(key)]

    useToast().add({
      title: payload.length === 1 ? 'Member added' : `${payload.length} members added`,
      description: details.map(d => d.email).filter(Boolean).join(', '),
      color: 'success'
    })

    emit('users-added', details)
  } catch (error: any) {
    const status = error?.status ?? error?.statusCode
    useToast().add({
      title: 'Nobody was added',
      description:
        status === 403
          ? 'Your role does not allow adding members to this organization.'
          : error?.data?.error || error?.message || 'The server refused the request. Try again.',
      color: 'error'
    })
  } finally {
    adding.value = false
  }
}

defineExpose({ refreshRoles })
</script>

<template>
  <div class="space-y-6">
    <div>
      <label for="member-search" class="block font-medium text-stock-950">
        Add an existing Labeloo account
      </label>
      <p class="text-sm text-stock-600 mt-1 max-w-prose">
        Search by email address. The person must already have a Labeloo account —
        invitation emails cannot be sent yet, so ask them to sign up first and tell you
        the address they used.
      </p>
      <UInput
        id="member-search"
        v-model="query"
        class="w-full mt-3"
        icon="i-lucide-search"
        placeholder="name@company.com"
        autocomplete="off"
      />
    </div>

    <div v-if="rolesError" class="border border-stock-400 p-4">
      <p class="text-sm text-stock-800">{{ rolesError }}</p>
    </div>

    <!-- Results -->
    <div class="border border-stock-400">
      <div v-if="searchState === 'idle'" class="px-4 py-8 text-center">
        <p class="text-stock-950 font-medium">Search to begin</p>
        <p class="text-sm text-stock-600 mt-1">
          Type part of an email address. Results appear as you type.
        </p>
      </div>

      <div v-else-if="searchState === 'searching'" class="flex items-center justify-center gap-3 px-4 py-8 text-stock-600">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <span class="furniture">Searching accounts</span>
      </div>

      <div v-else-if="searchState === 'error'" class="px-4 py-8 text-center">
        <p class="text-correct-600 font-medium">The search failed</p>
        <p class="text-sm text-stock-700 mt-1">{{ searchError }}</p>
        <button type="button" class="ink-button ink-button--outline mt-4" @click="runSearch(query)">
          Search again
        </button>
      </div>

      <div v-else-if="foundUsers.length === 0" class="px-4 py-8 text-center">
        <p class="text-stock-950 font-medium">No account matches "{{ lastQuery }}"</p>
        <p class="text-sm text-stock-600 mt-1 max-w-prose mx-auto">
          Only people who already have a Labeloo account can be found here. Ask them to
          sign up, then search for the address they registered with.
        </p>
      </div>

      <ul v-else class="divide-y divide-stock-400">
        <li v-for="user in foundUsers" :key="user.id" class="px-4 py-3">
          <div class="flex flex-wrap items-center gap-4">
            <UCheckbox
              :model-value="user.id in picked"
              :disabled="isUserInOrganization(user.id)"
              :aria-label="`Select ${user.email}`"
              @update:model-value="toggle(user)"
            />

            <div class="flex-1 min-w-[12rem]">
              <div class="text-stock-950">{{ user.email }}</div>
              <div class="furniture text-stock-600 mt-1">
                {{ isUserInOrganization(user.id) ? 'Already a member' : `Account #${user.id}` }}
              </div>
            </div>

            <USelect
              v-if="user.id in picked"
              :model-value="picked[user.id] ?? undefined"
              :items="roleItems"
              :loading="rolesLoading"
              placeholder="Choose a role"
              class="min-w-[11rem]"
              @update:model-value="(value) => picked[user.id] = value"
            />
          </div>
        </li>
      </ul>
    </div>

    <div v-if="selectedIds.length > 0" class="flex flex-wrap items-center justify-between gap-4 border-t border-stock-400 pt-4">
      <p class="text-sm text-stock-700">
        {{ selectedIds.length }} selected.
        <span v-if="missingRoleCount > 0">
          {{ missingRoleCount }} still {{ missingRoleCount === 1 ? 'needs' : 'need' }} a role.
        </span>
      </p>
      <button type="button" class="ink-button" :disabled="!readyToAdd || adding" @click="addUsers">
        <UIcon v-if="adding" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
        {{ adding ? 'Adding' : `Add ${selectedIds.length === 1 ? 'member' : 'members'}` }}
      </button>
    </div>
  </div>
</template>
