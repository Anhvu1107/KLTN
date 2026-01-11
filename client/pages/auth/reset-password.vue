<script setup lang="ts">
/**
 * Reset Password Page
 * AURA ARCHIVE - Reset password with token and i18n
 */

import { useI18n } from '#imports'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const token = computed(() => route.query.token as string)

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = t('auth.passwordMismatch')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiUrl}/auth/reset-password`, {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    isSuccess.value = true
  } catch (err: any) {
    error.value = err.data?.message || t('errors.somethingWrong')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div v-if="isSuccess" class="text-center">
      <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('auth.resetSuccess') }}</h2>
      <p class="text-body text-neutral-600 mb-8">{{ $t('auth.resetSuccessMsg') }}</p>
      <NuxtLink to="/auth/login" class="btn-primary">{{ $t('auth.signIn') }}</NuxtLink>
    </div>

    <div v-else>
      <div class="text-center mb-8">
        <h2 class="font-serif text-heading-2 text-aura-black mb-2">{{ $t('auth.resetTitle') }}</h2>
        <p class="text-body text-neutral-600">{{ $t('auth.resetSubtitle') }}</p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="password" class="input-label">{{ $t('auth.newPassword') }}</label>
          <input 
            id="password" 
            v-model="password" 
            type="password" 
            required 
            class="input-field" 
            :placeholder="$t('auth.newPasswordPlaceholder')" 
          />
        </div>
        <div>
          <label for="confirmPassword" class="input-label">{{ $t('auth.confirmNewPassword') }}</label>
          <input 
            id="confirmPassword" 
            v-model="confirmPassword" 
            type="password" 
            required 
            class="input-field" 
            :placeholder="$t('auth.confirmPasswordPlaceholder')" 
          />
        </div>
        <button type="submit" :disabled="isLoading" class="btn-primary w-full">
          {{ isLoading ? $t('auth.resetting') : $t('auth.resetTitle') }}
        </button>
      </form>
    </div>
  </div>
</template>
