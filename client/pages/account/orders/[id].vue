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

const toNonNegativeAmount = (value: unknown) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return amount
}

const orderTotal = computed(() => toNonNegativeAmount(order.value?.total_amount))
const isFreeOrder = computed(() => orderTotal.value === 0)
const displayPaymentStatus = computed(() => {
  if (!order.value) return ''
  if (isFreeOrder.value && order.value.payment_status === 'PENDING') return 'PAID'
  return order.value.payment_status || ''
})

const canManagePayment = computed(() => {
  if (!order.value) return false
  return order.value.status === 'PENDING' &&
    !['PAID', 'REFUNDED'].includes(order.value.payment_status) &&
    orderTotal.value > 0
})

const canPayWithVNPay = computed(() => {
  return canManagePayment.value && order.value?.payment_method === 'VNPAY'
})

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
    VNPAY: 'VNPAY thẻ test NCB',
    PAYPAL: 'PayPal',
    CREDIT_CARD: t('checkout.creditCard') || 'Credit Card',
  }
  return labels[method] || method
}

const changeablePaymentMethods = computed(() => [
  { value: 'COD', label: t('checkout.cod') },
  { value: 'BANK_TRANSFER', label: t('checkout.bankTransfer') },
  { value: 'VNPAY', label: 'VNPAY thẻ test NCB' },
])

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
  const amount = Math.round(orderTotal.value) // Prices are already in VND
  if (amount <= 0) return ''
  const description = `DH ${order.value.order_number || order.value.id?.slice(0, 8)}`
  return `https://img.vietqr.io/image/${bankCode}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(bank.accountHolder)}`
})

const showBankQR = computed(() => {
  return order.value?.payment_method === 'BANK_TRANSFER' && 
         order.value?.status === 'PENDING' &&
         order.value?.payment_status === 'PENDING' && 
         orderTotal.value > 0 &&
         !!primaryBank.value
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
const isStartingVNPay = ref(false)
const isStartingMoMo = ref(false)
const isStartingPayPal = ref(false)
const vnpayError = ref('')
const momoError = ref('')
const paypalError = ref('')
const isChangingPaymentMethod = ref(false)
const paymentMethodDraft = ref('')
const paymentMethodError = ref('')
const paymentMethodSuccess = ref('')

watch(order, (currentOrder) => {
  if (currentOrder?.payment_method) {
    const visibleMethod = changeablePaymentMethods.value.find((method) => method.value === currentOrder.payment_method)
    paymentMethodDraft.value = visibleMethod?.value || changeablePaymentMethods.value[0]?.value || ''
  }
}, { immediate: true })

const updatePaymentMethod = async () => {
  if (!order.value?.id || !paymentMethodDraft.value || paymentMethodDraft.value === order.value.payment_method) return

  isChangingPaymentMethod.value = true
  paymentMethodError.value = ''
  paymentMethodSuccess.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { order: any } }>(
      `${config.public.apiUrl}/orders/${orderId}/payment-method`,
      {
        method: 'PATCH',
        headers: getAuthHeaders() as Record<string, string>,
        body: { paymentMethod: paymentMethodDraft.value },
      },
    )

    if (response.success && response.data?.order && data.value?.data) {
      data.value.data.order = response.data.order
      paymentMethodSuccess.value = 'Đã đổi phương thức thanh toán.'
    }
  } catch (err: any) {
    paymentMethodError.value = err?.data?.message || t('errors.somethingWrong')
  } finally {
    isChangingPaymentMethod.value = false
  }
}

const startVNPayPayment = async () => {
  if (!order.value?.id) return

  isStartingVNPay.value = true
  vnpayError.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { paymentUrl: string } }>(
      `${config.public.apiUrl}/payments/vnpay/create`,
      {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: { orderId: order.value.id, bankCode: 'NCB' },
      },
    )

    if (response.success && response.data.paymentUrl) {
      window.location.href = response.data.paymentUrl
      return
    }

    vnpayError.value = 'Không tạo được link thanh toán VNPAY. Vui lòng thử lại.'
  } catch (err: any) {
    vnpayError.value = err?.data?.message || 'Không tạo được link thanh toán VNPAY. Vui lòng thử lại.'
  } finally {
    isStartingVNPay.value = false
  }
}

const startMoMoPayment = async () => {
  if (!order.value?.id) return

  isStartingMoMo.value = true
  momoError.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { payUrl?: string; deeplink?: string } }>(
      `${config.public.apiUrl}/payments/momo/create`,
      {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: { orderId: order.value.id },
      },
    )

    const paymentUrl = response.data?.payUrl || response.data?.deeplink
    if (response.success && paymentUrl) {
      window.location.href = paymentUrl
      return
    }

    momoError.value = 'Không tạo được link thanh toán MoMo. Vui lòng thử lại.'
  } catch (err: any) {
    momoError.value = err?.data?.message || 'Không tạo được link thanh toán MoMo. Vui lòng thử lại.'
  } finally {
    isStartingMoMo.value = false
  }
}

