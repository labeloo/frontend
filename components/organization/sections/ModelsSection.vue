<script setup lang="ts">
import { useTraining, type WeightCatalogEntry, type ModelAsset, type TrainingJob } from '~/composables/useTraining'

interface Props { organizationId: string }
const props = defineProps<Props>()

const config = useRuntimeConfig()
const token = useCookie('auth_token')
const api = useTraining(props.organizationId)

const loading = ref(true)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const say = (kind: 'ok' | 'error', text: string) => { notice.value = { kind, text } }

const catalog = ref<WeightCatalogEntry[]>([])
const models = ref<ModelAsset[]>([])
const jobs = ref<TrainingJob[]>([])
const projects = ref<{ id: number; name: string }[]>([])

const baseAssets = computed(() => models.value.filter(m => m.kind === 'base'))
const downloadedIds = computed(() => new Set(baseAssets.value.map(m => m.name)))

const fmtBytes = (n: number) => {
  if (!n) return '—'
  const mb = n / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}
const fmtDate = (t: number) => t ? new Date(t * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const loadProjects = async () => {
  try {
    const response = await $fetch<{ data?: any[] }>(`${config.public.apiUrl}/api/projects/all`, {
      headers: { Authorization: `Bearer ${token.value}`, orgId: String(props.organizationId) },
    })
    projects.value = (response.data ?? [])
      .filter((p: any) => String(p.organizationId) === String(props.organizationId))
      .map((p: any) => ({ id: p.id, name: p.name }))
  } catch { projects.value = [] }
}

const refresh = async () => {
  try {
    const [c, m, j] = await Promise.all([api.catalog(), api.models(), api.jobs()])
    catalog.value = c; models.value = m; jobs.value = j
  } catch (e: any) {
    // A plan without the training feature answers 402 here; surface it plainly.
    say('error', e?.message || 'Could not load the models section.')
  }
}

// ── busy flags, so a button shows it is working and cannot double-fire ────────
const busyWeight = ref<string | null>(null)
const busyJob = ref<number | null>(null)

const downloadWeight = async (entry: WeightCatalogEntry) => {
  busyWeight.value = entry.id
  try {
    await api.downloadWeight(entry.id)
    await refresh()
    say('ok', `${entry.name} is ready to train from.`)
  } catch (e: any) {
    say('error', e?.message || `Could not download ${entry.name}.`)
  } finally { busyWeight.value = null }
}

const downloadModel = async (asset: ModelAsset) => {
  try { await api.downloadModel(asset.id, asset.name) }
  catch (e: any) { say('error', e?.message || 'Download failed.') }
}

// ── training dialog ───────────────────────────────────────────────────────
const showTrain = ref(false)
const form = reactive({ projectId: 0, baseAssetId: 0, taskFilter: 'completed', epochs: 50, imgsz: 640 })
const starting = ref(false)

const openTrain = () => {
  form.projectId = projects.value[0]?.id ?? 0
  form.baseAssetId = baseAssets.value[0]?.id ?? 0
  form.taskFilter = 'completed'; form.epochs = 50; form.imgsz = 640
  showTrain.value = true
}

const canStart = computed(() => form.projectId > 0 && form.baseAssetId > 0 && !starting.value)

const startTraining = async () => {
  if (!canStart.value) return
  starting.value = true
  try {
    await api.startJob({ ...form })
    showTrain.value = false
    say('ok', 'Training started. Progress updates below.')
    await refresh()
  } catch (e: any) {
    say('error', e?.message || 'Could not start training.')
  } finally { starting.value = false }
}

const doJob = async (id: number, action: 'pause' | 'resume' | 'cancel' | 'register') => {
  busyJob.value = id
  try {
    if (action === 'pause') await api.pauseJob(id)
    else if (action === 'resume') await api.resumeJob(id)
    else if (action === 'cancel') await api.cancelJob(id)
    else if (action === 'register') {
      const asset = await api.registerJob(id)
      say('ok', 'The trained model is saved. You can download it from My models.')
      await refresh()
      return
    }
    await refresh()
  } catch (e: any) {
    say('error', e?.message || `Could not ${action} the job.`)
  } finally { busyJob.value = null }
}

const metricsOf = (job: TrainingJob) => {
  if (!job.metrics) return null
  try {
    const m = JSON.parse(job.metrics)
    const pick = (k: string) => Object.entries(m).find(([key]) => key.includes(k))?.[1]
    return { map: pick('mAP50') ?? pick('mAP'), loss: pick('loss') }
  } catch { return null }
}

const statusInk = (s: string) =>
  s === 'succeeded' ? 'text-ink-g'
  : s === 'failed' || s === 'canceled' ? 'text-correct-500'
  : 'text-stock-700'

// ── live polling: only while something is actually running ───────────────────
let timer: ReturnType<typeof setInterval> | null = null
const anyLive = computed(() => jobs.value.some(j => j.status === 'running' || j.status === 'queued'))

const pollLive = async () => {
  const live = jobs.value.filter(j => j.status === 'running' || j.status === 'queued')
  if (live.length === 0) return
  try {
    const fresh = await Promise.all(live.map(j => api.job(j.id)))
    const byId = new Map(fresh.map(j => [j.id, j]))
    jobs.value = jobs.value.map(j => byId.get(j.id) || j)
  } catch { /* transient; try again next tick */ }
}

onMounted(async () => {
  await Promise.all([refresh(), loadProjects()])
  loading.value = false
  timer = setInterval(() => { if (anyLive.value) pollLive() }, 4000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(() => props.organizationId, async () => { loading.value = true; await Promise.all([refresh(), loadProjects()]); loading.value = false })
</script>

<template>
  <div class="space-y-10">
    <header class="border-b border-stock-400 pb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-stock-950">Models</h2>
        <p class="text-stock-600 mt-1">Download a base weight, train it on your completed work, then keep or export the result.</p>
      </div>
      <button type="button" class="ink-button" :disabled="baseAssets.length === 0 || projects.length === 0" @click="openTrain">
        Train a model
      </button>
    </header>

    <div v-if="notice" :class="['border p-3 text-[13px]', notice.kind === 'ok' ? 'border-stock-400 text-stock-800' : 'border-correct-500 bg-correct-100 text-correct-700']">
      {{ notice.text }}
    </div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading models</span>
    </div>

    <template v-else>
      <!-- Base weight catalogue -->
      <section class="space-y-4">
        <h3 class="furniture text-stock-600">Base weights</h3>
        <p v-if="baseAssets.length === 0" class="text-[13px] text-stock-600 max-w-2xl">
          Nothing is preinstalled. Download the architecture you want to start from — the smallest is fine for a first run.
        </p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="w in catalog" :key="w.id" class="border border-stock-400 p-4 flex flex-col gap-2">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-semibold text-stock-950">{{ w.name }}</span>
              <span class="furniture text-stock-500">{{ w.params }}</span>
            </div>
            <p class="text-[12px] text-stock-600 leading-snug flex-1">{{ w.note }}</p>
            <button
              type="button"
              class="ink-button ink-button--outline self-start"
              :disabled="busyWeight === w.id || downloadedIds.has(w.name)"
              @click="downloadWeight(w)"
            >
              {{ downloadedIds.has(w.name) ? 'Downloaded' : busyWeight === w.id ? 'Downloading…' : 'Download' }}
            </button>
          </div>
        </div>
      </section>

      <!-- My models -->
      <section class="space-y-4">
        <h3 class="furniture text-stock-600">My models</h3>
        <p v-if="models.length === 0" class="text-[13px] text-stock-600">No weights yet.</p>
        <table v-else class="w-full text-[13px]">
          <thead>
            <tr class="furniture text-stock-500 text-left border-b border-stock-400">
              <th class="py-2 pr-4 font-medium">Name</th>
              <th class="py-2 pr-4 font-medium">Kind</th>
              <th class="py-2 pr-4 font-medium">Size</th>
              <th class="py-2 pr-4 font-medium">Added</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in models" :key="m.id" class="border-b border-stock-300">
              <td class="py-2 pr-4 text-stock-950">{{ m.name }}</td>
              <td class="py-2 pr-4 text-stock-700">{{ m.kind }}</td>
              <td class="py-2 pr-4 text-stock-700">{{ fmtBytes(m.sizeBytes) }}</td>
              <td class="py-2 pr-4 text-stock-600">{{ fmtDate(m.createdAt) }}</td>
              <td class="py-2 text-right">
                <button type="button" class="ink-button ink-button--outline" @click="downloadModel(m)">Download</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Training jobs -->
      <section class="space-y-4">
        <h3 class="furniture text-stock-600">Training jobs</h3>
        <p v-if="jobs.length === 0" class="text-[13px] text-stock-600">No runs yet. Download a base weight and press Train a model.</p>
        <div v-else class="space-y-3">
          <div v-for="job in jobs" :key="job.id" class="border border-stock-400 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="font-semibold text-stock-950">Job {{ job.id }}</span>
                <span :class="['furniture', statusInk(job.status)]">{{ job.status }}</span>
                <span class="furniture text-stock-500">{{ job.epochs }} epochs · {{ job.imgsz }}px</span>
              </div>
              <div class="flex items-center gap-2">
                <button v-if="job.status === 'running'" type="button" class="ink-button ink-button--outline" :disabled="busyJob === job.id" @click="doJob(job.id, 'pause')">Pause</button>
                <button v-if="job.status === 'paused'" type="button" class="ink-button ink-button--outline" :disabled="busyJob === job.id" @click="doJob(job.id, 'resume')">Resume</button>
                <button v-if="['running','paused','queued'].includes(job.status)" type="button" class="ink-button ink-button--outline" :disabled="busyJob === job.id" @click="doJob(job.id, 'cancel')">Cancel</button>
                <button v-if="job.status === 'succeeded' && !job.outputAssetId" type="button" class="ink-button" :disabled="busyJob === job.id" @click="doJob(job.id, 'register')">Save model</button>
                <span v-if="job.status === 'succeeded' && job.outputAssetId" class="furniture text-ink-g">Saved to My models</span>
              </div>
            </div>

            <div class="mt-3 h-1.5 bg-stock-200 overflow-hidden">
              <div class="h-full bg-stock-800 transition-all" :style="{ width: `${job.progress}%` }" />
            </div>
            <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 furniture text-stock-600">
              <span>{{ job.progress }}%</span>
              <span v-if="metricsOf(job)?.map != null">mAP50 {{ Number(metricsOf(job)!.map).toFixed(3) }}</span>
              <span v-if="metricsOf(job)?.loss != null">loss {{ Number(metricsOf(job)!.loss).toFixed(3) }}</span>
            </div>
            <p v-if="job.error" class="mt-2 text-[12px] text-correct-600">{{ job.error }}</p>
          </div>
        </div>
      </section>
    </template>

    <!-- Train dialog -->
    <div v-if="showTrain" class="fixed inset-0 z-50 flex items-center justify-center bg-stock-950/40 p-4" @click.self="showTrain = false">
      <div class="bg-white border border-stock-500 w-full max-w-lg p-6 space-y-5">
        <div>
          <h3 class="text-xl font-semibold text-stock-950">Train a model</h3>
          <p class="text-[13px] text-stock-600 mt-1">It learns from this project's completed tasks. Larger jobs take longer.</p>
        </div>

        <label class="block space-y-1">
          <span class="furniture text-stock-600">Project</span>
          <select v-model.number="form.projectId" class="control w-full border border-stock-400 px-2 py-1.5">
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="furniture text-stock-600">Base weight</span>
          <select v-model.number="form.baseAssetId" class="control w-full border border-stock-400 px-2 py-1.5">
            <option v-for="b in baseAssets" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="furniture text-stock-600">Learn from</span>
          <select v-model="form.taskFilter" class="control w-full border border-stock-400 px-2 py-1.5">
            <option value="completed">All completed tasks</option>
            <option value="approved">Only reviewer-approved tasks</option>
          </select>
        </label>

        <div class="grid grid-cols-2 gap-4">
          <label class="block space-y-1">
            <span class="furniture text-stock-600">Epochs</span>
            <input v-model.number="form.epochs" type="number" min="1" max="1000" class="control w-full border border-stock-400 px-2 py-1.5">
          </label>
          <label class="block space-y-1">
            <span class="furniture text-stock-600">Image size</span>
            <input v-model.number="form.imgsz" type="number" min="64" max="1536" step="32" class="control w-full border border-stock-400 px-2 py-1.5">
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="ink-button ink-button--outline" @click="showTrain = false">Cancel</button>
          <button type="button" class="ink-button" :disabled="!canStart" @click="startTraining">
            {{ starting ? 'Starting…' : 'Start training' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
