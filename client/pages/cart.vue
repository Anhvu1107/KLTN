<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Remove item
const removeItem = (variantId: string) => {
  cartStore.removeFromCart(variantId)
}

// SEO
useSeoMeta({
  title: 'Shopping Cart | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <h1 class="font-serif text-heading-1 text-aura-black mb-8">Shopping Cart</h1>

      <!-- Empty Cart -->
      <div v-if="cartStore.isEmpty" class="text-center py-16">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 class="font-serif text-heading-3 text-aura-black mb-2">Your Cart is Empty</h2>
        <p class="text-body text-neutral-600 mb-8">Discover our curated collection of luxury pieces.</p>
        <NuxtLink to="/shop" class="btn-primary">
          Explore Collection
        </NuxtLink>
      </div>

      <!-- Cart Items -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <!-- Items List -->
        <div class="lg:col-span-2">
          <div class="space-y-6">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="flex gap-6 p-6 bg-neutral-50 rounded-sm"
            >
              <!-- Image -->
              <div class="w-24 h-32 bg-neutral-200 rounded-sm flex-shrink-0"></div>

              <!-- Details -->
              <div class="flex-1 min-w-0">
                <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">
                  {{ item.productBrand }}
                </p>
                <h3 class="text-body font-medium text-aura-black mb-2">
                  {{ item.productName }}
                </h3>
                <p class="text-body-sm text-neutral-600 mb-4">
                  {{ item.variantSize }} / {{ item.variantColor }}
                </p>
                <p class="text-body font-medium text-aura-black">
                  {{ formatPrice(item.price) }}
                </p>
              </div>

              <!-- Remove Button -->
              <button
                @click="removeItem(item.id)"
                class="self-start p-2 text-neutral-400 hover:text-red-500 transition-colors"
                aria-label="Remove item"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Continue Shopping -->
          <div class="mt-8">
            <NuxtLink to="/shop" class="text-body-sm text-neutral-600 hover:text-aura-black transition-colors">
              &larr; Continue Shopping
            </NuxtLink>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">Order Summary</h2>

            <div class="space-y-3 text-body-sm mb-6">
              <div class="flex justify-between">
                <span class="text-neutral-600">Items ({{ cartStore.itemCount }})</span>
                <span>{{ cartStore.formattedSubtotal }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">Shipping</span>
                <span class="text-neutral-500">Calculated at checkout</span>
              </div>
            </div>

            <div class="divider mb-4"></div>

            <div class="flex justify-between text-body font-medium mb-6">
              <span>Subtotal</span>
              <span>{{ cartStore.formattedSubtotal }}</span>
            </div>

            <NuxtLink to="/checkout" class="btn-primary w-full block text-center">
              Proceed to Checkout
            </NuxtLink>

            <!-- Trust Badges -->
            <div class="mt-6 pt-6 border-t border-neutral-100 text-center">
              <p class="text-caption text-neutral-500 mb-2">Secure Checkout</p>
              <div class="flex justify-center gap-4 text-neutral-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                <span class="text-caption">Authenticity Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
