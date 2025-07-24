<template>
  <div class="min-h-screen flex items-center justify-center bg-primary/5 py-12 px-4 sm:px-6 lg:px-8">
    <UCard  class="w-full max-w-md ">
      <!-- Logo/Header Section -->
      <template #header>
        <div class="text-center">
          <img src="@/assets/images/success-redesign-Photoroom.png" alt="Success" class="mx-auto w-32 h-auto mb-3" />
          <h1 class="text-2xl font-bold dark:text-white text-black">Welcome Back</h1>
          <p class="mt-1 text-sm font-semibold text-secondary">Sign in to your account</p>
        </div>
      </template>

      <!-- Login Form -->
      <AuthLoginForm />

      <!-- Footer Section -->
      <template #footer>
        <div class="text-center">
          <p class="text-sm text-gray-600">
            Don't have an account?
            <NuxtLink to="/register" class="font-medium text-secondary hover:text-secondary/90">
              Create an account
            </NuxtLink>
          </p>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'login'
});
</script>