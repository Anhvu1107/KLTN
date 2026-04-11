<script setup lang="ts">
/**
 * Checkout Page
 * AURA ARCHIVE - Checkout with i18n
 */

import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import { VIETNAM_CITIES, DEFAULT_CITY } from '~/utils/constants'

const { t } = useI18n()
const config = useRuntimeConfig()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { formatSizeLabel } = useProductSizeLabel()

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

type CouponBenefitType = 'DISCOUNT' | 'SHIPPING'

interface AppliedCheckoutCoupon {
  id: string
  code: string
  name: string
  type: string
  benefitType: CouponBenefitType
  discountAmount: number
  shippingDiscountAmount: number
}

// Coupon state
const discountCouponCode = ref('')
const shippingCouponCode = ref('')
const discountCouponError = ref('')
const shippingCouponError = ref('')
const discountCouponSuccess = ref('')
const shippingCouponSuccess = ref('')
const isApplyingDiscountCoupon = ref(false)
const isApplyingShippingCoupon = ref(false)
const appliedDiscountCoupon = ref<AppliedCheckoutCoupon | null>(null)
const appliedShippingCoupon = ref<AppliedCheckoutCoupon | null>(null)

// Enabled payment methods from admin settings
const enabledMethods = ref<Record<string, { enabled: boolean }>>({})

// Computed totals
const productDiscountAmount = computed(() => appliedDiscountCoupon.value?.discountAmount || 0)
const shippingDiscountAmount = computed(() => appliedShippingCoupon.value?.shippingDiscountAmount || 0)
const total = computed(() => Math.max(cartStore.subtotal + shippingFee.value - productDiscountAmount.value - shippingDiscountAmount.value, 0))

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
      } catch {
        // Ignore malformed payment settings and keep default checkout options.
      }
    }

    // Auto-select first enabled method
    if (paymentMethods.value.length > 0 && !paymentMethods.value.find(m => m.value === paymentMethod.value)) {
      paymentMethod.value = paymentMethods.value[0].value
    }
  } catch (e) {
    console.error('Failed to fetch payment settings:', e)
  }
}

// Auto-fill shipping form from user profile
const prefillFromUser = () => {
  const user = authStore.user
  if (!user) return
  if (!shippingForm.fullName && (user.firstName || user.lastName)) {
    shippingForm.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  }
  if (!shippingForm.phone && user.phone) {
    shippingForm.phone = user.phone
  }
  if (!shippingForm.address && user.address) {
    shippingForm.address = user.address
  }
  if (user.city) {
    shippingForm.city = user.city
  }
  if (!shippingForm.district && user.district) {
    shippingForm.district = user.district
  }
  if (!shippingForm.ward && user.ward) {
    shippingForm.ward = user.ward
  }
}

onMounted(() => {
  fetchPaymentSettings()
  prefillFromUser()
})

// Format price
const { formatPrice } = useCurrency()

// Group identical items
const groupedItems = computed(() => {
  const groups = new Map()
  for (const item of cartStore.items) {
    const key = `${item.productId}-${item.variantSize}-${item.variantColor}`
    if (!groups.has(key)) {
      groups.set(key, { ...item, quantity: 1, variantIds: [item.id] })
    } else {
      const g = groups.get(key)
      g.quantity++
      g.variantIds.push(item.id)
    }
  }
  return Array.from(groups.values())
})

const appliedCouponsPayload = computed(() => {
  const coupons: { id: string; benefitType: CouponBenefitType }[] = []

  if (appliedDiscountCoupon.value) {
    coupons.push({ id: appliedDiscountCoupon.value.id, benefitType: 'DISCOUNT' })
  }

  if (appliedShippingCoupon.value) {
    coupons.push({ id: appliedShippingCoupon.value.id, benefitType: 'SHIPPING' })
  }

  return coupons
})

const mapCouponErrorMessage = (message: string) => {
  const errorMap: Record<string, string> = {
    'Coupon code already exists': t('admin.coupons.codeExists'),
    'Invalid coupon code': t('admin.coupons.invalidCode'),
    'This coupon has expired': t('admin.coupons.couponExpired'),
    'This coupon is no longer active': t('admin.coupons.couponInactive'),
    'This coupon has reached its usage limit': t('admin.coupons.usageLimitReached'),
    'You have already used this coupon': t('admin.coupons.alreadyUsed'),
    'This coupon is not yet valid': t('admin.coupons.couponNotYetValid'),
    'This coupon is not available for your account': t('admin.coupons.couponNotForYou'),
    'This code is not a free shipping coupon': t('admin.coupons.notShippingCoupon'),
    'This code is not a product discount coupon': t('admin.coupons.notDiscountCoupon'),
    'A free shipping coupon is already applied': t('admin.coupons.shippingCouponAlreadyApplied'),
    'A product discount coupon is already applied': t('admin.coupons.discountCouponAlreadyApplied'),
    'Shipping is already free for this order': t('admin.coupons.shippingAlreadyFree'),
    'Please log in to use this coupon': t('auth.signIn'),
    'Coupon not found': t('admin.coupons.invalidCode'),
  }

  return errorMap[message]
    || (message.includes('Minimum order') ? t('admin.coupons.minOrderRequired') : '')
    || message
}

