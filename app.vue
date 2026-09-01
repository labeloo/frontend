<script setup lang="ts">
useHead({
  title: 'Labeloo',
  titleTemplate: (chunk?: string) =>
    !chunk || chunk === 'Labeloo' ? 'Labeloo' : chunk.includes('Labeloo') ? chunk : `${chunk} · Labeloo`,
  meta: [{ name: 'description', content: 'Image and video annotation' }]
})
</script>

<template>
  <div>
    <!--
      DIRECTION CONTRACT — seed cf8bfb03

      THESIS: A class is an ink, and an annotation is a separation printed over the
      plate. Refuses the category's near-black IDE chrome with a neon accent, and
      refuses the white SaaS dashboard of rounded cards.

      OWN-WORLD: Uncoated proof stock (#F4F2EC) for chrome; a calibrated neutral
      viewing grey (#767674) wherever an image is judged; ink #141414, never pure
      black; hairline rules, registration crosses, square corners, no shadows.
      Process inks (C/M/Y/K + spots) appear only as data on the plate, never as UI.
      Archivo for reading, Sometype Mono for registration furniture and figures.

      STORY: The annotator sees a plate, a colour bar of the classes, and the ink
      they are laying down. They click, an ink prints, they move on.

      FIRST VIEWPORT: The plate fills the stage on neutral grey, registration
      crosses at its corners. A colour bar sits beneath it, one swatch per class
      with its density count. The ink tray is a left margin column; the sheet's
      docket runs along the top.

      FORM: Separation Proof, candidate 3 of the grounded list, seed cf8bfb03.

      FINISH: unreviewed and undocumented is unfinished; this build ends with the
      finish review, the verdict, and DESIGN.md
    -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
