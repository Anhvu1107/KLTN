<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useDialog } from '~/composables/useDialog'
import { useProductSizeLabel } from '~/composables/useProductSizeLabel'

const { t } = useI18n()
const cartStore = useCartStore()
const config = useRuntimeConfig()
const { alert: showDialog } = useDialog()
const { formatSizeLabel } = useProductSizeLabel()

// Format price
const { formatPrice } = useCurrency()

// Group identical items
const groupedItems = computed(() => {
  const groups = new Map()
  for (const item of cartStore.items) {
    // Generate a unique key for identical variants of the same product
    const key = `${item.productId}-${item.variantSize}-${item.variantColor}`
    if (!groups.has(key)) {
      groups.set(key, { 
        ...item, 
        quantity: 1, 
        variantIds: [item.id] 
      })
    } else {
      const g = groups.get(key)
      g.quantity++
      g.variantIds.push(item.id)
    }
  }
  return Array.from(groups.values())
})

// Remove group of items
const removeGroup = (variantIds: string[]) => {
  for (const id of variantIds) {
    cartStore.removeFromCart(id)
  }
}

// Decrease quantity by removing ONE variant
const decreaseQuantity = (variantIds: string[]) => {
  if (variantIds.length > 1) {
    cartStore.removeFromCart(variantIds[variantIds.length - 1])
  }
}

// Increase quantity by finding available variant from backend
const isAddingKey = ref('')

const increaseQuantity = async (item: any) => {
  const itemKey = `${item.productId}-${item.variantSize}-${item.variantColor}`
  isAddingKey.value = itemKey
  
  try {
    const res = await $fetch<{ success: boolean; data: { product: any } }>(
      `${config.public.apiUrl}/products/${item.productId}`
    )
    
    if (res.success && res.data.product) {
      const product = res.data.product
      
      const matchingVariants = product.variants.filter((v: any) => 
        v.status === 'AVAILABLE' && 
        v.size === item.variantSize && 
        v.color === item.variantColor
      )
      
      const availableToAdd = matchingVariants.find((v: any) => 
        !cartStore.isInCart(v.id)
      )
      
      if (availableToAdd) {
        cartStore.addToCart({
          id: availableToAdd.id,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: item.productImage,
          variantSize: availableToAdd.size,
          variantColor: availableToAdd.color,
          price: parseFloat(product.sale_price || product.base_price),
        })
      } else {
        showDialog({
          title: t('shop.soldOutTitle', 'Hết hàng'),
          message: t('shop.soldOut', 'Đã đạt số lượng tối đa trong kho'),
          type: 'warning'
        })
      }
    }
  } catch (error) {
    console.error('Failed to increase quantity:', error)
  } finally {
    isAddingKey.value = ''
  }
}

// SEO
useSeoMeta({
  title: 'Shopping Cart | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <h1 class="font-serif text-heading-1 text-aura-black mb-8">{{ $t('cart.title') }}</h1>

      <!-- Empty Cart -->
      <div v-if="cartStore.isEmpty" class="text-center py-16">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 class="font-serif text-heading-3 text-aura-black mb-2">{{ $t('cart.empty') }}</h2>
        <p class="text-body text-neutral-600 mb-8">{{ $t('home.curatedDesc') }}</p>
        <NuxtLink to="/shop" class="btn-primary">
          {{ $t('hero.cta') }}
        </NuxtLink>
      </div>

      <!-- Cart Items -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <!-- Items List -->
        <div class="lg:col-span-2">
          <div class="space-y-6">
            <div
              v-for="item in groupedItems"
              :key="item.variantIds[0]"
              class="flex gap-6 p-6 bg-neutral-50 rounded-sm"
            >
              <!-- Image -->
              <div class="w-24 h-32 bg-neutral-200 rounded-sm flex-shrink-0 overflow-hidden">
                <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" class="w-full h-full object-cover" />
              </div>

              <!-- Details -->
              <div class="flex-1 min-w-0">
                <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">
                  {{ item.productBrand }}
                </p>
                <h3 class="text-body font-medium text-aura-black mb-2 flex items-center gap-2">
                  {{ item.productName }}
                  <span v-if="item.quantity > 1" class="text-neutral-500 text-sm bg-neutral-200 px-2 py-0.5 rounded-full">x{{ item.quantity }}</span>
                </h3>
                <p class="text-body-sm text-neutral-600 mb-4">
                  {{ formatSizeLabel(item.variantSize) }} / {{ item.variantColor }}
                </p>
                <p class="text-body font-medium text-aura-black mb-4">
                  {{ formatPrice(item.price) }} <span v-if="item.quantity > 1" class="text-neutral-500 text-sm ml-1">({{ formatPrice(item.price * item.quantity) }})</span>
                </p>
                
                <!-- Quantity Controls -->
                <div class="flex items-center gap-3">
                  <span class="text-caption text-neutral-500 uppercase">{{ $t('shop.quantity', 'SL') }}:</span>
                  <div class="flex items-center border border-neutral-200 rounded-sm">
                    <button 
                      @click="decreaseQuantity(item.variantIds)"
                      class="px-3 py-1 text-neutral-500 hover:bg-neutral-100 transition-colors"
                      :disabled="item.quantity <= 1 || isAddingKey === `${item.productId}-${item.variantSize}-${item.variantColor}`"
                      :class="{ 'opacity-30 cursor-not-allowed': item.quantity <= 1 || isAddingKey === `${item.productId}-${item.variantSize}-${item.variantColor}` }"
                    >-</button>
                    <span class="px-3 text-body-sm font-medium w-8 text-center flex justify-center items-center h-full">
                      <svg v-if="isAddingKey === `${item.productId}-${item.variantSize}-${item.variantColor}`" class="animate-spin w-4 h-4 text-aura-black" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span v-else>{{ item.quantity }}</span>
                    </span>
                    <button 
                      @click="increaseQuantity(item)"
                      class="px-3 py-1 text-neutral-500 hover:bg-neutral-100 transition-colors"
                      :disabled="isAddingKey === `${item.productId}-${item.variantSize}-${item.variantColor}`"
                      :class="{ 'opacity-30 cursor-not-allowed': isAddingKey === `${item.productId}-${item.variantSize}-${item.variantColor}` }"
                      title="Thêm số lượng"
                    >+</button>
                  </div>
                </div>
              </div>

              <!-- Remove Button -->
              <button
                @click="removeGroup(item.variantIds)"
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
              &larr; {{ $t('cart.continueShopping') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('cart.orderSummary') }}</h2>

            <div class="space-y-3 text-body-sm mb-6">
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.items') }} ({{ cartStore.itemCount }})</span>
                <span>{{ formatPrice(cartStore.subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-600">{{ $t('cart.shipping') }}</span>
                <span class="text-neutral-500">{{ $t('cart.calculatedAtCheckout') }}</span>
              </div>
            </div>

            <div class="divider mb-4"></div>

            <div class="flex justify-between text-body font-medium mb-6">
              <span>{{ $t('cart.subtotal') }}</span>
              <span>{{ formatPrice(cartStore.subtotal) }}</span>
            </div>

            <NuxtLink to="/checkout" class="btn-primary w-full block text-center">
              {{ $t('cart.proceedToCheckout') }}
            </NuxtLink>

            <!-- Trust Badges -->
            <div class="mt-6 pt-6 border-t border-neutral-100 text-center">
              <p class="text-caption text-neutral-500 mb-2">{{ $t('cart.secureCheckout') }}</p>
              <div class="flex justify-center gap-4 text-neutral-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                <span class="text-caption">{{ $t('cart.authenticityGuaranteed') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