const applyCoupon = async (benefitType: CouponBenefitType) => {
  const isShippingCoupon = benefitType === 'SHIPPING'
  const codeRef = isShippingCoupon ? shippingCouponCode : discountCouponCode
  const errorRef = isShippingCoupon ? shippingCouponError : discountCouponError
  const successRef = isShippingCoupon ? shippingCouponSuccess : discountCouponSuccess
  const loadingRef = isShippingCoupon ? isApplyingShippingCoupon : isApplyingDiscountCoupon

  if (!codeRef.value.trim()) {
    errorRef.value = t('cart.enterCode')
    return
  }

  errorRef.value = ''
  successRef.value = ''
  loadingRef.value = true

  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{
      success: boolean
      data: {
        coupon: {
          id: string
          code: string
          name: string
          type: string
          benefitType: CouponBenefitType
        }
        discountAmount: number
        shippingDiscountAmount: number
        newTotal: number
      }
    }>(`${config.public.apiUrl}/coupons/validate`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        code: codeRef.value,
        cartTotal: cartStore.subtotal,
        shippingFee: shippingFee.value,
        expectedBenefitType: benefitType,
        appliedCoupons: appliedCouponsPayload.value,
      },
    })

    if (response.success) {
      const coupon: AppliedCheckoutCoupon = {
        id: response.data.coupon.id,
        code: response.data.coupon.code,
        name: response.data.coupon.name,
        type: response.data.coupon.type,
        benefitType: response.data.coupon.benefitType,
        discountAmount: response.data.discountAmount,
        shippingDiscountAmount: response.data.shippingDiscountAmount,
      }

      if (coupon.benefitType === 'SHIPPING') {
        appliedShippingCoupon.value = coupon
        shippingCouponSuccess.value = `${t('checkout.freeShippingApplied')} "${coupon.code}" - ${formatPrice(coupon.shippingDiscountAmount)}`
        shippingCouponError.value = ''
        shippingCouponCode.value = ''
      } else {
        appliedDiscountCoupon.value = coupon
        discountCouponSuccess.value = `${t('checkout.discountApplied')} "${coupon.code}" - ${formatPrice(coupon.discountAmount)}`
        discountCouponError.value = ''
        discountCouponCode.value = ''
      }
    }
  } catch (err: any) {
    const msg = err.data?.message || ''
    errorRef.value = mapCouponErrorMessage(msg) || t('admin.coupons.invalidCode')
  } finally {
    loadingRef.value = false
  }
}

