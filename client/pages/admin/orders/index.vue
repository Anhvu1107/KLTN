<script setup lang="ts">
import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { alert: showAlert } = useDialog()
const token = computed(() => authStore.token)

const page = ref(1)
const status = ref('')
const selectedStatus = ref<Record<string, string>>({})
const updatingOrderId = ref('')
const updatingPaymentOrderId = ref('')

const { data, pending } = await useFetch<{
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

const statusTone: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-800 border-sky-200',
  PROCESSING: 'bg-teal-50 text-teal-800 border-teal-200',
  SHIPPED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
}

const statusCounts = computed(() => {
  return orders.value.reduce((acc: Record<string, number>, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})
})

const visibleStatusSummary = computed(() => {
  return statuses
    .filter((s) => statusCounts.value[s] || status.value === s)
    .map((s) => ({ value: s, count: statusCounts.value[s] || 0 }))
})

const { formatPrice } = useCurrency()

const applyUpdatedOrder = (updatedOrder: any) => {
  const list = data.value?.data?.orders
  if (!list || !updatedOrder?.id) return

  const index = list.findIndex((order: any) => order.id === updatedOrder.id)
  if (index === -1) return

  if (status.value && updatedOrder.status !== status.value) {
    list.splice(index, 1)
    if (data.value?.data?.pagination?.total) {
      data.value.data.pagination.total = Math.max(data.value.data.pagination.total - 1, 0)
    }
    return
  }

  list.splice(index, 1, {
    ...list[index],
    ...updatedOrder,
    user: updatedOrder.user || list[index].user,
  })
}

const updateStatus = async (orderId: string, newStatus: string) => {
  if (!newStatus || updatingOrderId.value) return

  try {
    updatingOrderId.value = orderId
    const response = await $fetch<{ data: { order: any } }>(`${config.public.apiUrl}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { status: newStatus },
    })
    selectedStatus.value[orderId] = ''
    applyUpdatedOrder(response.data.order)
  } catch (error: any) {
    const msg = error?.data?.message || error?.statusMessage || error?.message || t('notifications.updateError')
    const statusCode = error?.statusCode || error?.status || ''
    showAlert({
      title: t('notifications.error', 'Loi'),
      message: statusCode ? `[${statusCode}] ${msg}` : msg,
      type: 'danger',
    })
  } finally {
    updatingOrderId.value = ''
  }
}

const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
  if (!paymentStatus || updatingPaymentOrderId.value || updatingOrderId.value) return

  try {
    updatingPaymentOrderId.value = orderId
    const response = await $fetch<{ data: { order: any } }>(`${config.public.apiUrl}/admin/orders/${orderId}/payment-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { paymentStatus },
    })
    applyUpdatedOrder(response.data.order)
  } catch (error: any) {
    const msg = error?.data?.message || error?.statusMessage || error?.message || t('notifications.updateError')
    const statusCode = error?.statusCode || error?.status || ''
    showAlert({
      title: t('notifications.error', 'Loi'),
      message: statusCode ? `[${statusCode}] ${msg}` : msg,
      type: 'danger',
    })
  } finally {
    updatingPaymentOrderId.value = ''
  }
}

const formatDate = (date: string) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    PENDING: t('orders.pending'),
    CONFIRMED: t('orders.confirmed'),
    PROCESSING: t('orders.processing'),
    SHIPPED: t('orders.shipped'),
    DELIVERED: t('orders.delivered'),
    CANCELLED: t('orders.cancelled'),
  }
  return map[s] || s
}

const paymentStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    PENDING: t('orders.paymentPending'),
    PAID: t('orders.paymentPaid'),
    FAILED: t('orders.paymentFailed'),
    REFUNDED: t('orders.paymentRefunded'),
  }
  return map[s] || s
}

const getStatusClass = (s: string) => statusTone[s] || 'bg-gray-50 text-gray-800 border-gray-200'

const getPaymentStatusClass = (s: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-800 border-rose-200',
    REFUNDED: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  }
  return classes[s] || 'bg-gray-50 text-gray-800 border-gray-200'
}

const getNextStatuses = (current: string) => {
  const transitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PENDING', 'PROCESSING', 'CANCELLED'],
    PROCESSING: ['CONFIRMED', 'SHIPPED', 'CANCELLED'],
    SHIPPED: ['PROCESSING', 'DELIVERED'],
    DELIVERED: ['SHIPPED'],
    CANCELLED: ['PENDING'],
  }
  return transitions[current] || []
}

