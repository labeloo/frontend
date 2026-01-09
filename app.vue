<script setup lang="ts">
// Panelin açık olup olmadığını kontrol eden basit bir değişken
const isOpen = ref(false)
</script>

<template>
  <div>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- 
      GLOBAL SETTINGS CONTAINER 
      Sağ alt köşeye sabitlenmiş alan 
    -->
    <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      
      <!-- 
         1. PANEL (Themeswitcher)
         v-if="isOpen": Sadece isOpen true ise ekrana basılır.
         Bu sayede Popover hatası varsa bile bypass etmiş oluruz.
      -->
      <div v-if="isOpen" class="mb-2 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <!-- Senin bileşenin burada -->
        <UtilsThemeSwitcher />
      </div>

      <!-- 
         2. ANA BUTON 
         Tıklayınca isOpen değerini tersine çevirir (true/false)
      -->
      <UButton 
        :icon="isOpen ? 'i-heroicons-x-mark-20-solid' : 'i-heroicons-paint-brush-20-solid'"
        size="xl"
        color="primary"
        class="rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        @click="isOpen = !isOpen"
      />
    </div>

    <UNotifications />
  </div>
</template>