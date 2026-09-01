<script setup lang="ts">
import { CLASS_INKS } from '~/utils/inks'

definePageMeta({
  layout: 'landing',
  // Someone with a live session lands here from a bookmark; the front door is
  // not where their work is.
  middleware: [
    () => {
      const { isAuthenticated } = useAuth()
      if (isAuthenticated.value) return navigateTo('/homepage')
    }
  ]
})

const contactEmail = useRuntimeConfig().public.contactEmail as string
const mailto = computed(() =>
  contactEmail ? `mailto:${contactEmail}?subject=Labeloo%20setup` : ''
)

/**
 * The run, in the order a job actually moves. Every line here is a capability
 * the product has today; nothing on this page describes work that is planned.
 */
const run = [
  {
    n: '01',
    state: 'Upload',
    title: 'Images, or a clip that becomes frames',
    body: 'Drop in images, or a video and a frame rate. Every frame becomes its own sheet, carrying the clip name, the frame index and its timestamp — so a clip is a queue, not a blob.',
    facts: [['Takes', 'Images · video'], ['Frame becomes', 'One sheet']],
    widget: 'frames'
  },
  {
    n: '02',
    state: 'Pool',
    title: 'Work handed out, not fought over',
    body: 'Sheets arrive in a pool. Hand out five or five hundred, to a person or to everyone, and watch them move: unassigned, annotating, completed. Organizations, projects, roles and permissions sit underneath.',
    facts: [['Scopes', 'Org · project'], ['States', 'Three']],
    plate: { src: '/landing/pool.jpg', alt: 'The Annotate section of a project, showing the task pool and the controls that hand work out', slug: 'Project → Annotate · handing out a pool of 31 sheets' }
  },
  {
    n: '03',
    state: 'Assist',
    title: 'Click the object; the ink lays itself down',
    body: 'One click segments the object. Right-click carves a piece back out. Give the shape a class and it prints in that class’s ink. Rectangle, polygon, circle, point, line and freehand are still there for when the model is wrong.',
    facts: [['One click', '~0.1 s warm'], ['Fallbacks', 'Six tools']],
    plate: { src: '/landing/assist.jpg', alt: 'The annotation screen with a mask traced around a cat, assigned to the class cat', slug: 'Annotate · one click, one mask, inked as “cat”' }
  },
  {
    n: '04',
    state: 'Track',
    title: 'Mark it once, follow it to the end of the clip',
    body: 'Point at the object on any frame and press Track. Labeloo carries it through the rest, masks landing frame by frame as they are computed. Several objects at once, each in its own ink — and the wait is shown as real frames and real seconds.',
    facts: [['Per frame', '1.15 s on GPU'], ['On a CPU', '~3 s']],
    plate: { src: '/landing/track.jpg', alt: 'The video tracking screen mid-run, a bridge masked and the progress reading one of thirty frames', slug: 'Video tracking · a run in progress, with its honest estimate' }
  },
  {
    n: '05',
    state: 'Export',
    title: 'The records come back out',
    body: 'Every mark is an annotation record attached to its task, and the export endpoint hands them back. The dataset is yours; nothing about the format is ours to keep.',
    facts: [['Output', 'Annotation records'], ['Held in', 'Your database']],
    widget: 'formats'
  }
]

/** Measured on an Apple M-series machine, same model, same clip. */
const timings = [
  ['Single click, image', '~0.1 s', 'once the sheet is embedded'],
  ['Video, per frame, GPU', '1.15 s', 'Apple GPU, sam2.1 small'],
  ['Video, per frame, CPU', '~3 s', 'the same run without a GPU']
]

useHead({
  title: 'Labeloo — image and video annotation',
  meta: [{
    name: 'description',
    content: 'Click an object and it is segmented; mark it once and it is followed to the end of the clip. Team workflow, keyboard-first, self-hosted.'
  }]
})
</script>

