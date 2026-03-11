<script setup lang="ts">
/**
 * Checkout Page
 * AURA ARCHIVE - Checkout with i18n
 */

import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useI18n } from '#imports'
import { VIETNAM_CITIES, DEFAULT_CITY } from '~/utils/constants'

const { t } = useI18n()
const config = useRuntimeConfig()
const cartStore = useCartStore()
const authStore = useAuthStore()
const router = useRouter()

// Form state
const shippingForm = reactive({
  fullName: '',
  phone: '',
  address: '',
  city: DEFAULT_CITY,
  district: '',
  ward: '',
  notes: '',
})

const paymentMethod = ref('COD')
const shippingFee = ref(30000)
const isProcessing = ref(false)
const error = ref('')

// Enabled payment methods from admin settings
const enabledMethods = ref<Record<string, { enabled: boolean }>>({})

// Computed
const total = computed(() => cartStore.subtotal + shippingFee.value)

const cities = VIETNAM_CITIES

// All possible payment methods
const allPaymentMethods = computed(() => [
  { value: 'COD', key: 'cod', label: t('checkout.cod'), icon: '🚚' },
  { value: 'BANK_TRANSFER', key: 'bank_transfer', label: t('checkout.bankTransfer'), icon: '🏦' },
  { value: 'MOMO', key: 'momo', label: 'MoMo', icon: '📱' },
  { value: 'VNPAY', key: 'vnpay', label: 'VNPay', icon: '💳' },
  { value: 'PAYPAL', key: 'paypal', label: 'PayPal', icon: '🌐', desc: t('checkout.paypalDesc') },
  { value: 'CREDIT_CARD', key: 'credit_card', label: t('checkout.creditCard'), icon: '💳', desc: 'Visa / Mastercard / AMEX' },
])

// Filter by admin-enabled methods
const paymentMethods = computed(() => {
  if (Object.keys(enabledMethods.value).length === 0) return allPaymentMethods.value
  return allPaymentMethods.value.filter(m => enabledMethods.value[m.key]?.enabled !== false)
})