const getPrimaryNextStatus = (current: string) => {
  const next: Record<string, string> = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'PROCESSING',
    PROCESSING: 'SHIPPED',
    SHIPPED: 'DELIVERED',
    CANCELLED: 'PENDING',
  }
  return next[current] || ''
}

const getOtherStatuses = (current: string) => {
  const primary = getPrimaryNextStatus(current)
  return getNextStatuses(current).filter((s) => s !== primary)
}

const canConfirmPayment = (order: any) => {
  return ['COD', 'BANK_TRANSFER'].includes(order.payment_method) &&
    ['PENDING', 'FAILED'].includes(order.payment_status) &&
    order.status !== 'CANCELLED'
}

const canMoveToStatus = (order: any, nextStatus: string) => {
  if (!nextStatus) return false

  const onlinePaymentMethods = ['MOMO', 'VNPAY', 'PAYPAL']
  const fulfillmentStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

  if (
    onlinePaymentMethods.includes(order.payment_method) &&
    fulfillmentStatuses.includes(nextStatus) &&
    order.payment_status !== 'PAID'
  ) {
    return false
  }

  return true
}

const getPrimaryNextStatusForOrder = (order: any) => {
  const nextStatus = getPrimaryNextStatus(order.status)
  return canMoveToStatus(order, nextStatus) ? nextStatus : ''
}

const getOtherStatusesForOrder = (order: any) => {
  return getOtherStatuses(order.status).filter((nextStatus) => canMoveToStatus(order, nextStatus))
}

const applySelectedStatus = (orderId: string) => {
  updateStatus(orderId, selectedStatus.value[orderId])
}

const clearFilters = () => {
  status.value = ''
  page.value = 1
}

watch(status, () => {
  page.value = 1
})

