<script setup lang="ts">
/**
 * Print Order Invoice Page
 * AURA ARCHIVE - Generate printable invoice/packing slip
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()
const { t } = useI18n()
const { formatSizeLabel } = useProductSizeLabel()
const orderId = route.params.id as string

const order = ref<any>(null)
const isLoading = ref(true)

// Fetch order
const fetchOrder = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: { order: any } }>(
      `${config.public.apiUrl}/admin/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    order.value = response.data.order
  } catch (error) {
    console.error('Failed to fetch order:', error)
  } finally {
    isLoading.value = false
  }
}

// Format
const { formatPrice } = useCurrency()

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

const paymentMethodLabel = (s: string) => {
  const map: Record<string, string> = {
    COD: t('checkout.cod'),
    BANK_TRANSFER: t('checkout.bankTransfer'),
    CREDIT_CARD: t('checkout.creditCard'),
    MOMO: t('checkout.momo'),
    VNPAY: t('checkout.vnpay'),
    PAYPAL: 'PayPal',
  }
  return map[s] || s
}

// Print
const handlePrint = () => {
  window.print()
}

onMounted(fetchOrder)
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="print-page">
    <!-- Print Button (hidden in print) -->
    <div class="no-print p-4 flex gap-4 bg-neutral-100 mb-4">
      <button @click="handlePrint" class="btn-primary">
        🖨️ {{ t('orders.printInvoice') }}
      </button>
      <NuxtLink :to="`/admin/orders/${orderId}`" class="btn-secondary">
        ← {{ t('common.back') }}
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <p>{{ t('common.loading') }}...</p>
    </div>

    <!-- Invoice -->
    <div v-else-if="order" class="invoice-container max-w-3xl mx-auto bg-white p-8">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8 pb-8 border-b-2 border-black">
        <div>
          <h1 class="text-3xl font-serif font-bold">AURA ARCHIVE</h1>
          <p class="text-sm text-neutral-600 mt-1">Luxury Resell Fashion</p>
        </div>
        <div class="text-right">
          <h2 class="text-xl font-bold">{{ t('orders.invoice') }}</h2>
          <p class="text-sm text-neutral-600">#{{ order.order_number || order.id.slice(0, 8).toUpperCase() }}</p>
          <p class="text-sm text-neutral-600">{{ formatDate(order.created_at) }}</p>
        </div>
      </div>

      <!-- Customer & Shipping Info -->
      <div class="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 class="font-bold text-sm uppercase text-neutral-500 mb-2">{{ t('admin.customers.title') }}</h3>
          <p class="font-medium">{{ order.user?.first_name }} {{ order.user?.last_name }}</p>
          <p class="text-sm">{{ order.user?.email }}</p>
          <p class="text-sm">{{ order.user?.phone }}</p>
        </div>
        <div>
          <h3 class="font-bold text-sm uppercase text-neutral-500 mb-2">{{ t('checkout.shippingAddress') }}</h3>
          <p>{{ order.shipping_address?.full_name }}</p>
          <p class="text-sm">{{ order.shipping_address?.address }}</p>
          <p class="text-sm">{{ order.shipping_address?.district }}, {{ order.shipping_address?.city }}</p>
          <p class="text-sm">{{ order.shipping_address?.phone }}</p>
        </div>
      </div>

      <!-- Order Items -->
      <table class="w-full mb-8">
        <thead>
          <tr class="border-b-2 border-black">
            <th class="text-left py-2 font-bold">{{ t('cart.product') }}</th>
            <th class="text-center py-2 font-bold w-24">{{ t('shop.size') }}</th>
            <th class="text-center py-2 font-bold w-24">{{ t('shop.color') }}</th>
            <th class="text-right py-2 font-bold w-32">{{ t('cart.price') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.id" class="border-b">
            <td class="py-3">
              <p class="font-medium">{{ item.product_name || item.product?.name }}</p>
              <p class="text-xs text-neutral-500">SKU: {{ item.variant?.sku || 'N/A' }}</p>
            </td>
            <td class="text-center py-3">{{ formatSizeLabel(item.variant_size || item.variant?.size) }}</td>
            <td class="text-center py-3">{{ item.variant_color || item.variant?.color }}</td>
            <td class="text-right py-3">{{ formatPrice(item.price) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="flex justify-end">
        <div class="w-64">
          <div class="flex justify-between py-2 border-b">
            <span>{{ t('cart.subtotal') }}:</span>
            <span>{{ formatPrice(order.subtotal) }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span>{{ t('checkout.shippingFee') }}:</span>
            <span>{{ formatPrice(order.shipping_fee || 0) }}</span>
          </div>
          <div v-if="order.shipping_discount_amount > 0" class="flex justify-between py-2 border-b text-emerald-600">
            <span>{{ t('cart.shippingDiscount') }}:</span>
            <span>-{{ formatPrice(order.shipping_discount_amount) }}</span>
          </div>
          <div v-if="order.discount_amount > 0" class="flex justify-between py-2 border-b text-green-600">
            <span>{{ t('cart.discount') }}:</span>
            <span>-{{ formatPrice(order.discount_amount) }}</span>
          </div>
          <div class="flex justify-between py-3 font-bold text-lg">
            <span>{{ t('cart.total') }}:</span>
            <span>{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="mt-8 pt-8 border-t">
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-neutral-500">{{ t('checkout.paymentMethod') }}:</span>
            <span class="ml-2 font-medium">{{ paymentMethodLabel(order.payment_method) }}</span>
          </div>
          <div>
            <span class="text-neutral-500">{{ t('common.status') }}:</span>
            <span class="ml-2 font-medium">{{ statusLabel(order.status) }}</span>
          </div>
          <div>
            <span class="text-neutral-500">{{ t('orders.paymentMethod') }}:</span>
            <span class="ml-2 font-medium">{{ paymentStatusLabel(order.payment_status) }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-12 pt-8 border-t text-center text-sm text-neutral-500">
        <p>{{ t('orders.thanksForShopping') }}</p>
        <p class="mt-1">Website: aura-archive.com | Email: support@aura-archive.com</p>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
  .invoice-container {
    margin: 0;
    padding: 20px;
    box-shadow: none;
  }
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}

.print-page {
  background: #f5f5f5;
  min-height: 100vh;
}

.invoice-container {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
