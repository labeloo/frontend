<script setup lang="ts">
/**
 * The members of an organization.
 *
 * Three things were wrong here and all three were about telling the truth:
 * the list rendered fields the API never returns (name, status, last active),
 * the counters measured invitations that do not exist, and the row menu, the
 * only way to remove somebody or change their role, ran console.log. The list
 * now shows what the API actually sends, and the two management actions call
 * the endpoints that already exist.
 */

interface Member {
  id: number
  email: string
  isActive: boolean
  role: string
  createdAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

const token = useCookie('auth_token')
const toast = useToast()

const members = ref<Member[]>([])
const roles = ref<{ id: number; name: string }[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const roleFilter = ref<string | null>(null)

const showAddModal = ref(false)

const memberToRemove = ref<Member | null>(null)
const removing = ref(false)

const memberToRerole = ref<Member | null>(null)
const newRoleId = ref<number | null>(null)
const reroling = ref(false)

const roleFilterItems = computed(() => [
  { label: 'All roles', value: null },
  ...Array.from(new Set(members.value.map(m => m.role).filter(Boolean)))
    .sort()
    .map(name => ({ label: name, value: name }))
])

const roleItems = computed(() => roles.value.map(r => ({ label: r.name, value: r.id })))

const filteredMembers = computed(() => {
  let filtered = members.value

  const query = searchQuery.value.trim().toLowerCase()
  if (query) filtered = filtered.filter(m => (m.email || '').toLowerCase().includes(query))

  if (roleFilter.value) filtered = filtered.filter(m => m.role === roleFilter.value)

  return filtered
})

const roleTally = computed(() => {
  const tally = new Map<string, number>()
  for (const m of members.value) {
    const key = m.role || 'No role'
    tally.set(key, (tally.get(key) ?? 0) + 1)
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1])
})

/** The API sends no display name, so the local part of the address stands in. */
const displayName = (member: Member) => (member.email || '').split('@')[0] || `Account #${member.id}`

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const describeError = (err: any, fallback: string) => {
  const status = err?.status ?? err?.statusCode
  if (status === 401) return 'Your session has expired. Sign in again and retry.'
  if (status === 403) return 'Your role does not allow managing members here.'
  return err?.data?.error || err?.message || fallback
}

const fetchMembers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch<{ data: Member[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: String(props.organizationId)
        }
      }
    )
    members.value = response.data ?? []
  } catch (err: any) {
    error.value = describeError(err, 'The member list could not be loaded.')
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const res = await $fetch<{ data: { id: number; name: string }[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/all',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: String(props.organizationId)
        }
      }
    )
    roles.value = (res.data ?? []).map(r => ({ id: r.id, name: r.name }))
  } catch {
    roles.value = []
  }
}

const onMembersAdded = async () => {
  showAddModal.value = false
  await fetchMembers()
}

const openRerole = (member: Member) => {
  memberToRerole.value = member
  newRoleId.value = roles.value.find(r => r.name === member.role)?.id ?? null
}

const confirmRerole = async () => {
  const member = memberToRerole.value
  if (!member || newRoleId.value == null) return

  reroling.value = true
  try {
    await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/updateRelation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        orgId: String(props.organizationId)
      },
      body: { userId: member.id, newRoleId: Number(newRoleId.value) }
    })

    const roleName = roles.value.find(r => r.id === Number(newRoleId.value))?.name ?? 'the new role'
    toast.add({
      title: 'Role changed',
      description: `${member.email} is now ${roleName}.`,
      color: 'success'
    })
    memberToRerole.value = null
    await fetchMembers()
  } catch (err: any) {
    toast.add({
      title: 'The role was not changed',
      description: describeError(err, `${member.email} still holds ${member.role}.`),
      color: 'error'
    })
  } finally {
    reroling.value = false
  }
}

const confirmRemove = async () => {
  const member = memberToRemove.value
  if (!member) return

  removing.value = true
  try {
    await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/removeUser', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        orgId: String(props.organizationId)
      },
      body: { userId: member.id }
    })

    toast.add({
      title: 'Member removed',
      description: `${member.email} no longer has access to this organization.`,
      color: 'success'
    })
    memberToRemove.value = null
    await fetchMembers()
  } catch (err: any) {
    toast.add({
      title: 'The member was not removed',
      description: describeError(err, `${member.email} still has access.`),
      color: 'error'
    })
  } finally {
    removing.value = false
  }
}

const memberActions = (member: Member) => [
  [
    {
      label: 'Change role',
      icon: 'i-lucide-replace',
      onSelect: () => openRerole(member)
    }
  ],
  [
    {
      label: 'Remove from organization',
      icon: 'i-lucide-user-minus',
      color: 'error' as const,
      onSelect: () => { memberToRemove.value = member }
    }
  ]
]

onMounted(() => {
  fetchMembers()
  fetchRoles()
})

