<script setup lang="ts">
/**
 * What comes OUT of the job. Export is not a screen you can photograph, so this
 * panel draws the shape of the delivery instead: the archive as a file tree, and
 * the split as a bar of units dividing.
 *
 * Only the yolo layout is drawn, because those are the only file and folder
 * names this page can state as fact. The other three formats are named and left
 * unillustrated rather than given an invented tree — a drawing of files that do
 * not exist is worse than a word.
 *
 * The proportions in the split bar carry no figures. The split is three numbers
 * the customer sets; printing a default here would read as a promise about a
 * value that is theirs.
 */

// Every note here is a verified property of a downloaded archive, checked by
// unzipping a real export from the running stack — not a reading of the code.
const FORMATS = [
  { id: 'json', note: 'Every annotation as a record attached to its task.' },
  { id: 'yolo', note: 'A zip carrying the images themselves, plus one label file per image: the mask as a normalised polygon, not just a box.' },
  { id: 'coco', note: 'instances_train / val / test, each with segmentation, bounding box and area — and the images beside them.' },
  { id: 'zip', note: 'The whole project packaged as it stands.' }
] as const

type FormatId = (typeof FORMATS)[number]['id']

const active = ref<FormatId>('yolo')
const activeNote = computed(() => FORMATS.find(f => f.id === active.value)!.note)

/**
 * The split animates once, when it is actually on screen — a bar that finished
 * dividing while the reader was three sections above it has said nothing.
 * JS only flips a class; the motion itself is CSS.
 */
const bar = ref<HTMLElement | null>(null)
const divided = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!bar.value || typeof IntersectionObserver === 'undefined') {
    divided.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        divided.value = true
        observer?.disconnect()
      }
    }
  }, { threshold: 0.4 })
  observer.observe(bar.value)
})

onBeforeUnmount(() => observer?.disconnect())

/** Unit counts, not a ratio: the bar is illustrative and says so beneath. */
const SEGMENTS = [
  // A value ramp, not the hairline token: stock-400 is declared as "every border
  // on paper" and reads at 1.62:1 when it is spent as a filled block instead.
  { key: 'train', units: 14, fill: 'bg-stock-950' },
  { key: 'val', units: 3, fill: 'bg-stock-700' },
  { key: 'test', units: 3, fill: 'bg-stock-450' }
] as const
</script>

<template>
  <section class="relative">

    <!-- Formats: the four values the endpoint takes, as pressable rows. -->
    <div class="border-b border-stock-400 pb-3">
      <p class="furniture text-stock-600">Export format</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="f in FORMATS"
          :key="f.id"
          type="button"
          class="control border px-3 py-1.5 transition-colors duration-150"
          :class="active === f.id
            ? 'border-stock-950 bg-stock-950 text-stock-50'
            : 'border-stock-400 bg-transparent text-stock-950 hover:border-stock-950'"
          :aria-pressed="active === f.id"
          @click="active = f.id"
        >
          {{ f.id }}
        </button>
      </div>
      <p class="mt-3 max-w-prose text-[13px] leading-relaxed text-stock-700">{{ activeNote }}</p>
    </div>

    <div class="mt-5 grid gap-x-12 gap-y-8 md:grid-cols-2">
      <!-- The archive, drawn as the thing it is. -->
      <div class="">
        <p class="furniture text-stock-600">{{ active }} archive</p>

        <div v-if="active === 'yolo'" class="mt-4">
          <p class="tree-root">zip</p>
          <ul class="tree">
            <li>classes.txt</li>
            <li>data.yaml</li>
            <li>
              images/
              <ul class="tree">
                <li>train<span class="text-stock-600"> · frame_0009.jpg</span></li>
                <li>val</li>
                <li>test</li>
              </ul>
            </li>
            <li>
              labels/
              <ul class="tree">
                <li>train<span class="text-stock-600"> · frame_0009.txt</span></li>
                <li>val</li>
                <li>test</li>
              </ul>
            </li>
          </ul>
        </div>

        <p v-else class="mt-4 max-w-prose text-[13px] leading-relaxed text-stock-700">
          Only the yolo layout is drawn here. The file names inside a
          {{ active }} export are not claimed on this page.
        </p>
      </div>

      <!-- The split: one run of units becoming three. -->
      <div class="">
        <p class="furniture text-stock-600">train / val / test split</p>

        <div ref="bar" class="mt-4">
          <div class="split" :class="{ 'is-divided': divided }">
            <div
              v-for="(seg, i) in SEGMENTS"
              :key="seg.key"
              class="split-group"
              :style="{ '--i': i }"
            >
              <div class="split-units">
                <span
                  v-for="n in seg.units"
                  :key="n"
                  class="split-unit"
                  :class="seg.fill"
                />
              </div>
              <p class="furniture mt-2 text-stock-600">{{ seg.key }}</p>
            </div>
          </div>

          <p class="mt-4 max-w-prose text-[13px] leading-relaxed text-stock-700">
            Three numbers you set. The proportions drawn above are an example, not
            a default.
          </p>
        </div>
      </div>
    </div>

    <p class="border-t border-stock-400 pt-3 text-[13px] leading-relaxed text-stock-700 sm:px-6">
      A yolo or coco export carries only the tasks that actually hold annotations.
    </p>
  </section>
</template>

<style scoped>
/* ── The tree ──────────────────────────────────────────────────────────────
   Hairline connectors are drawn geometry, not box-drawing characters: at 13px
   the glyphs break their vertical run on most stacks, which is a broken rule
   rather than a rule. Names are set in the value voice — they are what the
   archive says, not labels for it. */
.tree-root,
.tree li {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-stock-950);
  font-variant-numeric: tabular-nums;
}

.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree li {
  position: relative;
  padding-left: 20px;
  padding-top: 3px;
  padding-bottom: 3px;
}

/* The vertical run, cut short on the last child so the branch closes. */
.tree li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--color-stock-400);
}
.tree li:last-child::before {
  bottom: auto;
  height: 13px;
}

/* The elbow into the name. */
.tree li::after {
  content: "";
  position: absolute;
  left: 0;
  top: 13px;
  width: 12px;
  border-top: 1px solid var(--color-stock-400);
}

/* ── The split ─────────────────────────────────────────────────────────────
   One undivided run of units that separates into three groups. Transform and
   opacity only; the units themselves never resize. */
.split {
  display: flex;
  align-items: flex-start;
}

.split-group {
  transform: translateX(calc(var(--i) * -9px));
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--i) * 90ms);
  padding-right: 9px;
}

.split.is-divided .split-group {
  transform: translateX(0);
}

.split-units {
  display: flex;
  gap: 2px;
}

.split-unit {
  width: 9px;
  height: 26px;
  flex: none;
  opacity: 0.28;
  transition: opacity 0.5s ease-out;
  transition-delay: calc(var(--i) * 90ms);
}

.split.is-divided .split-unit {
  opacity: 1;
}

/* The narrow groups keep their labels legible when the row is tight. */
@media (max-width: 400px) {
  .split-unit { width: 7px; }
}

/* Static, the bar still says the whole thing: three groups, three sizes,
   three names, already divided and already inked. */
@media (prefers-reduced-motion: reduce) {
  .split-group,
  .split-unit {
    transition: none;
    transform: none;
    opacity: 1;
  }
}
</style>
