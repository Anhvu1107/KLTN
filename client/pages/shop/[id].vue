<script setup lang="ts">
/**
 * Product Detail Page
 * AURA ARCHIVE - Shop product with Add to Cart functionality
 */

import { useCartStore } from '~/stores/cart'

const route = useRoute()
const config = useRuntimeConfig()
const cartStore = useCartStore()

const productId = route.params.id as string

// Fetch product
const { data, pending, error } = await useFetch<{
  success: boolean
  data: { product: any }
}>(`${config.public.apiUrl}/products/${productId}`)

const product = computed(() => data.value?.data?.product)
const variant = computed(() => product.value?.variants?.[0])

// Check if item is in cart
const isInCart = computed(() => variant.value ? cartStore.isInCart(variant.value.id) : false)
const isSold = computed(() => variant.value?.status === 'SOLD')

// Add to cart
const addedToCart = ref(false)

const handleAddToCart = () => {
  if (!variant.value || isSold.value || isInCart.value) return

  const success = cartStore.addToCart({
    id: variant.value.id,
    productId: product.value.id,
    productName: product.value.name,
    productBrand: product.value.brand,
    productImage: product.value.images?.[0] || '',
    variantSize: variant.value.size,
    variantColor: variant.value.color,
    price: parseFloat(product.value.sale_price || product.value.base_price),
  })

  if (success) {
    addedToCart.value = true
    setTimeout(() => {
      addedToCart.value = false
    }, 2000)
  }
}

// Format helpers
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const getImages = computed(() => {
  if (!product.value?.images) return []
  try {
    return typeof product.value.images === 'string' 
      ? JSON.parse(product.value.images) 
      : product.value.images
  } catch {
    return []
  }
})

useSeoMeta({
  title: () => product.value ? `${product.value.name} | AURA ARCHIVE` : 'Product | AURA ARCHIVE',
  description: () => product.value?.description?.substring(0, 160),
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Loading -->
      <div v-if="pending" class="text-center py-16">
        <p class="text-neutral-500">Loading product...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error || !product" class="text-center py-16">
        <h1 class="font-serif text-heading-2 text-aura-black mb-4">Product Not Found</h1>
        <NuxtLink to="/shop" class="btn-primary">Back to Shop</NuxtLink>
      </div>

      <!-- Product -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <!-- Images -->
        <div class="space-y-4">
          <div class="aspect-product bg-neutral-100 rounded-sm overflow-hidden relative">
            <!-- Sold Badge -->
            <div v-if="isSold" class="absolute top-4 left-4 z-10">
              <span class="badge-sold">SOLD</span>
            </div>
            <!-- Placeholder image -->
            <div class="w-full h-full flex items-center justify-center text-neutral-400">
              <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <!-- Thumbnail grid -->
          <div class="grid grid-cols-4 gap-2">
            <div v-for="i in 4" :key="i" class="aspect-square bg-neutral-100 rounded-sm"></div>
          </div>
        </div>

        <!-- Details -->
        <div class="lg:py-4">
          <!-- Breadcrumb -->
          <nav class="text-caption text-neutral-500 mb-4">
            <NuxtLink to="/shop" class="hover:text-aura-black">Shop</NuxtLink>
            <span class="mx-2">/</span>
            <span>{{ product.category }}</span>
          </nav>

          <!-- Brand -->
          <p class="text-caption text-neutral-500 uppercase tracking-widest mb-2">{{ product.brand }}</p>

          <!-- Name -->
          <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ product.name }}</h1>

          <!-- Price -->
          <div class="flex items-baseline gap-3 mb-6">
            <span v-if="product.sale_price" class="text-heading-3 text-accent-burgundy">
              {{ formatPrice(product.sale_price) }}
            </span>
            <span 
              class="text-heading-3" 
              :class="product.sale_price ? 'text-neutral-400 line-through text-xl' : 'text-aura-black'"
            >
              {{ formatPrice(product.base_price) }}
            </span>
          </div>

          <!-- Condition -->
          <div class="mb-6 pb-6 border-b border-neutral-200">
            <p class="text-body-sm text-neutral-600">
              <span class="font-medium">Condition:</span> {{ product.condition_text }}
            </p>
            <p v-if="product.authenticity_verified" class="text-body-sm text-green-600 mt-1">
              ✓ Authenticity Verified
            </p>
          </div>

          <!-- Variant Info -->
          <div v-if="variant" class="mb-8 space-y-3">
            <div class="flex gap-8">
              <div>
                <p class="text-caption text-neutral-500 uppercase">Size</p>
                <p class="text-body font-medium">{{ variant.size }}</p>
              </div>
              <div>
                <p class="text-caption text-neutral-500 uppercase">Color</p>
                <p class="text-body font-medium">{{ variant.color }}</p>
              </div>
              <div v-if="variant.material">
                <p class="text-caption text-neutral-500 uppercase">Material</p>
                <p class="text-body font-medium">{{ variant.material }}</p>
              </div>
            </div>
          </div>

          <!-- Add to Cart -->
          <div class="mb-8">
            <button
              @click="handleAddToCart"
              :disabled="isSold || isInCart"
              class="w-full py-4 text-body font-medium uppercase tracking-wider transition-all duration-300"
              :class="{
                'bg-neutral-200 text-neutral-500 cursor-not-allowed': isSold,
                'bg-green-600 text-white': addedToCart,
                'bg-neutral-400 text-white cursor-not-allowed': isInCart && !addedToCart,
                'bg-aura-black text-aura-white hover:bg-neutral-800': !isSold && !isInCart && !addedToCart,
              }"
            >
              <span v-if="isSold">Sold Out</span>
              <span v-else-if="addedToCart">✓ Added to Cart</span>
              <span v-else-if="isInCart">Already in Cart</span>
              <span v-else>Add to Cart</span>
            </button>

            <NuxtLink 
              v-if="isInCart && !isSold" 
              to="/cart" 
              class="block text-center mt-3 text-body-sm text-neutral-600 hover:text-aura-black"
            >
              View Cart →
            </NuxtLink>
          </div>

          <!-- Description -->
          <div class="mb-8">
            <h3 class="text-body font-medium text-aura-black mb-3">Description</h3>
            <p class="text-body text-neutral-600 whitespace-pre-line">{{ product.description }}</p>
          </div>

          <!-- Details -->
          <div class="border-t border-neutral-200 pt-6">
            <h3 class="text-body font-medium text-aura-black mb-3">Details</h3>
            <ul class="space-y-2 text-body-sm text-neutral-600">
              <li><span class="text-neutral-500">SKU:</span> {{ variant?.sku || 'N/A' }}</li>
              <li><span class="text-neutral-500">Category:</span> {{ product.category }}</li>
              <li><span class="text-neutral-500">Subcategory:</span> {{ product.subcategory }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
