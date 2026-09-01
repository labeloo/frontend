<script setup lang="ts">
/**
 * Roles in an organization.
 *
 * The row menu here used to be three console.log calls, so a role created with
 * the wrong permissions was permanent. Deleting is real now, it counts the
 * members holding the role first, and it refuses while anyone still holds it —
 * removing a role out from under a member would leave them with no answer to
 * "what am I allowed to do".
 *
 * The create form is the same component the setup wizard uses, so a role made
 * here and a role made during setup cannot behave differently.
 */
import PermissionFlagsModal from '../PermissionFlagsModal.vue'
import { summarisePermissions, type PermissionFlags } from '../permissions'

interface Role {
  id: number
  name: string
  description: string
  permissionFlags: PermissionFlags
  createdAt: number
}

interface Props {
  organizationId: string | number
}

const props = defineProps<Props>()

const token = useCookie('auth_token')
const toast = useToast()

const roles = ref<Role[]>([])
const memberRoleTally = ref<Record<string, number>>({})
const loading = ref(true)
const loadError = ref<string | null>(null)
const searchQuery = ref('')

const showCreateModal = ref(false)

const roleToRead = ref<Role | null>(null)
const roleToDelete = ref<Role | null>(null)
const deleting = ref(false)

const filteredRoles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return roles.value
  return roles.value.filter(role =>
    role.name.toLowerCase().includes(query) ||
    (role.description || '').toLowerCase().includes(query)
  )
})

const memberCount = (role: Role) => memberRoleTally.value[role.name] ?? 0

const unusedRoles = computed(() => roles.value.filter(r => memberCount(r) === 0).length)

const readRole = computed(() => {
  const role = roleToRead.value
  if (!role) return null
  return {
    name: role.name,
    description: role.description,
    permissionFlags: role.permissionFlags as unknown as Record<string, boolean>,
    memberCount: memberCount(role)
  }
})

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
  if (status === 403) return 'Your role does not allow managing roles here.'
  return err?.data?.error || err?.message || fallback
}

const fetchRoles = async () => {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<{ data: any[] }>(
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

    roles.value = (res.data ?? []).map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissionFlags: (role.permissionFlags || {}) as PermissionFlags,
      createdAt: role.createdAt || 0
    }))
  } catch (err: any) {
    loadError.value = describeError(err, 'The roles could not be loaded.')
  } finally {
    loading.value = false
  }
}