// Fetch payment settings from server
const fetchPaymentSettings = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/settings`
    )
    const settings = res.data?.settings || res.data || {}

    // Public API returns flat: { payment_methods: "...", ... }
    if (settings.payment_methods) {
      try {
        enabledMethods.value = JSON.parse(settings.payment_methods)
      } catch (e) {}
    }

    // Auto-select first enabled method
    if (paymentMethods.value.length > 0 && !paymentMethods.value.find(m => m.value === paymentMethod.value)) {
      paymentMethod.value = paymentMethods.value[0].value
    }
  } catch (e) {
    console.error('Failed to fetch payment settings:', e)
  }
}

onMounted(fetchPaymentSettings)

// Format price
const { formatPrice } = useCurrency()

// Checkout handler
const handleCheckout = async () => {
  // Validate auth
  if (!authStore.isAuthenticated) {
    navigateTo('/auth/login?redirect=/checkout')
    return
  }

  // Validate form
  if (!shippingForm.fullName || !shippingForm.phone || !shippingForm.address || !shippingForm.city) {
    error.value = t('checkout.fillRequired')
    return
  }

  isProcessing.value = true
  error.value = ''

  try {
    // Check availability first
    const unavailable = await cartStore.validateAvailability()
    if (unavailable.length > 0) {
      error.value = `${t('checkout.itemsUnavailable')}: ${unavailable.map(i => i.productName).join(', ')}`
      return
    }

    // Map CREDIT_CARD to PAYPAL on backend (PayPal handles card payments)
    const backendPaymentMethod = paymentMethod.value === 'CREDIT_CARD' ? 'PAYPAL' : paymentMethod.value

    // Process checkout — create order
    const result = await cartStore.checkout({
      paymentMethod: backendPaymentMethod,
      shippingAddress: { ...shippingForm },
      shippingFee: shippingFee.value,
      notes: shippingForm.notes,
    })

    if (!result.success) {
      error.value = t('checkout.checkoutFailed')
      return
    }

    const orderId = result.order?.id
    const token = localStorage.getItem('token')

    // Handle payment redirect based on method
    if (paymentMethod.value === 'VNPAY' && orderId) {
      try {
        const res = await $fetch<{ success: boolean; data: { paymentUrl: string } }>(
          `${config.public.apiUrl}/payments/vnpay/create`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: { orderId } }
        )
        if (res.success && res.data.paymentUrl) {
          window.location.href = res.data.paymentUrl
          return
        }
      } catch (e: any) { console.error('VNPay error:', e) }

    } else if (paymentMethod.value === 'MOMO' && orderId) {
      try {
        const res = await $fetch<{ success: boolean; data: { payUrl: string } }>(
          `${config.public.apiUrl}/payments/momo/create`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: { orderId } }
        )
        if (res.success && res.data.payUrl) {
          window.location.href = res.data.payUrl
          return
        }
      } catch (e: any) { console.error('MoMo error:', e) }

    } else if ((paymentMethod.value === 'PAYPAL' || paymentMethod.value === 'CREDIT_CARD') && orderId) {
      try {
        const res = await $fetch<{ success: boolean; data: { approvalUrl: string } }>(
          `${config.public.apiUrl}/payments/paypal/create`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: { orderId } }
        )
        if (res.success && res.data.approvalUrl) {
          window.location.href = res.data.approvalUrl
          return
        }
      } catch (e: any) { console.error('PayPal error:', e) }
    }

    // COD / Bank Transfer / gateway failed → go to order detail
    navigateTo(`/account/orders/${orderId}`)
  } catch (err: any) {
    // Show user-friendly message instead of raw technical errors
    error.value = t('checkout.checkoutFailed')
  } finally {
    isProcessing.value = false
  }
}

// SEO
useSeoMeta({
  title: () => `${t('checkout.title')} | AURA ARCHIVE`,
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <h1 class="font-serif text-heading-1 text-aura-black mb-8">{{ $t('checkout.title') }}</h1>

      <!-- Empty Cart -->
      <div v-if="cartStore.isEmpty" class="text-center py-16">
        <p class="text-body text-neutral-600 mb-8">{{ $t('cart.empty') }}</p>
        <NuxtLink to="/shop" class="btn-primary">{{ $t('cart.continueShopping') }}</NuxtLink>
      </div>

      <!-- Checkout Form -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <!-- Form Section -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Error Alert -->
          <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700">
            {{ error }}
          </div>

          <!-- Shipping Address -->
          <div class="card p-6">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('checkout.shippingInfo') }}</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="input-label">{{ $t('checkout.fullName') }} *</label>
                <input v-model="shippingForm.fullName" type="text" class="input-field" :placeholder="$t('checkout.fullName')" />
              </div>
              <div>
                <label class="input-label">{{ $t('checkout.phone') }} *</label>
                <input v-model="shippingForm.phone" type="tel" class="input-field" :placeholder="$t('checkout.phone')" />
              </div>
              <div>
                <label class="input-label">{{ $t('checkout.city') }} *</label>
                <select v-model="shippingForm.city" class="input-field">
                  <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
                </select>
              </div>
              <div>
                <label class="input-label">{{ $t('checkout.district') }}</label>
                <input v-model="shippingForm.district" type="text" class="input-field" :placeholder="$t('checkout.district')" />
              </div>
              <div>
                <label class="input-label">{{ $t('checkout.ward') }}</label>
                <input v-model="shippingForm.ward" type="text" class="input-field" :placeholder="$t('checkout.ward')" />
              </div>
              <div class="md:col-span-2">
                <label class="input-label">{{ $t('checkout.address') }} *</label>
                <input v-model="shippingForm.address" type="text" class="input-field" :placeholder="$t('checkout.address')" />
              </div>
              <div class="md:col-span-2">
                <label class="input-label">{{ $t('checkout.notes') }}</label>
                <textarea v-model="shippingForm.notes" rows="2" class="input-field" :placeholder="$t('checkout.notesPlaceholder')"></textarea>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="card p-6">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('checkout.paymentMethod') }}</h2>
            
            <div class="space-y-3">
              <label
                v-for="method in paymentMethods"
                :key="method.value"
                class="flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors"
                :class="paymentMethod === method.value ? 'border-aura-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'"
              >
                <input
                  v-model="paymentMethod"
                  type="radio"
                  :value="method.value"
                  class="w-4 h-4 text-aura-black"
                />
                <span class="text-body">{{ method.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('checkout.orderSummary') }}</h2>
            
            <!-- Cart Items -->
            <div class="space-y-4 mb-6">
              <div
                v-for="item in cartStore.items"
                :key="item.id"
                class="flex gap-4"
              >
                <div class="w-16 h-16 bg-neutral-100 rounded-sm flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-caption text-neutral-500 uppercase">{{ item.productBrand }}</p>
                  <p class="text-body-sm font-medium text-aura-black truncate">{{ item.productName }}</p>
                  <p class="text-caption text-neutral-600">{{ item.variantSize }} / {{ item.variantColor }}</p>
                </div>
                <p class="text-body-sm font-medium">{{ formatPrice(item.price) }}</p>
              </div>
            </div>

            <div class="divider mb-4"></div>

            <!-- Totals -->
            <div class="space-y-2 text-body-sm">
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.subtotal') }}</span>
                <span>{{ formatPrice(cartStore.subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.shipping') }}</span>
                <span>{{ formatPrice(shippingFee) }}</span>
              </div>
            </div>

            <div class="divider my-4"></div>

            <div class="flex justify-between text-body font-medium mb-6">
              <span>{{ $t('cart.total') }}</span>
              <span>{{ formatPrice(total) }}</span>
            </div>

            <button
              @click="handleCheckout"
              :disabled="isProcessing || cartStore.isEmpty"
              class="btn-primary w-full"
              :class="{ 'opacity-70 cursor-not-allowed': isProcessing }"
            >
              {{ isProcessing ? $t('checkout.processing') : $t('checkout.placeOrder') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
