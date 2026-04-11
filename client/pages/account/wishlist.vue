<script setup lang="ts">
/**
 * Wishlist Page
 * AURA ARCHIVE - User's saved products
 */

import { useCartStore } from '~/stores/cart'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()

const config = useRuntimeConfig()
const cartStore = useCartStore()
const { getAuthHeaders } = useAuthToken()
const { getProductImage } = useImageUrl()

// Fetch wishlist
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { items: any[]; count: number }
}>(`${config.public.apiUrl}/wishlist`, {
  headers: getAuthHeaders(),
  server: false,
})

const items = computed(() => data.value?.data?.items || [])

// Remove from wishlist
const removeItem = async (productId: string) => {
  try {
    await $fetch(`${config.public.apiUrl}/wishlist/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    await refresh()
  } catch (error) {
    console.error('Failed to remove from wishlist', error)
  }
}

// Add to cart
const addToCart = (item: any) => {
  const product = item.product
  const variant = product?.variants?.[0]
  
  if (!variant || variant.status !== 'AVAILABLE') return

  cartStore.addToCart({
    id: variant.id,
    productId: product.id,
    productName: product.name,
    productBrand: product.brand,
    productImage: getProductImage(product) || '',
    variantSize: variant.size,
    variantColor: variant.color,
    price: parseFloat(product.sale_price || product.base_price),
  })
}

const { formatPrice } = useCurrency()

useSeoMeta({
  title: 'Wishlist | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-1 text-aura-black">{{ t('common.wishlist') }}</h1>
        <NuxtLink to="/account" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('common.backTo') }} {{ t('common.account') }}
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-16">
        <p class="text-neutral-500">{{ t('common.loading') }}</p>
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="text-center py-16 card">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('wishlist.empty') }}</h2>
        <p class="text-body text-neutral-600 mb-6">{{ t('wishlist.emptyDesc') }}</p>
        <NuxtLink to="/shop" class="btn-primary">{{ t('wishlist.explore') }}</NuxtLink>
      </div>

      <!-- Wishlist Items -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="item in items" :key="item.id" class="group">
          <div class="relative">
            <NuxtLink :to="`/shop/${item.product?.id}`" class="block">
              <div class="aspect-product bg-neutral-100 rounded-sm overflow-hidden mb-4">
                <!-- Sold Badge -->
                <div v-if="item.product?.variants?.[0]?.status === 'SOLD'" class="absolute top-3 left-3 z-10">
                  <span class="px-2 py-1 bg-neutral-900 text-white text-caption">{{ $t('shop.sold') }}</span>
                </div>
                <img
                  v-if="getProductImage(item.product)"
                  :src="getProductImage(item.product)"
                  :alt="item.product?.name"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                >
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                  <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </NuxtLink>

            <!-- Remove button -->
            <button
              @click="removeItem(item.product?.id)"
              class="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Info -->
          <NuxtLink :to="`/shop/${item.product?.id}`">
            <p class="text-caption text-neutral-500 uppercase tracking-wider">{{ item.product?.brand }}</p>
            <h3 class="text-body font-medium text-aura-black group-hover:underline">{{ item.product?.name }}</h3>
            <p class="text-body mt-1">{{ formatPrice(item.product?.sale_price || item.product?.base_price) }}</p>
          </NuxtLink>

          <!-- Add to Cart -->
          <button
            v-if="item.product?.variants?.[0]?.status === 'AVAILABLE'"
            @click="addToCart(item)"
            class="w-full mt-3 btn-secondary text-body-sm"
          >
            {{ t('shop.addToCart') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