// Remove coupon
const removeCoupon = (benefitType: CouponBenefitType) => {
  if (benefitType === 'SHIPPING') {
    appliedShippingCoupon.value = null
    shippingCouponCode.value = ''
    shippingCouponSuccess.value = ''
    shippingCouponError.value = ''
    return
  }

  appliedDiscountCoupon.value = null
  discountCouponCode.value = ''
  discountCouponSuccess.value = ''
  discountCouponError.value = ''
}
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

  // Validate phone format (Vietnamese: 10 digits, starts with 0)
  const phoneDigits = shippingForm.phone.replace(/[\s-]/g, '')
  if (!/^0\d{9}$/.test(phoneDigits)) {
    error.value = t('checkout.invalidPhone', 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)')
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
      discountCouponId: appliedDiscountCoupon.value?.id || undefined,
      shippingCouponId: appliedShippingCoupon.value?.id || undefined,
    })

    if (!result.success) {
      error.value = mapCouponErrorMessage(result.error || '') || t('checkout.checkoutFailed')
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

    // Save shipping info back to user profile (fire-and-forget)
    if (token) {
      $fetch(`${config.public.apiUrl}/users/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          first_name: shippingForm.fullName.split(' ').slice(-1)[0] || '',
          last_name: shippingForm.fullName.split(' ').slice(0, -1).join(' ') || '',
          phone: shippingForm.phone,
          address: shippingForm.address,
          city: shippingForm.city,
          district: shippingForm.district,
          ward: shippingForm.ward,
        },
      }).catch(() => {})

      // Update local auth state
      if (authStore.user) {
        authStore.user.phone = shippingForm.phone
        authStore.user.address = shippingForm.address
        authStore.user.city = shippingForm.city
        authStore.user.district = shippingForm.district
        authStore.user.ward = shippingForm.ward
      }
    }

    // COD / Bank Transfer / gateway failed → go to order detail
    navigateTo(`/account/orders/${orderId}`)
  } catch {
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
                v-for="item in groupedItems"
                :key="item.variantIds[0]"
                class="flex gap-4"
              >
                <div class="w-16 h-16 bg-neutral-100 rounded-sm flex-shrink-0 overflow-hidden">
                  <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-caption text-neutral-500 uppercase">{{ item.productBrand }}</p>
                  <p class="text-body-sm font-medium text-aura-black truncate flex items-center gap-1">
                    {{ item.productName }}
                    <span v-if="item.quantity > 1" class="text-neutral-500 text-xs bg-neutral-200 px-1.5 py-0.5 rounded-sm">x{{ item.quantity }}</span>
                  </p>
                  <p class="text-caption text-neutral-600">{{ formatSizeLabel(item.variantSize) }} / {{ item.variantColor }}</p>
                </div>
                <p class="text-body-sm font-medium">{{ formatPrice(item.price * item.quantity) }}</p>
              </div>
            </div>

            <div class="divider mb-4"></div>

            <!-- Coupon Input -->
            <div class="mb-6 space-y-4">
              <div>
                <label class="input-label">{{ $t('checkout.discountCoupon') }}</label>
                <div v-if="!appliedDiscountCoupon" class="flex gap-2">
                  <input
                    v-model="discountCouponCode"
                    type="text"
                    :placeholder="$t('cart.enterCode')"
                    class="input-field flex-1 uppercase"
                    @keyup.enter="applyCoupon('DISCOUNT')"
                  />
                  <button
                    @click="applyCoupon('DISCOUNT')"
                    :disabled="isApplyingDiscountCoupon"
                    class="px-4 py-2 bg-neutral-800 text-white text-body-sm hover:bg-neutral-700 transition-colors"
                    :class="{ 'opacity-50 cursor-not-allowed': isApplyingDiscountCoupon }"
                  >
                    {{ isApplyingDiscountCoupon ? '...' : $t('cart.apply') }}
                  </button>
                </div>
                <div v-else class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-sm">
                  <div>
                    <span class="text-body-sm font-medium text-green-700">{{ appliedDiscountCoupon.code }}</span>
                    <span class="text-caption text-green-600 ml-2">-{{ formatPrice(productDiscountAmount) }}</span>
                  </div>
                  <button @click="removeCoupon('DISCOUNT')" class="text-green-600 hover:text-green-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <p v-if="discountCouponError" class="text-caption text-red-600 mt-2">{{ discountCouponError }}</p>
                <p v-if="discountCouponSuccess" class="text-caption text-green-600 mt-2">{{ discountCouponSuccess }}</p>
              </div>

              <div>
                <label class="input-label">{{ $t('checkout.shippingCoupon') }}</label>
                <div v-if="!appliedShippingCoupon" class="flex gap-2">
                  <input
                    v-model="shippingCouponCode"
                    type="text"
                    :placeholder="$t('cart.enterCode')"
                    class="input-field flex-1 uppercase"
                    @keyup.enter="applyCoupon('SHIPPING')"
                  />
                  <button
                    @click="applyCoupon('SHIPPING')"
                    :disabled="isApplyingShippingCoupon"
                    class="px-4 py-2 bg-neutral-800 text-white text-body-sm hover:bg-neutral-700 transition-colors"
                    :class="{ 'opacity-50 cursor-not-allowed': isApplyingShippingCoupon }"
                  >
                    {{ isApplyingShippingCoupon ? '...' : $t('cart.apply') }}
                  </button>
                </div>
                <div v-else class="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-sm">
                  <div>
                    <span class="text-body-sm font-medium text-emerald-700">{{ appliedShippingCoupon.code }}</span>
                    <span class="text-caption text-emerald-600 ml-2">-{{ formatPrice(shippingDiscountAmount) }}</span>
                  </div>
                  <button @click="removeCoupon('SHIPPING')" class="text-emerald-600 hover:text-emerald-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <p v-if="shippingCouponError" class="text-caption text-red-600 mt-2">{{ shippingCouponError }}</p>
                <p v-if="shippingCouponSuccess" class="text-caption text-emerald-600 mt-2">{{ shippingCouponSuccess }}</p>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-2 text-body-sm">
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.subtotal') }}</span>
                <span>{{ formatPrice(cartStore.subtotal) }}</span>
              </div>
              <div v-if="appliedDiscountCoupon" class="flex justify-between text-green-600">
                <span>{{ $t('cart.discount') }} ({{ appliedDiscountCoupon.code }})</span>
                <span>-{{ formatPrice(productDiscountAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.shipping') }}</span>
                <span>{{ formatPrice(shippingFee) }}</span>
              </div>
              <div v-if="appliedShippingCoupon" class="flex justify-between text-emerald-600">
                <span>{{ $t('cart.shippingDiscount') }} ({{ appliedShippingCoupon.code }})</span>
                <span>-{{ formatPrice(shippingDiscountAmount) }}</span>
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
