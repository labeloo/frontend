<script setup lang="ts">
/**
 * Setting up a new organization.
 *
 * Four things had to change here.
 *
 * The create call used useFetch, which does not throw on an HTTP error, so a
 * name clash or an expired session surfaced to the reader as a raw TypeError.
 * It reads the status and says what to do about it now.
 *
 * Step one created the organization and then locked itself, so a typo in the
 * name could not be corrected without leaving the wizard. Going back is open,
 * and step one turns into an edit once the organization exists.
 *
 * Closing the wizard used to wipe the draft, so reopening it and pressing the
 * button again produced a second, half-finished organization. The id survives
 * the close, and reopening resumes.
 *
 * And the product's first promise — assisted labelling — was never mentioned:
 * a manager could finish with three ticks and hand their team a magic stick
 * that does not work. Connecting SAM 2 is the last step, and it is skippable
 * rather than silent.
 */
import { useRouter } from 'vue-router'

const emit = defineEmits<{ finished: [] }>()

const router = useRouter()
const token = useCookie('auth_token')
const toast = useToast()

interface Draft {
  orgId: string
  name: string
  description: string
  logo: string
  rolesDone: boolean
  membersDone: boolean
}

// Survives closing and reopening the dialog, so an interrupted setup resumes
// instead of creating a second organization.
const draft = useState<Draft>('createOrgDraft', () => ({
  orgId: '',
  name: '',
  description: '',
  logo: '',
  rolesDone: false,
  membersDone: false
}))

const steps = [
  { key: 'organization', label: 'Organization', icon: 'i-lucide-building-2' },
  { key: 'roles', label: 'Roles', icon: 'i-lucide-list-checks' },
  { key: 'members', label: 'Members', icon: 'i-lucide-users' },
  { key: 'sam2', label: 'SAM 2', icon: 'i-lucide-wand-sparkles' }
] as const

const activeStep = ref(0)
const validationError = ref('')
const submitting = ref(false)

const logoUploading = ref(false)
const logoError = ref('')

const rolesRefreshKey = ref(0)
const showRolesModal = ref(false)
const rolesCount = ref<number | null>(null)
const memberSummary = ref<{ email: string; role: string }[]>([])
const searchUsersRef = ref<{ refreshRoles: () => void } | null>(null)

const orgExists = computed(() => draft.value.orgId !== '')

const stepReachable = (index: number) => index === 0 || orgExists.value

const describeError = (error: any, fallback: string) => {
  const status = error?.status ?? error?.statusCode
  if (status === 401) return 'Your session has expired. Sign in again and retry.'
  if (status === 403) return 'Your account is not allowed to create organizations.'
  if (status === 409) return `You already have an organization called "${draft.value.name.trim()}". Pick another name.`
  if (status === 400) return error?.data?.error || 'The server rejected these details. Check the name and try again.'
  if (!status) return 'The server could not be reached. Check your connection and try again.'
  return error?.data?.error || error?.message || fallback
}

/* ── Step 1: the organization ────────────────────────────────────────────── */

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
    draft.value.logo = response.url
  } catch (error: any) {
    logoError.value = describeError(error, 'The logo was not uploaded. You can add one later in Settings.')
  } finally {
    logoUploading.value = false
    target.value = ''
  }
}

const submitOrganization = async () => {
  validationError.value = ''

  if (!draft.value.name.trim()) {
    validationError.value = 'Give the organization a name — it is how everyone will recognise it.'
    return
  }

  if (!token.value) {
    validationError.value = 'Your session has expired. Sign in again and retry.'
    return
  }

  submitting.value = true
  try {
    const body: Record<string, string> = {
      name: draft.value.name.trim(),
      description: draft.value.description.trim()
    }
    if (draft.value.logo) body.logo = draft.value.logo

    if (orgExists.value) {
      await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${draft.value.orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body
      })
      toast.add({ title: 'Details saved', color: 'success' })
    } else {
      const result = await $fetch<any>(import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body
      })

      const id = result?.data?.id ?? result?.id
      if (!id) throw new Error('The server did not return an organization. Nothing was created — try again.')
      draft.value.orgId = String(id)
    }

    activeStep.value = 1
  } catch (error: any) {
    validationError.value = describeError(error, 'The organization was not created. Try again.')
  } finally {
    submitting.value = false
  }
}

