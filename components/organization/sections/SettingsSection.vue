<script setup lang="ts">
/**
 * Organization settings.
 *
 * Three things were quietly wrong here.
 *
 * Clearing the description looked like it worked — the empty string was
 * stripped out of the PUT body before it was sent, and the screen said
 * "saved". It is sent now, so clearing means clearing.
 *
 * The SAM 2 connection could be deleted in one unconfirmed click while the
 * switch that would have merely paused it never rendered at all, because
 * UToggle does not exist in this version of the component library. Disabling
 * is the near action now; removing asks first and says what stops working.
 *
 * The connection test forced a missing protocol to https and overwrote what
 * the reader had typed, which made the ordinary `localhost:8000` install
 * impossible to save. The test is advice now, not a gate, it leaves the field
 * alone, and it says out loud that it ran from this browser rather than from
 * the server that will actually call SAM 2.
 */

interface Organization {
  organizations: {
    id: number
    ownerId: number
    name: string
    logo: string
    description: string
    isActiveOrg: boolean
    createdAt: number
    updatedAt: number
  }
  organization_relations: {
    id: number
    userId: number
    organizationId: number
    roleId: number
    createdAt: number
    updatedAt: number
  }
}

interface Props {
  organization: Organization | null
}

interface BackendType {
  id: string
  name: string
  isActive: boolean
}

interface BackendConnection {
  id: number
  organizationId: number
  backendId: string
  backendTypeName: string
  baseUrl: string
  apiKey?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const token = useCookie('auth_token')

const activeSection = ref<'general' | 'connections' | 'danger'>('general')

const settingSections = [
  { key: 'general' as const, label: 'General', icon: 'i-lucide-building-2' },
  { key: 'connections' as const, label: 'Connections', icon: 'i-lucide-plug' },
  { key: 'danger' as const, label: 'Danger zone', icon: 'i-lucide-triangle-alert' }
]

/* ── General ─────────────────────────────────────────────────────────────── */

const formData = ref({ name: '', description: '', logo: '' })
const saving = ref(false)
const saved = ref(false)

const logoUploading = ref(false)
const logoError = ref('')

watch(() => props.organization, (newOrg) => {
  if (newOrg?.organizations) {
    const org = newOrg.organizations
    formData.value = {
      name: org.name,
      description: org.description || '',
      logo: org.logo || ''
    }
  }
}, { immediate: true })

const isGeneralFormValid = computed(() => formData.value.name.trim().length > 0)

const hasUnsavedChanges = computed(() => {
  const org = props.organization?.organizations
  if (!org) return false
  return (
    formData.value.name !== org.name ||
    formData.value.description !== (org.description || '') ||
    formData.value.logo !== (org.logo || '')
  )
})

const resetForm = () => {
  const org = props.organization?.organizations
  if (!org) return
  formData.value = {
    name: org.name,
    description: org.description || '',
    logo: org.logo || ''
  }
}

const describeError = (err: any, fallback: string) => {
  const status = err?.status ?? err?.statusCode
  if (status === 401) return 'Your session has expired. Sign in again and retry.'
  if (status === 403) return 'Your role does not allow changing this organization.'
  return err?.data?.error || err?.message || fallback
}

const uploadLogo = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  logoError.value = ''

  if (!file.type.startsWith('image/')) {
    logoError.value = 'That is not an image file. Choose a JPG or PNG.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    logoError.value = `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`
    return
  }

  logoUploading.value = true
  try {
    const arrayBuffer = await file.arrayBuffer()
    const response = await $fetch<{ url?: string }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/bucket/uploadPicture',
      {
        method: 'POST',
        headers: {
          type: 'organization',
          'Content-Type': file.type,
          Authorization: `Bearer ${token.value}`
        },
        body: arrayBuffer
      }
    )

    if (!response?.url) throw new Error('The upload service did not return an address for the image.')
    formData.value.logo = response.url
  } catch (err: any) {
    logoError.value = describeError(err, 'The logo was not uploaded. Try again.')
  } finally {
    logoUploading.value = false
    target.value = ''
  }
}

