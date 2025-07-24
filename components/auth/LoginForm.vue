// components/Auth/LoginForm.vue
<template>
  <form @submit.prevent="handleLogin" class="space-y-6 px-6 ">
    <!-- Email Input -->
    <div class="space-y-2">
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <UInput id="email" v-model="formData.email" placeholder="you@example.com" icon="i-heroicons-envelope"
        class="w-full" :error="errors.email" />
    </div>

    <!-- Password Input -->
    <div class="space-y-2">
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <UInput id="password" v-model="formData.password" type="password" placeholder="••••••••"
        icon="i-heroicons-lock-closed" class="w-full" :error="errors.password" />
    </div>

    <!-- Remember Me and Forgot Password -->
    <div class="flex items-center justify-between">
      <UCheckbox v-model="formData.remember" label="Remember me" />
      <NuxtLink to="/forgot-password" class="text-sm text-secondary hover:text-secondary/90">
        Forgot password?
      </NuxtLink>
    </div>

    <!-- Error Alert -->
    <UAlert v-if="error" color="error" variant="soft" icon="i-heroicons-exclamation-triangle" :title="error"
      class="mt-4" /> <!-- Login Button -->
    <UButton type="submit" block :loading="isLoading" color="secondary" class="cursor-pointer">
      {{ isLoading ? 'Logging in...' : 'Login' }}
    </UButton>
  </form>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const formData = reactive({
  email: '',
  password: '',
  remember: false
})

const errors = reactive({
  email: '',
  password: ''
})

const error = ref('')
const isLoading = ref(false)
const { login } = useAuth()

const validateForm = () => {
  let isValid = true
  errors.email = ''
  errors.password = ''
  error.value = ''

  if (!formData.email) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email'
    isValid = false
  }

  if (!formData.password) {
    errors.password = 'Password is required'
    isValid = false
  }

  return isValid
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = ''
  const result = await login({
    email: formData.email,
    password: formData.password
  })

  if (!result.success) {
    error.value = 'Invalid email or password'
  }

  isLoading.value = false
}
</script>