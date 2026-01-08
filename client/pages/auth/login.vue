<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

// Form state
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Submit handler
const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const config = useRuntimeConfig()
    
    const response = await $fetch<{ success: boolean; data: { user: any; token: string } }>(
      `${config.public.apiUrl}/auth/login`,
      {
        method: 'POST',
        body: { email: email.value, password: password.value },
      }
    )

    if (response.success) {
      // Store token (implement proper storage later)
      localStorage.setItem('token', response.data.token)
      
      // Redirect to shop or dashboard
      navigateTo('/')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Invalid email or password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div class="text-center mb-8">
      <h2 class="font-serif text-heading-2 text-aura-black mb-2">Welcome Back</h2>
      <p class="text-body text-neutral-600">
        Sign in to continue to your account
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Email Field -->
      <div>
        <label for="email" class="input-label">Email Address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="input-field"
          placeholder="your@email.com"
          autocomplete="email"
        />
      </div>

      <!-- Password Field -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label for="password" class="input-label mb-0">Password</label>
          <NuxtLink
            to="/auth/forgot-password"
            class="text-caption text-neutral-600 hover:text-aura-black transition-colors"
          >
            Forgot Password?
          </NuxtLink>
        </div>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="input-field pr-12"
            placeholder="Enter your password"
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
          Signing In...
        </span>
        <span v-else>Sign In</span>
      </button>

      <!-- Divider -->
      <div class="relative my-8">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-neutral-200"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="px-4 bg-aura-white text-caption text-neutral-500">OR</span>
        </div>
      </div>

      <!-- Register Link -->
      <div class="text-center">
        <p class="text-body text-neutral-600">
          Don't have an account?
          <NuxtLink to="/auth/register" class="text-aura-black font-medium hover:underline">
            Create Account
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
