# Design — Separation Proof

Recorded from the built world, not from intention. Seed `cf8bfb03`; the direction
contract lives at the top of `app.vue` and survives the production build.

## The idea

A class is an ink, and an annotation is a separation printed over the plate.

This is not decoration. Before it, every committed shape was drawn in the same
blue and hue carried *state* (selected blue, hovered green), so an annotator
could not tell one class from another without clicking each shape. Now hue
carries the class and nothing else; selection and hover are said with weight and
a wash. The colour bar under the stage and the canvas read the same list, so the
legend cannot disagree with the sheet.

It refuses two defaults: the category's near-black IDE chrome with a neon accent
(what CVAT, Label Studio and the old Labeloo all ship), and the white SaaS
dashboard of rounded cards.

## Two grounds, and why

- **Stock** `#F4F2EC` — uncoated proof paper, for all chrome.
- **Stage** `#767674` — a calibrated neutral grey, used wherever an image is
  being judged.

The split is functional. A white surround blows out a photograph's shadows; a
near-black one glares off its highlights. A retoucher's bench and a press
viewing booth are grey for that reason, and an annotator spends hours doing
exactly that work. There is no dark mode: `colorMode` is locked to `light`
(`nuxt.config.ts`), because a dark alternative would undo the decision.

## Colour

Restrained, and stricter than usual: **the chrome spends no colour on itself.**
Primary, secondary and info all resolve to ink, so a filled control is an inked
rectangle. The only colours on screen are data.

| Role | Token | Value |
|---|---|---|
| Ink (text, filled controls) | `stock-950` | `#141414` — never pure black |
| Secondary ink | `stock-600` | `#67635C` — 5.34:1 on stock |
| Hairline | `stock-400` | `#C9C5BA` |
| Muted furniture (never text) | `stock-500` | `#8E8A80` |
| Stage | `stage-300` | `#767674` |
| Stage bar label | `stage-100` | `#A9A9A7` — 5.78:1 on `stage-800` |
| Correction (errors, destructive) | `correct-500` | `#C4302B` |
| Reflex blue | `reflex-600` | `#1F3A93` |

**Reflex blue is only for the browser's own marks** — focus ring, selection,
caret, `accent-color`. That is what a printer uses it for, and it keeps the hue
from ever reading as a button.

**Class inks** (`utils/inks.ts`) are data-only, ordered as a proof lays them
down: cyan `#0093D3`, magenta `#D6006E`, yellow `#F5C400`, then spots orange,
green, violet, teal, red, and key. An unclassed mark prints in reflex blue.

## Type

- **Archivo** — reading and display. A grotesque drawn for print at small sizes,
  which is what a docket and a colour bar are.
- **Sometype Mono** — registration furniture: labels, figures, coordinates,
  frame counts. Monospace here is doing measurement, not dressing up as
  technical.

`.furniture` is the workhorse: 10.5px, `0.14em`, caps, tabular figures. Headings
are 600 at `-0.02em` with `text-wrap: balance`.

## Form

Square. `--radius-*` caps at 2px and `app.config.ts` forces `rounded-none` on the
component library, because printer's furniture has no rounded corners.

Elevation is declared once, as a **hairline** — there are no box-shadows in
`components/` or `pages/`. Print has no shadows.

Stock is never one flat colour: two very weak radial washes drift it warm at one
corner and cool at the other (`main.css`). No texture image, no imitation paper.

## Furniture

- **Docket** — the strip of facts along a sheet's edge. Fields drop
  progressively at `md`/`lg`/`xl`.
- **Registration crosses** — drawn geometry, never a glyph. On the image screen
  they live *inside* the Konva stage so they zoom and pan with the plate.
- **Colour bar** — key chip, swatch, name, `×n` density. Present on both
  annotation screens.
- **Ink button** — a filled ink rectangle, mono caps, zero radius; reflex blue
  on hover.
- **Correction slip** — one `aria-live` notice channel for everything that
  happens to the annotator's work, success and failure alike.

## Motion

One authored moment: `ink-down`. A mask does not fade in, it prints — wiped from
the leading edge the way a sheet leaves a press. It fires on the video screen's
tracked masks (CSS `clip-path`) and on the image screen's magic-stick mask (a
Konva tween off the same curve). Honoured under `prefers-reduced-motion`.

## Layout law

Assistance is the default path, so the ink tray puts the magic stick alone at the
top above a rule, with the manual tools below it. The default tool on a fresh
sheet is the magic stick.

Every tool prints its key. On the video screen the key map is printed along the
filmstrip.

## Responsive

Both annotation screens refuse touch-only devices and windows under 1024px,
replacing the layout with a panel that says why and offers a way back. Marking an
edge to the pixel needs a pointer and room for the plate; a collapsed canvas
would be a trap that quietly degrades the dataset. The gate is
`(pointer: coarse)` plus a width query.

## Known gaps

- Roughly 20 components (organization settings, project creation, users and
  roles, task assignment) were moved onto these tokens mechanically but not
  composed. They still carry nested cards, pills and a gradient progress bar.
- The video screen has fit-to-stage but no zoom or pan.
- The image screen's tray and right rail both carry unfilled space.

## Three voices

