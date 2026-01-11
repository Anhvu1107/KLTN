<script setup lang="ts">
/**
 * Admin Order Detail
 * AURA ARCHIVE - Full order view with status management
 */

import { useI18n } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()

const route = useRoute()
const config = useRuntimeConfig()
const orderId = route.params.id as string

const order = ref<any>(null)
const isLoading = ref(true)
const isUpdating = ref(false)

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

// Fetch order
const fetchOrder = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{ success: boolean; data: { order: any } }>(
      `${config.public.apiUrl}/admin/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    order.value = response.data.order
  } catch (error) {
    console.error('Failed to fetch order:', error)
  } finally {
    isLoading.value = false
  }
}

// Update status
const updateStatus = async (newStatus: string) => {
  isUpdating.value = true
  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { status: newStatus },
    })
    await fetchOrder()
  } catch (error) {
    console.error('Failed to update status:', error)
  } finally {
    isUpdating.value = false
  }
}

// Formats
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * 24000)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-purple-100 text-purple-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

onMounted(fetchOrder)

useSeoMeta({ title: 'Order Detail | Admin' })
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <NuxtLink to="/admin/orders" class="text-body-sm text-neutral-500 hover:text-aura-black mb-2 inline-block">
          ← {{ t('common.backTo') }} {{ t('admin.orders') }}
        </NuxtLink>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.orderDetail') }}</h1>
      </div>
      <NuxtLink :to="`/admin/orders/${orderId}/print`" class="btn-secondary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        {{ t('admin.printInvoice') }}
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Order Content -->
    <div v-else-if="order" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Info -->
        <div class="bg-white rounded-sm border border-neutral-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-medium text-lg">Order #{{ order.order_number || order.id.slice(0, 8).toUpperCase() }}</h2>
              <p class="text-body-sm text-neutral-500">{{ formatDate(order.created_at) }}</p>
            </div>
            <span :class="getStatusClass(order.status)" class="px-3 py-1 rounded text-body-sm">
              {{ order.status }}
            </span>
          </div>

          <!-- Status Update -->
          <div class="flex items-center gap-2 pt-4 border-t">
            <span class="text-body-sm text-neutral-500">{{ t('admin.updateStatus') }}:</span>
            <select 
              :value="order.status"
              @change="updateStatus(($event.target as HTMLSelectElement).value)"
              :disabled="isUpdating"
              class="input-field w-auto"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <!-- Items -->
        <div class="bg-white rounded-sm border border-neutral-200 p-6">
          <h3 class="font-medium mb-4">{{ t('admin.orderItems') }}</h3>
          <div class="space-y-4">
            <div v-for="item in order.items" :key="item.id" class="flex items-center gap-4 p-4 bg-neutral-50 rounded">
              <img 
                v-if="item.product?.images?.[0]"
                :src="item.product.images[0]"
                :alt="item.product.name"
                class="w-16 h-16 object-cover rounded"
              />
              <div class="w-16 h-16 bg-neutral-200 rounded" v-else />
              <div class="flex-1">
                <p class="font-medium">{{ item.product?.name }}</p>
                <p class="text-body-sm text-neutral-500">
                  Size: {{ item.variant?.size }} | Color: {{ item.variant?.color }}
                </p>
                <p class="text-caption text-neutral-400">SKU: {{ item.variant?.sku || 'N/A' }}</p>
              </div>
              <div class="text-right">
                <p class="font-medium">{{ formatPrice(item.price) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Customer -->
        <div class="bg-white rounded-sm border border-neutral-200 p-6">
          <h3 class="font-medium mb-4">{{ t('admin.customer') }}</h3>
          <p class="font-medium">{{ order.user?.first_name }} {{ order.user?.last_name }}</p>
          <p class="text-body-sm text-neutral-500">{{ order.user?.email }}</p>
          <p class="text-body-sm text-neutral-500">{{ order.user?.phone }}</p>
        </div>

        <!-- Shipping -->
        <div class="bg-white rounded-sm border border-neutral-200 p-6">
          <h3 class="font-medium mb-4">{{ t('checkout.shippingAddress') }}</h3>
          <p class="font-medium">{{ order.shipping_address?.full_name }}</p>
          <p class="text-body-sm text-neutral-500">{{ order.shipping_address?.phone }}</p>
          <p class="text-body-sm text-neutral-500">{{ order.shipping_address?.address }}</p>
          <p class="text-body-sm text-neutral-500">
            {{ order.shipping_address?.district }}, {{ order.shipping_address?.city }}
          </p>
        </div>

        <!-- Payment -->
        <div class="bg-white rounded-sm border border-neutral-200 p-6">
          <h3 class="font-medium mb-4">{{ t('checkout.paymentMethod') }}</h3>
          <div class="space-y-2 text-body-sm">
            <div class="flex justify-between">
              <span class="text-neutral-500">Method:</span>
              <span>{{ order.payment_method }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Status:</span>
              <span>{{ order.payment_status }}</span>
            </div>
            <div class="flex justify-between pt-2 border-t">
              <span class="text-neutral-500">Subtotal:</span>
              <span>{{ formatPrice(order.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Shipping:</span>
              <span>{{ formatPrice(order.shipping_fee || 0) }}</span>
            </div>
            <div v-if="order.discount_amount" class="flex justify-between text-green-600">
              <span>Discount:</span>
              <span>-{{ formatPrice(order.discount_amount) }}</span>
            </div>
            <div class="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Total:</span>
              <span>{{ formatPrice(order.total_amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <p class="text-neutral-500">{{ t('errors.notFound') }}</p>
    </div>
  </div>
</template>
