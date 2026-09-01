<template>
  <form class="space-y-5" @submit.prevent="handleLogin">
    <div>
      <label for="email" class="furniture block pb-2 text-stock-600">Email</label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        class="w-full border bg-transparent px-3 py-2.5 text-[14px] text-stock-950 outline-none placeholder:text-stock-600 focus:border-stock-950"
        :class="errors.email ? 'border-correct-500' : 'border-stock-400'"
      />
      <p v-if="errors.email" class="furniture pt-1.5 text-correct-500">{{ errors.email }}</p>
    </div>

    <div>
      <label for="password" class="furniture block pb-2 text-stock-600">Password</label>
      <input
        id="password"
        v-model="formData.password"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
        class="w-full border bg-transparent px-3 py-2.5 text-[14px] text-stock-950 outline-none placeholder:text-stock-600 focus:border-stock-950"
        :class="errors.password ? 'border-correct-500' : 'border-stock-400'"
      />
      <p v-if="errors.password" class="furniture pt-1.5 text-correct-500">{{ errors.password }}</p>
    </div>

    <div class="flex items-center justify-between">
      <label class="flex cursor-pointer items-center gap-2 text-[13px] text-stock-700">
        <input v-model="formData.remember" type="checkbox" class="size-3.5 border-stock-400" />
        Keep me signed in
      </label>

    </div>

    <!-- The problem and what to do about it, printed where the work is. -->
    <p v-if="error" class="border border-correct-500 px-3 py-2 text-[13px] text-correct-600">{{ error }}</p>

    <button type="submit" class="ink-button w-full justify-center py-2.5" :disabled="isLoading">
      <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
      {{ isLoading ? 'Signing in' : 'Sign in' }}
    </button>
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
    error.value = 'That email and password do not match an account. Check both, or create an account below.'
  }

  isLoading.value = false
}
</script>