The world speaks in three registers, and mixing them is how the screens got
confusing. Measured on the annotation screen before this rule existed: 62 of 78
visible text elements — 79% — shared one signature (11.5px / 500 / uppercase /
Sometype Mono), and 24 of those were interactive while 38 were not. A button and
a field label were the same object to the eye.

| voice | says | set in | class |
|---|---|---|---|
| furniture | what a thing **is** | Sometype Mono, 11.5px, uppercase, 0.1em, quiet | `.furniture` |
| value | what a thing **says** | Archivo, 13px, 500, ink, tabular figures | `dd` inside `.furniture` |
| control | what a thing **does** | Archivo, 13px, 500, sentence case | `.control`, `.ink-button` |

Mono uppercase is a print shop's label voice, not its house voice. It is correct
for labels, column heads, captions, key caps and figures — genuine notation and
measurement. It is wrong for anything a person presses, and wrong for the content
of a field.

None of the three sets `color`. These rules are deliberately unlayered so they
beat the component library, which means any `color` in them would also beat the
utility a template puts on the element.

After the rule: 44% mono, and zero controls speaking in the label voice on either
annotation screen.

## Landing surface — the press run

Mode: Persuade. The world is the house world, inherited unchanged; only the
structure is new. Surface seed `704b040b`, form: the press run, candidate 3 of
the ordered list of grounded structures.

**Thesis.** A job walked through its states, in order — upload, pool, assist,
track, export. It refuses the category's hero-screenshot-then-three-feature-cards,
which shows a tool and never the work.

**Evidence rule.** Every screen on the page is a real capture of the running
product, taken by script against the local stack (`scripts` in the session's
scratchpad; captures live in `public/landing/`). Nothing is a mockup and nothing
is captioned as one. The two steps with no screen of their own — upload and
export — show the product's real record shape instead, because a third of a
column with two thirds of empty page beside it reads as something missing.

**Claims.** PRODUCT.md records that no customers, testimonials, benchmarks,
pricing or press exist. None appear here. The only figures on the page are
timings measured on this machine, labelled as one machine's measurements and not
as a promise. The contact address comes from `NUXT_PUBLIC_CONTACT_EMAIL`; while
it is unset the primary action falls back to Sign in rather than printing an
invented address.

**Measured after build:** 0 contrast failures and no horizontal overflow at
1440 and 390; 54% of text in the furniture voice; the only control in the label
voice is the skip link, which is furniture by intent.

### Landing: the drawn sections

Four components carry what prose could not. Each is one self-contained .vue file
under `components/land/`, CSS and inline SVG only, no animation library, and each
renders its whole idea as a still composition under `prefers-reduced-motion`.

- **TrackDemo** (the hero). A filmstrip of eight frames read left to right: one
  click lands on frame 1, the mask propagates down the strip, each frame settles
  as a saved record. Two objects, two inks. It replaced a screenshot because the
  product's best feature is a *sequence*, and a still frame cannot show a
  sequence.
- **TeamDiagram**. Organization -> project -> task -> annotation as nested
  containers, so the two role scopes are visibly attached to two different
  levels; beside it two permission grids whose every cell is a real seeded flag
  from `organization_roles` and `project_roles`; below it, sheets moving
  unassigned -> annotating -> completed.
- **FormatsPanel**. The YOLO archive drawn as the tree it actually is, with the
  train/val/test split as a dividing bar.
- **FrameRate**. A clip timeline whose tick density follows the chosen fps, and
  one tick resolving into a sheet with its real metadata fields.

Illustrative values are labelled as examples on screen (the clip length in
FrameRate, the split proportions in FormatsPanel). Everything else is a verified
property of the running system.

An adversarial pass over these four found five defects worth recording, because
each is a trap this world sets: `stock-400` spent as a filled data block (it is
the hairline token, and reads 1.62:1 as a fill); a panel heading left outside its
own `v-if` so it kept saying "yolo" for every format; "an json export"; a
fabricated clip length printed as a frame count; and `px-3 py-1.5` on an
`.ink-button`, which does nothing because that class is deliberately unlayered.

### What gets a frame

Measured when the landing page read as cluttered: 27 bordered containers, 14 of
them nested inside another box, one chain four deep — and 113 visible mono
uppercase labels. Both numbers, not a feeling, were the complaint.

The rule that came out of it:

- **A plate gets a frame. A diagram does not.** A screenshot or a film frame is
  an object being judged, so it is framed and registered like one. A diagram is
  drawn *on* the paper; the paper is already its ground, and framing it turns a
  drawing into a card. Registration marks follow the frame: a mark with nothing
  to register is decoration, and four of them were left floating when their
  panel lost its border.
- **One level of containment.** The only nested boxes left are organization →
  project → task → annotation, where the nesting *is* the subject.
- **A rule divides; it does not contain.** `border-b` under a heading is a
  division. Four borders around a region is a box. Prefer space to either.
- **Data is set in the value voice, even inside a diagram.** Nineteen permission
  flag names were set in mono uppercase because they sat in a table; they are
  data, and reading them cost the same effort as reading a label. Mono stayed on
  the column headers, which are labels.
- **Proximity beats ruling.** The permission grid was unreadable with its row
  rules removed because `w-full` pushed the marks 250px from their flag names.
  Shrinking the table to its content fixed the tracking without a single line.
- **Say it once.** A step's paragraph and its diagram's paragraph both ended
  with "a clip is a queue, not a blob".
