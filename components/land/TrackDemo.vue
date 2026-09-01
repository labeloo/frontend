<script setup lang="ts">
/**
 * The claim: you click an object once, and the whole clip comes back annotated.
 *
 * A screenshot of the video screen can show a mask, but it cannot show the one
 * thing worth knowing — that the human effort stops after the first frame. So
 * this is drawn rather than captured: a clip laid out as what it actually is,
 * a row of frames, with one click landing on frame 01 and the ink walking to
 * the end of the strip on its own.
 *
 * It is built as three registered layers over one grid — scene, ink, record —
 * each revealed by the same eight-step wipe. That is why it is a wipe and not
 * eight separate animations: the house's one authored moment is `ink-down`, a
 * mask that prints from its leading edge instead of fading in, and a pass down
 * a filmstrip is that same gesture at strip scale. One clip-path per layer also
 * means the loop restarts on a single boundary with nothing left half-lit.
 *
 * Every rule below is written so the STATIC state is the finished state: fully
 * masked, fully saved, counter reading 8 / 8. Motion only takes it away and
 * gives it back, which is what makes the reduced-motion case the same picture
 * rather than a second composition to keep in sync.
 */

/**
 * Eight frames of one clip. `a` is the tracked object crossing to the right;
 * `b` is the second one drifting the other way, kept in its own lane above the
 * horizon so the two masks never sit on top of each other — two objects that
 * overlap read as one confusing object at this size.
 */
const FRAMES = Array.from({ length: 8 }, (_, i) => ({
  n: String(i + 1).padStart(2, '0'),
  a: 8 + i * 6,
  b: 72 - i * 5,
  bY: 20 + ([0, -3, -5, -3, 0, -3, -5, -3][i] as number)
}))

/** One closed contour, so the mask that traces it is one contour too. */
const CAR = 'M0 13 L0 8 L6 8 L10 2 L22 2 L26 8 L30 8 L30 13 L26 13 Q23 17.5 20 13 L11 13 Q8 17.5 5 13 Z'

/** Nine readings; the reel steps down one line per frame masked. */
const READINGS = Array.from({ length: 9 }, (_, i) => `${i} / 8`)
</script>

