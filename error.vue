<script setup lang="ts">
import type { NuxtError } from '#app'

// Nuxt renders this OUTSIDE the layout, so it gets no chrome for free: without it
// a mistyped URL fell through to Nuxt's own page, which is dark navy on #020420 —
// a different product entirely. Every surface a user can reach is part of the world.
const props = defineProps<{ error: NuxtError }>()

const status = computed(() => props.error?.statusCode ?? 500)

// Say what actually happened. A 404 is not "something went wrong".
const plate = computed(() => {
  if (status.value === 404) {
    return { title: 'No such sheet', body: 'That address does not correspond to anything in this workspace. It may have been deleted, or the link may be mistyped.' }
  }
  if (status.value === 403) {
    return { title: 'Not your plate', body: 'You are signed in, but this belongs to an organization you are not a member of.' }
  }
  return { title: 'The press stopped', body: 'The server failed while handling this request. Nothing you were working on has been discarded.' }
})

useHead({ title: `${status.value}` })
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-stock-100 text-stock-950">
    <header class="flex items-center gap-3 border-b border-stock-400 px-8 py-5">
      <img src="~/assets/images/penguin.png" alt="" class="h-7 w-auto" />
      <span class="font-semibold tracking-tight">Labeloo</span>
    </header>

    <!-- The marks belong to the empty stage, not the viewport: at the viewport
         corners they printed straight through the logo and the footer figures. -->
    <main class="relative flex flex-1 items-center px-8">
      <span class="regmark text-stock-400" style="left: 32px; top: 32px" />
      <span class="regmark text-stock-400" style="right: 32px; top: 32px" />
      <span class="regmark text-stock-400" style="left: 32px; bottom: 32px" />
      <span class="regmark text-stock-400" style="right: 32px; bottom: 32px" />
      <div class="mx-auto w-full max-w-xl">
        <p class="furniture text-stock-600">Status {{ status }}</p>

        <h1 class="mt-4 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em]">
          {{ plate.title }}
        </h1>

        <p class="mt-5 text-stock-700">{{ plate.body }}</p>

        <!-- The message is diagnostic, not decorative: show it, but never in place of
             the sentence above, and never as the only thing on the page. -->
        <p v-if="error?.message && error.message !== plate.title" class="furniture mt-5 border-l-2 border-stock-400 pl-4 text-stock-600">
          {{ error.message }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-3">
          <button type="button" class="ink-button" @click="clearError({ redirect: '/' })">
            <UIcon name="i-lucide-arrow-left" class="size-3.5" />
            Back to your organizations
          </button>
          <button v-if="status >= 500" type="button" class="ink-button ink-button--outline" @click="clearError({ redirect: $route.fullPath })">
            <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
            Try again
          </button>
        </div>
      </div>
    </main>

    <footer class="furniture flex items-center justify-between border-t border-stock-400 px-8 py-4 text-stock-600">
      <span>Labeloo</span>
      <span>{{ status }}</span>
    </footer>
  </div>
</template>