/* ── Step 2: roles ───────────────────────────────────────────────────────── */

const fetchRolesCount = async () => {
  if (!draft.value.orgId) return
  try {
    const res = await $fetch<{ data: any[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRoles/all',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: draft.value.orgId
        }
      }
    )
    rolesCount.value = (res.data ?? []).length
  } catch {
    rolesCount.value = null
  }
}

const handleRoleCreated = async () => {
  showRolesModal.value = false
  rolesRefreshKey.value++
  await fetchRolesCount()
  searchUsersRef.value?.refreshRoles()
}

const finishRolesStep = () => {
  draft.value.rolesDone = true
  activeStep.value = 2
}

/* ── Step 3: members ─────────────────────────────────────────────────────── */

const fetchMembers = async () => {
  if (!draft.value.orgId) return
  try {
    const res = await $fetch<{ data: { email: string; role: string }[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
          orgId: draft.value.orgId
        }
      }
    )
    memberSummary.value = (res.data ?? []).map(u => ({ email: u.email, role: u.role || 'None' }))
  } catch {
    memberSummary.value = []
  }
}

const handleUsersAdded = async () => {
  draft.value.membersDone = true
  await fetchMembers()
}

/* ── Step 4: SAM 2 ───────────────────────────────────────────────────────── */

const sam2 = reactive({ endpoint: '', apiKey: '' })
const sam2Saving = ref(false)
const sam2Error = ref('')
const sam2Connected = ref(false)
const backendTypes = ref<{ id: string; name: string }[]>([])

const sam2Type = computed(() =>
  backendTypes.value.find(t => t.id.toLowerCase().startsWith('sam')) ?? backendTypes.value[0]
)

const fetchBackendTypes = async () => {
  if (!draft.value.orgId) return
  try {
    const res = await $fetch<{ data: { id: string; name: string }[] }>(
      import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations/types',
      { headers: { Authorization: `Bearer ${token.value}`, orgId: draft.value.orgId } }
    )
    backendTypes.value = res.data ?? []
  } catch {
    backendTypes.value = []
  }
}

