<script setup lang="ts">
/**
 * Order Detail / Receipt Page
 * AURA ARCHIVE - View individual order details
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'


definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const { confirm: showConfirm } = useDialog()
const { getAuthHeaders } = useAuthToken()
const { getImageUrl } = useImageUrl()
const { formatSizeLabel } = useProductSizeLabel()

const orderId = route.params.id as string

// Fetch order details
const { data, pending, error: fetchError } = await useFetch<{
  success: boolean
  data: { order: any }
}>(`${config.public.apiUrl}/orders/${orderId}`, {
  headers: getAuthHeaders() as Record<string, string>,
  server: false,
})

const order = computed(() => data.value?.data?.order)

const { formatPrice } = useCurrency()

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-teal-100 text-teal-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getPaymentStatusClass = (status: string) => {
  if (status === 'PAID') return 'bg-green-100 text-green-800'
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800'
  if (status === 'FAILED') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

const getOrderStatus = (status: string) => {
  if (!status) return ''
  return t(`orders.${status.toLowerCase()}`)
}

const getPaymentStatus = (status: string) => {
  if (!status) return ''
  const keyMap: Record<string, string> = {
    PENDING: 'paymentPending',
    PAID: 'paymentPaid',
    FAILED: 'paymentFailed',
    REFUNDED: 'paymentRefunded'
  }
  return t(`orders.${keyMap[status] || status.toLowerCase()}`)
}

const paymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    COD: t('checkout.cod'),
    BANK_TRANSFER: t('checkout.bankTransfer'),
    MOMO: 'MoMo',
    VNPAY: 'VNPay',
    CREDIT_CARD: t('checkout.creditCard') || 'Credit Card',
  }
  return labels[method] || method
}

// Bank accounts for QR code
const bankAccounts = ref<Array<{
  bankName: string
  accountNumber: string
  accountHolder: string
  branch: string
}>>([])

// VietQR bank code mapping
const BANK_CODES: Record<string, string> = {
  'Vietcombank': 'VCB',
  'BIDV': 'BIDV',
  'Techcombank': 'TCB',
  'VPBank': 'VPB',
  'MBBank': 'MB',
  'MB': 'MB',
  'MB Bank': 'MB',
  'TPBank': 'TPB',
  'ACB': 'ACB',
  'Sacombank': 'STB',
  'VietinBank': 'ICB',
  'HDBank': 'HDB',
  'SHB': 'SHB',
  'Agribank': 'VBA',
  'OCB': 'OCB',
  'VIB': 'VIB',
  'SeABank': 'SEAB',
  'MSB': 'MSB',
  'Eximbank': 'EIB',
  'LienVietPostBank': 'LPB',
  'NamABank': 'NAB',
  'BaoVietBank': 'BVB',
  'DongABank': 'DAB',
  'PGBank': 'PGB',
}

const getBankCode = (bankName: string): string => {
  // Try exact match first
  if (BANK_CODES[bankName]) return BANK_CODES[bankName]
  // Try case-insensitive partial match
  const lower = bankName.toLowerCase()
  for (const [key, code] of Object.entries(BANK_CODES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return code
    }
  }
  return bankName.toUpperCase().replace(/\s+/g, '')
}

const primaryBank = computed(() => bankAccounts.value[0] || null)

const vietQrUrl = computed(() => {
  if (!primaryBank.value || !order.value) return ''
  const bank = primaryBank.value
  const bankCode = getBankCode(bank.bankName)
  const amount = Math.round(order.value.total_amount || 0) // Prices are already in VND
  const description = `DH ${order.value.order_number || order.value.id?.slice(0, 8)}`
  return `https://img.vietqr.io/image/${bankCode}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(bank.accountHolder)}`
})

const showBankQR = computed(() => {
  return order.value?.payment_method === 'BANK_TRANSFER' && 
         order.value?.payment_status === 'PENDING' && 
         primaryBank.value
})

// Fetch bank accounts from public settings
const fetchBankAccounts = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: { settings: Record<string, string> } }>(
      `${config.public.apiUrl}/settings`
    )
    const bankData = response.data?.settings?.bank_accounts
    if (bankData) {
      try {
        bankAccounts.value = JSON.parse(bankData)
      } catch {
        // Ignore malformed bank account payloads from settings.
      }
    }
  } catch (e) {
    console.error('Failed to fetch bank accounts:', e)
  }
}

onMounted(fetchBankAccounts)

// Cancel order
const isCancelling = ref(false)
const cancelError = ref('')

const cancelOrder = async () => {
  const isConfirmed = await showConfirm(t('orders.confirmCancel') || 'Bạn có chắc muốn hủy đơn hàng này?')
  if (!isConfirmed) return

  isCancelling.value = true
  cancelError.value = ''

  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    // Refresh data
    window.location.reload()
  } catch (err: any) {
    cancelError.value = err?.data?.message || t('errors.somethingWrong')
  } finally {
    isCancelling.value = false
  }
}

useSeoMeta({
  title: () => `${t('orders.orderDetail')} | AURA ARCHIVE`,
})
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="section">
    <div class="container-aura max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('orders.orderDetail') }}</h1>
        <NuxtLink to="/account/orders" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('orders.backToOrders') || 'Back to Orders' }}
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-16">
        <div class="animate-spin h-8 w-8 mx-auto border-2 border-neutral-300 border-t-aura-black rounded-full"></div>
      </div>

      <!-- Error -->
      <div v-else-if="fetchError" class="text-center py-16 card p-8">
        <p class="text-body text-red-600 mb-4">{{ t('errors.somethingWrong') }}</p>
        <NuxtLink to="/account/orders" class="btn-primary">{{ t('orders.backToOrders') || 'Back to Orders' }}</NuxtLink>
      </div>

      <!-- Order Detail -->
      <div v-else-if="order" class="space-y-6">
        <!-- Order Header Card -->
        <div class="card p-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-caption text-neutral-500 uppercase mb-1">{{ t('orders.orderId') || 'Order ID' }}</p>
              <p class="text-body font-medium text-aura-black font-mono">#{{ order.order_number || order.id?.slice(0, 8) + '...' }}</p>
              <p class="text-body-sm text-neutral-500 mt-1">{{ formatDate(order.created_at) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span :class="getStatusClass(order.status)" class="px-3 py-1.5 text-caption font-medium rounded-sm">
                {{ getOrderStatus(order.status) }}
              </span>
              <span :class="getPaymentStatusClass(order.payment_status)" class="px-3 py-1.5 text-caption font-medium rounded-sm">
                {{ getPaymentStatus(order.payment_status) }}
              </span>
            </div>
          </div>

          <!-- Cancel button for PENDING orders -->
          <div v-if="order.status === 'PENDING'" class="mt-4 pt-4 border-t border-neutral-100">
            <p v-if="cancelError" class="text-body-sm text-red-600 mb-2">{{ cancelError }}</p>
            <button
              @click="cancelOrder"
              :disabled="isCancelling"
              class="text-body-sm text-red-600 hover:text-red-800 underline"
            >
              {{ isCancelling ? t('common.processing') : t('orders.cancelOrder') || 'Cancel Order' }}
            </button>
          </div>
        </div>

        <!-- Bank Transfer QR Code -->
        <div v-if="showBankQR" class="card p-6 border-2 border-amber-200 bg-amber-50/30">
          <div class="text-center">
            <h2 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('orders.bankTransferQR') || '💳 Quét QR để thanh toán' }}</h2>
            <p class="text-body-sm text-neutral-600 mb-4">
              {{ t('orders.bankTransferQRDesc') || 'Quét mã QR bên dưới bằng app ngân hàng để chuyển khoản nhanh' }}
            </p>
            
            <div class="inline-block bg-white p-4 rounded-lg shadow-sm mb-4">
              <img :src="vietQrUrl" alt="VietQR Payment" class="w-64 h-64 mx-auto" />
            </div>

            <div class="max-w-sm mx-auto text-left space-y-2 text-body-sm">
              <div class="flex justify-between py-1.5 border-b border-neutral-100">
                <span class="text-neutral-500">{{ t('admin.paymentSettings.bankName') || 'Ngân hàng' }}</span>
                <span class="font-medium text-aura-black">{{ primaryBank?.bankName }}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-neutral-100">
                <span class="text-neutral-500">{{ t('admin.paymentSettings.accountNumber') || 'Số TK' }}</span>
                <span class="font-medium text-aura-black font-mono">{{ primaryBank?.accountNumber }}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-neutral-100">
                <span class="text-neutral-500">{{ t('admin.paymentSettings.accountHolder') || 'Chủ TK' }}</span>
                <span class="font-medium text-aura-black">{{ primaryBank?.accountHolder }}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-neutral-100">
                <span class="text-neutral-500">{{ t('cart.total') || 'Tổng tiền' }}</span>
                <span class="font-bold text-lg text-aura-black">{{ formatPrice(order.total_amount) }}</span>
              </div>
              <div class="flex justify-between py-1.5">
                <span class="text-neutral-500">{{ t('orders.transferContent') || 'Nội dung CK' }}</span>
                <span class="font-medium text-aura-black font-mono">DH {{ order.order_number || order.id?.slice(0, 8) }}</span>
              </div>
            </div>

            <p class="text-caption text-amber-600 mt-4">
              ⚠️ {{ t('orders.bankTransferNote') || 'Vui lòng ghi đúng nội dung chuyển khoản để đơn hàng được xác nhận nhanh nhất' }}
            </p>
          </div>
        </div>

        <!-- Items -->
        <div class="card p-6">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ t('orders.items') || 'Items' }}</h2>
          <div class="space-y-4">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="flex gap-4 pb-4 border-b border-neutral-50 last:border-0 last:pb-0"
            >
              <!-- Product image -->
              <div class="w-20 h-20 bg-neutral-100 rounded-sm flex-shrink-0 overflow-hidden">
                <img
                  v-if="item.variant?.product?.images?.length"
                  :src="getImageUrl(item.variant.product.images[0])"
                  :alt="item.product_name"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-caption text-neutral-500 uppercase">{{ item.product_brand }}</p>
                <p class="text-body font-medium text-aura-black">{{ item.product_name }}</p>
                <p class="text-body-sm text-neutral-600">
                  {{ formatSizeLabel(item.variant_size) }} / {{ item.variant_color }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-body font-medium text-aura-black">{{ formatPrice(item.price) }}</p>
                <p class="text-caption text-neutral-500">x{{ item.quantity }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary & Shipping -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Payment Summary -->
          <div class="card p-6">
            <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ t('orders.paymentSummary') || 'Payment Summary' }}</h2>
            <div class="space-y-3 text-body-sm">
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ t('cart.subtotal') }}</span>
                <span class="font-medium">{{ formatPrice(order.subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ t('cart.shipping') }}</span>
                <span class="font-medium">{{ formatPrice(order.shipping_fee) }}</span>
              </div>
              <div v-if="order.shipping_discount_amount > 0" class="flex justify-between">
                <span class="text-neutral-600">{{ t('cart.shippingDiscount') || 'Shipping Discount' }}</span>
                <span class="font-medium text-green-600">-{{ formatPrice(order.shipping_discount_amount) }}</span>
              </div>
              <div v-if="order.discount_amount > 0" class="flex justify-between">
                <span class="text-neutral-600">{{ t('cart.discount') || 'Discount' }}</span>
                <span class="font-medium text-green-600">-{{ formatPrice(order.discount_amount) }}</span>
              </div>
              <div class="divider"></div>
              <div class="flex justify-between text-body font-medium">
                <span>{{ t('cart.total') }}</span>
                <span>{{ formatPrice(order.total_amount) }}</span>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-neutral-100 space-y-2 text-body-sm">
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ t('orders.payment') }}</span>
                <span class="font-medium">{{ paymentMethodLabel(order.payment_method) }}</span>
              </div>
              <div v-if="order.payment_transaction_id" class="flex justify-between">
                <span class="text-neutral-600">{{ t('orders.transactionId') || 'Transaction ID' }}</span>
                <span class="font-medium font-mono text-caption">{{ order.payment_transaction_id }}</span>
              </div>
            </div>
          </div>

          <!-- Shipping Address -->
          <div class="card p-6">
            <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ t('checkout.shippingInfo') }}</h2>
            <div v-if="order.shipping_address" class="space-y-2 text-body-sm">
              <p class="font-medium text-aura-black">{{ order.shipping_address.fullName }}</p>
              <p class="text-neutral-600">{{ order.shipping_address.phone }}</p>
              <p class="text-neutral-600">
                {{ order.shipping_address.address }}
              </p>
              <p class="text-neutral-600">
                <span v-if="order.shipping_address.ward">{{ order.shipping_address.ward }}, </span>
                <span v-if="order.shipping_address.district">{{ order.shipping_address.district }}, </span>
                {{ order.shipping_address.city }}
              </p>
              <p v-if="order.notes" class="mt-3 pt-3 border-t border-neutral-100 text-neutral-500 italic">
                {{ t('checkout.notes') }}: {{ order.notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="card p-6">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ t('orders.timeline') || 'Timeline' }}</h2>
          <div class="space-y-3">
            <div class="flex items-center gap-3 text-body-sm">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-neutral-600">{{ t('orders.orderPlaced') || 'Order placed' }}</span>
              <span class="text-neutral-400 ml-auto">{{ formatDate(order.created_at) }}</span>
            </div>
            <div v-if="order.confirmed_at" class="flex items-center gap-3 text-body-sm">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <span class="text-neutral-600">{{ t('orders.confirmed') || 'Confirmed' }}</span>
              <span class="text-neutral-400 ml-auto">{{ formatDate(order.confirmed_at) }}</span>
            </div>
            <div v-if="order.shipped_at" class="flex items-center gap-3 text-body-sm">
              <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span class="text-neutral-600">{{ t('orders.shipped') }}</span>
              <span class="text-neutral-400 ml-auto">{{ formatDate(order.shipped_at) }}</span>
            </div>
            <div v-if="order.delivered_at" class="flex items-center gap-3 text-body-sm">
              <div class="w-2 h-2 rounded-full bg-green-600"></div>
              <span class="text-neutral-600">{{ t('orders.delivered') || 'Delivered' }}</span>
              <span class="text-neutral-400 ml-auto">{{ formatDate(order.delivered_at) }}</span>
            </div>
            <div v-if="order.cancelled_at" class="flex items-center gap-3 text-body-sm">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
              <span class="text-neutral-600">{{ t('orders.cancelled') || 'Cancelled' }}</span>
              <span class="text-neutral-400 ml-auto">{{ formatDate(order.cancelled_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
