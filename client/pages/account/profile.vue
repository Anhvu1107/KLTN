<script setup lang="ts">
/**
 * Edit Profile Page
 * AURA ARCHIVE - User profile settings
 */

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()

const config = useRuntimeConfig()
const { getAuthHeaders } = useAuthToken()

// Fetch profile
const { data: profileData, refresh } = await useFetch<{
  success: boolean
  data: { user: any }
}>(`${config.public.apiUrl}/users/profile`, {
  headers: getAuthHeaders(),
  server: false,
})

const user = computed(() => profileData.value?.data?.user)

// Profile form
const profileForm = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
})

// Password form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// States
const isUpdatingProfile = ref(false)
const isChangingPassword = ref(false)
const profileMessage = ref('')
const passwordMessage = ref('')
const profileError = ref('')
const passwordError = ref('')

// Initialize form when data loads
watch(user, (u) => {
  if (u) {
    profileForm.first_name = u.first_name || ''
    profileForm.last_name = u.last_name || ''
    profileForm.phone = u.phone || ''
    profileForm.address = u.address || ''
  }
}, { immediate: true })

// Update profile
const updateProfile = async () => {
  isUpdatingProfile.value = true
  profileMessage.value = ''
  profileError.value = ''

  try {
    await $fetch(`${config.public.apiUrl}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: profileForm,
    })

    profileMessage.value = 'Profile updated successfully!'
    await refresh()
  } catch (err: any) {
    profileError.value = err?.data?.message || 'Failed to update profile'
  } finally {
    isUpdatingProfile.value = false
  }
}

// Change password
const changePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'Passwords do not match'
    return
  }

  if (passwordForm.newPassword.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return
  }

  isChangingPassword.value = true
  passwordMessage.value = ''
  passwordError.value = ''

  try {
    await $fetch(`${config.public.apiUrl}/users/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    })

    passwordMessage.value = 'Password changed successfully!'
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err: any) {
    passwordError.value = err?.data?.message || 'Failed to change password'
  } finally {
    isChangingPassword.value = false
  }
}

useSeoMeta({
  title: 'Edit Profile | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-1 text-aura-black">{{ t('account.editProfile') }}</h1>
        <NuxtLink to="/account" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('common.backTo') }} {{ t('common.account') }}
        </NuxtLink>
      </div>

      <!-- Profile Form -->
      <form @submit.prevent="updateProfile" class="card p-6 mb-8">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('profile.personalInfo') }}</h2>

        <!-- Messages -->
        <div v-if="profileMessage" class="mb-4 p-3 bg-green-50 text-green-700 text-body-sm rounded-sm">
          {{ profileMessage }}
        </div>
        <div v-if="profileError" class="mb-4 p-3 bg-red-50 text-red-700 text-body-sm rounded-sm">
          {{ profileError }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="input-label">{{ $t('profile.firstName') }}</label>
            <input v-model="profileForm.first_name" type="text" class="input-field" />
          </div>
          <div>
            <label class="input-label">{{ $t('profile.lastName') }}</label>
            <input v-model="profileForm.last_name" type="text" class="input-field" />
          </div>
          <div>
            <label class="input-label">{{ $t('profile.phone') }}</label>
            <input v-model="profileForm.phone" type="tel" class="input-field" />
          </div>
          <div class="md:col-span-2">
            <label class="input-label">{{ $t('profile.address') }}</label>
            <textarea v-model="profileForm.address" rows="2" class="input-field"></textarea>
          </div>
        </div>

        <button type="submit" :disabled="isUpdatingProfile" class="btn-primary">
          {{ isUpdatingProfile ? t('common.saving') : t('admin.saveChanges') }}
        </button>
      </form>

      <!-- Password Form -->
      <form @submit.prevent="changePassword" class="card p-6">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('profile.changePassword') }}</h2>

        <!-- Messages -->
        <div v-if="passwordMessage" class="mb-4 p-3 bg-green-50 text-green-700 text-body-sm rounded-sm">
          {{ passwordMessage }}
        </div>
        <div v-if="passwordError" class="mb-4 p-3 bg-red-50 text-red-700 text-body-sm rounded-sm">
          {{ passwordError }}
        </div>

        <div class="space-y-4 mb-6">
          <div>
            <label class="input-label">{{ $t('profile.currentPassword') }}</label>
            <input v-model="passwordForm.currentPassword" type="password" class="input-field" />
          </div>
          <div>
            <label class="input-label">{{ $t('profile.newPassword') }}</label>
            <input v-model="passwordForm.newPassword" type="password" class="input-field" />
          </div>
          <div>
            <label class="input-label">{{ $t('profile.confirmPassword') }}</label>
            <input v-model="passwordForm.confirmPassword" type="password" class="input-field" />
          </div>
        </div>

        <button type="submit" :disabled="isChangingPassword" class="btn-secondary">
          {{ isChangingPassword ? t('profile.changing') : t('profile.changePassword') }}
        </button>
      </form>
    </div>
  </div>
</template>
