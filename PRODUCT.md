# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One set of screens serves three groups at once, confirmed by the owner:

- **In-house annotators** who work the same tool for hours and live on muscle memory.
- **Outsourced or rotating labellers** with little training, who must understand a
  screen in its first thirty seconds and be prevented from making silent mistakes.
- **ML engineers** labelling their own datasets in short bursts, who care about
  model output they can trust and about getting data back out.

The design must therefore be progressive rather than tuned to one of them: legible
on first contact, fast once known.

## Product Purpose

Labeloo turns images and video into labelled datasets. A team creates a project,
uploads images or video, defines label classes, assigns tasks to members, and
annotates - by hand or with SAM 2 assistance. The output is annotation records
attached to tasks.

## Positioning

The owner named all four of these as the bet, so none may be dropped in favour of
another:

1. **AI-assisted labelling.** One click segments an object (SAM 2); one click plus
   Track follows it through a video clip. Hand-drawing is the exception, not the norm.
2. **Speed, keyboard-first.** The stated philosophy is that annotation tools should
   not be clunky or slow.
3. **Simplicity for small teams.** The job done without CVAT's weight.
4. **Team workflow.** Organizations, roles, permissions, task assignment and review
   are the most developed part of the codebase.

## Operating Context

- Hierarchy: organization → project → task → annotation. Roles and permission flags
  exist at both organization and project scope.
- Work arrives as a task pool; tasks are assigned in bulk or claimed, then move
  `unassigned → annotating → completed`.
- Video is imported by extracting frames at a chosen frame rate. **Every frame
  becomes its own task**, carrying the source video name, frame index and timestamp.
- SAM 2 runs as a separate service, addressed per organization through Backend
  Connections. Tracking latency depends entirely on that host: roughly 1-3.5 s per
  frame on a CPU, far faster on a GPU. The interface must tell the truth about this
  wait rather than imply it is instant.
- Annotators work on screen-filling imagery; the surrounding interface competes with
  the very pixels being judged.

## Capabilities and Constraints

- Annotation tools: rectangle, polygon, circle, point, line, freehand, and the SAM 2
  magic stick. Video object tracking with multiple objects per clip.
- Label classes are defined per project (`labelConfig.classes`) and are the only
  vocabulary an annotator may apply.
- Stack is fixed: Nuxt 4 + Vue 3 with Konva for the image canvas, Hono + Drizzle +
  SQLite for the API, a Python SAM 2 service. Nuxt UI v3 and Tailwind v4 are in place.
- The canvas carries real performance engineering (web-worker polygon simplification,
  frame budgeting); large polygons are a genuine constraint, not a theoretical one.
- Review fields (`is_ground_truth`, `review_status`, `reviewer_id`) exist in the
  database with no interface.
- Export works and was verified end to end by unzipping real archives: `json`,
  `yolo`, `coco` and `zip`, with a configurable train/validation/test split.
  YOLO and COCO carry the mask as a polygon plus the image bytes themselves.
  Before 31 Aug 2026 both wrote correctly-shaped but EMPTY archives - every
  label file zero bytes and every image an 85-byte text placeholder - because
  the exporters only recognised rectangles and never read the saved polygons.
- Undecided: whether review and export get interfaces in this pass.

## Brand Commitments

- The name **Labeloo** and the **penguin** character are binding.
  Assets: `assets/images/penguin.png`, `penguin-with-logo.png`,
  `penguin-with-logo-white.png`, `labeloo-main-logo.png`.
- Everything else is explicitly open: the owner released the palette, the dark
  default, and the current page and menu structure for redesign.

## Evidence on Hand

- A working local stack: annotation screen, SAM 2 magic stick, video frame import,
  video object tracking, organizations, projects, task assignment.
- Real measurements taken on this machine (Apple M4, `sam2.1_hiera_small`):
  single-click segmentation ~0.1 s warm; video propagation ~1-3.5 s per frame on CPU.
- No customers, testimonials, benchmarks, pricing or press exist. Future work must
  not invent any.

## Product Principles

1. **The image is the product; the interface is scaffolding.** Anything that competes
   with the pixels being judged has to earn its place.
2. **Legible cold, fast warm.** The same control teaches a newcomer and gets out of an
   expert's way; shortcuts are shown, not hidden.
3. **Assistance is the default path.** SAM 2 is the primary way to make a shape, and
   manual tools are the fallback - the layout should say so.
4. **Never lose an annotator's work silently.** Failures, unsaved masks and missing
   classes are surfaced where the work is, not in a console.
5. **Be honest about time.** Model waits are shown as real progress with real numbers.

## Accessibility & Inclusion

No formal standard was set. Two product-specific needs are established: the tool is
keyboard-driven by design, so every annotation action needs a real key path; and
rotating labellers may not share a first language, so meaning must not rest on colour
or idiom alone.
