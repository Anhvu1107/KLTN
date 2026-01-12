<script setup lang="ts">
/**
 * Admin Orders Management
 * AURA ARCHIVE - Orders list with status management
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const token = computed(() => authStore.token)

const page = ref(1)
const status = ref('')

// Fetch orders
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { orders: any[]; pagination: any }
}>(() => `${config.public.apiUrl}/admin/orders?page=${page.value}&limit=20${status.value ? `&status=${status.value}` : ''}`, {
  headers: { Authorization: `Bearer ${token.value}` },
  watch: [page, status],
  server: false,
})

const orders = computed(() => data.value?.data?.orders || [])
const pagination = computed(() => data.value?.data?.pagination || {})

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

// Update order status
const updateStatus = async (orderId: string, newStatus: string) => {
  try {
    await $fetch(`${config.public.apiUrl}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { status: newStatus },
    })
    await refresh()
  } catch (error: any) {
    alert(error?.data?.message || t('notifications.updateError'))
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusClass = (s: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-purple-100 text-purple-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return classes[s] || 'bg-gray-100 text-gray-800'
}

const getNextStatuses = (current: string) => {
  const transitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  }
  return transitions[current] || []
}

useSeoMeta({
  title: 'Orders | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.orders') }}</h1>
        <p class="text-body text-neutral-600">{{ pagination.total || 0 }} {{ $t('admin.totalOrders').toLowerCase() }}</p>
      </div>
      
      <!-- Filter by status -->
      <select v-model="status" class="input-field w-48">
        <option value="">{{ $t('admin.allStatuses') }}</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ $t(`orders.${s.toLowerCase()}`) }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="text-center py-16">
      <p class="text-neutral-500">{{ $t('common.loading') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-sm shadow-card overflow-x-auto">
      <table class="w-full">
        <thead class="bg-neutral-50">
          <tr>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.orderId') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('admin.reviews.customer') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.total') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.status') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.payment') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.date') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" class="border-t border-neutral-100">
            <td class="py-4 px-4">
              <NuxtLink :to="`/admin/orders/${order.id}`" class="text-body-sm font-mono hover:underline">
                {{ order.id.slice(0, 8) }}...
              </NuxtLink>
            </td>
            <td class="py-4 px-4 text-body-sm">{{ order.user?.email || 'N/A' }}</td>
            <td class="py-4 px-4 text-body-sm font-medium">{{ formatPrice(order.total_amount) }}</td>
            <td class="py-4 px-4">
              <span :class="getStatusClass(order.status)" class="px-2 py-1 text-caption rounded-sm">
                {{ order.status }}
              </span>
            </td>
            <td class="py-4 px-4">
              <span 
                class="px-2 py-1 text-caption rounded-sm"
                :class="order.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
              >
                {{ order.payment_status }}
              </span>
            </td>
            <td class="py-4 px-4 text-body-sm text-neutral-600">{{ formatDate(order.created_at) }}</td>
            <td class="py-4 px-4">
              <div class="flex gap-2">
                <button
                  v-for="nextStatus in getNextStatuses(order.status)"
                  :key="nextStatus"
                  @click="updateStatus(order.id, nextStatus)"
                  class="text-caption px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-sm transition-colors"
                >
                  {{ nextStatus === 'CANCELLED' ? '✕' : '→' }} {{ nextStatus }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty -->
      <div v-if="orders.length === 0" class="text-center py-16">
        <p class="text-neutral-500">{{ $t('admin.orders') }} {{ $t('common.noResults').toLowerCase() }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
      <button
        v-for="p in Math.min(pagination.totalPages, 10)"
        :key="p"
        @click="page = p"
        class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
        :class="p === pagination.page ? 'bg-aura-black text-white' : 'bg-neutral-100 hover:bg-neutral-200'"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
