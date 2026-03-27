<script setup lang="ts">
/**
 * Admin Coupons Page
 * AURA ARCHIVE - Manage discount codes
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const { confirm: showConfirm } = useDialog()

// State
const coupons = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingCoupon = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)

// Form data
const formData = ref({
  code: '',
  name: '',
  description: '',
  type: 'PERCENTAGE',
  value: 0,
  min_order_amount: 0,
  max_discount_amount: null as number | null,
  max_uses: null as number | null,
  max_uses_per_user: 1,
  starts_at: '',
  expires_at: '',
  is_active: true,
})

// Fetch coupons
const fetchCoupons = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { coupons: any[] } }>(
      `${config.public.apiUrl}/admin/coupons`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    coupons.value = response.data.coupons
  } catch (error) {
    console.error('Failed to fetch coupons:', error)
  } finally {
    isLoading.value = false
  }
}

// Open create modal
const openCreateModal = () => {
  editingCoupon.value = null
  formData.value = {
    code: '',
    name: '',
    description: '',
    type: 'PERCENTAGE',
    value: 0,
    min_order_amount: 0,
    max_discount_amount: null,
    max_uses: null,
    max_uses_per_user: 1,
    starts_at: '',
    expires_at: '',
    is_active: true,
  }
  showModal.value = true
}

// Open edit modal
const openEditModal = (coupon: any) => {
  editingCoupon.value = coupon
  formData.value = {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description || '',
    type: coupon.type,
    value: parseFloat(coupon.value),
    min_order_amount: parseFloat(coupon.min_order_amount) || 0,
    max_discount_amount: coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : null,
    max_uses: coupon.max_uses,
    max_uses_per_user: coupon.max_uses_per_user || 1,
    starts_at: coupon.starts_at ? coupon.starts_at.split('T')[0] : '',
    expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
    is_active: coupon.is_active,
  }
  showModal.value = true
}

// Submit form
const submitForm = async () => {
  formError.value = ''
  isSubmitting.value = true

  try {
    const token = getToken()
    const url = editingCoupon.value
      ? `${config.public.apiUrl}/admin/coupons/${editingCoupon.value.id}`
      : `${config.public.apiUrl}/admin/coupons`
    
    await $fetch(url, {
      method: editingCoupon.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData.value,
    })

    showModal.value = false
    await fetchCoupons()
  } catch (error: any) {
    const msg = error.data?.message || ''
    // Map backend error messages to i18n keys
    const errorMap: Record<string, string> = {
      'Coupon code already exists': t('admin.coupons.codeExists'),
      'Invalid coupon code': t('admin.coupons.invalidCode'),
      'This coupon has expired': t('admin.coupons.couponExpired'),
      'This coupon is no longer active': t('admin.coupons.couponInactive'),
      'This coupon has reached its usage limit': t('admin.coupons.usageLimitReached'),
      'You have already used this coupon': t('admin.coupons.alreadyUsed'),
      'This coupon is not yet valid': t('admin.coupons.couponNotYetValid'),
    }
    formError.value = errorMap[msg] || (msg.includes('Minimum order') ? t('admin.coupons.minOrderRequired') : '') || msg || t('admin.coupons.saveFailed')
  } finally {
    isSubmitting.value = false
  }
}

// Delete coupon
const deleteCoupon = async (id: string) => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc', 'Hành động này không thể hoàn tác. Bạn có chắc chắn?'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return

  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/coupons/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchCoupons()
  } catch (error) {
    console.error('Failed to delete coupon:', error)
  }
}

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

// Check if expired
const isExpired = (expiresAt: string) => {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

onMounted(fetchCoupons)

useSeoMeta({ title: 'Coupon Management | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.coupons.title') }}</h1>
      <button @click="openCreateModal" class="btn-primary">
        + {{ t('admin.coupons.addCoupon') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Coupons Table -->
    <div v-else class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.code') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.name') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.type') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.value') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.usage') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.expires') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('common.status') }}</th>
            <th class="text-right px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="coupon in coupons" :key="coupon.id" class="border-b border-neutral-100 hover:bg-neutral-50">
            <td class="px-4 py-3 font-mono font-medium">{{ coupon.code }}</td>
            <td class="px-4 py-3 text-body-sm">{{ coupon.name }}</td>
            <td class="px-4 py-3 text-body-sm">
              <span class="px-2 py-1 rounded text-caption" :class="coupon.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'">
                {{ coupon.type === 'PERCENTAGE' ? t('admin.coupons.percentage') : t('admin.coupons.fixedAmount') }}
              </span>
            </td>
            <td class="px-4 py-3 text-body-sm">
              {{ coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `$${coupon.value}` }}
            </td>
            <td class="px-4 py-3 text-body-sm">
              {{ coupon.uses_count }} / {{ coupon.max_uses || '∞' }}
            </td>
            <td class="px-4 py-3 text-body-sm" :class="{ 'text-red-600': isExpired(coupon.expires_at) }">
              {{ formatDate(coupon.expires_at) }}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded text-caption" :class="coupon.is_active && !isExpired(coupon.expires_at) ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'">
                {{ coupon.is_active && !isExpired(coupon.expires_at) ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="openEditModal(coupon)" class="text-neutral-600 hover:text-aura-black mr-3">{{ t('common.edit') }}</button>
              <button @click="deleteCoupon(coupon.id)" class="text-red-600 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="coupons.length === 0" class="text-center py-12 text-neutral-500">
        {{ t('admin.coupons.noCoupons') }}
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-neutral-200">
            <h2 class="font-serif text-heading-4">{{ editingCoupon ? t('admin.coupons.editCoupon') : t('admin.coupons.createCoupon') }}</h2>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.coupons.code') }} *</label>
                <input v-model="formData.code" type="text" class="input-field uppercase" required />
              </div>
              <div>
                <label class="input-label">{{ t('admin.coupons.name') }} *</label>
                <input v-model="formData.name" type="text" class="input-field" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.coupons.type') }} *</label>
                <select v-model="formData.type" class="input-field">
                  <option value="PERCENTAGE">{{ t('admin.coupons.percentage') }} (%)</option>
                  <option value="FIXED_AMOUNT">{{ t('admin.coupons.fixedAmount') }} ($)</option>
                </select>
              </div>
              <div>
                <label class="input-label">{{ t('admin.coupons.value') }} *</label>
                <input v-model.number="formData.value" type="number" step="0.01" class="input-field" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.minOrderAmount') }}</label>
                <input v-model.number="formData.min_order_amount" type="number" step="0.01" class="input-field" />
              </div>
              <div v-if="formData.type === 'PERCENTAGE'">
                <label class="input-label">{{ t('admin.form.maxDiscount') }}</label>
                <input v-model.number="formData.max_discount_amount" type="number" step="0.01" class="input-field" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.maxUsesTotal') }}</label>
                <input v-model.number="formData.max_uses" type="number" class="input-field" :placeholder="t('admin.form.unlimited')" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.form.maxUsesPerUser') }}</label>
                <input v-model.number="formData.max_uses_per_user" type="number" class="input-field" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.startDate') }}</label>
                <input v-model="formData.starts_at" type="date" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.form.expiryDate') }}</label>
                <input v-model="formData.expires_at" type="date" class="input-field" />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="formData.is_active" type="checkbox" id="is_active" class="w-4 h-4" />
              <label for="is_active" class="text-body-sm">{{ t('common.active') }}</label>
            </div>

            <p v-if="formError" class="text-red-600 text-body-sm">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-body-sm text-neutral-600 hover:text-aura-black">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
