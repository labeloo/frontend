<template>
  <nav class="fixed top-0 right-0 p-4 z-50">
    <div class="flex items-center gap-3">
      <UtilsColorModeButton />
      <NuxtLink :to="{ name: 'login' }">
        <UButton class="bg-secondary text-primary hover:bg-primary hover:text-secondary transition-colors duration-300 cursor-pointer">
        Login
      </UButton>
    </NuxtLink>
      </div>
      
  </nav>
</template>