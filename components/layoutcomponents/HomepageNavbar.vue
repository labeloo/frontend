<template>
  <header class="border-b border-stock-400">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <NuxtLink :to="{ name: 'homepage' }" class="flex items-center gap-2.5">
        <img src="~/assets/images/penguin.png" alt="" class="h-7 w-auto" />
        <span class="text-base font-semibold tracking-tight text-stock-950">Labeloo</span>
      </NuxtLink>

      <LayoutcomponentsSessionField />
    </div>
  </header>
</template>