<template>
  <figure class="relative">
    <div class="relative border border-stock-400 bg-stock-50">
      <!-- Docket: what the strip is, and how much of it the model has done. -->
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stock-400 px-3 py-2.5">
        <p class="furniture text-stock-600">One clip · 8 frames · 2 objects</p>

        <dl class="furniture text-stock-600">
          <div class="docket-field reel-field">
            <dt>Masked</dt>
            <dd>
              <span class="reel-window" aria-hidden="true">
                <span class="reel">
                  <span v-for="r in READINGS" :key="r">{{ r }}</span>
                </span>
              </span>
              <span class="sr-only">8 of 8</span>
            </dd>
          </div>
        </dl>
      </div>

      <div class="px-3 pb-3 pt-2.5">
        <!-- The three beats, sitting over the region of the strip each one owns. -->
        <p class="furniture mb-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-stock-600">
          <span class="text-stock-950">One click</span>
          <span>It follows the object</span>
          <span>Every frame saved</span>
        </p>

        <div class="strip">
          <!-- Layer 1 · the scene. A static camera; the objects move. -->
          <div class="lay">
            <div v-for="f in FRAMES" :key="`s-${f.n}`" class="cell">
              <div class="pic">
                <svg viewBox="0 0 84 63" aria-hidden="true" focusable="false">
                  <rect x="0" y="0" width="84" height="63" fill="#767674" />
                  <rect x="0" y="44" width="84" height="19" fill="#6A6A68" />
                  <rect x="12" y="34" width="2" height="10" fill="#5C5C5A" />
                  <rect x="66" y="30" width="2" height="14" fill="#5C5C5A" />
                  <path :d="CAR" fill="var(--color-stage-700)" :transform="`translate(${f.a} 28.5)`" />
                  <circle :cx="f.b" :cy="f.bY" r="4" fill="var(--color-stage-700)" />
                  <rect x="0.5" y="0.5" width="83" height="62" fill="none" stroke="#C9C5BA" />
                </svg>
              </div>
              <p class="slug slug--open">{{ f.n }}</p>
            </div>
          </div>

          <!-- Layer 2 · the ink. Cyan is the clicked object, magenta the second
               one; both propagate on the same pass, each in its own ink. -->
          <div class="lay lay--ink">
            <div v-for="(f, i) in FRAMES" :key="`i-${f.n}`" class="cell">
              <div class="pic">
                <svg viewBox="0 0 84 63" aria-hidden="true" focusable="false">
                  <path
                    :d="CAR"
                    fill="rgba(0, 147, 211, 0.30)"
                    stroke="#0093D3"
                    stroke-width="1.6"
                    :transform="`translate(${f.a} 28.5)`"
                  />
                  <circle
                    :cx="f.b"
                    :cy="f.bY"
                    r="4"
                    fill="rgba(214, 0, 110, 0.28)"
                    stroke="#D6006E"
                    stroke-width="1.6"
                  />
                  <!-- The prompt point, on frame 01 only: the whole human effort. -->
                  <circle
                    v-if="i === 0"
                    cx="23"
                    cy="37"
                    r="2.6"
                    fill="#F4F2EC"
                    stroke="#141414"
                    stroke-width="1.2"
                  />
                </svg>
              </div>
              <p class="slug slug--spacer">{{ f.n }}</p>
            </div>
          </div>

          <!-- Layer 3 · the record. A frame that has been saved carries an ink
               keyline, a check, and a slug reversed out of solid ink. -->
          <!-- The frame numbers are already announced by the scene layer; this one
               repeats them purely as a visual state. -->
          <div class="lay lay--saved" aria-hidden="true">
            <div v-for="f in FRAMES" :key="`d-${f.n}`" class="cell">
              <div class="pic">
                <svg viewBox="0 0 84 63" aria-hidden="true" focusable="false">
                  <rect x="0.5" y="0.5" width="83" height="62" fill="none" stroke="#141414" />
                  <rect x="4" y="4" width="13" height="13" fill="#F4F2EC" />
                  <path
                    d="M7 10.8 L9.7 13.6 L14.2 7.6"
                    fill="none"
                    stroke="#141414"
                    stroke-width="1.8"
                  />
                </svg>
              </div>
              <p class="slug slug--saved">{{ f.n }}</p>
            </div>
          </div>

          <!-- The pass, sitting over the frame the model is on. -->
          <span class="head" aria-hidden="true" />

          <!-- The cursor, on frame 01's object and nowhere else, ever. -->
          <div class="lay lay--cursor" aria-hidden="true">
            <div class="cell">
              <div class="pic">
                <svg class="cursor" viewBox="0 0 22 22" width="18" height="18" focusable="false">
                  <!-- Backed in stock so an ink reticle still reads where it
                       matters: sitting on top of a dark object on grey. -->
                  <path
                    d="M11 0 V7 M11 15 V22 M0 11 H7 M15 11 H22"
                    stroke="#F4F2EC"
                    stroke-width="3"
                    fill="none"
                  />
                  <path
                    d="M11 0 V7 M11 15 V22 M0 11 H7 M15 11 H22"
                    stroke="#141414"
                    stroke-width="1.4"
                    fill="none"
                  />
                  <rect class="burst" x="3" y="3" width="16" height="16" fill="none" stroke="#141414" stroke-width="1.4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- What the run cost, and what it left behind. -->
      <dl class="furniture flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-stock-400 px-3 py-2.5 text-stock-600">
        <!-- True for the whole run, so it is printed for the whole run. Only
             the output waits for the run that produced it. -->
        <div class="docket-field">
          <dt>Human work</dt>
          <dd>One click per object</dd>
        </div>
        <div class="docket-field landed">
          <dt>Output</dt>
          <dd>8 annotation records</dd>
        </div>
      </dl>
    </div>

    <span class="regmark text-stock-400" style="left: -7px; top: -7px" />
    <span class="regmark text-stock-400" style="right: -7px; top: -7px" />
    <span class="regmark text-stock-400" style="left: -7px; bottom: -7px" />
    <span class="regmark text-stock-400" style="right: -7px; bottom: -7px" />
  </figure>
</template>

<style scoped>
/* One 9s clock. Every animation below is a window cut out of it, which is the
   only way three layers, a counter and a cursor stay in register over a loop. */
.strip {
  position: relative;
}

.lay {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
}

.lay--ink,
.lay--saved,
.lay--cursor {
  position: absolute;
  inset: 0;
}

/* The gutter is padding inside the cell, never a grid gap: the wipe steps in
   exact eighths, so a gap would put the edge off the frame boundary. */
.cell {
  padding-right: 5%;
  min-width: 0;
}

.pic {
  aspect-ratio: 84 / 63;
  margin-bottom: 4px;
  position: relative;
}

.pic svg {
  display: block;
  width: 100%;
  height: 100%;
}

.slug {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  line-height: 14px;
  padding: 3px 0;
  text-align: center;
}

.slug--open {
  color: var(--color-stock-600);
}

/* The ink layer holds no slug of its own; it only has to occupy the same box
   so the three layers keep the same geometry. */
