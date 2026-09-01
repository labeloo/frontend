<template>
  <!-- One identity field, in the same place in every shell: who is signed in,
       and the one control that ends it. Signing out is asked for twice because
       a mis-hit costs the whole way back in. -->
  <div class="flex items-center gap-3">
    <dl v-if="userEmail" class="docket-field hidden md:flex">
      <dt class="furniture">Signed in</dt>
      <dd class="max-w-[22ch] truncate text-[13px]" :title="userEmail">{{ userEmail }}</dd>
    </dl>

    <NuxtLink v-if="isPlatformAdmin" to="/admin" class="ink-button ink-button--outline">Admin</NuxtLink>

    <template v-if="confirming">
      <span class="furniture text-stock-600">End session?</span>
      <button
        type="button"
        class="ink-button border-correct-500 bg-correct-500 hover:border-correct-600 hover:bg-correct-600"
        @click="signOut"
      >
        Sign out
      </button>
      <button type="button" class="ink-button ink-button--outline" @click="confirming = false">Cancel</button>
    </template>
    <button v-else type="button" class="ink-button ink-button--outline" @click="confirming = true">
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { getUserEmailFromToken } from '~/utils/jwt'

const { logout, isPlatformAdmin } = useAuth()
const token = useCookie('auth_token')

const confirming = ref(false)
const userEmail = computed(() => getUserEmailFromToken(token.value))

const signOut = () => {
  confirming.value = false
  logout()
}
</script>
