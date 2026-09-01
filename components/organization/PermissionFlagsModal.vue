<script setup lang="ts">
/**
 * Reads out one role: what it grants, and — quietly, underneath — what it does
 * not. Withheld permissions are not errors, so they never print in correction
 * red; they are set in the secondary ink under their own heading.
 */
import { ALL_PERMISSIONS, ANNOTATION_NOTE, permissionLabel } from './permissions'

interface RoleWithPermissions {
  name?: string
  roleName?: string
  description?: string
  permissionFlags: Record<string, boolean>
  memberCount?: number
}

const props = defineProps<{
  show: boolean
  role: RoleWithPermissions | null
}>()

const emit = defineEmits(['close'])

const roleName = computed(() => {
  if (!props.role) return 'Role'
  return typeof props.role.name === 'string'
    ? props.role.name
    : (typeof props.role.roleName === 'string' ? props.role.roleName : 'Role')
})

const flags = computed<Record<string, boolean>>(() => props.role?.permissionFlags ?? {})
const isAdmin = computed(() => flags.value.admin === true)

const granted = computed(() =>
  ALL_PERMISSIONS.filter(p => flags.value[p.key] === true)
)

const withheld = computed(() =>
  ALL_PERMISSIONS.filter(p => flags.value[p.key] !== true)
)

const knownKeys = new Set(ALL_PERMISSIONS.map(p => p.key as string))
const unknownGranted = computed(() =>
  Object.keys(flags.value).filter(k => !knownKeys.has(k) && flags.value[k] === true)
)

const onOpenChange = (open: boolean) => {
  if (!open) emit('close')
}
</script>

<template>
  <UModal
    :open="show && !!role"
    :title="`${roleName} — permissions`"
    :ui="{ content: 'max-w-xl' }"
    @update:open="onOpenChange"
  >
    <template #body>
      <div class="space-y-8">
        <p v-if="role?.description" class="text-stock-700">{{ role.description }}</p>

        <div v-if="typeof role?.memberCount === 'number'" class="docket-field furniture">
          <dt>Held by</dt>
          <dd>{{ role.memberCount }} {{ role.memberCount === 1 ? 'member' : 'members' }}</dd>
        </div>

        <section>
          <h4 class="furniture text-stock-600 border-b border-stock-400 pb-2">This role can</h4>

          <p v-if="isAdmin" class="mt-4 text-stock-950">
            Everything. A full administrator can edit and delete the organization, its members,
            its roles and every project in it.
          </p>

          <ul v-else-if="granted.length" class="mt-4 divide-y divide-stock-400">
            <li v-for="p in granted" :key="p.key" class="py-3">
              <div class="text-stock-950 font-medium">{{ p.label }}</div>
              <div class="text-sm text-stock-600">{{ p.detail }}</div>
            </li>
          </ul>

          <p v-else class="mt-4 text-stock-700">
            Nothing in the management model. This is a working role, not a managing one.
          </p>

          <ul v-if="unknownGranted.length" class="mt-3 space-y-1">
            <li v-for="key in unknownGranted" :key="key" class="text-sm text-stock-700">
              {{ permissionLabel(key) }}
            </li>
          </ul>
        </section>

        <section v-if="!isAdmin && withheld.length">
          <h4 class="furniture text-stock-600 border-b border-stock-400 pb-2">Not in this role</h4>
          <p class="mt-3 text-sm text-stock-600">
            {{ withheld.map(p => p.label).join(' · ') }}
          </p>
        </section>

        <p class="text-sm text-stock-600 border-t border-stock-400 pt-4">{{ ANNOTATION_NOTE }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <button type="button" class="ink-button ink-button--outline" @click="emit('close')">Close</button>
      </div>
    </template>
  </UModal>
</template>
