<script setup lang="ts">
interface Props { projectId: string }
const props = defineProps<Props>()

const config = useRuntimeConfig()
const token = useCookie('auth_token')
const api = config.public.apiUrl

type Member = { id: number; email: string; isActive: boolean; role: string; createdAt: number }
type Role = { id: number; name: string }
type OrgUser = { id: number; email: string; role: string }

const members = ref<Member[]>([])
const roles = ref<Role[]>([])
const orgUsers = ref<OrgUser[]>([])
const organizationId = ref<number | null>(null)

const loading = ref(true)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const say = (kind: 'ok' | 'error', text: string) => { notice.value = { kind, text } }

const authHeaders = () => ({ Authorization: `Bearer ${token.value}` })
const projHeaders = () => ({ ...authHeaders(), projectId: String(props.projectId) })

const unwrap = async <T,>(p: Promise<{ data: T }>): Promise<T> => (await p).data

const fmtDate = (t: number) => t ? new Date(t * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// The org's members who are not already on the project - the candidates the
// Add dialog offers. Adding someone who has no place in the organization would
// be a mistake, so the picker is drawn from the org, not from all users.
const candidates = computed(() => {
  const present = new Set(members.value.map((m) => m.id))
  return orgUsers.value.filter((u) => !present.has(u.id))
})

const loadProject = async () => {
  const res = await $fetch<{ data: { projects: { organizationId: number } } }>(`${api}/api/projects/${props.projectId}`, { headers: authHeaders() })
  organizationId.value = res.data?.projects?.organizationId ?? null
}

const loadMembers = async () => {
  members.value = await unwrap($fetch<{ data: Member[] }>(`${api}/api/projectRelations/users`, { headers: projHeaders() }))
}
const loadRoles = async () => {
  roles.value = await unwrap($fetch<{ data: Role[] }>(`${api}/api/projectRoles/all`, { headers: projHeaders() }))
}
const loadOrgUsers = async () => {
  if (!organizationId.value) return
  orgUsers.value = await unwrap($fetch<{ data: OrgUser[] }>(`${api}/api/organizationRelations/users`, {
    headers: { ...authHeaders(), orgId: String(organizationId.value) },
  }))
}

const refresh = async () => {
  try {
    await loadProject()
    await Promise.all([loadMembers(), loadRoles(), loadOrgUsers()])
  } catch (e: any) {
    say('error', e?.data?.error || e?.message || 'Could not load the project members.')
  }
}

// ── add dialog ──────────────────────────────────────────────────────────────
const showAdd = ref(false)
const form = reactive({ userId: 0, roleId: 0 })
const adding = ref(false)

const openAdd = () => {
  form.userId = candidates.value[0]?.id ?? 0
  form.roleId = roles.value[0]?.id ?? 0
  showAdd.value = true
}
const canAdd = computed(() => form.userId > 0 && form.roleId > 0 && !adding.value)

const addMember = async () => {
  if (!canAdd.value) return
  adding.value = true
  try {
    await $fetch(`${api}/api/projectRelations/addUser`, {
      method: 'POST', headers: { ...projHeaders(), 'Content-Type': 'application/json' },
      body: { userId: form.userId, roleId: form.roleId },
    })
    showAdd.value = false
    say('ok', 'Member added to the project.')
    await loadMembers()
  } catch (e: any) {
    say('error', e?.data?.error || 'Could not add the member.')
  } finally { adding.value = false }
}

const busyId = ref<number | null>(null)

const changeRole = async (member: Member, newRoleId: number) => {
  busyId.value = member.id
  try {
    await $fetch(`${api}/api/projectRelations/updateRelation`, {
      method: 'PUT', headers: { ...projHeaders(), 'Content-Type': 'application/json' },
      body: { userId: member.id, newRoleId },
    })
    await loadMembers()
    say('ok', `${member.email}'s role updated.`)
  } catch (e: any) {
    say('error', e?.data?.error || 'Could not change the role.')
  } finally { busyId.value = null }
}

const removeMember = async (member: Member) => {
  busyId.value = member.id
  try {
    await $fetch(`${api}/api/projectRelations/removeUser`, {
      method: 'DELETE', headers: { ...projHeaders(), 'Content-Type': 'application/json' },
      body: { userId: member.id },
    })
    await loadMembers()
    say('ok', `${member.email} removed from the project.`)
  } catch (e: any) {
    say('error', e?.data?.error || 'Could not remove the member.')
  } finally { busyId.value = null }
}

const roleIdByName = (name: string) => roles.value.find((r) => r.name === name)?.id ?? 0

onMounted(async () => { await refresh(); loading.value = false })
watch(() => props.projectId, async () => { loading.value = true; await refresh(); loading.value = false })
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-stock-400 pb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Members</h2>
        <p class="text-stock-600 mt-1">Who works on this project, and what each of them may do.</p>
      </div>
      <button type="button" class="ink-button" :disabled="candidates.length === 0" @click="openAdd">Add member</button>
    </header>

    <div v-if="notice" :class="['border p-3 text-[13px]', notice.kind === 'ok' ? 'border-stock-400 text-stock-800' : 'border-correct-500 bg-correct-100 text-correct-700']">
      {{ notice.text }}
    </div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading members</span>
    </div>

    <template v-else>
      <p v-if="members.length === 0" class="text-[13px] text-stock-600">
        No one is on this project yet. Add a member from your organization.
      </p>
      <table v-else class="w-full text-[13px]">
        <thead>
          <tr class="furniture text-stock-500 text-left border-b border-stock-400">
            <th class="py-2 pr-4 font-medium">Member</th>
            <th class="py-2 pr-4 font-medium">Role</th>
            <th class="py-2 pr-4 font-medium">Status</th>
            <th class="py-2 pr-4 font-medium">Added</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id" class="border-b border-stock-300">
            <td class="py-2 pr-4 text-stock-950">{{ m.email }}</td>
            <td class="py-2 pr-4">
              <select
                :value="roleIdByName(m.role)"
                class="control border border-stock-400 px-2 py-1"
                :disabled="busyId === m.id || roles.length === 0"
                @change="changeRole(m, Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </td>
            <td class="py-2 pr-4">
              <span :class="m.isActive ? 'text-ink-g furniture' : 'text-stock-500 furniture'">
                {{ m.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="py-2 pr-4 text-stock-600">{{ fmtDate(m.createdAt) }}</td>
            <td class="py-2 text-right">
              <button type="button" class="ink-button ink-button--outline" :disabled="busyId === m.id" @click="removeMember(m)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Add dialog -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-stock-950/40 p-4" @click.self="showAdd = false">
      <div class="bg-white border border-stock-500 w-full max-w-md p-6 space-y-5">
        <div>
          <h3 class="text-xl font-semibold text-stock-950">Add a member</h3>
          <p class="text-[13px] text-stock-600 mt-1">Choose someone from your organization and the role they take here.</p>
        </div>

        <label class="block space-y-1">
          <span class="furniture text-stock-600">Person</span>
          <select v-model.number="form.userId" class="control w-full border border-stock-400 px-2 py-1.5">
            <option v-for="u in candidates" :key="u.id" :value="u.id">{{ u.email }}</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="furniture text-stock-600">Role</span>
          <select v-model.number="form.roleId" class="control w-full border border-stock-400 px-2 py-1.5">
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="ink-button ink-button--outline" @click="showAdd = false">Cancel</button>
          <button type="button" class="ink-button" :disabled="!canAdd" @click="addMember">{{ adding ? 'Adding…' : 'Add member' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
