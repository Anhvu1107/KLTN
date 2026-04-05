<script setup lang="ts">
/**
 * Register Page
 * AURA ARCHIVE - User registration with i18n and Google OAuth
 */

// Declare google type for Google Identity Services
declare const google: any

import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()

// Form state
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Password validation
const passwordErrors = computed(() => {
  const errors = []
  if (form.password.length > 0 && form.password.length < 8) {
    errors.push(t('auth.atLeast8Chars'))
  }
  if (form.password.length > 0 && !/[A-Z]/.test(form.password)) {
    errors.push(t('auth.oneUppercase'))
  }
  if (form.password.length > 0 && !/[a-z]/.test(form.password)) {
    errors.push(t('auth.oneLowercase'))
  }
  if (form.password.length > 0 && !/\d/.test(form.password)) {
    errors.push(t('auth.oneNumber'))
  }
  if (form.password.length > 0 && !/[[@$!%*?&~#^()_+=\-\]{}|\\:";'<>,.?/]/.test(form.password)) {
    errors.push(t('auth.oneSpecialChar'))
  }
  return errors
})

const passwordsMatch = computed(() => {
  return form.password === form.confirmPassword && form.confirmPassword.length > 0
})

// Submit handler
const handleSubmit = async () => {
  if (passwordErrors.value.length > 0) {
    error.value = t('auth.fixPasswordReqs')
    return
  }

  if (!passwordsMatch.value) {
    error.value = t('auth.passwordMismatch')
    return
  }

  error.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean; data: { email: string; autoVerified?: boolean }; message: string }>(
      `${config.public.apiUrl}/auth/register`,
      {
        method: 'POST',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        },
      }
    )

    if (response.success) {
      if (response.data.autoVerified) {
        navigateTo('/auth/login?registered=true')
      } else {
        navigateTo(`/auth/verify-otp?email=${encodeURIComponent(response.data.email)}`)
      }
    }
  } catch (err: any) {
    error.value = err.data?.message || t('errors.somethingWrong')
  } finally {
    isLoading.value = false
  }
}

// Handle successful login/register
const handleLoginSuccess = (userData: any, token: string) => {
  localStorage.setItem('token', token)
  authStore.token = token
  authStore.user = userData
  // Use external: true to force full page reload when switching from auth layout to default
  navigateTo('/', { external: true })
}

// Google Sign-In
const handleGoogleLogin = async () => {
  error.value = ''
  isGoogleLoading.value = true

  try {
    if (typeof google === 'undefined') {
      error.value = t('auth.googleNotAvailable')
      return
    }

    google.accounts.id.initialize({
      client_id: config.public.googleClientId || '',
      callback: handleGoogleCallback,
    })

    google.accounts.id.prompt()
  } catch (err: any) {
    error.value = err.message || t('errors.somethingWrong')
  } finally {
    isGoogleLoading.value = false
  }
}

// Google callback handler
const handleGoogleCallback = async (response: any) => {
  isGoogleLoading.value = true
  error.value = ''

  try {
    const result = await $fetch<{ success: boolean; data: { user: any; token: string } }>(
      `${config.public.apiUrl}/auth/google`,
      {
        method: 'POST',
        body: { idToken: response.credential },
      }
    )

    if (result.success) {
      handleLoginSuccess(result.data.user, result.data.token)
    }
  } catch (err: any) {
    error.value = err.data?.message || t('auth.googleLoginFailed')
  } finally {
    isGoogleLoading.value = false
  }
}

