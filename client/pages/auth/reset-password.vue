<script setup lang="ts">
/**
 * Reset Password Page
 * AURA ARCHIVE - Reset password with token and i18n
 */


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
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Password validation
const passwordErrors = computed(() => {
  const errors = []
  if (password.value.length > 0 && password.value.length < 8) {
    errors.push(t('auth.atLeast8Chars'))
  }
  if (password.value.length > 0 && !/[A-Z]/.test(password.value)) {
    errors.push(t('auth.oneUppercase'))
  }
  if (password.value.length > 0 && !/[a-z]/.test(password.value)) {
    errors.push(t('auth.oneLowercase'))
  }
  if (password.value.length > 0 && !/\d/.test(password.value)) {
    errors.push(t('auth.oneNumber'))
  }
  if (password.value.length > 0 && !/[[@$!%*?&~#^()_+=\-\]{}|\\:";'<>,.?/]/.test(password.value)) {
    errors.push(t('auth.oneSpecialChar'))
  }
  return errors
})

const passwordsMatch = computed(() => {
  return password.value === confirmPassword.value && confirmPassword.value.length > 0
})

const handleSubmit = async () => {
  if (passwordErrors.value.length > 0) {
    error.value = t('auth.fixPasswordReqs')
    return
  }

  if (!passwordsMatch.value) {
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

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- New Password -->
        <div>
          <label for="password" class="input-label">{{ $t('auth.newPassword') }}</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="input-field pr-12"
              :placeholder="$t('auth.newPasswordPlaceholder')"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <!-- Password requirements -->
          <div v-if="password.length > 0" class="mt-2 text-caption space-y-1">
            <p :class="password.length >= 8 ? 'text-green-600' : 'text-neutral-400'">
              ✓ {{ $t('auth.atLeast8Chars') }}
            </p>
            <p :class="/[A-Z]/.test(password) ? 'text-green-600' : 'text-neutral-400'">
              ✓ {{ $t('auth.oneUppercase') }}
            </p>
            <p :class="/[a-z]/.test(password) ? 'text-green-600' : 'text-neutral-400'">
              ✓ {{ $t('auth.oneLowercase') }}
            </p>
            <p :class="/\d/.test(password) ? 'text-green-600' : 'text-neutral-400'">
              ✓ {{ $t('auth.oneNumber') }}
            </p>
            <p :class="/[@$!%*?&~#^()_+=\-\[\]{}|\\:&quot;'<>,.?\/]/.test(password) ? 'text-green-600' : 'text-neutral-400'">
              ✓ {{ $t('auth.oneSpecialChar') }}
            </p>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="input-label">{{ $t('auth.confirmNewPassword') }}</label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              class="input-field pr-12"
              :class="{ 'border-green-500': passwordsMatch, 'border-red-300': confirmPassword.length > 0 && !passwordsMatch }"
              :placeholder="$t('auth.confirmPasswordPlaceholder')"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="mt-1 text-caption text-red-500">
            {{ $t('auth.passwordMismatch') }}
          </p>
        </div>

        <button
          type="submit"
          :disabled="isLoading || passwordErrors.length > 0"
          class="btn-primary w-full"
          :class="{ 'opacity-70 cursor-not-allowed': isLoading || passwordErrors.length > 0 }"
        >
          {{ isLoading ? $t('auth.resetting') : $t('auth.resetTitle') }}
        </button>
      </form>
    </div>
  </div>
</template>