const saveSam2 = async () => {
  sam2Error.value = ''

  const type = sam2Type.value
  if (!type) {
    sam2Error.value = 'The Labeloo server did not list any model backends, so this cannot be set up here. Add it later in Settings.'
    return
  }

  let endpoint = sam2.endpoint.trim()
  while (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1)
  if (!endpoint) {
    sam2Error.value = 'Enter the address the SAM 2 service listens on, or skip this step.'
    return
  }
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `http://${endpoint}`
  }

  sam2Saving.value = true
  try {
    await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/backendRelations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}`, orgId: draft.value.orgId },
      body: {
        backendId: type.id,
        baseUrl: endpoint,
        apiKey: sam2.apiKey,
        isActive: true
      }
    })
    sam2Connected.value = true
    toast.add({
      title: 'SAM 2 connected',
      description: 'Assisted labelling is available to everyone in this organization.',
      color: 'success'
    })
  } catch (error: any) {
    sam2Error.value = describeError(error, 'The connection was not saved. You can add it later in Settings.')
  } finally {
    sam2Saving.value = false
  }
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

const goToStep = (index: number) => {
  if (!stepReachable(index)) return
  activeStep.value = index
}

const clearDraft = () => {
  draft.value = {
    orgId: '',
    name: '',
    description: '',
    logo: '',
    rolesDone: false,
    membersDone: false
  }
}

const openOrganization = () => {
  const id = draft.value.orgId
  clearDraft()
  emit('finished')
  router.push(id ? `/organizations/${id}` : '/homepage')
}

// Reopening an interrupted setup lands on the first step still to be done,
// rather than back on a create form that would make a second organization.
onMounted(() => {
  if (!orgExists.value) return
  activeStep.value = !draft.value.rolesDone ? 1 : !draft.value.membersDone ? 2 : 3
})

watch(() => draft.value.orgId, (id) => {
  if (!id) return
  fetchRolesCount()
  fetchBackendTypes()
}, { immediate: true })

watch(activeStep, (step) => {
  if (step === 1) fetchRolesCount()
  if (step === 2) fetchMembers()
  if (step === 3) fetchBackendTypes()
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-2">
    <!-- Where we are -->
    <ol class="flex flex-wrap gap-x-2 gap-y-2 border-b border-stock-400 pb-4">
      <li v-for="(step, i) in steps" :key="step.key">
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-2 control border transition-colors"
          :class="[
            activeStep === i
              ? 'bg-stock-950 text-stock-50 border-stock-950'
              : stepReachable(i)
                ? 'border-stock-400 text-stock-700 hover:border-stock-950 hover:text-stock-950'
                : 'border-stock-300 text-stock-500 cursor-not-allowed'
          ]"
          :disabled="!stepReachable(i)"
          @click="goToStep(i)"
        >
          <UIcon :name="step.icon" class="w-3.5 h-3.5" />
          {{ step.label }}
        </button>
      </li>
    </ol>

    <p v-if="orgExists" class="text-sm text-stock-600 mt-3">
      "{{ draft.name }}" has been created. You can close this at any point and finish the rest
      from the organization's own screens — nothing is lost.
    </p>

    <!-- ── Step 1 ───────────────────────────────────────────────────────── -->
    <section v-if="activeStep === 0" class="mt-8 space-y-8">
      <div>
        <h3 class="text-xl font-semibold text-stock-950">
          {{ orgExists ? 'Organization details' : 'Name the organization' }}
        </h3>
        <p class="text-stock-600 mt-1">
          This is the container for your projects, your team and your SAM 2 connection.
        </p>
      </div>

      <div v-if="validationError" role="alert" class="border border-correct-500 bg-correct-100 p-4">
        <p class="font-medium text-correct-600">
          {{ orgExists ? 'The details were not saved' : 'The organization was not created' }}
        </p>
        <p class="text-sm text-stock-800 mt-1">{{ validationError }}</p>
      </div>

      <form class="space-y-8" @submit.prevent="submitOrganization">
        <div>
          <label for="org-name" class="block font-medium text-stock-950">Name</label>
          <UInput id="org-name" v-model="draft.name" class="w-full mt-2" size="lg" placeholder="Acme Labelling" />
        </div>

        <div>
          <label for="org-description" class="block font-medium text-stock-950">Description</label>
          <p class="text-sm text-stock-600 mt-1">Optional. What this organization labels, and for whom.</p>
          <UTextarea id="org-description" v-model="draft.description" class="w-full mt-2" :rows="3" />
        </div>

        <div>
          <span class="block font-medium text-stock-950">Logo</span>
          <p class="text-sm text-stock-600 mt-1">Optional. JPG or PNG, up to 5 MB.</p>
          <div class="flex items-start gap-4 mt-3">
            <img
              v-if="draft.logo"
              :src="draft.logo"
              alt="Logo preview"
              class="w-16 h-16 object-cover border border-stock-400 shrink-0"
            >
            <div v-else class="w-16 h-16 border border-stock-400 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-image" class="w-6 h-6 text-stock-500" />
            </div>
            <div class="space-y-2">
              <input
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
            </div>
          </div>
        </div>

        <div class="flex justify-end border-t border-stock-400 pt-6">
          <button type="submit" class="ink-button" :disabled="submitting || !draft.name.trim()">
            <UIcon v-if="submitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ submitting ? 'Saving' : orgExists ? 'Save and continue' : 'Create and continue' }}
          </button>
        </div>
      </form>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────────────── -->
    <section v-else-if="activeStep === 1" class="mt-8 space-y-6">
      <div>
        <h3 class="text-xl font-semibold text-stock-950">Roles</h3>
        <p class="text-stock-600 mt-1 max-w-prose">
          Every member gets a role when they are added, so at least one has to exist before you
          can bring anyone in. An annotator role with no management permissions is enough to start.
        </p>
      </div>

      <OrganizationRolesTable :org-id="draft.orgId" :refresh-key="rolesRefreshKey" />

      <div class="flex flex-wrap justify-between gap-3 border-t border-stock-400 pt-6">
        <button type="button" class="ink-button ink-button--outline" @click="showRolesModal = true">
          <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
          Create a role
        </button>
        <button type="button" class="ink-button" :disabled="rolesCount === 0" @click="finishRolesStep">
          Continue to members
        </button>
      </div>
      <p v-if="rolesCount === 0" class="text-sm text-stock-600 text-right">
        Create at least one role to continue.
      </p>

      <UModal v-model:open="showRolesModal" title="Create role" :ui="{ content: 'max-w-2xl' }">
        <template #body>
          <OrganizationCreateRoles :org-id="draft.orgId" @role-created="handleRoleCreated" />
        </template>
      </UModal>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────────────── -->
    <section v-else-if="activeStep === 2" class="mt-8 space-y-6">
      <div>
        <h3 class="text-xl font-semibold text-stock-950">Members</h3>
        <p class="text-stock-600 mt-1 max-w-prose">
          Add the people who will label. You can skip this and do it later from the
          organization's Members screen.
        </p>
      </div>

      <OrganizationSearchUsers ref="searchUsersRef" :org-id="draft.orgId" @users-added="handleUsersAdded" />

      <div v-if="memberSummary.length" class="border border-stock-400">
        <p class="furniture text-stock-600 px-4 py-3 border-b border-stock-400">In this organization</p>
        <ul class="divide-y divide-stock-400">
          <li v-for="member in memberSummary" :key="member.email" class="flex items-center justify-between gap-4 px-4 py-3">
            <span class="text-stock-950">{{ member.email }}</span>
            <span class="furniture text-stock-600">{{ member.role }}</span>
          </li>
        </ul>
      </div>

      <div class="flex justify-end border-t border-stock-400 pt-6">
        <button type="button" class="ink-button" @click="activeStep = 3">Continue to SAM 2</button>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────────────── -->
    <section v-else class="mt-8 space-y-6">
      <div>
        <h3 class="text-xl font-semibold text-stock-950">Connect SAM 2</h3>
        <p class="text-stock-700 mt-1 max-w-prose">
          SAM 2 is what makes one click become a shape, and one click plus Track follow an object
          through a video. It runs as a separate service, addressed per organization. Without this
          connection the magic stick fails and every shape has to be drawn by hand — the tool still
          works, it is just far slower.
        </p>
        <p class="text-stock-600 text-sm mt-2">
          You can skip this and add it later under Settings → Connections.
        </p>
      </div>

      <div v-if="sam2Connected" class="border border-stock-400 p-5">
        <p class="font-medium text-stock-950">SAM 2 is connected</p>
        <p class="text-stock-700 mt-1">
          Assisted labelling is available. Tracking speed depends on that host: roughly
          1–3.5 seconds per frame on a CPU, far quicker on a GPU.
        </p>
      </div>

      <form v-else class="space-y-6" @submit.prevent="saveSam2">
        <div v-if="sam2Error" role="alert" class="border border-correct-500 bg-correct-100 p-4">
          <p class="font-medium text-correct-600">The connection was not saved</p>
          <p class="text-sm text-stock-800 mt-1">{{ sam2Error }}</p>
        </div>

        <div>
          <label for="sam2-endpoint" class="block font-medium text-stock-950">Address</label>
          <p class="text-sm text-stock-600 mt-1">
            A local install is usually <span class="font-mono">localhost:8000</span>.
          </p>
          <UInput id="sam2-endpoint" v-model="sam2.endpoint" class="w-full mt-2" placeholder="localhost:8000" autocomplete="off" />
        </div>

        <div>
          <label for="sam2-key" class="block font-medium text-stock-950">API key</label>
          <p class="text-sm text-stock-600 mt-1">Optional. It is not shown again — keep your own copy.</p>
          <UInput id="sam2-key" v-model="sam2.apiKey" type="password" class="w-full mt-2" autocomplete="off" />
        </div>

        <div class="flex justify-end">
          <button type="submit" class="ink-button" :disabled="sam2Saving">
            <UIcon v-if="sam2Saving" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            {{ sam2Saving ? 'Saving' : 'Connect SAM 2' }}
          </button>
        </div>
      </form>

      <div class="flex flex-wrap justify-end gap-3 border-t border-stock-400 pt-6">
        <button type="button" class="ink-button" @click="openOrganization">
          {{ sam2Connected ? 'Open the organization' : 'Skip and open the organization' }}
        </button>
      </div>
    </section>
  </div>
</template>