// Load Google Identity Services script
onMounted(() => {
  if (process.client && !document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }
})
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div class="text-center mb-8">
      <h2 class="font-serif text-heading-2 text-aura-black mb-2">{{ $t('auth.createAccount') }}</h2>
      <p class="text-body text-neutral-600">
        {{ $t('auth.joinAura') }}
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Social Login -->
    <div class="mb-6">
      <button
        type="button"
        @click="handleGoogleLogin"
        :disabled="isGoogleLoading"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200 rounded-sm hover:bg-neutral-50 transition-colors"
        :class="{ 'opacity-70 cursor-not-allowed': isGoogleLoading }"
      >
        <svg v-if="!isGoogleLoading" class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <svg v-else class="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span class="text-body">{{ $t('auth.continueWithGoogle') }}</span>
      </button>
    </div>

    <!-- Divider -->
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-neutral-200"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="px-4 bg-aura-white text-caption text-neutral-500">{{ $t('common.or') }}</span>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Name Fields -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="input-label">{{ $t('auth.firstName') }}</label>
          <input
            id="firstName"
            v-model="form.firstName"
            type="text"
            class="input-field"
            :placeholder="$t('auth.firstName')"
            autocomplete="given-name"
          />
        </div>
        <div>
          <label for="lastName" class="input-label">{{ $t('auth.lastName') }}</label>
          <input
            id="lastName"
            v-model="form.lastName"
            type="text"
            class="input-field"
            :placeholder="$t('auth.lastName')"
            autocomplete="family-name"
          />
        </div>
      </div>

      <!-- Email Field -->
      <div>
        <label for="email" class="input-label">{{ $t('auth.email') }}</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="input-field"
          :placeholder="$t('auth.emailPlaceholder')"
          autocomplete="email"
        />
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="input-label">{{ $t('auth.password') }}</label>
        <div class="relative">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="input-field pr-12"
            :placeholder="$t('auth.passwordPlaceholder')"
            autocomplete="new-password"
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
        <div v-if="form.password.length > 0" class="mt-2 text-caption space-y-1">
          <p :class="form.password.length >= 8 ? 'text-green-600' : 'text-neutral-400'">
            ✓ {{ $t('auth.atLeast8Chars') }}
          </p>
          <p :class="/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ {{ $t('auth.oneUppercase') }}
          </p>
          <p :class="/[a-z]/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ {{ $t('auth.oneLowercase') }}
          </p>
          <p :class="/\d/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ {{ $t('auth.oneNumber') }}
          </p>
          <p :class="/[@$!%*?&~#^()_+=\-\[\]{}|\\:&quot;'<>,.?\/]/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ {{ $t('auth.oneSpecialChar') }}
          </p>
        </div>
      </div>

      <!-- Confirm Password Field -->
      <div>
        <label for="confirmPassword" class="input-label">{{ $t('auth.confirmPassword') }}</label>
        <div class="relative">
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            class="input-field pr-12"
            :class="{ 'border-green-500': passwordsMatch, 'border-red-300': form.confirmPassword.length > 0 && !passwordsMatch }"
            :placeholder="$t('auth.confirmPassword')"
            autocomplete="new-password"
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
        <p v-if="form.confirmPassword.length > 0 && !passwordsMatch" class="mt-1 text-caption text-red-500">
          {{ $t('auth.passwordMismatch') }}
        </p>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading || passwordErrors.length > 0"
        class="btn-primary w-full"
        :class="{ 'opacity-70 cursor-not-allowed': isLoading }"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ $t('auth.creatingAccount') }}
        </span>
        <span v-else>{{ $t('auth.createAccount') }}</span>
      </button>

      <!-- Terms -->
      <p class="text-caption text-neutral-500 text-center">
        {{ $t('auth.agreeToTerms') }}
        <NuxtLink to="/terms" class="underline hover:text-aura-black">{{ $t('auth.termsOfService') }}</NuxtLink>
        {{ $t('auth.and') }}
        <NuxtLink to="/privacy" class="underline hover:text-aura-black">{{ $t('auth.privacyPolicy') }}</NuxtLink>.
      </p>

      <!-- Login Link -->
      <div class="text-center pt-4 border-t border-neutral-100">
        <p class="text-body text-neutral-600">
          {{ $t('auth.haveAccount') }}
          <NuxtLink to="/auth/login" class="text-aura-black font-medium hover:underline">
            {{ $t('auth.signIn') }}
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
