<script setup lang="ts">
/**
 * The claim: a video is not imported as a video. Import takes a clip and a
 * frames-per-second value, ffmpeg's fps filter cuts it at that rate, and every
 * extracted frame leaves as its own sheet — clip name, frame index, timestamp,
 * rate. A clip becomes a queue, not a blob.
 *
 * Drawn as a scored bar because the rate is the only thing the person chooses,
 * and the rate is visible in exactly one way: how densely the clip gets cut.
 * Prose can say "you pick the rate"; only ticks show what picking it does. One
 * tick is then followed down to the record it becomes, so the diagram ends on
 * the product's real field names rather than on a metaphor.
 *
 * Geometry is inline SVG with non-scaling strokes so a hairline stays a
 * hairline when the bar is stretched or squeezed; no text lives inside the SVG,
 * where non-uniform scaling would distort it.
 */

/** The three rates are illustrative presets, not a limit: the field is a number. */
const RATES = [1, 5, 10] as const
const fps = ref<number>(5)

/** An illustrative clip length, so a rate has something to be a rate *of*. */
const DURATION = 8

/** ffmpeg's fps filter yields one frame per 1/fps of the clip. */
const frames = computed(() => DURATION * fps.value)

/** The tick followed down to a sheet: the frame nearest 3.6s, whatever the rate. */
const pickedIndex = computed(() => Math.round(3.6 * fps.value))

/** Frame i sits at timestamp i / fps seconds. Nothing else decides it. */
const stampFor = (index: number, rate: number) => {
  const seconds = index / rate
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = (seconds % 60).toFixed(1).padStart(4, '0')
  return `${mm}:${ss}`
}

const ticks = computed(() =>
  Array.from({ length: frames.value }, (_, i) => 2 + (i / fps.value / DURATION) * 796)
)
const pickedX = computed(() => 2 + (pickedIndex.value / fps.value / DURATION) * 796)

const sheet = computed<[string, string][]>(() => [
  ['File', 'demo.mp4'],
  ['Frame', String(pickedIndex.value).padStart(4, '0')],
  ['At', stampFor(pickedIndex.value, fps.value)],
  ['Rate', `${fps.value} fps`]
])
</script>

<template>
  <section class="">
    <p class="furniture border-b border-stock-400 pb-2 text-stock-600">
      Import · Video
    </p>

    <div class="px-4 py-6 sm:px-6">
      <p class="max-w-[62ch] text-stock-800">
        Extraction runs through ffmpeg's fps filter, so frame
        <span class="font-mono text-stock-950">i</span> sits at
        <span class="font-mono text-stock-950">i / fps</span> seconds.
      </p>

      <!-- Two or three presets, because the rate is the only thing being chosen here.
           With no interaction at all the bar is already scored at 5 fps. -->
      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span id="framerate-legend" class="furniture text-stock-600">Frame rate</span>
        <div class="flex flex-wrap gap-2" role="group" aria-labelledby="framerate-legend">
          <button
            v-for="rate in RATES"
            :key="rate"
            type="button"
            class="ink-button"
            :class="{ 'ink-button--outline': rate !== fps }"
            :aria-pressed="rate === fps"
            @click="fps = rate"
          >
            {{ rate }} fps
          </button>
        </div>
      </div>

      <!-- The clip bar. Ticks are laid down left to right when the rate changes,
           the one authored moment: the rate scores the clip. -->
      <div class="relative mt-6">
        <svg
          class="block h-20 w-full text-stock-950"
          viewBox="0 0 800 80"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`demo.mp4 cut at ${fps} frames per second: ${frames} frames, one sheet each. The frame followed below is frame ${pickedIndex} at ${stampFor(pickedIndex, fps)}.`"
        >
          <!-- the clip itself -->
          <rect
            x="0.5" y="0.5" width="799" height="35"
            fill="var(--color-stock-100)" stroke="var(--color-stock-400)"
            vector-effect="non-scaling-stroke"
          />

          <g :key="fps" class="scored">
            <line
              v-for="(x, i) in ticks"
              :key="i"
              :x1="x" y1="14" :x2="x" y2="35"
              stroke="var(--color-stock-500)"
              vector-effect="non-scaling-stroke"
            />
          </g>

          <!-- one tick, followed down to what it becomes -->
          <line
            :x1="pickedX" y1="0" :x2="pickedX" y2="35"
            stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"
          />
          <path
            :d="`M ${pickedX} 35 L ${pickedX} 79.5 L 0 79.5`"
            fill="none" stroke="currentColor" vector-effect="non-scaling-stroke"
          />
          <line
            x1="0" y1="79.5" x2="800" y2="79.5"
            stroke="var(--color-stock-400)" vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div class="mt-4">
        <dl class="furniture flex flex-wrap gap-x-8 gap-y-2 border-b border-stock-400 pb-2.5 text-stock-600">
          <div class="docket-field"><dt>Clip</dt><dd>demo.mp4</dd></div>
          <div class="docket-field"><dt>Rate</dt><dd>{{ fps }} fps</dd></div>
          <div class="docket-field"><dt>Length</dt><dd>{{ DURATION }} s · example</dd></div>
          <div class="docket-field"><dt>Frames</dt><dd>{{ frames }}</dd></div>
          <div class="docket-field"><dt>Each frame</dt><dd>One sheet</dd></div>
        </dl>

        <p class="furniture px-4 pt-3 text-stock-600">The marked frame, as a sheet</p>
        <dl class="furniture grid grid-cols-2 gap-x-8 gap-y-3 px-4 pb-4 pt-3 text-stock-600 sm:grid-cols-4">
          <div v-for="[label, value] in sheet" :key="label" class="flex flex-col gap-1">
            <dt>{{ label }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
      </div>

      <p class="furniture mt-3 text-stock-600">Illustrative extraction · demo.mp4</p>
    </div>
  </section>
</template>

<style scoped>
/* The rate scores the clip: ticks are wiped on from the leading edge, off the
   same curve as ink-down. Transform/opacity would move the ticks; a clip-path
   wipe leaves each one exactly where the arithmetic put it. */
@keyframes score-clip {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}
.scored {
  animation: score-clip 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .scored { animation: none; }
}
</style>