const saveGeneralSettings = async () => {
  const org = props.organization?.organizations
  if (!org) return

  saving.value = true
  saved.value = false

  try {
    if (!formData.value.name.trim()) throw new Error('The organization needs a name.')

    // An empty description and an empty logo are deliberate acts, so they are
    // sent as empty strings rather than dropped from the body.
    const response = await $fetch<any>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${org.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: {
          name: formData.value.name.trim(),
          logo: formData.value.logo,
          description: formData.value.description.trim()
        }
      }
    )

    // The route answers with the updated row; trust it over the request.
    const returned = response?.data ?? response
    if (!returned || typeof returned !== 'object') {
      throw new Error('The server did not confirm the change. Reload to see what was stored.')
    }

    saved.value = true
    emit('refresh')

    toast.add({
      title: 'Settings saved',
      description: `"${returned.name ?? formData.value.name.trim()}" has been updated.`,
      color: 'success'
    })

    setTimeout(() => { saved.value = false }, 2500)
  } catch (err: any) {
    toast.add({
      title: 'Nothing was saved',
      description: describeError(err, 'The organization was not updated. Your edits are still on screen.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

/* ── Connections ─────────────────────────────────────────────────────────── */

const backendTypes = ref<BackendType[]>([])
const backendConnections = ref<BackendConnection[]>([])
const connectionsLoading = ref(true)

const configuring = ref<{ backendId: string; name: string; existing: BackendConnection | null } | null>(null)
const draft = ref({ endpoint: '', apiKey: '' })
const savingConnection = ref(false)

const testingConnection = ref(false)
const testResult = ref<{ ok: boolean; title: string; detail: string } | null>(null)

// The API stores no verification state, so what a test proved is only known
// for this session. Saying "untested" is more honest than a stale green tick.
const reachability = ref<Record<string, 'reachable' | 'unreachable' | 'untested'>>({})

const connectionToRemove = ref<BackendConnection | null>(null)
const removingConnection = ref(false)

const orgIdHeader = computed(() => props.organization?.organizations?.id?.toString() || '')

const connectionFor = (backendId: string) =>
  backendConnections.value.find(c => c.backendId === backendId)

const fetchBackendTypes = async () => {
  try {
    const response = await $fetch<{ data: BackendType[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations/types',
      { headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value } }
    )
    backendTypes.value = response.data ?? []
  } catch {
    backendTypes.value = []
  }
}

const fetchBackendConnections = async () => {
  connectionsLoading.value = true
  try {
    const response = await $fetch<{ data: BackendConnection[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations',
      { headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value } }
    )
    backendConnections.value = response.data ?? []
  } catch {
    backendConnections.value = []
  } finally {
    connectionsLoading.value = false
  }
}

const openConfig = (backendId: string, name: string) => {
  const existing = connectionFor(backendId) ?? null
  configuring.value = { backendId, name, existing }
  draft.value = {
    endpoint: existing?.baseUrl ?? '',
    apiKey: existing?.apiKey ?? ''
  }
  testResult.value = null
}

const closeConfig = () => {
  configuring.value = null
  testResult.value = null
}

/** What the reader typed, tidied only of surrounding space and a trailing slash. */
const normalisedEndpoint = computed(() => {
  let value = draft.value.endpoint.trim()
  while (value.endsWith('/')) value = value.slice(0, -1)
  return value
})

const endpointCandidates = computed(() => {
  const value = normalisedEndpoint.value
  if (!value) return []
  if (value.startsWith('http://') || value.startsWith('https://')) return [value]
  // No protocol given: a SAM 2 service on this machine is plain http far more
  // often than not, so try both rather than forcing https and failing.
  return [`http://${value}`, `https://${value}`]
})

const testConnection = async () => {
  const candidates = endpointCandidates.value
  if (candidates.length === 0) return

  testingConnection.value = true
  testResult.value = null

  let lastFailure: { title: string; detail: string } | null = null

  for (const candidate of candidates) {
    try {
      const response = await $fetch<{ success?: boolean; name?: string }>(`${candidate}/health`, {
        method: 'GET',
        timeout: 5000
      })

      if (response?.success === false) throw new Error('unhealthy')

      testResult.value = {
        ok: true,
        title: `Your browser reached ${candidate}`,
        detail: response?.name
          ? `The service identified itself as "${response.name}". Note this test ran from this browser — annotation calls are made by the Labeloo server, which may reach a different set of addresses.`
          : 'Note this test ran from this browser — annotation calls are made by the Labeloo server, which may reach a different set of addresses.'
      }
      if (configuring.value) reachability.value[configuring.value.backendId] = 'reachable'
      testingConnection.value = false
      return
    } catch (error: any) {
      const status = error?.status ?? error?.statusCode
      const message = String(error?.message ?? '')

      if (status === 404) {
        lastFailure = {
          title: `${candidate} answered, but has no /health`,
          detail: 'Something is running at that address, but it does not look like a SAM 2 service. Check the address and the port.'
        }
      } else if (status) {
        lastFailure = {
          title: `${candidate} answered ${status}`,
          detail: 'The service is reachable but refused the health check. If it needs an API key, enter it and try again.'
        }
      } else if (message.includes('abort') || message.includes('timeout')) {
        lastFailure = {
          title: `No answer from ${candidate} within 5 seconds`,
          detail: 'The service may be starting up, loading a model, or not running at all.'
        }
      } else {
        lastFailure = {
          title: `Your browser could not reach ${candidate}`,
          detail: 'Either nothing is listening there, or the service is running but does not allow requests from this page (CORS). You can still save the address — the Labeloo server may be able to reach it even when this browser cannot.'
        }
      }
    }
  }

  testResult.value = { ok: false, title: lastFailure!.title, detail: lastFailure!.detail }
  if (configuring.value) reachability.value[configuring.value.backendId] = 'unreachable'
  testingConnection.value = false
}

const saveConnection = async () => {
  const target = configuring.value
  if (!target || !normalisedEndpoint.value) return

  const baseUrl = endpointCandidates.value[0]!

  savingConnection.value = true
  try {
    if (target.existing) {
      await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${target.existing.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value },
        body: { baseUrl, apiKey: draft.value.apiKey, isActive: true }
      })
    } else {
      await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value },
        body: {
          backendId: target.backendId,
          baseUrl,
          apiKey: draft.value.apiKey,
          isActive: true
        }
      })
    }

    await fetchBackendConnections()
    closeConfig()

    toast.add({
      title: `${target.name} connection saved`,
      description: testResult.value?.ok
        ? 'Assisted labelling is available to everyone in this organization.'
        : 'Saved without a passing test. If the magic stick fails, come back and test the address.',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'The connection was not saved',
      description: describeError(err, 'Nothing changed. The address is still on screen.'),
      color: 'error'
    })
  } finally {
    savingConnection.value = false
  }
}

