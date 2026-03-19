<script setup lang="ts">
/**
 * Address Book Page
 * AURA ARCHIVE - Manage user shipping addresses
 */

definePageMeta({
  middleware: 'auth',
})

const config = useRuntimeConfig()
const { t } = useI18n()
const { confirm: showConfirm } = useDialog()

// State
const addresses = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingAddress = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)

// Form data
const formData = ref({
  label: '',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  district: '',
  ward: '',
  postal_code: '',
  is_default: false,
})

// Fetch addresses
const fetchAddresses = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{ success: boolean; data: { addresses: any[] } }>(
      `${config.public.apiUrl}/addresses`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    addresses.value = response.data.addresses
  } catch (error) {
    console.error('Failed to fetch addresses:', error)
  } finally {
    isLoading.value = false
  }
}

// Open create modal
const openCreateModal = () => {
  editingAddress.value = null
  formData.value = {
    label: '',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    ward: '',
    postal_code: '',
    is_default: false,
  }
  showModal.value = true
}

// Open edit modal
const openEditModal = (address: any) => {
  editingAddress.value = address
  formData.value = {
    label: address.label || '',
    full_name: address.full_name,
    phone: address.phone,
    address_line1: address.address_line1,
    address_line2: address.address_line2 || '',
    city: address.city,
    district: address.district || '',
    ward: address.ward || '',
    postal_code: address.postal_code || '',
    is_default: address.is_default,
  }
  showModal.value = true
}

// Submit form
const submitForm = async () => {
  formError.value = ''
  isSubmitting.value = true

  try {
    const token = localStorage.getItem('token')
    const url = editingAddress.value
      ? `${config.public.apiUrl}/addresses/${editingAddress.value.id}`
      : `${config.public.apiUrl}/addresses`
    
    await $fetch(url, {
      method: editingAddress.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData.value,
    })

    showModal.value = false
    await fetchAddresses()
  } catch (error: any) {
    formError.value = error.data?.message || 'Failed to save address'
  } finally {
    isSubmitting.value = false
  }
}

// Delete address
const deleteAddress = async (id: string) => {
  const isConfirmed = await showConfirm(t('common.confirmDelete'))
  if (!isConfirmed) return

  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchAddresses()
  } catch (error) {
    console.error('Failed to delete address:', error)
  }
}

// Set as default
const setDefault = async (id: string) => {
  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchAddresses()
  } catch (error) {
    console.error('Failed to set default:', error)
  }
}

onMounted(fetchAddresses)

useSeoMeta({ title: 'Address Book | AURA ARCHIVE' })
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-4xl">
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('account.addressBook') }}</h1>
        <button @click="openCreateModal" class="btn-primary">
          + {{ t('account.addAddress') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
      </div>

      <!-- Address List -->
      <div v-else class="space-y-4">
        <div 
          v-for="address in addresses" 
          :key="address.id"
          class="bg-white rounded-sm border p-4"
          :class="address.is_default ? 'border-accent-navy' : 'border-neutral-200'"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span v-if="address.label" class="px-2 py-0.5 bg-neutral-100 text-caption rounded">
                  {{ address.label }}
                </span>
                <span v-if="address.is_default" class="px-2 py-0.5 bg-accent-navy text-white text-caption rounded">
                  {{ t('account.default') }}
                </span>
              </div>
              
              <p class="font-medium text-aura-black">{{ address.full_name }}</p>
              <p class="text-body-sm text-neutral-600">{{ address.phone }}</p>
              <p class="text-body-sm text-neutral-600 mt-1">
                {{ address.address_line1 }}
                <span v-if="address.address_line2">, {{ address.address_line2 }}</span>
              </p>
              <p class="text-body-sm text-neutral-600">
                {{ [address.ward, address.district, address.city].filter(Boolean).join(', ') }}
              </p>
            </div>

            <div class="flex flex-col gap-2 ml-4">
              <button @click="openEditModal(address)" class="text-body-sm text-neutral-600 hover:text-aura-black">
                {{ t('common.edit') }}
              </button>
              <button v-if="!address.is_default" @click="setDefault(address.id)" class="text-body-sm text-accent-navy hover:underline">
                {{ t('account.setDefault') }}
              </button>
              <button @click="deleteAddress(address.id)" class="text-body-sm text-red-600 hover:text-red-700">
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="addresses.length === 0" class="text-center py-12 text-neutral-500">
          {{ t('account.noAddresses') }}
        </div>
      </div>

      <!-- Back link -->
      <div class="mt-8">
        <NuxtLink to="/account" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('common.backTo') }} {{ t('common.account') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-sm w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-neutral-200">
            <h2 class="font-serif text-heading-4">{{ editingAddress ? t('account.editAddress') : t('account.addAddress') }}</h2>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-4">
            <div>
              <label class="input-label">{{ $t('address.label') }}</label>
              <input v-model="formData.label" type="text" class="input-field" :placeholder="$t('address.labelPlaceholder')" />
            </div>

            <div>
              <label class="input-label">{{ $t('checkout.fullName') }} *</label>
              <input v-model="formData.full_name" type="text" class="input-field" required />
            </div>

            <div>
              <label class="input-label">{{ $t('checkout.phone') }} *</label>
              <input v-model="formData.phone" type="tel" class="input-field" required />
            </div>

            <div>
              <label class="input-label">{{ $t('checkout.address') }} *</label>
              <input v-model="formData.address_line1" type="text" class="input-field" :placeholder="$t('address.addressPlaceholder')" required />
            </div>

            <div>
              <label class="input-label">{{ $t('address.addressLine2') }}</label>
              <input v-model="formData.address_line2" type="text" class="input-field" :placeholder="$t('address.addressLine2Placeholder')" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ $t('checkout.ward') }}</label>
                <input v-model="formData.ward" type="text" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ $t('checkout.district') }}</label>
                <input v-model="formData.district" type="text" class="input-field" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ $t('checkout.city') }} *</label>
                <input v-model="formData.city" type="text" class="input-field" required />
              </div>
              <div>
                <label class="input-label">{{ $t('address.postalCode') }}</label>
                <input v-model="formData.postal_code" type="text" class="input-field" />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="formData.is_default" type="checkbox" id="is_default" class="w-4 h-4" />
              <label for="is_default" class="text-body-sm">{{ $t('address.setAsDefault') }}</label>
            </div>

            <p v-if="formError" class="text-red-600 text-body-sm">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-body-sm text-neutral-600 hover:text-aura-black">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? t('common.saving') : t('account.saveAddress') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
