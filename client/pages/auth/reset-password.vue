<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const token = computed(() => route.query.token as string)

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
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
    error.value = err.data?.message || 'Failed to reset password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-aura-white rounded-sm shadow-card p-8 lg:p-10">
    <div v-if="isSuccess" class="text-center">
      <h2 class="font-serif text-heading-3 text-aura-black mb-4">Password Reset!</h2>
      <p class="text-body text-neutral-600 mb-8">Your password has been reset successfully.</p>
      <NuxtLink to="/auth/login" class="btn-primary">Sign In</NuxtLink>
    </div>

    <div v-else>
      <div class="text-center mb-8">
        <h2 class="font-serif text-heading-2 text-aura-black mb-2">Reset Password</h2>
        <p class="text-body text-neutral-600">Enter your new password below.</p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="password" class="input-label">New Password</label>
          <input id="password" v-model="password" type="password" required class="input-field" placeholder="Enter new password" />
        </div>
        <div>
          <label for="confirmPassword" class="input-label">Confirm Password</label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" required class="input-field" placeholder="Confirm new password" />
        </div>
        <button type="submit" :disabled="isLoading" class="btn-primary w-full">
          {{ isLoading ? 'Resetting...' : 'Reset Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
