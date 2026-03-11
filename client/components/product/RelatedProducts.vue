<script setup lang="ts">
/**
 * Related Products Component
 * AURA ARCHIVE - Display related products
 */

const props = defineProps<{
  productId: string
}>()

const config = useRuntimeConfig()

// Fetch related products
const { data, pending } = await useFetch<{
  success: boolean
  data: { products: any[] }
}>(`${config.public.apiUrl}/products/${props.productId}/related?limit=4`)

const products = computed(() => data.value?.data?.products || [])

// Format price
const { formatPrice } = useCurrency()

// Get product image
const { getProductImage } = useImageUrl()

// Get variant status
const getVariantStatus = (product: any) => {
  return product.variants?.[0]?.status || 'SOLD'
}
</script>

<template>
  <div v-if="products.length > 0" class="mt-16 pt-16 border-t border-neutral-200">
    <h2 class="font-serif text-heading-2 text-aura-black text-center mb-8">
      {{ $t('shop.youMayAlsoLike') }}
    </h2>

    <!-- Loading -->
    <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="animate-pulse">
        <div class="aspect-product bg-neutral-200 mb-4" />
        <div class="h-3 bg-neutral-200 w-1/3 mx-auto mb-2" />
        <div class="h-4 bg-neutral-200 w-2/3 mx-auto mb-2" />
        <div class="h-4 bg-neutral-200 w-1/4 mx-auto" />
      </div>
    </div>

    <!-- Products Grid -->
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <NuxtLink
        v-for="product in products"
        :key="product.id"
        :to="`/shop/${product.id}`"
        class="group"
      >
        <!-- Product Image -->
        <div class="aspect-product bg-neutral-100 overflow-hidden relative mb-4">
          <!-- Badges -->
          <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <span v-if="getVariantStatus(product) === 'SOLD'" class="px-3 py-1 bg-neutral-900 text-white text-caption uppercase tracking-wider">
              {{ $t('shop.sold') }}
            </span>
            <span v-else-if="product.sale_price" class="px-3 py-1 bg-accent-burgundy text-white text-caption uppercase tracking-wider">
              {{ $t('shop.sale') }}
            </span>
          </div>

          <!-- Image -->
          <img 
            v-if="getProductImage(product)"
            :src="getProductImage(product)"
            :alt="product.name"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- Product Info -->
        <div class="text-center">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
          <h3 class="text-body text-aura-black mb-2 line-clamp-1 group-hover:underline underline-offset-2">{{ product.name }}</h3>
          <div class="flex items-baseline justify-center gap-2">
            <span v-if="product.sale_price" class="text-body text-accent-burgundy">
              {{ formatPrice(product.sale_price) }}
            </span>
            <span 
              :class="product.sale_price ? 'text-body-sm text-neutral-400 line-through' : 'text-body text-aura-black'"
            >
              {{ formatPrice(product.base_price) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
