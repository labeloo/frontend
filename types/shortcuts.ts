/**
 * Shortcut System Types
 * 
 * This module defines the types and default shortcuts for the annotation canvas.
 * Defaults are stored as a static map in code - only user overrides are persisted to the database.
 */

// Available shortcut scopes
export type ShortcutScope = 'canvas' | 'global' | 'review';

// All available shortcut actions
export type ShortcutAction =
  // Tool selection
  | 'TOOL_SELECT'
  | 'TOOL_RECTANGLE'
  | 'TOOL_POLYGON'
  | 'TOOL_DOT'
  | 'TOOL_LINE'
  | 'TOOL_CIRCLE'
  | 'TOOL_MAGIC'
  | 'TOOL_FREEHAND'
  // Annotation actions
  | 'SAVE_ANNOTATION'
  | 'COMPLETE_ANNOTATION'
  | 'CANCEL_ANNOTATION'
  | 'DELETE_SELECTED'
  | 'DUPLICATE_SELECTED'
  | 'CLEAR_ALL'
  // Navigation
  | 'NEXT_TASK'
  | 'REFRESH_PAGE'
  // Edit actions
  | 'UNDO'
  | 'REDO'
  // View controls
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_ZOOM'
  | 'FIT_TO_SCREEN';

// Shortcut configuration
export interface ShortcutConfig {
  action: ShortcutAction;
  key: string; // e.g., 'v', 'ctrl+s', 'shift+d'
  label: string; // Human-readable label
  description: string; // Tooltip/help text
  scope: ShortcutScope;
  category: 'tools' | 'actions' | 'navigation' | 'edit' | 'view';
}

// User override from database
export interface ShortcutOverride {
  action: string;
  key: string;
  scope: ShortcutScope;
}

// Merged shortcut (default + user override)
export interface MergedShortcut extends ShortcutConfig {
  isCustom: boolean; // true if user has customized this shortcut
  defaultKey: string; // Original default key
}

/**
 * Default shortcuts configuration
 * These are the factory defaults - users can override these
 */
export const DEFAULT_SHORTCUTS: readonly ShortcutConfig[] = [
  // Tool Selection
  {
    action: 'TOOL_SELECT',
    key: 'v',
    label: 'Select Tool',
    description: 'Select and move annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_RECTANGLE',
    key: 'r',
    label: 'Rectangle Tool',
    description: 'Draw rectangle annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_POLYGON',
    key: 'p',
    label: 'Polygon Tool',
    description: 'Draw polygon annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_DOT',
    key: 'd',
    label: 'Point Tool',
    description: 'Add point annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_LINE',
    key: 'l',
    label: 'Line Tool',
    description: 'Draw line annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_CIRCLE',
    key: 'c',
    label: 'Circle Tool',
    description: 'Draw circle annotations',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_MAGIC',
    key: 'm',
    label: 'Magic Stick',
    description: 'AI-assisted annotation tool',
    scope: 'canvas',
    category: 'tools',
  },
  {
    action: 'TOOL_FREEHAND',
    key: 'f',
    label: 'Freehand Tool',
    description: 'Draw freehand annotations',
    scope: 'canvas',
    category: 'tools',
  },

  // Annotation Actions
  {
    action: 'SAVE_ANNOTATION',
    key: 'ctrl+s',
    label: 'Save Annotation',
    description: 'Save current annotations to database',
    scope: 'canvas',
    category: 'actions',
  },
  {
    action: 'COMPLETE_ANNOTATION',
    key: 'enter',
    label: 'Complete Annotation',
    description: 'Complete current annotation drawing',
    scope: 'canvas',
    category: 'actions',
  },
  {
    action: 'CANCEL_ANNOTATION',
    key: 'escape',
    label: 'Cancel Annotation',
    description: 'Cancel current annotation drawing',
    scope: 'canvas',
    category: 'actions',
  },
  {
    action: 'DELETE_SELECTED',
    key: 'delete',
    label: 'Delete Selected',
    description: 'Delete the selected annotation',
    scope: 'canvas',
    category: 'actions',
  },
  {
    action: 'DUPLICATE_SELECTED',
    key: 'ctrl+d',
    label: 'Duplicate Selected',
    description: 'Duplicate the selected annotation',
    scope: 'canvas',
    category: 'actions',
  },
  {
    action: 'CLEAR_ALL',
    key: 'ctrl+shift+delete',
    label: 'Clear All',
    description: 'Clear all annotations from canvas',
    scope: 'canvas',
    category: 'actions',
  },

  // Navigation
  {
    action: 'NEXT_TASK',
    key: 'ctrl+right',
    label: 'Next Task',
    description: 'Save and go to next task',
    scope: 'canvas',
    category: 'navigation',
  },
  {
    action: 'REFRESH_PAGE',
    key: 'ctrl+r',
    label: 'Refresh',
    description: 'Reload task data',
    scope: 'canvas',
    category: 'navigation',
  },

  // Edit Actions
  {
    action: 'UNDO',
    key: 'ctrl+z',
    label: 'Undo',
    description: 'Undo last action',
    scope: 'canvas',
    category: 'edit',
  },
  {
    action: 'REDO',
    key: 'ctrl+y',
    label: 'Redo',
    description: 'Redo last undone action',
    scope: 'canvas',
    category: 'edit',
  },

  // View Controls
  {
    action: 'ZOOM_IN',
    key: 'ctrl+=',
    label: 'Zoom In',
    description: 'Zoom in on canvas',
    scope: 'canvas',
    category: 'view',
  },
  {
    action: 'ZOOM_OUT',
    key: 'ctrl+-',
    label: 'Zoom Out',
    description: 'Zoom out on canvas',
    scope: 'canvas',
    category: 'view',
  },
  {
    action: 'RESET_ZOOM',
    key: 'ctrl+0',
    label: 'Reset Zoom',
    description: 'Reset zoom to 100%',
    scope: 'canvas',
    category: 'view',
  },
  {
    action: 'FIT_TO_SCREEN',
    key: 'ctrl+1',
    label: 'Fit to Screen',
    description: 'Fit image to screen',
    scope: 'canvas',
    category: 'view',
  },
] as const;

