<script setup lang="ts">
/**
 * The landing's docket strip. The version this replaced was a floating pill with
 * a Nuxt UI button in `bg-secondary` and a colour-mode toggle - three things that
 * belong to no world this product has. The rest of the site wears a hairline
 * docket; so does the front door.
 */
const contactEmail = useRuntimeConfig().public.contactEmail as string
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-stock-400 bg-stock-100">
    <div class="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <img src="~/assets/images/penguin.png" alt="" class="h-7 w-auto" />
        <span class="font-semibold tracking-tight">Labeloo</span>
      </NuxtLink>

      <dl class="furniture ml-2 hidden items-center gap-5 border-l border-stock-400 pl-4 text-stock-600 md:flex">
        <div class="docket-field"><dt>Runs</dt><dd>Self-hosted</dd></div>
      </dl>

      <div class="ml-auto flex items-center gap-2">
        <NuxtLink to="/login" class="ink-button ink-button--outline">Sign in</NuxtLink>
        <a v-if="contactEmail" :href="`mailto:${contactEmail}?subject=Labeloo%20setup`" class="ink-button">
          Contact us
        </a>
      </div>
    </div>
  </header>
</template>
