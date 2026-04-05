<script setup lang="ts">
/**
 * Verify OTP Page
 * AURA ARCHIVE - Email verification with 6-digit OTP
 */

import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const route = useRoute()
const authStore = useAuthStore()

const email = computed(() => route.query.email as string || '')
const otpDigits = ref(['', '', '', '', '', ''])
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(60)
const canResend = ref(false)

// OTP input refs
const inputRefs = ref<HTMLInputElement[]>([])

// Start cooldown timer
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const startCooldown = () => {
  resendCooldown.value = 60
  canResend.value = false
  cooldownInterval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      canResend.value = true
      if (cooldownInterval) clearInterval(cooldownInterval)
    }
  }, 1000)
}

onMounted(() => {
  startCooldown()
  nextTick(() => {
    inputRefs.value[0]?.focus()
  })
})

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})

// Handle digit input
const handleInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value

  // Only allow digits
  if (!/^\d*$/.test(value)) {
    otpDigits.value[index] = ''
    return
  }

  // Handle paste of full OTP
  if (value.length > 1) {
    const digits = value.slice(0, 6).split('')
    digits.forEach((d, i) => {
      if (i < 6) otpDigits.value[i] = d
    })
    inputRefs.value[Math.min(digits.length, 5)]?.focus()
    return
  }

  otpDigits.value[index] = value.slice(-1)

  // Auto-focus next input
  if (value && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }

  // Auto-submit when all digits entered
  const fullOtp = otpDigits.value.join('')
  if (fullOtp.length === 6) {
    handleVerify()
  }
}

// Handle backspace
const handleKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

// Handle paste
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') || ''
  const digits = pasted.replace(/\D/g, '').slice(0, 6).split('')
  digits.forEach((d, i) => {
    if (i < 6) otpDigits.value[i] = d
  })
  if (digits.length === 6) {
    inputRefs.value[5]?.focus()
    handleVerify()
  } else {
    inputRefs.value[Math.min(digits.length, 5)]?.focus()
  }
}

// Verify OTP
const handleVerify = async () => {
  const otp = otpDigits.value.join('')
  if (otp.length !== 6) {
    error.value = t('auth.otpInvalid')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { user: any; token: string } }>(
      `${config.public.apiUrl}/auth/verify-otp`,
      {
        method: 'POST',
        body: { email: email.value, otp },
      }
    )

    if (response.success) {
      // Auto login after verification
      localStorage.setItem('token', response.data.token)
      authStore.token = response.data.token
      authStore.user = response.data.user
      navigateTo('/', { external: true })
    }
  } catch (err: any) {
    error.value = err.data?.message || t('auth.otpInvalid')
    // Clear OTP on error
    otpDigits.value = ['', '', '', '', '', '']
    nextTick(() => inputRefs.value[0]?.focus())
  } finally {
    isLoading.value = false
  }
}

// Resend OTP
const handleResend = async () => {
  if (!canResend.value) return

  error.value = ''
  success.value = ''

  try {
    await $fetch(`${config.public.apiUrl}/auth/resend-otp`, {
      method: 'POST',
      body: { email: email.value },
    })

    success.value = t('auth.otpResent')
    startCooldown()
    otpDigits.value = ['', '', '', '', '', '']
    nextTick(() => inputRefs.value[0]?.focus())
  } catch (err: any) {
    error.value = err.data?.message || t('errors.somethingWrong')
  }
}
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div class="text-center mb-8">
      <!-- Email Icon -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="font-serif text-heading-2 text-aura-black mb-2">{{ $t('auth.verifyEmail') }}</h2>
      <p class="text-body text-neutral-600">{{ $t('auth.verifyEmailSubtitle') }}</p>
      <p v-if="email" class="text-body-sm text-neutral-500 mt-2">
        {{ $t('auth.otpSentTo', { email }) }}
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Success Alert -->
    <div
      v-if="success"
      class="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm text-body-sm text-green-700"
    >
      {{ success }}
    </div>

    <!-- OTP Input -->
    <form @submit.prevent="handleVerify" class="space-y-8">
      <div class="flex justify-center gap-3">
        <input
          v-for="(digit, index) in otpDigits"
          :key="index"
          :ref="el => { if (el) inputRefs[index] = el as HTMLInputElement }"
          type="text"
          inputmode="numeric"
          maxlength="6"
          :value="digit"
          @input="handleInput(index, $event)"
          @keydown="handleKeydown(index, $event)"
          @paste="handlePaste"
          class="w-12 h-14 text-center text-xl font-bold border-2 border-neutral-200 rounded-sm focus:border-aura-black focus:outline-none transition-colors"
          :class="{ 'border-aura-black': digit }"
          :disabled="isLoading"
        />
      </div>

      <!-- Verify Button -->
      <button
        type="submit"
        :disabled="isLoading || otpDigits.join('').length !== 6"
        class="btn-primary w-full"
        :class="{ 'opacity-70 cursor-not-allowed': isLoading || otpDigits.join('').length !== 6 }"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ $t('auth.verifying') }}
        </span>
        <span v-else>{{ $t('auth.verify') }}</span>
      </button>

      <!-- Resend OTP -->
      <div class="text-center">
        <button
          v-if="canResend"
          type="button"
          @click="handleResend"
          class="text-body-sm text-aura-black font-medium hover:underline"
        >
          {{ $t('auth.resendOtp') }}
        </button>
        <span v-else class="text-body-sm text-neutral-500">
          {{ $t('auth.resendIn', { seconds: resendCooldown }) }}
        </span>
      </div>

      <!-- Back to Login -->
      <div class="text-center">
        <NuxtLink
          to="/auth/login"
          class="text-body-sm text-neutral-600 hover:text-aura-black transition-colors"
        >
          &larr; {{ $t('auth.backToLogin') }}
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
