<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

// Form state
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Password validation
const passwordErrors = computed(() => {
  const errors = []
  if (form.password.length > 0 && form.password.length < 8) {
    errors.push('At least 8 characters')
  }
  if (form.password.length > 0 && !/[A-Z]/.test(form.password)) {
    errors.push('One uppercase letter')
  }
  if (form.password.length > 0 && !/[a-z]/.test(form.password)) {
    errors.push('One lowercase letter')
  }
  if (form.password.length > 0 && !/\d/.test(form.password)) {
    errors.push('One number')
  }
  return errors
})

const passwordsMatch = computed(() => {
  return form.password === form.confirmPassword && form.confirmPassword.length > 0
})

// Submit handler
const handleSubmit = async () => {
  if (passwordErrors.value.length > 0) {
    error.value = 'Please fix password requirements'
    return
  }

  if (!passwordsMatch.value) {
    error.value = 'Passwords do not match'
    return
  }

  error.value = ''
  isLoading.value = true

  try {
    const config = useRuntimeConfig()
    
    const response = await $fetch<{ success: boolean; data: { user: any; token: string } }>(
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
      localStorage.setItem('token', response.data.token)
      navigateTo('/')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Registration failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div class="text-center mb-8">
      <h2 class="font-serif text-heading-2 text-aura-black mb-2">Create Account</h2>
      <p class="text-body text-neutral-600">
        Join AURA ARCHIVE for exclusive access
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Name Fields -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="input-label">First Name</label>
          <input
            id="firstName"
            v-model="form.firstName"
            type="text"
            class="input-field"
            placeholder="First"
            autocomplete="given-name"
          />
        </div>
        <div>
          <label for="lastName" class="input-label">Last Name</label>
          <input
            id="lastName"
            v-model="form.lastName"
            type="text"
            class="input-field"
            placeholder="Last"
            autocomplete="family-name"
          />
        </div>
      </div>

      <!-- Email Field -->
      <div>
        <label for="email" class="input-label">Email Address</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="input-field"
          placeholder="your@email.com"
          autocomplete="email"
        />
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="input-label">Password</label>
        <div class="relative">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="input-field pr-12"
            placeholder="Create a password"
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
            ✓ At least 8 characters
          </p>
          <p :class="/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ One uppercase letter
          </p>
          <p :class="/[a-z]/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ One lowercase letter
          </p>
          <p :class="/\d/.test(form.password) ? 'text-green-600' : 'text-neutral-400'">
            ✓ One number
          </p>
        </div>
      </div>

      <!-- Confirm Password Field -->
      <div>
        <label for="confirmPassword" class="input-label">Confirm Password</label>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          required
          class="input-field"
          :class="{ 'border-green-500': passwordsMatch, 'border-red-300': form.confirmPassword.length > 0 && !passwordsMatch }"
          placeholder="Confirm your password"
          autocomplete="new-password"
        />
        <p v-if="form.confirmPassword.length > 0 && !passwordsMatch" class="mt-1 text-caption text-red-500">
          Passwords do not match
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
          Creating Account...
        </span>
        <span v-else>Create Account</span>
      </button>

      <!-- Terms -->
      <p class="text-caption text-neutral-500 text-center">
        By creating an account, you agree to our
        <NuxtLink to="/terms" class="underline hover:text-aura-black">Terms of Service</NuxtLink>
        and
        <NuxtLink to="/privacy" class="underline hover:text-aura-black">Privacy Policy</NuxtLink>.
      </p>

      <!-- Login Link -->
      <div class="text-center pt-4 border-t border-neutral-100">
        <p class="text-body text-neutral-600">
          Already have an account?
          <NuxtLink to="/auth/login" class="text-aura-black font-medium hover:underline">
            Sign In
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
