/**
 * useShortcuts Composable
 * 
 * Manages keyboard shortcuts for the annotation canvas using hotkeys-js.
 * Fetches user overrides from the backend and merges them with defaults.
 * Provides scoped shortcut registration that only works within the canvas context.
 */

import hotkeys from 'hotkeys-js';
import type {
  ShortcutAction,
  ShortcutScope,
  ShortcutConfig,
  ShortcutOverride,
  MergedShortcut,
} from '~/types/shortcuts';
import {
  DEFAULT_SHORTCUTS,
  mergeShortcuts,
  findConflicts,
  isValidKeyCombo,
} from '~/types/shortcuts';

export interface ShortcutHandler {
  action: ShortcutAction;
  handler: () => void;
}

export interface UseShortcutsOptions {
  scope?: ShortcutScope;
  enabled?: Ref<boolean>;
}

export function useShortcuts(options: UseShortcutsOptions = {}) {
  const { scope = 'canvas', enabled = ref(true) } = options;

  // State
  const shortcuts = ref<MergedShortcut[]>([]);
  const userOverrides = ref<ShortcutOverride[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(false);

  // Registered handlers map
  const handlers = new Map<ShortcutAction, () => void>();

  // Currently bound hotkeys (for cleanup)
  const boundKeys = new Set<string>();

  // Auth token
  const token = useCookie('auth_token');

  /**
   * Fetch user shortcut overrides from the backend
   */
  const fetchUserOverrides = async (): Promise<void> => {
    if (!token.value) {
      userOverrides.value = [];
      return;
    }

    try {
      isLoading.value = true;
      error.value = null;

      const response = await $fetch<{ data: ShortcutOverride[] }>(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/shortcuts?scope=${scope}`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      userOverrides.value = response.data || [];
    } catch (err) {
      console.error('Failed to fetch shortcuts:', err);
      error.value = 'Failed to load custom shortcuts';
      userOverrides.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Save a shortcut override to the backend
   */
  const saveShortcutOverride = async (
    action: ShortcutAction,
    key: string
  ): Promise<boolean> => {
    if (!token.value) {
      error.value = 'Authentication required';
      return false;
    }

    if (!isValidKeyCombo(key)) {
      error.value = 'Invalid key combination';
      return false;
    }

    try {
      isLoading.value = true;
      error.value = null;

      await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/shortcuts`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: {
          action,
          key,
          scope,
        },
      });

      // Update local state
      const existingIndex = userOverrides.value.findIndex(
        (o) => o.action === action
      );
      if (existingIndex >= 0) {
        userOverrides.value[existingIndex] = { action, key, scope };
      } else {
        userOverrides.value.push({ action, key, scope });
      }

      // Re-merge and rebind
      updateMergedShortcuts();
      rebindAllShortcuts();

      return true;
    } catch (err) {
      console.error('Failed to save shortcut:', err);
      error.value = 'Failed to save shortcut';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Save multiple shortcut overrides at once
   */
  const saveShortcutOverrides = async (
    overrides: Array<{ action: ShortcutAction; key: string }>
  ): Promise<boolean> => {
    if (!token.value) {
      error.value = 'Authentication required';
      return false;
    }

    // Validate all keys
    for (const override of overrides) {
      if (!isValidKeyCombo(override.key)) {
        error.value = `Invalid key combination for ${override.action}`;
        return false;
      }
    }

    try {
      isLoading.value = true;
      error.value = null;

      await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/shortcuts/bulk`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: {
          shortcuts: overrides.map((o) => ({ ...o, scope })),
        },
      });

      // Update local state
      for (const override of overrides) {
        const existingIndex = userOverrides.value.findIndex(
          (o) => o.action === override.action
        );
        if (existingIndex >= 0) {
          userOverrides.value[existingIndex] = { ...override, scope };
        } else {
          userOverrides.value.push({ ...override, scope });
        }
      }

      // Re-merge and rebind
      updateMergedShortcuts();
      rebindAllShortcuts();

      return true;
    } catch (err) {
      console.error('Failed to save shortcuts:', err);
      error.value = 'Failed to save shortcuts';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Reset a specific shortcut to default
   */
  const resetShortcut = async (action: ShortcutAction): Promise<boolean> => {
    if (!token.value) {
      error.value = 'Authentication required';
      return false;
    }

    try {
      isLoading.value = true;
      error.value = null;

      await $fetch(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/shortcuts/${action}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      // Update local state
      userOverrides.value = userOverrides.value.filter(
        (o) => o.action !== action
      );

      // Re-merge and rebind
      updateMergedShortcuts();
      rebindAllShortcuts();

      return true;
    } catch (err) {
      console.error('Failed to reset shortcut:', err);
      error.value = 'Failed to reset shortcut';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Reset all shortcuts to defaults
   */
  const resetAllShortcuts = async (): Promise<boolean> => {
    if (!token.value) {
      error.value = 'Authentication required';
      return false;
    }

    try {
      isLoading.value = true;
      error.value = null;

      await $fetch(
        `${import.meta.env.NUXT_PUBLIC_API_URL}/api/shortcuts?scope=${scope}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      // Clear local overrides
      userOverrides.value = [];

      // Re-merge and rebind
      updateMergedShortcuts();
      rebindAllShortcuts();

      return true;
    } catch (err) {
      console.error('Failed to reset shortcuts:', err);
      error.value = 'Failed to reset shortcuts';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Update merged shortcuts from defaults and overrides
   */
  const updateMergedShortcuts = (): void => {
    const scopedDefaults = DEFAULT_SHORTCUTS.filter((s) => s.scope === scope);
    shortcuts.value = mergeShortcuts(scopedDefaults, userOverrides.value);
  };

  /**
   * Register a handler for a shortcut action
   */
  const registerHandler = (action: ShortcutAction, handler: () => void): void => {
    handlers.set(action, handler);
    
    // If already initialized, bind immediately
    if (isInitialized.value) {
      const shortcut = shortcuts.value.find((s) => s.action === action);
      if (shortcut) {
        bindShortcut(shortcut);
      }
    }
  };

  /**
   * Unregister a handler for a shortcut action
   */
  const unregisterHandler = (action: ShortcutAction): void => {
    handlers.delete(action);
    
    // Unbind if exists
    const shortcut = shortcuts.value.find((s) => s.action === action);
    if (shortcut) {
      unbindShortcut(shortcut.key);
    }
  };

  /**
   * Register multiple handlers at once
   */
  const registerHandlers = (handlerList: ShortcutHandler[]): void => {
    for (const { action, handler } of handlerList) {
      registerHandler(action, handler);
    }
  };

  /**
   * Bind a single shortcut
   */
  const bindShortcut = (shortcut: MergedShortcut): void => {
    const handler = handlers.get(shortcut.action);
    if (!handler) return;

    // Unbind any existing binding for this key
    if (boundKeys.has(shortcut.key)) {
      hotkeys.unbind(shortcut.key, scope);
    }

    // Bind the shortcut
    hotkeys(shortcut.key, { scope, keyup: false, keydown: true }, (event) => {
      // Check if shortcuts are enabled
      if (!enabled.value) return;

      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      handler();
    });

    boundKeys.add(shortcut.key);
  };

  /**
   * Unbind a shortcut by key
   */
  const unbindShortcut = (key: string): void => {
    if (boundKeys.has(key)) {
      hotkeys.unbind(key, scope);
      boundKeys.delete(key);
    }
  };

  /**
   * Unbind all shortcuts
   */
  const unbindAllShortcuts = (): void => {
    for (const key of boundKeys) {
      hotkeys.unbind(key, scope);
    }
    boundKeys.clear();
  };

  /**
   * Rebind all shortcuts (after changes)
   */
  const rebindAllShortcuts = (): void => {
    unbindAllShortcuts();
    
    for (const shortcut of shortcuts.value) {
      if (handlers.has(shortcut.action)) {
        bindShortcut(shortcut);
      }
    }
  };

  /**
   * Initialize the shortcut system
   */
  const initialize = async (): Promise<void> => {
    if (isInitialized.value) return;

    // Set hotkeys scope
    hotkeys.setScope(scope);

    // Fetch user overrides
    await fetchUserOverrides();

    // Merge defaults with overrides
    updateMergedShortcuts();

    // Bind all shortcuts with registered handlers
    rebindAllShortcuts();

    isInitialized.value = true;
  };

  /**
   * Enable shortcuts (set scope active)
   */
  const enableShortcuts = (): void => {
    hotkeys.setScope(scope);
  };

  /**
   * Disable shortcuts (set scope to something else)
   */
  const disableShortcuts = (): void => {
    hotkeys.setScope('disabled');
  };

  /**
   * Get a shortcut by action
   */
  const getShortcut = (action: ShortcutAction): MergedShortcut | undefined => {
    return shortcuts.value.find((s) => s.action === action);
  };

  /**
   * Check for conflicts with a proposed key
   */
  const checkConflicts = (
    key: string,
    excludeAction?: ShortcutAction
  ): MergedShortcut[] => {
    return findConflicts(shortcuts.value, key, excludeAction);
  };

  // Cleanup on unmount
  onUnmounted(() => {
    unbindAllShortcuts();
  });

  return {
    // State
    shortcuts: readonly(shortcuts),
    userOverrides: readonly(userOverrides),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Actions
    initialize,
    fetchUserOverrides,
    saveShortcutOverride,
    saveShortcutOverrides,
    resetShortcut,
    resetAllShortcuts,

    // Handler registration
    registerHandler,
    unregisterHandler,
    registerHandlers,

    // Utility
    getShortcut,
    checkConflicts,
    enableShortcuts,
    disableShortcuts,
    rebindAllShortcuts,
  };
}
