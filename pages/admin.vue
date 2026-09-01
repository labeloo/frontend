<script setup lang="ts">
definePageMeta({ layout: 'homepage' })

const config = useRuntimeConfig()
const token = useCookie('auth_token')
const { isPlatformAdmin } = useAuth()

const base = `${config.public.apiUrl}/api/admin`
const authGet = (path: string) =>
  $fetch<{ data: any }>(`${base}${path}`, { headers: { Authorization: `Bearer ${token.value}` } })

const overview = ref<any>(null)
const orgs = ref<any[]>([])
const usage = ref<{ byBackend: any[]; daily: any[] }>({ byBackend: [], daily: [] })
const jobs = ref<any[]>([])
const plans = ref<{ key: string; name: string }[]>([])
const loading = ref(true)
const notice = ref<string | null>(null)

// A platform-admin-only screen: send everyone else home rather than showing an
// empty shell that 403s on every request.
onMounted(async () => {
  if (!isPlatformAdmin.value) { navigateTo('/homepage'); return }
  try {
    const [o, og, u, j, pl] = await Promise.all([
      authGet('/overview'),
      authGet('/organizations'),
      authGet('/usage'),
      authGet('/jobs'),
      $fetch<{ data: any[] }>(`${config.public.apiUrl}/api/billing/plans`, {
        headers: { Authorization: `Bearer ${token.value}`, orgId: '1' },
      }),
    ])
    overview.value = o.data
    orgs.value = og.data
    usage.value = u.data
    jobs.value = j.data
    plans.value = pl.data.map((p: any) => ({ key: p.key, name: p.name }))
  } catch (e: any) {
    notice.value = e?.data?.error || e?.message || 'Could not load the admin data.'
  } finally {
    loading.value = false
  }
})

const setPlan = async (orgId: number, plan: string) => {
  try {
    await $fetch(`${base}/organizations/${orgId}/plan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json' },
      body: { plan },
    })
    const row = orgs.value.find((o) => o.id === orgId)
    if (row) row.plan = plan
    notice.value = null
  } catch (e: any) {
    notice.value = e?.data?.error || 'Could not change the plan.'
  }
}

// Inline bar chart, so the compute series needs no charting dependency.
const chartMax = computed(() => Math.max(1, ...usage.value.daily.map((d) => Number(d.calls))))
const fmtDay = (d: string) => d?.slice(5) // MM-DD

const statusInk = (s: string) =>
  s === 'succeeded' ? 'text-ink-g' : s === 'failed' || s === 'canceled' ? 'text-correct-500' : 'text-stock-700'
const fmtDate = (t: number) => t ? new Date(t * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
    <header class="border-b border-stock-400 pb-5">
      <p class="furniture text-stock-500">Platform</p>
      <h1 class="text-3xl font-semibold text-stock-950">Operations</h1>
      <p class="text-stock-600 mt-1">Every organization on this deployment, what they run, and what it costs.</p>
    </header>

    <div v-if="notice" class="border border-correct-500 bg-correct-100 p-3 text-[13px] text-correct-700">{{ notice }}</div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-stock-600">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="furniture">Reading the platform</span>
    </div>

    <template v-else-if="overview">
      <!-- Overview stat strip -->
      <dl class="docket flex-wrap gap-x-10 gap-y-3 py-3 furniture">
        <div class="docket-field"><dt>Organizations</dt><dd class="text-lg text-stock-950">{{ overview.organizations }}</dd></div>
        <div class="docket-field"><dt>Users</dt><dd class="text-lg text-stock-950">{{ overview.users }}</dd></div>
        <div class="docket-field"><dt>Projects</dt><dd class="text-lg text-stock-950">{{ overview.projects }}</dd></div>
        <div class="docket-field"><dt>Active training</dt><dd class="text-lg text-stock-950">{{ overview.activeTrainingJobs }}</dd></div>
        <div class="docket-field"><dt>Compute today</dt><dd class="text-lg text-stock-950">{{ overview.computeCallsToday }}</dd></div>
      </dl>

      <!-- Compute chart -->
      <section class="space-y-4">
        <h2 class="furniture text-stock-600">Compute · last 14 days</h2>
        <div v-if="usage.daily.length === 0" class="text-[13px] text-stock-600">No compute recorded yet.</div>
        <div v-else class="flex items-end gap-1.5 h-32 border-b border-stock-400">
          <div v-for="d in usage.daily" :key="d.day" class="flex-1 flex flex-col items-center justify-end gap-1" :title="`${d.day}: ${d.calls} calls`">
            <div class="w-full bg-stock-800" :style="{ height: `${(Number(d.calls) / chartMax) * 100}%` }" />
            <span class="furniture text-[9px] text-stock-500">{{ fmtDay(d.day) }}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-1 furniture text-stock-600">
          <span v-for="b in usage.byBackend" :key="b.backendId">
            {{ b.backendId }}: {{ b.calls }} calls · {{ Math.round(Number(b.durationMs) / 1000) }}s
          </span>
        </div>
      </section>

      <!-- Organizations + plan -->
      <section class="space-y-4">
        <h2 class="furniture text-stock-600">Organizations</h2>
        <table class="w-full text-[13px]">
          <thead>
            <tr class="furniture text-stock-500 text-left border-b border-stock-400">
              <th class="py-2 pr-4 font-medium">Organization</th>
              <th class="py-2 pr-4 font-medium">Members</th>
              <th class="py-2 pr-4 font-medium">Calls / mo</th>
              <th class="py-2 pr-4 font-medium">GPU-s / mo</th>
              <th class="py-2 pr-4 font-medium">Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="org in orgs" :key="org.id" class="border-b border-stock-300">
              <td class="py-2 pr-4 text-stock-950">{{ org.name }} <span class="text-stock-500">#{{ org.id }}</span></td>
              <td class="py-2 pr-4 text-stock-700">{{ org.members }}</td>
              <td class="py-2 pr-4 text-stock-700">{{ org.callsThisMonth }}</td>
              <td class="py-2 pr-4 text-stock-700">{{ org.gpuSecondsThisMonth }}</td>
              <td class="py-2 pr-4">
                <select :value="org.plan" class="control border border-stock-400 px-2 py-1" @change="setPlan(org.id, ($event.target as HTMLSelectElement).value)">
                  <option v-for="p in plans" :key="p.key" :value="p.key">{{ p.name }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Recent training jobs -->
      <section class="space-y-4">
        <h2 class="furniture text-stock-600">Recent training jobs</h2>
        <p v-if="jobs.length === 0" class="text-[13px] text-stock-600">No training jobs yet.</p>
        <table v-else class="w-full text-[13px]">
          <thead>
            <tr class="furniture text-stock-500 text-left border-b border-stock-400">
              <th class="py-2 pr-4 font-medium">Job</th>
              <th class="py-2 pr-4 font-medium">Org</th>
              <th class="py-2 pr-4 font-medium">Status</th>
              <th class="py-2 pr-4 font-medium">Progress</th>
              <th class="py-2 pr-4 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id" class="border-b border-stock-300">
              <td class="py-2 pr-4 text-stock-950">#{{ job.id }}</td>
              <td class="py-2 pr-4 text-stock-700">{{ job.organizationId }}</td>
              <td class="py-2 pr-4"><span :class="['furniture', statusInk(job.status)]">{{ job.status }}</span></td>
              <td class="py-2 pr-4 text-stock-700">{{ job.progress }}%</td>
              <td class="py-2 pr-4 text-stock-600">{{ fmtDate(job.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
