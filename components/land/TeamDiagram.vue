<script setup lang="ts">
/**
 * The permission model, drawn.
 *
 * CLAIM: roles exist at two scopes with two different sets of flags, the scopes
 * are attached to two different levels of one nesting (organization → project →
 * task → annotation), and work moves out of a pool into a named holder before it
 * advances through its three states.
 *
 * Drawn rather than written because the shape IS the argument. A paragraph
 * saying "role-based access control at organization and project level" is the
 * sentence every tool in this category prints; four hairline rectangles inside
 * each other, with a role tag hanging off two of them, is checkable at a glance.
 *
 * The grid is real seeded data, read off the backend seed, not an illustration:
 * the project "user" column is empty in every row, which is a stronger statement
 * about the default than any sentence would be. Flags run DOWN and roles run
 * ACROSS — the transpose of the usual table — because eight flag names cannot be
 * column heads at 390px without rotating type, and a rotated label is furniture
 * pretending to be decoration.
 *
 * Motion is the one authored moment, and it is the same press gesture as
 * `ink-down`: a sheet leaves the pool, crosses the assignment boundary into a
 * member's lane, and the ink then wipes across it from the leading edge as it
 * advances. Progress is the fill, so state and position say the same thing
 * twice — which is what makes the frozen reduced-motion frame still readable.
 */

type Grid = {
  title: string
  attached: string
  rows: [flag: string, admin: boolean, user: boolean][]
}

/** Both grids are the seeded roles exactly as the database ships them. */
const grids: Grid[] = [
  {
    title: 'Organization role',
    attached: 'Set on the organization',
    rows: [
      ['Admin', true, false],
      ['Edit organization', true, false],
      ['Delete organization', true, false],
      ['Edit members', true, false],
      ['Edit roles', true, false],
      ['Edit projects', true, true],
      ['Create projects', true, true],
      ['Delete projects', true, false]
    ]
  },
  {
    title: 'Project role',
    attached: 'Set on the project',
    rows: [
      ['Edit project', true, false],
      ['Delete project', true, false],
      ['Edit members', true, false],
      ['Edit roles', true, false],
      ['Upload files', true, false]
    ]
  }
]

/**
 * Three sheets on one 12s path, started a quarter and a half turn apart so the
 * diagram is populated at every state the moment it is on screen rather than
 * filling up over the first ten seconds. `x` and `fill` freeze each lane at the
 * state its delay puts it in, which is what the reduced-motion frame shows.
 */
const lanes = [
  { name: 'Member A', delay: '-9s',   x: 'calc(100% - 12px)', fill: '1' },
  { name: 'Member B', delay: '-4.5s', x: 'calc(50% - 6px)',   fill: '0.5' },
  { name: 'Member C', delay: '0s',    x: '62px',              fill: '0' }
]

