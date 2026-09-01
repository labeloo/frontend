<script setup lang="ts">
/**
 * The roles that exist in an organization, read as a sheet of facts rather
 * than a card grid. Used inside the setup wizard, where the reader needs to
 * see what a role actually grants before handing it to anyone.
 */
import PermissionFlagsModal from './PermissionFlagsModal.vue'
import { summarisePermissions } from './permissions'

interface Role {
  id?: number
  name: string
  description: string
  permissionFlags: Record<string, boolean>
  createdAt?: number
}

const props = defineProps<{
  orgId: string | number
  refreshKey?: number
}>()

const rolesData = ref<Role[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const isModalOpen = ref(false)
const selectedRole = ref<Role | null>(null)

const token = useCookie('auth_token')

const fetchRoles = async () => {
  if (!props.orgId) return
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<{ data: Role[] }>(
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
    rolesData.value = res.data ?? []
  } catch (error: any) {
    rolesData.value = []
    loadError.value = error?.data?.error || error?.message || 'The roles could not be loaded.'
  } finally {
    loading.value = false
  }
}

const showPermissionFlags = (role: Role) => {
  selectedRole.value = {
    name: role.name,
    description: role.description || '',
    permissionFlags: (role.permissionFlags || {}) as Record<string, boolean>
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedRole.value = null
}

watch(() => props.orgId, (newOrgId, oldOrgId) => {
  if (newOrgId && newOrgId !== oldOrgId) fetchRoles()
})

watch(() => props.refreshKey, () => fetchRoles())

onMounted(fetchRoles)

defineExpose({ refresh: fetchRoles })
</script>

<template>
  <div class="border border-stock-400">
    <div v-if="loading" class="flex items-center gap-3 px-4 py-8 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading roles</span>
    </div>

    <div v-else-if="loadError" class="px-4 py-6">
      <p class="text-correct-600 font-medium">Roles could not be loaded</p>
      <p class="text-sm text-stock-700 mt-1">{{ loadError }}</p>
      <button type="button" class="ink-button ink-button--outline mt-4" @click="fetchRoles">Try again</button>
    </div>

    <div v-else-if="rolesData.length === 0" class="px-4 py-8">
      <p class="text-stock-950 font-medium">No roles yet</p>
      <p class="text-sm text-stock-700 mt-1 max-w-prose">
        A role decides what a member may do. Create at least one before adding people —
        every member has to be given a role when they are added.
      </p>
    </div>

    <table v-else class="min-w-full">
      <thead>
        <tr class="border-b border-stock-400">
          <th scope="col" class="furniture text-stock-600 text-left px-4 py-3">Role</th>
          <th scope="col" class="furniture text-stock-600 text-left px-4 py-3">Grants</th>
          <th scope="col" class="furniture text-stock-600 text-right px-4 py-3">Detail</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="role in rolesData"
          :key="role.id ?? role.name"
          class="border-b border-stock-400 last:border-b-0 hover:bg-stock-50"
        >
          <td class="px-4 py-3 align-top">
            <div class="font-medium text-stock-950">{{ role.name }}</div>
            <div v-if="role.description" class="text-sm text-stock-600">{{ role.description }}</div>
          </td>
          <td class="px-4 py-3 align-top text-sm text-stock-700 max-w-md">
            {{ summarisePermissions(role.permissionFlags) }}
          </td>
          <td class="px-4 py-3 align-top text-right">
            <button type="button" class="ink-button ink-button--outline" @click="showPermissionFlags(role)">
              Read permissions
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <PermissionFlagsModal :show="isModalOpen" :role="selectedRole" @close="closeModal" />
  </div>
</template>
