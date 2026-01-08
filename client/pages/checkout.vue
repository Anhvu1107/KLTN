<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'

const cartStore = useCartStore()
const authStore = useAuthStore()
const router = useRouter()

// Form state
const shippingForm = reactive({
  fullName: '',
  phone: '',
  address: '',
  city: 'Hồ Chí Minh',
  district: '',
  ward: '',
  notes: '',
})

const paymentMethod = ref('COD')
const shippingFee = ref(30000)
const isProcessing = ref(false)
const error = ref('')

// Computed
const total = computed(() => cartStore.subtotal + shippingFee.value)

const cities = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']
const paymentMethods = [
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOMO', label: 'MoMo' },
  { value: 'VNPAY', label: 'VNPay' },
]

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
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
    error.value = 'Please fill in all required fields'
    return
  }

  isProcessing.value = true
  error.value = ''

  try {
    // Check availability first
    const unavailable = await cartStore.validateAvailability()
    if (unavailable.length > 0) {
      error.value = `Some items are no longer available: ${unavailable.map(i => i.productName).join(', ')}`
      return
    }

    // Process checkout
    const result = await cartStore.checkout({
      paymentMethod: paymentMethod.value,
      shippingAddress: { ...shippingForm },
      shippingFee: shippingFee.value,
      notes: shippingForm.notes,
    })

    if (result.success) {
      // Redirect to order confirmation
      navigateTo(`/account/orders?new=${result.order.id}`)
    } else {
      error.value = result.error || 'Checkout failed'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred'
  } finally {
    isProcessing.value = false
  }
}

// SEO
useSeoMeta({
  title: 'Checkout | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <h1 class="font-serif text-heading-1 text-aura-black mb-8">Checkout</h1>

      <!-- Empty Cart -->
      <div v-if="cartStore.isEmpty" class="text-center py-16">
        <p class="text-body text-neutral-600 mb-8">Your cart is empty.</p>
        <NuxtLink to="/shop" class="btn-primary">Continue Shopping</NuxtLink>
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
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">Shipping Address</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="input-label">Full Name *</label>
                <input v-model="shippingForm.fullName" type="text" class="input-field" placeholder="Enter full name" />
              </div>
              <div>
                <label class="input-label">Phone *</label>
                <input v-model="shippingForm.phone" type="tel" class="input-field" placeholder="Phone number" />
              </div>
              <div>
                <label class="input-label">City *</label>
                <select v-model="shippingForm.city" class="input-field">
                  <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
                </select>
              </div>
              <div>
                <label class="input-label">District</label>
                <input v-model="shippingForm.district" type="text" class="input-field" placeholder="District" />
              </div>
              <div>
                <label class="input-label">Ward</label>
                <input v-model="shippingForm.ward" type="text" class="input-field" placeholder="Ward" />
              </div>
              <div class="md:col-span-2">
                <label class="input-label">Address *</label>
                <input v-model="shippingForm.address" type="text" class="input-field" placeholder="Street address" />
              </div>
              <div class="md:col-span-2">
                <label class="input-label">Notes</label>
                <textarea v-model="shippingForm.notes" rows="2" class="input-field" placeholder="Delivery notes (optional)"></textarea>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="card p-6">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">Payment Method</h2>
            
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
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">Order Summary</h2>
            
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
                <span class="text-neutral-600">Subtotal</span>
                <span>{{ cartStore.formattedSubtotal }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">Shipping</span>
                <span>{{ formatPrice(shippingFee) }}</span>
              </div>
            </div>

            <div class="divider my-4"></div>

            <div class="flex justify-between text-body font-medium mb-6">
              <span>Total</span>
              <span>{{ formatPrice(total) }}</span>
            </div>

            <button
              @click="handleCheckout"
              :disabled="isProcessing || cartStore.isEmpty"
              class="btn-primary w-full"
              :class="{ 'opacity-70 cursor-not-allowed': isProcessing }"
            >
              {{ isProcessing ? 'Processing...' : 'Place Order' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