<template>
  <!--
    SURFACE CONTRACT — the press run — seed 704b040b

    THESIS: A job walked through its states, in order. Refuses the category's
    hero-screenshot-then-three-feature-cards, which shows a tool and never the
    work; this page shows the work and lets the tool appear inside it.

    OWN-WORLD: The house world, inherited unchanged — uncoated stock #F4F2EC,
    ink #141414, calibrated grey wherever an image is judged, process inks as
    data only, hairline rules, registration marks, square corners, no shadows.
    Archivo reads, Sometype Mono registers; three voices, never one.

    STORY: Someone evaluating an annotation tool watches one real job move from
    upload to export, sees the model do the work in real captures, reads the
    real wait in seconds, and asks for a setup.

    FIRST VIEWPORT: Docket strip; one line of hook at display size; the two
    controls beneath it with Contact filled; the assist plate at right, hairline
    framed with registration marks. The colour bar rules off the fold.

    FORM: The press run, candidate 3 of the ordered list, seed 704b040b.

    FINISH: unreviewed and undocumented is unfinished; this build ends with the
    finish review, the verdict, and DESIGN.md
  -->

  <!-- ── Hook ─────────────────────────────────────────────────────────────── -->
  <section class="mx-auto w-full max-w-7xl px-4 pb-14 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
    <div class="max-w-3xl">
      <div>
        <p class="furniture text-stock-600">Image and video annotation</p>

        <h1 class="mt-4 text-balance text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.035em] sm:text-[3.4rem]">
          Click the object.<br />The ink lays itself down.
        </h1>

        <p class="mt-6 max-w-xl text-[17px] leading-relaxed text-stock-700">
          One click segments an object, and one click follows it to the end of a clip.
          Around it sits the part teams actually live in: a pool of work, roles, and a
          queue that always knows whose turn it is.
        </p>

        <div class="mt-9 flex flex-wrap items-center gap-3">
          <a v-if="mailto" :href="mailto" class="ink-button">Contact us about a setup</a>
          <NuxtLink v-else to="/login" class="ink-button">Sign in</NuxtLink>
          <NuxtLink
            v-if="mailto"
            to="/login"
            class="ink-button ink-button--outline"
          >Sign in</NuxtLink>
        </div>

        <p class="furniture mt-4 text-stock-600">
          Accounts are opened by an organization admin
        </p>
      </div>

    </div>

    <!--
      The clip demo carries the whole offer, so it gets the full measure rather
      than a column beside the copy: a filmstrip read left to right needs width
      to be read at all.
    -->
    <div class="mt-12 lg:mt-14">
      <LandTrackDemo />
    </div>
  </section>

  <!-- The colour bar: the same one that rules off a plate on the annotation
       screen. It is the world's signature, and it is the only decoration here. -->
  <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-1.5 w-full">
      <span v-for="ink in CLASS_INKS" :key="ink" class="h-full flex-1" :style="{ backgroundColor: ink }" />
    </div>
  </div>

  <!-- ── The run ──────────────────────────────────────────────────────────── -->
  <section class="mx-auto w-full max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8">
    <h2 class="text-[1.9rem] font-semibold tracking-[-0.03em]">How a job moves</h2>
    <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-stock-700">
      Five states, in the order they happen. Every screen below is a capture of the
      running product, not a drawing of one.
    </p>

    <!-- The spine. On a narrow screen it wraps rather than scrolls: five short
         words are cheaper to reflow than to hide behind a swipe. -->
    <ol class="furniture mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-stock-400 py-3 text-stock-600">
      <li v-for="(step, i) in run" :key="step.state" class="flex items-center gap-3">
        <span v-if="i > 0" aria-hidden="true" class="text-stock-600">→</span>
        <span class="text-stock-950">{{ step.state }}</span>
      </li>
    </ol>
  </section>

  <section
    v-for="step in run"
    :key="step.n"
    class="mx-auto w-full max-w-7xl border-b border-stock-400 px-4 py-12 last:border-b-0 sm:px-6 lg:px-8 lg:py-16"
  >
    <div class="grid gap-8 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] lg:gap-12">
      <div class="furniture flex items-baseline gap-3 text-stock-600 lg:block">
        <span class="text-stock-950">{{ step.n }}</span>
        <span class="lg:mt-1 lg:block">{{ step.state }}</span>
      </div>

      <!-- A plate sits beside the copy; a drawn widget takes the full measure
           under it, because a timeline or a file tree read across, not down. -->
      <div class="grid gap-8 lg:gap-12" :class="step.plate ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]' : ''">
        <div>
          <h3 class="text-[1.45rem] font-semibold leading-tight tracking-[-0.025em]">{{ step.title }}</h3>
          <p class="mt-3 max-w-xl text-[15px] leading-relaxed text-stock-700">{{ step.body }}</p>

          <dl class="furniture mt-6 flex flex-wrap gap-x-8 gap-y-2 text-stock-600">
            <div v-for="[label, value] in step.facts" :key="label" class="docket-field">
              <dt>{{ label }}</dt>
              <dd>{{ value }}</dd>
            </div>
          </dl>
        </div>

        <LandPlate v-if="step.plate" v-bind="step.plate" />
        <LandFrameRate v-else-if="step.widget === 'frames'" class="mt-2" />
        <LandFormatsPanel v-else-if="step.widget === 'formats'" class="mt-2" />
      </div>
    </div>
  </section>

  <!-- The diagram carries its own heading and measure; wrapping it in a second
       section only printed two headings over one idea. -->
  <div class="border-t border-stock-400">
    <LandTeamDiagram />
  </div>

  <!-- ── The wait, in seconds ─────────────────────────────────────────────── -->
  <section class="border-t border-stock-400 bg-stock-200">
    <div class="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 class="text-[1.9rem] font-semibold tracking-[-0.03em]">What the model costs you in time</h2>
      <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-stock-700">
        Tracking is not instant and the interface never pretends it is: a run shows the
        frames done and the seconds left. These are measurements from one machine, not
        a promise about yours — the model runs on a service you point the organization at,
        so the number moves with the hardware behind it.
      </p>

      <dl class="mt-8 border-t border-stock-400">
        <div
          v-for="[what, figure, note] in timings"
          :key="what"
          class="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-stock-400 py-3.5"
        >
          <dt class="furniture w-full text-stock-600 sm:w-64">{{ what }}</dt>
          <dd class="text-[1.15rem] font-semibold tabular-nums tracking-tight">{{ figure }}</dd>
          <dd class="furniture text-stock-600">{{ note }}</dd>
        </div>
      </dl>
    </div>
  </section>

  <!-- ── The one action ───────────────────────────────────────────────────── -->
  <section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
    <div class="relative border border-stock-400 px-6 py-12 text-center sm:px-10">
      <span class="regmark text-stock-400" style="left: 14px; top: 14px" />
      <span class="regmark text-stock-400" style="right: 14px; top: 14px" />
      <span class="regmark text-stock-400" style="left: 14px; bottom: 14px" />
      <span class="regmark text-stock-400" style="right: 14px; bottom: 14px" />

      <h2 class="text-[2rem] font-semibold tracking-[-0.03em]">Put it on your own data</h2>
      <p class="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-stock-700">
        Labeloo runs on your own machines, with the segmentation service addressed per
        organization — so the model can sit on a laptop today and a GPU box tomorrow
        without touching the app. Tell us what you are labelling and we will get you set up.
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a v-if="mailto" :href="mailto" class="ink-button">Contact us about a setup</a>
        <NuxtLink to="/login" class="ink-button" :class="mailto ? 'ink-button--outline' : ''">Sign in</NuxtLink>
      </div>

      <!--
        A working account, so the page can be tried rather than only read. It is
        an ordinary member of the demo organization, not an administrator: a
        credential printed in public should not be able to delete anything.
        It signs in wherever this build's API is reachable.
      -->
      <div class="mx-auto mt-10 max-w-md border-t border-stock-400 pt-8 text-left">
        <p class="furniture text-stock-600">Try it with a demo account</p>
        <dl class="furniture mt-4 space-y-2 text-stock-600">
          <div class="flex items-baseline justify-between gap-4">
            <dt>Email</dt>
            <dd class="font-sans text-[13px] font-medium normal-case tracking-normal text-stock-950">demo@labeloo.app</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4">
            <dt>Password</dt>
            <dd class="font-sans text-[13px] font-medium normal-case tracking-normal text-stock-950">LabelooDemo2026</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4">
            <dt>Signs in as</dt>
            <dd class="font-sans text-[13px] font-medium normal-case tracking-normal text-stock-950">Member, with six sheets waiting</dd>
          </div>
        </dl>
      </div>

      <!-- Shown only to whoever is running an unconfigured copy: better a line of
           setup instruction here than an invented address printed as fact. -->
      <p v-if="!mailto" class="furniture mt-6 text-stock-600">
        Set NUXT_PUBLIC_CONTACT_EMAIL to turn on the contact action
      </p>
    </div>
  </section>
</template>