const startPayPalPayment = async () => {
  if (!order.value?.id) return

  isStartingPayPal.value = true
  paypalError.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { approvalUrl?: string } }>(
      `${config.public.apiUrl}/payments/paypal/create`,
      {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: { orderId: order.value.id },
      },
    )

    if (response.success && response.data?.approvalUrl) {
      window.location.href = response.data.approvalUrl
      return
    }

    paypalError.value = 'Không tạo được link thanh toán PayPal. Vui lòng thử lại.'
  } catch (err: any) {
    paypalError.value = err?.data?.message || 'Không tạo được link thanh toán PayPal. Vui lòng thử lại.'
  } finally {
    isStartingPayPal.value = false
  }
}

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
              <span :class="getPaymentStatusClass(displayPaymentStatus)" class="px-3 py-1.5 text-caption font-medium rounded-sm">
                {{ getPaymentStatus(displayPaymentStatus) }}
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

        <!-- Free Order Notice -->
        <div v-if="isFreeOrder" class="card p-6 border-2 border-green-200 bg-green-50/40">
          <div class="text-center">
            <h2 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('orders.freeOrderTitle') || 'Đơn hàng miễn phí' }}</h2>
            <p class="text-body-sm text-neutral-600">
              {{ t('orders.freeOrderDesc') || 'Tổng thanh toán là 0 đ. Bạn không cần chuyển khoản hay thanh toán thêm.' }}
            </p>
          </div>
        </div>

        <!-- Change Payment Method -->
        <div v-if="canManagePayment" class="card p-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div class="flex-1">
              <h2 class="font-serif text-heading-4 text-aura-black mb-2">Đổi phương thức thanh toán</h2>
              <p class="text-body-sm text-neutral-600 mb-4">
                Chỉ đổi được khi đơn còn chờ xử lý và chưa thanh toán.
              </p>
              <label class="input-label">{{ t('checkout.paymentMethod') }}</label>
              <select v-model="paymentMethodDraft" class="input-field max-w-sm">
                <option
                  v-for="method in changeablePaymentMethods"
                  :key="method.value"
                  :value="method.value"
                >
                  {{ method.label }}
                </option>
              </select>
              <p v-if="paymentMethodError" class="mt-2 text-body-sm text-red-600">{{ paymentMethodError }}</p>
              <p v-if="paymentMethodSuccess" class="mt-2 text-body-sm text-green-600">{{ paymentMethodSuccess }}</p>
            </div>
            <button
              type="button"
              class="btn-secondary whitespace-nowrap"
              :disabled="isChangingPaymentMethod || paymentMethodDraft === order.payment_method"
              :class="{ 'opacity-70 cursor-not-allowed': isChangingPaymentMethod || paymentMethodDraft === order.payment_method }"
              @click="updatePaymentMethod"
            >
              {{ isChangingPaymentMethod ? t('common.processing') : 'Cập nhật' }}
            </button>
          </div>
        </div>

        <!-- VNPay Retry Payment -->
        <div v-if="canPayWithVNPay" class="card p-6 border-2 border-blue-200 bg-blue-50/30">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-serif text-heading-4 text-aura-black mb-2">Thanh toán VNPAY</h2>
              <p class="text-body-sm text-neutral-600">
                Bấm nút bên dưới để mở cổng thanh toán thẻ test NCB trên VNPAY sandbox.
              </p>
              <p v-if="vnpayError" class="mt-2 text-body-sm text-red-600">{{ vnpayError }}</p>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="btn-primary whitespace-nowrap"
                :disabled="isStartingVNPay"
                :class="{ 'opacity-70 cursor-not-allowed': isStartingVNPay }"
                @click="startVNPayPayment"
              >
                {{ isStartingVNPay ? t('common.processing') : 'Thanh toán thẻ NCB' }}
              </button>
            </div>
          </div>
        </div>

        <!-- MoMo Retry Payment -->
        <div v-if="canManagePayment && order.payment_method === 'MOMO'" class="card p-6 border-2 border-pink-200 bg-pink-50/30">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-serif text-heading-4 text-aura-black mb-2">Thanh toán MoMo</h2>
              <p class="text-body-sm text-neutral-600">Mở cổng thanh toán MoMo cho đơn hàng này.</p>
              <p v-if="momoError" class="mt-2 text-body-sm text-red-600">{{ momoError }}</p>
            </div>
            <button
              type="button"
              class="btn-primary whitespace-nowrap"
              :disabled="isStartingMoMo"
              :class="{ 'opacity-70 cursor-not-allowed': isStartingMoMo }"
              @click="startMoMoPayment"
            >
              {{ isStartingMoMo ? t('common.processing') : 'Thanh toán MoMo' }}
            </button>
          </div>
        </div>

        <!-- PayPal Retry Payment -->
        <div v-if="canManagePayment && order.payment_method === 'PAYPAL'" class="card p-6 border-2 border-blue-200 bg-blue-50/30">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-serif text-heading-4 text-aura-black mb-2">Thanh toán PayPal</h2>
              <p class="text-body-sm text-neutral-600">Mở cổng thanh toán PayPal cho đơn hàng này.</p>
              <p v-if="paypalError" class="mt-2 text-body-sm text-red-600">{{ paypalError }}</p>
            </div>
            <button
              type="button"
              class="btn-primary whitespace-nowrap"
              :disabled="isStartingPayPal"
              :class="{ 'opacity-70 cursor-not-allowed': isStartingPayPal }"
              @click="startPayPalPayment"
            >
              {{ isStartingPayPal ? t('common.processing') : 'Thanh toán PayPal' }}
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
