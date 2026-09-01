<template>
    <aside class="fixed left-0 top-0 z-40 h-screen w-64 border-r border-stock-400 bg-stock-100">
        <div class="flex h-full flex-col">
            <div class="border-b border-stock-400 p-5">
                <NuxtLink :to="{ name: 'homepage' }" class="flex items-center gap-2">
                    <img src="~/assets/images/penguin.png" alt="" class="h-5 w-auto" />
                    <span class="text-[15px] font-semibold tracking-tight text-stock-950">Labeloo</span>
                </NuxtLink>
                <p class="mt-3 truncate text-[13px] font-medium text-stock-950" :title="projectTitle">
                    {{ projectTitle }}
                </p>
                <p class="furniture mt-1 text-stock-600">Project {{ projectId }}</p>
            </div>

            <nav class="flex-1 overflow-y-auto p-3" aria-label="Project sections">
                <p class="furniture mb-2 px-2 text-stock-600">Sections</p>

                <ul class="space-y-px">
                    <li v-for="item in sections" :key="item.key">
                        <button
                            type="button"
                            :aria-current="activeSection === item.key ? 'page' : undefined"
                            :class="[
                                'flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors',
                                activeSection === item.key
                                    ? 'bg-stock-950 text-stock-50'
                                    : 'text-stock-700 hover:bg-stock-200 hover:text-stock-950'
                            ]"
                            @click="handleNavClick(item.key)"
                        >
                            <UIcon :name="item.icon" class="size-4 flex-none" />
                            {{ item.label }}
                        </button>
                    </li>

                    <li>
                        <!-- A page of its own rather than a section: it holds a live SAM 2
                             session, so it must survive section switches. -->
                        <NuxtLink
                            :to="`/annotate/video/${projectId}`"
                            class="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-stock-700 transition-colors hover:bg-stock-200 hover:text-stock-950"
                        >
                            <UIcon name="i-lucide-film" class="size-4 flex-none" />
                            Video tracking
                        </NuxtLink>
                    </li>
                </ul>
            </nav>

            <div class="border-t border-stock-400 p-3">
                <!-- The organization id is read once for the whole screen, so this is a
                     real link rather than a click that waits on a request. -->
                <NuxtLink
                    v-if="organizationId"
                    :to="`/organizations/${organizationId}`"
                    class="control flex w-full items-center gap-2 px-3 py-2 text-stock-600 transition-colors hover:bg-stock-200 hover:text-stock-950"
                >
                    <UIcon name="i-lucide-arrow-left" class="size-3.5" />
                    Back to organization
                </NuxtLink>
                <p v-else-if="projectLoadError" class="px-3 py-2">
                    <span class="furniture text-correct-500">Organization unknown</span>
                    <button
                        type="button"
                        class="control mt-1 block text-stock-600 underline underline-offset-2 hover:text-stock-950"
                        @click="load(true)"
                    >
                        Try again
                    </button>
                </p>
                <p v-else class="furniture px-3 py-2 text-stock-600">Reading project…</p>

                <button type="button" class="ink-button ink-button--outline mt-2 w-full justify-center" @click="handleLogout">
                    <UIcon name="i-lucide-log-out" class="size-3.5" />
                    Log out
                </button>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useProjectRecord } from '~/components/project/useProjectRecord'

definePageMeta({
    middleware: [async () => {
        const { isAuthenticated } = useAuth()
        if (!isAuthenticated.value) {
            return navigateTo('/login')
        }
    }]
})

const { logout } = useAuth()
const route = useRoute()

const emit = defineEmits<{
    'section-change': [section: string]
}>()

const projectId = computed(() => String(route.params.id ?? ''))

const activeSection = useState('currentProjectSection', () => 'annotate')

const { projectName, organizationId, loadError: projectLoadError, load } = useProjectRecord(projectId)

const projectTitle = computed(() => projectName.value || `Project ${projectId.value}`)

const sections = [
    { key: 'annotate', label: 'Annotate', icon: 'i-lucide-pencil-line' },
    { key: 'tasks', label: 'Progress', icon: 'i-lucide-bar-chart-3' },
    { key: 'users', label: 'Users', icon: 'i-lucide-users' },
    { key: 'upload-data', label: 'Upload data', icon: 'i-lucide-upload' },
    { key: 'classes', label: 'Classes', icon: 'i-lucide-tags' },
    { key: 'models', label: 'Models', icon: 'i-lucide-cpu' },
    { key: 'settings', label: 'Settings', icon: 'i-lucide-settings' }
]

const handleLogout = () => {
    logout()
}

// The layout owns the section: it puts it in the URL and writes it back into
// the shared state, so this rail only asks.
const handleNavClick = (section: string) => {
    emit('section-change', section)
}

watch(projectId, () => load(), { immediate: true })
onMounted(() => load())
</script>