watch(() => props.organizationId, () => {
  fetchMembers()
  fetchRoles()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Heading -->
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-5">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Members</h2>
        <p class="text-stock-600 mt-1">Who is in this organization, and what each of them may do.</p>
      </div>
      <button type="button" class="ink-button" @click="showAddModal = true">
        <UIcon name="i-lucide-user-plus" class="w-3.5 h-3.5" />
        Add member
      </button>
    </header>

    <!-- Fact strip -->
    <dl v-if="members.length > 0" class="docket flex-wrap gap-x-8 gap-y-2 py-3 furniture">
      <div class="docket-field">
        <dt>Members</dt>
        <dd>{{ members.length }}</dd>
      </div>
      <div v-for="[name, count] in roleTally" :key="name" class="docket-field">
        <dt>{{ name }}</dt>
        <dd>{{ count }}</dd>
      </div>
    </dl>

    <!-- Filters -->
    <div v-if="members.length > 0" class="flex flex-col sm:flex-row gap-3">
      <UInput
        v-model="searchQuery"
        class="flex-1"
        icon="i-lucide-search"
        placeholder="Filter by email"
      />
      <USelect
        v-model="roleFilter"
        :items="roleFilterItems"
        placeholder="All roles"
        class="sm:w-56"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading members</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" role="alert" class="border border-correct-500 bg-correct-100 p-5">
      <p class="font-medium text-correct-600">The member list could not be loaded</p>
      <p class="text-sm text-stock-800 mt-1">{{ error }}</p>
      <button type="button" class="ink-button ink-button--outline mt-4" @click="fetchMembers">Try again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="members.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <h3 class="text-lg font-semibold text-stock-950">Nobody here but you</h3>
      <p class="text-stock-700 mt-2">
        Members are added from accounts that already exist on Labeloo. There is no invitation
        email yet, so a new labeller has to sign up first and tell you the address they used —
        then you can find them here and give them a role.
      </p>
      <button type="button" class="ink-button mt-5" @click="showAddModal = true">
        <UIcon name="i-lucide-user-plus" class="w-3.5 h-3.5" />
        Add member
      </button>
    </div>

    <!-- No match -->
    <div v-else-if="filteredMembers.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <h3 class="text-lg font-semibold text-stock-950">No member matches this filter</h3>
      <p class="text-stock-700 mt-2">
        {{ members.length }} {{ members.length === 1 ? 'member is' : 'members are' }} in this
        organization. Clear the filter to see all of them.
      </p>
      <button
        type="button"
        class="ink-button ink-button--outline mt-5"
        @click="searchQuery = ''; roleFilter = null"
      >
        Clear filter
      </button>
    </div>

    <!-- List -->
    <div v-else class="border border-stock-400">
      <ul class="divide-y divide-stock-400">
        <li
          v-for="member in filteredMembers"
          :key="member.id"
          class="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-stock-50"
        >
          <div class="flex-1 min-w-[14rem]">
            <div class="font-medium text-stock-950">{{ displayName(member) }}</div>
            <div class="text-sm text-stock-600">{{ member.email }}</div>
          </div>

          <dl class="flex items-center gap-6 furniture">
            <div class="docket-field">
              <dt>Role</dt>
              <dd>{{ member.role || 'None' }}</dd>
            </div>
            <div class="docket-field hidden md:flex">
              <dt>Joined</dt>
              <dd>{{ formatDate(member.createdAt) }}</dd>
            </div>
            <div v-if="!member.isActive" class="docket-field">
              <dt>Account</dt>
              <dd>Disabled</dd>
            </div>
          </dl>

          <UDropdownMenu :items="memberActions(member)">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis"
              :aria-label="`Actions for ${member.email}`"
            />
          </UDropdownMenu>
        </li>
      </ul>
    </div>

    <!-- Add member -->
    <UModal
      v-model:open="showAddModal"
      title="Add member"
      description="Attach an existing Labeloo account to this organization."
      :ui="{ content: 'max-w-3xl' }"
    >
      <template #body>
        <OrganizationSearchUsers :org-id="organizationId" @users-added="onMembersAdded" />
      </template>
    </UModal>

    <!-- Change role -->
    <UModal
      :open="!!memberToRerole"
      :title="`Change role — ${memberToRerole?.email ?? ''}`"
      @update:open="(open) => { if (!open) memberToRerole = null }"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-stock-700">
            Currently <span class="text-stock-950 font-medium">{{ memberToRerole?.role || 'no role' }}</span>.
            The new role takes effect immediately, everywhere in this organization.
          </p>
          <USelect v-model="newRoleId" :items="roleItems" placeholder="Choose a role" class="w-full" />
          <p v-if="roleItems.length === 0" class="text-sm text-stock-700">
            This organization has no roles to move them to. Create one in Roles first.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button type="button" class="ink-button ink-button--outline" @click="memberToRerole = null">Cancel</button>
          <button
            type="button"
            class="ink-button"
            :disabled="newRoleId == null || reroling"
            @click="confirmRerole"
          >
            <UIcon v-if="reroling" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ reroling ? 'Saving' : 'Change role' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Remove member -->
    <UModal
      :open="!!memberToRemove"
      title="Remove member"
      @update:open="(open) => { if (!open) memberToRemove = null }"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-stock-950">
            Remove <span class="font-medium">{{ memberToRemove?.email }}</span> from this organization?
          </p>
          <p class="text-stock-700">
            They lose access to every project, task and annotation here immediately. Their
            Labeloo account stays; the annotations they already made stay too. You can add
            them back later with the same email address.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button type="button" class="ink-button ink-button--outline" @click="memberToRemove = null">Cancel</button>
          <button
            type="button"
            class="ink-button border-correct-600 bg-correct-600 hover:bg-correct-500 hover:border-correct-500"
            :disabled="removing"
            @click="confirmRemove"
          >
            <UIcon v-if="removing" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ removing ? 'Removing' : 'Remove member' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
