<template>
  <div class="flex min-h-screen flex-col">
    <!-- Parked above the sheet until it takes focus: the keyboard path past the rail. -->
    <a
      href="#content"
      class="furniture absolute left-4 top-4 z-50 -translate-y-20 border border-stock-950 bg-stock-100 px-3 py-2 text-stock-950 transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>

    <LayoutcomponentsLandingNavbar />

    <main id="content" tabindex="-1" class="flex-1">
      <slot />
    </main>

    <LayoutcomponentsFooter class="mt-auto" />
  </div>
</template>
