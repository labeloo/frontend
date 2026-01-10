# Cursor Affordance System

## Intent

Provide immediate visual feedback about the active annotation tool via cursor appearance.  
This is a **pure UX affordance** with zero behavioral impact on annotation logic, events, or rendering.

## Architecture

### Single Source of Truth

`composables/useAnnotationCursor.ts` contains the canonical `TOOL_CURSOR_MAP`:

```typescript
const TOOL_CURSOR_MAP: Record<AnnotationTool, string> = {
  'rectangle': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  'polygon':   'url(/cursors/crosshair.svg) 12 12, crosshair',
  'dot':       'url(/cursors/crosshair.svg) 12 12, crosshair',
  'line':      'url(/cursors/crosshair.svg) 12 12, crosshair',
  'circle':    'url(/cursors/crosshair.svg) 12 12, crosshair',
  'freehand':  'url(/cursors/pen.svg) 4 20, cell',
  'magic':     'url(/cursors/magic-wand.svg) 2 22, copy',
  'select':    'default',
  'pan':       'grab',
}
```

### Integration Point

`components/annotation/KonvaAnnotationCanvas.vue`:

```vue
<script setup>
const { cursorStyle } = useAnnotationCursor(
  computed(() => props.currentTool)
)
</script>

<template>
  <div :style="{ cursor: cursorStyle }">
    <!-- canvas -->
  </div>
</template>
```

## What This Is

- **Tool → cursor mapping** (one-to-one, static)
- **Presentation-only** (no impact on annotation behavior)
- **Immediate visual feedback** (updates on tool change)

## What This Is Not

| ❌ Not This | Why |
|------------|-----|
| State-driven | Cursor depends **only** on `currentTool`, not on annotation lifecycle, zoom, drag, or canvas state |
| Behavioral | Does not affect events, hit-testing, rendering, or annotation creation |
| Persisted | No database, no user customization, no preferences |
| Dynamic | No animation, no context awareness, no density heuristics |
| Complex | No coupling to transforms, no performance budgets, no conditional logic |

**Dragging/grabbing cursors** (if needed) are handled at the canvas/container level, **not** inside this composable.

## Design Rules

Custom SVG cursors (`public/cursors/`) must be:

- **Monochrome** (single color, no gradients)
- **≤ 24×24 px** (actual rendered size)
- **Non-animated** (static SVG only)
- **Minimal detail** (simple, clear iconography)
- **Fallback included** (standard CSS cursor name after URL)

Example:
```
url(/cursors/crosshair.svg) 12 12, crosshair
│                           │  │   └─ Fallback CSS cursor
│                           │  └──── Hotspot Y
│                           └─────── Hotspot X
└──────────────────────────────────── Custom SVG path
```

## Extension

### Adding a New Tool

1. Add tool to `AnnotationTool` type union
2. Add entry to `TOOL_CURSOR_MAP`
3. (Optional) Add SVG to `public/cursors/`

**Example: Adding "Eraser" tool:**

```diff
export type AnnotationTool = 
  | 'select'
  | 'rectangle'
  // ...
+ | 'eraser'

const TOOL_CURSOR_MAP: Record<AnnotationTool, string> = {
  // ...
+ 'eraser': 'url(/cursors/eraser.svg) 12 12, not-allowed',
}
```

### Guardrails for Future Contributors

**DO:**
- Keep cursor logic in `useAnnotationCursor.ts` only
- Depend only on `currentTool`
- Use pure functions
- Add new tools via the mapping table

**DO NOT:**
- Add annotation state parameters (`isDrawing`, `selectedIndex`, etc.)
- Add canvas state parameters (`zoom`, `pan`, `transform`)
- Add conditional logic based on annotation density or performance
- Couple to drag handlers, transform handlers, or lifecycle hooks
- Add animations, transitions, or dynamic cursor generation

**If you need dragging/grabbing cursors**, handle them **at the canvas/container level**, not in this composable.

## Files

```
frontend/
├── composables/
│   └── useAnnotationCursor.ts      # Single source of truth
├── public/
│   └── cursors/
│       ├── crosshair.svg           # Geometric tools
│       ├── pen.svg                 # Freehand
│       └── magic-wand.svg          # Auto-label
└── components/
    └── annotation/
        └── KonvaAnnotationCanvas.vue  # Integration point
```

## Invariants

1. **Zero side effects**: Cursor changes do not trigger annotation logic
2. **No coupling**: Independent of annotation state, canvas transforms, zoom level
3. **Pure mapping**: `currentTool` → cursor string, nothing more
4. **Static design**: No runtime cursor generation, no animation
5. **Minimal API**: One input (`currentTool`), one output (`cursorStyle`)

## Testing

Manual verification:

1. Navigate to any annotation task
2. Select each tool from toolbar
3. Verify cursor appearance matches tool category:
   - Geometric (rect/circle/polygon/line/dot) → crosshair
   - Freehand → pen
   - Magic → wand
   - Select → pointer
   - Pan → grab

No unit tests required for a pure presentation concern.

---

**Last Updated**: 2026-01-10  
**Architectural Constraint**: This system must remain a pure tool→cursor mapping with no behavioral coupling.
