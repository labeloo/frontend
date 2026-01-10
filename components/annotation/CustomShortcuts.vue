<template>
  <UModal v-model:open="isOpen" :title="'Customize Keyboard Shortcuts'" class="max-w-3xl">
    <template #body>
      <div class="space-y-6">
        <!-- Header with scope selector and reset button -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Scope:</span>
            <UBadge color="primary" variant="subtle">
              <UIcon name="i-heroicons-photo" class="w-3 h-3 mr-1" />
              Canvas
            </UBadge>
          </div>
          <div class="flex items-center space-x-2">
            <UButton
              v-if="hasCustomShortcuts"
              color="warning"
              variant="ghost"
              size="sm"
              @click="confirmResetAll"
              :loading="isResetting"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1" />
              Reset All to Defaults
            </UButton>
          </div>
        </div>

        <!-- Conflict Warning -->
        <div
          v-if="conflictWarning"
          class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4"
        >
          <div class="flex items-start">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
            <div>
              <h4 class="text-sm font-medium text-amber-800 dark:text-amber-200">Shortcut Conflict</h4>
              <p class="mt-1 text-sm text-amber-700 dark:text-amber-300">{{ conflictWarning }}</p>
            </div>
          </div>
        </div>

        <!-- Recording Overlay -->
        <div
          v-if="recordingAction"
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          @click="cancelRecording"
          @keydown="handleKeyRecording"
          tabindex="0"
          ref="recordingOverlay"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md mx-4"
            @click.stop
          >
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-keyboard" class="w-8 h-8 text-primary-600 dark:text-primary-400 animate-pulse" />
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Recording Shortcut
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Press the key combination for <strong>{{ recordingActionLabel }}</strong>
              </p>
              <div class="min-h-12 flex items-center justify-center">
                <div v-if="recordedKey" class="flex items-center space-x-2">
                  <kbd
                    v-for="(key, index) in recordedKeyParts"
                    :key="index"
                    class="px-3 py-2 text-lg font-mono bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
                  >
                    {{ key }}
                  </kbd>
                </div>
                <span v-else class="text-gray-400 dark:text-gray-500">
                  Waiting for input...
                </span>
              </div>
              <div class="mt-6 flex items-center justify-center space-x-3">
                <UButton color="neutral" variant="outline" @click="cancelRecording">
                  Cancel
                </UButton>
                <UButton
                  v-if="recordedKey"
                  color="primary"
                  @click="confirmRecording"
                  :disabled="!!recordingConflict"
                >
                  {{ recordingConflict ? 'Conflict!' : 'Save' }}
                </UButton>
              </div>
              <p v-if="recordingConflict" class="mt-3 text-sm text-red-600 dark:text-red-400">
                This shortcut is already used by "{{ recordingConflict.label }}"
              </p>
            </div>
          </div>
        </div>

        <!-- Shortcuts List by Category -->
        <div class="space-y-6">
          <div
            v-for="category in categories"
            :key="category.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <!-- Category Header -->
            <div class="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center">
                <UIcon :name="category.icon" class="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ category.label }}
                </h3>
                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({{ getShortcutsByCategory(category.id).length }} shortcuts)
                </span>
              </div>
            </div>

            <!-- Shortcuts in Category -->
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              <div
                v-for="shortcut in getShortcutsByCategory(category.id)"
                :key="shortcut.action"
                class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ shortcut.label }}
                    </span>
                    <UBadge
                      v-if="shortcut.isCustom"
                      color="primary"
                      variant="subtle"
                      size="xs"
                      class="ml-2"
                    >
                      Custom
                    </UBadge>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ shortcut.description }}
                  </p>
                </div>

                <div class="flex items-center space-x-2 ml-4">
                  <!-- Current shortcut key display -->
                  <button
                    @click="startRecording(shortcut)"
                    class="group flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                    :title="'Click to change shortcut'"
                  >
                    <kbd
                      v-for="(key, index) in formatKeyParts(shortcut.key)"
                      :key="index"
                      class="px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300 group-hover:text-primary-700 dark:group-hover:text-primary-300"
                    >
                      {{ key }}
                    </kbd>
                    <UIcon
                      name="i-heroicons-pencil-square"
                      class="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 ml-1"
                    />
                  </button>

                  <!-- Reset to default button (only show if customized) -->
                  <UButton
                    v-if="shortcut.isCustom"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="resetSingleShortcut(shortcut.action)"
                    :title="`Reset to default (${formatKeyForDisplay(shortcut.defaultKey)})`"
                  >
                    <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-primary-500" />
          <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading shortcuts...</span>
        </div>

        <!-- Error State -->
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4"
        >
          <div class="flex items-center">
            <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end space-x-3">
        <UButton color="neutral" variant="outline" @click="close">
          Close
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Reset All Confirmation Modal -->
  <UModal v-model:open="showResetConfirm">
    <template #body>
      <div class="text-center py-4">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Reset All Shortcuts?
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          This will reset all your custom shortcuts to their default values. This action cannot be undone.
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-center space-x-3">
        <UButton color="neutral" variant="outline" @click="showResetConfirm = false">
          Cancel
        </UButton>
        <UButton color="warning" @click="executeResetAll" :loading="isResetting">
          Reset All
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ShortcutAction, MergedShortcut } from '~/types/shortcuts';
import { SHORTCUT_CATEGORIES, formatKeyForDisplay } from '~/types/shortcuts';
import { useShortcuts } from '~/composables/useShortcuts';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'shortcuts-updated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Composable
const {
  shortcuts,
  isLoading,
  error,
  isInitialized,
  initialize,
  saveShortcutOverride,
  resetShortcut,
  resetAllShortcuts,
  checkConflicts,
} = useShortcuts({ scope: 'canvas' });