/** Member counts come from the member list, which carries each member's role name. */
const fetchMemberTally = async () => {
  try {
    const res = await $fetch<{ data: { role: string }[] }>(
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
    const tally: Record<string, number> = {}
    for (const member of res.data ?? []) {
      if (!member.role) continue
      tally[member.role] = (tally[member.role] ?? 0) + 1
    }
    memberRoleTally.value = tally
  } catch {
    memberRoleTally.value = {}
  }
}

const refresh = async () => {
  await Promise.all([fetchRoles(), fetchMemberTally()])
}

const onRoleCreated = async () => {
  showCreateModal.value = false
  await refresh()
}

const confirmDelete = async () => {
  const role = roleToDelete.value
  if (!role) return

  deleting.value = true
  try {
    await $fetch(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizationRoles/${role.id}?orgId=${props.organizationId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: String(props.organizationId)
        }
      }
    )

    toast.add({
      title: `Role "${role.name}" deleted`,
      description: 'It can no longer be assigned to anyone.',
      color: 'success'
    })
    roleToDelete.value = null
    await refresh()
  } catch (err: any) {
    toast.add({
      title: 'The role was not deleted',
      description: describeError(err, `"${role.name}" is still there.`),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

const roleActions = (role: Role) => [
  [
    {
      label: 'Read permissions',
      icon: 'i-lucide-list-checks',
      onSelect: () => { roleToRead.value = role }
    }
  ],
  [
    {
      label: memberCount(role) > 0 ? `In use by ${memberCount(role)}` : 'Delete role',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      disabled: memberCount(role) > 0,
      onSelect: () => { roleToDelete.value = role }
    }
  ]
]

onMounted(refresh)

watch(() => props.organizationId, refresh)
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-stock-400 pb-5">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Roles</h2>
        <p class="text-stock-600 mt-1">What each kind of member is allowed to do here.</p>
      </div>
      <button type="button" class="ink-button" @click="showCreateModal = true">
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        Create role
      </button>
    </header>

    <dl v-if="roles.length > 0" class="docket flex-wrap gap-x-8 gap-y-2 py-3 furniture">
      <div class="docket-field">
        <dt>Roles</dt>
        <dd>{{ roles.length }}</dd>
      </div>
      <div class="docket-field">
        <dt>Held by nobody</dt>
        <dd>{{ unusedRoles }}</dd>
      </div>
    </dl>

    <div v-if="roles.length > 0">
      <UInput
        v-model="searchQuery"
        class="w-full sm:max-w-sm"
        icon="i-lucide-search"
        placeholder="Filter roles"
      />
    </div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading roles</span>
    </div>

    <div v-else-if="loadError" role="alert" class="border border-correct-500 bg-correct-100 p-5">
      <p class="font-medium text-correct-600">The roles could not be loaded</p>
      <p class="text-sm text-stock-800 mt-1">{{ loadError }}</p>
      <button type="button" class="ink-button ink-button--outline mt-4" @click="refresh">Try again</button>
    </div>

    <div v-else-if="roles.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <h3 class="text-lg font-semibold text-stock-950">No roles yet</h3>
      <p class="text-stock-700 mt-2">
        Every member has to be given a role when they are added, so nobody can join this
        organization until at least one exists. Start with an annotator role: no management
        permissions, and members can still annotate the tasks assigned to them.
      </p>
      <button type="button" class="ink-button mt-5" @click="showCreateModal = true">
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        Create role
      </button>
    </div>

    <div v-else-if="filteredRoles.length === 0" class="border border-stock-400 p-8 max-w-2xl">
      <h3 class="text-lg font-semibold text-stock-950">No role matches "{{ searchQuery }}"</h3>
      <p class="text-stock-700 mt-2">This organization has {{ roles.length }} roles.</p>
      <button type="button" class="ink-button ink-button--outline mt-5" @click="searchQuery = ''">
        Clear filter
      </button>
    </div>

    <div v-else class="border border-stock-400 overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-stock-400">
            <th scope="col" class="furniture text-stock-600 text-left px-5 py-3">Role</th>
            <th scope="col" class="furniture text-stock-600 text-left px-5 py-3">Grants</th>
            <th scope="col" class="furniture text-stock-600 text-left px-5 py-3">Held by</th>
            <th scope="col" class="furniture text-stock-600 text-left px-5 py-3">Created</th>
            <th scope="col" class="furniture text-stock-600 text-right px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="role in filteredRoles"
            :key="role.id"
            class="border-b border-stock-400 last:border-b-0 hover:bg-stock-50"
          >
            <td class="px-5 py-4 align-top">
              <div class="font-medium text-stock-950">{{ role.name }}</div>
              <div v-if="role.description" class="text-sm text-stock-600">{{ role.description }}</div>
            </td>
            <td class="px-5 py-4 align-top text-sm text-stock-700 max-w-sm">
              {{ summarisePermissions(role.permissionFlags) }}
            </td>
            <td class="px-5 py-4 align-top text-sm text-stock-950 tabular-nums">
              {{ memberCount(role) }}
            </td>
            <td class="px-5 py-4 align-top text-sm text-stock-600">
              {{ formatDate(role.createdAt) }}
            </td>
            <td class="px-5 py-4 align-top text-right">
              <UDropdownMenu :items="roleActions(role)">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-ellipsis"
                  :aria-label="`Actions for ${role.name}`"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create role -->
    <UModal
      v-model:open="showCreateModal"
      title="Create role"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <OrganizationCreateRoles :org-id="organizationId" @role-created="onRoleCreated" />
      </template>
    </UModal>

    <PermissionFlagsModal :show="!!roleToRead" :role="readRole" @close="roleToRead = null" />

    <!-- Delete role -->
    <UModal
      :open="!!roleToDelete"
      title="Delete role"
      @update:open="(open) => { if (!open) roleToDelete = null }"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-stock-950">
            Delete the role <span class="font-medium">{{ roleToDelete?.name }}</span>?
          </p>
          <p class="text-stock-700">
            Nobody holds it, so no member loses access. It disappears from the role picker
            when adding members, and cannot be recovered — you would have to build it again
            from its permissions.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button type="button" class="ink-button ink-button--outline" @click="roleToDelete = null">Cancel</button>
          <button
            type="button"
            class="ink-button border-correct-600 bg-correct-600 hover:bg-correct-500 hover:border-correct-500"
            :disabled="deleting"
            @click="confirmDelete"
          >
            <UIcon v-if="deleting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ deleting ? 'Deleting' : 'Delete role' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
