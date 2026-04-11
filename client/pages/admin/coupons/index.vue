<script setup lang="ts">
/**
 * Admin Coupons Page
 * AURA ARCHIVE - Manage discount codes with visibility tiers
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

// Users for PERSONAL assignment
const allUsers = ref<any[]>([])
const userSearchQuery = ref('')
const isLoadingUsers = ref(false)

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
  visibility: 'PUBLIC',
  assigned_user_ids: [] as string[],
})

// Visibility options
const visibilityOptions = [
  { value: 'PUBLIC', label: () => t('admin.coupons.visibilityPublic'), color: 'bg-green-100 text-green-700' },
  { value: 'PRIVATE', label: () => t('admin.coupons.visibilityPrivate'), color: 'bg-amber-100 text-amber-700' },
  { value: 'PERSONAL', label: () => t('admin.coupons.visibilityPersonal'), color: 'bg-blue-100 text-blue-700' },
]

const couponTypeOptions = [
  { value: 'PERCENTAGE', label: () => t('admin.coupons.percentage'), color: 'bg-blue-100 text-blue-700' },
  { value: 'FIXED_AMOUNT', label: () => t('admin.coupons.fixedAmount'), color: 'bg-green-100 text-green-700' },
  { value: 'FREE_SHIPPING', label: () => t('admin.coupons.freeShipping'), color: 'bg-emerald-100 text-emerald-700' },
]

const getVisibilityOption = (value: string) => visibilityOptions.find(v => v.value === value) || visibilityOptions[0]
const getCouponTypeOption = (value: string) => couponTypeOptions.find(v => v.value === value) || couponTypeOptions[0]

const formatCouponValue = (coupon: any) => {
  if (coupon.type === 'PERCENTAGE') return `${coupon.value}%`
  if (coupon.type === 'FREE_SHIPPING') {
    return coupon.max_discount_amount
      ? `${t('admin.coupons.freeShipping')} • ${t('admin.coupons.shippingDiscountCap')}: $${coupon.max_discount_amount}`
      : t('admin.coupons.freeShipping')
  }
  return `$${coupon.value}`
}

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

// Fetch users for assignment
const fetchUsers = async () => {
  if (allUsers.value.length) return
  isLoadingUsers.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { users: any[] } }>(
      `${config.public.apiUrl}/admin/users?limit=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    allUsers.value = response.data.users || []
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    isLoadingUsers.value = false
  }
}

// Filtered users for search
const filteredUsers = computed(() => {
  if (!userSearchQuery.value.trim()) return allUsers.value.slice(0, 20)
  const q = userSearchQuery.value.toLowerCase()
  return allUsers.value.filter((u: any) =>
    (u.email || '').toLowerCase().includes(q) ||
    `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q)
  ).slice(0, 20)
})

const toggleUserAssignment = (userId: string) => {
  const index = formData.value.assigned_user_ids.indexOf(userId)
  if (index >= 0) {
    formData.value.assigned_user_ids.splice(index, 1)
  } else {
    formData.value.assigned_user_ids.push(userId)
  }
}

const isUserAssigned = (userId: string) => formData.value.assigned_user_ids.includes(userId)

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
    visibility: 'PUBLIC',
    assigned_user_ids: [],
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
    visibility: coupon.visibility || 'PUBLIC',
    assigned_user_ids: (coupon.assignments || []).map((a: any) => a.user_id),
  }
  if (coupon.visibility === 'PERSONAL') {
    fetchUsers()
  }
  showModal.value = true
}

// Watch visibility for lazy-loading users
watch(() => formData.value.visibility, (v) => {
  if (v === 'PERSONAL') fetchUsers()
})

watch(() => formData.value.type, (type) => {
  if (type === 'FREE_SHIPPING') {
    formData.value.value = 0
  }
})

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
    const errorMap: Record<string, string> = {
      'Coupon code already exists': t('admin.coupons.codeExists'),
      'Invalid coupon code': t('admin.coupons.invalidCode'),
      'This coupon has expired': t('admin.coupons.couponExpired'),
      'This coupon is no longer active': t('admin.coupons.couponInactive'),
      'This coupon has reached its usage limit': t('admin.coupons.usageLimitReached'),
      'You have already used this coupon': t('admin.coupons.alreadyUsed'),
      'This coupon is not yet valid': t('admin.coupons.couponNotYetValid'),
      'This code is not a free shipping coupon': t('admin.coupons.notShippingCoupon'),
      'This code is not a product discount coupon': t('admin.coupons.notDiscountCoupon'),
      'A free shipping coupon is already applied': t('admin.coupons.shippingCouponAlreadyApplied'),
      'A product discount coupon is already applied': t('admin.coupons.discountCouponAlreadyApplied'),
      'Shipping is already free for this order': t('admin.coupons.shippingAlreadyFree'),
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

// Format user display
const formatUserName = (user: any) => {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return name || user.email
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
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.coupons.visibility') }}</th>
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
              <span class="px-2 py-1 rounded text-caption" :class="getCouponTypeOption(coupon.type).color">
                {{ getCouponTypeOption(coupon.type).label() }}
              </span>
            </td>
            <td class="px-4 py-3 text-body-sm">
              {{ formatCouponValue(coupon) }}
            </td>
            <td class="px-4 py-3 text-body-sm">
              <span class="px-2 py-1 rounded text-caption" :class="getVisibilityOption(coupon.visibility || 'PUBLIC').color">
                {{ getVisibilityOption(coupon.visibility || 'PUBLIC').label() }}
              </span>
              <span v-if="coupon.visibility === 'PERSONAL' && coupon.assignments?.length" class="ml-1 text-caption text-neutral-400">
                ({{ coupon.assignments.length }})
              </span>
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
                  <option value="FREE_SHIPPING">{{ t('admin.coupons.freeShipping') }}</option>
                </select>
              </div>
              <div v-if="formData.type !== 'FREE_SHIPPING'">
                <label class="input-label">{{ t('admin.coupons.value') }} *</label>
                <input v-model.number="formData.value" type="number" step="0.01" class="input-field" required />
              </div>
              <div v-else class="rounded border border-emerald-200 bg-emerald-50/70 p-3 text-body-sm text-emerald-800">
                {{ t('admin.coupons.freeShippingDesc') }}
              </div>
            </div>

            <!-- Visibility -->
            <div>
              <label class="input-label">{{ t('admin.coupons.visibility') }} *</label>
              <div class="flex gap-2 mt-1">
                <button
                  v-for="opt in visibilityOptions"
                  :key="opt.value"
                  type="button"
                  class="px-4 py-2 rounded text-caption border transition-all"
                  :class="formData.visibility === opt.value ? opt.color + ' border-current font-medium' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'"
                  @click="formData.visibility = opt.value"
                >
                  {{ opt.label() }}
                </button>
              </div>
              <p class="text-caption text-neutral-400 mt-1">
                <template v-if="formData.visibility === 'PUBLIC'">{{ t('admin.coupons.visibilityPublicDesc') }}</template>
                <template v-else-if="formData.visibility === 'PRIVATE'">{{ t('admin.coupons.visibilityPrivateDesc') }}</template>
                <template v-else>{{ t('admin.coupons.visibilityPersonalDesc') }}</template>
              </p>
            </div>

            <!-- Personal: User Assignment -->
            <div v-if="formData.visibility === 'PERSONAL'" class="border border-blue-200 rounded p-4 bg-blue-50/50">
              <label class="input-label mb-2">{{ t('admin.coupons.assignUsers') }}</label>
              <input
                v-model="userSearchQuery"
                type="text"
                :placeholder="t('admin.coupons.searchUsers')"
                class="input-field mb-2"
              />
              
              <!-- Selected users -->
              <div v-if="formData.assigned_user_ids.length" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="uid in formData.assigned_user_ids"
                  :key="uid"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-caption rounded"
                >
                  {{ formatUserName(allUsers.find((u: any) => u.id === uid) || { email: uid }) }}
                  <button type="button" @click="toggleUserAssignment(uid)" class="hover:text-blue-900">&times;</button>
                </span>
              </div>
              
              <!-- User list -->
              <div v-if="isLoadingUsers" class="text-center py-4 text-neutral-400 text-body-sm">
                {{ t('common.loading') }}...
              </div>
              <div v-else class="max-h-40 overflow-y-auto border border-neutral-200 rounded bg-white">
                <button
                  v-for="user in filteredUsers"
                  :key="user.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 text-body-sm border-b border-neutral-100 last:border-0"
                  @click="toggleUserAssignment(user.id)"
                >
                  <span class="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                    :class="isUserAssigned(user.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-300'">
                    <svg v-if="isUserAssigned(user.id)" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="truncate">{{ formatUserName(user) }}</span>
                  <span class="text-neutral-400 text-caption ml-auto flex-shrink-0">{{ user.email }}</span>
                </button>
                <div v-if="!filteredUsers.length" class="px-3 py-4 text-center text-neutral-400 text-body-sm">
                  {{ t('admin.coupons.noUsersFound') }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.minOrderAmount') }}</label>
                <input v-model.number="formData.min_order_amount" type="number" step="0.01" class="input-field" />
              </div>
              <div v-if="formData.type === 'PERCENTAGE' || formData.type === 'FREE_SHIPPING'">
                <label class="input-label">
                  {{ formData.type === 'FREE_SHIPPING' ? t('admin.coupons.shippingDiscountCap') : t('admin.form.maxDiscount') }}
                </label>
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
