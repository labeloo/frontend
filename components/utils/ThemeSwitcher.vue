<script setup lang="ts">
const appConfig = useAppConfig()
const colorMode = useColorMode()

// TS Hatası almamak için
const uiConfig = appConfig.ui as any

// --- RENK LİSTELERİ ---

const colors = [
  'orange', 'red', 'amber', 'yellow', 'lime', 'green', 
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 
  'violet', 'purple', 'fuchsia', 'pink', 'rose'
]

const grays = ['slate', 'gray', 'zinc', 'neutral', 'stone']

// --- HEX HARİTALARI (GÖRÜNÜRLÜK GARANTİSİ İÇİN) ---

// Renkli butonlar için (500 tonları)
const colorHexMap: Record<string, string> = {
   orange: '#f97316', red: '#ef4444', amber: '#f59e0b', yellow: '#eab308', 
  lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', 
  cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', 
  violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', rose: '#f43f5e'
}

// Gri butonlar için (500 tonları - Tailwind default değerleri)
const grayHexMap: Record<string, string> = {
  slate: '#64748b',   // Maviye çalan gri
  gray: '#6b7280',    // Soğuk gri
  zinc: '#71717a',    // Metalik
  neutral: '#737373', // Tam nötr
  stone: '#78716c'    // Sıcak/Toprak tonu
}

// --- SETTERS ---

const setPrimary = (color: string) => {
  if (uiConfig.colors) uiConfig.colors.primary = color 
}

const setSecondary = (color: string) => {
  if (uiConfig.colors) uiConfig.colors.secondary = color
}

// DÜZELTİLEN KISIM: Neutral (Gri) Ayarı
const setNeutralPalette = (paletteName: string) => {
  // 1. Yöntem: v3 Standardı (colors.neutral)
  if (uiConfig.colors) {
    uiConfig.colors.neutral = paletteName
  }
  
  // 2. Yöntem: v2/Legacy Alias (gray) - Garanti olsun diye bunu da set ediyoruz
  // Bazı versiyonlarda CSS generator hala buraya bakabiliyor.
  uiConfig.gray = paletteName
}

// --- GETTERS (SAFE CHECK) ---
// Template içinde hata almamak için güvenli okuma fonksiyonu
const isNeutralActive = (name: string) => {
  return uiConfig.colors?.neutral === name || uiConfig.gray === name
}

const toggleDark = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="p-4 border rounded-xl bg-white dark:bg-gray-900 shadow-xl w-72 h-[80vh] overflow-y-auto">
    
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 py-2">
      <span class="font-bold text-sm">Theme Settings</span>
      <UButton 
        :icon="colorMode.value === 'dark' ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
        color="neutral" variant="ghost" size="xs" @click="toggleDark"
      />
    </div>

    <!-- PRIMARY -->
    <div class="mb-4">
      <div class="text-xs font-medium mb-2 text-gray-500">Primary</div>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="color in colors"
          :key="color"
          @click="setPrimary(color)"
          class="w-6 h-6 rounded-full transition-all flex items-center justify-center border border-gray-200 dark:border-gray-700"
          :style="{ backgroundColor: colorHexMap[color] }"
          :class="[
            uiConfig.colors?.primary === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
          ]"
        >
          <UIcon v-if="uiConfig.colors?.primary === color" name="i-heroicons-check-20-solid" class="text-white w-4 h-4 drop-shadow-md" />
        </button>
      </div>
    </div>

    <!-- SECONDARY -->
    <div class="mb-4">
      <div class="text-xs font-medium mb-2 text-gray-500">Secondary</div>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="color in colors"
          :key="color"
          @click="setSecondary(color)"
          class="w-6 h-6 rounded-full transition-all flex items-center justify-center border border-gray-200 dark:border-gray-700"
          :style="{ backgroundColor: colorHexMap[color] }"
          :class="[
            uiConfig.colors?.secondary === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
          ]"
        >
          <UIcon v-if="uiConfig.colors?.secondary === color" name="i-heroicons-check-20-solid" class="text-white w-4 h-4 drop-shadow-md" />
        </button>
      </div>
    </div>

    <!-- NEUTRAL / GRAY -->
    <div>
      <div class="text-xs font-medium mb-2 text-gray-500">Neutral (Gray)</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="g in grays"
          :key="g"
          @click="setNeutralPalette(g)"
          class="px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all flex items-center gap-1"
          :style="{ 
             // Seçili değilse border rengini o grinin tonu yapalım ki belli olsun
             borderColor: !isNeutralActive(g) ? grayHexMap[g] : undefined,
             color: !isNeutralActive(g) ? grayHexMap[g] : undefined
          }"
          :class="[
            isNeutralActive(g)
              ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-md' 
              : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
          ]"
        >
          <!-- Renk kutucuğu (Küçük daire) -->
          <span 
            class="w-2 h-2 rounded-full inline-block" 
            :style="{ backgroundColor: grayHexMap[g] }"
          ></span>
          {{ g }}
        </button>
      </div>
    </div>
  </div>
</template>