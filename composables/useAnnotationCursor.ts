/**
 * Pure UX affordance: Tool-to-cursor mapping
 * 
 * INTENT:
 * Provides immediate visual feedback about which annotation tool is active.
 * This is a presentation-only concern with zero behavioral impact.
 * 
 * INVARIANTS:
 * - Cursor depends ONLY on currentTool (not annotation state, zoom, drag, etc.)
 * - No side effects
 * - No coupling to annotation lifecycle or canvas transforms
 * - Dragging/grabbing cursors handled at canvas level, not here
 * 
 * ARCHITECTURE:
 * Single source of truth: TOOL_CURSOR_MAP
 * One function: tool → cursor string
 * No state. No reactivity complexity.
 */

import { computed, type ComputedRef } from 'vue'

export type AnnotationTool = 
  | 'select'
  | 'rectangle'
  | 'polygon'
  | 'dot'
  | 'line'
  | 'circle'
  | 'freehand'
  | 'magic'
  | 'pan'

/**
 * Canonical tool → cursor mapping
 * 
 * DESIGN RULES:
 * - Monochrome SVG cursors
 * - ≤ 24×24 px
 * - Non-animated
 * - Minimal detail
 * - Fallback to standard CSS cursor
 */
const TOOL_CURSOR_MAP: Record<AnnotationTool, string> = {
  // Geometric annotation tools: minimal crosshair
  'rectangle': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  'polygon': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  'dot': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  'line': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  'circle': 'url(/cursors/crosshair.svg) 12 12, crosshair',
  
  // Freehand: pen
  'freehand': 'url(/cursors/pen.svg) 4 20, cell',
  
  // Auto-label: minimal wand (tip at bottom-left)
  'magic': 'url(/cursors/magic-wand.svg) 2 22, copy',
  
  // Transform/navigation
  'select': 'default',
  'pan': 'grab',
}

/**
 * Get cursor for a tool
 * Pure function: tool string → cursor CSS string
 */
export function getCursorForTool(tool: string): string {
  return TOOL_CURSOR_MAP[tool as AnnotationTool] || 'default'
}

/**
 * Composable: returns computed cursor style
 * 
 * @param currentTool - The active tool (string or computed ref)
 * @returns Reactive cursor style string
 * 
 * @example
 * ```ts
 * const { cursorStyle } = useAnnotationCursor(
 *   computed(() => currentTool.value)
 * )
 * ```
 */
export function useAnnotationCursor(
  currentTool: ComputedRef<string> | string
) {
  const cursorStyle = computed<string>(() => {
    const tool = typeof currentTool === 'string' ? currentTool : currentTool.value
    return getCursorForTool(tool)
  })
  
  return { cursorStyle }
}