useSeoMeta({
  title: 'Orders | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-6 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="mb-1 text-caption font-medium uppercase text-neutral-500">{{ $t('admin.orders') }}</p>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.orders') }}</h1>
        <p class="mt-2 text-body-sm text-neutral-600">
          {{ pagination.total || 0 }} {{ $t('admin.totalOrders').toLowerCase() }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="sr-only" for="order-status-filter">{{ $t('orders.status') }}</label>
        <select id="order-status-filter" v-model="status" class="input-field min-w-56 sm:w-60">
          <option value="">{{ $t('admin.allStatuses') }}</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </select>
        <button
          v-if="status"
          type="button"
          class="h-12 border border-neutral-300 px-4 text-body-sm font-medium text-neutral-700 transition-colors hover:border-aura-black hover:text-aura-black"
          @click="clearFilters"
        >
          {{ $t('shop.clearFilters') }}
        </button>
      </div>
    </div>

    <div v-if="visibleStatusSummary.length" class="mb-5 flex flex-wrap gap-2">
      <button
        type="button"
        class="border px-3 py-2 text-body-sm font-medium transition-colors"
        :class="!status ? 'border-aura-black bg-aura-black text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'"
        @click="status = ''"
      >
        {{ $t('admin.allStatuses') }}
      </button>
      <button
        v-for="item in visibleStatusSummary"
        :key="item.value"
        type="button"
        class="border px-3 py-2 text-body-sm font-medium transition-colors"
        :class="status === item.value ? 'border-aura-black bg-aura-black text-white' : `${getStatusClass(item.value)} hover:border-aura-black`"
        @click="status = item.value"
      >
        {{ statusLabel(item.value) }}
        <span class="ml-2 text-caption opacity-70">{{ item.count }}</span>
      </button>
    </div>

    <div v-if="pending" class="border border-neutral-200 bg-white py-16 text-center shadow-soft">
      <p class="text-neutral-500">{{ $t('common.loading') }}</p>
    </div>

    <div v-else class="overflow-hidden border border-neutral-200 bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px]">
          <thead class="bg-neutral-50">
            <tr>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('orders.orderId') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('admin.reviews.customer') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('orders.total') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('orders.status') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('orders.payment') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('orders.date') }}</th>
              <th class="px-5 py-4 text-left text-caption font-medium uppercase text-neutral-500">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id" class="border-t border-neutral-100 transition-colors hover:bg-neutral-50/80">
              <td class="px-5 py-4 align-top">
                <NuxtLink :to="`/admin/orders/${order.id}`" class="font-mono text-body-sm font-medium text-aura-black hover:underline">
                  {{ order.order_number || order.id.slice(0, 8) + '...' }}
                </NuxtLink>
              </td>
              <td class="px-5 py-4 align-top">
                <p class="max-w-56 truncate text-body-sm text-neutral-900">{{ order.user?.email || 'N/A' }}</p>
              </td>
              <td class="px-5 py-4 align-top text-body-sm font-semibold text-neutral-900">{{ formatPrice(order.total_amount) }}</td>
              <td class="px-5 py-4 align-top">
                <span :class="getStatusClass(order.status)" class="inline-flex border px-2.5 py-1 text-caption font-medium">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td class="px-5 py-4 align-top">
                <span :class="getPaymentStatusClass(order.payment_status)" class="inline-flex border px-2.5 py-1 text-caption font-medium">
                  {{ paymentStatusLabel(order.payment_status) }}
                </span>
              </td>
              <td class="px-5 py-4 align-top text-body-sm text-neutral-600">{{ formatDate(order.created_at || order.createdAt) }}</td>
              <td class="px-5 py-4 align-top">
                <div class="flex min-w-[300px] flex-wrap items-center gap-2">
                  <NuxtLink
                    :to="`/admin/orders/${order.id}`"
                    class="inline-flex h-9 items-center border border-neutral-300 px-3 text-body-sm font-medium text-neutral-700 transition-colors hover:border-aura-black hover:text-aura-black"
                  >
                    {{ $t('common.view') || 'View' }}
                  </NuxtLink>

                  <button
                    v-if="canConfirmPayment(order)"
                    type="button"
                    class="inline-flex h-9 items-center border border-emerald-300 bg-emerald-50 px-3 text-body-sm font-medium text-emerald-800 transition-colors hover:border-emerald-500 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                    :disabled="Boolean(updatingPaymentOrderId || updatingOrderId)"
                    @click="updatePaymentStatus(order.id, 'PAID')"
                  >
                    {{ updatingPaymentOrderId === order.id ? ($t('common.loading') || 'Loading') : 'Xác nhận thanh toán' }}
                  </button>

                  <button
                    v-if="getPrimaryNextStatusForOrder(order)"
                    type="button"
                    class="inline-flex h-9 items-center bg-aura-black px-3 text-body-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    :disabled="Boolean(updatingOrderId)"
                    @click="updateStatus(order.id, getPrimaryNextStatusForOrder(order))"
                  >
                    {{ updatingOrderId === order.id ? ($t('common.loading') || 'Loading') : statusLabel(getPrimaryNextStatusForOrder(order)) }}
                  </button>

                  <div v-if="getOtherStatusesForOrder(order).length" class="flex items-center gap-2">
                    <select
                      v-model="selectedStatus[order.id]"
                      class="h-9 min-w-36 border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700 focus:border-aura-black focus:outline-none"
                    >
                      <option value="">{{ $t('orders.status') }}</option>
                      <option v-for="nextStatus in getOtherStatusesForOrder(order)" :key="nextStatus" :value="nextStatus">
                        {{ statusLabel(nextStatus) }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="inline-flex h-9 items-center border border-neutral-300 px-3 text-body-sm font-medium text-neutral-700 transition-colors hover:border-aura-black hover:text-aura-black disabled:cursor-not-allowed disabled:text-neutral-300"
                      :disabled="!selectedStatus[order.id] || Boolean(updatingOrderId)"
                      @click="applySelectedStatus(order.id)"
                    >
                      {{ $t('common.save') || 'Save' }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="orders.length === 0" class="border-t border-neutral-100 py-16 text-center">
        <p class="text-neutral-500">{{ $t('admin.orders') }} {{ $t('common.noResults').toLowerCase() }}</p>
      </div>
    </div>

    <div v-if="pagination.totalPages > 1" class="mt-8 flex justify-center gap-2">
      <button
        v-for="p in Math.min(pagination.totalPages, 10)"
        :key="p"
        type="button"
        class="flex h-10 w-10 items-center justify-center text-body-sm transition-colors"
        :class="p === pagination.page ? 'bg-aura-black text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'"
        @click="page = p"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
