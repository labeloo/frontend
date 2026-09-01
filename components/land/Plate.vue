<script setup lang="ts">
/**
 * A screenshot presented the way this world presents anything being judged: as a
 * plate on the press, hairline-framed with registration marks at its corners.
 *
 * The marks sit OUTSIDE the frame. Inside, they landed on whatever the capture
 * happened to contain and disappeared against a light interface — a register
 * mark you cannot see is not registering anything.
 *
 * Every image here is a real capture of the running product, taken by script
 * against the local stack, so nothing needs a caption claiming it is real.
 */
defineProps<{
  src: string
  alt: string
  /** Printed along the plate's bottom edge, the way a proof carries its slug. */
  slug?: string
}>()
</script>

<template>
  <figure class="relative">
    <div class="relative">
      <div class="border border-stock-400 bg-stage-300">
        <img :src="src" :alt="alt" class="block w-full" loading="lazy" decoding="async" />
      </div>

      <span class="regmark text-stock-400" style="left: -7px; top: -7px" />
      <span class="regmark text-stock-400" style="right: -7px; top: -7px" />
      <span class="regmark text-stock-400" style="left: -7px; bottom: -7px" />
      <span class="regmark text-stock-400" style="right: -7px; bottom: -7px" />
    </div>

    <figcaption v-if="slug" class="furniture mt-3 text-stock-600">
      {{ slug }}
    </figcaption>
  </figure>
</template>