// Local state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const categories = SHORTCUT_CATEGORIES;
const showResetConfirm = ref(false);
const isResetting = ref(false);
const conflictWarning = ref<string | null>(null);

// Recording state
const recordingAction = ref<ShortcutAction | null>(null);
const recordingActionLabel = ref('');
const recordedKey = ref<string | null>(null);
const recordedKeyParts = ref<string[]>([]);
const recordingConflict = ref<MergedShortcut | null>(null);
const recordingOverlay = ref<HTMLElement | null>(null);

// Computed
const hasCustomShortcuts = computed(() => {
  return shortcuts.value.some((s) => s.isCustom);
});

// Methods
const getShortcutsByCategory = (categoryId: string): MergedShortcut[] => {
  return shortcuts.value.filter((s) => s.category === categoryId);
};

const formatKeyParts = (key: string): string[] => {
  return key.split('+').map((part) => {
    const normalized = part.toLowerCase().trim();
    switch (normalized) {
      case 'ctrl':
        return '⌘';
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
        return '␣';
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
  });
};

const startRecording = (shortcut: MergedShortcut) => {
  recordingAction.value = shortcut.action;
  recordingActionLabel.value = shortcut.label;
  recordedKey.value = null;
  recordedKeyParts.value = [];
  recordingConflict.value = null;
  conflictWarning.value = null;

  // Focus the overlay for keyboard events
  nextTick(() => {
    recordingOverlay.value?.focus();
  });
};

const handleKeyRecording = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();

  // Build the key combination
  const parts: string[] = [];
  
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  // Get the actual key
  let key = event.key.toLowerCase();
  
  // Handle special keys
  const specialKeys: Record<string, string> = {
    ' ': 'space',
    'arrowleft': 'left',
    'arrowright': 'right',
    'arrowup': 'up',
    'arrowdown': 'down',
    'escape': 'escape',
    'enter': 'enter',
    'backspace': 'backspace',
    'delete': 'delete',
    'tab': 'tab',
  };

  const specialKey = specialKeys[key];
  if (specialKey) {
    key = specialKey;
  }

  // Ignore lone modifier keys
  if (['control', 'alt', 'shift', 'meta'].includes(key)) {
    return;
  }

  // Handle = and - keys properly
  if (key === '=') key = '=';
  if (key === '-') key = '-';

  parts.push(key);

  const keyCombo = parts.join('+');
  recordedKey.value = keyCombo;
  recordedKeyParts.value = formatKeyParts(keyCombo);

  // Check for conflicts
  const conflicts = checkConflicts(keyCombo, recordingAction.value!);
  if (conflicts.length > 0) {
    recordingConflict.value = conflicts[0]!;
  } else {
    recordingConflict.value = null;
  }
};

const cancelRecording = () => {
  recordingAction.value = null;
  recordedKey.value = null;
  recordedKeyParts.value = [];
  recordingConflict.value = null;
};

const confirmRecording = async () => {
  if (!recordingAction.value || !recordedKey.value || recordingConflict.value) {
    return;
  }

  const success = await saveShortcutOverride(recordingAction.value, recordedKey.value);
  
  if (success) {
    emit('shortcuts-updated');
    cancelRecording();
  }
};

const resetSingleShortcut = async (action: ShortcutAction) => {
  const success = await resetShortcut(action);
  
  if (success) {
    emit('shortcuts-updated');
  }
};

const confirmResetAll = () => {
  showResetConfirm.value = true;
};

const executeResetAll = async () => {
  isResetting.value = true;
  
  const success = await resetAllShortcuts();
  
  if (success) {
    emit('shortcuts-updated');
  }
  
  isResetting.value = false;
  showResetConfirm.value = false;
};

const close = () => {
  isOpen.value = false;
};

// Initialize on mount if modal is open
watch(isOpen, async (open) => {
  if (open && !isInitialized.value) {
    await initialize();
  }
}, { immediate: true });
</script>
