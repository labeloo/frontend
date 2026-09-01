<template>
  <!-- A colophon, not a band: a hairline and the two facts a sheet carries. -->
  <footer class="border-t border-stock-400">
    <div
      class="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-8"
    >
      <p class="furniture text-stock-600">Labeloo &copy; {{ year }}</p>
      <p class="furniture text-stock-600">Image and video annotation</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
