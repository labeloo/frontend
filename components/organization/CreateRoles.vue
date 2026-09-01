<script setup lang="ts">
/**
 * Creating one role during setup. The request used to be fired with useFetch,
 * which does not throw on an HTTP error, so a failed create closed the dialog
 * as if it had worked. It reports what happened now, in the form.
 */
import { EMPTY_FLAGS, summarisePermissions, type PermissionFlags } from './permissions'

const props = defineProps<{
  orgId: string | number
}>()

const emit = defineEmits(['role-created'])

const permissionFlags = ref<PermissionFlags>({ ...EMPTY_FLAGS })

const roleState = reactive({
  name: '',
  description: '',
  icon: 'i-lucide-users',
  permissionFlags: permissionFlags.value,
  organizationId: props.orgId
})

const creating = ref(false)
const createError = ref('')

const nameIsEmpty = computed(() => roleState.name.trim().length === 0)

const handleRoleState = (state: PermissionFlags) => {
  permissionFlags.value = { ...state }
  roleState.permissionFlags = permissionFlags.value
}

const errorMessage = (error: any): string => {
  const status = error?.status ?? error?.statusCode
  if (status === 401) return 'Your session has expired. Sign in again and retry.'
  if (status === 403) return 'Your role does not allow creating roles in this organization.'
  if (status === 409) return `A role called "${roleState.name.trim()}" already exists here.`
  if (error?.data?.error) return String(error.data.error)
  if (error?.message?.includes('fetch')) return 'The server could not be reached. Check your connection and retry.'
  return error?.message || 'The role was not created. Try again.'
}

const createRole = async () => {
  createError.value = ''

  if (nameIsEmpty.value) {
    createError.value = 'Give the role a name first — this is how people will pick it.'
    return
  }

  const token = useCookie('auth_token')
  if (!token.value) {
    createError.value = 'Your session has expired. Sign in again and retry.'
    return
  }

  creating.value = true
  try {
    roleState.permissionFlags = { ...permissionFlags.value }
    roleState.organizationId = props.orgId

    await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: roleState
    })

    useToast().add({
      title: `Role "${roleState.name.trim()}" created`,
      description: summarisePermissions(permissionFlags.value),
      color: 'success'
    })

    emit('role-created')
  } catch (error: any) {
    createError.value = errorMessage(error)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <form class="space-y-8" @submit.prevent="createRole">
    <div>
      <h3 class="text-xl font-semibold text-stock-950">New role</h3>
      <p class="text-stock-600 mt-1">
        A role is the answer to "what is this person allowed to do here".
      </p>
    </div>

    <div
      v-if="createError"
      role="alert"
      class="border border-correct-500 bg-correct-100 p-4"
    >
      <p class="font-medium text-correct-600">The role was not created</p>
      <p class="text-sm text-stock-800 mt-1">{{ createError }}</p>
    </div>

    <UFormField label="Role name" name="name" required>
      <UInput v-model="roleState.name" class="w-full" placeholder="Annotator" />
      <template #help>
        <span class="text-stock-600">Members see this name when they are assigned.</span>
      </template>
    </UFormField>

    <UFormField label="Description" name="description" hint="Optional">
      <UInput v-model="roleState.description" class="w-full" placeholder="Labels the tasks assigned to them" />
    </UFormField>

    <section>
      <h4 class="text-base font-semibold text-stock-950">Permissions</h4>
      <p class="text-sm text-stock-600 mt-1 mb-4">
        Currently: {{ summarisePermissions(permissionFlags) }}
      </p>
      <OrganizationManageRoles :initial-state="permissionFlags" @update:state="handleRoleState" />
    </section>

    <div class="flex justify-end gap-3 border-t border-stock-400 pt-6">
      <button type="submit" class="ink-button" :disabled="creating || nameIsEmpty">
        <UIcon v-if="creating" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
        {{ creating ? 'Creating' : 'Create role' }}
      </button>
    </div>
    <p v-if="nameIsEmpty" class="text-sm text-stock-600 text-right -mt-4">
      Enter a role name to enable Create role.
    </p>
  </form>
</template>
