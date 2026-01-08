<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

// Form state
const email = ref('')
const isLoading = ref(false)
const isSubmitted = ref(false)
const error = ref('')

// Submit handler
const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const config = useRuntimeConfig()
    
    await $fetch(`${config.public.apiUrl}/auth/forgot-password`, {
      method: 'POST',
      body: { email: email.value },
    })

    isSubmitted.value = true
  } catch (err: any) {
    // Don't reveal if email exists (security best practice)
    // Show success message regardless
    isSubmitted.value = true
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <!-- Success State -->
    <div v-if="isSubmitted" class="text-center">
      <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="font-serif text-heading-3 text-aura-black mb-4">Check Your Email</h2>
      <p class="text-body text-neutral-600 mb-8">
        If an account exists with <strong>{{ email }}</strong>, you will receive a password reset link shortly.
      </p>
      <NuxtLink to="/auth/login" class="btn-secondary w-full">
        Back to Sign In
      </NuxtLink>
    </div>

    <!-- Form State -->
    <div v-else>
      <div class="text-center mb-8">
        <h2 class="font-serif text-heading-2 text-aura-black mb-2">Forgot Password</h2>
        <p class="text-body text-neutral-600">
          Enter your email and we'll send you a reset link.
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
            Sending...
          </span>
          <span v-else>Send Reset Link</span>
        </button>

        <!-- Back to Login -->
        <div class="text-center">
          <NuxtLink
            to="/auth/login"
            class="text-body-sm text-neutral-600 hover:text-aura-black transition-colors"
          >
            &larr; Back to Sign In
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