.slug--spacer {
  visibility: hidden;
}

/* A saved frame's slug is an inked rectangle — the record, printed. Opaque, so
   it covers the open slug beneath it outright. */
.slug--saved {
  background: var(--color-stock-950);
  color: var(--color-stock-50);
}

/* ── The pass ─────────────────────────────────────────────────────────────
   One cell wide, its right edge exactly the wipe edge, so the eye is told
   where the model currently is rather than left to infer it. */
.head {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12.5%;
  border-right: 1px solid var(--color-stock-950);
  opacity: 0;
  transform: translateX(-100%);
  animation: pass-head 9s linear infinite;
}

.lay--cursor {
  pointer-events: none;
}

.lay--cursor .cell {
  grid-column: 1;
}

/* 27.4% / 58.7% is the tracked object's centre inside frame 01 — the same
   point the prompt mark prints on. */
.lay--cursor .cursor {
  position: absolute;
  /* Fixed at 18px, and specific enough to beat the `.pic svg` rule above: the
     cursor is a pointer, not part of the picture, so it must not scale with
     the frames the way the plates do — and at frame size it would swallow the
     mask it is meant to be asking for. */
  width: 18px;
  height: 18px;
  left: 27.4%;
  top: 58.7%;
  margin-left: -9px;
  margin-top: -9px;
  transform-origin: center;
  animation: cursor-in 9s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.burst {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: burst 9s linear infinite;
}

.reel-field {
  /* An overflow-clipped box takes its bottom edge as its baseline, which drops
     the figure off the label's baseline. Centre the pair instead of faking it. */
  align-items: center;
}

.reel-window {
  display: block;
  height: 15px;
  overflow: hidden;
}

.reel {
  display: block;
  /* Resting on the last reading: the static state is the finished state. */
  transform: translateY(-88.8889%);
  animation: reel-count 9s linear infinite;
}

.reel span {
  display: block;
  line-height: 15px;
}

.landed {
  animation: landed 9s linear infinite;
}

/* ── The wipes ────────────────────────────────────────────────────────────
   steps(8, start) puts the edge at the right of frame k for k = 1…8, so the
   mask lands one whole frame at a time instead of sliding across them. */
.lay--ink {
  animation: strip-print 9s linear infinite;
}

.lay--saved {
  animation: strip-save 9s linear infinite;
}

@keyframes strip-print {
  0%, 20% { clip-path: inset(0 100% 0 0); animation-timing-function: steps(8, start); }
  70%, 100% { clip-path: inset(0 0 0 0); }
}

/* The record trails the ink by half a second: a frame is saved because it was
   masked, and the order is the point. */
@keyframes strip-save {
  0%, 26% { clip-path: inset(0 100% 0 0); animation-timing-function: steps(8, start); }
  76%, 100% { clip-path: inset(0 0 0 0); }
}

@keyframes reel-count {
  0%, 20% { transform: translateY(0); animation-timing-function: steps(8, start); }
  70%, 100% { transform: translateY(-88.8889%); }
}

@keyframes pass-head {
  0%, 19% { opacity: 0; transform: translateX(-100%); }
  20% { opacity: 1; transform: translateX(-100%); animation-timing-function: steps(8, start); }
  70% { opacity: 1; transform: translateX(700%); }
  71%, 100% { opacity: 0; transform: translateX(700%); }
}

@keyframes cursor-in {
  0% { opacity: 0; transform: translate(9rem, 1.6rem); }
  7% { opacity: 1; transform: translate(7rem, 1.3rem); }
  17%, 18% { opacity: 1; transform: translate(0, 0) scale(1); }
  19% { opacity: 1; transform: translate(0, 0) scale(0.8); }
  21% { opacity: 1; transform: translate(0, 0) scale(1); }
  26% { opacity: 1; transform: translate(0, 0) scale(1); }
  32%, 100% { opacity: 0; transform: translate(0, 0) scale(1); }
}

@keyframes burst {
  0%, 19% { opacity: 0; transform: scale(0.4); }
  20% { opacity: 1; transform: scale(0.5); }
  30%, 100% { opacity: 0; transform: scale(2.2); }
}

@keyframes landed {
  0%, 76% { opacity: 0; }
  82%, 100% { opacity: 1; }
}

/* The still composition is already written above: the finished strip. Removing
   the motion leaves the whole claim standing — every frame masked, every frame
   saved, the counter at 8 / 8 and the cursor resting on the one click. */
@media (prefers-reduced-motion: reduce) {
  .lay--ink,
  .lay--saved,
  .lay--cursor .cursor,
  .reel,
  .burst,
  .head,
  .landed {
    animation: none;
  }
}
</style>