/** The sheets already in the pool, at fixed offsets inside the pool rectangle. */
const poolSlots = [8, 26, 44]
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
    <p class="furniture text-stock-600">Teams, roles, assignment</p>

    <h2 class="mt-4 text-[1.9rem] font-semibold tracking-[-0.03em]">
      Who may do what, and who holds which sheet
    </h2>

    <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-stock-700">
      A role is set twice — once on the organization, once on the project — and each
      scope carries its own flags. Work arrives as a pool, and every task records who
      it is assigned to and how far it has got.
    </p>

    <div class="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <!-- ── Where a role lives: the nesting, with a scope tag on two levels ── -->
      <div class="">
        <p class="furniture border-b border-stock-400 pb-2 text-stock-600">
          Where a role lives
        </p>

        <div class="p-4">
          <div class="border border-stock-400 p-3">
            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p class="furniture text-stock-950">Organization</p>
              <p class="furniture flex items-center gap-2 text-stock-600">
                <span aria-hidden="true" class="h-px w-5 bg-stock-400" />
                Organization role · 8 flags
              </p>
            </div>

            <div class="mt-3 border border-stock-400 p-3">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p class="furniture text-stock-950">Project</p>
                <p class="furniture flex items-center gap-2 text-stock-600">
                  <span aria-hidden="true" class="h-px w-5 bg-stock-400" />
                  Project role · 5 flags
                </p>
              </div>

              <div class="mt-3 border border-stock-400 p-3">
                <div class="furniture flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p class="text-stock-950">Task</p>
                  <dl class="docket-field">
                    <dt>Carries</dt>
                    <dd>Assignee, status</dd>
                  </dl>
                </div>

                <div class="mt-3 border border-stock-400 px-3 py-2.5">
                  <p class="furniture text-stock-950">Annotation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── What a role may do: the seeded flags, filled mark for true ─────── -->
      <div class="">
        <p class="furniture border-b border-stock-400 pb-2 text-stock-600">
          What a seeded role may do
        </p>

        <div class="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <table v-for="grid in grids" :key="grid.title" class="furniture w-auto self-start text-stock-600">
            <caption class="mb-2.5 text-left">
              <span class="text-stock-950">{{ grid.title }}</span>
              <span class="ml-2">{{ grid.attached }}</span>
            </caption>
            <thead>
              <tr class="border-y border-stock-400">
                <th scope="col" class="py-2 pr-2 text-left font-medium">Flag</th>
                <th scope="col" class="w-12 py-2 text-center font-medium text-stock-950">
                  Admin
                </th>
                <th scope="col" class="w-12 py-2 text-center font-medium text-stock-950">
                  User
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="[flag, byAdmin, byUser] in grid.rows"
                :key="flag"
                class=""
              >
                <th scope="row" class="py-[7px] pr-8 text-left font-sans text-[13px] font-medium normal-case tracking-normal text-stock-950">{{ flag }}</th>
                <td class="w-12 py-[7px] text-center">
                  <span v-if="byAdmin" class="inline-block h-[9px] w-[9px] bg-stock-950 align-middle" />
                  <span class="sr-only">{{ byAdmin ? 'True' : 'False' }}</span>
                </td>
                <td class="w-12 py-[7px] text-center">
                  <span v-if="byUser" class="inline-block h-[9px] w-[9px] bg-stock-950 align-middle" />
                  <span class="sr-only">{{ byUser ? 'True' : 'False' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="furniture flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stock-400 px-4 py-2.5 text-stock-600">
          <span aria-hidden="true" class="inline-block h-[9px] w-[9px] bg-stock-950" />
          <span>True</span>
          <span aria-hidden="true" class="h-px w-4 bg-stock-400" />
          <span>Empty cell, false</span>
        </p>
      </div>
    </div>

    <!-- ── How work is handed out: the one authored motion ───────────────── -->
    <div class="mt-12">
      <p class="furniture border-b border-stock-400 pb-2 text-stock-600">
        How work is handed out
      </p>

      <div class="p-4">
        <p class="sr-only">
          Sheets wait unassigned in a pool, are handed to a member, and then advance
          to annotating and completed inside that member's lane.
        </p>

        <!-- The lifecycle axis. Three equal tracks, so the labels can never
             collide however wide the mono sets. -->
        <div class="flex items-baseline gap-2">
          <div class="w-[4.25rem] shrink-0" />
          <div class="furniture grid flex-1 grid-cols-3 text-stock-600">
            <span>Unassigned</span>
            <span class="text-center">Annotating</span>
            <span class="text-right">Completed</span>
          </div>
        </div>

        <div class="mt-2.5 flex gap-2">
          <dl class="w-[4.25rem] shrink-0">
            <div v-for="lane in lanes" :key="lane.name" class="furniture flex h-10 items-center">
              <dt class="sr-only">Assigned to</dt>
              <dd>{{ lane.name }}</dd>
            </div>
          </dl>

          <div class="relative flex-1">
            <!-- The pool, and the two station rules the sheets come to rest on. -->
            <div aria-hidden="true" class="absolute inset-y-0 left-0 w-20 border border-stock-400" />
            <div aria-hidden="true" class="absolute inset-y-0 left-1/2 w-px bg-stock-400" />
            <div aria-hidden="true" class="absolute inset-y-0 right-0 w-px bg-stock-400" />

            <div
              v-for="lane in lanes"
              :key="lane.name"
              aria-hidden="true"
              class="relative h-10 overflow-hidden"
            >
              <span class="absolute inset-x-0 top-1/2 h-px bg-stock-400" />
              <span v-for="slot in poolSlots" :key="slot" class="sheet" :style="{ left: `${slot}px` }" />
              <span
                class="carrier"
                :style="{ '--delay': lane.delay, '--x': lane.x, '--f': lane.fill }"
              >
                <span class="sheet"><span class="sheet-fill" /></span>
              </span>
            </div>
          </div>
        </div>

        <dl class="furniture mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-stock-400 pt-3 text-stock-600">
          <div class="docket-field">
            <dt>Handed out</dt>
            <dd>In bulk, or claimed</dd>
          </div>
          <div class="docket-field">
            <dt>Bulk asks</dt>
            <dd>How many sheets, and who</dd>
          </div>
          <div class="docket-field">
            <dt>Task carries</dt>
            <dd>Assignee, status</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* A sheet: a small portrait rectangle, keylined in ink. It is never a class, so
   it is never a process ink — the fill is ink, the way a proof is. */
.sheet {
  position: absolute;
  top: 50%;
  left: 0;
  width: 12px;
  height: 15px;
  margin-top: -7.5px;
  border: 1px solid var(--color-stock-950);
  background: var(--color-stock-50);
}

/* The carrier spans the lane, so a percentage in its translate is a percentage
   of the TRACK, not of the 12px sheet. That is what lets one keyframe list park
   a sheet exactly on a station rule at any width. */
.carrier {
  position: absolute;
  inset: 0;
  animation: hand-out 12s cubic-bezier(0.16, 1, 0.3, 1) infinite both;
  animation-delay: var(--delay);
}

.sheet-fill {
  position: absolute;
  inset: 0;
  display: block;
  background: var(--color-stock-950);
  transform-origin: left center;
  transform: scaleX(0);
  animation: sheet-ink 12s cubic-bezier(0.16, 1, 0.3, 1) infinite both;
  animation-delay: var(--delay);
}

/* Pool → the member's lane → the far station. Only transform and opacity. */
@keyframes hand-out {
  0%   { opacity: 0; transform: translateX(62px); }
  5%   { opacity: 1; }
  14%  { transform: translateX(62px); }
  26%  { transform: translateX(calc(50% - 6px)); }
  56%  { transform: translateX(calc(50% - 6px)); }
  68%  { transform: translateX(calc(100% - 12px)); }
  93%  { opacity: 1; transform: translateX(calc(100% - 12px)); }
  100% { opacity: 0; transform: translateX(calc(100% - 12px)); }
}

/* Ink does not fade in, it wipes on from the leading edge. Here the wipe is the
   progress bar as well: half inked is annotating, fully inked is completed. */
@keyframes sheet-ink {
  0%, 26%   { transform: scaleX(0); }
  42%, 56%  { transform: scaleX(0.5); }
  68%, 100% { transform: scaleX(1); }
}

/* Frozen, the diagram still says the whole thing: three sheets, one at each
   station, each inked as far as its state. */
@media (prefers-reduced-motion: reduce) {
  .carrier {
    animation: none;
    opacity: 1;
    transform: translateX(var(--x));
  }
  .sheet-fill {
    animation: none;
    transform: scaleX(var(--f));
  }
}
</style>