const toggleConnection = async (conn: BackendConnection, value: boolean) => {
  const previous = conn.isActive
  conn.isActive = value
  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${conn.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value },
      body: { isActive: value }
    })
    toast.add({
      title: value ? `${conn.backendTypeName} switched on` : `${conn.backendTypeName} switched off`,
      description: value
        ? 'The magic stick and video tracking work again.'
        : 'The magic stick and video tracking stop for everyone here. The address and key are kept.',
      color: value ? 'success' : 'warning'
    })
  } catch (err: any) {
    conn.isActive = previous
    toast.add({
      title: 'The switch did not take',
      description: describeError(err, 'The connection is unchanged.'),
      color: 'error'
    })
  }
}

const confirmRemoveConnection = async () => {
  const conn = connectionToRemove.value
  if (!conn) return

  removingConnection.value = true
  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/backendRelations/${conn.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}`, orgId: orgIdHeader.value }
    })
    connectionToRemove.value = null
    await fetchBackendConnections()
    toast.add({
      title: 'Connection removed',
      description: 'The address and API key are gone. Assisted labelling is off until a new one is added.',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'The connection was not removed',
      description: describeError(err, 'It is still in place.'),
      color: 'error'
    })
  } finally {
    removingConnection.value = false
  }
}

/* ── Danger zone ─────────────────────────────────────────────────────────── */

const showDeleteConfirm = ref(false)
const deleteConfirmation = ref('')
const deleting = ref(false)
const contents = ref<{ projects: number | null; members: number | null }>({ projects: null, members: null })

const organizationName = computed(() => props.organization?.organizations?.name ?? '')

// Character for character: the instruction says "exact", so the check is exact.
const isDeleteConfirmationValid = computed(() =>
  deleteConfirmation.value.trim() === organizationName.value.trim() && organizationName.value.length > 0
)

const fetchContents = async () => {
  if (!orgIdHeader.value) return
  const headers = {
    Authorization: `Bearer ${token.value}`,
    'Content-Type': 'application/json',
    orgId: orgIdHeader.value
  }
  try {
    const projects = await $fetch<{ data: any[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/projects/all',
      { headers }
    )
    contents.value.projects = (projects.data ?? []).filter(
      (p: any) => String(p.organizationId) === orgIdHeader.value
    ).length
  } catch {
    contents.value.projects = null
  }
  try {
    const members = await $fetch<{ data: any[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
      { method: 'GET', headers }
    )
    contents.value.members = (members.data ?? []).length
  } catch {
    contents.value.members = null
  }
}

const deleteOrganization = async () => {
  const org = props.organization?.organizations
  if (!org) return

  deleting.value = true
  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${org.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      }
    })

    toast.add({
      title: `"${org.name}" deleted`,
      description: 'The organization and everything inside it are gone.',
      color: 'success'
    })

    showDeleteConfirm.value = false
    deleteConfirmation.value = ''
    await navigateTo('/homepage')
  } catch (err: any) {
    toast.add({
      title: 'The organization was not deleted',
      description: describeError(err, 'Nothing was removed.'),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

/* ── Lifecycle ───────────────────────────────────────────────────────────── */

onMounted(() => {
  fetchBackendTypes()
  fetchBackendConnections()
  fetchContents()

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))
})

watch(() => props.organization?.organizations?.id, (id) => {
  if (!id) return
  fetchBackendTypes()
  fetchBackendConnections()
  fetchContents()
})
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-stock-400 pb-5">
      <h2 class="text-2xl font-semibold text-stock-950">Settings</h2>
      <p class="text-stock-600 mt-1">The organization's own details, its model connection, and its removal.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Section list -->
      <nav class="lg:col-span-1 flex lg:flex-col gap-1 flex-wrap" aria-label="Settings sections">
        <button
          v-for="section in settingSections"
          :key="section.key"
          type="button"
          class="flex items-center gap-3 px-3 py-2 text-sm text-left border-l-2 transition-colors"
          :class="activeSection === section.key
            ? 'border-stock-950 text-stock-950 bg-stock-200'
            : 'border-transparent text-stock-600 hover:text-stock-950 hover:bg-stock-50'"
          @click="activeSection = section.key"
        >
          <UIcon :name="section.icon" class="w-4 h-4 shrink-0" />
          {{ section.label }}
          <span
            v-if="section.key === 'general' && hasUnsavedChanges"
            class="furniture text-stock-600 ml-auto"
          >Unsaved</span>
        </button>
      </nav>

      <div class="lg:col-span-3">
        <!-- ── General ───────────────────────────────────────────────── -->
        <section v-if="activeSection === 'general'">
          <div v-if="!props.organization" class="flex items-center gap-3 py-12 text-stock-600">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span class="furniture">Reading organization</span>
          </div>

          <form v-else class="space-y-10 max-w-2xl" @submit.prevent="saveGeneralSettings">
            <!-- Name -->
            <div>
              <label for="organization-name" class="block font-medium text-stock-950">
                Organization name
              </label>
              <p class="text-sm text-stock-600 mt-1">
                Appears in project headers and wherever this organization is listed.
              </p>
              <UInput
                id="organization-name"
                v-model="formData.name"
                class="w-full mt-3"
                size="lg"
                placeholder="Acme Labelling"
              />
              <p v-if="!isGeneralFormValid" class="text-sm text-correct-600 mt-2">
                A name is required — saving is disabled until there is one.
              </p>
            </div>

            <!-- Description -->
            <div>
              <label for="organization-description" class="block font-medium text-stock-950">
                Description
              </label>
              <p class="text-sm text-stock-600 mt-1">
                Optional. Clearing it and saving removes it for good.
              </p>
              <UTextarea
                id="organization-description"
                v-model="formData.description"
                class="w-full mt-3"
                :rows="4"
                maxlength="500"
                placeholder="What this organization labels, and for whom."
              />
              <p class="furniture text-stock-600 mt-2 text-right">
                {{ formData.description.length }}/500
              </p>
            </div>

            <!-- Logo -->
            <div>
              <span class="block font-medium text-stock-950">Logo</span>
              <p class="text-sm text-stock-600 mt-1">Optional. JPG or PNG, up to 5 MB.</p>

              <div class="flex items-start gap-4 mt-3">
                <img
                  v-if="formData.logo"
                  :src="formData.logo"
                  alt="Organization logo"
                  class="w-16 h-16 object-cover border border-stock-400 shrink-0"
                >
                <div
                  v-else
                  class="w-16 h-16 border border-stock-400 flex items-center justify-center shrink-0"
                >
                  <UIcon name="i-lucide-image" class="w-6 h-6 text-stock-500" />
                </div>

                <div class="space-y-2">
                  <input
                    id="organization-logo"
                    type="file"
                    accept="image/*"
                    class="block text-sm text-stock-700 file:mr-3 file:border file:border-stock-400 file:bg-stock-50 file:px-3 file:py-1.5 file:text-stock-950 file:font-mono file:text-[10.5px] file:uppercase file:tracking-[0.14em]"
                    :disabled="logoUploading"
                    @change="uploadLogo"
                  >
                  <p v-if="logoUploading" class="flex items-center gap-2 text-sm text-stock-600">
                    <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
                    Uploading
                  </p>
                  <p v-if="logoError" class="text-sm text-correct-600">{{ logoError }}</p>
                  <button
                    v-if="formData.logo && !logoUploading"
                    type="button"
                    class="ink-button ink-button--outline"
                    @click="formData.logo = ''"
                  >
                    Remove logo
                  </button>
                </div>
              </div>
            </div>

            <!-- Save -->
            <div class="border-t border-stock-400 pt-6 flex flex-wrap items-center justify-between gap-4">
              <p class="text-sm text-stock-600">
                <template v-if="saved">Saved.</template>
                <template v-else-if="hasUnsavedChanges">Unsaved changes.</template>
                <template v-else>Nothing changed.</template>
              </p>
              <div class="flex gap-3">
                <button
                  v-if="hasUnsavedChanges"
                  type="button"
                  class="ink-button ink-button--outline"
                  :disabled="saving"
                  @click="resetForm"
                >
                  Discard changes
                </button>
                <button
                  type="submit"
                  class="ink-button"
                  :disabled="saving || !isGeneralFormValid || !hasUnsavedChanges"
                >
                  <UIcon v-if="saving" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
                  {{ saving ? 'Saving' : 'Save changes' }}
                </button>
              </div>
            </div>
          </form>
        </section>

        <!-- ── Connections ───────────────────────────────────────────── -->
        <section v-else-if="activeSection === 'connections'" class="max-w-3xl">
          <h3 class="text-lg font-semibold text-stock-950">Model connections</h3>
          <p class="text-stock-700 mt-1 max-w-prose">
            SAM 2 runs as a separate service, addressed per organization. Without it the magic
            stick and video tracking fail for everyone here and every shape has to be drawn by hand.
          </p>

          <div v-if="connectionsLoading" class="flex items-center gap-3 py-10 text-stock-600">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span class="furniture">Reading connections</span>
          </div>

          <div v-else class="mt-6 border border-stock-400">
            <ul class="divide-y divide-stock-400">
              <li v-for="type in backendTypes" :key="type.id" class="p-5">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-[14rem]">
                    <h4 class="font-medium text-stock-950">{{ type.name }}</h4>
                    <p v-if="connectionFor(type.id)" class="text-sm text-stock-600 mt-1 font-mono break-all">
                      {{ connectionFor(type.id)?.baseUrl }}
                    </p>
                    <p v-else class="text-sm text-stock-600 mt-1">Not connected.</p>
                    <dl v-if="connectionFor(type.id)" class="flex flex-wrap gap-x-6 gap-y-1 furniture mt-2">
                      <div class="docket-field">
                        <dt>State</dt>
                        <dd>{{ connectionFor(type.id)?.isActive ? 'On' : 'Off' }}</dd>
                      </div>
                      <div class="docket-field">
                        <dt>Last test</dt>
                        <dd>
                          {{ reachability[type.id] === 'reachable' ? 'Reached from this browser'
                            : reachability[type.id] === 'unreachable' ? 'Not reached from this browser'
                            : 'Not tested here' }}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div class="flex items-center gap-3">
                    <USwitch
                      v-if="connectionFor(type.id)"
                      :model-value="!!connectionFor(type.id)?.isActive"
                      :aria-label="`${type.name} enabled`"
                      @update:model-value="(value) => toggleConnection(connectionFor(type.id), value)"
                    />
                    <button type="button" class="ink-button ink-button--outline" @click="openConfig(type.id, type.name)">
                      {{ connectionFor(type.id) ? 'Edit address' : 'Connect' }}
                    </button>
                    <button
                      v-if="connectionFor(type.id)"
                      type="button"
                      class="ink-button ink-button--outline text-correct-600 border-correct-500 hover:bg-correct-600 hover:border-correct-600"
                      @click="connectionToRemove = connectionFor(type.id) ?? null"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>

              <li v-if="backendTypes.length === 0" class="p-8 text-center">
                <p class="text-stock-950 font-medium">No connection types available</p>
                <p class="text-sm text-stock-700 mt-1">
                  The Labeloo server did not list any model backends. It may be unreachable — reload the page.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <!-- ── Danger zone ───────────────────────────────────────────── -->
        <section v-else-if="activeSection === 'danger'" class="max-w-2xl">
          <div v-if="!props.organization" class="flex items-center gap-3 py-12 text-stock-600">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span class="furniture">Reading organization</span>
          </div>

          <template v-else>
            <h3 class="text-lg font-semibold text-correct-600">Delete this organization</h3>
            <p class="text-stock-700 mt-2">
              Deleting "{{ organizationName }}" removes it and everything inside it. This cannot be undone.
            </p>

            <dl class="docket flex-wrap gap-x-8 gap-y-2 py-3 mt-4 furniture">
              <div class="docket-field">
                <dt>Projects lost</dt>
                <dd>{{ contents.projects ?? '—' }}</dd>
              </div>
              <div class="docket-field">
                <dt>Members lose access</dt>
                <dd>{{ contents.members ?? '—' }}</dd>
              </div>
              <div class="docket-field">
                <dt>Tasks and annotations</dt>
                <dd>All</dd>
              </div>
            </dl>
            <p v-if="contents.projects === null" class="text-sm text-stock-600 mt-2">
              The project count could not be read, so the figures above are incomplete.
            </p>

            <div v-if="!showDeleteConfirm" class="mt-6">
              <button
                type="button"
                class="ink-button ink-button--outline text-correct-600 border-correct-500 hover:bg-correct-600 hover:border-correct-600"
                @click="showDeleteConfirm = true"
              >
                Delete organization
              </button>
            </div>

            <div v-else class="mt-6 border border-correct-500 p-5 space-y-4">
              <label for="delete-confirmation" class="block text-stock-950">
                Type <span class="font-mono">{{ organizationName }}</span> to confirm.
                Capitalisation must match.
              </label>
              <UInput id="delete-confirmation" v-model="deleteConfirmation" class="w-full" autocomplete="off" />
              <p class="text-sm" :class="isDeleteConfirmationValid ? 'text-stock-700' : 'text-stock-600'">
                {{ isDeleteConfirmationValid ? 'Name matches. Deletion is enabled.' : 'Deletion stays disabled until the name matches exactly.' }}
              </p>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="ink-button ink-button--outline"
                  @click="showDeleteConfirm = false; deleteConfirmation = ''"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="ink-button border-correct-600 bg-correct-600 hover:bg-correct-500 hover:border-correct-500"
                  :disabled="!isDeleteConfirmationValid || deleting"
                  @click="deleteOrganization"
                >
                  <UIcon v-if="deleting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
                  {{ deleting ? 'Deleting' : 'Delete permanently' }}
                </button>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <!-- Configure a connection -->
    <UModal
      :open="!!configuring"
      :title="configuring ? `${configuring.name} connection` : ''"
      :ui="{ content: 'max-w-xl' }"
      @update:open="(open) => { if (!open) closeConfig() }"
    >
      <template #body>
        <div class="space-y-6">
          <div>
            <label for="connection-endpoint" class="block font-medium text-stock-950">Address</label>
            <p class="text-sm text-stock-600 mt-1">
              Where the service listens. A local install is usually
              <span class="font-mono">localhost:8000</span>. Leave off the protocol and both
              http and https are tried.
            </p>
            <UInput
              id="connection-endpoint"
              v-model="draft.endpoint"
              class="w-full mt-3"
              placeholder="localhost:8000"
              autocomplete="off"
            />
          </div>

          <div>
            <label for="connection-key" class="block font-medium text-stock-950">API key</label>
            <p class="text-sm text-stock-600 mt-1">
              Optional. It is not shown again after saving — keep your own copy.
            </p>
            <UInput
              id="connection-key"
              v-model="draft.apiKey"
              type="password"
              class="w-full mt-3"
              placeholder="Leave empty if the service needs none"
              autocomplete="off"
            />
          </div>

          <div v-if="testResult" class="border p-4" :class="testResult.ok ? 'border-stock-400' : 'border-correct-500'">
            <p class="font-medium" :class="testResult.ok ? 'text-stock-950' : 'text-correct-600'">
              {{ testResult.title }}
            </p>
            <p class="text-sm text-stock-700 mt-1">{{ testResult.detail }}</p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-wrap justify-end gap-3 w-full">
          <button type="button" class="ink-button ink-button--outline" @click="closeConfig">Cancel</button>
          <button
            type="button"
            class="ink-button ink-button--outline"
            :disabled="!normalisedEndpoint || testingConnection"
            @click="testConnection"
          >
            <UIcon v-if="testingConnection" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ testingConnection ? 'Testing' : 'Test from this browser' }}
          </button>
          <button
            type="button"
            class="ink-button"
            :disabled="!normalisedEndpoint || savingConnection"
            @click="saveConnection"
          >
            <UIcon v-if="savingConnection" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ savingConnection ? 'Saving' : 'Save connection' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Remove a connection -->
    <UModal
      :open="!!connectionToRemove"
      title="Remove connection"
      @update:open="(open) => { if (!open) connectionToRemove = null }"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-stock-950">
            Remove the {{ connectionToRemove?.backendTypeName }} connection at
            <span class="font-mono break-all">{{ connectionToRemove?.baseUrl }}</span>?
          </p>
          <p class="text-stock-700">
            The magic stick and video tracking stop working for everyone in this organization,
            and the API key is deleted — it is never shown again, so you will need your own copy
            to set it up later.
          </p>
          <p class="text-stock-700">
            To pause it instead, cancel and use the switch: that keeps the address and key.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button type="button" class="ink-button ink-button--outline" @click="connectionToRemove = null">Cancel</button>
          <button
            type="button"
            class="ink-button border-correct-600 bg-correct-600 hover:bg-correct-500 hover:border-correct-500"
            :disabled="removingConnection"
            @click="confirmRemoveConnection"
          >
            <UIcon v-if="removingConnection" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ removingConnection ? 'Removing' : 'Remove connection' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