/**
 * Get default shortcut by action
 */
export function getDefaultShortcut(action: ShortcutAction): ShortcutConfig | undefined {
  return DEFAULT_SHORTCUTS.find((s) => s.action === action);
}

/**
 * Get all default shortcuts by category
 */
export function getShortcutsByCategory(category: ShortcutConfig['category']): ShortcutConfig[] {
  return DEFAULT_SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Get all default shortcuts by scope
 */
export function getShortcutsByScope(scope: ShortcutScope): ShortcutConfig[] {
  return DEFAULT_SHORTCUTS.filter((s) => s.scope === scope);
}

/**
 * Merge defaults with user overrides
 */
export function mergeShortcuts(
  defaults: readonly ShortcutConfig[],
  overrides: ShortcutOverride[]
): MergedShortcut[] {
  const overrideMap = new Map(overrides.map((o) => [o.action, o]));

  return defaults.map((defaultShortcut) => {
    const override = overrideMap.get(defaultShortcut.action);
    return {
      ...defaultShortcut,
      key: override?.key ?? defaultShortcut.key,
      isCustom: !!override,
      defaultKey: defaultShortcut.key,
    };
  });
}

/**
 * Convert hotkeys-js key string to display format
 */
export function formatKeyForDisplay(key: string): string {
  return key
    .split('+')
    .map((part) => {
      const normalized = part.toLowerCase().trim();
      switch (normalized) {
        case 'ctrl':
          return '⌘'; // Use ⌘ for Mac, Ctrl for Windows
        case 'alt':
          return '⌥';
        case 'shift':
          return '⇧';
        case 'enter':
          return '↵';
        case 'escape':
          return 'Esc';
        case 'delete':
          return 'Del';
        case 'backspace':
          return '⌫';
        case 'space':
          return 'Space';
        case 'left':
          return '←';
        case 'right':
          return '→';
        case 'up':
          return '↑';
        case 'down':
          return '↓';
        default:
          return part.toUpperCase();
      }
    })
    .join(' + ');
}

/**
 * Validate a key combination
 */
export function isValidKeyCombo(key: string): boolean {
  if (!key || key.trim() === '') return false;

  const parts = key.toLowerCase().split('+').map((p) => p.trim());
  
  // Must have at least one non-modifier key
  const modifiers = ['ctrl', 'alt', 'shift', 'meta', 'command'];
  const hasNonModifier = parts.some((p) => !modifiers.includes(p));
  
  return hasNonModifier;
}

/**
 * Check for conflicts between shortcuts
 */
export function findConflicts(
  shortcuts: MergedShortcut[],
  newKey: string,
  excludeAction?: ShortcutAction
): MergedShortcut[] {
  const normalizedNewKey = newKey.toLowerCase().trim();
  return shortcuts.filter(
    (s) =>
      s.key.toLowerCase().trim() === normalizedNewKey &&
      s.action !== excludeAction
  );
}

/**
 * Categories with labels for UI
 */
export const SHORTCUT_CATEGORIES = [
  { id: 'tools', label: 'Tools', icon: 'i-heroicons-wrench-screwdriver' },
  { id: 'actions', label: 'Actions', icon: 'i-heroicons-bolt' },
  { id: 'navigation', label: 'Navigation', icon: 'i-heroicons-arrows-pointing-out' },
  { id: 'edit', label: 'Edit', icon: 'i-heroicons-pencil' },
  { id: 'view', label: 'View', icon: 'i-heroicons-eye' },
] as const;
