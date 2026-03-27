<script setup lang="ts">
/**
 * Admin Abandoned Carts Page
 * AURA ARCHIVE - View and manage abandoned shopping carts
 */

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const carts = ref<any[]>([])
const pagination = ref<any>({})
const isLoading = ref(true)
const statusFilter = ref('')

const fetchCarts = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const url = `${config.public.apiUrl}/admin/abandoned-carts?status=${statusFilter.value}`
    const response = await $fetch<{ success: boolean; data: { carts: any[]; pagination: any } }>(
      url,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    carts.value = response.data.carts
    pagination.value = response.data.pagination
  } catch (error) {
    console.error('Failed to fetch carts:', error)
  } finally {
    isLoading.value = false
  }
}

const { formatPrice } = useCurrency()

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('vi-VN')
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    active: 'bg-yellow-100 text-yellow-700',
    recovered: 'bg-green-100 text-green-700',
    expired: 'bg-neutral-100 text-neutral-500',
    converted: 'bg-blue-100 text-blue-700',
  }
  return classes[status] || 'bg-neutral-100'
}

watch(statusFilter, fetchCarts)
onMounted(fetchCarts)
useSeoMeta({ title: 'Abandoned Carts | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.abandonedCarts.title') }}</h1>
      <select v-model="statusFilter" class="input-field w-auto">
        <option value="">{{ t('admin.allStatuses') }}</option>
        <option value="active">{{ t('common.active') }}</option>
        <option value="recovered">{{ t('admin.abandonedCarts.recovered') }}</option>
        <option value="expired">{{ t('admin.abandonedCarts.expired') }}</option>
      </select>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <div v-else-if="carts.length === 0" class="text-center py-12 text-neutral-500">
      {{ t('admin.abandonedCarts.noCarts') }}
    </div>

    <div v-else class="bg-white border rounded-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-neutral-50">
          <tr>
            <th class="text-left p-4 text-body-sm font-medium text-neutral-600">{{ t('admin.abandonedCarts.customer') }}</th>
            <th class="text-left p-4 text-body-sm font-medium text-neutral-600">{{ t('admin.products') }}</th>
            <th class="text-right p-4 text-body-sm font-medium text-neutral-600">{{ t('orders.total') }}</th>
            <th class="text-center p-4 text-body-sm font-medium text-neutral-600">{{ t('common.status') }}</th>
            <th class="text-left p-4 text-body-sm font-medium text-neutral-600">{{ t('admin.abandonedCarts.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cart in carts" :key="cart.id" class="border-t hover:bg-neutral-50">
            <td class="p-4">
              <p class="font-medium">{{ cart.user?.first_name }} {{ cart.user?.last_name }}</p>
              <p class="text-body-sm text-neutral-500">{{ cart.email || cart.user?.email }}</p>
              <p class="text-caption text-neutral-400">{{ cart.phone || cart.user?.phone }}</p>
            </td>
            <td class="p-4">
              <p class="text-body-sm">{{ cart.items?.length || 0 }} {{ t('shop.products').toLowerCase() }}</p>
            </td>
            <td class="p-4 text-right font-medium">
              {{ formatPrice(cart.total_amount) }}
            </td>
            <td class="p-4 text-center">
              <span :class="getStatusClass(cart.status)" class="px-2 py-1 text-caption rounded">
                {{ cart.status === 'active' ? t('admin.abandonedCarts.pending') : t(`admin.abandonedCarts.${cart.status}`) }}
              </span>
            </td>
            <td class="p-4 text-body-sm text-neutral-500">
              {{ formatDate(cart.created_at) }}
              <p v-if="cart.reminder_count" class="text-caption text-neutral-400">
                {{ t('admin.abandonedCarts.remindersSent', { count: cart.reminder_count }) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mt-6">
      <div class="bg-white border rounded-sm p-4 text-center">
        <p class="text-heading-3 font-serif text-aura-black">{{ pagination.total || 0 }}</p>
        <p class="text-body-sm text-neutral-500">{{ t('admin.abandonedCarts.totalCarts') }}</p>
      </div>
      <div class="bg-yellow-50 border border-yellow-200 rounded-sm p-4 text-center">
        <p class="text-heading-3 font-serif text-yellow-700">{{ carts.filter(c => c.status === 'active').length }}</p>
        <p class="text-body-sm text-yellow-600">{{ t('admin.abandonedCarts.pending') }}</p>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-sm p-4 text-center">
        <p class="text-heading-3 font-serif text-green-700">{{ carts.filter(c => c.status === 'recovered').length }}</p>
        <p class="text-body-sm text-green-600">{{ t('admin.abandonedCarts.recovered') }}</p>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-sm p-4 text-center">
        <p class="text-heading-3 font-serif text-blue-700">{{ carts.filter(c => c.status === 'converted').length }}</p>
        <p class="text-body-sm text-blue-600">{{ t('admin.abandonedCarts.converted') }}</p>
      </div>
    </div>
  </div>
</template>
