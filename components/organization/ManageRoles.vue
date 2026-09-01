<script setup lang="ts">
/**
 * The permission editor for one role.
 *
 * Turning "full administrator" on used to silently leave every other flag on
 * when it was turned back off, so a role that read as restricted could still
 * delete the organization. The switches a reader can see now always match the
 * flags that will be saved: admin hides the list because it covers all of it,
 * and switching admin back off restores exactly what was set before.
 */
import {
  ADMIN_PERMISSION,
  EMPTY_FLAGS,
  PERMISSION_GROUPS,
  ANNOTATION_NOTE,
  ROLE_TEMPLATES,
  type PermissionFlags,
  type PermissionKey
} from './permissions'

const props = defineProps<{
  initialState?: PermissionFlags
}>()

const emit = defineEmits(['update:state'])

const state = reactive<PermissionFlags>({ ...EMPTY_FLAGS })

// What the non-admin switches read as before admin was switched on, so that
// switching it off puts the role back where the reader left it.
const beforeAdmin = ref<PermissionFlags | null>(null)

const nonAdminKeys = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key))

watch(() => props.initialState, (incoming) => {
  if (!incoming) return
  for (const key of Object.keys(state) as PermissionKey[]) {
    if (key in incoming) state[key] = incoming[key]
  }
}, { immediate: true, deep: true })

watch(state, (newState) => {
  emit('update:state', { ...newState })
}, { deep: true })

const onAdminToggle = (value: boolean) => {
  if (value) {
    beforeAdmin.value = { ...state }
    for (const key of nonAdminKeys) state[key] = true
    state.admin = true
    return
  }

  state.admin = false
  const restore = beforeAdmin.value
  for (const key of nonAdminKeys) state[key] = restore ? restore[key] : false
  beforeAdmin.value = null
}

const applyTemplate = (flags: PermissionFlags) => {
  beforeAdmin.value = null
  for (const key of Object.keys(state) as PermissionKey[]) state[key] = flags[key]
}
</script>

<template>
  <div class="max-h-[70vh] overflow-y-auto pr-1">
    <section>
      <h4 class="furniture text-stock-600 border-b border-stock-400 pb-2">Start from</h4>
      <div class="flex flex-wrap gap-2 mt-3">
        <button
          v-for="template in ROLE_TEMPLATES"
          :key="template.name"
          type="button"
          class="ink-button ink-button--outline"
          :title="template.summary"
          @click="applyTemplate(template.flags)"
        >
          {{ template.name }}
        </button>
      </div>
      <p class="text-sm text-stock-600 mt-2">
        A starting point, not a lock — every switch below stays editable.
      </p>
    </section>

    <section class="mt-8">
      <div class="flex items-start justify-between gap-6 border-y border-stock-400 py-4">
        <div>
          <div class="font-medium text-stock-950">{{ ADMIN_PERMISSION.label }}</div>
          <p class="text-sm text-stock-600 mt-0.5">{{ ADMIN_PERMISSION.detail }}</p>
        </div>
        <USwitch
          :model-value="state.admin"
          :aria-label="ADMIN_PERMISSION.label"
          class="mt-1 shrink-0"
          @update:model-value="onAdminToggle"
        />
      </div>

      <p v-if="state.admin" class="text-sm text-stock-700 mt-4 border border-stock-400 p-4">
        This role covers every permission there is, so there is nothing left to choose.
        Switch it off to set permissions one by one — the ones you had picked come back.
      </p>

      <div v-else class="mt-6 space-y-8">
        <div v-for="group in PERMISSION_GROUPS" :key="group.title">
          <h4 class="furniture text-stock-600 border-b border-stock-400 pb-2">{{ group.title }}</h4>
          <p class="text-sm text-stock-600 mt-2">{{ group.note }}</p>

          <div class="mt-2 divide-y divide-stock-400">
            <div
              v-for="item in group.items"
              :key="item.key"
              class="flex items-start justify-between gap-6 py-3"
            >
              <div>
                <div class="text-stock-950">{{ item.label }}</div>
                <p class="text-sm text-stock-600 mt-0.5">{{ item.detail }}</p>
              </div>
              <USwitch v-model="state[item.key]" :aria-label="item.label" class="mt-1 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <p class="text-sm text-stock-600 mt-8 border-t border-stock-400 pt-4">{{ ANNOTATION_NOTE }}</p>
  </div>
</template>
