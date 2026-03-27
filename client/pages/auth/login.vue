<script setup lang="ts">
/**
 * Login Page
 * AURA ARCHIVE - Authentication with Email and Google OAuth
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
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Handle successful login
const handleLoginSuccess = (userData: any, token: string) => {
  localStorage.setItem('token', token)
  authStore.token = token
  authStore.user = userData
  
  // Use external: true to force full page reload when switching layouts
  // This prevents layout glitches between auth → admin or auth → default
  if (userData.role === 'ADMIN') {
    navigateTo('/admin/dashboard', { external: true })
  } else {
    navigateTo('/', { external: true })
  }
}

// Email/password login
const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean; data: { user: any; token: string } }>(
      `${config.public.apiUrl}/auth/login`,
      {
        method: 'POST',
        body: { email: email.value, password: password.value },
      }
    )

    if (response.success) {
      handleLoginSuccess(response.data.user, response.data.token)
    }
  } catch (err: any) {
    error.value = err.data?.message || t('auth.invalidCredentials')
  } finally {
    isLoading.value = false
  }
}

// Google Sign-In
const handleGoogleLogin = async () => {
  error.value = ''
  isGoogleLoading.value = true

  try {
    // Load Google Identity Services
    if (typeof google === 'undefined') {
      // Google script not loaded, show message
      error.value = t('auth.googleNotAvailable')
      return
    }

    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: config.public.googleClientId || '',
      callback: handleGoogleCallback,
    })

    // Prompt the user to sign in
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: try popup
        google.accounts.id.renderButton(
          document.getElementById('google-signin-fallback')!,
          { theme: 'outline', size: 'large', width: '100%' }
        )
      }
    })
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
      <h2 class="font-serif text-heading-2 text-aura-black mb-2">{{ $t('auth.welcomeBack') }}</h2>
      <p class="text-body text-neutral-600">
        {{ $t('auth.signInToContinue') }}
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Social Login Buttons -->
    <div class="space-y-3 mb-6">
      <!-- Google Sign-In -->
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
      
      <!-- Hidden fallback for Google button -->
      <div id="google-signin-fallback" class="hidden"></div>
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

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Email Field -->
      <div>
        <label for="email" class="input-label">{{ $t('auth.email') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="input-field"
          :placeholder="$t('auth.emailPlaceholder')"
          autocomplete="email"
        />
      </div>

      <!-- Password Field -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label for="password" class="input-label mb-0">{{ $t('auth.password') }}</label>
          <NuxtLink
            to="/auth/forgot-password"
            class="text-caption text-neutral-600 hover:text-aura-black transition-colors"
          >
            {{ $t('auth.forgotPassword') }}
          </NuxtLink>
        </div>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="input-field pr-12"
            :placeholder="$t('auth.passwordPlaceholder')"
            autocomplete="current-password"
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
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="btn-primary w-full"
        :class="{ 'opacity-70 cursor-not-allowed': isLoading }"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ $t('auth.signingIn') }}
        </span>
        <span v-else>{{ $t('auth.signIn') }}</span>
      </button>

      <!-- Register Link -->
      <div class="text-center pt-4 border-t border-neutral-100">
        <p class="text-body text-neutral-600">
          {{ $t('auth.noAccount') }}
          <NuxtLink to="/auth/register" class="text-aura-black font-medium hover:underline">
            {{ $t('auth.createAccount') }}
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
